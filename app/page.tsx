/* FILE: app/page.tsx
   Buildlio Platform — v3.0: FULL-STACK ARCHITECT + TERMINAL
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type PageId = "builder" | "pricing" | "faq" | "contact" | "login";
type ViewTab = "preview" | "code" | "database";

export default function Home() {
  const [page, setPage] = useState<PageId>("builder");
  const [viewTab, setViewTab] = useState<ViewTab>("preview");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [whoami, setWhoami] = useState<{ email?: string; id?: string } | null>(null);

  const [projectId, setProjectId] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Terminal Status State
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setWhoami(data?.user ? { email: data.user.email ?? undefined, id: data.user.id } : null);
    });
  }, [supabase]);

  useEffect(() => {
    async function fetchHistory() {
      if (!projectId || !supabase) return;
      const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
      if (data) setHistory(data);
    }
    fetchHistory();
  }, [projectId, supabase, lastResult]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [statusLogs]);

  async function ensureProjectId(): Promise<string> {
    if (projectId.trim()) return projectId.trim();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) throw new Error("Please log in first.");
    const { data: created, error } = await supabase.from("projects").insert({ 
      owner_id: userRes.user.id, name: "NextJS App", slug: `app-${Date.now()}` 
    }).select("id").single();
    if (error) throw error;
    setProjectId(created.id);
    return created.id;
  }

  function addLog(msg: string) {
    setStatusLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function runArchitectBuild() {
    if (!promptText.trim()) return addLog("ERROR: Prompt is empty.");
    
    setIsRunning(true);
    setStatusLogs([]);
    setLastResult(null);
    setViewTab("preview");

    try {
      addLog("Initializing Buildlio Neural Engine...");
      const pid = await ensureProjectId();
      addLog(`Linked to Project ID: ${pid.split('-')[0]}...`);
      
      // Fake progress messages to make it feel high-tech
      const messages = [
        "Analyzing requirements for Next.js App Router...",
        "Designing Supabase PostgreSQL schema...",
        "Generating React components and Tailwind UI...",
        "Compiling production-ready assets...",
        "Awaiting final AI handshake..."
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < messages.length) { addLog(messages[i]); i++; }
      }, 3500);

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, prompt: promptText.trim() }),
      });

      clearInterval(interval);
      const textResponse = await res.text();
      let data;
      try { data = JSON.parse(textResponse); } 
      catch { throw new Error(`Server Error: ${textResponse.slice(0, 50)}...`); }

      if (!res.ok || data?.success === false) throw new Error(data?.error || "Build failed.");
      
      addLog("SUCCESS: Application built and deployed to Canvas.");
      setLastResult(data);
    } catch (e: any) {
      addLog(`CRITICAL ERROR: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden bg-[#050505] text-[#cbd5e1]`}>
      <style jsx global>{`
        :root { --deep: #050505; --panel: #0a0a0f; }
        html, body { font-family: var(--font-inter), sans-serif; }
        .glass-panel { background: #0a0a0f; border: 1px solid rgba(255, 255, 255, 0.05); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden">
        {/* TOP NAV */}
        <nav className="h-14 shrink-0 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-6">
            <span className="font-black text-lg text-white tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center text-black text-[10px]">⬡</div>
              buildlio<span className="text-cyan-500">.ai</span>
            </span>
            <div className="hidden md:flex gap-4">
              <button onClick={() => setPage("builder")} className={`text-xs font-bold ${page === 'builder' ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}>WORKSPACE</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">{whoami?.email || "Offline Mode"}</span>
            {whoami ? <button onClick={() => supabase.auth.signOut()} className="text-xs border border-white/10 px-3 py-1 rounded">Logout</button> : <button onClick={() => setPage("login")} className="text-xs border border-white/10 px-3 py-1 rounded">Login</button>}
          </div>
        </nav>

        <div className="flex-1 relative overflow-hidden">
          {page === "builder" && (
            <div className="h-full w-full flex flex-row">
              
              {/* LEFT SIDEBAR: TERMINAL & CONTROLS */}
              <section className="w-[450px] flex flex-col border-r border-white/5 glass-panel z-10 shadow-2xl">
                
                {/* PROMPT INPUT */}
                <div className="p-5 border-b border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">Next.js Architect</h2>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SYSTEM ONLINE</span>
                  </div>
                  <textarea className="w-full bg-[#050505] border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:border-cyan-500 outline-none resize-none h-28 transition-all" placeholder="Describe the full-stack application you want to build..." value={promptText} onChange={(e) => setPromptText(e.target.value)} disabled={isRunning} />
                  <button className={`w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all ${isRunning ? "bg-cyan-900/30 text-cyan-500 border border-cyan-500/30" : "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"}`} onClick={runArchitectBuild} disabled={isRunning}>{isRunning ? "Compiling..." : "Initialize Build"}</button>
                </div>

                {/* LIVE TERMINAL */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#020202]">
                  <div className="px-5 py-2 border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-[#0a0a0f]">Build Terminal</div>
                  <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed space-y-1">
                    {statusLogs.length === 0 ? (
                      <div className="text-slate-600 italic">Waiting for instructions...</div>
                    ) : (
                      statusLogs.map((log, i) => (
                        <div key={i} className={`${log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-emerald-400' : 'text-cyan-300/80'}`}>
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

                {/* PROJECT SETTINGS */}
                <div className="p-5 border-t border-white/5 bg-[#0a0a0f] space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Target Project ID</p>
                  <input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-xs font-mono focus:border-cyan-500 outline-none" placeholder="Auto-generates if empty" />
                </div>
              </section>

              {/* RIGHT CANVAS: TABS & RENDERER */}
              <section className="flex-1 relative flex flex-col bg-[#050505]">
                
                {/* CANVAS TABS */}
                <div className="h-12 border-b border-white/5 bg-[#0a0a0f] flex items-center px-4 gap-2 z-10">
                  <button onClick={() => setViewTab("preview")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewTab === 'preview' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>Visual Preview</button>
                  <button onClick={() => setViewTab("code")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 ${viewTab === 'code' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>Next.js Code <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 rounded">TSX</span></button>
                  <button onClick={() => setViewTab("database")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 ${viewTab === 'database' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>Supabase <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 rounded">SQL</span></button>
                </div>
                
                <div className="flex-1 overflow-y-auto relative">
                  {!lastResult?.snapshot ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
                      <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center mb-4 bg-[#0a0a0f] shadow-2xl">
                        <span className="text-2xl opacity-50">⬡</span>
                      </div>
                      <p className="text-sm font-bold text-slate-400">Canvas Empty</p>
                      <p className="text-xs text-slate-600 mt-2 max-w-xs text-center">Initialize a build to generate your Next.js frontend and Supabase backend.</p>
                    </div>
                  ) : (
                    <div className="h-full bg-white text-slate-900 animate-in fade-in duration-500">
                      
                      {/* VIEW: VISUAL PREVIEW */}
                      {viewTab === "preview" && (
                        <div className="min-h-full">
                          {lastResult.snapshot.pages?.[0]?.blocks?.map((block: any, i: number) => (
                            <div key={i} className="border-b border-slate-100 last:border-0">
                              {block.type === 'hero' && (
                                <div className="py-32 px-10 text-center bg-gradient-to-b from-slate-50 to-white">
                                  <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900">{block.headline}</h1>
                                  <p className="text-xl text-slate-500 mt-6 max-w-2xl mx-auto">{block.subhead}</p>
                                  <button className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform">Get Started</button>
                                </div>
                              )}
                              {block.type === 'features' && (
                                <div className="py-24 px-10 max-w-7xl mx-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    {block.items?.map((item: any, j: number) => (
                                      <div key={j} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl mb-6 flex items-center justify-center text-indigo-500 font-bold">★</div>
                                        <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                                        <p className="text-slate-500 leading-relaxed">{item.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {block.type === 'text' && (
                                <div className="max-w-3xl mx-auto py-20 px-10 prose prose-lg prose-slate">
                                  {block.content}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* VIEW: NEXT.JS CODE */}
                      {viewTab === "code" && (
                        <div className="min-h-full bg-[#0a0a0f] p-8">
                          <div className="max-w-5xl mx-auto space-y-8">
                            {lastResult.snapshot.nextjs?.components?.map((comp: any, i: number) => (
                              <div key={i} className="rounded-xl border border-white/10 overflow-hidden bg-[#050505]">
                                <div className="px-4 py-2 border-b border-white/10 bg-[#0a0a0f] text-xs font-mono text-cyan-400 flex items-center gap-2">📄 {comp.filename}</div>
                                <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto">
                                  <code>{comp.code}</code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VIEW: SUPABASE SQL */}
                      {viewTab === "database" && (
                        <div className="min-h-full bg-[#0a0a0f] p-8">
                          <div className="max-w-5xl mx-auto">
                            <div className="rounded-xl border border-white/10 overflow-hidden bg-[#050505]">
                              <div className="px-4 py-2 border-b border-white/10 bg-[#0a0a0f] text-xs font-mono text-emerald-400 flex items-center gap-2">🗄️ schema.sql</div>
                              <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto">
                                <code>{lastResult.snapshot.database?.schema || "-- No database schema required for this project."}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* LOGIN PAGE */}
          {page === "login" && (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
              <div className="glass-panel w-full max-w-sm rounded-2xl p-8 shadow-2xl border-white/10">
                <h2 className="text-xl font-bold text-white text-center mb-6">System Access</h2>
                <div className="space-y-4">
                  <input type="email" placeholder="Admin Email" className="w-full bg-[#050505] border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:border-cyan-500 outline-none" onChange={(e) => setLoginEmail(e.target.value)} />
                  <input type="password" placeholder="Password" className="w-full bg-[#050505] border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:border-cyan-500 outline-none" onChange={(e) => setLoginPassword(e.target.value)} />
                  <button onClick={async () => { await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword }); setPage("builder"); }} className="w-full bg-cyan-500 text-black font-bold py-3 rounded-lg text-sm">Authenticate</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}