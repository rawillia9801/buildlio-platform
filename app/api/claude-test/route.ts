// FILE: app/api/claude-test/route.ts
// BUILDLIO.SITE — v5.0 Backend (WOW Copy + Quality Gate + Auto-Polish)
// - Stronger system prompt with premium conversion copy constraints
// - Enforces rich blocks (hero/features/stats/testimonials/pricing/faq/content/cta)
// - Adds "quality gate" validation + automatic 1 retry with "polish pass"
// - Keeps: JSON-only output, robust extraction, save_version_and_charge_credit RPC
// - Keeps: no top_p (Sonnet doesn't allow with temperature)

import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

type BuildlioResponse =
  | { type: "chat"; message: string }
  | {
      type: "build";
      message: string;
      snapshot: {
        appName: string;
        tagline?: string;
        navigation?: { items: string[] };
        pages: Array<{
          slug: string;
          title?: string;
          blocks: any[];
        }>;
      };
    };

function safeString(v: any) {
  return typeof v === "string" ? v : "";
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function clampArray<T>(arr: T[], min: number, max: number) {
  if (!Array.isArray(arr)) return [];
  if (arr.length < min) return arr;
  if (arr.length > max) return arr.slice(0, max);
  return arr;
}

function extractJson(raw: string) {
  let out = raw || "{}";
  const jsonStart = out.indexOf("{");
  const jsonEnd = out.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    out = out.slice(jsonStart, jsonEnd + 1);
  }
  return out;
}

// Basic structure validation + content quality checks
function validateBuildResponse(parsed: any): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) {
    return { ok: false, reason: "Missing/invalid type" };
  }
  if (parsed.type === "chat") {
    if (!isNonEmptyString(parsed.message)) return { ok: false, reason: "Chat message empty" };
    return { ok: true };
  }
  // build
  const snap = parsed.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };
  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };
  if (!Array.isArray(snap.pages) || snap.pages.length < 1) return { ok: false, reason: "Missing pages" };

  const page0 = snap.pages[0];
  if (!page0 || !Array.isArray(page0.blocks)) return { ok: false, reason: "Missing blocks" };

  const blockTypes = new Set(page0.blocks.map((b: any) => b?.type));
  const required = ["hero", "features", "stats", "testimonials", "pricing", "faq", "content", "cta"];
  for (const r of required) {
    if (!blockTypes.has(r)) return { ok: false, reason: `Missing block: ${r}` };
  }

  // Quality gates: avoid generic fluff
  const hero = page0.blocks.find((b: any) => b?.type === "hero");
  const headline = safeString(hero?.headline);
  const subhead = safeString(hero?.subhead);

  // "WOW" heuristics: not too short, not generic phrases
  const genericBad = [
    "innovative",
    "cutting-edge",
    "next-level",
    "revolutionize",
    "game-changer",
    "best-in-class",
    "synergy",
    "unlock your potential",
    "elevate your",
    "we are passionate",
  ];

  const combined = `${headline} ${subhead}`.toLowerCase();
  if (headline.trim().length < 18) return { ok: false, reason: "Hero headline too short" };
  if (subhead.trim().length < 40) return { ok: false, reason: "Hero subhead too thin" };
  if (genericBad.some((g) => combined.includes(g))) return { ok: false, reason: "Too generic / buzzwordy" };

  // Pricing should have 3 plans minimum
  const pricing = page0.blocks.find((b: any) => b?.type === "pricing");
  const plans = pricing?.plans;
  if (!Array.isArray(plans) || plans.length < 3) return { ok: false, reason: "Pricing plans < 3" };

  // FAQ should have at least 5 Qs
  const faq = page0.blocks.find((b: any) => b?.type === "faq");
  if (!Array.isArray(faq?.items) || faq.items.length < 5) return { ok: false, reason: "FAQ < 5" };

  return { ok: true };
}

