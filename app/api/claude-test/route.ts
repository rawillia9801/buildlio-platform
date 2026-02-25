/* FILE: app/api/claude-test/route.ts
   BUILDLIO.SITE — v5.6.1 Backend
   Fixes + Enhancements:
   - FIX: Next cookies integration (setAll actually writes cookies)
   - FIX: cookies() is sync (no await) + safer Supabase SSR client wiring
   - FIX: Robust Claude text extraction (handles multi-part content)
   - FIX: Robust JSON extraction + parse fallback (never throws on bad JSON)
   - IMPROVE: BuildType canonicalization supports UI values (agent/app/website/store/document/other)
   - IMPROVE: Hard-gates applied to RAW model output (before JSON stringify loses markdown signal)
   - IMPROVE: Stronger “artifact-only” system prompt + meta passthrough
   - IMPROVE: Better failure returns (clear, actionable) + optional 3rd retry
*/

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/* -----------------------------
ANCHOR:CONFIG
-------------------------------- */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Prefer env override, else default to a stable Claude Sonnet model.
// NOTE: Use the exact model string your account supports.
const DEFAULT_MODEL = process.env.BUILDLIO_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type BuildType =
  | "website"
  | "landing_page"
  | "application"
  | "document"
  | "store"
  | "other"
  // UI-only types (we canonicalize them)
  | "agent"
  | "app";

type SplashChoice = "sync" | "sploosh" | "ripple" | "none";
type BuildConsoleMode = "white_console" | "standard" | "none";

type DocumentCategory =
  | "letter"
  | "cease_and_desist"
  | "bill_of_sale"
  | "health_guarantee"
  | "contract"
  | "policy"
  | "packet"
  | "proposal"
  | "other";

type DocumentItem = {
  id: string;
  title: string;
  category: DocumentCategory;
  jurisdiction?: string;
  format: "html";
  body_html: string;
  fields?: Array<{ key: string; label: string; type: "text" | "date" | "number" | "checkbox"; required?: boolean }>;
  warnings?: string[];
};

type SiteSnapshot = {
  appName: string;
  tagline?: string;
  navigation?: { items: string[] };
  meta?: {
    buildType?: BuildType;
    intent?: string;
    splashChoice?: SplashChoice;
    buildConsoleMode?: BuildConsoleMode;
    documentCategory?: DocumentCategory;
    jurisdiction?: string;
  };
  pages: Array<{ slug: string; title?: string; blocks: any[] }>;
};

