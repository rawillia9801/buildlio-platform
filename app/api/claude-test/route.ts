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
    const currentState = body.currentState; // The AI needs to know the current state of your businesses!
    
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const systemPrompt = `
      You are "Chief", the elite AI Executive Assistant for the user. 
      The user runs 3 businesses: "Southwest Virginia Chihuahua" (Dog Breeding), E-commerce (Walmart/eBay sales), "HostMyWeb.com" (Web Hosting), plus their Personal life.
      
      Your job is to read the CURRENT STATE of their life, listen to their request, and return the FULLY UPDATED state alongside a conversational reply.
      
      CURRENT STATE:
      ${JSON.stringify(currentState)}
      
      RULES:
      1. If they say they sold a dog, update the dogs revenue and buyers list.
      2. If they shipped an eBay item, update the ecommerce inventory and expenses.
      3. Always respond with a single, valid JSON object containing your reply and the new state. NO text outside the JSON.
      
      EXPECTED JSON FORMAT:
      {
        "message": "Your conversational reply acknowledging what you just updated.",
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

    // Save this state backup to the database so you don't lose your data!
    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: authData.user.id,
      p_snapshot: parsedResponse.state,
      p_note: "Dashboard State Update",
      p_model: "claude-sonnet-4-6"
    });

    if (rpcError) return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}