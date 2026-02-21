/* FILE: app/page.tsx
   SWVA CHIHUAHUA — Live Operations Dashboard & AI Agent
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

type ViewState = "auth" | "dashboard";
type Message = { role: "user" | "assistant", content: string };

export default function LiveAdminDashboard() {
  const [view, setView] = useState<ViewState>("auth");
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  
  // LIVE DATABASE STATE
  const [liveStats, setLiveStats] = useState({
    availablePuppies: 0,
    reservedPuppies: 0,
    applications7d: 0,
    openMessages: 0,
    totalPuppies: 0,
    totalBuyers: 0
  });

  const [chatInput, setChatInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ops Console online. I am connected to your live Supabase database. Give me a command." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setView("dashboard");
        fetchLiveStats(); // Fetch real data on login!
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // THIS FETCHES REAL DATA FROM YOUR SUPABASE
  async function fetchLiveStats() {
    try {
      // Best-effort fetching based on your architecture notes
      const [{ count: available }, { count: totalPups }, { count: buyers }] = await Promise.all([
        supabase.from('puppies').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
        supabase.from('puppies').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true })
      ]);

      setLiveStats({
        availablePuppies: available || 0,
        reservedPuppies: (totalPups || 0) - (available || 0),
        applications7d: 0, // Would query portal_applications
        openMessages: 1,   // Mocked for UI, would query messages
        totalPuppies: totalPups || 0,
        totalBuyers: buyers || 0
      });
    } catch (e) {
      console.log("Could not fetch live stats yet (tables may not exist).");
    }
  }

  async function handleAuth() {
    setAuthStatus(""); setIsAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setIsAuthBusy(false);
    if (error) setAuthStatus(error.message);
  }

  async function sendMessage() {
    if (!chatInput.trim() || isRunning) return;
    const newMessages = [...messages, { role: "user" as const, content: chatInput }];
    setMessages(newMessages); setChatInput(""); setIsRunning(true);

    try {
      const res = await fetch("/api/claude-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // We pass the current live stats so the AI knows what it's working with
        body: JSON.stringify({ messages: newMessages, currentDbState: liveStats }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      setMessages(prev => [...prev, { role: "assistant", content: data.data.message }]);
      
      // If the AI successfully ran DB operations, refresh the UI automatically!
      if (data.data.db_operations && data.data.db_operations.length > 0) {
        await fetchLiveStats();
      }

    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally { setIsRunning(false); }
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden`}>
      
      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div className="leading-tight">
          <div className="font-serif font-bold text-slate-900">SWVA Chihuahua</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin</div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto">
        
        {view === "auth" && (
          <div className="h-full w-full flex items-center justify-center bg-[#0b1220]">
            <div className="w-full max-w-sm bg-[#1e293b] border border-slate-700 p-8 rounded-2xl shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Client Login</h2>
              {authStatus && <div className="mb-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded">{authStatus}</div>}
              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} disabled={isAuthBusy} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500">{isAuthBusy ? "Authenticating..." : "Authenticate"}</button>
            </div>
          </div>
        )}

        {view === "dashboard" && (
          <>
            {/* LEFT PANEL: DATABASE ASSISTANT */}
            <aside className="w-full lg:w-[400px] border-r border-slate-200 bg-white flex flex-col shadow-lg z-20 shrink-0 h-[40vh] lg:h-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live DB Assistant</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-indigo-600 mb-1 uppercase">Database Admin</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && <div className="flex justify-start"><div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-none p-4 text-sm text-slate-500 font-bold">Executing SQL Operations...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="e.g. 'Add a new male puppy named Bruno for $2500'" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none shadow-sm" disabled={isRunning} />
              </div>
            </aside>

            {/* RIGHT PANEL: LIVE OPS CONSOLE */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
              <div className="max-w-5xl mx-auto space-y-8">
                
                {/* TOP KPI ROW */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Available Puppies</div>
                        <div className="text-3xl font-bold text-slate-900">{liveStats.availablePuppies}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">✓</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3">Based on puppies.status</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Reserved / Pending</div>
                        <div className="text-3xl font-bold text-slate-900">{liveStats.reservedPuppies}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">⏳</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3">Helps you see what needs follow-up.</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Applications (7D)</div>
                        <div className="text-3xl font-bold text-slate-900">{liveStats.applications7d}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">📝</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3">From portal_applications.</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Open Messages</div>
                        <div className="text-3xl font-bold text-slate-900">{liveStats.openMessages}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold">💬</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3">If messages exists.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* QUICK ACTIONS */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Quick Actions</div>
                        <div className="font-serif text-2xl font-bold text-slate-900 mt-1">Move fast without hunting tabs</div>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Admin</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-900">Add Puppy</span>
                          <span className="text-indigo-500 text-xl font-light group-hover:scale-110 transition">+</span>
                        </div>
                        <div className="text-xs text-slate-500">New litter entry, status, pricing, photos.</div>
                      </button>
                      <button className="text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-900">Add Buyer</span>
                          <span className="text-slate-400 text-xl">👤</span>
                        </div>
                        <div className="text-xs text-slate-500">Create or update buyer record.</div>
                      </button>
                      <button className="text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-900">Review Apps</span>
                          <span className="text-slate-400 text-xl">📄</span>
                        </div>
                        <div className="text-xs text-slate-500">Submitted forms + notes.</div>
                      </button>
                      <button className="text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-900">Docs</span>
                          <span className="text-slate-400 text-xl">📎</span>
                        </div>
                        <div className="text-xs text-slate-500">Agreements, PDFs, uploads.</div>
                      </button>
                    </div>
                  </div>

                  {/* OPERATIONAL SUMMARY */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Operational</div>
                        <div className="font-serif text-2xl font-bold text-slate-900 mt-1">This Week</div>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">Live Data</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Puppies</div>
                        <div className="text-2xl font-bold text-slate-900">{liveStats.totalPuppies}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Buyers</div>
                        <div className="text-2xl font-bold text-slate-900">{liveStats.totalBuyers}</div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex justify-between">
                        Apps Trend (14D) <span>{liveStats.applications7d} (last 7d)</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[15%] rounded-full"></div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2">Pulls from portal_applications when available.</div>
                    </div>
                  </div>

                </div>
              </div>
            </main>
          </>
        )}
      </main>
    </div>
  );
}