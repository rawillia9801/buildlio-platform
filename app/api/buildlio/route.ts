// FILE: app/api/buildlio/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { Anthropic } from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

type BuildType = "website" | "agent" | "store" | "document" | "app" | "other";

type BuildlioRequest = {
  projectId?: string;
  buildType?: BuildType;
  kindKey?: string;
  messages: { role: string; content: string }[];
};

type DocSection = { id: string; title: string; content: string };

type BuildlioSnapshot = {
  appName: string;
  buildType: BuildType;
  folderStructure?: string[];
  databaseSchema?: string;
  pages?: any[];
  documents?: DocSection[];
  files?: Record<string, string>;
};

type BuildlioResponse = {
  type: "build";
  dominionName: string;
  message: string;
  snapshot: BuildlioSnapshot;
};

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}
function fail(error: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ success: false, error, ...(extra || {}) }, { status });
}

/** Safely extract first text block from Anthropic response */
function getAnthropicText(resp: any): string {
  const content = resp?.content;
  if (!Array.isArray(content)) return "";
  const t = content.find((c: any) => c?.type === "text");
  return typeof t?.text === "string" ? t.text : "";
}

/** Attempt to extract a JSON object substring */
function extractJSONObject(s: string): string | null {
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return s.slice(first, last + 1);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildlioRequest;

    if (!body?.messages?.length) {
      return fail("Missing messages.", 400);
    }

    const buildType: BuildType = (body.buildType || "document") as BuildType;
    const projectId = (body.projectId || "").trim();

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
    const MODEL = process.env.BUILDLIO_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return fail(
        "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        500
      );
    }
    if (!ANTHROPIC_API_KEY) {
      return fail("Server misconfigured: missing ANTHROPIC_API_KEY.", 500);
    }

    // ✅ Next.js cookies() is async in your version
    const cookieStoreReadonly = await cookies();

    // ✅ Supabase SSR expects get/set/remove; Next types are readonly here.
    // In a Route Handler, mutation is supported; we cast to a mutable jar for TS.
    const cookieStore = cookieStoreReadonly as unknown as {
      get: (name: string) => { value?: string } | undefined;
      set: (arg: { name: string; value: string } & CookieOptions) => void;
      delete?: (name: string) => void;
    };

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Some Next cookie stores support delete(), others want set("").
          if (typeof cookieStore.delete === "function") {
            cookieStore.delete(name);
          } else {
            cookieStore.set({ name, value: "", ...options });
          }
        },
      },
    });

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return fail("Unauthorized. Please login.", 401);
    }

    const user = auth.user;

    const lastUser = body.messages[body.messages.length - 1]?.content || "";
    const userRequest = String(lastUser).trim();
    if (!userRequest) return fail("Empty request.", 400);

    const SYSTEM = `
You are Buildlio.
You are friendly, informative, helpful, and correct.
You produce complete outputs with clear structure.

CRITICAL RULES:
- Output MUST be a single raw JSON object (no markdown, no extra text).
- Do NOT ask questions. If details are missing, choose safe defaults and include clearly marked placeholders.
- For "document" builds: produce snapshot.documents[] (not pages).
- For non-document builds: produce snapshot.pages[] (not documents).
- Always include:
  type, dominionName, message, snapshot { appName, buildType, files? documents? pages? }

DOCUMENT SAFETY:
- If user requests legal documents, provide a professional draft and include a brief disclaimer inside the document that it is not legal advice.
`.trim();

    const schemaHint =
      buildType === "document"
        ? `Return snapshot.buildType="document" and snapshot.documents=[{id,title,content}] (content is the full document).`
        : `Return snapshot.buildType="${buildType}" and snapshot.pages=[...] plus snapshot.files with key files.`;

    const prompt = `${schemaHint}\n\nUSER REQUEST:\n${userRequest}`;

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.2,
      system: SYSTEM,
      messages: [
        { role: "user", content: prompt },
        // JSON nudge
        { role: "assistant", content: "{" },
      ],
    });

    // Build the JSON string
    const text = "{" + getAnthropicText(resp);
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const extracted = extractJSONObject(cleaned) || cleaned;

    // ✅ Parse path: if it fails, RETURN immediately with RAW output — no nullable parsed variable.
    let parsed: BuildlioResponse;
    try {
      parsed = JSON.parse(extracted) as BuildlioResponse;
    } catch {
      const fallback: BuildlioResponse = {
        type: "build",
        dominionName: "RECOVERY",
        message: "Output was not valid JSON. Returning raw content for inspection.",
        snapshot: {
          appName: "Recovered Output",
          buildType,
          files: { "RAW_OUTPUT.txt": extracted.slice(0, 200000) },
        },
      };
      return ok(
        {
          data: fallback,
          warning: "Model output was not strict JSON. Returned RAW_OUTPUT.txt.",
          persisted: false,
          charged: false,
        },
        200
      );
    }

    // Normalize snapshot
    const snap = (parsed.snapshot || {}) as BuildlioSnapshot;
    snap.appName = snap.appName || "Buildlio Output";
    snap.buildType = (snap.buildType || buildType) as BuildType;

    // Enforce doc vs non-doc output shape
    if (snap.buildType === "document") {
      if (snap.pages) delete snap.pages;

      if (!Array.isArray(snap.documents) || snap.documents.length === 0) {
        const content =
          snap.files?.["RAW_OUTPUT.txt"] ||
          parsed.message ||
          userRequest ||
          "Document content missing.";
        snap.documents = [{ id: "doc-1", title: "Generated Document", content }];
      }
    } else {
      if (snap.documents) delete snap.documents;
      if (!Array.isArray(snap.pages)) snap.pages = [];
    }

    parsed.snapshot = snap;

    // If no projectId, do not attempt RPC/charging
    if (!projectId) {
      return ok(
        {
          data: parsed,
          warning: "No projectId provided — output was generated but not saved and no credits were charged.",
          persisted: false,
          charged: false,
        },
        200
      );
    }

    // Save + charge credit via your RPC
    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: user.id,
      p_snapshot: parsed.snapshot,
      p_note: `Buildlio Build — ${parsed.dominionName || "BUILD"}`,
      p_model: MODEL,
    });

    if (rpcError) {
      return ok(
        {
          data: parsed,
          warning: "Generated successfully, but failed to save/charge credits. Check RPC/RLS.",
          persisted: false,
          charged: false,
        },
        200
      );
    }

    return ok({ data: parsed, persisted: true, charged: true }, 200);
  } catch (err: any) {
    return fail(`Server error: ${String(err?.message || err)}`, 500);
  }
}