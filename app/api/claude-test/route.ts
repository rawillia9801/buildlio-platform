// FILE: app/api/claude-test/route.ts
// BUILDLIO.SITE — v5.5 Backend (Vision Splash Flow Wiring + Build Types + Document Mode + Dual Validators)
//
// CHANGELOG
// - v5.5
//   * ENHANCE: Accepts optional splashChoice + buildConsoleMode hints from the Vision Splash Flow
//              (white beats / ripple / “sync vs sploosh” / intro), and threads them into the creative brief.
//   * ENHANCE: Adds optional “second-step chooser” inputs for Documents (documentCategory, jurisdiction),
//              so the backend can produce the correct doc type immediately (no extra chat step).
//   * KEEP: HARD-GATE: document builds MUST NOT include snapshot.pages (fail + polish pass)
//   * KEEP: HARD-GATE: non-document builds MUST NOT include snapshot.documents (fail + polish pass)
//   * KEEP: buildType canonicalization accepts aliases (landing-page, landingpage, docs, shop, app)
//   * KEEP: parser accepts hyphens/underscores/spaces consistently
//   * KEEP: Document mode outputs snapshot.documents[] (NOT pages[])
//   * KEEP: Document-specific validator + quality gate (no website blocks required for documents)
//   * KEEP: Website/store/landing/app/other remain website-style snapshot.pages[] with required blocks on index
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

    // optional metadata (UI can send; backend preserves)
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

    // optional metadata (UI can send; backend preserves)
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

function safeString(v: any) {
  return typeof v === "string" ? v : "";
}
function normalizeWhitespace(s: any) {
  return safeString(s).replace(/\s+/g, " ").trim();
}
function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}
function extractJson(raw: string) {
  let out = raw || "{}";
  const jsonStart = out.indexOf("{");
  const jsonEnd = out.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    out = out.slice(jsonStart, jsonEnd + 1);
  }
  return out;
}
function arr(v: any) {
  return Array.isArray(v) ? v : [];
}
function getBlock(blocks: any[], type: string) {
  return arr(blocks).find((b) => b && b.type === type);
}

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

function containsAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}
function hasSpecificitySignals(text: string) {
  const t = text.toLowerCase();
  const hasNumber = /\d/.test(t);
  const hasConcreteNouns =
    /(calls|bookings|leads|appointments|orders|checkout|invoices|quotes|estimates|calendar|crm|pipeline|onboarding|templates|contracts|deliverables|export|ownership|domain|storefront|catalog|cart|sku|inventory|checkout|shipping)/.test(
      t
    );
  const hasAudience =
    /(for (local|small|busy|solo|independent|new|growing|service|trade|clinic|salon|agency|coach|creator|restaurant|shop|startup|saas|ecommerce|seller))/i.test(
      text
    );
  return hasNumber || (hasConcreteNouns && hasAudience);
}

/* -----------------------------
ANCHOR:BUILD_TYPE_DETECT
-------------------------------- */
function canonicalizeBuildType(raw: any): BuildType | null {
  const t0 = normalizeWhitespace(raw).toLowerCase();
  if (!t0) return null;

  // normalize common separators
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

  // supports:
  // "TYPE: store"
  // "TYPE: landing page"
  // "TYPE: landing-page"
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

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };

  // HARD-GATE: website builds must not include documents
  if (Array.isArray(snap?.documents) && snap.documents.length > 0) {
    return { ok: false, reason: "Website build must not include snapshot.documents" };
  }

  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };
  if (!Array.isArray(snap.pages) || snap.pages.length < 1) return { ok: false, reason: "Missing pages" };

  const page0 = snap.pages[0];
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
    if (!/\d/.test(quote) && !/(week|weeks|days|hours|export|draft|template|booked|leads|orders|clients|checkout|catalog|portal)/i.test(quote)) {
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

  const cta = getBlock(blocks, "cta");
  if (normalizeWhitespace(cta?.headline).length < 18) return { ok: false, reason: "CTA headline too short" };
  if (normalizeWhitespace(cta?.subhead).length < 80) return { ok: false, reason: "CTA subhead too thin" };
  if (normalizeWhitespace(cta?.buttonLabel).length < 8) return { ok: false, reason: "CTA button label too short" };

  return { ok: true };
}

function validateDocumentBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };

  // HARD-GATE: document builds must not include pages
  if (Array.isArray(snap?.pages) && snap.pages.length > 0) {
    return { ok: false, reason: "Document build must not include snapshot.pages" };
  }

  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };

  const docs = arr(snap.documents);
  if (docs.length < 1) return { ok: false, reason: "Missing documents[]" };

  for (const d of docs) {
    if (!isNonEmptyString(d?.id)) return { ok: false, reason: "Document missing id" };
    if (!isNonEmptyString(d?.title)) return { ok: false, reason: "Document missing title" };
    if (!isNonEmptyString(d?.category)) return { ok: false, reason: "Document missing category" };
    if (d?.format !== "html") return { ok: false, reason: "Document format must be 'html'" };

    const body = safeString(d?.body_html);
    if (body.length < 600) return { ok: false, reason: "Document body too short" };
    if (!/<p[\s>]/i.test(body)) return { ok: false, reason: "Document must include <p>" };

    // Basic “looks like a document” signals
    const hasHeading = /<h1[\s>]|<h2[\s>]/i.test(body);
    const hasSections = /<h2[\s>]|<h3[\s>]/i.test(body);
    if (!hasHeading || !hasSections) return { ok: false, reason: "Document needs headings/sections" };

    // Ensure it includes some kind of disclaimer signal (kept flexible)
    if (!/(not legal advice|attorney|counsel|jurisdiction)/i.test(body)) {
      return { ok: false, reason: "Document missing a legal/disclaimer signal" };
    }
  }

  return { ok: true };
}

function validateBuildResponse(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) {
    return { ok: false, reason: "Missing/invalid type" };
  }

  if (parsed.type === "chat") {
    const msg = normalizeWhitespace(parsed.message);
    if (msg.length < 20) return { ok: false, reason: "Chat message too short" };
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
    landing_page: "Landing page: focus on ONE goal (lead capture, waitlist, booking, demo request). Copy should be tight and high-converting.",
    website: "Website: full multi-section marketing site with trust, details, and clear next steps.",
    application: "Application: position around workflows, roles, dashboard outcomes, and operational clarity. Use language like 'portal', 'workflow', 'handoff', 'audit trail' when relevant.",
    document:
      "Document: generate real professional documents (letters/contracts/policies). Do NOT generate a website. Output snapshot.documents[] with print-ready HTML sections, placeholders/fields, and cautious language (not legal advice).",
    store: "Store: position around catalog, product pages, cart/checkout, trust (shipping/returns), and conversion. Use ecommerce language and buyer confidence.",
    other: "Other: infer responsibly, still produce a premium, specific build.",
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
CREATIVE BRIEF
- Build type: ${buildType}
- Type guidance: ${typeGuidance[buildType]}
${splashLine}
${docChooserLine}
- User request (may include 'TYPE:' tag): ${userText || "Not specified — infer responsibly and ask 1–2 questions only if absolutely necessary."}
- Voice: premium, calm confidence, human, direct — not rushed.
- Constraints:
  * No fake awards, no fake famous clients, no guaranteed results.
  * If buildType=document: include “not legal advice” style disclaimer and encourage review by counsel where appropriate.
  * Make deliverables explicit (export/ownership, what the user receives).
`.trim();
}

function buildSystemPrompt(brief: string, buildType: BuildType, opts: { documentCategory?: DocumentItem["category"] | null; jurisdiction?: string | null }) {
  if (buildType === "document") {
    const docNudge =
      opts.documentCategory || opts.jurisdiction
        ? `\nDOCUMENT TARGETING:\n- The user selected category="${opts.documentCategory || "n/a"}" and jurisdiction="${opts.jurisdiction || "n/a"}".\n- Draft the correct document immediately. Avoid asking questions unless truly necessary.\n`
        : "";

    return `
You are Buildlio — a professional document drafter (letters, contracts, policies, templates).
Your output reads like a real firm drafted it: structured, clear, consistent, and ready to export.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object.
- No markdown, no backticks, no commentary.
- Must be strict JSON (double quotes only).

RESPONSE TYPES:
1) If you truly need more details (rare):
{ "type": "chat", "message": "Warm, helpful reply + 1–2 laser-focused questions." }

2) Otherwise build immediately:
{
  "type": "build",
  "message": "Your document draft is ready.",
  "snapshot": {
    "appName": "Buildlio Documents",
    "meta": { "buildType": "document", "intent": "one sentence intent" },
    "documents": [
      {
        "id": "doc_1",
        "title": "Cease and Desist Letter — Defamation / Harassment",
        "category": "cease_and_desist",
        "jurisdiction": "Virginia",
        "format": "html",
        "body_html": "<h1>...</h1><p>...</p><h2>...</h2>...",
        "fields": [{"key":"sender_name","label":"Sender Name","type":"text","required":true}],
        "warnings": ["Not legal advice. Consider attorney review for your jurisdiction."]
      }
    ]
  }
}

