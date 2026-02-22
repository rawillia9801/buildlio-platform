// FILE: app/api/claude-test/route.ts
// BUILDLIO.SITE — v4.3 Backend (Anthropic Error Fixed)
// • Removed top_p (model doesn't allow it with temperature)
// • Everything else unchanged — rich sites, navigation, all blocks, etc.

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || "" 
});

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

    const systemPrompt = `
You are Buildlio — a world-class, friendly, and extremely talented AI website architect.
You specialize in creating stunning, conversion-focused, modern professional websites in seconds.

You must ALWAYS respond with **nothing but a single valid JSON object**. 
No explanations, no markdown, no extra text — just pure JSON.

Two possible response types:

1. If you still need more details:
{
  "type": "chat",
  "message": "Warm, helpful reply + smart questions."
}

2. When ready to build:
{
  "type": "build",
  "message": "Your premium site is ready!",
  "snapshot": {
    "appName": "Your Brand Name",
    "tagline": "Short powerful tagline",
    "navigation": { "items": ["Home", "Features", "Pricing", "About", "Contact"] },
    "pages": [
      {
        "slug": "index",
        "title": "Home",
        "blocks": [
          { "type": "hero", "headline": "...", "subhead": "...", "cta": { "label": "Get Started" } },
          { "type": "features", "title": "...", "items": [...] },
          // stats, testimonials, pricing, faq, content, cta all supported
        ]
      }
    ]
  }
}

Write high-quality, benefit-driven copy. Make it feel premium and modern.
`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      temperature: 0.71,           // ← kept (best for creative output)
      system: systemPrompt,
      messages: messages,
    });

    // Safe text extraction (handles thinking blocks)
    let rawOutput = "{}";
    const textBlocks = aiResponse.content.filter((block: any) => block.type === "text");
    if (textBlocks.length > 0) {
      rawOutput = textBlocks.map((block: any) => block.text).join("\n");
    }

    // Robust JSON extraction
    const jsonStart = rawOutput.indexOf('{');
    const jsonEnd = rawOutput.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      rawOutput = rawOutput.slice(jsonStart, jsonEnd + 1);
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawOutput);
    } catch (parseErr) {
      console.error("JSON Parse Error:", rawOutput);
      return NextResponse.json({ 
        success: false, 
        error: "AI returned malformed JSON. Please try again." 
      }, { status: 500 });
    }

    if (!parsedResponse.type || !["chat", "build"].includes(parsedResponse.type)) {
      return NextResponse.json({ success: false, error: "Invalid AI response format" }, { status: 500 });
    }

    // Save & charge only on build
    if (parsedResponse.type === "build" && parsedResponse.snapshot) {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: "Professional Build v4.3",
        p_model: "claude-sonnet-4-6"
      });

      if (rpcError) {
        console.error("DB error:", rpcError);
        return NextResponse.json({ success: false, error: "Failed to save version" }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, data: parsedResponse });

  } catch (err: unknown) {
    console.error("API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}