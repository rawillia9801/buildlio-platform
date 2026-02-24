    import { NextResponse } from "next/server";

export const runtime = "nodejs"; // safe default for server-side logic

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/architect",
    message: "Architect route is live.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      route: "/api/architect",
      received: body,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}