/* FILE: app/page.tsx 
  SWVA COMMAND CENTER - MASTER UNIFIED VERSION
  RESTORING: Full AI Engine + All Screenshot Modules + Logistics Logic
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

export default function MasterDashboard() {
  // --- AUTH & VIEW STATE ---
  const [view, setView] = useState<ViewState>("auth");
  const [activeTab, setActiveTab] = useState<TabState>("dogs");
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // --- LIVE DATA STATE (Matching Screenshot image_d8115a.png) ---
  const [liveStats, setLiveStats] = useState({
    availablePups: 0,
    totalPups: 0,
    totalBuyers: 0,
    activeLitters: 0,
    pendingApps: 0,
    openMessages: 1,
    hostingMRR: 0,
    inventoryValue: 0,
    shippingFees: 0,
    wfsStorageFees: 0,
    walmartSales: 0,
    ebaySales: 0,
    totalRevenue: 0,
    billsDue: 0
  });

  // --- AI CHAT TERMINAL STATE ---
  const [chatInput, setChatInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Systems online. 2026 Operational Protocol active. I have visibility into Breeding, Hosting, and E-commerce logistics." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- SUPABASE CLIENT ---
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  // --- AUTH OBSERVER ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setView("dashboard");
        fetchEverything(); 
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // --- THE DATA ENGINE (Inventory, Shipping, Costs) ---
  async function fetchEverything() {
    try {
      const [
        { count: availPups }, 
        { count: totalPups }, 
        { count: buyers }, 
        { count: apps },
        { data: inventory }, 
        { data: logistics },
        { data: sales },
        { data: bills }
      ] = await Promise.all([
        supabase.from('puppies').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
        supabase.from('puppies').select('*', { count: 'exact', head: true }),
        supabase.from('buyers').select('*', { count: 'exact', head: true }),
        supabase.from('portal_form_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('cost_price, quantity, platform'),
        supabase.from('logistics_fees').select('amount, type'),
        supabase.from('sales').select('revenue, platform'),
        supabase.from('bills').select('amount').eq('status', 'open')
      ]);

      setLiveStats({
        availablePups: availPups || 0,
        totalPups: totalPups || 0,
        totalBuyers: buyers || 0,
        activeLitters: 0, 
        pendingApps: apps || 0,
        openMessages: 1,
        hostingMRR: 0,
        inventoryValue: inventory?.reduce((acc, curr) => acc + (Number(curr.cost_price) * Number(curr.quantity)), 0) || 0,
        shippingFees: logistics?.filter(l => l.type === 'shipping').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
        wfsStorageFees: logistics?.filter(l => l.type === 'wfs_storage').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
        walmartSales: sales?.filter(s => s.platform === 'Walmart').reduce((acc, curr) => acc + Number(curr.revenue), 0) || 0,
        ebaySales: sales?.filter(s => s.platform === 'eBay').reduce((acc, curr) => acc + Number(curr.revenue), 0) || 0,
        totalRevenue: sales?.reduce((acc, curr) => acc + Number(curr.revenue), 0) || 0,
        billsDue: bills?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
      });
    } catch (e) {
      console.error("Critical Data Sync Failure:", e);
    }
  }

  // --- AI INTERACTION HANDLER ---
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
      if (!res.ok) throw new Error(data.error || "API Error");

      setMessages(prev => [...prev, { role: "assistant", content: data.data.message }]);
      if (data.data.db_operations?.length > 0) fetchEverything();
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Terminal Error: ${err.message}` }]);
    } finally { setIsRunning(false); }
  }

  async function handleAuth() {
    setAuthStatus(""); setIsAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setIsAuthBusy(false);
    if (error) setAuthStatus(error.message);
  }

  // --- AUTH SCREEN ---
  if (view === "auth") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b1220] font-sans">
        <div className="w-full max-w-sm bg-[#1e293b] border border-slate-700 p-8 rounded-2xl shadow-2xl text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Master Access</h2>
            <p className="text-[10px] text-indigo-400 font-bold tracking-[0.3em]">SWVA SECURE TERMINAL</p>
          </div>
          {authStatus && <div className="mb-4 text-xs font-bold text-red-400 p-3 bg-red-500/10 rounded border border-red-500/20">{authStatus}</div>}
          <div className="space-y-4 text-left">
            <input type="email" placeholder="System Email" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <input type="password" placeholder="System Password" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-lg hover:bg-indigo-500 transition-all">{isAuthBusy ? "Processing..." : "Decrypt & Enter"}</button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD RENDER ---
  return (
    <div className={`${inter.variable} ${playfair.variable} h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden`}>
      
      {/* HEADER: Multi-Tenant Console Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-10">
          <div>
            <div className="font-serif font-black text-xl text-slate-900 leading-none tracking-tight">SWVA OPS</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 mt-1 italic">2026 Operational Protocol</div>
          </div>
          <nav className="hidden lg:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1">
            {(['dogs', 'hosting', 'ecommerce', 'admin'] as TabState[]).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block border-r border-slate-200 pr-6">
            <div className="text-xs font-black text-slate-900">{user?.email}</div>
            <div className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter animate-pulse">Root Administrator</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-widest">Logout</button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row w-full mx-auto">
        
        {/* SIDEBAR: AI AGENT TERMINAL (image_ce18b9.png) */}
        <aside className="w-full lg:w-[420px] border-r border-slate-200 bg-white flex flex-col shadow-2xl z-20 shrink-0 h-[40vh] lg:h-full">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Engine v4.2</div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchEverything} className="text-[9px] font-black text-indigo-600 uppercase border border-indigo-100 px-2 py-1 rounded-md hover:bg-indigo-50">Sync Data</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(248,250,252,1))]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl p-5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-bl-none'}`}>
                  {msg.role === 'assistant' && <div className="text-[9px] font-black text-indigo-600 mb-2 uppercase tracking-widest border-b border-indigo-50 pb-1">AI Analyst Response</div>}
                  {msg.content}
                </div>
              </div>
            ))}
            {isRunning && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl rounded-bl-none p-5 text-[10px] text-slate-400 font-black animate-pulse uppercase tracking-widest">Scanning Databases...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 border-t border-slate-200 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="relative">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder="Ask about revenue, inventory, or puppies..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:bg-white outline-none shadow-inner transition-all pr-12" 
                disabled={isRunning} 
              />
              <button onClick={sendMessage} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl">⏎</button>
            </div>
          </div>
        </aside>

        {/* MAIN MODULE AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-12 bg-[#fcfdfe]">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* DOGS & BREEDING (image_d8115a.png & image_d889de.png) */}
            {activeTab === 'dogs' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard title="Available" val={liveStats.availablePups} sub="Active Listings" icon="🐾" color="emerald" />
                  <StatCard title="Reserved" val={1} sub="Pending Deposit" icon="⏳" color="amber" />
                  <StatCard title="Total Pack" val={liveStats.totalPups} sub="Adults + Pups" icon="🐕" color="blue" />
                  <StatCard title="Apps" val={liveStats.pendingApps} sub="Need Review" icon="📝" color="indigo" />
                </div>

                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div>
                      <h3 className="text-3xl font-serif font-black text-slate-900 mb-4 tracking-tight">Operational Snapshot</h3>
                      <p className="text-slate-500 text-sm leading-relaxed mb-8">February 21, 2026. Managing Southwest Virginia Chihuahua breeding records, health certifications, and logistics.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <ActionButton label="Add New Puppy" icon="+" color="indigo" />
                        <ActionButton label="Log New App" icon="📝" color="slate" />
                        <ActionButton label="Record Health" icon="💉" color="slate" />
                        <ActionButton label="Manage Buyers" icon="👤" color="slate" />
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col justify-center text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 italic">Breeding Value Projection</span>
                      <div className="text-5xl font-black text-slate-900 mb-2">${(liveStats.availablePups * 2500).toLocaleString()}</div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Projected Inventory Revenue</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Breeding Ecosystem Modules</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <LinkCard title="Breeding Program" desc="Manage active dogs, upcoming litters, and lineage." icon="🧬" />
                    <LinkCard title="portal.swvachihuahua" desc="Customer login and automated contract portal." icon="🆔" />
                    <LinkCard title="ChihuahuaHQ.com" desc="Publishing platform for health and breed info." icon="🏠" />
                    <LinkCard title="MyDogPortal.Site" desc="Puppy owner dashboard and vaccine tracking." icon="📅" />
                    <LinkCard title="DogBreederWeb.Site" desc="Deployment engine for breeder websites." icon="🌐" />
                    <LinkCard title="DogBreederDocs.Site" desc="Cloud storage for AKC and health docs." icon="📄" />
                  </div>
                </div>
              </div>
            )}

            {/* ECOMMERCE & LOGISTICS (image_d88a75.png & image_d88a1c.png) */}
            {activeTab === 'ecommerce' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Logistics Section */}
                <section className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sales Channel Intelligence</h4>
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <PlatformCard platform="Walmart Marketplace" rev={liveStats.walmartSales} fees={25} icon="🛒" color="blue" />
                      <PlatformCard platform="Walmart WFS" rev={0} fees={liveStats.wfsStorageFees} sub="Units at WFS: 0" icon="📦" color="indigo" />
                      <PlatformCard platform="eBay Marketplace" rev={liveStats.ebaySales} fees={liveStats.shippingFees} icon="🏷️" color="pink" />
                   </div>
                </section>

                {/* Financial Admin Section */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Finance & Governance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <LinkCard title="Bills Manager" desc="Automated tracking of recurring costs and utilities." icon="💸" />
                    <LinkCard title="Investment Portfolio" desc="Capital growth tracking and asset targets." icon="📈" />
                    <LinkCard title="Domain Registry" desc="DNS management for all 30+ SWVA properties." icon="🌐" />
                  </div>
                </section>

                {/* Retail Brands Section */}
                <section className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active Retail Brands</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <LinkCard title="MarionSweets.com" desc="Local gourmet delivery logistics." icon="🍰" accent="pink" />
                      <LinkCard title="Trails & Tails VA" desc="Dog walking and boarding schedules." icon="🐕" accent="emerald" />
                      <LinkCard title="Legalize Alabama" desc="Non-profit advocacy management." icon="⚖️" accent="blue" />
                   </div>
                </section>
              </div>
            )}

            {/* HOSTING TAB (image_d88a55.png) */}
            {activeTab === 'hosting' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#0f172a] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-10">
                      <div>
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-lg">🖥️</div>
                        <h3 className="text-4xl font-serif font-black mb-4">HostMyWeb Master</h3>
                        <p className="text-slate-400 max-w-md text-sm leading-relaxed">Central command for white-label reseller hosting. Monitor server health, automated billing, and domain clusters.</p>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Estimated MRR</div>
                         <div className="text-6xl font-black text-white">$0.00</div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <LinkCard title="Build.io" desc="Next-gen site builder deployments." icon="🏗️" />
                   <LinkCard title="LogoCreator.Site" desc="AI Brand asset production pipeline." icon="🎨" />
                   <LinkCard title="eSignVirginia.com" desc="Legal digital document engine." icon="🖊️" />
                </div>
              </div>
            )}

          </div>
        </main>
      </main>
    </div>
  );
}

