// BUILDLIO.SITE — v5.6 Backend (Ultra Hi-Tech Builder Tone + Anti-Summary Gates + Stronger Creative Brief)
//
// CHANGELOG
// - v5.6
//   * ENHANCE: “Builder mode” system prompt — explicitly forbids strategy memos (architecture/performance/timeline/stack recs)
//   * ENHANCE: Anti-summary / anti-consulting hard-gate phrases + structural checks (rejects “Estimated timeline”, “Tech stack recommendation”, etc.)
//   * ENHANCE: Stronger creative brief: ultra high-tech refined minimalism, friendly + thorough, but always outputs build artifacts
//   * ENHANCE: Agent/spec fingerprint rejection (NEXUS-style specs, tool lists, guardrails, YAML/markdown headings)
//   * ENHANCE: Artifact-shape gate: rejects outputs that don’t match snapshot schema for the selected buildType
//   * ENHANCE: Polish pass instruction is sharper: rebuild as snapshot, not a memo; includes banlist + required structure reminders
//   * KEEP: Vision Splash Flow hints preserved in meta
//   * KEEP: Document second-step chooser supported
//   * KEEP: Dual validators + buildType segregation pages vs documents
//   * KEEP: JSON-only output, extraction, retry “polish pass”, RPC save_version_and_charge_credit on success
//
// ANCHOR:ENV
// - NEXT_PUBLIC_SUPABASE_URL=...
// - NEXT_PUBLIC_SUPABASE_ANON_KEY=...
// - ANTHROPIC_API_KEY=... (server-only)
//
// ANCHOR:DB
// - RPC: save_version_and_charge_credit(p_project_id uuid, p_owner_id uuid, p_snapshot jsonb, p_note text, p_model text)

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

type BuildType = "website" | "landing_page" | "application" | "document" | "store" | "other";

// Vision Splash Flow hints (optional; UI-driven)
type SplashChoice = "sync" | "sploosh" | "ripple" | "none";
type BuildConsoleMode = "white_console" | "standard" | "none";

type SiteSnapshot = {
  appName: string;
  tagline?: string;
  navigation?: { items: string[] };
  meta?: {
    buildType?: BuildType;
    intent?: string;

    splashChoice?: SplashChoice;
    buildConsoleMode?: BuildConsoleMode;
    documentCategory?: DocumentItem["category"];
    jurisdiction?: string;
  };
  pages: Array<{ slug: string; title?: string; blocks: any[] }>;
};

type DocumentItem = {
  id: string;
  title: string;
  category:
    | "letter"
    | "cease_and_desist"
    | "bill_of_sale"
    | "health_guarantee"
    | "contract"
    | "policy"
    | "packet"
    | "proposal"
    | "other";
  jurisdiction?: string;
  format: "html";
  body_html: string;
  fields?: Array<{ key: string; label: string; type: "text" | "date" | "number" | "checkbox"; required?: boolean }>;
  warnings?: string[];
};

type DocSnapshot = {
  appName: string;
  meta?: {
    buildType?: BuildType;
    intent?: string;

    splashChoice?: SplashChoice;
    buildConsoleMode?: BuildConsoleMode;
    documentCategory?: DocumentItem["category"];
    jurisdiction?: string;
  };
  documents: DocumentItem[];
};

type BuildlioResponse =
  | { type: "chat"; message: string }
  | { type: "build"; message: string; snapshot: SiteSnapshot | DocSnapshot };

/* -----------------------------
ANCHOR:UTILS
-------------------------------- */
function safeString(v: any) {
  return typeof v === "string" ? v : "";
}
function normalizeWhitespace(s: any) {
  return safeString(s).replace(/\s+/g, " ").trim();
}
function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}
function arr(v: any) {
  return Array.isArray(v) ? v : [];
}
function getBlock(blocks: any[], type: string) {
  return arr(blocks).find((b) => b && b.type === type);
}
function containsAny(haystack: string, needles: string[]) {
  const h = (haystack || "").toLowerCase();
  return needles.some((n) => h.includes(String(n).toLowerCase()));
}

// Tries hard to extract the first valid JSON object from model text.
// (Keeps your original behavior but with slightly more defensive trimming.)
function extractJson(raw: string) {
  let out = raw || "{}";
  const firstBrace = out.indexOf("{");
  const lastBrace = out.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    out = out.slice(firstBrace, lastBrace + 1);
  }
  return out.trim();
}

