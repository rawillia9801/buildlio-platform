/* FILE: app/page.tsx
   Buildlio Platform — v2.0: FULL UI RESTORATION + VISUAL RENDERER
*/

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type PageId = "builder" | "pricing" | "faq" | "contact" | "login" | "payment";

export default function Home() {
  const [page, setPage] = useState<PageId>("builder");

  // Supabase Browser Client
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // Auth/session UI state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [whoami, setWhoami] = useState<{ email?: string; id?: string } | null>(null);

  // Builder & History state
  const [projectId, setProjectId] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const nav = useMemo(
    () => [
      { id: "builder" as const, label: "Builder" },
      { id: "pricing" as const, label: "Pricing" },
      { id: "faq" as const, label: "FAQ" },
      { id: "contact" as const, label: "Contact" },
    ],
    []
  );

  // REAL-TIME AUTH LISTENER
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
      if (event === "SIGNED_IN") setPage("builder");
      if (event === "SIGNED_OUT") {
        setWhoami(null);
        setProjectId("");
        setHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // HISTORY LISTENER
  useEffect(() => {
    async function fetchHistory() {
      if (!projectId || !supabase) return;
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_no", { ascending: false });

      if (!error) setHistory(data || []);
      setLoadingHistory(false);
    }
    fetchHistory();
  }, [projectId, supabase, lastResult]);

  function router(next: PageId) { setPage(next); }

  const navActive = (id: PageId) => id === page ? "text-cyan-300 bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-white/5";

  async function signInWithEmailPassword() {
    setAuthError("");
    if (!loginEmail.trim() || !loginPassword) { setAuthError("Enter email + password."); return; }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
      if (error) throw error;
    } catch (e: any) { setAuthError(e?.message || "Login failed."); } 
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    setAuthError("");
    await supabase.auth.signOut();
    router("builder");
  }

  async function ensureProjectId(): Promise<string> {
    if (projectId.trim()) return projectId.trim();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error("You must be logged in to create a project.");

    const newProject = {
      owner_id: user.id,
      name: "Untitled Project",
      slug: `project-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    };

    const { data: created, error: createErr } = await supabase.from("projects").insert(newProject).select("id").single();
    if (createErr) throw createErr;
    
    setProjectId(created.id);
    return created.id as string;
  }

  async function runArchitectBuild() {
    setLastError("");
    setLastResult(null);
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) { setLastError("Type a prompt first."); return; }

    setIsRunning(true);
    try {
      const pid = await ensureProjectId();
      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, prompt: trimmedPrompt }),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error || "Request failed.");
      
      setLastResult(data);
    } catch (e: any) {
      setLastError(e?.message || "Unknown error occurred.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden`}>
      <style jsx global>{`
        :root { --deep: #0b0c15; --panel: #151725; --primary: #6366f1; --accent: #06b6d4; }
        html, body { height: 100%; background: var(--deep); color: #cbd5e1; font-family: var(--font-inter), sans-serif; }
        .glass-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease; }
        .glass-card:hover { border-color: rgba(6, 182, 212, 0.3); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0c15; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden">
        {/* TOP NAVIGATION (Restored) */}
        <nav className="h-16 shrink-0 z-50 border-b border-slate-800/80 bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px]">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button onClick={() => router("builder")} className="flex items-center gap-3 select-none">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                  <span className="text-white text-[12px] font-black">⬡</span>
                </div>
                <span className="font-extrabold text-xl text-white tracking-tight">build<span className="text-cyan-300">lio</span>.site</span>
              </button>
              <div className="hidden md:flex items-center gap-1">
                {nav.map((n) => (
                  <button key={n.id} onClick={() => router(n.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${navActive(n.id)}`}>{n.label}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-black/20">
                <span className={`text-xs ${whoami?.email ? "text-emerald-300" : "text-slate-400"}`}>{whoami?.email ? "Signed in" : "Guest"}</span>
                <span className="text-xs text-slate-300 max-w-[220px] truncate">{whoami?.email || "Not logged in"}</span>
              </div>
              {whoami?.email ? (
                <button onClick={signOut} className="text-sm font-medium text-slate-400 hover:text-white transition">Sign Out</button>
              ) : (
                <button onClick={() => router("login")} className="text-sm font-medium text-slate-400 hover:text-white transition">Log In</button>
              )}
              <button onClick={() => router("pricing")} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-extrabold hover:bg-gray-200 transition">Get Started</button>
            </div>
          </div>
        </nav>

        {/* APP CONTAINER */}
        <div className="flex-1 relative overflow-hidden bg-[#0b0c15]">
          {page === "builder" && (
            <div className="h-full w-full flex flex-row">
              
              {/* LEFT SIDEBAR (Restored) */}
              <section className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-slate-800/80 bg-[#151725] z-10 shadow-2xl">
                <div className="p-4 border-b border-slate-800/80 bg-[#0b0c15]/50 shrink-0">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2"><span className="text-cyan-300">✦</span> Architect AI</h2>
                  <p className="text-xs text-slate-500 mt-1">Describe your vision. I write the code.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="text-xs text-slate-500 font-mono">PROJECT</div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Project ID</label>
                      <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Leave blank to auto-create" className="w-full rounded-lg px-3 py-2 bg-slate-950/40 border border-slate-700/60 text-white focus:border-cyan-400 text-sm font-mono" />
                      <button onClick={async () => { try { await ensureProjectId(); } catch(e:any) { setLastError(e.message); } }} className="w-full px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-white/5 transition text-xs font-semibold">Force Project Link</button>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="text-xs text-slate-500 font-mono">VERSION HISTORY</div>
                    {loadingHistory ? (
                      <div className="text-xs text-slate-500 animate-pulse">Loading logs...</div>
                    ) : history.length === 0 ? (
                      <div className="text-xs text-slate-600 italic">No builds found yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {history.map((v) => (
                          <button key={v.id} onClick={() => setLastResult({ success: true, snapshot: v.snapshot })} className="w-full text-left p-2 rounded-lg bg-slate-950/30 border border-slate-800 hover:border-cyan-500/50 transition group">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-cyan-400">v{v.version_no}</span>
                              <span className="text-[10px] text-slate-500">{new Date(v.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 truncate mt-1 group-hover:text-white">AI Generation</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {lastError && <div className="glass-card rounded-2xl p-4 border border-red-500/20 text-sm text-red-300">{lastError}</div>}
                </div>

                <div className="p-4 border-t border-slate-800/80 bg-[#0b0c15]/90 shrink-0 space-y-3">
                  <textarea className="w-full bg-slate-900/90 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:border-cyan-400 resize-none h-20" placeholder="Type instructions... (e.g. a pet shop)" value={promptText} onChange={(e) => setPromptText(e.target.value)} disabled={isRunning} />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 font-mono">POST /api/claude-test</div>
                    <button className={`px-4 py-2 rounded-xl font-extrabold text-sm flex items-center gap-2 ${isRunning ? "bg-cyan-400/20 text-cyan-200" : "bg-cyan-400 text-[#0b0c15] hover:bg-cyan-300 shadow-lg"}`} onClick={runArchitectBuild} disabled={isRunning}>{isRunning ? "Running…" : "Run Build"} <span>➤</span></button>
                  </div>
                </div>
              </section>

              {/* RIGHT CANVAS (The Visual Renderer merged with the Dark Grid) */}
              <section className="flex-1 bg-black relative flex flex-col">
                <div className="h-12 border-b border-slate-800/80 bg-[#151725] flex items-center justify-between px-4 z-10">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">🔒 preview.buildlio.site</div>
                </div>
                
                <div className="flex-1 overflow-y-auto relative">
                  {!lastResult?.snapshot ? (
                    /* The beautiful dark empty state grid */
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                      <div className="text-center text-slate-500/70">
                        <div className="text-6xl mb-4">⬡</div>
                        <p className="text-sm">Canvas Empty</p>
                      </div>
                    </div>
                  ) : (
                    /* The generated site sitting on top of the canvas */
                    <div className="min-h-full bg-white text-slate-900 animate-in fade-in duration-700 shadow-2xl">
                      {lastResult.snapshot.pages?.[0]?.blocks?.map((block: any, i: number) => (
                        <div key={i} className="border-b border-slate-200 last:border-0">
                          {block.type === 'hero' && (
                            <div className="py-24 px-10 text-center bg-slate-50">
                              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900">{block.headline}</h1>
                              <p className="text-xl text-slate-600 mt-6 max-w-2xl mx-auto">{block.subhead}</p>
                            </div>
                          )}
                          {block.type === 'features' && (
                            <div className="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                              {block.items?.map((item: any, j: number) => (
                                <div key={j} className="p-8 border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition bg-white">
                                  <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {block.type === 'text' && (
                            <div className="max-w-3xl mx-auto py-16 px-10 prose prose-lg prose-slate">
                              {block.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Login and other pages remain intact... */}
          {page === "login" && (
            <div className="h-full w-full flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
              <div className="glass-card w-full max-w-md rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-white text-center mb-8">Welcome Back</h2>
                {authError && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{authError}</div>}
                <div className="space-y-4">
                  <input type="email" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  <input type="password" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  <button onClick={signInWithEmailPassword} className="w-full bg-cyan-400 text-[#0b0c15] font-extrabold py-3 rounded-lg" disabled={authBusy}>{authBusy ? "Signing In…" : "Sign In"}</button>
                  <button onClick={() => setPage("builder")} className="w-full text-xs text-slate-500 hover:text-slate-300 mt-2">← Back to Builder</button>
                </div>
              </div>
            </div>
          )}

          {["pricing", "faq", "contact", "payment"].includes(page) && (
             <div className="h-full w-full flex items-center justify-center text-white text-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                <div><h2 className="text-4xl font-black capitalize mb-4">{page}</h2><button onClick={() => setPage("builder")} className="text-cyan-300 underline font-bold">Return to Builder</button></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}