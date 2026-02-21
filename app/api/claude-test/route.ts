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

    // --- THE FIX: Added strict conciseness rules to the prompt ---
    const systemPrompt = `
      You are an elite Next.js and Supabase full-stack engineer. 
      The user wants a high-end, modern web application.
      
      CRITICAL: You must keep all code highly concise. Do not write unnecessary boilerplate or explanatory comments. If you write too much, the JSON will truncate and the system will crash.
      
      Output ONLY a raw, valid JSON object with NO markdown formatting. It must match this exact structure:
      {
        "appName": "Name of the App",
        "database": {
          "schema": "Raw Supabase PostgreSQL code for tables and RLS."
        },
        "nextjs": {
          "components": [
            { "filename": "page.tsx", "code": "Concise Next.js React/Tailwind code." }
          ]
        },
        "pages": [
          {
            "slug": "index",
            "blocks": [
              { "type": "hero", "headline": "High-impact title", "subhead": "Compelling subtitle" },
              { "type": "features", "items": [{ "title": "Feature 1", "description": "Detail" }] },
              { "type": "text", "content": "Detailed text content" }
            ]
          }
        ]
      }
    `;

    // --- THE FIX: Increased max_tokens to 8192 ---
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6", 
      max_tokens: 8192, 
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
      p_note: "Next.js + Supabase Build",
      p_model: "claude-sonnet-4-6"
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    
    return NextResponse.json({ success: true, snapshot });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}