/* -----------------------------
ANCHOR:ANTI_SUMMARY_GATES
-------------------------------- */
// “Consultant memo” phrases that should never appear in a BUILD artifact.
const CONSULTING_MEMO_PHRASES = [
  "estimated timeline",
  "timeline:",
  "4-6 weeks",
  "technical stack recommendation",
  "stack recommendation",
  "information architecture",
  "performance targets",
  "speed metrics",
  "core web vitals",
  "lighthouse performance",
  "would you like me to elaborate",
  "i can elaborate",
  "let me know if you want",
  "here’s a breakdown",
  "scope:",
  "supporting pages",
  "technical standards",
];

function snapshotLooksLikeMemo(parsed: any): boolean {
  const s = JSON.stringify(parsed || {});
  return containsAny(s, CONSULTING_MEMO_PHRASES);
}

/* -----------------------------
ANCHOR:ANTI_AGENT_SPEC_FINGERPRINTS
-------------------------------- */
// These catch “NEXUS-7” / agent spec documents that sneak in as content.
const AGENT_SPEC_FINGERPRINTS = [
  "primary mission",
  "core directive",
  "success metrics",
  "available tools",
  "data collection",
  "action & communication",
  "decision support",
  "escalation triggers",
  "critical guardrails",
  "fail-safe mechanisms",
  "operational framework",
  "continuous learning loop",
  "role-based permissions",
  "least privilege",
  "gdpr/ccpa",
  "risk prediction",
  "uptime",
  "yaml",
  "prohibited actions",
  "circuit breakers",
];

