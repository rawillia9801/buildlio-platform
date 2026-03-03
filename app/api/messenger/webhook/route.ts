// app/api/messenger/webhook/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || "chihuahua_secure_2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  // Keep this minimal so it always builds.
  // You can expand handling logic later.
  const body = await req.json().catch(() => null);

  // TODO: verify signature (X-Hub-Signature-256) if you want secure verification.

  return NextResponse.json({ ok: true, received: body }, { status: 200 });
}