// FILE: app/api/claude-test/route.ts
//
// CHANGELOG
// - v1.2 (2026-02-20)
//   * REFINED: Modularized architecture for better maintainability
//   * IMPROVED: Hardened JSON extraction with boundary detection
//   * ADDED: Detailed logging and structured error responses
//   * OPTIMIZED: Credit balance check using a single query
//   * FIXED: Supabase SSR client lifecycle for Next.js 14/15 compatibility

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

/** ---------------------------------------------------------
 * SECTION: CONFIG & SCHEMAS
 * --------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ANTHROPIC_KEY: process.env.ANTHROPIC_API_KEY!,
  MODEL: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
};

// Zod Schemas for the AI Output
const BlockHeroSchema = z.object({
  type: z.literal("hero"),
  headline: z.string().min(1).max(140),
  subhead: z.string().max(240).optional().default(""),
  cta: z.object({ label: z.string().max(40), href: z.string().max(200) }).optional(),
});

const BlockFeaturesSchema = z.object({
  type: z.literal("features"),
  items: z.array(z.object({
    title: z.string().max(80),
    description: z.string().max(180),
    icon: z.string().max(40).optional(),
  })).min(1).max(12),
});

const BlockTestimonialsSchema = z.object({
  type: z.literal("testimonials"),
  items: z.array(z.object({
    quote: z.string().max(240),
    name: z.string().max(60),
    title: z.string().max(60).optional(),
  })).min(1).max(8),
});

const BlockCTASchema = z.object({
  type: z.literal("cta"),
  headline: z.string().max(120),
  subhead: z.string().max(240).optional().default(""),
  cta: z.object({ label: z.string().max(40), href: z.string().max(200) }),
});

const BlockTextSchema = z.object({
  type: z.literal("text"),
  content: z.string().min(1).max(2000),
});

const BlockSchema = z.discriminatedUnion("type", [
  BlockHeroSchema, BlockFeaturesSchema, BlockTestimonialsSchema, BlockCTASchema, BlockTextSchema
]);

const PageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  title: z.string().max(80),
  blocks: z.array(BlockSchema).min(1).max(40),
});

const SnapshotSchema = z.object({
  title: z.string().max(80),
  theme: z.object({
    palette: z.string().default("neural-dark"),
    radius: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
  }),
  pages: z.array(PageSchema).min(1).max(10),
});

type Snapshot = z.infer<typeof SnapshotSchema>;

const RequestSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(3).max(4000),
  note: z.string().max(180).optional(),
});

/** ---------------------------------------------------------
 * SECTION: UTILITIES & CLIENTS
 * --------------------------------------------------------- */

function getSupabase(response: NextResponse, isAdmin = false) {
  const cookieStore = cookies();
  return createServerClient(
    ENV.SUPABASE_URL,
    isAdmin ? ENV.SUPABASE_SERVICE : ENV.SUPABASE_ANON,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          } catch (error) {
            // Silently fail if called in a context where cookies can't be set
          }
        },
      },
    }
  );
}

/**
 * Robust JSON extraction from LLM strings
 */
function extractCleanJson(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("No valid JSON found in AI response.");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/** ---------------------------------------------------------
 * SECTION: CORE ACTIONS
 * --------------------------------------------------------- */

async function callClaude(prompt: string): Promise<string> {
  const systemPrompt = `
    You are Buildlio Architect. Return ONLY raw JSON. No Markdown. No backticks.
    Schema: ${JSON.stringify(SnapshotSchema.shape)}
    Rules: 
    - Slugs: kebab-case. 
    - Content: Professional, conversion-optimized copy. 
    - Full site structure required.
  `.trim();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ENV.ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ENV.MODEL,
      max_tokens: 2500, // Increased for multi-page support
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API Error: ${res.statusText}`);
  const data = await res.json();
  return data.content[0].text;
}

/** ---------------------------------------------------------
 * SECTION: ROUTE HANDLER
 * --------------------------------------------------------- */

export async function POST(req: Request) {
  const response = new NextResponse();
  const supabase = getSupabase(response);
  const admin = getSupabase(response, true);

  try {
    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Validate Request
    const body = await req.json();
    const validatedReq = RequestSchema.safeParse(body);
    if (!validatedReq.success) return NextResponse.json({ error: "Invalid Payload", details: validatedReq.error.format() }, { status: 400 });
    
    const { projectId, prompt, note } = validatedReq.data;

    // 3. Project Ownership & Credit Check
    const [{ data: project }, { data: credits }] = await Promise.all([
      supabase.from("projects").select("id, owner_id").eq("id", projectId).single(),
      admin.from("credit_ledger").select("delta").eq("owner_id", user.id)
    ]);

    if (!project || project.owner_id !== user.id) return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    
    const currentBalance = (credits || []).reduce((acc, curr) => acc + curr.delta, 0);
    if (currentBalance < 1) return NextResponse.json({ error: "Insufficient credits", balance: currentBalance }, { status: 402 });

    // 4. AI Generation
    const rawAiResponse = await callClaude(prompt);
    const jsonAiResponse = extractCleanJson(rawAiResponse);
    
    // 5. Validation of AI Output
    const validatedSnapshot = SnapshotSchema.safeParse(jsonAiResponse);
    if (!validatedSnapshot.success) {
      return NextResponse.json({ 
        error: "AI generated invalid structure", 
        details: validatedSnapshot.error.format(),
        raw: rawAiResponse.slice(0, 500) 
      }, { status: 422 });
    }

    // 6. DB Persistence (Version + Credit Ledger)
    // We get the next version number first
    const { data: latestVer } = await admin
      .from("project_versions")
      .select("version_no")
      .eq("project_id", projectId)
      .order("version_no", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVer?.version_no ?? 0) + 1;

    // Atomic-like insert: Version then Ledger
    const { error: saveError } = await admin.from("project_versions").insert({
      project_id: projectId,
      owner_id: user.id,
      version_no: nextVersion,
      snapshot: validatedSnapshot.data,
      note: note ?? `AI Build v${nextVersion}`
    });

    if (saveError) throw new Error(`Failed to save version: ${saveError.message}`);

    const { error: ledgerError } = await admin.from("credit_ledger").insert({
      owner_id: user.id,
      delta: -1,
      reason: "ai_generation",
      project_id: projectId,
      metadata: { model: ENV.MODEL, version: nextVersion }
    });

    // 7. Final Response
    return NextResponse.json({
      success: true,
      version: nextVersion,
      snapshot: validatedSnapshot.data,
      balance_remaining: currentBalance - 1
    }, { status: 200, headers: response.headers });

  } catch (error: any) {
    console.error("[ROUTE_ERROR]:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}