function containsMarkdownish(raw: string) {
  const s = raw || "";
  // headings like ## Title, fenced code blocks, and bold-list patterns
  if (/(^|\n)\s*#{2,}\s+/m.test(s)) return true;
  if (/```/.test(s)) return true;
  if (/(^|\n)\s*-\s+\*\*/m.test(s)) return true;
  return false;
}

function looksLikeAgentSpec(obj: any) {
  const s = JSON.stringify(obj || {}).toLowerCase();
  if (containsAny(s, AGENT_SPEC_FINGERPRINTS)) return true;
  if (containsMarkdownish(s)) return true;
  return false;
}

/* -----------------------------
ANCHOR:ARTIFACT_SHAPE_GATE
-------------------------------- */
// Rejects “valid JSON” that isn’t actually your artifact schema.
function shapeGate(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) return { ok: false, reason: "Missing/invalid type" };

  if (parsed.type === "chat") {
    if (typeof parsed.message !== "string") return { ok: false, reason: "Chat missing message" };
    return { ok: true };
  }

  const snap = parsed.snapshot;
  if (!snap || typeof snap !== "object") return { ok: false, reason: "Build missing snapshot" };

  // HARD-GATE: forbid both branches at once
  const hasPages = Array.isArray((snap as any).pages);
  const hasDocs = Array.isArray((snap as any).documents);

  if (buildType === "document") {
    if (hasPages && (snap as any).pages?.length) return { ok: false, reason: "Document build must not include pages" };
    if (!hasDocs) return { ok: false, reason: "Document build missing documents[]" };
    if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
    return { ok: true };
  }

  // Non-document
  if (hasDocs && (snap as any).documents?.length) return { ok: false, reason: "Website build must not include documents" };
  if (!hasPages) return { ok: false, reason: "Non-document build missing pages[]" };
  if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
  return { ok: true };
}

/* -----------------------------
ANCHOR:COPY_QUALITY
-------------------------------- */
const GENERIC_BAD = [
  "innovative",
  "cutting-edge",
  "next-level",
  "revolutionize",
  "game-changer",
  "best-in-class",
  "synergy",
  "unlock your potential",
  "elevate your",
  "we are passionate",
  "state-of-the-art",
  "seamless solution",
  "powerful platform",
  "ultimate",
];

const TOO_VAGUE = ["for everyone", "for anyone", "all businesses", "any business", "top-notch", "amazing", "incredible", "unmatched"];

function hasSpecificitySignals(text: string) {
  const t = (text || "").toLowerCase();
  const hasNumber = /\d/.test(t);
  const hasConcreteNouns =
    /(calls|bookings|leads|appointments|orders|checkout|invoices|quotes|estimates|calendar|crm|pipeline|onboarding|templates|contracts|deliverables|export|ownership|domain|storefront|catalog|cart|sku|inventory|shipping|case study|case studies|portfolio|resume|cv|speaking|talks|engagements)/.test(
      t
    );
  const hasAudience =
    /(for (senior|executive|busy|solo|independent|new|growing|service|trade|clinic|salon|agency|coach|creator|designer|architect|consultant|founder|studio|team|company|brand|enterprise))/i.test(
      text || ""
    );
  return hasNumber || (hasConcreteNouns && hasAudience);
}

/* -----------------------------
ANCHOR:BUILD_TYPE_DETECT
-------------------------------- */
function canonicalizeBuildType(raw: any): BuildType | null {
  const t0 = normalizeWhitespace(raw).toLowerCase();
  if (!t0) return null;

  const t = t0.replace(/[-\s]+/g, "_").replace(/__+/g, "_").trim();

  if (t === "landing") return "landing_page";
  if (t === "landingpage") return "landing_page";
  if (t === "landing_page") return "landing_page";

  if (t === "website") return "website";

  if (t === "application") return "application";
  if (t === "app") return "application";
  if (t === "portal") return "application";

  if (t === "document") return "document";
  if (t === "documents") return "document";
  if (t === "docs") return "document";

  if (t === "store") return "store";
  if (t === "shop") return "store";
  if (t === "ecommerce") return "store";

  if (t === "other") return "other";

  return null;
}

function canonicalizeSplashChoice(raw: any): SplashChoice | null {
  const t = normalizeWhitespace(raw).toLowerCase();
  if (!t) return null;
  const x = t.replace(/[-\s]+/g, "_").trim();
  if (x === "sync") return "sync";
  if (x === "sploosh" || x === "splosh" || x === "splash") return "sploosh";
  if (x === "ripple" || x === "ripples") return "ripple";
  if (x === "none" || x === "off") return "none";
  return null;
}

function canonicalizeBuildConsoleMode(raw: any): BuildConsoleMode | null {
  const t = normalizeWhitespace(raw).toLowerCase();
  if (!t) return null;
  const x = t.replace(/[-\s]+/g, "_").trim();
  if (x === "white_console" || x === "white" || x === "console_white") return "white_console";
  if (x === "standard" || x === "default") return "standard";
  if (x === "none" || x === "off") return "none";
  return null;
}

function canonicalizeDocumentCategory(raw: any): DocumentItem["category"] | null {
  const t = normalizeWhitespace(raw).toLowerCase();
  if (!t) return null;
  const x = t.replace(/[-\s]+/g, "_").trim();

  const allowed: Record<string, DocumentItem["category"]> = {
    letter: "letter",
    cease_and_desist: "cease_and_desist",
    cease: "cease_and_desist",
    cnd: "cease_and_desist",
    bill_of_sale: "bill_of_sale",
    bill: "bill_of_sale",
    sale: "bill_of_sale",
    health_guarantee: "health_guarantee",
    guarantee: "health_guarantee",
    contract: "contract",
    agreement: "contract",
    policy: "policy",
    packet: "packet",
    proposal: "proposal",
    other: "other",
  };

  return allowed[x] || null;
}

function detectBuildTypeFromText(messages: any[]): BuildType | null {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const t = normalizeWhitespace(lastUser?.content).toLowerCase();

  const m = t.match(
    /(^|\n)\s*type\s*:\s*(website|landing[_\-\s]*page|landingpage|landing|application|app|portal|document|documents|docs|store|shop|ecommerce|other)\s*(\n|$)/i
  );
  if (m?.[2]) return canonicalizeBuildType(m[2]);

  if (/(store|shop|checkout|cart|products|sku|inventory|shipping|returns)/i.test(t)) return "store";
  if (/(application|dashboard|login|roles|admin|workflow|crud|portal|audit trail)/i.test(t)) return "application";
  if (/(document|documents|letter|letters|proposal|contract|policy|terms|agreement|handbook|guide|cease and desist|bill of sale|health guarantee)/i.test(t))
    return "document";
  if (/(landing page|single page|one page|lead capture|waitlist|signup|book a call)/i.test(t)) return "landing_page";
  if (t.length > 0) return "website";

  return null;
}

/* -----------------------------
ANCHOR:VALIDATORS
-------------------------------- */
function validateWebsiteBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };

  // Hard blocks: memo/spec
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like a strategy memo (must generate page blocks)" };
  if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Output resembles an agent/spec document (must generate page blocks)" };

  // Shape gate (prevents “valid JSON” that isn't your schema)
  const sg = shapeGate(parsed, "website");
  if (!sg.ok) return sg;

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };

  // HARD-GATE: website builds must not include documents
  if (Array.isArray((snap as any)?.documents) && (snap as any).documents.length > 0) {
    return { ok: false, reason: "Website build must not include snapshot.documents" };
  }

  if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
  if (!Array.isArray((snap as any).pages) || (snap as any).pages.length < 1) return { ok: false, reason: "Missing pages" };

  const page0 = (snap as any).pages[0];
  if (!page0 || !Array.isArray(page0.blocks)) return { ok: false, reason: "Missing blocks" };

  const blocks = page0.blocks;
  const required = ["hero", "features", "stats", "testimonials", "pricing", "faq", "content", "cta"];
  const types = new Set(blocks.map((b: any) => b?.type));
  for (const r of required) if (!types.has(r)) return { ok: false, reason: `Missing block: ${r}` };

  const hero = getBlock(blocks, "hero");
  const headline = normalizeWhitespace(hero?.headline);
  const subhead = normalizeWhitespace(hero?.subhead);

  if (headline.length < 18) return { ok: false, reason: "Hero headline too short" };
  if (headline.split(" ").length < 6 || headline.split(" ").length > 18) return { ok: false, reason: "Hero headline word-count off" };
  if (subhead.length < 120) return { ok: false, reason: "Hero subhead too thin" };
  if (subhead.length > 260) return { ok: false, reason: "Hero subhead too long" };

  const heroCombined = `${headline} ${subhead}`;
  if (containsAny(heroCombined, GENERIC_BAD)) return { ok: false, reason: "Hero too buzzwordy" };
  if (containsAny(heroCombined, TOO_VAGUE)) return { ok: false, reason: "Hero too vague" };
  if (!hasSpecificitySignals(heroCombined)) return { ok: false, reason: "Hero lacks specificity signals" };

  const features = getBlock(blocks, "features");
  const featureItems = arr(features?.items);
  if (featureItems.length !== 6) return { ok: false, reason: "Features must be exactly 6" };
  for (const it of featureItems) {
    const tt = normalizeWhitespace(it?.title);
    const d = normalizeWhitespace(it?.description);
    if (tt.length < 8) return { ok: false, reason: "Feature title too short" };
    if (d.length < 60) return { ok: false, reason: "Feature description too thin" };
    if (!/so you can/i.test(d)) return { ok: false, reason: "Feature description missing 'so you can' outcome" };
    if (containsAny(`${tt} ${d}`, GENERIC_BAD)) return { ok: false, reason: "Features too buzzwordy" };
    if (containsAny(`${tt} ${d}`, CONSULTING_MEMO_PHRASES)) return { ok: false, reason: "Feature copy looks like a memo" };
  }

  const stats = getBlock(blocks, "stats");
  const statsItems = arr(stats?.stats);
  if (statsItems.length !== 4) return { ok: false, reason: "Stats must be exactly 4" };

  const testimonials = getBlock(blocks, "testimonials");
  const testimonialItems = arr(testimonials?.items);
  if (testimonialItems.length !== 3) return { ok: false, reason: "Testimonials must be exactly 3" };
  for (const t of testimonialItems) {
    const quote = normalizeWhitespace(t?.quote);
    const name = normalizeWhitespace(t?.name);
    const role = normalizeWhitespace(t?.role);
    if (quote.length < 70) return { ok: false, reason: "Testimonial quote too thin" };
    if (!name) return { ok: false, reason: "Testimonial missing name" };
    if (!role) return { ok: false, reason: "Testimonial missing role" };
    if (
      !/\d/.test(quote) &&
      !/(week|weeks|days|hours|export|draft|template|booked|leads|orders|clients|checkout|catalog|portal|case study|portfolio|resume|cv|talk)/i.test(
        quote
      )
    ) {
      return { ok: false, reason: "Testimonial lacks concrete detail" };
    }
  }

  const pricing = getBlock(blocks, "pricing");
  const plans = arr(pricing?.plans);
  if (plans.length !== 3) return { ok: false, reason: "Pricing must be exactly 3 plans" };
  if (plans.filter((p: any) => !!p?.popular).length !== 1) return { ok: false, reason: "Exactly one plan must be popular" };
  for (const p of plans) {
    const feats = arr(p?.features);
    if (feats.length !== 6) return { ok: false, reason: "Each plan must have exactly 6 features" };
  }

  const faq = getBlock(blocks, "faq");
  const faqItems = arr(faq?.items);
  if (faqItems.length !== 7) return { ok: false, reason: "FAQ must be exactly 7" };

  const content = getBlock(blocks, "content");
  const body = safeString(content?.body || content?.content);
  if (!body || body.length < 220) return { ok: false, reason: "Content body too short" };
  if (!/<p[\s>]/i.test(body)) return { ok: false, reason: "Content body must include <p>" };
  if (!/<ul[\s>]/i.test(body) || !/<li[\s>]/i.test(body)) return { ok: false, reason: "Content body must include a bullet list" };
  if (containsAny(body, CONSULTING_MEMO_PHRASES)) return { ok: false, reason: "Content body looks like a memo" };

  const cta = getBlock(blocks, "cta");
  if (normalizeWhitespace(cta?.headline).length < 18) return { ok: false, reason: "CTA headline too short" };
  if (normalizeWhitespace(cta?.subhead).length < 80) return { ok: false, reason: "CTA subhead too thin" };
  if (normalizeWhitespace(cta?.buttonLabel).length < 8) return { ok: false, reason: "CTA button label too short" };

  return { ok: true };
}

function validateDocumentBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };

  // Hard blocks: memo/spec
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like a memo (must generate document HTML)" };
  if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Output resembles an agent/spec document (must generate document HTML)" };

  // Shape gate
  const sg = shapeGate(parsed, "document");
  if (!sg.ok) return sg;

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };

  // HARD-GATE: document builds must not include pages
  if (Array.isArray((snap as any)?.pages) && (snap as any).pages.length > 0) {
    return { ok: false, reason: "Document build must not include snapshot.pages" };
  }

  if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };

  const docs = arr((snap as any).documents);
  if (docs.length < 1) return { ok: false, reason: "Missing documents[]" };

  for (const d of docs) {
    if (!isNonEmptyString(d?.id)) return { ok: false, reason: "Document missing id" };
    if (!isNonEmptyString(d?.title)) return { ok: false, reason: "Document missing title" };
    if (!isNonEmptyString(d?.category)) return { ok: false, reason: "Document missing category" };
    if (d?.format !== "html") return { ok: false, reason: "Document format must be 'html'" };

    const body = safeString(d?.body_html);
    if (body.length < 600) return { ok: false, reason: "Document body too short" };
    if (!/<p[\s>]/i.test(body)) return { ok: false, reason: "Document must include <p>" };

    const hasHeading = /<h1[\s>]|<h2[\s>]/i.test(body);
    const hasSections = /<h2[\s>]|<h3[\s>]/i.test(body);
    if (!hasHeading || !hasSections) return { ok: false, reason: "Document needs headings/sections" };

    if (!/(not legal advice|attorney|counsel|jurisdiction)/i.test(body)) {
      return { ok: false, reason: "Document missing a legal/disclaimer signal" };
    }

    if (containsAny(body, CONSULTING_MEMO_PHRASES)) return { ok: false, reason: "Document body looks like a memo" };
  }

  return { ok: true };
}

function validateBuildResponse(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  // Shape gate first
  const sg = shapeGate(parsed, buildType);
  if (!sg.ok) return sg;

  if (parsed.type === "chat") {
    const msg = normalizeWhitespace(parsed.message);
    if (msg.length < 20) return { ok: false, reason: "Chat message too short" };
    if (containsAny(msg, CONSULTING_MEMO_PHRASES)) return { ok: false, reason: "Chat reply looks like a memo (ask only 1–2 questions)" };
    if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Chat reply resembles an agent/spec (ask only 1–2 questions)" };
    return { ok: true };
  }

  if (buildType === "document") return validateDocumentBuild(parsed);
  return validateWebsiteBuild(parsed);
}

/* -----------------------------
ANCHOR:PROMPTS
-------------------------------- */
function buildCreativeBrief(
  messages: any[],
  buildType: BuildType,
  opts: {
    splashChoice?: SplashChoice | null;
    buildConsoleMode?: BuildConsoleMode | null;
    documentCategory?: DocumentItem["category"] | null;
    jurisdiction?: string | null;
  }
) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 2500);

  const typeGuidance: Record<BuildType, string> = {
    landing_page:
      "Landing page: ONE goal. Make it feel premium and high-trust. Strong CTA, tight copy, minimal nav. Still produce the required blocks.",
    website:
      "Website: a polished multi-section marketing site. Must feel ultra high-tech, human, helpful, and export-ready. No strategy memos — only page blocks.",
    application:
      "Application: speak in workflows, roles, dashboards, operational clarity, security posture. Still produce blocks and keep it conversion-friendly.",
    document:
      "Document: draft a real professional document in HTML. No website. Output snapshot.documents[] only. Include clear headings, placeholders, and not-legal-advice disclaimer.",
    store:
      "Store: ecommerce confidence: catalog, products, cart/checkout, shipping/returns clarity, trust signals. Still produce required blocks.",
    other:
      "Other: infer responsibly, still output a premium snapshot with concrete deliverables and exportable structure.",
  };

  const splashLine =
    opts.splashChoice || opts.buildConsoleMode
      ? `- Vision Splash Flow hints: splashChoice=${opts.splashChoice || "n/a"}, buildConsoleMode=${opts.buildConsoleMode || "n/a"}`
      : "";

  const docChooserLine =
    buildType === "document" && (opts.documentCategory || opts.jurisdiction)
      ? `- Document chooser: category=${opts.documentCategory || "n/a"}, jurisdiction=${opts.jurisdiction || "n/a"}`
      : "";

  return `
CREATIVE BRIEF (BUILDER MODE — OUTPUT ARTIFACTS, NOT A MEMO)
- Build type: ${buildType}
- Type guidance: ${typeGuidance[buildType]}
${splashLine}
${docChooserLine}
- User request (may include 'TYPE:' tag): ${userText || "Not specified — infer responsibly and ask 1–2 questions only if absolutely necessary."}

STYLE & FEEL (ULTRA HIGH-TECH, FRIENDLY, THOROUGH)
- Aesthetic: refined minimalism + high-tech precision. Clean white/neutral base, one strong accent, crisp hierarchy.
- Voice: confident, kind, helpful, detail-oriented. Short sentences when needed. No fluff.
- Depth: thorough in content, but expressed inside blocks (not a giant strategy doc).
- Trust: realistic, grounded. No fake brands/awards. Avoid guarantees.

HARD CONSTRAINTS (NON-NEGOTIABLE)
- Do NOT output architecture/performance/timeline/stack recommendations.
- Do NOT include headings like “Performance Targets”, “Technical Stack”, “Estimated Timeline”, “Information Architecture”.
- Do NOT output agent specs (missions/tools/guardrails/escalation triggers).
- Produce BUILD ARTIFACTS ONLY:
  * Non-document: snapshot.pages[] with required blocks.
  * Document: snapshot.documents[] only.
- Make deliverables explicit: export, ownership, what user receives.

COPY RULES
- No buzzword soup. Avoid: ${GENERIC_BAD.join(", ")}.
- Be concrete: audience, outcomes, scope, deliverables, next steps.
`.trim();
}

function buildSystemPrompt(
  brief: string,
  buildType: BuildType,
  opts: { documentCategory?: DocumentItem["category"] | null; jurisdiction?: string | null }
) {
  if (buildType === "document") {
    const docNudge =
      opts.documentCategory || opts.jurisdiction
        ? `\nDOCUMENT TARGETING:\n- The user selected category="${opts.documentCategory || "n/a"}" and jurisdiction="${opts.jurisdiction || "n/a"}".\n- Draft the correct document immediately. Avoid questions unless truly necessary.\n`
        : "";

    return `
You are Buildlio — an ultra high-trust, professional document generator.
You do NOT write strategy. You generate export-ready artifacts.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object.
- No markdown, no backticks, no commentary.
- Must be strict JSON (double quotes only).

BANNED CONTENT (FAIL THE BUILD):
- Any mention of: "Estimated Timeline", "Technical Stack Recommendation", "Performance Targets", "Information Architecture", "Core Web Vitals", "Lighthouse".
- Any agent spec headings like: "PRIMARY MISSION", "AVAILABLE TOOLS", "GUARDRAILS", "ESCALATION TRIGGERS".
- Any YAML/code fences or markdown headings.

RESPONSE TYPES:
1) Rare: need one missing detail
{ "type": "chat", "message": "Warm, helpful. Ask 1–2 laser-focused questions. Nothing else." }

2) Default: build now
{
  "type": "build",
  "message": "Your document draft is ready to export.",
  "snapshot": {
    "appName": "Buildlio Documents",
    "meta": { "buildType": "document", "intent": "one sentence intent" },
    "documents": [
      {
        "id": "doc_1",
        "title": "…",
        "category": "…",
        "jurisdiction": "…",
        "format": "html",
        "body_html": "<h1>…</h1><p>…</p><h2>…</h2>…",
        "fields": [{"key":"sender_name","label":"Sender Name","type":"text","required":true}],
        "warnings": ["Not legal advice. Consider attorney review for your jurisdiction."]
      }
    ]
  }
}

DOCUMENT RULES (NON-NEGOTIABLE):
- Do NOT output snapshot.pages.
- body_html MUST include: <h1>, multiple <h2>/<h3>, many <p>, placeholders like [Name], [Address], [Date].
- Must include a short “Not legal advice” section. Encourage counsel review where appropriate.
- Tone: professional, calm, firm. Never illegal instructions. Never claim you are a lawyer.

DECISION RULE:
- If the user gave ANY usable context, build immediately.
- Only ask questions if no usable context exists at all.
${docNudge}
${brief}
`.trim();
  }

  return `
You are Buildlio — an ultra high-tech website generator.
You do NOT write strategy or architecture docs. You generate exportable page blocks.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object.
- No markdown, no backticks, no commentary.
- Must be strict JSON (double quotes only).

BANNED CONTENT (FAIL THE BUILD):
- Any mention of: "Estimated Timeline", "Technical Stack Recommendation", "Performance Targets", "Information Architecture", "Core Web Vitals", "Lighthouse".
- Any "Would you like me to elaborate" style closing.
- Any agent specs (missions/tools/guardrails/escalation triggers) or YAML/code fences.

RESPONSE TYPES:
1) Rare: need one missing detail
{ "type": "chat", "message": "Warm, helpful. Ask 1–2 laser-focused questions. Nothing else." }

