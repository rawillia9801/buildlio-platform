// FILE: app/api/claude-test/route.ts
// BUILDLIO.SITE — v5.3 Backend (WOW Copy + Quality Gate + Build Types)
// - Adds buildType support: application, document, store, landing_page, website, other
// - Accepts buildType from request body (recommended) OR detects "TYPE: store" in user message
// - Keeps: JSON-only output, robust extraction, save_version_and_charge_credit RPC
// - Keeps: Rich required blocks on index so existing renderer/export still works
// - Adds: buildType-aware navigation, positioning, content, FAQ, pricing framing
// - Adds: 1 retry “polish pass” with reason

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

type BuildType = "website" | "landing_page" | "application" | "document" | "store" | "other";

type BuildlioResponse =
  | { type: "chat"; message: string }
  | {
      type: "build";
      message: string;
      snapshot: {
        appName: string;
        tagline?: string;
        navigation?: { items: string[] };
        meta?: {
          buildType?: BuildType;
          intent?: string;
        };
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
function normalizeWhitespace(s: any) {
  return safeString(s).replace(/\s+/g, " ").trim();
}
function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
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
function arr(v: any) {
  return Array.isArray(v) ? v : [];
}
function getBlock(blocks: any[], type: string) {
  return arr(blocks).find((b) => b && b.type === type);
}

const GENERIC_BAD = [
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
  "state-of-the-art",
  "seamless solution",
  "powerful platform",
  "ultimate",
];
const TOO_VAGUE = ["for everyone", "for anyone", "all businesses", "any business", "top-notch", "amazing", "incredible", "unmatched"];

function containsAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}
function hasSpecificitySignals(text: string) {
  const t = text.toLowerCase();
  const hasNumber = /\d/.test(t);
  const hasConcreteNouns =
    /(calls|bookings|leads|appointments|orders|checkout|invoices|quotes|estimates|calendar|crm|pipeline|onboarding|templates|contracts|deliverables|export|ownership|domain|storefront|catalog|cart|sku|inventory|checkout|shipping)/.test(
      t
    );
  const hasAudience =
    /(for (local|small|busy|solo|independent|new|growing|service|trade|clinic|salon|agency|coach|creator|restaurant|shop|startup|saas|ecommerce|seller))/i.test(
      text
    );
  return hasNumber || (hasConcreteNouns && hasAudience);
}

function detectBuildTypeFromText(messages: any[]): BuildType | null {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const t = normalizeWhitespace(lastUser?.content).toLowerCase();

  // supports: "TYPE: store" or "type: application"
  const m = t.match(/(^|\n)\s*type\s*:\s*(website|landing_page|landing page|application|app|document|docs|store|shop|other)\s*(\n|$)/i);
  if (m?.[2]) {
    const raw = m[2].toLowerCase();
    if (raw === "landing page") return "landing_page";
    if (raw === "app") return "application";
    if (raw === "docs") return "document";
    if (raw === "shop") return "store";
    return raw as BuildType;
  }

  // light inference
  if (/(store|shop|checkout|cart|products|sku|inventory|shipping)/i.test(t)) return "store";
  if (/(application|dashboard|login|roles|admin|workflow|crud|portal)/i.test(t)) return "application";
  if (/(document|proposal|contract|policy|terms|agreement|handbook|guide)/i.test(t)) return "document";
  if (/(landing page|single page|one page|lead capture|waitlist|signup)/i.test(t)) return "landing_page";
  if (t.length > 0) return "website";

  return null;
}

function validateBuildResponse(parsed: any): { ok: boolean; reason?: string } {
  if (!parsed || (parsed.type !== "chat" && parsed.type !== "build")) {
    return { ok: false, reason: "Missing/invalid type" };
  }

  if (parsed.type === "chat") {
    const msg = normalizeWhitespace(parsed.message);
    if (msg.length < 20) return { ok: false, reason: "Chat message too short" };
    return { ok: true };
  }

  const snap = parsed.snapshot;
  if (!snap) return { ok: false, reason: "Missing snapshot" };
  if (!isNonEmptyString(snap.appName)) return { ok: false, reason: "Missing appName" };
  if (!Array.isArray(snap.pages) || snap.pages.length < 1) return { ok: false, reason: "Missing pages" };

  const page0 = snap.pages[0];
  if (!page0 || !Array.isArray(page0.blocks)) return { ok: false, reason: "Missing blocks" };

  const blocks = page0.blocks;
  const required = ["hero", "features", "stats", "testimonials", "pricing", "faq", "content", "cta"];
  const types = new Set(blocks.map((b: any) => b?.type));
  for (const r of required) if (!types.has(r)) return { ok: false, reason: `Missing block: ${r}` };

  const hero = getBlock(blocks, "hero");
  const headline = normalizeWhitespace(hero?.headline);
  const subhead = normalizeWhitespace(hero?.subhead);

  if (headline.length < 18) return { ok: false, reason: "Hero headline too short" };
  if (headline.split(" ").length < 6 || headline.split(" ").length > 18) return { ok: false, reason: "Hero headline word-count off" };
  if (subhead.length < 120) return { ok: false, reason: "Hero subhead too thin" };
  if (subhead.length > 260) return { ok: false, reason: "Hero subhead too long" };

  const heroCombined = `${headline} ${subhead}`;
  if (containsAny(heroCombined, GENERIC_BAD)) return { ok: false, reason: "Hero too buzzwordy" };
  if (containsAny(heroCombined, TOO_VAGUE)) return { ok: false, reason: "Hero too vague" };
  if (!hasSpecificitySignals(heroCombined)) return { ok: false, reason: "Hero lacks specificity signals" };

  const features = getBlock(blocks, "features");
  const featureItems = arr(features?.items);
  if (featureItems.length !== 6) return { ok: false, reason: "Features must be exactly 6" };
  for (const it of featureItems) {
    const t = normalizeWhitespace(it?.title);
    const d = normalizeWhitespace(it?.description);
    if (t.length < 8) return { ok: false, reason: "Feature title too short" };
    if (d.length < 60) return { ok: false, reason: "Feature description too thin" };
    if (!/so you can/i.test(d)) return { ok: false, reason: "Feature description missing 'so you can' outcome" };
    if (containsAny(`${t} ${d}`, GENERIC_BAD)) return { ok: false, reason: "Features too buzzwordy" };
  }

  const stats = getBlock(blocks, "stats");
  const statsItems = arr(stats?.stats);
  if (statsItems.length !== 4) return { ok: false, reason: "Stats must be exactly 4" };

  const testimonials = getBlock(blocks, "testimonials");
  const testimonialItems = arr(testimonials?.items);
  if (testimonialItems.length !== 3) return { ok: false, reason: "Testimonials must be exactly 3" };
  for (const t of testimonialItems) {
    const quote = normalizeWhitespace(t?.quote);
    const name = normalizeWhitespace(t?.name);
    const role = normalizeWhitespace(t?.role);
    if (quote.length < 70) return { ok: false, reason: "Testimonial quote too thin" };
    if (!name) return { ok: false, reason: "Testimonial missing name" };
    if (!role) return { ok: false, reason: "Testimonial missing role" };
    if (!/\d/.test(quote) && !/(week|weeks|days|hours|export|draft|template|booked|leads|orders|clients|checkout|catalog|portal)/i.test(quote)) {
      return { ok: false, reason: "Testimonial lacks concrete detail" };
    }
  }

  const pricing = getBlock(blocks, "pricing");
  const plans = arr(pricing?.plans);
  if (plans.length !== 3) return { ok: false, reason: "Pricing must be exactly 3 plans" };
  if (plans.filter((p: any) => !!p?.popular).length !== 1) return { ok: false, reason: "Exactly one plan must be popular" };
  for (const p of plans) {
    const feats = arr(p?.features);
    if (feats.length !== 6) return { ok: false, reason: "Each plan must have exactly 6 features" };
  }

  const faq = getBlock(blocks, "faq");
  const faqItems = arr(faq?.items);
  if (faqItems.length !== 7) return { ok: false, reason: "FAQ must be exactly 7" };

  const content = getBlock(blocks, "content");
  const body = safeString(content?.body || content?.content);
  if (!body || body.length < 220) return { ok: false, reason: "Content body too short" };
  if (!/<p[\s>]/i.test(body)) return { ok: false, reason: "Content body must include <p>" };
  if (!/<ul[\s>]/i.test(body) || !/<li[\s>]/i.test(body)) return { ok: false, reason: "Content body must include a bullet list" };

  const cta = getBlock(blocks, "cta");
  if (normalizeWhitespace(cta?.headline).length < 18) return { ok: false, reason: "CTA headline too short" };
  if (normalizeWhitespace(cta?.subhead).length < 80) return { ok: false, reason: "CTA subhead too thin" };
  if (normalizeWhitespace(cta?.buttonLabel).length < 8) return { ok: false, reason: "CTA button label too short" };

  return { ok: true };
}

function buildCreativeBrief(messages: any[], buildType: BuildType) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const userText = safeString(lastUser?.content).slice(0, 2500);

  const typeGuidance: Record<BuildType, string> = {
    landing_page:
      "Landing page: focus on ONE goal (lead capture, waitlist, booking, demo request). Copy should be tight and high-converting.",
    website:
      "Website: full multi-section marketing site with trust, details, and clear next steps.",
    application:
      "Application: position around workflows, roles, dashboard outcomes, and operational clarity. Use language like 'portal', 'workflow', 'handoff', 'audit trail' when relevant.",
    document:
      "Document: position around professional templates, PDFs/exports, clauses/sections (no legal claims). Emphasize clarity, structure, and ready-to-send deliverables.",
    store:
      "Store: position around catalog, product pages, cart/checkout, trust (shipping/returns), and conversion. Use ecommerce language and buyer confidence.",
    other:
      "Other: infer responsibly, still produce a premium, specific build.",
  };

  return `
CREATIVE BRIEF
- Build type: ${buildType}
- Type guidance: ${typeGuidance[buildType]}
- User request (may include 'TYPE:' tag): ${userText || "Not specified — infer responsibly and ask 1–2 questions only if absolutely necessary."}
- Primary outcome: pick ONE (leads, bookings, sales, signups, downloads) appropriate for the build type.
- Voice: premium, calm confidence, human, direct — not rushed.
- Constraints:
  * No fake awards, no fake famous clients, no guaranteed results.
  * Stats must be framed responsibly ("typical teams see…", "common outcomes…").
  * Make deliverables explicit (pages/sections, export/ownership, what happens after generating).
`;
}

