// FILE: app/api/claude-test/route.ts
//
// CHANGELOG
// - v1.3 (2026-02-20)
//   * FIX: Implemented async cookies for Next.js 16/React 19 compatibility
//   * UPGRADE: Replaced manual multi-step DB writes with a single atomic RPC call
//   * IMPROVE: Enhanced Claude system prompt for higher JSON reliability
//   * ADD: Detailed error logging and header-safe response handling

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

// Site Architecture Schema
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

/**
 * Next.js 16 requires awaiting cookies().
 */
async function getSupabase(response: NextResponse, isAdmin = false) {
  const cookieStore = await cookies();
  
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
          } catch {
            // Context-specific restriction (e.g. middleware)
          }
        },
      },
    }
  );
}

function extractCleanJson(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("The AI response did not contain a valid JSON object.");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/** ---------------------------------------------------------
 * SECTION: CORE ACTIONS
 * --------------------------------------------------------- */

async function callClaude(prompt: string): Promise<string> {
  const systemPrompt = `
    You are Buildlio Architect, a world-class UI/UX engineer. 
    Output ONLY valid, raw JSON matching the schema provided. 
    Rules:
    - Slugs must be kebab-case (e.g., 'about-us').
    - Copy should be professional, compelling, and ready for production.
    - Do not include markdown code fences or conversational text.
    - Schema structure: ${JSON.stringify(SnapshotSchema.shape)}
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
      max_tokens: 3500, // Room for deep multi-page structures
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

/** ---------------------------------------------------------
 * SECTION: ROUTE HANDLER
 * --------------------------------------------------------- */

export async function POST(req: Request) {
  const response = new NextResponse();
  
  try {
    const supabase = await getSupabase(response);
    const admin = await getSupabase(response, true);

    // 1. Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Request Validation
    const body = await req.json().catch(() => ({}));
    const validatedReq = RequestSchema.safeParse(body);
    if (!validatedReq.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid request data", 
        details: validatedReq.error.format() 
      }, { status: 400 });
    }
    
    const { projectId, prompt, note } = validatedReq.data;

    // 3. Project Ownership Check
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project || project.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: "Project access denied" }, { status: 404 });
    }

    // 4. AI Generation
    const rawAiResponse = await callClaude(prompt);
    let jsonAiResponse: any;
    
    try {
      jsonAiResponse = extractCleanJson(rawAiResponse);
    } catch (e: any) {
      return NextResponse.json({ 
        success: false, 
        error: "AI failed to produce valid JSON", 
        raw: rawAiResponse.slice(0, 300) 
      }, { status: 422 });
    }

    // 5. Semantic Validation
    const validatedSnapshot = SnapshotSchema.safeParse(jsonAiResponse);
    if (!validatedSnapshot.success) {
      return NextResponse.json({ 
        success: false, 
        error: "AI output failed schema validation", 
        details: validatedSnapshot.error.format() 
      }, { status: 422 });
    }

    // 6. Atomic DB Operation (Version + Credits) via RPC
    const { data: rpcData, error: rpcError } = await admin.rpc('save_version_and_charge_credit', {
      p_project_id: projectId,
      p_owner_id: user.id,
      p_snapshot: validatedSnapshot.data,
      p_note: note ?? "AI Generation",
      p_model: ENV.MODEL
    });

    if (rpcError) {
      const isCredits = rpcError.message.toLowerCase().includes("credits");
      return NextResponse.json({ 
        success: false, 
        error: rpcError.message 
      }, { status: isCredits ? 402 : 500 });
    }

    // RPC returns a table/array; extract values
    const { new_version_no, new_balance } = rpcData[0] || {};

    // 7. Successful Response
    return NextResponse.json({
      success: true,
      version_no: new_version_no,
      snapshot: validatedSnapshot.data,
      balance: new_balance,
      credits_charged: 1
    }, { 
      status: 200, 
      headers: response.headers // Ensure cookies are passed back
    });

  } catch (error: any) {
    console.error("[ROUTE_CRITICAL_FAILURE]:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}