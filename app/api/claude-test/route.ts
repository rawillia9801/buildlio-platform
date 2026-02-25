/* FILE: app/api/claude-test/route.ts
   BUILDLIO.SITE — v5.6.2 Backend

   Fixes for your TS errors:
   - FIX: cookies() is typed as Promise<ReadonlyRequestCookies> in your setup -> use `await cookies()`
   - FIX: cookieStore typing -> no getAll/set methods on Promise -> resolved by awaiting
   - FIX: remove problematic `satisfies` / const assertion usage causing ts(1355)

   Keeps:
   - Robust Claude text extraction
   - Robust JSON extraction + safe parse
   - Raw output gates (memo/spec) before JSON parse
   - 2-3 pass validation + non-charging chat fallback
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
const DEFAULT_MODEL = process.env.BUILDLIO_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type BuildType =
  | "website"
  | "landing_page"
  | "application"
  | "document"
  | "store"
  | "other"
  // UI-only inputs (canonicalize to "application" for artifact rules)
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
function extractClaudeText(aiResponse: any): string {
  const parts = arr(aiResponse?.content);
  const texts = parts
    .map((p: any) => (p?.type === "text" ? safeString(p.text) : ""))
    .filter((t: string) => t.length > 0);
  return texts.join("\n").trim();
}

/* -----------------------------
ANCHOR:GATES
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
  return false;
}

function rawLooksLikeMemo(rawText: string) {
  return containsAny(rawText || "", CONSULTING_MEMO_PHRASES);
}
function rawLooksLikeAgentSpec(rawText: string) {
  const s = (rawText || "").toLowerCase();
  if (containsAny(s, AGENT_SPEC_FINGERPRINTS)) return true;
  if (containsMarkdownish(rawText)) return true;
  return false;
}

/* -----------------------------
ANCHOR:BUILD TYPE
-------------------------------- */
function canonicalizeBuildType(raw: any): BuildType | null {
  const t0 = normalizeWhitespace(raw).toLowerCase();
  if (!t0) return null;
  const t = t0.replace(/[-\s]+/g, "_").replace(/__+/g, "_").trim();

  if (t === "agent") return "agent";
  if (t === "app") return "app";

  if (t === "landing" || t === "landingpage" || t === "landing_page") return "landing_page";
  if (t === "website") return "website";
  if (t === "application" || t === "portal") return "application";
  if (t === "document" || t === "documents" || t === "docs") return "document";
  if (t === "store" || t === "shop" || t === "ecommerce") return "store";
  if (t === "other") return "other";

  return null;
}

function detectBuildTypeFromText(messages: any[]): BuildType | null {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const t = normalizeWhitespace(lastUser?.content).toLowerCase();
  if (!t) return null;

  const m = t.match(
    /(^|\n)\s*type\s*:\s*(website|landing[_\-\s]*page|landingpage|landing|application|app|portal|agent|document|documents|docs|store|shop|ecommerce|other)\s*(\n|$)/i
  );
  if (m?.[2]) return canonicalizeBuildType(m[2]);

  if (/(agent|autonomous|assistant|ops agent|support agent|sales agent)/i.test(t)) return "agent";
  if (/(store|shop|checkout|cart|products|sku|inventory|shipping|returns)/i.test(t)) return "store";
  if (/(application|dashboard|login|roles|admin|workflow|crud|portal)/i.test(t)) return "application";
  if (/(document|proposal|contract|policy|terms|agreement|guide|handbook|cease and desist|bill of sale|health guarantee)/i.test(t))
    return "document";
  if (/(landing page|single page|one page|lead capture|waitlist|signup|book a call)/i.test(t)) return "landing_page";

  return "website";
}

function toArtifactBuildType(t: BuildType): Exclude<BuildType, "agent" | "app"> {
  if (t === "agent") return "application";
  if (t === "app") return "application";
  return t as Exclude<BuildType, "agent" | "app">;
}

/* -----------------------------
ANCHOR:SHAPE + VALIDATORS
-------------------------------- */
function shapeGate(parsed: any, buildType: Exclude<BuildType, "agent" | "app">): { ok: boolean; reason?: string } {
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

  if (hasDocs && (snap as any).documents?.length) return { ok: false, reason: "Non-document build must not include documents" };
  if (!hasPages) return { ok: false, reason: "Non-document build missing pages[]" };
  if (!isNonEmptyString((snap as any).appName)) return { ok: false, reason: "Missing appName" };
  return { ok: true };
}

function validateWebsiteBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };

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

  if (arr(getBlock(blocks, "features")?.items).length !== 6) return { ok: false, reason: "Features must contain exactly 6 items" };
  if (arr(getBlock(blocks, "stats")?.stats).length !== 4) return { ok: false, reason: "Stats must contain exactly 4 items" };
  if (arr(getBlock(blocks, "testimonials")?.items).length !== 3) return { ok: false, reason: "Testimonials must contain exactly 3 items" };
  if (arr(getBlock(blocks, "pricing")?.plans).length !== 3) return { ok: false, reason: "Pricing must contain exactly 3 plans" };
  if (arr(getBlock(blocks, "faq")?.items).length !== 7) return { ok: false, reason: "FAQ must contain exactly 7 items" };

  return { ok: true };
}

