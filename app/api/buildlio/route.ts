import { NextResponse } from "next/server";

export const runtime = "nodejs"; // keep it simple + compatible

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY on server." },
        { status: 500 }
      );
    }

    const payload = {
      model: body.model ?? "claude-sonnet-4-20250514",
      max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 1000,
      system: String(body.system ?? ""),
      messages: (Array.isArray(body.messages) ? body.messages : []) as AnthropicMessage[],
      stream: false,
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Required by Anthropic
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: r.status }
      );
    }

    const text: string =
      data?.content?.[0]?.text ??
      "Neural link established. Processing...";

    return NextResponse.json({ text }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error in /api/buildlio." },
      { status: 500 }
    );
  }
}