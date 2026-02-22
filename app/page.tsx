/* FILE: app/page.tsx
   BUILDLIO.SITE — v4.0: Conversational Agent Architect
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type ViewState = "landing" | "auth" | "builder" | "pricing";
type Message = { role: "user" | "assistant", content: string };

export default function BuildlioApp() {
  const [view, setView] = useState<ViewState>("landing");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activePageSlug, setActivePageSlug] = useState("index");
  
  const [creditBalance, setCreditBalance] = useState(10);
  
  // --- CHAT AGENT STATE ---
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! I'm Buildlio, your personal AI website architect. What kind of website are we building today?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ? { email: data.user.email, id: data.user.id } : null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ? { email: session.user.email, id: session.user.id } : null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (view === "builder" && projectId) fetchHistory();
  }, [projectId, view]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchHistory() {
    const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
    if (data) setHistory(data);
  }

  async function handleAuth() {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (!error) setView("builder");
  }

  function exportHTML() {
    if (!snapshot) return;
    const currentPage = snapshot.pages?.find((p: any) => p.slug === activePageSlug) || snapshot.pages?.[0];
    if (!currentPage) return;

    let htmlContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${snapshot.appName || currentPage.slug}</title>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-50 text-slate-900 font-sans">\n`;

    currentPage.blocks?.forEach((block: any) => {
      if (block.type === 'hero') htmlContent += `<div class="py-24 px-10 text-center bg-white"><h1 class="text-5xl md:text-6xl font-black tracking-tight mb-6">${block.headline}</h1><p class="text-xl text-slate-600 max-w-2xl mx-auto">${block.subhead}</p><button class="mt-8 bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-xl">${block.cta?.label || "Get Started"}</button></div>\n`;
      else if (block.type === 'features') {
        htmlContent += `<div class="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">`;
        block.items?.forEach((item: any) => htmlContent += `<div class="p-8 bg-slate-50 border border-slate-100 rounded-3xl"><h3 class="text-xl font-bold mb-3">${item.title}</h3><p class="text-slate-600 leading-relaxed">${item.description}</p></div>`);
        htmlContent += `</div>\n`;
      } else if (block.type === 'text') htmlContent += `<div class="max-w-3xl mx-auto py-16 px-10 prose prose-lg prose-slate">${block.content}</div>\n`;
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

  async function sendMessage() {
    if (!chatInput.trim() || isRunning) return;
    
    if (creditBalance <= 0) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ You are out of credits. Please upgrade your account to continue building." }]);
      return;
    }

    const newMessages = [...messages, { role: "user" as const, content: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    setIsRunning(true);

    try {
      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Please log in first.");
        const { data: proj, error: projErr } = await supabase.from("projects").insert({ owner_id: user.id, name: "Chat Build", slug: `site-${Date.now()}` }).select("id").single();
        if (projErr) throw new Error("Could not create project.");
        currentPid = proj.id;
        setProjectId(currentPid);
      }

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentPid, messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      const aiResponse = data.data;

      // Add AI's text response to the chat window
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse.message }]);

      // If the AI decided to build the site, update the canvas!
      if (aiResponse.type === "build" && aiResponse.snapshot) {
        setSnapshot(aiResponse.snapshot);
        setCreditBalance(prev => prev - 1);
        fetchHistory();
      }

    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
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
            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">{creditBalance} Credits</div>
            <span className="text-xs text-slate-500">{user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-white">Sign Out</button>
          </>
        ) : <button onClick={() => setView("auth")} className="text-sm font-bold text-slate-300 hover:text-white">Log In</button>}
      </div>
    </nav>
  );

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-[#020202] text-slate-300 font-sans overflow-hidden`}>
      <TopNav />

      <main className="flex-1 relative overflow-hidden">
        
        {/* LANDING & PRICING PAGES REMAIN INTACT... */}
        {view === "landing" && (
          <div className="h-full overflow-y-auto p-10 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="max-w-4xl mx-auto text-center space-y-8 mt-10">
              <h1 className="text-6xl font-black text-white">Prompt to Production <span className="text-cyan-500">in Seconds.</span></h1>
              <div className="flex justify-center gap-4 pt-8">
                <button onClick={() => user ? setView("builder") : setView("auth")} className="px-8 py-4 bg-cyan-500 text-black rounded-xl font-black text-lg hover:bg-cyan-400">Start Building</button>
              </div>
            </div>
          </div>
        )}

        {view === "auth" && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-sm bg-[#050505] border border-white/10 p-8 rounded-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Access Account</h2>
              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0a0a0f] border border-white/10 rounded-lg p-3 text-white" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0a0a0f] border border-white/10 rounded-lg p-3 text-white" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg">Authenticate</button>
            </div>
          </div>
        )}

        {/* BUILDER PAGE */}
        {view === "builder" && (
          <div className="h-full w-full flex">
            
            {/* LEFT PANEL: CONVERSATIONAL AGENT */}
            <aside className="w-[450px] border-r border-white/10 bg-[#050505] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 bg-[#0a0a0f] flex justify-between items-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Buildlio Agent
                </div>
                <button onClick={() => { setMessages([{ role: "assistant", content: "Let's start a new project! What are we building?" }]); setSnapshot(null); setProjectId(""); }} className="text-cyan-400 text-xs hover:text-cyan-300">New Chat ⟳</button>
              </div>

              {/* CHAT WINDOW */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#020202]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-[#0a0a0f] border border-white/10 text-slate-300 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-cyan-500 mb-1">BUILDLIO</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex justify-start">
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl rounded-bl-none p-4 text-sm text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* CHAT INPUT */}
              <div className="p-4 border-t border-white/10 bg-[#0a0a0f]">
                <div className="relative">
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Message Buildlio..." 
                    className="w-full bg-[#050505] border border-white/10 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:border-cyan-500 outline-none" 
                    disabled={isRunning} 
                  />
                  <button onClick={sendMessage} disabled={isRunning || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-10 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                    ➔
                  </button>
                </div>
                <div className="text-center mt-3 text-[10px] text-slate-600">The AI will generate the site when it has enough info.</div>
              </div>
            </aside>

            {/* RIGHT PANEL: PREVIEW */}
            <main className="flex-1 bg-[#f8fafc] flex flex-col relative">
              <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex gap-2">
                  {snapshot?.pages?.map((p: any) => (
                    <button key={p.slug} onClick={() => setActivePageSlug(p.slug)} className={`px-3 py-1 rounded text-xs font-bold capitalize ${activePageSlug === p.slug ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{p.slug}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={exportHTML} disabled={!snapshot} className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${snapshot ? "text-slate-900 border-slate-300 hover:bg-slate-50" : "text-slate-400 border-slate-200 cursor-not-allowed"}`}>Export HTML</button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
                {!snapshot ? (
                  <div className="h-full flex flex-col items-center justify-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-cyan-500 text-3xl font-black">⬡</div>
                    <p className="text-sm font-bold text-slate-600">Chat with Buildlio to begin.</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500 pb-20">
                    {snapshot.pages?.find((p: any) => p.slug === activePageSlug)?.blocks?.map((block: any, i: number) => (
                      <div key={i} className="group relative border-b border-slate-200">
                        {block.type === 'hero' && (
                          <div className="py-24 px-10 text-center bg-white"><h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{block.headline}</h1><p className="text-xl text-slate-600 max-w-2xl mx-auto">{block.subhead}</p></div>
                        )}
                        {block.type === 'features' && (
                          <div className="py-20 px-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">{block.items?.map((item: any, j: number) => <div key={j} className="p-8 bg-slate-50 border border-slate-100 rounded-3xl"><h3 className="text-xl font-bold mb-3">{item.title}</h3><p className="text-slate-600">{item.description}</p></div>)}</div>
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