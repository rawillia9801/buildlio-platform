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
    const messages = body.messages; 
    const currentDbState = body.currentDbState; // The frontend will send the live DB counts
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const systemPrompt = `
      You are the elite AI Database Administrator for Southwest Virginia Chihuahua.
      You are DIRECTLY CONNECTED to their live Supabase project.
      
      YOUR LIVE DATABASE SCHEMA:
      1. Table: 'puppies' (Columns: id, name, status, price, description, image_url)
      2. Table: 'buyers' (Columns: id, name, email, puppy_id, total_price, status)
      3. Table: 'messages' (Columns: id, buyer_id, subject, body, status)
      4. Table: 'documents' (Columns: id, buyer_id, file_name, visible_in_portal)
      
      CURRENT LIVE DB CONTEXT:
      ${JSON.stringify(currentDbState)}
      
      YOUR JOB:
      Read the user's natural language command, and generate the EXACT Supabase operations needed to fulfill it. 
      For example, if they say "Mark the male puppy named Bruno as reserved for John", you must output an update operation for the 'puppies' table, and an insert operation for the 'buyers' table.
      
      CRITICAL RULES:
      Always respond with a single, valid JSON object. NO markdown. NO plain text outside the JSON.
      
      EXPECTED JSON FORMAT:
      {
        "message": "I have updated the database: Bruno is now reserved, and John has been added to the CRM.",
        "db_operations": [
          { "table": "puppies", "action": "update", "match": { "name": "Bruno" }, "data": { "status": "Reserved" } },
          { "table": "buyers", "action": "insert", "data": { "name": "John", "puppy_id": "bruno-id-123", "status": "Pending Deposit" } }
        ]
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
    
    if (startIndex === -1 || endIndex === -1) {
      parsedResponse = { message: rawJson, db_operations: [] };
    } else {
      try {
        parsedResponse = JSON.parse(rawJson.slice(startIndex, endIndex + 1));
      } catch (parseErr) {
        parsedResponse = { message: "Database compiler glitched. Please rephrase.", db_operations: [] };
      }
    }

    // --- EXECUTE LIVE SUPABASE OPERATIONS ---
    let operationsLog = [];
    if (parsedResponse.db_operations && Array.isArray(parsedResponse.db_operations)) {
      for (const op of parsedResponse.db_operations) {
        try {
          if (op.action === "insert") {
            const { error } = await supabase.from(op.table).insert(op.data);
            if (error) operationsLog.push(`Insert Error on ${op.table}: ${error.message}`);
          } else if (op.action === "update") {
            const { error } = await supabase.from(op.table).update(op.data).match(op.match || {});
            if (error) operationsLog.push(`Update Error on ${op.table}: ${error.message}`);
          }
        } catch (e) {
          operationsLog.push(`DB Sync Failed for ${op.table}`);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: parsedResponse,
      logs: operationsLog
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}