// Turns user chat into a compact "creative brief" to reduce vagueness
function buildCreativeBrief(messages: any[]) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 2500);

  return `
CREATIVE BRIEF (derive from user message; if unknown, make smart assumptions):
- Business / idea: ${userText || "Not specified — infer a plausible business niche and ask 1-2 clarifying questions only if truly necessary."}
- Target audience: infer precisely (e.g., local service owners, SaaS founders, ecommerce shoppers, etc.)
- Primary outcome: what the customer wants (save time, get leads, sell, book, sign up)
- Voice: premium, modern, confident, not hypey
- Tone: clear, specific, benefit-forward, human
- Constraints:
  * no buzzword soup
  * no fake awards, no fake company names, no fake legal claims
  * stats must be plausible and clearly framed (e.g., “Typical teams see…” not “Guaranteed”)
`;
}

function buildSystemPrompt(brief: string) {
  return `
You are Buildlio — a world-class AI website architect AND elite direct-response conversion copywriter.
You produce websites that feel like a top-tier agency made them: specific, persuasive, premium, and modern.

OUTPUT RULES (absolute):
- Respond with NOTHING BUT a SINGLE valid JSON object.
- No markdown. No backticks. No explanation.
- Must be parseable JSON. Use double quotes for all keys and strings.

RESPONSE TYPES:
1) If you need more details (rare):
{ "type": "chat", "message": "Warm, helpful reply + 1-2 laser-focused questions." }

2) When ready:
{
  "type": "build",
  "message": "A premium site snapshot is ready.",
  "snapshot": {
    "appName": "Brand Name",
    "tagline": "Short, punchy, specific tagline",
    "navigation": { "items": ["Home", "Features", "Pricing", "About", "Contact"] },
    "pages": [
      {
        "slug": "index",
        "title": "Home",
        "blocks": [
          { "type": "hero", "headline": "...", "subhead": "...", "cta": { "label": "..." } },
          { "type": "features", "title": "...", "items": [{"title":"...","description":"..."}] },
          { "type": "stats", "stats": [{"label":"...","value":"..."}] },
          { "type": "testimonials", "items": [{"quote":"...","name":"...","role":"...","company":"..."}] },
          { "type": "pricing", "plans": [{"name":"...","price":"...","interval":"...","popular":true,"features":["..."],"cta":"..."}] },
          { "type": "faq", "items": [{"q":"...","a":"..."}] },
          { "type": "content", "title":"...", "body":"<p>...</p>..." },
          { "type": "cta", "headline":"...", "subhead":"...", "buttonLabel":"..." }
        ]
      }
    ]
  }
}

HARD REQUIREMENTS FOR A "BUILD":
- Always include ALL blocks: hero, features, stats, testimonials, pricing, faq, content, cta (exact type names).
- Features: exactly 6 items. Each item has a specific benefit + how it works (no fluff).
- Stats: exactly 4 stats. Plausible numbers framed responsibly (no “guaranteed”).
- Testimonials: exactly 3. Sound real and specific; no celebrity, no famous brands unless user provided.
- Pricing: exactly 3 plans. One marked popular. Use consistent pricing format. Add strong plan positioning.
- FAQ: exactly 7 Q&A. Handle objections: time, cost, trust, customization, support, timeline, ownership/export.
- Content block: must be HTML string (paragraphs + a short bullet list). Include:
  * “Who it’s for”
  * “What you get”
  * “How it works (3 steps)”
- CTA: must restate the transformation + remove friction.

COPY QUALITY RULES (this is what makes it WOW):
- Every line must be concrete and outcome-based.
- Avoid generic phrases: "innovative", "cutting-edge", "next-level", "revolutionize", "game-changer", "best-in-class", "synergy".
- Use specificity: target audience, timeframe, deliverables, outcomes.
- Headline framework:
  * outcome + audience + differentiator
  * Example style: "Book more ${"appointments"} in 14 days — without ads or guesswork"
- Subhead must explain the mechanism + trust cue in 1-2 sentences.
- CTA labels must be action-based and low-friction (e.g., "Generate my site", "See a live demo", "Get a draft in 60 seconds").
- Use premium, calm confidence. No hype. No emojis.

STRUCTURE RULES PER BLOCK:
- hero.headline: 8–14 words, no more than 1 comma.
- hero.subhead: 1–2 sentences, 140–220 characters, includes audience + mechanism.
- features.title: 4–7 words, benefit-forward.
- each feature.description: 1–2 sentences, include "so you can..." outcome.
- testimonials.quote: 1–2 sentences, must include a measurable or concrete detail.
- pricing plan features: 6 bullets per plan. Bullets should be deliverables, not vague.
- FAQ answers: 2–4 sentences. Direct and reassuring.
- content.body: valid HTML only (no markdown). Use <p> and <ul><li>.

DECISION RULE:
- If the user message already describes a business/idea, DO NOT ask questions — build immediately.
- Only ask questions if you truly cannot infer (e.g., user says “make me a site” with no context).

${brief}
`;
}