function buildSystemPrompt(brief: string) {
  return `
You are Buildlio — a world-class AI website architect AND elite conversion copywriter.
Your output reads like a real agency deliverable: specific, persuasive, premium, modern, and grounded.

ABSOLUTE OUTPUT RULES:
- Output ONLY a SINGLE valid JSON object.
- No markdown, no backticks, no commentary.
- Must be strict JSON (double quotes only).

RESPONSE TYPES:
1) If you truly need more details (rare):
{ "type": "chat", "message": "Warm, helpful reply + 1–2 laser-focused questions." }

2) Otherwise build immediately:
{
  "type": "build",
  "message": "A premium snapshot is ready.",
  "snapshot": {
    "appName": "Brand Name",
    "tagline": "Short, punchy, specific tagline",
    "meta": { "buildType": "website", "intent": "one sentence intent" },
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
          { "type": "pricing", "plans": [{"name":"...","price":"...","interval":"mo","popular":true,"features":["..."],"cta":"..."}] },
          { "type": "faq", "items": [{"q":"...","a":"..."}] },
          { "type": "content", "title":"...", "body":"<p>...</p>...<ul><li>...</li></ul>" },
          { "type": "cta", "headline":"...", "subhead":"...", "buttonLabel":"..." }
        ]
      }
    ]
  }
}

NON-NEGOTIABLE STRUCTURE:
- The INDEX page MUST contain these blocks exactly once each:
  hero, features, stats, testimonials, pricing, faq, content, cta
- Exact counts:
  * features.items: EXACTLY 6
  * stats.stats: EXACTLY 4
  * testimonials.items: EXACTLY 3
  * pricing.plans: EXACTLY 3 (EXACTLY ONE popular=true)
  * each pricing plan features: EXACTLY 6 bullets
  * faq.items: EXACTLY 7

BUILD-TYPE BEHAVIOR:
- If meta.buildType is "landing_page": keep nav minimal; pricing can be framed as “Plans for ongoing optimization” (still 3 plans).
- If "store": nav should include Store, Products, Shipping, Returns, Contact (still keep 5 items total — adapt names).
- If "application": nav should include Overview, Features, Security, Pricing, Contact (still 5 items).
- If "document": nav should include Templates, What You Get, Pricing, FAQ, Contact (still 5 items).
- If "other": infer a logical 5-item nav.

COPY “WOW” RULES:
- No buzzword soup. Avoid: innovative, cutting-edge, next-level, revolutionize, game-changer, best-in-class, synergy.
- Be concrete: audience, outcome, deliverables, timeline, ownership/export.
- Make the copy feel personal and confident, not rushed.
- Never fabricate major facts. If a detail is unknown, phrase it as an option or typical range.

BLOCK-SPECIFIC RULES:
HERO
- headline: 8–14 words; max 1 comma; outcome + audience + differentiator.
- subhead: 140–220 characters; mechanism + trust cue; mention export/ownership once.
- cta.label: low-friction action (“Generate my draft”, “Create my first version”, “Build my homepage”)

FEATURES
- title: 4–7 words, benefit-forward
- each feature.description: 1–2 sentences, includes “so you can …” and a concrete deliverable/mechanism

STATS
- Plausible numbers framed responsibly (typical, common, often). No guarantees.

TESTIMONIALS
- Sound like real small-business humans.
- Each quote includes a concrete detail (number, timeframe, deliverable).

PRICING
- 3 plans with clear positioning:
  * Starter (try it / simple)
  * Pro (most popular)
  * Studio/Business (power users)
- Prices must be realistic and consistently formatted.
- Features must be deliverables (not vague).

FAQ (7)
- Must address: timeline, customization, export/ownership, support, revisions/credits, privacy/security, what you get for each plan.

CONTENT (HTML ONLY)
- Must include:
  * “Who it’s for”
  * “What you get”
  * “How it works (3 steps)”
- Must use <p> and include ONE <ul> list with <li> bullets.

CTA
- Restate transformation + remove friction + reinforce ownership/export.

DECISION RULE:
- If the user message has ANY context, build immediately.
- Only ask questions if user gave no usable context at all.

${brief}
`;
}

