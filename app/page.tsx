/* FILE: app/page.tsx — Buildlio v1.8 (Complete Restoration + Visual Preview) */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type PageId = "builder" | "pricing" | "faq" | "contact" | "login" | "payment";

export default function Home() {
  const [page, setPage] = useState<PageId>("builder");

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [whoami, setWhoami] = useState<{ email?: string; id?: string } | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  // Auth Listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
      if (event === "SIGNED_IN") setPage("builder");
      if (event === "SIGNED_OUT") { setWhoami(null); setProjectId(""); setHistory([]); }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // History Listener
  useEffect(() => {
    async function fetchHistory() {
      if (!projectId || !supabase || !whoami) return;
      setLoadingHistory(true);
      const { data, error } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
      if (!error) setHistory(data || []);
      setLoadingHistory(false);
    }
    fetchHistory();
  }, [projectId, supabase, whoami, lastResult]);

  async function signInWithEmailPassword() {
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  }

  async function ensureProjectId(): Promise<string> {
    if (projectId.trim()) return projectId.trim();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) throw new Error("Log in first.");
    const { data: created, error } = await supabase.from("projects").insert({ owner_id: userRes.user.id, name: "New Project", slug: `p-${Date.now()}` }).select("id").single();
    if (error) throw error;
    setProjectId(created.id);
    return created.id;
  }

  async function runArchitectBuild() {
    setLastError(""); setLastResult(null); setIsRunning(true);
    try {
      const pid = await ensureProjectId();
      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, prompt: promptText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error || "Build failed.");
      setLastResult(data);
    } catch (e: any) { setLastError(e?.message); } finally { setIsRunning(false); }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden bg-[#0b0c15] text-[#cbd5e1]`}>
      <div className="h-screen flex flex-col">
        {/* TOP NAV */}
        <nav className="h-16 border-b border-slate-800 bg-[#151725]/80 backdrop-blur-md flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-8">
            <button onClick={() => setPage("builder")} className="font-black text-xl text-white tracking-tighter">buildlio<span className="text-cyan-400">.site</span></button>
            <div className="hidden md:flex gap-1">
              {["builder", "pricing", "faq", "contact"].map((id) => (
                <button key={id} onClick={() => setPage(id as PageId)} className={`px-4 py-2 rounded-lg text-sm transition capitalize ${page === id ? "text-cyan-300 bg-cyan-500/10" : "text-slate-400 hover:text-white"}`}>{id}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:block">{whoami?.email || "Guest"}</span>
            {whoami ? <button onClick={() => supabase.auth.signOut()} className="text-sm">Sign Out</button> : <button onClick={() => setPage("login")} className="text-sm">Log In</button>}
            <button onClick={() => setPage("pricing")} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold">Get Started</button>
          </div>
        </nav>

        <div className="flex-1 relative overflow-hidden">
          {page === "builder" && (
            <div className="h-full flex">
              <aside className="w-[400px] border-r border-slate-800 bg-[#151725] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div className="glass-card p-4 rounded-xl space-y-2 border border-white/5 bg-white/5">
                    <p className="text-[10px] font-bold text-slate-500">PROJECT ID</p>
                    <input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded p-2 text-xs" />
                  </div>
                  <div className="glass-card p-4 rounded-xl space-y-3 border border-white/5 bg-white/5">
                    <p className="text-[10px] font-bold text-slate-500">VERSION HISTORY</p>
                    {history.map(v => (
                      <button key={v.id} onClick={() => setLastResult({success: true, snapshot: v.snapshot})} className="w-full text-left p-2 border border-slate-800 rounded text-[10px] hover:border-cyan-500 transition">
                        v{v.version_no} — {new Date(v.created_at).toLocaleTimeString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-black/20 border-t border-slate-800 space-y-3">
                  <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm h-24" placeholder="Describe your site..." />
                  <button onClick={runArchitectBuild} disabled={isRunning} className="w-full bg-cyan-400 text-black font-bold py-3 rounded-xl">
                    {isRunning ? "Architecting..." : "Run Build"}
                  </button>
                  {lastError && <p className="text-[10px] text-red-400">{lastError}</p>}
                </div>
              </aside>
              <main className="flex-1 bg-slate-950 flex flex-col">
                <div className="h-10 border-b border-slate-800 bg-slate-900 flex items-center px-4 text-[10px] text-slate-500 font-mono italic">HTTPS://PREVIEW.BUILDLIO.SITE</div>
                <div className="flex-1 bg-white overflow-y-auto">
                   {!lastResult?.snapshot ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">Canvas Empty — Run a build to see your site</div> : (
                     <div className="text-slate-900 animate-in fade-in duration-500">
                        {lastResult.snapshot.pages?.[0]?.blocks?.map((b: any, i: number) => (
                          <div key={i}>
                            {b.type === 'hero' && <div className="py-24 px-10 text-center bg-slate-50"><h1 className="text-5xl font-black">{b.headline}</h1><p className="text-xl text-slate-600 mt-4">{b.subhead}</p></div>}
                            {b.type === 'features' && <div className="py-20 px-10 grid grid-cols-3 gap-8">{b.items.map((it:any, j:number) => <div key={j} className="p-6 border rounded-2xl shadow-sm"><h3 className="font-bold text-lg">{it.title}</h3><p className="text-slate-500 text-sm">{it.description}</p></div>)}</div>}
                            {b.type === 'text' && <div className="max-w-3xl mx-auto py-12 px-10 prose">{b.content}</div>}
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </main>
            </div>
          )}

          {page === "login" && (
            <div className="h-full flex items-center justify-center"><div className="w-96 bg-[#151725] p-8 rounded-2xl border border-cyan-400/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
              {authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}
              <input type="email" placeholder="Email" className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 mb-4" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 mb-6" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={signInWithEmailPassword} className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg">{authBusy ? "Verifying..." : "Sign In"}</button>
            </div></div>
          )}

          {["pricing", "faq", "contact", "payment"].includes(page) && (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
              <h1 className="text-6xl font-black text-white mb-4 capitalize">{page}</h1>
              <p className="text-slate-400 text-xl mb-10 max-w-2xl">This section is now live and waiting for your content updates.</p>
              <button onClick={() => setPage("builder")} className="px-8 py-3 bg-white text-black font-bold rounded-xl">Back to Builder</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}