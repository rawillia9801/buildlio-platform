// app/api/messenger/webhook/route.ts
import { NextResponse } from "next/server";

const VERIFY_TOKEN =chihuahua_secure_2026

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const body = await req.json();

  console.log("Messenger event:", JSON.stringify(body, null, 2));

  return NextResponse.json({ status: "received" });
}