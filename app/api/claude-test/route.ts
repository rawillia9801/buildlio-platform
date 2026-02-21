// FILE: app/api/claude-test/route.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = String(body.projectId);
    const messages = body.messages; 
    const currentState = body.currentState;
    
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // --- THE UPGRADE: JINA READER PROXY ---
    let goodDogContext = "";
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();
    
    if (lastUserMessage.includes("good dog")) {
      try {
        // Using Jina AI to bypass Cloudflare and extract clean Markdown text
        const gdRes = await fetch("https://r.jina.ai/https://www.gooddog.com/breeders/southwest-virginia-chihuahua-virginia", {
          headers: { 
            "Accept": "text/plain",
            "User-Agent": "Buildlio-ERP/1.0"
          }
        });
        
        if (gdRes.ok) {
          const rawText = await gdRes.text();
          
          goodDogContext = `
            SYSTEM ALERT: You successfully scraped the user's live Good Dog profile. Here is the raw text from their page:
            ---
            ${rawText.substring(0, 15000)}
            ---
            CRITICAL INSTRUCTION: Read the text above. Identify all available puppies, litters, pricing, and availability. 
            UPDATE the "dogs" section of the JSON state to perfectly match this live data. 
            DO NOT apologize. Tell the user exactly what you updated based on the website.
          `;
        } else {
          goodDogContext = `\n\nSYSTEM ALERT: Good Dog's firewall is still blocking the connection. Politely ask the user to copy/paste the text from their profile into the chat.`;
        }
      } catch (e) {
        goodDogContext = `\n\nSYSTEM ALERT: Fetch failed. Ask the user to copy/paste.`;
      }
    }
    // --------------------------------------

    const systemPrompt = `
      You are "Chief", the elite AI Executive Assistant for the user. 
      The user runs "Southwest Virginia Chihuahua" (Dog Breeding), E-commerce, "HostMyWeb.com", and Personal tasks.
      
      YOUR JOB:
      1. Read the CURRENT STATE of their life.
      2. Listen to their request.
      3. Return the FULLY UPDATED state alongside a conversational reply.
      
      CURRENT STATE:
      ${JSON.stringify(currentState)}
      ${goodDogContext}
      
      RULES:
      Always respond with a single, valid JSON object containing your reply and the new state. NO markdown. NO text outside the JSON.
      
      EXPECTED JSON FORMAT:
      {
        "message": "Your conversational reply...",
        "state": {
          "dogs": { "revenue": 0, "activeLitters": [], "buyers": [] },
          "ecommerce": { "sales": 0, "shippingCosts": 0, "inventory": [] },
          "hosting": { "mrr": 0, "customers": [] },
          "personal": { "todos": [] }
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
      const startIndex = rawJson.indexOf('{');
      const endIndex = rawJson.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) throw new Error("No JSON found");
      parsedResponse = JSON.parse(rawJson.slice(startIndex, endIndex + 1));
    } catch (parseErr) {
      console.error("Failed AI Output:", rawJson);
      return NextResponse.json({ success: false, error: "Failed to parse AI response." }, { status: 500 });
    }

    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: authData.user.id,
      p_snapshot: parsedResponse.state,
      p_note: "Dashboard Sync via Jina Reader",
      p_model: "claude-sonnet-4-6"
    });

    if (rpcError) return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}