// app/api/walmart/disputes/upsert/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const Body = z.object({
  item_event_id: z.string().uuid(),

  status: z.enum(["NOT_DISPUTED", "SUBMITTED", "WON", "LOST", "PARTIAL"]).optional(),
  expected_recovery_amount: z.number().nullable().optional(),
  approved_recovery_amount: z.number().nullable().optional(),

  notes: z.string().nullable().optional(),

  returned_back_to_walmart: z.boolean().optional(),
  return_back_date: z.string().nullable().optional(),
  return_back_shipping_cost: z.number().nullable().optional(),
  walmart_refund_received_amount: z.number().nullable().optional(),
  refund_received_date: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  // upsert by (owner_id + item_event_id)
  const { data, error } = await supabase
    .from("walmart_return_disputes")
    .upsert(
      {
        owner_id: user.id,
        item_event_id: body.item_event_id,
        status: body.status ?? undefined,
        expected_recovery_amount: body.expected_recovery_amount ?? undefined,
        approved_recovery_amount: body.approved_recovery_amount ?? undefined,
        notes: body.notes ?? undefined,

        returned_back_to_walmart: body.returned_back_to_walmart ?? undefined,
        return_back_date: body.return_back_date ?? undefined,
        return_back_shipping_cost: body.return_back_shipping_cost ?? undefined,
        walmart_refund_received_amount: body.walmart_refund_received_amount ?? undefined,
        refund_received_date: body.refund_received_date ?? undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,item_event_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, dispute: data });
}