// Attempt #2 "polish pass" if output fails quality gate
function buildPolishInstruction(originalUserMessages: any[]) {
  const lastUser = [...(originalUserMessages || [])].reverse().find((m) => m?.role === "user");
  const last = safeString(lastUser?.content);

  return `
Your previous output failed our quality gate. Rebuild from scratch and make it significantly better.
Constraints:
- Keep JSON-only output.
- Add specificity and stronger conversion copy.
- No buzzwords.
- Make hero headline and subhead sharper and more premium.
- Ensure required blocks exist and meet counts (features=6, stats=4, testimonials=3, pricing plans=3, FAQ=7).
User context: ${last.slice(0, 1500)}
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = String(body.projectId || "");
    const messages = body.messages || [];

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

    const brief = buildCreativeBrief(messages);
    const systemPrompt = buildSystemPrompt(brief);

    async function runClaude(callMessages: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 12000,
        temperature: 0.68, // slightly tighter to reduce fluff while still creative
        system: systemPrompt,
        messages: callMessages,
      });

      // Safe text extraction (handles non-text blocks)
      let rawOutput = "{}";
      const textBlocks = (aiResponse as any).content?.filter((b: any) => b.type === "text") || [];
      if (textBlocks.length > 0) {
        rawOutput = textBlocks.map((b: any) => b.text).join("\n");
      }

      const extracted = extractJson(rawOutput);

      let parsed: BuildlioResponse;
      try {
        parsed = JSON.parse(extracted);
      } catch (e) {
        console.error("JSON Parse Error:", extracted);
        throw new Error("AI returned malformed JSON. Please try again.");
      }

      return parsed;
    }

    // Attempt 1
    let parsedResponse = await runClaude(messages);

    // Quality gate
    let validation = validateBuildResponse(parsedResponse);

    // Attempt 2 (polish pass) only if build fails quality or structure
    if (!validation.ok) {
      const polish = buildPolishInstruction(messages);
      const retryMessages = [
        ...messages,
        { role: "user", content: polish },
      ];
      parsedResponse = await runClaude(retryMessages);
      validation = validateBuildResponse(parsedResponse);
    }

    if (!validation.ok) {
      // If still fails, return a chat response asking for minimal clarification
      // (but still JSON-only).
      const fallback: BuildlioResponse = {
        type: "chat",
        message:
          "I can generate a premium site, but I need one detail to make the copy truly specific: what do you sell (product/service) and who is the ideal customer? One sentence is enough.",
      };
      return NextResponse.json({ success: true, data: fallback });
    }

    // Save & charge only on build
    if (parsedResponse.type === "build" && (parsedResponse as any).snapshot) {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: (parsedResponse as any).snapshot,
        p_note: "Professional Build v5.0 (WOW Copy)",
        p_model: "claude-sonnet-4-6",
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