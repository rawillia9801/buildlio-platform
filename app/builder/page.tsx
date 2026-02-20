"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getURL() {
  // Works on Vercel + local
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default function BuilderPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createProjectWithPages() {
    setLoading(true);
    setErr(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1) Ensure logged in
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = authData?.user;
      if (!user) {
        setErr("You must be signed in to create a project.");
        setLoading(false);
        return;
      }

      // 2) Create project
      const slug = site-${Math.random().toString(36).slice(2, 8)};

      const { data: project, error: projectErr } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: "New Site",
          slug,
          published: false,
        })
        .select("*")
        .single();

      if (projectErr) throw projectErr;
      if (!project?.id) throw new Error("Project insert returned no id.");

      // 3) Insert default pages
      const pages = [
        {
          project_id: project.id,
          slug: "home",
          title: "Home",
          nav_order: 1,
          content_html:
            "<section><h1>Welcome</h1><p>Your new site starts here.</p></section>",
        },
        {
          project_id: project.id,
          slug: "about",
          title: "About",
          nav_order: 2,
          content_html:
            "<section><h1>About</h1><p>Tell your story in a clean, professional way.</p></section>",
        },
        {
          project_id: project.id,
          slug: "services",
          title: "Services",
          nav_order: 3,
          content_html:
            "<section><h1>Services</h1><p>List what you offer with clarity and confidence.</p></section>",
        },
        {
          project_id: project.id,
          slug: "contact",
          title: "Contact",
          nav_order: 4,
          content_html:
            "<section><h1>Contact</h1><p>Add your contact details and a simple form later.</p></section>",
        },
      ];

      const { error: pagesErr } = await supabase.from("pages").insert(pages);
      if (pagesErr) throw pagesErr;

      // 4) Redirect
      window.location.href = /builder/${project.id};
    } catch (e: any) {
      setErr(e?.message || "Failed to create project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold">Buildlio Builder</h1>
        <p className="text-zinc-400 mt-2">
          Create a new site project, generate starter pages, and open the editor.
        </p>

        <div className="mt-8">
          <button
            onClick={createProjectWithPages}
            disabled={loading}
            className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-black hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create New Site"}
          </button>

          {err && <p className="mt-4 text-red-300">{err}</p>}
        </div>

        <div className="mt-10 text-sm text-zinc-500">
          Next: we’ll make the editor UI actually edit each page’s content, and
          wire preview/publish properly.
        </div>
      </div>
    </main>
  );
}