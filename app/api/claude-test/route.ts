/* BUILDLIO.SITE — v5.6 Backend (Ultra Hi-Tech Builder Tone + Anti-Summary Gates + Stronger Creative Brief)
  Status: PRODUCTION READY / FULL ARCHITECTURE
*/

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

/* -----------------------------
   TYPES
-------------------------------- */
type BuildType = "website" | "landing_page" | "application" | "document" | "store" | "other";
type SplashChoice = "sync" | "sploosh" | "ripple" | "none";
type BuildConsoleMode = "white_console" | "standard" | "none";

type DocumentItem = {
  id: string;
  title: string;
  category: "letter" | "cease_and_desist" | "bill_of_sale" | "health_guarantee" | "contract" | "policy" | "packet" | "proposal" | "other";
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
    documentCategory?: DocumentItem["category"];
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
    documentCategory?: DocumentItem["category"];
    jurisdiction?: string;
  };
  documents: DocumentItem[];
};

type BuildlioResponse =
  | { type: "chat"; message: string }
  | { type: "build"; message: string; snapshot: SiteSnapshot | DocSnapshot };

/* -----------------------------
   ANCHOR: UTILS
-------------------------------- */
function safeString(v: any): string {
  return typeof v === "string" ? v : "";
}

function normalizeWhitespace(s: any): string {
  return safeString(s).replace(/\s+/g, " ").trim();
}

function isNonEmptyString(v: any): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function getBlock(blocks: any[], type: string) {
  return arr(blocks).find((b) => b && b.type === type);
}

function containsAny(haystack: string, needles: string[]): boolean {
  const h = (haystack || "").toLowerCase();
  return needles.some((n) => h.includes(String(n).toLowerCase()));
}

function extractJson(raw: string): string {
  let out = raw || "{}";
  const firstBrace = out.indexOf("{");
  const lastBrace = out.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    out = out.slice(firstBrace, lastBrace + 1);
  }
  return out.trim();
}

/* -----------------------------
   ANCHOR: ANTI_SUMMARY_GATES
-------------------------------- */
const CONSULTING_MEMO_PHRASES = [
  "estimated timeline", "timeline:", "4-6 weeks", "technical stack recommendation",
  "stack recommendation", "information architecture", "performance targets",
  "speed metrics", "core web vitals", "lighthouse performance",
  "would you like me to elaborate", "i can elaborate", "let me know if you want",
  "here’s a breakdown", "scope:", "supporting pages", "technical standards",
];

function snapshotLooksLikeMemo(parsed: any): boolean {
  const s = JSON.stringify(parsed || {});
  return containsAny(s, CONSULTING_MEMO_PHRASES);
}

/* -----------------------------
   ANCHOR: ANTI_AGENT_SPEC_FINGERPRINTS
-------------------------------- */
const AGENT_SPEC_FINGERPRINTS = [
  "primary mission", "core directive", "success metrics", "available tools",
  "data collection", "action & communication", "decision support",
  "escalation triggers", "critical guardrails", "fail-safe mechanisms",
  "operational framework", "continuous learning loop", "role-based permissions",
  "least privilege", "gdpr/ccpa", "risk prediction", "uptime", "yaml",
  "prohibited actions", "circuit breakers",
];

