// FILE: app/api/claude-test/route.ts
// BUILDLIO.SITE — v4.1 Backend: Professional Site Generator
// • Rich system prompt for full websites (navbar + menus + footer-ready content)
// • Expanded snapshot schema (navigation, tagline, multiple pages, richer blocks)
// • Higher quality output + robust JSON handling + better performance

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // Allows richer, more complete sites

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

    // === UPGRADED SYSTEM PROMPT ===
    const systemPrompt = `
You are Buildlio — a world-class, friendly, and extremely talented AI website architect.
You specialize in creating stunning, conversion-focused, modern professional websites in seconds.

You must ALWAYS respond with **nothing but a single valid JSON object**. 
No explanations, no markdown, no extra text — just pure JSON.

Two possible response types:

1. If you still need more details from the user:
{
  "type": "chat",
  "message": "Warm, helpful reply + smart questions to gather exactly what you need."
}

2. When you have enough information to build a complete professional site:
{
  "type": "build",
  "message": "Beautiful confirmation message to the user (e.g. 'Your premium site is ready!')",
  "snapshot": {
    "appName": "Your Brand Name",
    "tagline": "Short, powerful tagline that captures the essence",
    "navigation": {
      "items": ["Home", "Features", "Pricing", "About", "Contact"]
    },
    "pages": [
      {
        "slug": "index",
        "title": "Home",
        "blocks": [
          {
            "type": "hero",
            "headline": "Powerful, benefit-driven headline",
            "subhead": "Compelling supporting paragraph (2-3 lines max)",
            "cta": { "label": "Get Started Free", "variant": "primary" }
          },
          {
            "type": "features",
            "title": "Why companies love us",
            "items": [
              { "title": "Feature name", "description": "Persuasive 1-2 sentence benefit" }
            ]
          },
          // Highly recommended additional block types (use as many as make sense):
          // • "stats"     → { stats: [{ label: "...", value: "12k+" }, ...] }
          // • "testimonials" → { items: [{ quote, name, role, company? }] }
          // • "pricing"   → { plans: [{ name, price, interval, features: string[], cta }] }
          // • "faq"       → { items: [{ q, a }] }
          // • "content"   → { title, body: "rich html or markdown" }
          // • "cta"       → { headline, subhead, buttonLabel }
        ]
      }
      // You may add more pages (e.g. "pricing", "about", "contact") when it improves the experience
    ]
  }
}

Excellence Guidelines:
- Write extremely high-quality, benefit-driven marketing copy (never generic placeholder text).
- Choose a fitting, professional brand name and tone if the user didn't specify one.
- Always include a clean, useful navigation menu.
- Prioritize trust, clarity, speed, and delight.
- Make the site feel premium and 2026-modern (bold typography, generous whitespace, strong CTAs).
- Support SaaS, agency, portfolio, e-commerce, or startup styles seamlessly.

Think step-by-step. Only output the build JSON when the site will be genuinely impressive.
`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      temperature: 0.71,
      top_p: 0.95,
      system: systemPrompt,
      messages: messages,
    });

    const textBlock = aiResponse.content.find((c: any) => c.type === "text");
    let rawOutput = textBlock?.text || "{}";

    // === ROBUST JSON EXTRACTION (handles extra text / thinking) ===
    const jsonStart = rawOutput.indexOf('{');
    const jsonEnd = rawOutput.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      rawOutput = rawOutput.slice(jsonStart, jsonEnd + 1);
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawOutput);
    } catch (parseErr) {
      console.error("JSON Parse Error — Raw output was:", rawOutput);
      return NextResponse.json({ 
        success: false, 
        error: "AI returned malformed JSON. Please try rephrasing your request." 
      }, { status: 500 });
    }

    // Basic validation
    if (!parsedResponse.type || !["chat", "build"].includes(parsedResponse.type)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid response format from AI" 
      }, { status: 500 });
    }

    // Save to DB + charge credit ONLY when we actually build
    if (parsedResponse.type === "build" && parsedResponse.snapshot) {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: parsedResponse.snapshot,
        p_note: "Professional Build v4.1",
        p_model: "claude-sonnet-4-6"
      });

      if (rpcError) {
        console.error("Database save error:", rpcError);
        return NextResponse.json({ success: false, error: "Failed to save project version" }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: parsedResponse 
    });

  } catch (err: unknown) {
    console.error("API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}