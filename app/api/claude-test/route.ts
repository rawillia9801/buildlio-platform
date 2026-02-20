// FILE: app/api/claude-test/route.ts
//
// CHANGELOG
// - v1.1 (2026-02-20)
//   * FIX: Supabase SSR cookie handling (setAll implemented) so sessions don’t randomly fail
//   * ADD: Credit balance check BEFORE calling Claude (prevents negative credits)
//   * IMPROVE: More robust JSON extraction/parsing (handles accidental leading text)
//   * KEEP: Zod schema validation (only charge credits on VALID output)
//   * KEEP: Writes project_versions + credit_ledger (delta = -1) ONLY on success
//
// REQUIRED ENV (.env.local)
// - NEXT_PUBLIC_SUPABASE_URL=...
// - NEXT_PUBLIC_SUPABASE_ANON_KEY=...
// - SUPABASE_SERVICE_ROLE_KEY=...               (server-only; recommended)
// - ANTHROPIC_API_KEY=...                      (server-only)
//
// TABLES
// - projects: id, owner_id, name, slug, theme, published, published_at, created_at, updated_at
// - project_versions: id, project_id, owner_id, version_no, snapshot, note, created_at
// - credit_ledger: id, owner_id, delta, reason, project_id, metadata, created_at

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** -----------------------------
 *  ANCHOR:SCHEMA (V1 Snapshot)
 *  ----------------------------- */

const BlockHero = z.object({
  type: z.literal("hero"),
  headline: z.string().min(1).max(140),
  subhead: z.string().min(0).max(240).optional().default(""),
  cta: z
    .object({
      label: z.string().min(1).max(40),
      href: z.string().min(1).max(200),
    })
    .optional(),
});

const BlockFeatures = z.object({
  type: z.literal("features"),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(180),
        icon: z.string().min(0).max(40).optional(),
      })
    )
    .min(1)
    .max(12),
});

const BlockTestimonials = z.object({
  type: z.literal("testimonials"),
  items: z
    .array(
      z.object({
        quote: z.string().min(1).max(240),
        name: z.string().min(1).max(60),
        title: z.string().min(0).max(60).optional(),
      })
    )
    .min(1)
    .max(8),
});

const BlockCTA = z.object({
  type: z.literal("cta"),
  headline: z.string().min(1).max(120),
  subhead: z.string().min(0).max(240).optional().default(""),
  cta: z.object({
    label: z.string().min(1).max(40),
    href: z.string().min(1).max(200),
  }),
});

const BlockText = z.object({
  type: z.literal("text"),
  content: z.string().min(1).max(2000),
});

const Block = z.discriminatedUnion("type", [
  BlockHero,
  BlockFeatures,
  BlockTestimonials,
  BlockCTA,
  BlockText,
]);

const Page = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "slug must be kebab-case"),
  title: z.string().min(1).max(80),
  blocks: z.array(Block).min(1).max(40),
});

const Theme = z
  .object({
    palette: z.string().min(1).max(40).default("neural-dark"),
    radius: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
  })
  .default({ palette: "neural-dark", radius: "lg" });

const SnapshotSchema = z.object({
  title: z.string().min(1).max(80),
  theme: Theme,
  pages: z.array(Page).min(1).max(10),
});

type Snapshot = z.infer<typeof SnapshotSchema>;

/** -----------------------------
 *  ANCHOR:REQUEST_SCHEMA
 *  ----------------------------- */

const RequestSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(3).max(4000),
  note: z.string().max(180).optional(),
});

/** -----------------------------
 *  ANCHOR:SUPABASE
 *  ----------------------------- */

function supabaseFromCookies(response: NextResponse) {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // IMPORTANT: setAll MUST actually set cookies, or token refresh breaks.
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          // Apply to BOTH the request cookie store and the response.
          // This keeps auth stable during refresh.
          try {
            cookieStore.set(c);
          } catch {
            // Some runtimes may restrict direct set on cookieStore; response is the key.
          }
          response.cookies.set(c);
        }
      },
    },
  });
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!service) return null; // fallback to cookie client + RLS

  return createServerClient(url, service, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}

/** -----------------------------
 *  ANCHOR:PROMPTING
 *  ----------------------------- */

function buildSystemPrompt() {
  return `
You are Buildlio Architect, the AI inside Buildlio.Site.
Buildlio is AI-first (prompt → generate → preview → iterate).
Return ONLY valid JSON matching this schema:

{
  "title": string,
  "theme": { "palette": "neural-dark" | string, "radius": "sm"|"md"|"lg"|"xl" },
  "pages": [
    {
      "slug": "home",
      "title": string,
      "blocks": [
        { "type": "hero", "headline": string, "subhead"?: string, "cta"?: { "label": string, "href": string } },
        { "type": "features", "items": [{ "title": string, "description": string, "icon"?: string }] },
        { "type": "testimonials", "items": [{ "quote": string, "name": string, "title"?: string }] },
        { "type": "cta", "headline": string, "subhead"?: string, "cta": { "label": string, "href": string } },
        { "type": "text", "content": string }
      ]
    }
  ]
}

Rules:
- Output ONLY JSON. No markdown. No commentary. No code fences.
- Slugs must be kebab-case.
- Use real, usable copy. Keep it business-ready.
- If user asks for multiple pages, include them.
`.trim();
}

