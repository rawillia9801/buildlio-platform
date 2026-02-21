// FILE: app/api/claude-test/route.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; 

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

    // --- THE FIX: Pointing to the newest, valid Claude 3.7 model ---
    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", 
      max_tokens: 4000,
      system: "You are a Website Architect. Output ONLY valid JSON without markdown formatting. Format: { pages: [{ slug: 'index', blocks: [{ type: 'hero', headline: '...', subhead: '...' }, { type: 'features', items: [{ title: '...', description: '...' }] }, { type: 'text', content: '...' }] }] }",
      messages: [{ role: "user", content: prompt }],
    });

    const rawJson = (msg.content[0] as any).text;
    
    // Safety net: Cleans up the response if Claude wraps it in ```json
    let snapshot;
    try {
      snapshot = JSON.parse(rawJson);
    } catch (parseErr) {
      const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
      snapshot = JSON.parse(cleaned);
    }

    const { data, error } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: user.id,
      p_snapshot: snapshot,
      p_note: "AI Build",
      p_model: "claude-3-7-sonnet"
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    
    return NextResponse.json({ success: true, snapshot });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}