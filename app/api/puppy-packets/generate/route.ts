// FILE: app/api/puppy-packets/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { Anthropic } from "@anthropic-ai/sdk";

const BodySchema = z.object({
  puppy_id: z.string().uuid(),
  buyer_id: z.string().uuid().optional(),
});

function asText(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

async function makeSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe to ignore if headers already sent in some contexts
          }
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const supabase = await makeSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: puppy, error: pErr } = await supabase
      .from("puppies")
      .select(
        "id, name, sex, color, dob, birth_weight_oz, registry_type, status, price, litter_id, buyer_id, notes"
      )
      .eq("id", body.puppy_id)
      .single();
    if (pErr) throw pErr;

    const buyerId = body.buyer_id || puppy.buyer_id;

    let buyer: any = null;
    if (buyerId) {
      const { data: b, error: bErr } = await supabase
        .from("buyers")
        .select("id, name, email, phone, address1, address2, city, state, zip, notes")
        .eq("id", buyerId)
        .single();
      if (bErr) throw bErr;
      buyer = b;
    }

    const { data: litter, error: lErr } = await supabase
      .from("litters")
      .select("id, litter_name, dob, sire, dam")
      .eq("id", puppy.litter_id)
      .maybeSingle();
    if (lErr) throw lErr;

    const { data: events, error: eErr } = await supabase
      .from("puppy_events")
      .select("event_type, event_date, value, notes")
      .eq("puppy_id", puppy.id)
      .order("event_date", { ascending: true });
    if (eErr) throw eErr;

    // Create or find packet row
    const { data: existingPacket, error: exErr } = await supabase
      .from("puppy_packets")
      .select("id, latest_version_no")
      .eq("puppy_id", puppy.id)
      .maybeSingle();
    if (exErr) throw exErr;

    let packetId = existingPacket?.id as string | undefined;
    let nextVersion = (existingPacket?.latest_version_no || 0) + 1;

    if (!packetId) {
      const { data: created, error: cErr } = await supabase
        .from("puppy_packets")
        .insert({
          owner_id: user.id,
          puppy_id: puppy.id,
          buyer_id: buyerId ?? null,
          status: "draft",
        })
        .select("id, latest_version_no")
        .single();
      if (cErr) throw cErr;

      packetId = created.id;
      nextVersion = 1;
    }

    const prompt = `
You are generating a professional, printable "Southwest Virginia Chihuahua Puppy Packet".
Tone: warm, clear, professional. Layout must be printer-friendly (white background).
Output: return ONLY valid HTML (no markdown), starting with <section> and ending with </section>.
No external images. Use clean headings, short paragraphs, and tables for records.

Include sections in this order:
1) Cover Page (buyer + puppy details)
2) Bill of Sale & Health Guarantee placeholder section (signature lines)
3) Vaccination & Deworming Record (from events)
4) Hypoglycemia Info (short, practical, actionable)
5) First Week Checklist
6) Contact & Support (placeholders)

DATA:
PUPPY:
- Name: ${asText(puppy.name)}
- Sex: ${asText(puppy.sex)}
- Color: ${asText(puppy.color)}
- DOB: ${asText(puppy.dob)}
- Birth Weight (oz): ${asText(puppy.birth_weight_oz)}
- Registry: ${asText(puppy.registry_type)}
- Status: ${asText(puppy.status)}
- Price: ${asText(puppy.price)}
- Notes: ${asText(puppy.notes)}

LITTER:
- Litter Name: ${asText(litter?.litter_name)}
- Litter DOB: ${asText(litter?.dob)}
- Sire: ${asText(litter?.sire)}
- Dam: ${asText(litter?.dam)}

BUYER:
- Name: ${asText(buyer?.name)}
- Email: ${asText(buyer?.email)}
- Phone: ${asText(buyer?.phone)}
- Address: ${[buyer?.address1, buyer?.address2, buyer?.city, buyer?.state, buyer?.zip].filter(Boolean).join(", ")}

EVENTS (chronological):
${(events || [])
  .map((e: any) => `- ${e.event_date} | ${e.event_type} | ${asText(e.value)} | ${asText(e.notes)}`)
  .join("\n")}
`.trim();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const completion = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2500,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    const html = (completion.content?.[0] as any)?.text ?? "";

    if (!html.includes("<section") || !html.includes("</section>")) {
      return NextResponse.json({ error: "AI output not valid HTML." }, { status: 400 });
    }

    const { error: vErr } = await supabase.from("puppy_packet_versions").insert({
      owner_id: user.id,
      packet_id: packetId,
      version_no: nextVersion,
      model: "claude-3-5-sonnet-latest",
      prompt_used: prompt,
      content_html: html,
      content_markdown: null,
    });
    if (vErr) throw vErr;

    const { error: uErr } = await supabase
      .from("puppy_packets")
      .update({ latest_version_no: nextVersion })
      .eq("id", packetId);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, packet_id: packetId, version_no: nextVersion });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to generate packet." }, { status: 400 });
  }
}