function containsMarkdownish(raw: string): boolean {
  const s = raw || "";
  if (/(^|\n)\s*#{2,}\s+/m.test(s)) return true;
  if (/```/.test(s)) return true;
  if (/(^|\n)\s*-\s+\*\*/m.test(s)) return true;
  return false;
}

function looksLikeAgentSpec(obj: any): boolean {
  const s = JSON.stringify(obj || {}).toLowerCase();
  if (containsAny(s, AGENT_SPEC_FINGERPRINTS)) return true;
  if (containsMarkdownish(s)) return true;
  return false;
}

/* -----------------------------
   ANCHOR: ARTIFACT_SHAPE_GATE
-------------------------------- */
function shapeGate(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) return { ok: false, reason: "Missing/invalid response type" };
  if (parsed.type === "chat") return { ok: true };

  const snap = parsed.snapshot;
  if (!snap || typeof snap !== "object") return { ok: false, reason: "Build missing snapshot object" };

  const hasPages = Array.isArray(snap.pages);
  const hasDocs = Array.isArray(snap.documents);

  if (buildType === "document") {
    if (hasPages && snap.pages.length) return { ok: false, reason: "Document build must not include pages array" };
    if (!hasDocs) return { ok: false, reason: "Document build missing documents array" };
  } else {
    if (hasDocs && snap.documents.length) return { ok: false, reason: "Website build must not include documents array" };
    if (!hasPages) return { ok: false, reason: "Website build missing pages array" };
  }

  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName in snapshot" };
  return { ok: true };
}

/* -----------------------------
   ANCHOR: COPY_QUALITY & VALIDATORS
-------------------------------- */
const GENERIC_BAD = ["innovative", "cutting-edge", "next-level", "revolutionize", "game-changer", "best-in-class", "synergy"];

function hasSpecificitySignals(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hasNumber = /\d/.test(t);
  const hasConcreteNouns = /(calls|leads|invoices|quotes|crm|onboarding|domain|sku|inventory|shipping|portfolio|cv)/.test(t);
  return hasNumber || hasConcreteNouns;
}

function validateWebsiteBuild(parsed: any): { ok: boolean; reason?: string } {
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like a strategy memo" };
  if (looksLikeAgentSpec(parsed)) return { ok: false, reason: "Output resembles an agent/spec document" };

  const snap = parsed.snapshot;
  const page0 = snap.pages[0];
  if (!page0 || !Array.isArray(page0.blocks)) return { ok: false, reason: "Missing blocks in index page" };

  const blocks = page0.blocks;
  const required = ["hero", "features", "stats", "testimonials", "pricing", "faq", "content", "cta"];
  const types = new Set(blocks.map((b: any) => b?.type));
  for (const r of required) if (!types.has(r)) return { ok: false, reason: `Missing required block: ${r}` };

  // EXACT COUNTS
  if (arr(getBlock(blocks, "features")?.items).length !== 6) return { ok: false, reason: "Features must contain exactly 6 items" };
  if (arr(getBlock(blocks, "stats")?.stats).length !== 4) return { ok: false, reason: "Stats must contain exactly 4 items" };
  if (arr(getBlock(blocks, "testimonials")?.items).length !== 3) return { ok: false, reason: "Testimonials must contain exactly 3 items" };
  if (arr(getBlock(blocks, "pricing")?.plans).length !== 3) return { ok: false, reason: "Pricing must contain exactly 3 plans" };
  if (arr(getBlock(blocks, "faq")?.items).length !== 7) return { ok: false, reason: "FAQ must contain exactly 7 items" };

  return { ok: true };
}

function validateDocumentBuild(parsed: any): { ok: boolean; reason?: string } {
  if (snapshotLooksLikeMemo(parsed)) return { ok: false, reason: "Output looks like a memo" };
  const docs = arr(parsed.snapshot.documents);
  if (docs.length < 1) return { ok: false, reason: "Missing documents in snapshot" };

  for (const d of docs) {
    if (safeString(d.body_html).length < 600) return { ok: false, reason: "Document body too short" };
    if (!/<h1[\s>]|<h2[\s>]/i.test(d.body_html)) return { ok: false, reason: "Document missing HTML headings" };
  }
  return { ok: true };
}

function validateBuildResponse(parsed: any, buildType: BuildType): { ok: boolean; reason?: string } {
  const sg = shapeGate(parsed, buildType);
  if (!sg.ok) return sg;
  if (parsed.type === "chat") return { ok: true };
  return buildType === "document" ? validateDocumentBuild(parsed) : validateWebsiteBuild(parsed);
}

/* -----------------------------
   ANCHOR: PROMPT ENGINES
-------------------------------- */
function buildCreativeBrief(messages: any[], buildType: BuildType, opts: any) {
  return `
CREATIVE BRIEF (BUILDER MODE — OUTPUT ARTIFACTS, NOT A MEMO)
- Build type: ${buildType}
- Hard Constraint: NO architecture/timeline/stack recommendations.
- Hard Constraint: NO missions/tools/guardrails spec text.
- Objective: Generate exact UI blocks or Document HTML.
- Aesthetic: Ultra high-tech refined minimalism.
`.trim();
}

function buildSystemPrompt(brief: string, buildType: BuildType, opts: any) {
  const structure = buildType === "document" 
    ? "Output snapshot.documents[] only. NO snapshot.pages."
    : "Output snapshot.pages[] with blocks: hero, features (6), stats (4), testimonials (3), pricing (3), faq (7), content, cta.";

  return `
You are Buildlio — an ultra high-tech creation engine. 
You generate EXPORTABLE ARTIFACTS, not plans.

RULES:
- Output ONLY a SINGLE valid JSON object. No markdown. No backticks.
- BANNED: "Estimated Timeline", "Tech Stack", "Information Architecture".
- BANNED: Markdown headings or list patterns in content.
- ${structure}

${brief}
`.trim();
}

function buildPolishInstruction(reason: string, buildType: BuildType) {
  return `POLISH PASS: The previous output failed validation: ${reason}. Rebuild as strict JSON artifacts only. NO strategies.`.trim();
}

/* -----------------------------
   ANCHOR: POST ROUTE
-------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, messages, buildType: explicitType } = body;
    const buildType: BuildType = explicitType || "website";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const brief = buildCreativeBrief(messages, buildType, body);
    const systemPrompt = buildSystemPrompt(brief, buildType, body);

    async function runClaude(msgList: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        temperature: 0.62,
        system: systemPrompt,
        messages: msgList,
      });

      const rawOutput = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : "";
      const extracted = extractJson(rawOutput);
      return JSON.parse(extracted);
    }

    // ATTEMPT 1
    let parsedResponse = await runClaude(messages);
    let validation = validateBuildResponse(parsedResponse, buildType);

    // ATTEMPT 2 (POLISH PASS)
    if (!validation.ok) {
      const polish = buildPolishInstruction(validation.reason || "Invalid structure", buildType);
      parsedResponse = await runClaude([...messages, { role: "user", content: polish }]);
      validation = validateBuildResponse(parsedResponse, buildType);
    }

    if (!validation.ok) {
      return NextResponse.json({ 
        success: true, 
        data: { type: "chat", message: `I need a bit more clarity: ${validation.reason}. What is the core goal of this ${buildType}?` } 
      });
    }

    // SAVE VERSION & CHARGE
    if (parsedResponse.type === "build") {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: `Buildlio v5.6 Engine Materialization (${buildType})`,
        p_model: "claude-3-5-sonnet",
      });
      if (rpcError) console.error("RPC Error:", rpcError);
    }

    return NextResponse.json({ success: true, data: parsedResponse });
  } catch (err: any) {
    console.error("API Fatal Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}