2) Default: build now
{
  "type": "build",
  "message": "Your premium snapshot is ready to export.",
  "snapshot": {
    "appName": "Brand Name",
    "tagline": "Short, punchy, specific tagline",
    "meta": { "buildType": "website", "intent": "one sentence intent" },
    "navigation": { "items": ["Home", "Work", "About", "Resume", "Contact"] },
    "pages": [
      {
        "slug": "index",
        "title": "Home",
        "blocks": [
          { "type": "hero", "headline": "...", "subhead": "...", "cta": { "label": "..." } },
          { "type": "features", "title": "...", "items": [{"title":"...","description":"..."}] },
          { "type": "stats", "stats": [{"label":"...","value":"..."}] },
          { "type": "testimonials", "items": [{"quote":"...","name":"...","role":"...","company":"..."}] },
          { "type": "pricing", "plans": [{"name":"...","price":"...","interval":"mo","popular":true,"features":["..."],"cta":"..."}] },
          { "type": "faq", "items": [{"q":"...","a":"..."}] },
          { "type": "content", "title":"...", "body":"<p>...</p>...<ul><li>...</li></ul>" },
          { "type": "cta", "headline":"...", "subhead":"...", "buttonLabel":"..." }
        ]
      }
    ]
  }
}

NON-NEGOTIABLE STRUCTURE:
- The INDEX page MUST contain these blocks exactly once each:
  hero, features, stats, testimonials, pricing, faq, content, cta
