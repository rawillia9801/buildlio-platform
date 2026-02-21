// app/api/build/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// V1: "build" is just a stub you can replace with your AI generator.
async function runBuild(prompt: string) {
  // Replace later with your actual model call or internal generator.
  // Keep it deterministic and return JSON you store into project_versions.snapshot.
  return {
    files: [
      { path: "index.html", content: `<!doctype html><html><body><h1>${prompt}</h1></body></html>` },
    ],
    meta: { generatedAt: new Date().toISOString() },
  };
}

export async function POST(req: Request) {
  try {
    const { projectId, prompt } = await req.json();
const cost = 1; // ALWAYS 1 credit on SUCCESS

    if (!projectId || !prompt) {
      return NextResponse.json({ error: "Missing projectId or prompt" }, { status: 400 });
    }

    // Authenticated server-side Supabase client (no service role key).
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Next.js route handlers require setting cookies like this:
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1) Pre-build snapshot (pull latest known snapshot for safety)
    // If you store canonical "current snapshot" elsewhere, use that.
    // For V1, just snapshot the prompt + "pre" marker.
    const preSnapshot = { kind: "pre_build", prompt, ts: new Date().toISOString() };

    const { data: preVer, error: preErr } = await supabase.rpc("create_project_version", {
      p_project_id: projectId,
      p_snapshot: preSnapshot,
      p_note: "Pre-build snapshot",
    });

    if (preErr) {
      return NextResponse.json({ error: `Pre-snapshot failed: ${preErr.message}` }, { status: 400 });
    }

    // 2) Run build
    let buildResult: any;
    try {
      buildResult = await runBuild(prompt);
    } catch (e: any) {
      // 3a) Build failed -> log but do NOT charge
      await supabase.rpc("record_build_failure", {
        p_project_id: projectId,
        p_metadata: { reason: "generator_exception", message: String(e?.message || e), pre_version_id: preVer },
      });

      return NextResponse.json(
        { error: "Build failed", details: String(e?.message || e), preVersionId: preVer },
        { status: 500 }
      );
    }

    // 3b) Post-build snapshot
    const postSnapshot = { kind: "post_build", prompt, result: buildResult, ts: new Date().toISOString() };

    const { data: postVer, error: postErr } = await supabase.rpc("create_project_version", {
      p_project_id: projectId,
      p_snapshot: postSnapshot,
      p_note: "Build success snapshot",
    });

    if (postErr) {
      // If snapshot fails, do not charge. Log failure.
      await supabase.rpc("record_build_failure", {
        p_project_id: projectId,
        p_metadata: { reason: "post_snapshot_failed", message: postErr.message, pre_version_id: preVer },
      });

      return NextResponse.json(
        { error: "Build succeeded but saving snapshot failed", details: postErr.message, preVersionId: preVer },
        { status: 500 }
      );
    }

    // 4) Charge credits ONLY on success
    const { data: chargeRowId, error: chargeErr } = await supabase.rpc("record_build_success", {
      p_project_id: projectId,
      p_cost: cost,
      p_metadata: { prompt, post_version_id: postVer },
    });

    if (chargeErr) {
      // Build already done; you can decide whether to keep it.
      // V1: keep build, but report billing issue.
      return NextResponse.json(
        { warning: "Build saved but credit charge failed", details: chargeErr.message, postVersionId: postVer },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      preVersionId: preVer,
      postVersionId: postVer,
      chargedLedgerId: chargeRowId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message || e) }, { status: 500 });
  }
}