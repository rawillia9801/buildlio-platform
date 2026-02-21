/* FILE: app/page.tsx
   DOCUDRAFT AI — Legal Document Generator (With Auth Error Handling)
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type ViewState = "landing" | "auth" | "builder" | "pricing";
type Message = { role: "user" | "assistant", content: string };

export default function DocuDraftApp() {
  const [view, setView] = useState<ViewState>("landing");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // --- RESTORED AUTH ERROR STATE ---
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  
  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState(10);
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello. I am DocuDraft, your AI legal assistant. What type of document do you need to draft today? (e.g., Non-Disclosure Agreement, Lease, Power of Attorney)" }
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchHistory() {
    const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
    if (data) setHistory(data);
  }

  // --- RESTORED AUTH ERROR HANDLING ---
  async function handleAuth() {
    setAuthStatus("");
    setIsAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setIsAuthBusy(false);
    
    if (error) {
      setAuthStatus(error.message);
    } else {
      setView("builder");
    }
  }

  function printDocument() {
    if (!snapshot) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${snapshot.documentTitle}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.6; max-width: 800px; margin: auto; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 30px; text-transform: uppercase; }
            h2 { font-size: 18px; margin-top: 25px; }
            p { margin-bottom: 15px; text-align: justify; }
            ul, ol { margin-bottom: 15px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${snapshot.documentTitle}</h1>
          ${snapshot.content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }

  async function sendMessage() {
    if (!chatInput.trim() || isRunning) return;
    
    if (creditBalance <= 0) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Out of credits." }]);
      return;
    }

    const newMessages = [...messages, { role: "user" as const, content: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    setIsRunning(true);

    try {
      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Please log in.");
        const { data: proj } = await supabase.from("projects").insert({ owner_id: user.id, name: "Legal Document", slug: `doc-${Date.now()}` }).select("id").single();
        currentPid = proj!.id;
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
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse.message }]);

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
    <nav className="h-16 shrink-0 border-b border-white/10 bg-[#020617] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-8">
        <button onClick={() => setView("landing")} className="font-black text-xl text-white flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-500 rounded text-white flex items-center justify-center text-xs">§</div>
          DocuDraft<span className="text-indigo-400">.ai</span>
        </button>
        <div className="hidden md:flex gap-4">
          <button onClick={() => setView("builder")} className={`text-sm font-bold transition-colors ${view === 'builder' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>Drafting Desk</button>
          <button onClick={() => setView("pricing")} className={`text-sm font-bold transition-colors ${view === 'pricing' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>Pricing</button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">{creditBalance} Credits</div>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-white">Sign Out</button>
          </>
        ) : <button onClick={() => setView("auth")} className="text-sm font-bold text-slate-300 hover:text-white">Log In</button>}
      </div>
    </nav>
  );

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-[#020617] text-slate-300 font-sans overflow-hidden`}>
      <TopNav />

      <main className="flex-1 relative overflow-hidden">
        
        {view === "landing" && (
          <div className="h-full overflow-y-auto p-10 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="max-w-4xl mx-auto text-center space-y-8 mt-10">
              <h1 className="text-6xl font-black text-white">Prompt to Contract <br/><span className="text-indigo-500">in Seconds.</span></h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">Your personal AI paralegal. Generate custom, structured legal documents instantly through a simple conversation.</p>
              <div className="flex justify-center gap-4 pt-8">
                <button onClick={() => user ? setView("builder") : setView("auth")} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-lg hover:bg-indigo-500">Start Drafting</button>
              </div>
            </div>
          </div>
        )}

        {/* RESTORED AUTH SCREEN */}
        {view === "auth" && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 p-8 rounded-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Client Login</h2>
              
              {/* This is the missing error box! */}
              {authStatus && (
                <div className="mb-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded">
                  {authStatus}
                </div>
              )}

              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#020617] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#020617] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} disabled={isAuthBusy} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                {isAuthBusy ? "Authenticating..." : "Authenticate"}
              </button>
            </div>
          </div>
        )}

        {view === "builder" && (
          <div className="h-full w-full flex">
            
            <aside className="w-[450px] border-r border-white/10 bg-[#0f172a] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 bg-[#020617] flex justify-between items-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> DocuDraft Agent
                </div>
                <button onClick={() => { setMessages([{ role: "assistant", content: "Let's draft a new document. What do you need?" }]); setSnapshot(null); setProjectId(""); }} className="text-indigo-400 text-xs hover:text-indigo-300">New Document ⟳</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#020617]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-[#0f172a] border border-white/10 text-slate-300 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-indigo-400 mb-1">PARALEGAL AI</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex justify-start">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl rounded-bl-none p-4 text-sm text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-white/10 bg-[#020617]">
                <div className="relative">
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Message DocuDraft..." 
                    className="w-full bg-[#0f172a] border border-white/10 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:border-indigo-500 outline-none" 
                    disabled={isRunning} 
                  />
                  <button onClick={sendMessage} disabled={isRunning || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                    ➔
                  </button>
                </div>
                <div className="text-center mt-3 text-[10px] text-slate-500">Disclaimer: AI-generated drafts should be reviewed by legal counsel.</div>
              </div>
            </aside>

            <main className="flex-1 bg-[#cbd5e1] flex flex-col relative overflow-hidden">
              <header className="h-12 bg-white border-b border-slate-300 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="text-sm font-bold text-slate-800">
                  {snapshot ? snapshot.documentTitle : "Document Preview"}
                </div>
                <div className="flex gap-2">
                  <button onClick={printDocument} disabled={!snapshot} className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${snapshot ? "text-slate-900 border-slate-300 hover:bg-slate-50" : "text-slate-400 border-slate-200 cursor-not-allowed"}`}>Print / Save PDF</button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                {!snapshot ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <div className="w-20 h-24 bg-white border border-slate-300 rounded shadow-md flex items-center justify-center mb-4 text-4xl">📄</div>
                    <p className="text-sm font-bold">No Document Generated</p>
                    <p className="text-xs mt-1">Chat with the paralegal on the left to begin drafting.</p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto bg-white p-12 md:p-20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-black font-serif">
                    <h1 className="text-3xl font-bold text-center mb-10 uppercase tracking-wide">{snapshot.documentTitle}</h1>
                    <div className="prose prose-slate max-w-none prose-headings:font-serif prose-p:text-justify prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: snapshot.content }} />
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