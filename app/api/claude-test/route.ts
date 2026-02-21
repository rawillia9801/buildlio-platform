// FILE: app/api/claude-test/route.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel's hard limit

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = String(body.projectId);
    const prompt = String(body.prompt);
    
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // SYSTEM PROMPT: Forces speed to beat Vercel's timer
    const systemPrompt = `
      You are an elite Next.js and Supabase architect.
      
      CRITICAL RULES TO PREVENT TIMEOUTS:
      1. You must keep the database and nextjs sections extremely brief. 
      2. "nextjs.components[0].code" MUST be under 15 lines. Use placeholders like "// Component logic..."
      3. "database.schema" MUST be under 5 lines.
      4. Make the "pages" array detailed for the UI preview, but cap it at 4 blocks total.
      
      Output ONLY raw, valid JSON. No markdown.
      {
        "appName": "App Name",
        "database": { "schema": "-- SQL here" },
        "nextjs": {
          "components": [ { "filename": "page.tsx", "code": "// Code here" } ]
        },
        "pages": [
          {
            "slug": "index",
            "blocks": [
              { "type": "hero", "headline": "Title", "subhead": "Sub" },
              { "type": "features", "items": [{ "title": "Feat", "description": "Desc" }] }
            ]
          }
        ]
      }
    `;

    // High token ceiling so it doesn't truncate, but prompt forces it to be fast
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6", 
      max_tokens: 8000, 
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    // Safely extract text for TypeScript
    const textBlock = msg.content.find((c) => c.type === "text");
    const rawJson = textBlock?.type === "text" ? textBlock.text : "{}";
    
    let snapshot;
    try {
      snapshot = JSON.parse(rawJson);
    } catch (parseErr) {
      const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
      snapshot = JSON.parse(cleaned);
    }

    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: authData.user.id,
      p_snapshot: snapshot,
      p_note: "Next.js + Supabase Build",
      p_model: "claude-sonnet-4-6"
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, snapshot });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}