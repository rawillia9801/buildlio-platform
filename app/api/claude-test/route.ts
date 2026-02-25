// FILE: app/api/buildlio/route.ts
//
// BUILDLIO — Document + Website Manifestation API (Fixed)
// - FIX: Accepts frontend payloads consistently (projectId optional, buildType supported)
// - FIX: Reliable JSON extraction (no double "{" corruption)
// - FIX: Supports DOCUMENT mode outputs (contracts / legal docs) without forcing app scaffolds
// - FIX: Persists + charges credits ONLY when projectId is a UUID and RPC succeeds
// - FIX: Returns a consistent response shape that the UI can render

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const DEFAULT_MODEL =
  process.env.BUILDLIO_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type BuildType = "website" | "agent" | "store" | "document" | "app" | "other";

interface BuildlioRequest {
  projectId?: string; // OPTIONAL now (so generation still works without persistence)
  buildType?: BuildType;
  kindKey?: string; // e.g. doc_legal, site_landing, etc.
  messages?: { role: "user" | "assistant"; content: string }[];

  // (Optional) allow legacy / experimental frontend fields without breaking
  model?: string;
  max_tokens?: number;
  system?: string;
}

type DocSection = {
  id: string;
  title: string;
  content: string; // markdown (or clean text)
};

type PageBlock = {
  type: string;
  [k: string]: any;
};

type SitePage = {
  path: string; // "/"
  title: string;
  blocks: PageBlock[];
};

interface BuildlioSnapshot {
  appName: string;
  buildType: BuildType;

  // Website/app/store outputs
  pages?: SitePage[];

  // Document outputs
  documents?: DocSection[];

  // Optional legacy fields (kept for compatibility)
  folderStructure?: string[];
  databaseSchema?: string;
  files?: Record<string, string>;
}

interface BuildlioResponse {
  type: "build";
  dominionName: string;
  message: string;
  snapshot: BuildlioSnapshot;
}

/* ─────────────────────── PROMPTS ─────────────────────── */

const SYSTEM_BASE = `You are Buildlio — a disciplined, production-grade generation engine.

ABSOLUTE OUTPUT RULES:
- Output MUST be ONLY a single valid JSON object.
- No markdown fences. No commentary. No preface. No trailing text.
- Use double quotes for all JSON keys and string values.
- Do not include unescaped newlines inside JSON strings (use \\n).
- If you cannot comply, still output a valid JSON object with best-effort content.

QUALITY RULES:
- Be complete and directly usable.
- Do not ask questions. Do not request clarification. Make reasonable assumptions and state them briefly in the "message" field only.
`;

function systemFor(buildType: BuildType) {
  if (buildType === "document") {
    return (
      SYSTEM_BASE +
      `
YOU ARE IN DOCUMENT MODE.

Return JSON in this schema:

{
  "type": "build",
  "dominionName": "SOME NAME IN ALL CAPS",
  "message": "Brief, practical assumptions (1-3 lines max).",
  "snapshot": {
    "appName": "Short name",
    "buildType": "document",
    "documents": [
      {
        "id": "doc-1",
        "title": "Document Title",
        "content": "Full document content in Markdown with clear headings and clauses. Use \\n for line breaks."
      }
    ]
  }
}

DOCUMENT REQUIREMENTS:
- Produce a complete, professional document (contracts/terms/policies).
- Include standard legal structure: parties, definitions, scope, term, payment (if relevant), warranties, limitation of liability, governing law, venue, notices, severability, entire agreement, signatures (if appropriate).
- If jurisdiction is not provided, choose a reasonable default and mention it in "message".
- Do NOT include programming code, folder structures, or database schemas.
`
    );
  }

  // Default: website/app/store/agent/other => structured pages snapshot
  return (
    SYSTEM_BASE +
    `
YOU ARE IN BUILD MODE FOR NON-DOCUMENT OUTPUTS.

Return JSON in this schema:

{
  "type": "build",
  "dominionName": "SOME NAME IN ALL CAPS",
  "message": "Brief summary of what you produced (1-3 lines max).",
  "snapshot": {
    "appName": "Short app/site name",
    "buildType": "${buildType}",
    "pages": [
      {
        "path": "/",
        "title": "Home",
        "blocks": [
          { "type": "hero", "headline": "...", "subhead": "...", "ctaText": "...", "ctaHref": "..." },
          { "type": "features", "items": [ { "title": "...", "body": "..." } ] },
          { "type": "cta", "headline": "...", "ctaText": "...", "ctaHref": "..." },
          { "type": "footer", "text": "..." }
        ]
      }
    ]
  }
}

REQUIREMENTS:
- "pages" must exist and include at least "/" with hero + footer blocks.
- No "documents" field in non-document output.
- No code files unless the user explicitly asks for code output in their request.
`
  );
}