- Exact counts:
  * features.items: EXACTLY 6
  * stats.stats: EXACTLY 4
  * testimonials.items: EXACTLY 3
  * pricing.plans: EXACTLY 3 (EXACTLY ONE popular=true)
  * each pricing plan features: EXACTLY 6 bullets
  * faq.items: EXACTLY 7

BUILD-TYPE BEHAVIOR:
- landing_page: nav minimal; still keep required blocks.
- store: nav names adapted for ecommerce; keep required blocks.
- application: nav names adapted for portal/app; keep required blocks.
- website: feel like a premium modern agency build; thorough, helpful, export-ready.

STYLE TARGET:
- Ultra high-tech refined minimalism. Precise wording. Friendly and thorough.
- No strategy sections — all substance must live inside blocks.

${brief}
`.trim();
}

function buildPolishInstruction(messages: any[], reason: string, buildType: BuildType) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const ctx = safeString(lastUser?.content).slice(0, 1800);

  return `
POLISH PASS — REBUILD AS ARTIFACTS (NOT A MEMO)
Failure reason: ${reason}
Build type: ${buildType}

DO THIS:
- Rebuild from scratch.
- Output strict JSON only (no markdown, no backticks).
- If non-document: output snapshot.pages ONLY (no documents).
- If document: output snapshot.documents ONLY (no pages).
- Do NOT include any strategy headings or recommendations.
- Do NOT produce agent specs (missions/tools/guardrails/escalation triggers).

