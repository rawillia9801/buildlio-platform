// FILE: app/api/buildlio/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        text: `[SYSTEM DIAGNOSTIC]: API key missing.\n\nReceived directive: "${body.messages[0].content}"\n\nAdd ANTHROPIC_API_KEY to your environment variables to establish true neural link.`,
      });
    }

    // 2. Call Anthropic (Claude) API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Switched to the universal tag to bypass the 404 error
        model: "claude-3-5-sonnet-latest", 
        max_tokens: body.max_tokens || 1600,
        system: body.system,
        messages: body.messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API Error:", errorData);
      throw new Error("Failed to communicate with the apex intelligence.");
    }

    const data = await response.json();

    // 3. Return the AI's response to your UI
    return NextResponse.json({ text: data.content[0].text });

  } catch (error: any) {
    console.error("Buildlio API Error:", error);
    return NextResponse.json(
      { text: "CRITICAL FAILURE: Neural link disrupted. Check server logs." },
      { status: 500 }
    );
  }
}