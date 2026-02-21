/* FILE: app/page.tsx
   SWVA CHIHUAHUA & HOSTMYWEB — Unified Operations Dashboard
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

type ViewState = "auth" | "dashboard";
type TabState = "dogs" | "hosting" | "ecommerce" | "admin";
type Message = { role: "user" | "assistant", content: string };

export default function LiveAdminDashboard() {
  const [view, setView] = useState<ViewState>("auth");
  const [activeTab, setActiveTab] = useState<TabState>("dogs");
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  
  // EXPANDED LIVE DATABASE STATE
  const [liveStats, setLiveStats] = useState({
    // Dog Business
    availablePuppies: 0,
    totalPuppies: 0,
    totalBuyers: 0,
    activeLitters: 0,
    pendingApps: 0,
    // Hosting (HostMyWeb)
    activeSites: 0,
    hostingMRR: 0,
    openTickets: 0,
    domainRenewals: 0,
    // E-Commerce
    inventoryValue: 0,
    totalSales: 0,
    lowStockItems: 0,
    // Operations
    pendingTasks: 0,
    totalBillsDue: 0
  });

  const [chatInput, setChatInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Systems online. I have full access to SWVA Dogs, HostMyWeb, and your E-commerce tables. How can I help?" }
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
        fetchLiveStats(); 
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // FULL CROSS-TABLE FETCH
  async function fetchLiveStats() {
    try {
      const [
        { count: available }, { count: totalPups }, { count: buyers }, { count: litters }, { count: apps },
        { data: sites }, { data: invoices }, { count: tickets },
        { data: inventory }, { data: sales },
        { count: tasks }, { data: bills }
      ] = await Promise.all([
        // Dogs
        supabase.from('puppies').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
        supabase.from('puppies').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true }),
        supabase.from('litters').select('*', { count: 'exact', head: true }),
        supabase.from('puppy_applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        // Hosting
        supabase.from('client_sites').select('*'),
        supabase.from('invoices').select('total').eq('status', 'paid'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        // Ecommerce
        supabase.from('inventory').select('cost_price, quantity'),
        supabase.from('sales').select('revenue'),
        // Ops
        supabase.from('ops_tasks').select('*', { count: 'exact', head: true }).eq('is_done', false),
        supabase.from('bills').select('amount').eq('status', 'open')
      ]);

      const mrr = invoices?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;
      const salesTotal = sales?.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0) || 0;
      const invValue = inventory?.reduce((acc, curr) => acc + ((Number(curr.cost_price) || 0) * (curr.quantity || 0)), 0) || 0;
      const billsTotal = bills?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

      setLiveStats({
        availablePuppies: available || 0,
        totalPuppies: totalPups || 0,
        totalBuyers: buyers || 0,
        activeLitters: litters || 0,
        pendingApps: apps || 0,
        activeSites: sites?.length || 0,
        hostingMRR: mrr,
        openTickets: tickets || 0,
        domainRenewals: 0,
        inventoryValue: invValue,
        totalSales: salesTotal,
        lowStockItems: inventory?.filter(i => i.quantity < 3).length || 0,
        pendingTasks: tasks || 0,
        totalBillsDue: billsTotal
      });
    } catch (e) {
      console.log("Stats Refresh: Some tables may be initializing.", e);
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
        body: JSON.stringify({ messages: newMessages, currentDbState: liveStats }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");
      setMessages(prev => [...prev, { role: "assistant", content: data.data.message }]);
      if (data.data.db_operations?.length > 0) await fetchLiveStats();
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally { setIsRunning(false); }
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden`}>
      
      {/* HEADER / NAVIGATION */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-8">
          <div>
            <div className="font-serif font-black text-xl text-slate-900 leading-none">SWVA OPS</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mt-1">Multi-Tenant Console</div>
          </div>

          {view === "dashboard" && (
            <nav className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['dogs', 'hosting', 'ecommerce', 'admin'] as TabState[]).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          )}
        </div>
        
        {view === "dashboard" && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{user?.email}</div>
              <div className="text-[10px] text-emerald-500 font-bold uppercase">System Admin</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-red-500 hover:text-red-600">Logout</button>
          </div>
        )}
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row w-full mx-auto">
        {view === "auth" ? (
          <div className="h-full w-full flex items-center justify-center bg-[#0b1220]">
            <div className="w-full max-w-sm bg-[#1e293b] border border-slate-700 p-8 rounded-2xl shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Master Login</h2>
              {authStatus && <div className="mb-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded">{authStatus}</div>}
              <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button onClick={handleAuth} disabled={isAuthBusy} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500">{isAuthBusy ? "Authenticating..." : "Authenticate"}</button>
            </div>
          </div>
        ) : (
          <>
            {/* AI ASSISTANT PANEL */}
            <aside className="w-full lg:w-[450px] border-r border-slate-200 bg-white flex flex-col shadow-xl z-20 shrink-0 h-[40vh] lg:h-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enterprise Agent</div>
                </div>
                <button onClick={fetchLiveStats} className="text-[10px] font-bold text-indigo-600 uppercase">Refresh Sync</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                      {msg.role === 'assistant' && <div className="text-[10px] font-black text-indigo-600 mb-1 uppercase tracking-tighter">Database Intelligence</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isRunning && <div className="flex justify-start"><div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-none p-4 text-sm text-slate-500 font-bold animate-pulse">Running Queries...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="e.g. 'How many hosting sites are active?'" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none shadow-sm" disabled={isRunning} />
              </div>
            </aside>

            {/* MAIN DASHBOARD CONTENT */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
              <div className="max-w-5xl mx-auto space-y-8">
                
                {/* DOGS TAB */}
                {activeTab === 'dogs' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard title="Available" val={liveStats.availablePuppies} sub="puppies table" icon="🐾" color="emerald" />
                      <KPICard title="Buyers" val={liveStats.totalBuyers} sub="buyers table" icon="👤" color="blue" />
                      <KPICard title="Active Litters" val={liveStats.activeLitters} sub="litters table" icon="🍼" color="amber" />
                      <KPICard title="New Apps" val={liveStats.pendingApps} sub="puppy_applications" icon="📝" color="indigo" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-8">
                      <h3 className="font-serif text-2xl font-bold mb-4">Dog Business Operations</h3>
                      <p className="text-slate-500 text-sm">Manage your Southwest Virginia Chihuahua breeding operations from here.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                           <div className="text-[10px] font-black uppercase text-slate-400">Total Puppy Assets</div>
                           <div className="text-2xl font-bold">${(liveStats.totalPuppies * 2000).toLocaleString()} <span className="text-xs font-normal text-slate-400">(Est. @ $2k avg)</span></div>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                           <div className="text-[10px] font-black uppercase text-slate-400">Application Pipeline</div>
                           <div className="text-2xl font-bold">{liveStats.pendingApps} Pending</div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HOSTING TAB */}
                {activeTab === 'hosting' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard title="Active Sites" val={liveStats.activeSites} sub="client_sites" icon="🌐" color="indigo" />
                      <KPICard title="Monthly Rev" val={`$${liveStats.hostingMRR}`} sub="invoices (paid)" icon="💰" color="emerald" />
                      <KPICard title="Support" val={liveStats.openTickets} sub="support_tickets" icon="🎟️" color="red" />
                      <KPICard title="Domains" val={liveStats.domainRenewals} sub="domains table" icon="🔗" color="blue" />
                    </div>
                    <div className="bg-[#0f172a] text-white rounded-3xl p-8 shadow-2xl">
                       <h3 className="font-serif text-2xl font-bold mb-2">HostMyWeb Dashboard</h3>
                       <p className="text-slate-400 text-sm mb-6">Real-time hosting and domain management.</p>
                       <div className="flex gap-4">
                          <button className="bg-indigo-600 px-6 py-2 rounded-full text-xs font-bold">New Client Site</button>
                          <button className="bg-slate-800 px-6 py-2 rounded-full text-xs font-bold">Billing Portal</button>
                       </div>
                    </div>
                  </div>
                )}

                {/* E-COMMERCE TAB */}
                {activeTab === 'ecommerce' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard title="Inv Value" val={`$${liveStats.inventoryValue}`} sub="inventory table" icon="📦" color="blue" />
                      <KPICard title="Total Sales" val={`$${liveStats.totalSales}`} sub="sales table" icon="📈" color="emerald" />
                      <KPICard title="Low Stock" val={liveStats.lowStockItems} sub="qty < 3" icon="⚠️" color="amber" />
                      <KPICard title="Active Items" val={0} sub="inventory_items" icon="🏷️" color="indigo" />
                    </div>
                  </div>
                )}

                {/* ADMIN / OPS TAB */}
                {activeTab === 'admin' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard title="Bills Due" val={`$${liveStats.totalBillsDue}`} sub="bills table" icon="💸" color="red" />
                      <KPICard title="Ops Tasks" val={liveStats.pendingTasks} sub="ops_tasks" icon="✅" color="indigo" />
                    </div>
                  </div>
                )}

              </div>
            </main>
          </>
        )}
      </main>
    </div>
  );
}

function KPICard({ title, val, sub, icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-600",
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    amber: "bg-amber-50 border-amber-200 text-amber-600",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-600",
    red: "bg-red-50 border-red-200 text-red-600"
  };
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</div>
          <div className="text-2xl font-bold text-slate-900">{val}</div>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${colors[color]}`}>{icon}</div>
      </div>
      <div className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter italic">{sub}</div>
    </div>
  );
}