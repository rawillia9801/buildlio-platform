/* FILE: app/page.tsx
   EXECUTIVE AI — Business Management Dashboard
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

// INITIAL MOCK DATA
const INITIAL_STATE = {
  dogs: { 
    revenue: 4500, 
    activeLitters: [{ id: "L1", mother: "Bella", puppies: 4, available: 3 }], 
    buyers: [{ name: "Sarah J.", puppy: "Male 1", price: 1500, status: "Deposit Paid" }] 
  },
  ecommerce: { 
    sales: 1250, 
    shippingCosts: 180, 
    inventory: [{ item: "Clearance Toaster", platform: "Walmart", cost: 15, price: 45, status: "Listed" }] 
  },
  hosting: { 
    mrr: 450, 
    customers: [{ name: "Local Plumber LLC", domain: "plumberva.com", tier: "Pro $29/mo", status: "Active" }] 
  },
  personal: { 
    todos: [{ task: "Buy dog food", done: false }, { task: "Call accountant", done: true }] 
  }
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
  
  // This holds the entire state of your life!
  const [appState, setAppState] = useState<any>(INITIAL_STATE);
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Good afternoon, Boss. I have your dashboards loaded. What would you like to update today?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ? { email: data.user.email, id: data.user.id } : null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null);
      if (session?.user) setView("dashboard");
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

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
    setMessages(newMessages);
    setChatInput("");
    setIsRunning(true);

    try {
      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Please log in.");
        const { data: proj } = await supabase.from("projects").insert({ owner_id: user.id, name: "Master Dashboard", slug: `erp-${Date.now()}` }).select("id").single();
        currentPid = proj!.id;
        setProjectId(currentPid);
      }

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Notice we send the CURRENT STATE so the AI knows what to update!
        body: JSON.stringify({ projectId: currentPid, messages: newMessages, currentState: appState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      const aiResponse = data.data;
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse.message }]);

      // Update the UI with the new data the AI sent back
      if (aiResponse.state) {
        setAppState(aiResponse.state);
      }

    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-[#0f111a] text-slate-300 font-sans overflow-hidden`}>
      
      {/* TOP NAV */}
      <nav className="h-14 shrink-0 border-b border-white/10 bg-[#07080d] flex items-center justify-between px-6 z-50">
        <div className="font-black text-lg text-white flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500 rounded text-black flex items-center justify-center text-xs">▲</div>
          Executive<span className="text-emerald-500">AI</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs text-slate-500">{user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1 rounded">Sign Out</button>
            </>
          ) : null}
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        
        {/* AUTH */}
        {view === "auth" && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-sm bg-[#161925] border border-white/10 p-8 rounded-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Admin Access</h2>
              {authStatus && <div className="mb-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded">{authStatus}</div>}
              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0f111a] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0f111a] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} disabled={isAuthBusy} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-50">{isAuthBusy ? "Authenticating..." : "Login"}</button>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="h-full w-full flex">
            
            {/* LEFT PANEL: AI ASSISTANT */}
            <aside className="w-[450px] border-r border-white/10 bg-[#161925] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 bg-[#07080d] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chief (Executive Assistant)</div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0f111a]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-[#161925] border border-white/10 text-slate-300 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-emerald-400 mb-1">CHIEF</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex justify-start">
                    <div className="bg-[#161925] border border-white/10 rounded-2xl rounded-bl-none p-4 text-sm text-slate-400 flex items-center gap-2">Processing Update...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-white/10 bg-[#07080d]">
                <div className="relative">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="e.g. 'I just sold a puppy to John for $1200'" className="w-full bg-[#161925] border border-white/10 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:border-emerald-500 outline-none" disabled={isRunning} />
                  <button onClick={sendMessage} disabled={isRunning || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">➔</button>
                </div>
              </div>
            </aside>

            {/* RIGHT PANEL: BUSINESS DASHBOARDS */}
            <main className="flex-1 flex flex-col bg-[#07080d]">
              
              {/* TAB SELECTION */}
              <div className="h-14 border-b border-white/10 flex px-4 gap-6 items-end">
                {[
                  { id: "dogs", label: "🐾 SWVA Chihuahuas" },
                  { id: "ecommerce", label: "📦 E-Commerce" },
                  { id: "hosting", label: "🌐 HostMyWeb" },
                  { id: "personal", label: "👤 Personal" }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* DATA RENDERING */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#0f111a]">
                <div className="max-w-5xl mx-auto space-y-6">
                  
                  {/* DOGS TAB */}
                  {activeTab === "dogs" && (
                    <div className="animate-in fade-in">
                      <h2 className="text-2xl font-black text-white mb-6">Breeding Operations</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#161925] border border-white/10 p-6 rounded-2xl">
                          <div className="text-xs font-bold text-slate-500 uppercase">Gross Revenue</div>
                          <div className="text-3xl font-black text-emerald-400 mt-2">${appState.dogs.revenue}</div>
                        </div>
                      </div>
                      <div className="space-y-4 mb-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase">Active Litters</h3>
                        {appState.dogs.activeLitters.map((l: any, i: number) => (
                          <div key={i} className="bg-[#161925] border border-white/10 p-4 rounded-xl flex justify-between items-center">
                            <div><span className="font-bold text-white">{l.mother}'s Litter</span> (ID: {l.id})</div>
                            <div className="text-sm"><span className="text-emerald-400 font-bold">{l.available}</span> of {l.puppies} Available</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase">Recent Buyers</h3>
                        {appState.dogs.buyers.map((b: any, i: number) => (
                          <div key={i} className="bg-[#161925] border border-white/10 p-4 rounded-xl flex justify-between items-center text-sm">
                            <div className="text-white font-bold">{b.name} <span className="text-slate-500 font-normal ml-2">({b.puppy})</span></div>
                            <div className="flex items-center gap-4">
                              <span className="text-emerald-400">${b.price}</span>
                              <span className="bg-slate-800 px-2 py-1 rounded text-xs">{b.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ECOMMERCE TAB */}
                  {activeTab === "ecommerce" && (
                    <div className="animate-in fade-in">
                      <h2 className="text-2xl font-black text-white mb-6">Marketplace Sales</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#161925] border border-white/10 p-6 rounded-2xl">
                          <div className="text-xs font-bold text-slate-500 uppercase">Gross Sales</div>
                          <div className="text-3xl font-black text-emerald-400 mt-2">${appState.ecommerce.sales}</div>
                        </div>
                        <div className="bg-[#161925] border border-white/10 p-6 rounded-2xl">
                          <div className="text-xs font-bold text-slate-500 uppercase">Shipping Costs</div>
                          <div className="text-3xl font-black text-red-400 mt-2">${appState.ecommerce.shippingCosts}</div>
                        </div>
                        <div className="bg-[#161925] border border-white/10 p-6 rounded-2xl">
                          <div className="text-xs font-bold text-slate-500 uppercase">Net Profit</div>
                          <div className="text-3xl font-black text-white mt-2">${appState.ecommerce.sales - appState.ecommerce.shippingCosts}</div>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Current Inventory</h3>
                      <div className="bg-[#161925] border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#07080d] text-slate-500"><tr><th className="p-4">Item</th><th className="p-4">Platform</th><th className="p-4">Price</th><th className="p-4">Status</th></tr></thead>
                          <tbody>
                            {appState.ecommerce.inventory.map((inv: any, i: number) => (
                              <tr key={i} className="border-t border-white/5"><td className="p-4 text-white">{inv.item}</td><td className="p-4">{inv.platform}</td><td className="p-4 text-emerald-400">${inv.price}</td><td className="p-4">{inv.status}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* HOSTING TAB */}
                  {activeTab === "hosting" && (
                    <div className="animate-in fade-in">
                      <h2 className="text-2xl font-black text-white mb-6">HostMyWeb Operations</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#161925] border border-white/10 p-6 rounded-2xl">
                          <div className="text-xs font-bold text-slate-500 uppercase">Monthly Recurring (MRR)</div>
                          <div className="text-3xl font-black text-emerald-400 mt-2">${appState.hosting.mrr}</div>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Active Customers</h3>
                      {appState.hosting.customers.map((c: any, i: number) => (
                        <div key={i} className="bg-[#161925] border border-white/10 p-4 rounded-xl flex justify-between items-center mb-2">
                          <div><div className="font-bold text-white">{c.name}</div><div className="text-xs text-slate-500">{c.domain}</div></div>
                          <div className="text-right"><div className="text-emerald-400 text-sm font-bold">{c.tier}</div><div className="text-xs text-slate-500">{c.status}</div></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PERSONAL TAB */}
                  {activeTab === "personal" && (
                    <div className="animate-in fade-in">
                      <h2 className="text-2xl font-black text-white mb-6">Personal Tasks</h2>
                      <div className="space-y-2">
                        {appState.personal.todos.map((todo: any, i: number) => (
                          <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 ${todo.done ? 'bg-[#07080d] border-white/5 text-slate-600' : 'bg-[#161925] border-white/10 text-white'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${todo.done ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-slate-600'}`}>{todo.done ? '✓' : ''}</div>
                            <span className={todo.done ? 'line-through' : ''}>{todo.task}</span>
                          </div>
                        ))}
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