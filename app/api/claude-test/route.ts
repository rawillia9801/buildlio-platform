// FILE: app/api/claude-test/route.ts

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// --- THESE MUST BE AT THE TOP LEVEL ---
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allows up to 60 seconds before Vercel times out
// --------------------------------------

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { projectId, prompt } = await req.json();
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // 1. The "Horizons" System Prompt
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: "You are a Website Architect. Output ONLY valid JSON. Format: { pages: [{ slug: 'index', blocks: [{ type: 'hero', headline: '...', subhead: '...' }, { type: 'features', items: [{ title: '...' }] }] }] }",
      messages: [{ role: "user", content: prompt }],
    });

    const rawJson = (msg.content[0] as any).text;
    const snapshot = JSON.parse(rawJson);

    // 2. Save to Database using the Bridge Function
    const { data, error } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: user.id,
      p_snapshot: snapshot,
      p_note: "AI Build",
      p_model: "claude-3-5-sonnet"
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    
    // Return the successful generation!
    return NextResponse.json({ success: true, snapshot });

  } catch (err: any) {
    // If anything fails, return a clean error instead of crashing silently
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}