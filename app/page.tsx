/* SWVA OPS: 2026 OPERATIONAL PROTOCOL
  UNABRIDGED PRODUCTION BUILD - MARION HQ
  INTEGRATES: Dogs & Breeding, HostMyWeb, E-commerce Logistics
*/

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export default function SwvaFullScaleConsole() {
  // --- SYSTEM STATE ---
  const [activeTab, setActiveTab] = useState("dogs");
  const [isSyncing, setIsSyncing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Systems online. 2026 Operational Protocol active. I have visibility into Breeding, Hosting, and E-commerce logistics." }
  ]);
  
  // --- BUSINESS METRICS (Direct from Image image_d8a43d.png) ---
  const [metrics, setMetrics] = useState({
    activeListings: 0,
    pendingDeposit: 1,
    adultsPups: 0,
    needReview: 0,
    projectedRevenue: 0,
    // Logistics & Finance Data (Image image_d88a75.png)
    walmartRev: 0,
    wfsFees: 0,
    ebayRev: 0,
    shippingCosts: 0,
    inventorySupplyValue: 0
  });

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  // --- DATA SYNC ENGINE ---
  const performFullSync = async () => {
    setIsSyncing(true);
    try {
      const [pups, apps, sales, inv, logistics] = await Promise.all([
        supabase.from('puppies').select('status, price'),
        supabase.from('puppy_applications').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('revenue, platform'),
        supabase.from('inventory').select('quantity, cost_price'),
        supabase.from('logistics_fees').select('amount, type, platform')
      ]);

      const available = pups.data?.filter(p => p.status === 'Available') || [];
      
      setMetrics({
        activeListings: available.length,
        pendingDeposit: 1, // Static for now per image
        adultsPups: pups.data?.length || 0,
        needReview: apps.count || 0,
        projectedRevenue: available.reduce((acc, curr) => acc + (Number(curr.price) || 2500), 0),
        walmartRev: sales.data?.filter(s => s.platform === 'Walmart').reduce((acc, curr) => acc + Number(curr.revenue), 0) || 0,
        ebayRev: sales.data?.filter(s => s.platform === 'eBay').reduce((acc, curr) => acc + Number(curr.revenue), 0) || 0,
        wfsFees: logistics.data?.filter(l => l.type === 'wfs').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
        shippingCosts: logistics.data?.filter(l => l.type === 'shipping').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
        inventorySupplyValue: inv.data?.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.cost_price)), 0) || 0,
      });
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { performFullSync(); }, []);

  return (
    <div className={`${inter.variable} ${playfair.variable} h-screen flex flex-col bg-[#f8fafc] overflow-hidden`}>
      
      {/* 1. TOP NAVIGATION (image_d8a43d.png) */}
      <header className="bg-white border-b border-slate-200 px-10 py-5 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-12">
          <div>
            <h1 className="font-serif font-black text-2xl text-slate-900 tracking-tighter leading-none italic">SWVA OPS</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mt-1 italic">2026 OPERATIONAL PROTOCOL</p>
          </div>
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1">
            {["dogs", "hosting", "ecommerce", "admin"].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-7 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-black text-slate-900">rawillia9809@gmail.com</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter italic">ROOT ADMINISTRATOR</p>
          </div>
          <button className="text-[10px] font-black text-red-500 uppercase border-l border-slate-200 pl-6 hover:opacity-70 transition-opacity">LOGOUT</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* 2. AI ANALYST SIDEBAR (image_d8a43d.png) */}
        <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-2xl relative z-40">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NEURAL ENGINE V4.2</span>
            </div>
            <button 
              onClick={performFullSync}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-indigo-50 text-indigo-300 border border-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
            >
              {isSyncing ? "SYNCING..." : "SYNC DATA"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {messages.map((m, i) => (
              <div key={i} className="space-y-3">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">AI ANALYST RESPONSE</p>
                <div className={`p-6 rounded-[2rem] text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-50 text-slate-700 rounded-bl-none border border-slate-100 italic'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 border-t border-slate-200">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about revenue, inventory, or puppies..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner" 
            />
          </div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-12 bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto space-y-16">
            
            {/* --- DOGS & BREEDING PANEL (image_d8a43d.png) --- */}
            {activeTab === 'dogs' && (
              <div className="space-y-12">
                <div className="grid grid-cols-4 gap-6">
                  <KPI val={metrics.activeListings} label="ACTIVE LISTINGS" />
                  <KPI val={metrics.pendingDeposit} label="PENDING DEPOSIT" color="indigo" />
                  <KPI val={metrics.adultsPups} label="ADULTS + PUPS" />
                  <KPI val={metrics.needReview} label="NEED REVIEW" />
                </div>

                <div className="bg-white border border-slate-100 rounded-[4rem] p-16 shadow-sm grid grid-cols-2 gap-20 relative overflow-hidden">
                  <div className="space-y-10 relative z-10">
                    <div>
                      <h2 className="text-4xl font-serif font-black text-slate-900 tracking-tighter">Operational Snapshot</h2>
                      <p className="text-slate-400 text-lg mt-4 max-w-md leading-relaxed">February 21, 2026. Managing Southwest Virginia Chihuahua breeding records, health certifications, and logistics.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <BigButton label="ADD NEW PUPPY" icon="+" primary />
                      <BigButton label="LOG NEW APP" icon="📝" />
                      <BigButton label="RECORD HEALTH" icon="💉" />
                      <BigButton label="MANAGE BUYERS" icon="👤" />
                    </div>
                  </div>
                  <div className="bg-[#fcfcfd] rounded-[3.5rem] border border-slate-100 flex flex-col justify-center items-center text-center p-12">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-8 italic">BREEDING VALUE PROJECTION</p>
                    <div className="text-9xl font-black text-slate-900 tracking-tighter">${metrics.projectedRevenue.toLocaleString()}</div>
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-8">PROJECTED INVENTORY REVENUE</p>
                  </div>
                </div>

                <section className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400 pl-4">BREEDING ECOSYSTEM MODULES</h3>
                  <div className="grid grid-cols-3 gap-8">
                    <BrandCard title="Breeding Program" sub="Manage active dogs, upcoming litters, and lineage." icon="🧬" />
                    <BrandCard title="portal.swvachihuahua" sub="Customer login and automated contract portal." icon="🆔" />
                    <BrandCard title="ChihuahuaHQ.com" sub="Publishing platform for health and breed info." icon="🏠" />
                    <BrandCard title="MyDogPortal.Site" sub="Puppy owner dashboard and vaccine tracking." icon="📅" />
                    <BrandCard title="DogBreederWeb.Site" sub="Deployment engine for breeder websites." icon="🌐" />
                    <BrandCard title="DogBreederDocs.Site" sub="Cloud storage for AKC and health docs." icon="📄" />
                  </div>
                </section>
              </div>
            )}

            {/* --- E-COMMERCE & LOGISTICS (image_d88a75.png, image_d88a1c.png) --- */}
            {activeTab === 'ecommerce' && (
              <div className="space-y-16">
                <section className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 pl-4">FINANCIAL ADMINISTRATION</h3>
                  <div className="grid grid-cols-3 gap-8">
                    <AdminStat title="BILLS MANAGER" sub="Recurring obligations" icon="💸" />
                    <AdminStat title="INVESTMENTS" sub="Growth & Targets" icon="📈" />
                    <AdminStat title="DOMAIN REGISTRY" sub="Renewals & DNS" icon="🌐" />
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 pl-4">SALES CHANNEL LOGISTICS</h3>
                  <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden divide-y divide-slate-100">
                    <ChannelRow title="Walmart Marketplace" sub="Retail orders, revenue, profit, and fees." rev={metrics.walmartRev} icon="🛒" />
                    <ChannelRow title="Walmart Fulfillment (WFS)" sub="Inbound, fulfillment fees, storage, and shipping." fee={metrics.wfsFees} icon="📦" />
                    <ChannelRow title="eBay Marketplace" sub="Orders, platform fees, and shipping labels." rev={metrics.ebayRev} fee={metrics.shippingCosts} icon="🏷️" />
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 pl-4">RETAIL & BIZ BRANDS</h3>
                  <div className="grid grid-cols-3 gap-8">
                    <RetailBrand title="MarionSweets.com" sub="Seasonal menus, orders, and delivery." color="pink" icon="🍰" />
                    <RetailBrand title="Trails & Tails VA" sub="Walk scheduling and client payouts." color="emerald" icon="🐕" />
                    <RetailBrand title="Legalize Alabama" sub="Advocacy campaign management." color="indigo" icon="⚖️" />
                  </div>
                </section>
              </div>
            )}

            {/* --- HOSTING (image_d88a55.png) --- */}
            {activeTab === 'hosting' && (
              <div className="space-y-12">
                <div className="bg-[#0f172a] rounded-[4rem] p-24 text-white relative shadow-2xl flex justify-between items-center overflow-hidden">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -mr-40 -mt-40" />
                  <div className="space-y-8 relative z-10">
                    <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl border border-indigo-400/20">🖥️</div>
                    <h2 className="text-7xl font-serif font-black tracking-tighter italic">HOSTMYWEB.CO</h2>
                    <p className="text-slate-400 text-xl max-w-md leading-relaxed font-medium">Enterprise reseller management for client domains, WHM billing, and server clusters.</p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-[12px] font-black uppercase tracking-[0.6em] text-indigo-400 mb-6 italic">ESTIMATED REVENUE (MRR)</p>
                    <div className="text-[10rem] font-black tracking-tighter leading-none">$0</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <BrandCard title="Build.io" sub="AI site builder & automated deployments." icon="🏗️" />
                  <BrandCard title="LogoCreator.Site" sub="Automated brand asset generation pipeline." icon="🎨" />
                  <BrandCard title="eSignVirginia.com" sub="Digital contract execution & cloud storage." icon="🖊️" />
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// --- ATOMIC UI COMPONENTS ---

function KPI({ val, label, color }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col items-center group hover:shadow-xl transition-all">
      <div className={`text-6xl font-black tracking-tighter ${color === 'indigo' ? 'text-indigo-600' : 'text-slate-900'} group-hover:scale-105 transition-transform`}>{val}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 italic">{label}</div>
    </div>
  );
}

function BigButton({ label, icon, primary }: any) {
  return (
    <button className={`flex items-center gap-6 px-10 py-6 rounded-2xl text-[12px] font-black uppercase tracking-widest border transition-all ${primary ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
      <span className="text-3xl">{icon}</span>
      {label}
    </button>
  );
}

function BrandCard({ title, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">{icon}</div>
      <h4 className="font-black text-lg text-slate-900 uppercase tracking-tighter italic">{title}</h4>
      <p className="text-sm text-slate-400 mt-4 leading-relaxed font-medium">{sub}</p>
    </div>
  );
}

function ChannelRow({ title, sub, rev, fee, icon }: any) {
  return (
    <div className="p-12 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
      <div className="flex items-center gap-10">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">{icon}</div>
        <div>
          <h5 className="font-black text-xl text-slate-900 tracking-tight italic">{title}</h5>
          <p className="text-sm text-slate-400 mt-2 font-medium max-w-sm">{sub}</p>
        </div>
      </div>
      <div className="flex gap-16 text-right">
        {rev !== undefined && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter">${rev.toLocaleString()}</p>
          </div>
        )}
        {fee !== undefined && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Fees</p>
            <p className="text-3xl font-black text-red-500 tracking-tighter">-${fee.toLocaleString()}</p>
          </div>
        )}
        <div className="text-slate-200 group-hover:text-indigo-600 text-4xl flex items-center pl-8 transition-all">→</div>
      </div>
    </div>
  );
}

function AdminStat({ title, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm flex items-center gap-8 hover:shadow-lg transition-all cursor-pointer">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl bg-slate-50 shadow-inner group-hover:scale-110 transition-transform">{icon}</div>
      <div>
        <h4 className="font-black text-sm text-slate-900 uppercase tracking-[0.2em]">{title}</h4>
        <p className="text-[11px] text-slate-400 uppercase mt-2 font-bold tracking-widest italic">{sub}</p>
      </div>
    </div>
  );
}

function RetailBrand({ title, sub, color, icon }: any) {
  const themes: any = { 
    pink: "border-pink-100 bg-pink-50/20 text-pink-600 hover:border-pink-300 shadow-pink-100/20",
    emerald: "border-emerald-100 bg-emerald-50/20 text-emerald-600 hover:border-emerald-300 shadow-emerald-100/20",
    indigo: "border-indigo-100 bg-indigo-50/20 text-indigo-600 hover:border-indigo-300 shadow-indigo-100/20"
  };
  return (
    <div className={`border p-12 rounded-[3.5rem] transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer shadow-xl ${themes[color]}`}>
      <div className="text-5xl mb-8">{icon}</div>
      <h4 className="font-black text-lg uppercase tracking-tight italic">{title}</h4>
      <p className="text-[13px] opacity-70 mt-4 font-bold leading-relaxed">{sub}</p>
    </div>
  );
}