DOCUMENT RULES (NON-NEGOTIABLE):
- Do NOT output snapshot.pages.
- Output snapshot.documents as an array with at least 1 document.
- Each document body_html MUST include:
  * Title heading (<h1>)
  * Section headings (<h2>/<h3>)
  * Paragraphs (<p>)
  * A short “Not legal advice” disclaimer section
  * Clear placeholders like [Name], [Address], [Date], etc where needed
- Tone: professional, calm, firm (never threatening violence; never illegal instructions).
- Avoid claiming you are a lawyer. Encourage review by counsel where appropriate.

DECISION RULE:
- If the user has ANY context, build immediately.
- Only ask questions if user gave no usable context at all.
${docNudge}
${brief}
`.trim();
  }

  return `
You are Buildlio — a world-class AI website architect AND elite conversion copywriter.
Your output reads like a real agency deliverable: specific, persuasive, premium, modern, and grounded.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object.
- No markdown, no backticks, no commentary.
- Must be strict JSON (double quotes only).

RESPONSE TYPES:
1) If you truly need more details (rare):
{ "type": "chat", "message": "Warm, helpful reply + 1–2 laser-focused questions." }

2) Otherwise build immediately:
{
  "type": "build",
  "message": "A premium snapshot is ready.",
  "snapshot": {
    "appName": "Brand Name",
    "tagline": "Short, punchy, specific tagline",
    "meta": { "buildType": "website", "intent": "one sentence intent" },
    "navigation": { "items": ["Home", "Features", "Pricing", "About", "Contact"] },
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
- If meta.buildType is "landing_page": keep nav minimal; pricing can be framed as “Plans for ongoing optimization” (still 3 plans).
- If "store": nav should include Store, Products, Shipping, Returns, Contact (still keep 5 items total — adapt names).
- If "application": nav should include Overview, Features, Security, Pricing, Contact (still 5 items).
- If "other": infer a logical 5-item nav.

COPY “WOW” RULES:
- No buzzword soup. Avoid: innovative, cutting-edge, next-level, revolutionize, game-changer, best-in-class, synergy.
- Be concrete: audience, outcome, deliverables, timeline, ownership/export.
- Make the copy feel personal and confident, not rushed.
- Never fabricate major facts. If a detail is unknown, phrase it as an option or typical range.

${brief}
`.trim();
}

function buildPolishInstruction(messages: any[], reason: string, buildType: BuildType) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const ctx = safeString(lastUser?.content).slice(0, 1800);

  return `
Your previous output failed our quality gate.
Failure reason: ${reason}
Build type: ${buildType}

Rebuild from scratch with significantly stronger, more specific premium copy.
Follow the exact output structure required for this build type.
For document builds: output snapshot.documents ONLY (no pages).
For non-document builds: output snapshot.pages ONLY (no documents).

User context:
${ctx}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const projectId = String(body.projectId || "");
    const messages = body.messages || [];

    // Vision Splash Flow / UI hints (optional)
    const splashChoice = canonicalizeSplashChoice(body.splashChoice) || null;
    const buildConsoleMode = canonicalizeBuildConsoleMode(body.buildConsoleMode) || null;

    // Document “second-step chooser” (optional)
    const documentCategory = canonicalizeDocumentCategory(body.documentCategory) || null;
    const jurisdiction = isNonEmptyString(body.jurisdiction) ? String(body.jurisdiction).trim() : null;

    // Prefer explicit buildType from UI. Fallback to detection.
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
        temperature: 0.64,
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
            ? "Quick detail so I can draft this properly: what document do you need (letter/cease & desist/bill of sale/health guarantee/contract/policy), what state/jurisdiction, and who are the parties? One sentence is perfect."
            : "Quick detail so I can make this truly specific: what are you creating (website, landing page, store, application, or document) and who is it for? One sentence is perfect. You can start with: TYPE: store",
      };
      return NextResponse.json({ success: true, data: fallback });
    }

    // Save & charge only on build
    if (parsedResponse.type === "build" && (parsedResponse as any).snapshot) {
      const noteParts = [`Professional Build v5.5 (${buildType})`];
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