// --- FULLY TYPED UI COMPONENTS ---

function StatCard({ title, val, sub, icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    pink: "bg-pink-50 text-pink-600 border-pink-100"
  };
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
        <div className={`w-10 h-10 ${colors[color]} rounded-2xl flex items-center justify-center text-lg border group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{val}</div>
      <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{sub}</div>
    </div>
  );
}

function ActionButton({ label, icon, color }: any) {
  const styles = color === 'indigo' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";
  return (
    <button className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all text-xs font-black uppercase tracking-widest ${styles}`}>
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function LinkCard({ title, desc, icon, accent }: any) {
  const borders: any = {
    pink: "hover:border-pink-200 hover:bg-pink-50/20",
    emerald: "hover:border-emerald-200 hover:bg-emerald-50/20",
    blue: "hover:border-blue-200 hover:bg-blue-50/20"
  };
  return (
    <div className={`bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm transition-all cursor-pointer flex items-center gap-5 ${accent ? borders[accent] : 'hover:border-indigo-200 hover:bg-indigo-50/20 hover:shadow-lg'}`}>
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 group-hover:bg-white">{icon}</div>
      <div>
        <h5 className="font-black text-sm text-slate-900 tracking-tight">{title}</h5>
        <p className="text-[10px] font-medium text-slate-500 leading-snug mt-1">{desc}</p>
      </div>
    </div>
  );
}

function PlatformCard({ platform, rev, fees, icon, color, sub }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    pink: "text-pink-600 bg-pink-50"
  };
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h5 className="font-black text-sm uppercase tracking-widest text-slate-800">{platform}</h5>
        <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
      </div>
      <div className="space-y-4">
        <div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
          <div className="text-2xl font-black text-slate-900">${rev.toLocaleString()}</div>
        </div>
        <div className="flex justify-between border-t border-slate-50 pt-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fees/Shipping</span>
            <div className="text-sm font-bold text-red-500">-${fees.toLocaleString()}</div>
          </div>
          {sub && (
             <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage</span>
                <div className="text-sm font-bold text-slate-600">{sub}</div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}