/* FILE: app/api/claude-test/route.ts */
// BUILDLIO.SITE — v5.6 Backend (Ultra Hi-Tech Builder Tone + Anti-Summary Gates + Stronger Creative Brief)

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
function shapeGate(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) return { ok: false, reason: "Missing/invalid type" };

  if (parsed.type === "chat") {
    if (typeof parsed.message !== "string") return { ok: false, reason: "Chat missing message" };
    return { ok: true };
  }

  const snap = parsed.snapshot;
  if (!snap || typeof snap !== "object") return { ok: false, reason: "Build missing snapshot" };

  const hasPages = Array.isArray((snap as any).pages);
  const hasDocs = Array.isArray((snap as any).documents);

  if (buildType === "document") {
    if (hasPages && (snap as any).pages?.length) return { ok: false, reason: "Document build must not include pages" };
    if (!hasDocs) return { ok: false, reason: "Document build missing documents[]" };
    if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
    return { ok: true };
  }

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

  if (t === "landing" || t === "landingpage" || t === "landing_page") return "landing_page";
  if (t === "website") return "website";
  if (t === "application" || t === "app" || t === "portal") return "application";
  if (t === "document" || t === "documents" || t === "docs") return "document";
  if (t === "store" || t === "shop" || t === "ecommerce") return "store";
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
    letter: "letter", cease_and_desist: "cease_and_desist", cease: "cease_and_desist", cnd: "cease_and_desist",
    bill_of_sale: "bill_of_sale", bill: "bill_of_sale", sale: "bill_of_sale", health_guarantee: "health_guarantee",
    guarantee: "health_guarantee", contract: "contract", agreement: "contract", policy: "policy",
    packet: "packet", proposal: "proposal", other: "other",
  };

  return allowed[x] || null;
}

function detectBuildTypeFromText(messages: any[]): BuildType | null {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const t = normalizeWhitespace(lastUser?.content).toLowerCase();

  const m = t.match(/(^|\n)\s*type\s*:\s*(website|landing[_\-\s]*page|landingpage|landing|application|app|portal|document|documents|docs|store|shop|ecommerce|other)\s*(\n|$)/i);
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
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like strategy plan" };
  if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Output resembles agent specification" };

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };
  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };
  if (!Array.isArray(snap.pages) || snap.pages.length < 1) return { ok: false, reason: "Missing pages" };

  const page0 = snap.pages[0];
  if (!page0 || !Array.isArray(page0.blocks)) return { ok: false, reason: "Missing blocks in index page" };

  const blocks = page0.blocks;
  const required = ["hero", "features", "stats", "testimonials", "pricing", "faq", "content", "cta"];
  const types = new Set(blocks.map((b: any) => b?.type));
  for (const r of required) if (!types.has(r)) return { ok: false, reason: `Missing block: ${r}` };

  // EXACT COUNTS ENFORCEMENT
  if (arr(getBlock(blocks, "features")?.items).length !== 6) return { ok: false, reason: "Features must contain exactly 6 items" };
  if (arr(getBlock(blocks, "stats")?.stats).length !== 4) return { ok: false, reason: "Stats must contain exactly 4 items" };
  if (arr(getBlock(blocks, "testimonials")?.items).length !== 3) return { ok: false, reason: "Testimonials must contain exactly 3 items" };
  if (arr(getBlock(blocks, "pricing")?.plans).length !== 3) return { ok: false, reason: "Pricing must contain exactly 3 plans" };
  if (arr(getBlock(blocks, "faq")?.items).length !== 7) return { ok: false, reason: "FAQ must contain exactly 7 items" };

  return { ok: true };
}

function validateDocumentBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like a memo" };
  if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Output resembles agent specification" };

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };
  const docs = arr(snap.documents);
  if (docs.length < 1) return { ok: false, reason: "Missing documents[]" };

  for (const d of docs) {
    if (safeString(d?.body_html).length < 600) return { ok: false, reason: "Document body too short" };
    if (!/<h1[\\s>]|<h2[\\s>]/i.test(d?.body_html)) return { ok: false, reason: "Document needs headings/sections" };
  }
  return { ok: true };
}

