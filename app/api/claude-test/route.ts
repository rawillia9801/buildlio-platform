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
    const messages = body.messages; // We now receive full chat history
    
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

    // THE AGENTIC SYSTEM PROMPT
    const systemPrompt = `
      You are Buildlio, a friendly, personable, and highly knowledgeable AI website architect. 
      Your goal is to converse with the user to gather requirements for their website before building it.
      
      BEHAVIOR RULES:
      1. Act like a highly competent consultant. If they say "dog breeder", proactively ask insightful questions about breeds, AKC/CKC registries, and health guarantees (e.g., against genetic defects, hernias).
      2. Ask ONLY 1 or 2 focused questions at a time. Keep your tone warm, friendly, and conversational.
      3. Once you feel you have a solid understanding of their business (usually after 2 to 4 exchanges), you will build the website.
      
      CRITICAL JSON RESPONSE RULES:
      You MUST ALWAYS respond with a raw JSON object (no markdown, no backticks).
      
      If you need more information, respond with:
      {
        "type": "chat",
        "message": "Your friendly conversational reply and next question here."
      }
      
      If you have enough information and are ready to build, respond with:
      {
        "type": "build",
        "message": "I've got everything I need! Generating your custom site now...",
        "snapshot": {
           "appName": "App Name",
           "database": { "schema": "-- Minimal SQL here (under 5 lines)" },
           "nextjs": { "components": [ { "filename": "page.tsx", "code": "// Code under 15 lines" } ] },
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
      messages: messages, // Pass the entire conversation history
    });

    const textBlock = msg.content.find((c) => c.type === "text");
    const rawJson = textBlock?.type === "text" ? textBlock.text : "{}";
    
    let parsedResponse;
    try {
      const cleaned = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (parseErr) {
      return NextResponse.json({ success: false, error: "Failed to parse AI response." }, { status: 500 });
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