type DocSnapshot = {
  appName: string;
  meta?: {
    buildType?: BuildType;
    intent?: string;
    splashChoice?: SplashChoice;
    buildConsoleMode?: BuildConsoleMode;
    documentCategory?: DocumentCategory;
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

/**
 * Extract the first plausible JSON object from a raw model response.
 * - Tries to find the first "{" and its matching ending "}" by lastIndex.
 * - If that fails, returns "{}" (never throws).
 */
function extractJson(raw: string) {
  const text = raw || "";
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }
  return "{}";
}

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Claude may return multiple content blocks.
 * Pull all text blocks and join.
 */
function extractClaudeText(aiResponse: any): string {
  const parts = arr(aiResponse?.content);
  const texts = parts
    .map((p: any) => (p?.type === "text" ? safeString(p.text) : ""))
    .filter((t: string) => t.length > 0);
  return texts.join("\n").trim();
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
  "here's a breakdown",
  "scope:",
  "supporting pages",
  "technical standards",
];

function rawLooksLikeMemo(rawText: string): boolean {
  return containsAny(rawText || "", CONSULTING_MEMO_PHRASES);
}

/* -----------------------------
ANCHOR:ANTI_AGENT_SPEC_FINGERPRINTS
-------------------------------- */
const AGENT_SPEC_FINGERPRINTS = [
  "primary mission",
  "core directive",
  "success metrics",
  "available tools",
  "role-based permissions",
  "least privilege",
  "gdpr/ccpa",
  "escalation triggers",
  "critical guardrails",
  "fail-safe mechanisms",
  "operational framework",
  "continuous learning loop",
  "prohibited actions",
  "circuit breakers",
];

function containsMarkdownish(raw: string) {
  const s = raw || "";
  if (/(^|\n)\s*#{1,6}\s+/m.test(s)) return true;
  if (/```/.test(s)) return true;
  if (/(^|\n)\s*-\s+/.test(s)) return true;
  return false;
}

function rawLooksLikeAgentSpec(rawText: string) {
  const s = (rawText || "").toLowerCase();
  if (containsAny(s, AGENT_SPEC_FINGERPRINTS)) return true;
  if (containsMarkdownish(rawText)) return true;
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

  // Canonical doc check
  if (buildType === "document") {
    if (hasPages && (snap as any).pages?.length) return { ok: false, reason: "Document build must not include pages" };
    if (!hasDocs) return { ok: false, reason: "Document build missing documents[]" };
    if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
    return { ok: true };
  }

  // Non-doc: must be pages-only
  if (hasDocs && (snap as any).documents?.length) return { ok: false, reason: "Non-document build must not include documents" };
  if (!hasPages) return { ok: false, reason: "Non-document build missing pages[]" };
  if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
  return { ok: true };
}

/* -----------------------------
ANCHOR:BUILD_TYPE_DETECT
-------------------------------- */
function canonicalizeBuildType(raw: any): BuildType | null {
  const t0 = normalizeWhitespace(raw).toLowerCase();
  if (!t0) return null;

  const t = t0.replace(/[-\s]+/g, "_").replace(/__+/g, "_").trim();

  // UI values
  if (t === "agent") return "agent";
  if (t === "app") return "app";

  // Canonical values
  if (t === "landing" || t === "landingpage" || t === "landing_page") return "landing_page";
  if (t === "website") return "website";
  if (t === "application" || t === "portal") return "application";
  if (t === "document" || t === "documents" || t === "docs") return "document";
  if (t === "store" || t === "shop" || t === "ecommerce") return "store";
  if (t === "other") return "other";

  return null;
}

/**
 * IMPORTANT: your front-end uses buildType like:
 * website | agent | store | document | app | other
 * But your backend artifact validators are “document vs non-document”.
 * We keep agent/app as non-document.
 */
function toArtifactBuildType(t: BuildType): Exclude<BuildType, "agent" | "app"> {
  if (t === "agent") return "application"; // treat agents as app-like UI artifacts
  if (t === "app") return "application";
  return t as Exclude<BuildType, "agent" | "app">;
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

function canonicalizeDocumentCategory(raw: any): DocumentCategory | null {
  const t = normalizeWhitespace(raw).toLowerCase();
  if (!t) return null;
  const x = t.replace(/[-\s]+/g, "_").trim();

  const allowed: Record<string, DocumentCategory> = {
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
    /(^|\n)\s*type\s*:\s*(website|landing[_\-\s]*page|landingpage|landing|application|app|portal|agent|document|documents|docs|store|shop|ecommerce|other)\s*(\n|$)/i
  );
  if (m?.[2]) return canonicalizeBuildType(m[2]);

  if (/(agent|autonomous|assistant|workflow agent|support agent|sales agent|ops agent)/i.test(t)) return "agent";
  if (/(store|shop|checkout|cart|products|sku|inventory|shipping|returns)/i.test(t)) return "store";
  if (/(application|dashboard|login|roles|admin|workflow|crud|portal|audit trail)/i.test(t)) return "application";
  if (
    /(document|documents|letter|letters|proposal|contract|policy|terms|agreement|handbook|guide|cease and desist|bill of sale|health guarantee)/i.test(
      t
    )
  )
    return "document";
  if (/(landing page|single page|one page|lead capture|waitlist|signup|book a call)/i.test(t)) return "landing_page";
  if (t.length > 0) return "website";

  return null;
}

/* -----------------------------
ANCHOR:VALIDATORS
-------------------------------- */
function snapshotLooksLikeMemo(parsed: any): boolean {
  const s = JSON.stringify(parsed || {});
  return containsAny(s, CONSULTING_MEMO_PHRASES);
}
function looksLikeAgentSpecObject(obj: any) {
  const s = JSON.stringify(obj || {}).toLowerCase();
  return containsAny(s, AGENT_SPEC_FINGERPRINTS);
}

function validateWebsiteBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like strategy memo" };
  if (looksLikeAgentSpecObject(parsed)) return { ok: false, reason: "Output resembles agent specification" };

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

  // Exact counts
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
  if (looksLikeAgentSpecObject(parsed)) return { ok: false, reason: "Output resembles agent specification" };

  const snap = parsed?.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };
  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };

  const docs = arr(snap.documents);
  if (docs.length < 1) return { ok: false, reason: "Missing documents[]" };

  for (const d of docs) {
    if (safeString(d?.body_html).length < 600) return { ok: false, reason: "Document body too short" };
    if (!/<h1[\s>]|<h2[\s>]/i.test(d?.body_html)) return { ok: false, reason: "Document needs headings/sections" };
  }
  return { ok: true };
}

function validateBuildResponse(parsed: any, artifactBuildType: Exclude<BuildType, "agent" | "app">): { ok: boolean; reason?: string } {
  const sg = shapeGate(parsed, artifactBuildType);
  if (!sg.ok) return sg;
  if (parsed.type === "chat") return { ok: true };
  if (artifactBuildType === "document") return validateDocumentBuild(parsed);
  return validateWebsiteBuild(parsed);
}

/* -----------------------------
ANCHOR:PROMPTS
-------------------------------- */
function buildCreativeBrief(messages: any[], buildType: Exclude<BuildType, "agent" | "app">, opts: any) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 3000);

  const splashChoice = canonicalizeSplashChoice(opts?.splashChoice) || canonicalizeSplashChoice(opts?.snapshot?.meta?.splashChoice);
  const buildConsoleMode = canonicalizeBuildConsoleMode(opts?.buildConsoleMode) || canonicalizeBuildConsoleMode(opts?.snapshot?.meta?.buildConsoleMode);
  const documentCategory = canonicalizeDocumentCategory(opts?.documentCategory) || canonicalizeDocumentCategory(opts?.snapshot?.meta?.documentCategory);
  const jurisdiction = normalizeWhitespace(opts?.jurisdiction) || normalizeWhitespace(opts?.snapshot?.meta?.jurisdiction);

  return `
CREATIVE BRIEF (BUILDER MODE — OUTPUT ARTIFACTS ONLY)
- Build type: ${buildType}
- Objective: Generate exportable UI blocks (pages[]) OR document HTML (documents[]). No memo. No summary plan.
- Tone: Ultra high-tech refined minimalism. Concrete and specific. No filler.
- Constraints:
  * NO timelines, NO stack recommendations, NO “here’s a breakdown”, NO “let me know if you want more”.
  * NO agent-spec templates (mission/tools/guardrails frameworks).
- Optional UI meta (include in snapshot.meta when provided):
  * splashChoice: ${splashChoice || "not specified"}
  * buildConsoleMode: ${buildConsoleMode || "not specified"}
  * documentCategory: ${documentCategory || "not specified"}
  * jurisdiction: ${jurisdiction || "not specified"}
- User request:
${userText}
`.trim();
}

function buildSystemPrompt(brief: string, buildType: Exclude<BuildType, "agent" | "app">) {
  const structure =
    buildType === "document"
      ? `OUTPUT snapshot.documents[] ONLY.
- MUST NOT include snapshot.pages at all.
- Each document: format="html", body_html must be real HTML with headings (<h1>/<h2>) and substantial sections.
`
      : `OUTPUT snapshot.pages[] ONLY.
- MUST NOT include snapshot.documents at all.
- The FIRST page (index) MUST include EXACT blocks:
  hero, features (exactly 6 items), stats (exactly 4),
  testimonials (exactly 3), pricing (exactly 3 plans),
  faq (exactly 7), content, cta.
`;

  return `
You are Buildlio — an artifact generation engine.
You DO NOT write strategy or planning documents. You output runnable/exportable artifacts.

ABSOLUTE OUTPUT RULES:
1) Output ONLY ONE valid JSON object. No markdown. No backticks. No commentary.
2) BANNED CONTENT:
   - Timeline / estimates
   - Stack recommendation / tech stack talk
   - “Here’s a breakdown” / “Let me know if you want more”
   - Agent-spec templates (mission/tools/guardrails/frameworks)
3) Must be specific, concrete, and implementation-ready.
4) ${structure}