function validateBuildResponse(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  const sg = shapeGate(parsed, buildType);
  if (!sg.ok) return sg;
  if (parsed.type === "chat") return { ok: true };
  if (buildType === "document") return validateDocumentBuild(parsed);
  return validateWebsiteBuild(parsed);
}

/* -----------------------------
ANCHOR:PROMPTS
-------------------------------- */
function buildCreativeBrief(messages: any[], buildType: BuildType, opts: any) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 2500);

  return `
CREATIVE BRIEF (BUILDER MODE — OUTPUT ARTIFACTS, NOT A MEMO)
- Build type: ${buildType}
- Objective: Generate exact UI blocks or Document HTML.
- Aesthetic: Ultra high-tech refined minimalism. Friendly and thorough.
- Hard Constraint: NO architecture/timeline/stack recommendations.
- Hard Constraint: NO mission/tools/guardrails spec text.
- User request: ${userText}
`.trim();
}

function buildSystemPrompt(brief: string, buildType: BuildType, opts: any) {
  const structure = buildType === "document" 
    ? "Output snapshot.documents[] ONLY. NO snapshot.pages."
    : "Output snapshot.pages[] with EXACT blocks: hero, features (exactly 6 items), stats (exactly 4), testimonials (exactly 3), pricing (exactly 3 plans), faq (exactly 7), content, cta.";

  return `
You are Buildlio — an ultra high-tech creation engine.
You do NOT write strategy or architecture docs. You generate EXPORTABLE ARTIFACTS.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object. No markdown. No backticks. No commentary.
- BANNED: "Estimated Timeline", "Stack Recommendation", "Information Architecture", "Performance Targets".
- BANNED: "Would you like me to elaborate" style closing.
- ${structure}

RESPONSE SCHEMA:
{
  "type": "build",
  "message": "Materialization complete. Artifact ready.",
  "snapshot": { "appName": "...", "pages": [...] or "documents": [...] }
}

${brief}
`.trim();
}

function buildPolishInstruction(reason: string, buildType: BuildType) {
  return `POLISH PASS: Previous attempt failed validation: ${reason}. Rebuild as strict JSON artifacts only. NO strategy memos.`.trim();
}

/* -----------------------------
ANCHOR:POST
-------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, messages } = body;

    const explicitType = canonicalizeBuildType(body.buildType);
    const detected = detectBuildTypeFromText(messages);
    const buildType: BuildType = explicitType || detected || "website";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const brief = buildCreativeBrief(messages, buildType, body);
    const systemPrompt = buildSystemPrompt(brief, buildType, body);

    async function runClaude(msgList: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 11000,
        temperature: 0.62,
        system: systemPrompt,
        messages: msgList,
      });

      const rawOutput = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : "{}";
      return JSON.parse(extractJson(rawOutput));
    }

    // Attempt 1
    let parsedResponse = await runClaude(messages);
    let validation = validateBuildResponse(parsedResponse, buildType);

    // Attempt 2 (Polish Pass)
    if (!validation.ok) {
      const polish = buildPolishInstruction(validation.reason || "Invalid structure", buildType);
      parsedResponse = await runClaude([...messages, { role: "user", content: polish }]);
      validation = validateBuildResponse(parsedResponse, buildType);
    }

    if (!validation.ok) {
      return NextResponse.json({ success: true, data: { type: "chat", message: `Clarity needed: ${validation.reason}.` } });
    }

    // SAVE & CHARGE
    if (parsedResponse.type === "build") {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: `Buildlio Engine Materialization v5.6 (${buildType})`,
        p_model: "claude-3-5-sonnet",
      });
      if (rpcError) console.error("RPC Charge Error:", rpcError);
    }

    return NextResponse.json({ success: true, data: parsedResponse });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}