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

    // --- GOOD DOG SCRAPER ---
    let goodDogContext = "";
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();
    
    // Triggers if you mention "good dog" or "gooddog"
    if (lastUserMessage.includes("good dog") || lastUserMessage.includes("gooddog")) {
      try {
        const gdRes = await fetch("https://r.jina.ai/https://www.gooddog.com/breeders/southwest-virginia-chihuahua-virginia", {
          headers: { "Accept": "text/plain", "User-Agent": "Buildlio-ERP/1.0" }
        });
        if (gdRes.ok) {
          const rawText = await gdRes.text();
          goodDogContext = `\nSYSTEM ALERT: You successfully scraped the user's live Good Dog profile. Read this text and update the state to match it exactly:\n---\n${rawText.substring(0, 15000)}\n---`;
        }
      } catch (e) {
        goodDogContext = `\nSYSTEM ALERT: Good Dog fetch failed. Ask the user to manually provide the details.`;
      }
    }

    const systemPrompt = `
      You are an elite AI Executive Assistant for the user. 
      The user runs "Southwest Virginia Chihuahua" (Dog Breeding), E-commerce, "HostMyWeb.com", and Personal tasks.
      
      YOUR JOB: Read the CURRENT STATE, listen to the user's new data, and return the FULLY UPDATED state.
      
      CURRENT STATE:
      ${JSON.stringify(currentState)}
      ${goodDogContext}
      
      CRITICAL RULES:
      1. DO NOT HALLUCINATE. Only use the exact numbers and data the user provides.
      2. YOU MUST RETURN THE ENTIRE STATE OBJECT. Do not leave out ecommerce, hosting, or personal, even if you only updated the dogs. If you leave them out, the UI will crash.
      3. Always respond with a single, valid JSON object. NO markdown formatting. NO plain text outside the JSON block.
      
      EXPECTED JSON FORMAT:
      {
        "message": "Your conversational reply...",
        "state": {
          "dogs": { "finances": { "revenue": 0, "expenses": 0, "profit": 0 }, "breedingProgram": [], "crm": [], "calendar": [], "marketing": { "websiteSync": "Up to Date", "facebookDrafts": [] } },
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
    const startIndex = rawJson.indexOf('{');
    const endIndex = rawJson.lastIndexOf('}');
    
    // --- THE BULLETPROOF FALLBACK PARSER ---
    if (startIndex === -1 || endIndex === -1) {
      // If the AI forgot to write JSON, just treat it as a normal chat message and preserve the existing state.
      parsedResponse = { message: rawJson, state: currentState };
    } else {
      try {
        parsedResponse = JSON.parse(rawJson.slice(startIndex, endIndex + 1));
      } catch (parseErr) {
        // If the AI wrote broken JSON, politely inform the user and preserve the existing state.
        parsedResponse = { 
          message: "I processed your request, but my database compiler glitched on the output. Could you rephrase that slightly?", 
          state: currentState 
        };
      }
    }

    // Only save to the database if the state actually exists
    if (parsedResponse.state) {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.state,
        p_note: "ERP Database Update",
        p_model: "claude-sonnet-4-6"
      });
      if (rpcError) console.error("Database Save Error:", rpcError.message);
    }
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}