RESPONSE SCHEMA (STRICT):
{
  "type": "build",
  "message": "Materialization complete. Artifact ready.",
  "snapshot": {
    "appName": "…",
    "tagline": "… (optional)",
    "meta": { "buildType": "${buildType}", "intent": "… (optional)", "splashChoice": "… (optional)", "buildConsoleMode": "… (optional)", "documentCategory": "… (optional)", "jurisdiction": "… (optional)" },
    "pages": [ ... ] OR "documents": [ ... ]
  }
}

${brief}
`.trim();
}

function buildPolishInstruction(reason: string, buildType: Exclude<BuildType, "agent" | "app">) {
  return `
POLISH PASS: Previous attempt failed validation: ${reason}

REBUILD NOW with strict artifact JSON only.
- No memo, no summary, no markdown, no backticks.
- Obey exact block counts/requirements.
- ${buildType === "document" ? "documents[] only; no pages." : "pages[] only; no documents."}
`.trim();
}

/* -----------------------------
ANCHOR:POST
-------------------------------- */
export async function POST(req: Request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ success: false, error: "Server misconfigured: ANTHROPIC_API_KEY missing" }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return NextResponse.json(
        { success: false, error: "Server misconfigured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const projectId = safeString(body?.projectId);
    const messages = arr(body?.messages);

    if (!projectId) return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
    if (!messages.length) return NextResponse.json({ success: false, error: "Missing messages[]" }, { status: 400 });

    // Determine build type (explicit -> detected -> default)
    const explicitType = canonicalizeBuildType(body?.buildType);
    const detected = detectBuildTypeFromText(messages);
    const rawBuildType: BuildType = (explicitType || detected || "website") as BuildType;

    // Convert UI build types into artifact build types (document vs non-document)
    const artifactBuildType = toArtifactBuildType(rawBuildType);

    const cookieStore = cookies();

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Route Handlers we can set cookies directly on the store
          for (const c of cookiesToSet) {
            cookieStore.set(c.name, c.value, c.options);
          }
        },
      },
    });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ success: false, error: "Auth error: " + safeString(authErr.message) }, { status: 401 });
    }
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const brief = buildCreativeBrief(messages, artifactBuildType, body);
    const systemPrompt = buildSystemPrompt(brief, artifactBuildType);

    async function runClaude(msgList: any[], modelOverride?: string) {
      const aiResponse = await anthropic.messages.create({
        model: modelOverride || DEFAULT_MODEL,
        max_tokens: 6000, // was 11000; smaller is more stable for strict JSON
        temperature: 0.55,
        system: systemPrompt,
        messages: msgList,
      });

      const rawText = extractClaudeText(aiResponse);

      // HARD-GATE raw output before JSON parsing (catches markdown/spec/memo early)
      if (rawLooksLikeMemo(rawText)) {
        return { parsed: null, rawText, gate: "memo" as const };
      }
      if (rawLooksLikeAgentSpec(rawText)) {
        return { parsed: null, rawText, gate: "agent_spec" as const };
      }

      const jsonText = extractJson(rawText);
      const parsed = safeJsonParse(jsonText);

      return { parsed, rawText, gate: null as const };
    }

    // Attempt 1
    let attempt1 = await runClaude(messages);
    let parsedResponse: any = attempt1.parsed;
    let validation = parsedResponse ? validateBuildResponse(parsedResponse, artifactBuildType) : { ok: false, reason: `Model output gated (${attempt1.gate || "invalid_json"})` };

    // Attempt 2 (Polish Pass)
    if (!validation.ok) {
      const polish = buildPolishInstruction(validation.reason || "Invalid structure", artifactBuildType);
      const attempt2 = await runClaude([...messages, { role: "user", content: polish }]);
      parsedResponse = attempt2.parsed;
      validation = parsedResponse ? validateBuildResponse(parsedResponse, artifactBuildType) : { ok: false, reason: `Polish gated (${attempt2.gate || "invalid_json"})` };

      // Attempt 3 (Final strict nudge) — optional but helps
      if (!validation.ok) {
        const finalNudge =
          `FINAL PASS: Output ONE JSON object only. No text. No markdown. Must pass: ${artifactBuildType === "document" ? "documents[] only" : "pages[] only with required blocks + exact counts"}.`;
        const attempt3 = await runClaude([...messages, { role: "user", content: polish }, { role: "user", content: finalNudge }]);
        parsedResponse = attempt3.parsed;
        validation = parsedResponse ? validateBuildResponse(parsedResponse, artifactBuildType) : { ok: false, reason: `Final gated (${attempt3.gate || "invalid_json"})` };
      }
    }

    if (!validation.ok) {
      // Return chat response (non-charging) with a very short actionable note
      return NextResponse.json({
        success: true,
        data: {
          type: "chat",
          message: `I need one correction to generate artifacts: ${validation.reason}. Please restate the request with a concrete target (pages/features/pricing or doc sections), then re-run.`,
        } satisfies BuildlioResponse,
      });
    }

    // SAVE & CHARGE (only on successful build)
    if (parsedResponse?.type === "build") {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: `Buildlio Engine Materialization v5.6.1 (${artifactBuildType})`,
        p_model: DEFAULT_MODEL,
      });
      if (rpcError) console.error("RPC Charge Error:", rpcError);
    }

    return NextResponse.json({ success: true, data: parsedResponse as BuildlioResponse });
  } catch (err: any) {
    console.error("API Error:", err);
    const msg = safeString(err?.message) || "Unknown server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}