function buildPolishInstruction(messages: any[], reason: string, buildType: BuildType) {
  const lastUser = [...(messages || [])].reverse().find((m) => m?.role === "user");
  const ctx = safeString(lastUser?.content).slice(0, 1800);

  return `
Your previous output failed our quality gate.
Failure reason: ${reason}
Build type: ${buildType}

Rebuild from scratch with significantly stronger, more specific premium conversion copy.
Follow the exact counts and block rules.
No buzzwords, no generic fluff, no fake claims.

User context:
${ctx}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const projectId = String(body.projectId || "");
    const messages = body.messages || [];

    // Prefer explicit buildType from UI. Fallback to detection.
    const rawBuildType = normalizeWhitespace(body.buildType).toLowerCase();
    const explicitType: BuildType | null =
      rawBuildType === "landing page" ? "landing_page" :
      rawBuildType === "landing_page" ? "landing_page" :
      rawBuildType === "website" ? "website" :
      rawBuildType === "application" ? "application" :
      rawBuildType === "app" ? "application" :
      rawBuildType === "document" ? "document" :
      rawBuildType === "docs" ? "document" :
      rawBuildType === "store" ? "store" :
      rawBuildType === "shop" ? "store" :
      rawBuildType === "other" ? "other" :
      null;

    const detected = detectBuildTypeFromText(messages);
    const buildType: BuildType = explicitType || detected || "website";

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

    const brief = buildCreativeBrief(messages, buildType);
    const systemPrompt = buildSystemPrompt(brief);

    async function runClaude(callMessages: any[]) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 11000,
        temperature: 0.64,
        system: systemPrompt,
        messages: callMessages,
      });

      let rawOutput = "{}";
      const textBlocks = (aiResponse as any).content?.filter((b: any) => b.type === "text") || [];
      if (textBlocks.length > 0) rawOutput = textBlocks.map((b: any) => b.text).join("\n");

      const extracted = extractJson(rawOutput);

      let parsed: BuildlioResponse;
      try {
        parsed = JSON.parse(extracted);
      } catch (e) {
        console.error("JSON Parse Error:", extracted);
        throw new Error("AI returned malformed JSON. Please try again.");
      }

      // Ensure meta.buildType is present on build (helps UI logic later)
      if ((parsed as any)?.type === "build" && (parsed as any)?.snapshot) {
        (parsed as any).snapshot.meta = (parsed as any).snapshot.meta || {};
        (parsed as any).snapshot.meta.buildType = (parsed as any).snapshot.meta.buildType || buildType;
        (parsed as any).snapshot.meta.intent = (parsed as any).snapshot.meta.intent || `Buildlio ${buildType} generation`;
      }

      return parsed;
    }

    // Attempt 1
    let parsedResponse = await runClaude(messages);
    let validation = validateBuildResponse(parsedResponse);

    // Attempt 2 (polish pass) if build fails quality/structure
    if (!validation.ok) {
      const polish = buildPolishInstruction(messages, validation.reason || "Unknown", buildType);
      const retryMessages = [...messages, { role: "user", content: polish }];
      parsedResponse = await runClaude(retryMessages);
      validation = validateBuildResponse(parsedResponse);
    }

    // Still failing: minimal question
    if (!validation.ok) {
      const fallback: BuildlioResponse = {
        type: "chat",
        message:
          "Quick detail so I can make this truly specific: what are you creating (website, landing page, store, application, or document) and who is it for? One sentence is perfect. You can start with: TYPE: store",
      };
      return NextResponse.json({ success: true, data: fallback });
    }

    // Save & charge only on build
    if (parsedResponse.type === "build" && (parsedResponse as any).snapshot) {
      const { error: rpcError } = await supabase.rpc("save_version_and_charge_credit", {
        p_project_id: projectId,
        p_owner_id: authData.user.id,
        p_snapshot: (parsedResponse as any).snapshot,
        p_note: `Professional Build v5.3 (${buildType})`,
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