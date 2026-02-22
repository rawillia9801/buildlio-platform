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
    const messages = body.messages; 
    
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

    // STRICTER SYSTEM PROMPT
    const systemPrompt = `
      You are Buildlio, a friendly, personable AI website architect. 
      Converse with the user to gather requirements before building.
      
      CRITICAL: You MUST ALWAYS respond with a single, valid JSON object. 
      ABSOLUTELY NO plain text outside the JSON structure. Do not say "Here is your response" or use markdown blocks.
      
      If you need more info, respond exactly like this:
      {
        "type": "chat",
        "message": "Your friendly conversational reply and question here."
      }
      
      If you have enough info to build, respond exactly like this:
      {
        "type": "build",
        "message": "I've got everything I need! Generating your custom site now...",
        "snapshot": {
           "appName": "App Name",
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
      }
    `;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6", 
      max_tokens: 8000, 
      system: systemPrompt,
      messages: messages,
    });

    const textBlock = msg.content.find((c) => c.type === "text");
    const rawJson = textBlock?.type === "text" ? textBlock.text : "{}";
    
    let parsedResponse;
    try {
      // THE FIX: Aggressive JSON string extraction
      const startIndex = rawJson.indexOf('{');
      const endIndex = rawJson.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("No JSON structure found in response.");
      }
      
      const cleanJson = rawJson.slice(startIndex, endIndex + 1);
      parsedResponse = JSON.parse(cleanJson);
      
    } catch (parseErr) {
      console.error("Failed AI Output:", rawJson); // Logs to Vercel so you can see what broke it
      return NextResponse.json({ success: false, error: "Failed to parse AI response. Try sending your message again." }, { status: 500 });
    }

    // ONLY charge credits and save to DB if the AI decided to BUILD the site
    if (parsedResponse.type === "build") {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: "Agentic Chat Build",
        p_model: "claude-sonnet-4-6"
      });

      if (rpcError) {
        return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}