async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.6,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${txt || res.statusText}`);
  }

  const data: any = await res.json();
  const text = data?.content?.find((c: any) => c?.type === "text")?.text ?? "";
  if (!text) throw new Error("Anthropic returned empty content");
  return text.trim();
}

/** -----------------------------
 *  ANCHOR:JSON_PARSE
 *  ----------------------------- */

function extractJson(raw: string): any {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Attempt to extract first {...} block (common when model adds stray text)
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("No JSON object detected in output.");
    }
    const slice = raw.slice(first, last + 1);
    return JSON.parse(slice);
  }
}

/** -----------------------------
 *  ANCHOR:CREDITS
 *  ----------------------------- */

async function getCreditBalance(supa: any, ownerId: string): Promise<number> {
  // Sum all deltas
  const { data, error } = await supa
    .from("credit_ledger")
    .select("delta")
    .eq("owner_id", ownerId);

  if (error) throw new Error(`Could not read credit ledger: ${error.message}`);
  const rows: Array<{ delta: number }> = data ?? [];
  return rows.reduce((acc, r) => acc + (Number(r.delta) || 0), 0);
}

/** -----------------------------
 *  ANCHOR:ROUTE
 *  ----------------------------- */

export async function POST(req: Request) {
  const response = NextResponse.json({ ok: true }); // placeholder; we’ll overwrite on returns

  try {
    const supa = supabaseFromCookies(response);

    // Auth
    const { data: auth, error: authErr } = await supa.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    const user = auth.user;

    // Parse request
    const body = await req.json().catch(() => null);
    const parsedReq = RequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsedReq.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, prompt, note } = parsedReq.data;

    // Ensure project exists + owned by user
    const { data: project, error: projErr } = await supa
      .from("projects")
      .select("id, owner_id, name, slug, theme")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }
    if (project.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden (not project owner)" }, { status: 403 });
    }

    // Use admin writer if available (recommended)
    const admin = supabaseAdmin();
    const writer = admin ?? supa;

    // Check credits BEFORE calling Claude (fair + prevents wasted API calls)
    const balance = await getCreditBalance(writer, user.id);
    if (balance < 1) {
      return NextResponse.json(
        { success: false, error: "Insufficient credits (no credits charged).", balance },
        { status: 402 }
      );
    }

    // Compute next version number (read can be via writer to avoid RLS surprises)
    const { data: vmax, error: vmaxErr } = await writer
      .from("project_versions")
      .select("version_no")
      .eq("project_id", projectId)
      .order("version_no", { ascending: false })
      .limit(1);

    if (vmaxErr) {
      return NextResponse.json(
        { success: false, error: "Could not read version history (no credits charged).", details: vmaxErr.message },
        { status: 500 }
      );
    }

    const nextVersion = (vmax?.[0]?.version_no ?? 0) + 1;

    // Call Claude
    const raw = await callClaude(prompt);

    // Parse JSON
    let json: any;
    try {
      json = extractJson(raw);
    } catch (e: any) {
      return NextResponse.json(
        {
          success: false,
          error: "AI output was not valid JSON (no credits charged).",
          details: e?.message ?? String(e),
          rawPreview: raw.slice(0, 1200),
        },
        { status: 422 }
      );
    }

    // Validate schema
    const parsedSnap = SnapshotSchema.safeParse(json);
    if (!parsedSnap.success) {
      return NextResponse.json(
        {
          success: false,
          error: "AI output failed schema validation (no credits charged).",
          details: parsedSnap.error.flatten(),
          rawPreview: raw.slice(0, 1200),
        },
        { status: 422 }
      );
    }

    const snapshot: Snapshot = parsedSnap.data;

    // Save version FIRST
    const { error: verErr } = await writer.from("project_versions").insert({
      project_id: projectId,
      owner_id: user.id,
      version_no: nextVersion,
      snapshot,
      note: note ?? `AI build v${nextVersion}`,
    });

    if (verErr) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not save project version (no credits charged). Check RLS/service role key.",
          details: verErr.message,
        },
        { status: 500 }
      );
    }

    // Charge credit ONLY after version saved successfully
    const { error: creditErr } = await writer.from("credit_ledger").insert({
      owner_id: user.id,
      delta: -1,
      reason: "build_success",
      project_id: projectId,
      metadata: {
        provider: "anthropic",
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
        version_no: nextVersion,
      },
    });

    if (creditErr) {
      // Build succeeded; credit write failed. Return success with warning.
      return NextResponse.json(
        {
          success: true,
          warning: "Build succeeded but credit ledger insert failed. Check RLS/service role key.",
          version_no: nextVersion,
          snapshot,
        },
        { status: 200 }
      );
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        version_no: nextVersion,
        snapshot,
        credits_charged: 1,
        balance_after: balance - 1,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Server error (no credits charged).",
        details: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}