/* FILE: app/page.tsx 
   SWVA COMMAND CENTER - FULL PRODUCTION VERSION 
   Includes: Breeding Ecosystem, Hosting, E-commerce Logistics, & AI Terminal
*/

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

type ViewState = "auth" | "dashboard";
type TabState = "dogs" | "hosting" | "ecommerce" | "admin";
type Message = { role: "user" | "assistant", content: string };

export default function CompleteCommandCenter() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<ViewState>("auth");
  const [activeTab, setActiveTab] = useState<TabState>("dogs");
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // Stats matching image_d8115a.png and image_d81d3b.png
  const [liveStats, setLiveStats] = useState({
    availablePups: 0,
    totalPups: 0,
    totalBuyers: 0,
    activeLitters: 0,
    pendingApps: 0,
    openMessages: 0,
    hostingMRR: 0,
    inventoryValue: 0,
    shippingFees: 0,
    wfsFees: 0,
    totalSales: 0
  });

  // AI Chat State
  const [chatInput, setChatInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Systems online. Access confirmed for SWVA Dogs and HostMyWeb. Ready for queries." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- DATABASE CONNECTION ---
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

  // --- DATA FETCHING ---
  async function fetchLiveStats() {
    try {
      const [
        { count: avail }, { count: total }, { count: buyers }, { count: apps },
        { data: inv }, { data: sales }, { data: logistics }
      ] = await Promise.all([
        supabase.from('puppies').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
        supabase.from('puppies').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true }),
        supabase.from('portal_form_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('cost_price, quantity'),
        supabase.from('sales').select('revenue'),
        supabase.from('logistics_fees').select('amount, type')
      ]);

      setLiveStats({
        availablePups: avail || 0,
        totalPups: total || 0,
        totalBuyers: buyers || 0,
        activeLitters: 0, // Calculated from litters table if added
        pendingApps: apps || 0,
        openMessages: 1, 
        hostingMRR: 0,
        inventoryValue: inv?.reduce((acc, curr) => acc + (curr.cost_price * curr.quantity), 0) || 0,
        shippingFees: logistics?.filter(f => f.type === 'shipping').reduce((acc, curr) => acc + curr.amount, 0) || 0,
        wfsFees: logistics?.filter(f => f.type === 'wfs_storage').reduce((acc, curr) => acc + curr.amount, 0) || 0,
        totalSales: sales?.reduce((acc, curr) => acc + (curr.revenue || 0), 0) || 0,
      });
    } catch (e) { console.error("Sync Error:", e); }
  }

  // --- AI HANDLER ---
  async function sendMessage() {
    if (!chatInput.trim() || isRunning) return;
    const userMsg = chatInput;
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages); setChatInput(""); setIsRunning(true);

    try {
      const res = await fetch("/api/claude-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, currentDbState: liveStats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.data.message }]);
      if (data.data.db_operations?.length > 0) fetchLiveStats();
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${err.message}` }]);
    } finally { setIsRunning(false); }
  }

  async function handleAuth() {
    setAuthStatus(""); setIsAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setIsAuthBusy(false);
    if (error) setAuthStatus(error.message);
  }

  // --- RENDER ---
  if (view === "auth") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b1220] font-sans">
        <div className="w-full max-w-sm bg-[#1e293b] border border-slate-700 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6">System Access</h2>
          {authStatus && <div className="mb-4 text-xs font-bold text-red-400 p-3 bg-red-500/10 rounded border border-red-500/20">{authStatus}</div>}
          <input type="email" placeholder="Email" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full mb-4 bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
          <button onClick={handleAuth} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all">{isAuthBusy ? "Verifying..." : "Login"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden`}>
      {/* HEADER: Multi-Tenant Console */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-8">
          <div>
            <div className="font-serif font-black text-xl text-slate-900 leading-none">SWVA OPS</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mt-1">Multi-Tenant Console</div>
          </div>
          <nav className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['dogs', 'hosting', 'ecommerce', 'admin'] as TabState[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.email}</div>
            <div className="text-[10px] text-emerald-500 font-bold uppercase">System Admin</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-red-500 hover:text-red-600">Logout</button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row w-full mx-auto">
        {/* SIDEBAR: AI Terminal (image_ce18b9.png) */}
        <aside className="w-full lg:w-[400px] border-r border-slate-200 bg-white flex flex-col shadow-xl z-20 shrink-0 h-[40vh] lg:h-full">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enterprise Agent</div>
            </div>
            <button onClick={fetchLiveStats} className="text-[10px] font-bold text-indigo-600 uppercase">Refresh Sync</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                  {msg.role === 'assistant' && <div className="text-[10px] font-black text-indigo-600 mb-1 uppercase">Database Intelligence</div>}
                  {msg.content}
                </div>
              </div>
            ))}
            {isRunning && <div className="text-xs text-slate-400 animate-pulse font-bold">Analysing DB...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="e.g. 'How many hosting sites are active?'" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" disabled={isRunning} />
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* DOGS TAB (Matches image_d8115a.png & image_d889de.png) */}
            {activeTab === 'dogs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Available Puppies" val={liveStats.availablePups} sub="puppies.status" icon="🐾" />
                  <StatCard title="Reserved / Pending" val={1} sub="Needs follow-up" icon="⏳" />
                  <StatCard title="Applications (7D)" val={liveStats.pendingApps} sub="portal_form_submissions" icon="📝" />
                  <StatCard title="Open Messages" val={liveStats.openMessages} sub="If portal_messages exists" icon="💬" />
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-2xl font-serif font-black mb-2">Dog Business Operations</h3>
                  <p className="text-sm text-slate-500 mb-6">Manage your Southwest Virginia Chihuahua breeding operations from here.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Puppy Assets</span>
                        <div className="text-2xl font-bold text-slate-900">${(liveStats.availablePups * 2000).toLocaleString()} <span className="text-xs font-normal text-slate-400">(Est @ $2k avg)</span></div>
                     </div>
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Application Pipeline</span>
                        <div className="text-2xl font-bold text-slate-900">{liveStats.pendingApps} Pending</div>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LinkCard title="Breeding Program" desc="Manage dogs, litters, and buyers." icon="🛡️" />
                  <LinkCard title="portal.swvachihuahua" desc="Portal admin + customer records." icon="🌐" />
                  <LinkCard title="ChihuahuaHQ.com" desc="Knowledge hub & resources." icon="🏠" />
                  <LinkCard title="MyDogPortal.Site" desc="Member portal & owner services." icon="🐾" />
                  <LinkCard title="DogBreederWeb.Site" desc="Breeder website platform." icon="💻" />
                  <LinkCard title="DogBreederDocs.Site" desc="Contracts, packets, docs." icon="📄" />
                </div>
              </div>
            )}

            {/* ECOMMERCE TAB (Matches image_d88a75.png & image_d88a1c.png) */}
            {activeTab === 'ecommerce' && (
              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Financial Administration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LinkCard title="Bills Manager" desc="Recurring obligations" icon="💸" />
                    <LinkCard title="Investments" desc="Growth & Targets" icon="📈" />
                    <LinkCard title="Domain Registry" desc="Renewals & DNS" icon="🌐" />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Sales Channels</h4>
                  <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                    <LogisticsRow title="Walmart Marketplace" sub="Retail orders, revenue, profit, fees." icon="🛒" />
                    <LogisticsRow title="Walmart Fulfillment Services (WFS)" sub="Inbound, fulfillment fees, storage/shipping." icon="📦" />
                    <LogisticsRow title="eBay Marketplace" sub="Orders, fees, shipping, profit." icon="🏷️" />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Retail Brands</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LinkCard title="MarionSweets.com" desc="Seasonal menus and delivery." icon="🍰" />
                    <LinkCard title="Trails & Tails VA" desc="Walk scheduling and client payouts." icon="🐕" />
                    <LinkCard title="Legalize Alabama" desc="Advocacy campaign management." icon="⚖️" />
                  </div>
                </section>
              </div>
            )}

            {/* HOSTING TAB (Matches image_d88a55.png) */}
            {activeTab === 'hosting' && (
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Tools & Hosting</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-xl border border-slate-700">
                      <div className="mb-4 text-blue-400">🖥️</div>
                      <h5 className="font-bold text-sm uppercase">HostMyWeb.co</h5>
                      <p className="text-[10px] text-slate-400">Reseller hosting console.</p>
                   </div>
                   <LinkCard title="Build.io" desc="AI site builder & deployments." icon="🏗️" />
                   <LinkCard title="LogoCreator.Site" desc="Brand asset generator." icon="🎨" />
                   <LinkCard title="eSignVirginia.com" desc="Digital contract management." icon="🖊️" />
                 </div>
              </div>
            )}

          </div>
        </main>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ title, val, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-sm border border-slate-100">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{val}</div>
      <div className="text-[10px] font-medium text-slate-400 mt-2">{sub}</div>
    </div>
  );
}

function LinkCard({ title, desc, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
      <div className="text-xl">{icon}</div>
      <div>
        <h5 className="font-bold text-sm text-slate-800">{title}</h5>
        <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
      </div>
    </div>
  );
}

function LogisticsRow({ title, sub, icon }: any) {
  return (
    <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">{icon}</div>
        <div>
          <h5 className="font-bold text-sm text-slate-800">{title}</h5>
          <p className="text-[11px] text-slate-400">{sub}</p>
        </div>
      </div>
      <span className="text-slate-200 group-hover:text-indigo-600 transition-colors">→</span>
    </div>
  );
}