BANNED PHRASES:
${CONSULTING_MEMO_PHRASES.map((x) => `- ${x}`).join("\n")}

USER CONTEXT:
${ctx}
`.trim();
}

/* -----------------------------
ANCHOR:POST
-------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const projectId = String(body.projectId || "");
    const messages = body.messages || [];

    const splashChoice = canonicalizeSplashChoice(body.splashChoice) || null;
    const buildConsoleMode = canonicalizeBuildConsoleMode(body.buildConsoleMode) || null;

    const documentCategory = canonicalizeDocumentCategory(body.documentCategory) || null;
    const jurisdiction = isNonEmptyString(body.jurisdiction) ? String(body.jurisdiction).trim() : null;

    const explicitType = canonicalizeBuildType(body.buildType);
    const detected = detectBuildTypeFromText(messages);
    const buildType: BuildType = explicitType || detected || "website";

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const brief = buildCreativeBrief(messages, buildType, {
      splashChoice,
      buildConsoleMode,
      documentCategory,
      jurisdiction,
    });

    const systemPrompt = buildSystemPrompt(brief, buildType, { documentCategory, jurisdiction });

    async function runClaude(callMessages: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 11000,
        temperature: 0.62,
        system: systemPrompt,
        messages: callMessages,
      });

      let rawOutput = "{}";
      const textBlocks = (aiResponse as any).content?.filter((b: any) => b.type === "text") || [];
      if (textBlocks.length > 0) rawOutput = textBlocks.map((b: any) => b.text).join("\n");

      const extracted = extractJson(rawOutput);

      let parsed: BuildlioResponse;
      try {
        parsed = JSON.parse(extracted);
      } catch (e) {
        console.error("JSON Parse Error:", extracted);
        throw new Error("AI returned malformed JSON. Please try again.");
      }

      // Ensure meta.buildType exists (and aligns to the route's chosen buildType)
      if ((parsed as any)?.type === "build" && (parsed as any)?.snapshot) {
        (parsed as any).snapshot.meta = (parsed as any).snapshot.meta || {};
        (parsed as any).snapshot.meta.buildType = (parsed as any).snapshot.meta.buildType || buildType;

        // Preserve Vision Splash Flow + chooser hints in meta (non-breaking)
        if (splashChoice) (parsed as any).snapshot.meta.splashChoice = (parsed as any).snapshot.meta.splashChoice || splashChoice;
        if (buildConsoleMode) (parsed as any).snapshot.meta.buildConsoleMode = (parsed as any).snapshot.meta.buildConsoleMode || buildConsoleMode;

        if (buildType === "document") {
          if (documentCategory) (parsed as any).snapshot.meta.documentCategory = (parsed as any).snapshot.meta.documentCategory || documentCategory;
          if (jurisdiction) (parsed as any).snapshot.meta.jurisdiction = (parsed as any).snapshot.meta.jurisdiction || jurisdiction;
        }

        (parsed as any).snapshot.meta.intent =
          (parsed as any).snapshot.meta.intent ||
          `Buildlio ${buildType} generation${splashChoice ? ` (${splashChoice})` : ""}${buildConsoleMode ? ` [${buildConsoleMode}]` : ""}`;
      }

      return parsed;
    }

    // Attempt 1
    let parsedResponse = await runClaude(messages);
    let validation = validateBuildResponse(parsedResponse, buildType);

    // Attempt 2 (polish pass)
    if (!validation.ok) {
      const polish = buildPolishInstruction(messages, validation.reason || "Unknown", buildType);
      const retryMessages = [...messages, { role: "user", content: polish }];
      parsedResponse = await runClaude(retryMessages);
      validation = validateBuildResponse(parsedResponse, buildType);
    }

    // Still failing: minimal question
    if (!validation.ok) {
      const fallback: BuildlioResponse = {
        type: "chat",
        message:
          buildType === "document"
            ? "One quick detail so I can generate the correct draft: what document category (letter/contract/policy/etc.) and what jurisdiction/state? If you want, paste any key names/dates in one line."
            : "One quick detail so I can generate the right snapshot: what are you building (TYPE: website / landing_page / store / application) and who is it for? One sentence is perfect.",
      };
      return NextResponse.json({ success: true, data: fallback });
    }

    // Save & charge only on build
    if (parsedResponse.type === "build" && (parsedResponse as any).snapshot) {
      const noteParts = [`Professional Build v5.6 (${buildType})`];
      if (splashChoice) noteParts.push(`splash:${splashChoice}`);
      if (buildConsoleMode) noteParts.push(`console:${buildConsoleMode}`);
      if (buildType === "document" && documentCategory) noteParts.push(`doc:${documentCategory}`);
      if (buildType === "document" && jurisdiction) noteParts.push(`jur:${jurisdiction}`);

      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: (parsedResponse as any).snapshot,
        p_note: noteParts.join(" • "),
        p_model: "claude-sonnet-4-6",
      });

      if (rpcError) {
        console.error("DB error:", rpcError);
        return NextResponse.json({ success: false, error: "Failed to save version" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: parsedResponse });
  } catch (err: unknown) {
    console.error("API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}