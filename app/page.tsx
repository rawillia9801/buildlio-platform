/* FILE: app/page.tsx
   BUILDLIO.SITE — Core Application (With Working Export)
*/

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type ViewState = "landing" | "auth" | "builder" | "pricing";

export default function BuildlioApp() {
  const [view, setView] = useState<ViewState>("landing");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  const [projectId, setProjectId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [note, setNote] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activePageSlug, setActivePageSlug] = useState("index");
  
  const [creditBalance, setCreditBalance] = useState(10);
  const [systemMessage, setSystemMessage] = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ? { email: data.user.email, id: data.user.id } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (view === "builder" && projectId) fetchHistory();
  }, [projectId, view]);

  async function fetchHistory() {
    const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
    if (data) setHistory(data);
  }

  async function handleAuth() {
    setAuthStatus("Authenticating...");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setAuthStatus(error.message);
    else { setAuthStatus(""); setView("builder"); }
  }

  // EXPORT HTML FUNCTION
  function exportHTML() {
    if (!snapshot) return;
    const currentPage = snapshot.pages?.find((p: any) => p.slug === activePageSlug) || snapshot.pages?.[0];
    if (!currentPage) return;

    let htmlContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${snapshot.appName || currentPage.slug}</title>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-50 text-slate-900 font-sans">\n`;

    currentPage.blocks?.forEach((block: any) => {
      if (block.type === 'hero') {
        htmlContent += `<div class="py-24 px-10 text-center bg-white"><h1 class="text-5xl md:text-6xl font-black tracking-tight mb-6">${block.headline}</h1><p class="text-xl text-slate-600 max-w-2xl mx-auto">${block.subhead}</p><button class="mt-8 bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-xl">${block.cta?.label || "Get Started"}</button></div>\n`;
      } else if (block.type === 'features') {
        htmlContent += `<div class="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">`;
        block.items?.forEach((item: any) => {
          htmlContent += `<div class="p-8 bg-slate-50 border border-slate-100 rounded-3xl"><h3 class="text-xl font-bold mb-3">${item.title}</h3><p class="text-slate-600 leading-relaxed">${item.description}</p></div>`;
        });
        htmlContent += `</div>\n`;
      } else if (block.type === 'text') {
        htmlContent += `<div class="max-w-3xl mx-auto py-16 px-10 prose prose-lg prose-slate">${block.content}</div>\n`;
      } else if (block.type === 'cta') {
        htmlContent += `<div class="py-20 px-10 bg-indigo-600 text-white text-center"><h2 class="text-4xl font-black mb-4">${block.headline}</h2><p class="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">${block.subhead}</p><button class="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold shadow-lg">${block.cta?.label || "Click Here"}</button></div>\n`;
      } else if (block.type === 'testimonials') {
        htmlContent += `<div class="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">`;
        block.items?.forEach((item: any) => {
          htmlContent += `<div class="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl italic">"${item.quote}"<div class="mt-4 font-bold not-italic text-sm text-slate-900">— ${item.name}</div></div>`;
        });
        htmlContent += `</div>\n`;
      }
    });

    htmlContent += `</body>\n</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentPage.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runBuild() {
    if (creditBalance <= 0) {
      setSystemMessage({ text: "No credits remaining. Upgrade or purchase more.", type: "error" });
      return;
    }
    if (!prompt.trim()) {
      setSystemMessage({ text: "Prompt required. Please type in the bottom box.", type: "info" });
      return;
    }

    setIsRunning(true);
    setSystemMessage({ text: "Compiling snapshot...", type: "info" });

    try {
      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Not authenticated (no credits charged). Please log in.");
        const { data: proj, error: projErr } = await supabase.from("projects").insert({
          owner_id: user.id, name: "New AI Build", slug: `site-${Date.now()}`
        }).select("id").single();
        if (projErr) throw new Error("Could not create project (no credits charged).");
        currentPid = proj.id;
        setProjectId(currentPid);
      }

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentPid, prompt, note }),
      });

      const textRes = await res.text();
      let data;
      try { data = JSON.parse(textRes); } 
      catch { throw new Error("AI output invalid or server failed (no credits charged). Try simplifying your request."); }

      if (!res.ok || !data.success) {
        throw new Error(`${data.error || "Server error"} (no credits charged).`);
      }

      setSnapshot(data.snapshot);
      setCreditBalance(prev => prev - 1);
      setSystemMessage({ text: "Build succeeded and version saved.", type: "success" });
      fetchHistory();

    } catch (err: any) {
      setSystemMessage({ text: err.message, type: "error" });
    } finally {
      setIsRunning(false);
    }
  }

  const TopNav = () => (
    <nav className="h-16 shrink-0 border-b border-white/10 bg-[#050505] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-8">
        <button onClick={() => setView("landing")} className="font-black text-xl text-white flex items-center gap-2">
          <div className="w-6 h-6 bg-cyan-500 rounded text-black flex items-center justify-center text-xs">⬡</div>
          buildlio<span className="text-cyan-500">.site</span>
        </button>
        <div className="hidden md:flex gap-4">
          <button onClick={() => setView("builder")} className={`text-sm font-bold transition-colors ${view === 'builder' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>Builder</button>
          <button onClick={() => setView("pricing")} className={`text-sm font-bold transition-colors ${view === 'pricing' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>Pricing</button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
              {creditBalance} Credits
            </div>
            <span className="text-xs text-slate-500">{user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-white">Sign Out</button>
          </>
        ) : (
          <button onClick={() => setView("auth")} className="text-sm font-bold text-slate-300 hover:text-white">Log In</button>
        )}
      </div>
    </nav>
  );

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-[#020202] text-slate-300 font-sans overflow-hidden`}>
      <TopNav />

      <main className="flex-1 relative overflow-hidden">
        
        {/* LANDING PAGE */}
        {view === "landing" && (
          <div className="h-full overflow-y-auto p-10 md:p-20 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="max-w-4xl mx-auto text-center space-y-8 mt-10">
              <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold text-sm tracking-wide uppercase">AI-First Website Builder</div>
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-tight">Prompt to Production <br/><span className="text-cyan-500">in Seconds.</span></h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">Turn plain-language prompts into validated, structured website blueprints.</p>
              <div className="flex justify-center gap-4 pt-8">
                <button onClick={() => user ? setView("builder") : setView("auth")} className="px-8 py-4 bg-cyan-500 text-black rounded-xl font-black text-lg hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)]">Start Building</button>
                <button onClick={() => setView("pricing")} className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">View Plans</button>
              </div>
            </div>
          </div>
        )}

        {/* AUTH PAGE */}
        {view === "auth" && (
          <div className="h-full flex items-center justify-center bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="w-full max-w-sm bg-[#050505] border border-white/10 p-8 rounded-2xl shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Access Account</h2>
              {authStatus && <div className="mb-4 text-xs font-mono text-cyan-400 bg-cyan-400/10 p-2 rounded">{authStatus}</div>}
              <div className="space-y-4">
                <input type="email" placeholder="Email Address" className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                <button onClick={handleAuth} className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors">Authenticate</button>
              </div>
            </div>
          </div>
        )}

        {/* PRICING PAGE */}
        {view === "pricing" && (
          <div className="h-full overflow-y-auto p-10 md:p-20 bg-[#020202]">
            <div className="max-w-6xl mx-auto text-center mb-16">
              <h2 className="text-5xl font-black text-white mb-4">Transparent Pricing.</h2>
              <p className="text-xl text-slate-400">Fairness-first billing: Credits are only deducted on successful, validated generations.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: "Starter", price: "Free", target: "Testing the tool", features: ["1 Project", "Limited builds", "Basic HTML export"] },
                { name: "Pro Builder", price: "$29/mo", target: "Real users, real sites", features: ["Unlimited projects", "Full version history", "Publish to subdomain", "Priority speed"] },
                { name: "Agency", price: "$99/mo", target: "Client work & teams", features: ["Multi-user workspaces", "Client-ready exports", "Highest priority generation", "Best support SLA"] }
              ].map(tier => (
                <div key={tier.name} className="bg-[#050505] border border-white/10 p-8 rounded-3xl flex flex-col">
                  <h3 className="text-2xl font-black text-white">{tier.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 h-10">{tier.target}</p>
                  <div className="text-4xl font-black text-cyan-400 my-6">{tier.price}</div>
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((f, i) => <li key={i} className="text-sm text-slate-300 flex items-center gap-2"><span className="text-cyan-500">✓</span> {f}</li>)}
                  </ul>
                  <button className="w-full mt-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">Select Plan</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUILDER PAGE */}
        {view === "builder" && (
          <div className="h-full w-full flex">
            
            {/* LEFT PANEL: CONTROLS */}
            <aside className="w-[400px] border-r border-white/10 bg-[#050505] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 bg-[#0a0a0f] space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Context</div>
                {/* Fixed the placeholder to be clearer! */}
                <input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="Leave blank to create NEW project" className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 outline-none" />
                {systemMessage && (
                  <div className={`p-3 rounded-lg text-xs font-mono border ${systemMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : systemMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                    {systemMessage.text}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-[#020202]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Version History</div>
                {history.length === 0 ? (
                  <div className="text-xs text-slate-600 italic">No builds found. Run a prompt to generate v1.</div>
                ) : (
                  <div className="space-y-2">
                    {history.map(v => (
                      <button key={v.id} onClick={() => { setSnapshot(v.snapshot); setSystemMessage({ text: `Loaded v${v.version_no}`, type: "success" }); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-cyan-500/50 transition-all text-left group">
                        <div>
                          <div className="text-xs font-black text-cyan-400 group-hover:text-cyan-300">v{v.version_no}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{v.note || "Prompt-based edit"}</div>
                        </div>
                        <div className="text-[9px] font-mono text-slate-600">{new Date(v.created_at).toLocaleTimeString()}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Input at the bottom */}
              <div className="p-4 border-t border-white/10 bg-[#0a0a0f] space-y-3">
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Revision Note (Optional)" className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 outline-none" />
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Type prompt here (e.g. 'Create a dog breeder site')" className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none resize-none h-24" disabled={isRunning} />
                <button onClick={runBuild} disabled={isRunning} className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${isRunning ? "bg-cyan-900/30 text-cyan-600 cursor-not-allowed" : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"}`}>
                  {isRunning ? "Generating Snapshot..." : "Run Build"}
                </button>
              </div>
            </aside>

            {/* RIGHT PANEL: PREVIEW */}
            <main className="flex-1 bg-[#f8fafc] flex flex-col relative">
              <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex gap-2">
                  {snapshot?.pages?.map((p: any) => (
                    <button key={p.slug} onClick={() => setActivePageSlug(p.slug)} className={`px-3 py-1 rounded text-xs font-bold capitalize ${activePageSlug === p.slug ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                      {p.slug}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {/* EXPORT HTML IS NOW CLICKABLE */}
                  <button onClick={exportHTML} disabled={!snapshot} className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${snapshot ? "text-slate-900 border-slate-300 hover:bg-slate-50" : "text-slate-400 border-slate-200 cursor-not-allowed"}`}>
                    Export HTML
                  </button>
                  <button className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">Publish</button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
                {!snapshot ? (
                  <div className="h-full flex items-center justify-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
                    <div className="text-center text-slate-400">
                      <div className="text-4xl mb-2 font-black">⬡</div>
                      <p className="text-sm font-bold">Canvas Empty</p>
                      <p className="text-xs mt-1 max-w-xs mx-auto">Type your prompt in the bottom left box to generate a site.</p>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500 pb-20">
                    {snapshot.pages?.find((p: any) => p.slug === activePageSlug)?.blocks?.map((block: any, i: number) => (
                      <div key={i} className="group relative border-b border-slate-200 hover:border-indigo-300 transition-colors">
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                          <button className="bg-white border border-slate-200 shadow-sm text-[10px] font-bold px-2 py-1 rounded text-slate-600 hover:text-indigo-600">Edit Block</button>
                        </div>

                        {block.type === 'hero' && (
                          <div className="py-24 px-10 text-center bg-white">
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{block.headline}</h1>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">{block.subhead}</p>
                            {block.cta && <button className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-xl">{block.cta.label || "Get Started"}</button>}
                          </div>
                        )}

                        {block.type === 'features' && (
                          <div className="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                            {block.items?.map((item: any, j: number) => (
                              <div key={j} className="p-8 bg-slate-50 border border-slate-100 rounded-3xl">
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
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

                        {block.type === 'cta' && (
                          <div className="py-20 px-10 bg-indigo-600 text-white text-center">
                            <h2 className="text-4xl font-black mb-4">{block.headline}</h2>
                            <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">{block.subhead}</p>
                            <button className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold shadow-lg">{block.cta?.label || "Click Here"}</button>
                          </div>
                        )}

                        {block.type === 'testimonials' && (
                          <div className="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                            {block.items?.map((item: any, j: number) => (
                              <div key={j} className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl italic">
                                "{item.quote}"
                                <div className="mt-4 font-bold not-italic text-sm text-slate-900">— {item.name}, <span className="text-slate-500 font-normal">{item.title}</span></div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

      </main>
    </div>
  );
}
}