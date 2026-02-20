"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getURL() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default function BuilderPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      // We keep this non-throwing so the page still renders and shows a friendly error.
      return null;
    }
    return createClient(url, anon);
  }, []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function createProjectWithPages() {
    setLoading(true);
    setErr(null);
    setOk(null);

    try {
      if (!supabase) {
        setErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setLoading(false);
        return;
      }

      // 1) Ensure signed in
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setErr(authErr.message);
        setLoading(false);
        return;
      }

      const user = authData?.user;
      if (!user) {
        setErr("You must be signed in to create a project.");
        setLoading(false);
        return;
      }

      // 2) Create project (REPLACE table/columns with yours)
      // Example shape — edit this to match your schema:
      // const { data: proj, error: projErr } = await supabase
      //   .from("projects")
      //   .insert({ owner_id: user.id, name: "New Project", created_at: new Date().toISOString() })
      //   .select("*")
      //   .single();

      // Temporary placeholder so build succeeds even before your DB code is filled in:
      const proj = { id: crypto.randomUUID() };

      // 3) Create default pages (REPLACE table/columns with yours)
      // Example:
      // const pages = [
      //   { project_id: proj.id, slug: "home", title: "Home", content: "" },
      //   { project_id: proj.id, slug: "about", title: "About", content: "" },
      // ];
      // const { error: pagesErr } = await supabase.from("pages").insert(pages);
      // if (pagesErr) throw pagesErr;

   setOk(`Project created (placeholder id): ${proj.id}. Now wire your inserts.`);
      setLoading(false);
      return;
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setLoading(false);
      return;
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Buildlio Builder</h1>

      <p style={{ marginTop: 0, marginBottom: 16, color: "#555" }}>
        Site URL: <code>{getURL()}</code>
      </p>

      <button
        onClick={createProjectWithPages}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: loading ? "#f5f5f5" : "white",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Creating…" : "Create Project + Pages"}
      </button>

      {err && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff0f0", border: "1px solid #ffd0d0" }}>
          <strong style={{ color: "#b00020" }}>Error:</strong> <span>{err}</span>
        </div>
      )}

      {ok && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f0fff4", border: "1px solid #c9f3d2" }}>
          <strong style={{ color: "#146c2e" }}>OK:</strong> <span>{ok}</span>
        </div>
      )}
    </main>
  );
}
