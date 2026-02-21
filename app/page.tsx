/* FILE: app/page.tsx
   EXECUTIVE AI — Fully Relational Breeding ERP
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type ViewState = "auth" | "dashboard";
type Tab = "dogs" | "ecommerce" | "hosting" | "personal";
type Message = { role: "user" | "assistant", content: string };

const INITIAL_STATE = {
  dogs: { 
    finances: { revenue: 0, expenses: 0, profit: 0 },
    breedingProgram: [], crm: [], calendar: [], 
    marketing: { websiteSync: "Up to Date", facebookDrafts: [] }
  },
  ecommerce: { sales: 0, shippingCosts: 0, inventory: [] },
  hosting: { mrr: 0, customers: [] },
  personal: { todos: [] }
};

export default function ExecutiveDashboard() {
  const [view, setView] = useState<ViewState>("auth");
  const [activeTab, setActiveTab] = useState<Tab>("dogs");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  
  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [appState, setAppState] = useState<any>(INITIAL_STATE);
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Good afternoon. The new SWVA Chihuahua Command Center is online. How can I help you manage the operation today?" }]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ? { email: data.user.email, id: data.user.id } : null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null);
      if (session?.user) setView("dashboard");
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    async function loadMasterState() {
      if (!user) return;
      const { data: proj } = await supabase.from("projects").select("*").eq("owner_id", user.id).eq("name", "Master Dashboard").order("created_at", { ascending: false }).limit(1).single();
      if (proj) {
        setProjectId(proj.id);
        const { data: versions } = await supabase.from("versions").select("*").eq("project_id", proj.id).order("version_no", { ascending: false }).limit(1);
        if (versions && versions.length > 0 && versions[0].snapshot?.dogs) {
          // Merge to ensure new fields exist if loading old data
          setAppState({ ...INITIAL_STATE, ...versions[0].snapshot });
        }
      }
    }
    if (view === "dashboard") loadMasterState();
  }, [view, user, supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Please log in.");
        const { data: proj } = await supabase.from("projects").insert({ owner_id: user.id, name: "Master Dashboard", slug: `erp-${Date.now()}` }).select("id").single();
        currentPid = proj!.id; setProjectId(currentPid);
      }
      const res = await fetch("/api/claude-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentPid, messages: newMessages, currentState: appState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      setMessages(prev => [...prev, { role: "assistant", content: data.data.message }]);
      if (data.data.state && data.data.state.dogs) setAppState(data.data.state);

    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally { setIsRunning(false); }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-[#0f111a] text-slate-300 font-sans overflow-hidden`}>
      <nav className="h-14 shrink-0 border-b border-white/10 bg-[#07080d] flex items-center justify-between px-6 z-50">
        <div className="font-black text-lg text-white flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500 rounded text-black flex items-center justify-center text-xs">▲</div>
          Executive<span className="text-emerald-500">AI</span>
        </div>
        {user && <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1 rounded">Sign Out</button>}
      </nav>

      <main className="flex-1 relative overflow-hidden">
        {view === "auth" && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-sm bg-[#161925] border border-white/10 p-8 rounded-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Admin Access</h2>
              {authStatus && <div className="mb-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded">{authStatus}</div>}
              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0f111a] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0f111a] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} disabled={isAuthBusy} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500">{isAuthBusy ? "Authenticating..." : "Login"}</button>
            </div>
          </div>
        )}

        {view === "dashboard" && (
          <div className="h-full w-full flex">
            <aside className="w-[450px] border-r border-white/10 bg-[#161925] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 bg-[#07080d] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assistant</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0f111a]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-[#161925] border border-white/10 text-slate-300 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-emerald-400 mb-1">ASSISTANT</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && <div className="flex justify-start"><div className="bg-[#161925] border border-white/10 rounded-2xl rounded-bl-none p-4 text-sm text-slate-400 flex items-center gap-2">Updating Database...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-white/10 bg-[#07080d]">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="e.g. 'John paid a $500 deposit for male pup'" className="w-full bg-[#161925] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-emerald-500 outline-none" disabled={isRunning} />
              </div>
            </aside>

            <main className="flex-1 flex flex-col bg-[#07080d]">
              <div className="h-14 border-b border-white/10 flex px-4 gap-6 items-end shrink-0">
                {[{ id: "dogs", label: "🐾 SWVA Chihuahuas" }, { id: "ecommerce", label: "📦 E-Commerce" }].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>{tab.label}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[#0f111a]">
                <div className="max-w-6xl mx-auto space-y-8">
                  
                  {activeTab === "dogs" && (
                    <div className="animate-in fade-in space-y-8">
                      {/* SECTION 1: FINANCES & MARKETING */}
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="bg-[#161925] border border-white/10 p-5 rounded-2xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</div>
                          <div className="text-2xl font-black text-emerald-400 mt-1">${appState.dogs?.finances?.revenue || 0}</div>
                        </div>
                        <div className="bg-[#161925] border border-white/10 p-5 rounded-2xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Expenses</div>
                          <div className="text-2xl font-black text-red-400 mt-1">${appState.dogs?.finances?.expenses || 0}</div>
                        </div>
                        <div className="bg-[#161925] border border-white/10 p-5 rounded-2xl col-span-2 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Website Sync Status</div>
                            <div className={`text-sm font-bold mt-1 ${appState.dogs?.marketing?.websiteSync === "Synced" ? "text-emerald-400" : "text-amber-400 animate-pulse"}`}>
                              {appState.dogs?.marketing?.websiteSync || "Pending Update"}
                            </div>
                          </div>
                          <button className="bg-white/5 border border-white/10 px-4 py-2 rounded text-xs font-bold hover:bg-white/10">Push to Website</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* SECTION 2: BREEDING PROGRAM */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><span className="text-emerald-500">●</span> The Breeding Program</h3>
                          {(!appState.dogs?.breedingProgram || appState.dogs.breedingProgram.length === 0) && <div className="text-sm text-slate-600 bg-[#161925] p-6 rounded-2xl border border-white/5">No dogs or litters entered yet.</div>}
                          
                          {appState.dogs?.breedingProgram?.map((prog: any, i: number) => (
                            <div key={i} className="bg-[#161925] border border-white/10 rounded-2xl overflow-hidden">
                              <div className="bg-[#07080d] px-5 py-3 border-b border-white/5 font-black text-white flex justify-between">
                                Dam: {prog.dam}
                              </div>
                              {prog.litters?.map((litter: any, j: number) => (
                                <div key={j} className="p-5 border-b border-white/5 last:border-0">
                                  <div className="text-xs text-slate-500 mb-3 font-mono">Litter DOB: {litter.dob}</div>
                                  <div className="space-y-2">
                                    {litter.puppies?.map((pup: any, k: number) => (
                                      <div key={k} className="flex items-center justify-between bg-[#0f111a] p-3 rounded-lg border border-white/5">
                                        <div>
                                          <div className="text-sm font-bold text-white">{pup.description}</div>
                                          <div className="text-xs text-slate-400">${pup.price}</div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded font-bold ${pup.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                          {pup.status} {pup.buyerName && pup.buyerName !== "null" ? `(${pup.buyerName})` : ''}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* SECTION 3: CRM & CALENDAR */}
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="text-indigo-500">●</span> CRM & Payments</h3>
                            {(!appState.dogs?.crm || appState.dogs.crm.length === 0) && <div className="text-sm text-slate-600 bg-[#161925] p-6 rounded-2xl border border-white/5">No active buyers.</div>}
                            <div className="space-y-3">
                              {appState.dogs?.crm?.map((buyer: any, i: number) => (
                                <div key={i} className="bg-[#161925] border border-white/10 p-5 rounded-2xl">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <div className="font-bold text-white">{buyer.buyer}</div>
                                      <div className="text-xs text-slate-400">Purchasing: {buyer.puppy}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Total: ${buyer.totalPrice}</div>
                                      <div className="text-xs text-emerald-400">Paid: ${buyer.depositPaid}</div>
                                    </div>
                                  </div>
                                  <div className="bg-[#0f111a] p-3 rounded-lg border border-red-500/20 flex justify-between items-center">
                                    <span className="text-xs text-red-400 font-bold">Balance Due: ${buyer.balanceDue}</span>
                                    <span className="text-xs text-slate-500">Due: {buyer.dueDate}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="text-amber-500">●</span> Logistics Calendar</h3>
                            <div className="space-y-2">
                              {(!appState.dogs?.calendar || appState.dogs.calendar.length === 0) && <div className="text-sm text-slate-600 italic">Calendar is clear.</div>}
                              {appState.dogs?.calendar?.map((cal: any, i: number) => (
                                <div key={i} className="flex gap-4 items-center bg-[#161925] border border-white/10 p-4 rounded-xl">
                                  <div className="text-center shrink-0 w-12 border-r border-white/10 pr-4">
                                    <div className="text-[10px] text-slate-500 uppercase">{cal.date.split('-')[1]}</div>
                                    <div className="text-lg font-black text-white">{cal.date.split('-')[2]}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-white">{cal.event}</div>
                                    <div className="text-xs text-slate-400">📍 {cal.location}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* DRAFTED POSTS */}
                          {appState.dogs?.marketing?.facebookDrafts?.length > 0 && (
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl">
                              <div className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider flex justify-between">
                                Social Media Drafts 
                                <button className="underline">Post to FB</button>
                              </div>
                              {appState.dogs.marketing.facebookDrafts.map((draft: string, i: number) => (
                                <div key={i} className="text-sm text-slate-300 italic whitespace-pre-line">"{draft}"</div>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </main>
          </div>
        )}
      </main>
    </div>
  );
}