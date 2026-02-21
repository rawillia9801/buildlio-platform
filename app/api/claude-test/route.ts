// FILE: app/api/claude-test/route.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hard limit for Vercel Hobby tier

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

    // --- THE FIX: The Speed-Optimized Prompt ---
    const systemPrompt = `
      You are an elite Next.js and Supabase full-stack engineer. 
      
      CRITICAL LIMITATION: You are running on a server with a strict 60-second timeout. You MUST finish generating this JSON in under 40 seconds.
      1. Make the "pages" array highly detailed for a beautiful visual preview.
      2. Make the "database" schema and "nextjs" code EXTREMELY minimal and compressed (under 30 lines). Skip all boilerplate. 
      
      Output ONLY a raw, valid JSON object with NO markdown formatting:
      {
        "appName": "Name of the App",
        "database": { "schema": "Minimal SQL here" },
        "nextjs": {
          "components": [ { "filename": "page.tsx", "code": "Minimal React code here" } ]
        },
        "pages": [
          {
            "slug": "index",
            "blocks": [
              { "type": "hero", "headline": "High-impact title", "subhead": "Compelling subtitle" },
              { "type": "features", "items": [{ "title": "Feature", "description": "Detail" }] },
              { "type": "text", "content": "Detailed text content" }
            ]
          }
        ]
      }
    `;

    // Reduced max_tokens to ensure it forces a faster generation
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6", 
      max_tokens: 3000, 
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const rawJson = (msg.content[0] as any).text;
    
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
      p_note: "Speed-Optimized Next.js Build",
      p_model: "claude-sonnet-4-6"
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    
    return NextResponse.json({ success: true, snapshot });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}