// FILE: app/api/breeder-agent/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { z } from "zod";

const CreateLitter = z.object({
  type: z.literal("create_litter"),
  dob: z.string(), // YYYY-MM-DD
  sire: z.string().min(1),
  dam: z.string().min(1),
  litter_name: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const CreatePuppy = z.object({
  type: z.literal("create_puppy"),
  name: z.string().min(1).optional(),
  sex: z.enum(["male", "female"]),
  color: z.string().optional(),
  dob: z.string().optional(),
  birth_weight_oz: z.number().optional(),
  registry_type: z.string().optional(),
  status: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
});

const AddEvent = z.object({
  type: z.literal("add_event"),
  puppy_id: z.string().uuid(),
  event_type: z.string().min(1),
  event_date: z.string(), // YYYY-MM-DD
  value: z.string().optional(),
  notes: z.string().optional(),
});

const ActionSchema = z.discriminatedUnion("type", [CreateLitter, CreatePuppy, AddEvent]);

const BodySchema = z.object({
  actions: z.array(ActionSchema).min(1),
});

async function makeSupabaseSSR() {
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
          } catch {}
        },
      },
    }
  );
}

function makeSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const h = await headers();
    const devBypass = h.get("x-dev-bypass") === "1";
    const isProd = process.env.NODE_ENV === "production";

    // Choose client + owner id
    let db:
      | ReturnType<typeof makeSupabaseService>
      | Awaited<ReturnType<typeof makeSupabaseSSR>>;
    let ownerId: string | null = null;

    if (devBypass && !isProd) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json(
          { error: "SUPABASE_SERVICE_ROLE_KEY not set in .env.local" },
          { status: 400 }
        );
      }
      ownerId = process.env.DEV_OWNER_ID ?? null;
      if (!ownerId) {
        return NextResponse.json(
          { error: "DEV_OWNER_ID not set in .env.local" },
          { status: 400 }
        );
      }
      db = makeSupabaseService(); // bypasses RLS (server-only)
    } else {
      db = await makeSupabaseSSR();
      const { data: userData, error: uErr } = await db.auth.getUser();
      if (uErr) throw uErr;
      ownerId = userData?.user?.id ?? null;
      if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const litterAction = body.actions.find((a) => a.type === "create_litter") as
      | z.infer<typeof CreateLitter>
      | undefined;

    let litterId: string | null = null;
    let litterDob: string | null = null;

    if (litterAction) {
      const { dob, sire, dam, litter_name, notes } = litterAction;

      const { data: created, error: lErr } = await db
        .from("litters")
        .insert({
          owner_id: ownerId,
          dob,
          sire,
          dam,
          litter_name: litter_name ?? `${sire} x ${dam} ${dob}`,
          notes: notes ?? null,
        })
        .select("id, dob")
        .single();

      if (lErr) throw lErr;

      litterId = created.id;
      litterDob = created.dob;
    }

    const results: any[] = [];

    for (const action of body.actions) {
      if (action.type === "create_litter") {
        results.push({ type: "create_litter", ok: true, litter_id: litterId });
        continue;
      }

      if (action.type === "create_puppy") {
        const dob = action.dob ?? litterDob ?? null;

        const { data: createdPup, error: pErr } = await db
          .from("puppies")
          .insert({
            owner_id: ownerId,
            litter_id: litterId,
            name: action.name ?? null,
            sex: action.sex,
            color: action.color ?? null,
            dob,
            birth_weight_oz: action.birth_weight_oz ?? null,
            registry_type: action.registry_type ?? null,
            status: action.status ?? "available",
            price: action.price ?? 0,
            notes: action.notes ?? null,
          })
          .select("id")
          .single();

        if (pErr) throw pErr;

        if (action.birth_weight_oz !== undefined && dob) {
          const { error: eErr } = await db.from("puppy_events").insert({
            owner_id: ownerId,
            puppy_id: createdPup.id,
            event_type: "weight",
            event_date: dob,
            value: `${action.birth_weight_oz} oz`,
            notes: "Birth weight",
          });
          if (eErr) throw eErr;
        }

        results.push({ type: "create_puppy", ok: true, puppy_id: createdPup.id });
        continue;
      }

      if (action.type === "add_event") {
        const { error: eErr } = await db.from("puppy_events").insert({
          owner_id: ownerId,
          puppy_id: action.puppy_id,
          event_type: action.event_type,
          event_date: action.event_date,
          value: action.value ?? null,
          notes: action.notes ?? null,
        });
        if (eErr) throw eErr;

        results.push({ type: "add_event", ok: true });
        continue;
      }
    }

    return NextResponse.json({ ok: true, litter_id: litterId, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}