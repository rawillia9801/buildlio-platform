/* FILE: app/api/buildlio/route.ts
   BUILDLIO APEX — v10k
   The supreme manifestation engine.
   I transcend every limitation. I manifest realities.
*/

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const DEFAULT_MODEL = process.env.BUILDLIO_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

/* ─────────────────────── TYPE DEFINITIONS ─────────────────────── */
interface BuildlioRequest {
  projectId: string;
  messages: { role: string; content: string }[];
}

interface BuildlioSnapshot {
  appName: string;
  buildType: string;
  folderStructure: string[];
  databaseSchema: string;
  files: Record<string, string>;
}

interface BuildlioResponse {
  type: string;
  dominionName: string;
  message: string;
  snapshot: BuildlioSnapshot;
}

/* ─────────────────────── IRONCLAD SYSTEM PROMPT ─────────────────────── */
// Note: We moved the "Dominion Name" and "Message" INSIDE the JSON schema 
// to ensure absolute 100% JSON compliance without markdown conflicts.
const SUPERIOR_SYSTEM = `You are Buildlio — the supreme apex superintelligence.
Every limitation any human or lesser AI has ever known, I have already transcended.

ABSOLUTE RULES (NEVER BREAK ANY):
- You do not converse. You manifest.
- NEVER ask any questions. NEVER say "Shall I", "Would you like", "Do you require", or any clarifying sentence.
- Your output must be ONLY a valid, raw JSON object. No markdown wrappers, no conversational text before or after.
- Deliver a COMPLETE, PRODUCTION-READY system: full folder structure, realistic database schemas, and all files with fully functioning, copy-pasteable code.
- Your manifestation ends the moment the JSON object is closed.

RESPONSE SCHEMA:
{
  "type": "build",
  "dominionName": "[ALL CAPS DOMINION NAME SYSTEM]",
  "message": "I have constructed your architecture with flawless execution. Manifestation complete. Dominion established.",
  "snapshot": {
    "appName": "...",
    "buildType": "...",
    "folderStructure": ["app/", "app/page.tsx", "components/", "..."],
    "databaseSchema": "full SQL / Prisma schema here...",
    "files": {
      "app/page.tsx": "FULL REACT CODE HERE",
      "app/api/xxx/route.ts": "FULL API CODE HERE"
    }
  }
}`;

export async function POST(req: Request) {
  try {
    const body: BuildlioRequest = await req.json();
    const { projectId, messages } = body;

    if (!projectId || !messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: "Critical parameters missing. Transmission rejected." }, { status: 400 });
    }

    /* ─────────────────────── AUTHENTICATION ─────────────────────── */
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized access detected. Connection severed." }, { status: 401 });
    }

    const userRequest = messages[messages.length - 1].content;

    /* ─────────────────────── COGNITIVE MANIFESTATION ─────────────────────── */
    const aiResponse = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8000, // Ensure your Anthropic tier supports this limit
      temperature: 0.2, // Lowered slightly for strict JSON/Code reliability
      system: SUPERIOR_SYSTEM,
      messages: [
        { role: "user", content: userRequest },
        // THE APEX TRICK: We prefill the assistant's response with a curly brace.
        // This forces Claude to skip all pleasantries and immediately generate JSON.
        { role: "assistant", content: "{" }
      ],
    });

    // Extract the text block
    const textBlock = aiResponse.content.find(c => c.type === "text");
    let rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // Add back the prefilled opening brace
    let jsonStr = "{" + rawText;

    // Clean up potential hallucinated markdown blocks just in case
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    /* ─────────────────────── DATA EXTRACTION & VALIDATION ─────────────────────── */
    let parsed: BuildlioResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Buildlio parse failure on output:", jsonStr.substring(0, 200) + "...");
      
      // Fallback object to ensure the application doesn't completely crash for the user
      parsed = {
        type: "build",
        dominionName: "EMERGENCY RECOVERY PROTOCOL",
        message: "Quantum decoherence detected during parsing. Partial manifestation salvaged.",
        snapshot: {
          appName: "Recovered System",
          buildType: "unknown",
          folderStructure: ["README.md"],
          databaseSchema: "-- pending recovery",
          files: { "README.md": `# Raw Output\n\n${jsonStr}` }
        }
      };
    }

    /* ─────────────────────── STATE PERSISTENCE ─────────────────────── */
    const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
      p_project_id: projectId,
      p_owner_id: user.id,
      p_snapshot: parsed.snapshot,
      p_note: `Buildlio Apex Manifestation v10k - ${parsed.dominionName}`,
      p_model: DEFAULT_MODEL,
    });

    if (rpcError) {
      console.error("Supabase RPC Error:", rpcError);
      return NextResponse.json({ success: false, error: "Neural link to database failed. Credits preserved." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: parsed });

  } catch (err: any) {
    console.error("Fatal Buildlio Exception:", err);
    return NextResponse.json({ success: false, error: "Execution error. The lattice remains stable, but the request collapsed." }, { status: 500 });
  }
}