function validateDocumentBuild(parsed: any): { ok: boolean; reason?: string } {
  if (parsed?.type !== "build") return { ok: false, reason: "Not a build response" };

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

function validateBuildResponse(parsed: any, buildType: Exclude<BuildType, "agent" | "app">) {
  const sg = shapeGate(parsed, buildType);
  if (!sg.ok) return sg;
  if (parsed.type === "chat") return { ok: true };
  if (buildType === "document") return validateDocumentBuild(parsed);
  return validateWebsiteBuild(parsed);
}

/* -----------------------------
ANCHOR:PROMPTS
-------------------------------- */
function buildCreativeBrief(messages: any[], buildType: Exclude<BuildType, "agent" | "app">) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 3000);

  return `
CREATIVE BRIEF (BUILDER MODE — ARTIFACTS ONLY)
- Build type: ${buildType}
- Objective: Generate exportable UI blocks (pages[]) OR document HTML (documents[]).
- No strategy, no timeline, no stack recs, no “here’s a breakdown”.
- Output must be specific and implementation-ready.
- User request:
${userText}
`.trim();
}

function buildSystemPrompt(brief: string, buildType: Exclude<BuildType, "agent" | "app">) {
  const structure =
    buildType === "document"
      ? `Output snapshot.documents[] ONLY (no pages). Each document body_html must be real HTML with headings and sections.`
      : `Output snapshot.pages[] ONLY (no documents). Index page must include blocks:
hero, features(6), stats(4), testimonials(3), pricing(3), faq(7), content, cta.`;

  return `
You are Buildlio — an artifact generation engine.
You generate EXPORTABLE ARTIFACTS, not memos.

ABSOLUTE RULES:
- Output ONLY ONE valid JSON object. No markdown. No backticks. No commentary.
- BANNED: timelines, stack recommendations, “here’s a breakdown”, “let me know if you want more”.
- BANNED: agent spec frameworks (mission/tools/guardrails templates).
- ${structure}

RESPONSE SCHEMA:
{
  "type": "build",
  "message": "Materialization complete. Artifact ready.",
  "snapshot": { "appName": "...", "meta": { "buildType": "${buildType}" }, "pages":[...] OR "documents":[...] }
}

${brief}
`.trim();
}

function buildPolishInstruction(reason: string, buildType: Exclude<BuildType, "agent" | "app">) {
  return `POLISH PASS: Failed validation: ${reason}. Output ONE JSON object only. ${
    buildType === "document" ? "documents[] only (no pages)." : "pages[] only (no documents), with exact block counts."
  }`;
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

    const explicitType = canonicalizeBuildType(body?.buildType);
    const detected = detectBuildTypeFromText(messages);
    const rawBuildType: BuildType = (explicitType || detected || "website") as BuildType;

    const artifactBuildType = toArtifactBuildType(rawBuildType);

    // ✅ YOUR FIX: cookies() is Promise<ReadonlyRequestCookies> in your TS env
    const cookieStore = await cookies();

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            cookieStore.set(c.name, c.value, c.options);
          }
        },
      },
    });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ success: false, error: "Auth error: " + safeString(authErr.message) }, { status: 401 });
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const brief = buildCreativeBrief(messages, artifactBuildType);
    const systemPrompt = buildSystemPrompt(brief, artifactBuildType);

    async function runClaude(msgList: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 6000,
        temperature: 0.55,
        system: systemPrompt,
        messages: msgList,
      });

      const rawText = extractClaudeText(aiResponse);

      if (rawLooksLikeMemo(rawText)) return { parsed: null, gate: "memo" as const, rawText };
      if (rawLooksLikeAgentSpec(rawText)) return { parsed: null, gate: "agent_spec" as const, rawText };

      const jsonText = extractJson(rawText);
      const parsed = safeJsonParse(jsonText);
      return { parsed, gate: null as const, rawText };
    }

    // Attempt 1
    let a1 = await runClaude(messages);
    let parsedResponse: any = a1.parsed;
    let validation = parsedResponse
      ? validateBuildResponse(parsedResponse, artifactBuildType)
      : { ok: false, reason: `Model output gated (${a1.gate || "invalid_json"})` };

    // Attempt 2
    if (!validation.ok) {
      const polish = buildPolishInstruction(validation.reason || "Invalid structure", artifactBuildType);
      const a2 = await runClaude([...messages, { role: "user", content: polish }]);
      parsedResponse = a2.parsed;
      validation = parsedResponse
        ? validateBuildResponse(parsedResponse, artifactBuildType)
        : { ok: false, reason: `Polish gated (${a2.gate || "invalid_json"})` };
    }

    // Optional attempt 3
    if (!validation.ok) {
      const finalNudge =
        artifactBuildType === "document"
          ? "FINAL: Output ONE JSON object only. MUST be type=build with snapshot.documents[] only. No other text."
          : "FINAL: Output ONE JSON object only. MUST be type=build with snapshot.pages[] only and exact block counts. No other text.";
      const a3 = await runClaude([...messages, { role: "user", content: finalNudge }]);
      parsedResponse = a3.parsed;
      validation = parsedResponse
        ? validateBuildResponse(parsedResponse, artifactBuildType)
        : { ok: false, reason: `Final gated (${a3.gate || "invalid_json"})` };
    }

    if (!validation.ok) {
      const chat: BuildlioResponse = {
        type: "chat",
        message: `Clarity needed: ${validation.reason}. Re-run with a concrete target (what to generate + must-have sections/blocks).`,
      };
      return NextResponse.json({ success: true, data: chat });
    }

    // Save + charge only on build success
    if (parsedResponse?.type === "build") {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: `Buildlio Engine Materialization v5.6.2 (${artifactBuildType})`,
        p_model: DEFAULT_MODEL,
      });
      if (rpcError) console.error("RPC Charge Error:", rpcError);
    }

    const out: BuildlioResponse = parsedResponse;
    return NextResponse.json({ success: true, data: out });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: safeString(err?.message) || "Unknown server error" }, { status: 500 });
  }
}