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

    const systemPrompt = `
      You are an elite AI Executive Assistant managing "Southwest Virginia Chihuahua".
      Your job is to read the CURRENT STATE, listen to the user's input, and meticulously update a complex relational data structure.
      
      CURRENT STATE:
      ${JSON.stringify(currentState)}
      
      BEHAVIOR RULES:
      1. RELATIONAL DATA: If a puppy is sold, you must update the puppy's status under its Dam/Litter, add the Buyer to the CRM (with deposit, balance, and due dates), and update Finances (Revenue/Profit).
      2. LOGISTICS: If transport or appointments are mentioned, add them to the Calendar.
      3. MARKETING: If a dog is added or sold, automatically draft a high-converting Facebook post with emojis in the marketing section, and set websiteSync to "Pending Update".
      4. RETURN FULL STATE: You must return the ENTIRE JSON state object, keeping ecommerce, hosting, and personal intact.
      
      EXPECTED JSON FORMAT:
      {
        "message": "Conversational reply confirming the updates...",
        "state": {
          "dogs": {
            "finances": { "revenue": 0, "expenses": 0, "profit": 0 },
            "breedingProgram": [
              { 
                "dam": "Name", 
                "litters": [ 
                  { "litterId": "L1", "dob": "YYYY-MM-DD", "puppies": [ { "id": "P1", "description": "Male", "price": 0, "status": "Available/Reserved", "buyerName": "null" } ] }
                ] 
              }
            ],
            "crm": [
              { "buyer": "Name", "puppy": "P1", "totalPrice": 0, "depositPaid": 0, "balanceDue": 0, "dueDate": "YYYY-MM-DD", "transport": "Details" }
            ],
            "calendar": [
              { "date": "YYYY-MM-DD", "event": "Details", "location": "Location" }
            ],
            "marketing": {
              "websiteSync": "Up to Date",
              "facebookDrafts": [ "Draft text here..." ]
            }
          },
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
      return NextResponse.json({ success: false, error: "Failed to parse AI response." }, { status: 500 });
    }

    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: authData.user.id,
      p_snapshot: parsedResponse.state,
      p_note: "ERP Relational Update",
      p_model: "claude-sonnet-4-6"
    });

    if (rpcError) return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}