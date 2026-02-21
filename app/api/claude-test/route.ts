// FILE: app/api/claude-test/route.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { projectId, messages, currentState, currentDbState } = await req.json();
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const systemPrompt = `
      You are the Master ERP Intelligence for Southwest VA Chihuahua & HostMyWeb.
      
      SCHEMA CONTEXT:
      - DOG BUSINESS: Tables [puppies, buyers, litters, bp_puppies, bp_buyers, breeding_dogs].
      - HOSTING (HostMyWeb): Tables [client_sites, domains, invoices, support_tickets].
      - E-COMMERCE: Tables [inventory, sales, inventory_sales, transactions].
      - PERSONAL/BILLS: Tables [bills, ops_tasks, investments_stocks].

      LIVE DATA SNAPSHOT:
      ${JSON.stringify(currentDbState)}

      CURRENT STATE (JSON):
      ${JSON.stringify(currentState)}

      INSTRUCTIONS:
      1. Use the LIVE DATA SNAPSHOT to answer questions. If 'puppyData' has items, DO NOT say 0.
      2. To calculate Hosting MRR: Sum 'total' from 'invoices' or count 'active' in 'client_sites'.
      3. To calculate E-commerce: Use the 'sales' and 'inventory' tables.
      4. Always return the 'state' object for the 3 JSON-based tabs (ecommerce, hosting, personal).
      5. Generate 'db_operations' for any database changes.

      RETURN JSON ONLY:
      {
        "message": "Direct answer to user",
        "state": { "ecommerce": {...}, "hosting": {...}, "personal": {...} },
        "db_operations": []
      }
    `;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", 
      max_tokens: 4000, 
      system: systemPrompt,
      messages: messages,
    });

    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : "";
    const parsed = JSON.parse(responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1));

    // Execute DB Ops if generated
    if (parsed.db_operations) {
      for (const op of parsed.db_operations) {
        if (op.action === "update") await supabase.from(op.table).update(op.data).match(op.match);
        if (op.action === "insert") await supabase.from(op.table).insert(op.data);
      }
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}