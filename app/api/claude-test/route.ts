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

    // --- NEW: THE GOOD DOG SCRAPER TOOL ---
    let goodDogContext = "";
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();
    
    if (lastUserMessage.includes("good dog")) {
      try {
        // Fetch your live profile
        const gdRes = await fetch("https://www.gooddog.com/breeders/southwest-virginia-chihuahua-virginia", {
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
          }
        });
        
        if (gdRes.ok) {
          const html = await gdRes.text();
          // Strip the HTML tags so Claude just gets the raw text (names, prices, availability)
          const rawText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
          
          goodDogContext = `
            SYSTEM ALERT: The user requested a Good Dog sync. Here is the raw scraped text currently on their public Good Dog profile:
            ---
            ${rawText.substring(0, 12000)}
            ---
            Carefully read the text above. Identify any new litters, puppies, or availability statuses, and UPDATE the "dogs" section of the JSON state to match this live data.
          `;
        } else {
          goodDogContext = `\n\nSYSTEM ALERT: Tried to scrape Good Dog but their server blocked the request (Status: ${gdRes.status}). Inform the user politely.`;
        }
      } catch (e) {
        goodDogContext = `\n\nSYSTEM ALERT: Good Dog fetch failed.`;
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
      p_note: "Dashboard Sync",
      p_model: "claude-sonnet-4-6"
    });

    if (rpcError) return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}