/* ─────────────────────── HELPERS ─────────────────────── */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeJsonExtract(raw: string): string {
  // Strip common fences just in case
  let t = raw.trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  // If it already looks like JSON, return it
  if (t.startsWith("{") && t.endsWith("}")) return t;

  // Otherwise, try to carve out the first JSON object
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return t.slice(first, last + 1);
  }

  // Final fallback: wrap as error JSON
  return JSON.stringify(
    {
      type: "build",
      dominionName: "RECOVERY MODE",
      message:
        "Model output was not valid JSON. Returned raw text inside snapshot.files for inspection.",
      snapshot: {
        appName: "Recovered Output",
        buildType: "other",
        files: { "RAW_OUTPUT.txt": raw },
      },
    },
    null,
    2
  );
}

function normalizeBuildType(bt?: string): BuildType {
  const s = (bt || "").toLowerCase().trim();
  if (s === "document" || s === "docs" || s === "doc") return "document";
  if (s === "website" || s === "site" || s === "landing" || s === "landing-page" || s === "landingpage") return "website";
  if (s === "store" || s === "shop") return "store";
  if (s === "app" || s === "application") return "app";
  if (s === "agent") return "agent";
  if (s === "other") return "other";
  return "other";
}

function validateNoCrossMode(snapshot: BuildlioSnapshot): string | null {
  if (!snapshot || !snapshot.buildType) return "Missing snapshot.buildType.";
  if (snapshot.buildType === "document") {
    if (snapshot.pages && snapshot.pages.length) return "Document output contains pages[].";
    if (!snapshot.documents || snapshot.documents.length === 0) return "Document output missing documents[].";
  } else {
    if (snapshot.documents && snapshot.documents.length) return "Non-document output contains documents[].";
    if (!snapshot.pages || snapshot.pages.length === 0) return "Non-document output missing pages[].";
  }
  return null;
}

/* ─────────────────────── ROUTE ─────────────────────── */

export async function POST(req: Request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Server misconfigured: missing ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const body: BuildlioRequest = await req.json();

    const projectId = body.projectId;
    const buildType = normalizeBuildType(body.buildType);
    const kindKey = (body.kindKey || "").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Accept both:
    // 1) Proper pipeline: { messages: [...] }
    // 2) Legacy: user sends "messages" but no projectId
    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "Missing messages[] payload." },
        { status: 400 }
      );
    }

    // Auth is REQUIRED for persistence; but allow generation even if auth fails
    // (so the tool can still create a document). If you want strict auth-only,
    // flip this behavior by returning 401 instead.
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // ignore: generation can proceed without persistence
    }

    const userRequest = messages[messages.length - 1].content;

    // Encode selected kind (doc_legal etc.) as a short directive to reduce ambiguity
    const kindDirective = kindKey ? `\n\n[USER_SELECTED_KIND=${kindKey}]` : "";
    const effectiveUserRequest = `${userRequest}${kindDirective}`;

    const system = systemFor(buildType);

    const aiResponse = await anthropic.messages.create({
      model: body.model || DEFAULT_MODEL,
      max_tokens: Math.max(800, Math.min(8000, body.max_tokens || 3000)),
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: effectiveUserRequest }],
    });

    const textBlock = aiResponse.content.find((c: any) => c.type === "text");
    const rawText =
      textBlock && textBlock.type === "text" ? String(textBlock.text || "") : "";

    const jsonStr = safeJsonExtract(rawText);

    let parsed: BuildlioResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Hard fallback: wrap raw output
      parsed = {
        type: "build",
        dominionName: "PARSE FAILURE RECOVERY",
        message:
          "Model output could not be parsed. Returned raw output in snapshot.files.RAW_OUTPUT.txt",
        snapshot: {
          appName: "Recovered Output",
          buildType: "other",
          files: { "RAW_OUTPUT.txt": rawText },
        },
      };
    }

    // Minimal normalization: ensure snapshot.buildType matches requested buildType if missing
    if (!parsed.snapshot?.buildType) {
      parsed.snapshot = { ...(parsed.snapshot as any), buildType };
    }

    // Validate cross-mode constraints
    const modeErr = validateNoCrossMode(parsed.snapshot);
    if (modeErr) {
      // Return successful generation but flagged (do NOT persist/charge)
      return NextResponse.json({
        success: true,
        data: parsed,
        persisted: false,
        charged: false,
        warning: `Validation gate: ${modeErr}`,
      });
    }

    // Optional persistence + charging
    let persisted = false;
    let charged = false;
    if (projectId && UUID_RE.test(projectId) && userId) {
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: "", ...options });
            },
          },
        });

        const { error: rpcError } = await supabase.rpc(
          "save_version_and_charge_credit",
          {
            p_project_id: projectId,
            p_owner_id: userId,
            p_snapshot: parsed.snapshot,
            p_note: `Buildlio Generation - ${parsed.dominionName}`,
            p_model: body.model || DEFAULT_MODEL,
          }
        );

        if (!rpcError) {
          persisted = true;
          charged = true;
        }
      } catch {
        // If persistence fails, still return the generated content without charging
        persisted = false;
        charged = false;
      }
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      persisted,
      charged,
    });
  } catch (err: any) {
    console.error("Buildlio API fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          "Execution error: request collapsed during processing.",
      },
      { status: 500 }
    );
  }
}