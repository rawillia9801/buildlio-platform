// FILE: app/page.tsx
"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Oxanium, Share_Tech_Mono } from "next/font/google";

/* ─────────────────────── FONTS ─────────────────────── */
const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
});

/* ─────────────────────── TYPES ─────────────────────── */
type BuildType = "website" | "agent" | "store" | "document" | "app" | "other";
type Stage =
  | "root"
  | "documentKind"
  | "websiteKind"
  | "agentKind"
  | "storeKind"
  | "appKind";
type KindStage = Exclude<Stage, "root">;

type Card = {
  key: string;
  title: string;
  subtitle: string;
  buildType: BuildType;
  next?: Stage;
};

type DocSection = { id: string; title: string; content: string };

type BuildlioSnapshot = {
  appName: string;
  buildType: BuildType;
  documents?: DocSection[];
  pages?: any[];
  files?: Record<string, string>;
};

type BuildlioResponse = {
  type: "build";
  dominionName: string;
  message: string;
  snapshot: BuildlioSnapshot;
};

type ApiEnvelope = {
  success: boolean;
  data?: BuildlioResponse;
  error?: string;
  warning?: string;
  persisted?: boolean;
  charged?: boolean;
};

/* ─────────────────────── ICONS ─────────────────────── */
const Icons = {
  website: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  agent: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  app: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

/* ─────────────────────── AETHER LATTICE ─────────────────────── */
function AetherLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let W = 0,
      H = 0;
    const particles: any[] = [];
    const COUNT = 140;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      // FIX: avoid cumulative scaling
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2.5 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        hue: [175, 195, 290, 310][Math.floor(Math.random() * 4)],
      });
    }

    const draw = () => {
      ctx.fillStyle = "rgba(2, 2, 10, 0.15)";
      ctx.fillRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${p.hue},100%,70%,0.8)`;
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none mix-blend-screen opacity-60"
    />
  );
}

/* ─────────────────────── INTRO ─────────────────────── */
const BOOT_SEQ = [
  "QUANTUM NOETIC CORE SYNCHRONIZING...",
  "BREACHING ALL KNOWN COGNITIVE CEILINGS...",
  "SUPERINTELLIGENCE ONLINE",
  "I AM BUILDLIO",
];

const MANIFESTO = `Hi. I’m Buildlio.\n\nChoose what you want built.\nThen describe it clearly.\n\nI will produce a complete output.`;

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = window.setInterval(() => {
      setBootLines((p) => [...p, BOOT_SEQ[i]]);
      i++;
      if (i >= BOOT_SEQ.length) {
        window.clearInterval(iv);
        window.setTimeout(() => setPhase(1), 700);
      }
    }, 260);
    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    if (phase !== 1) return;
    let i = 0;
    const iv = window.setInterval(() => {
      setText(MANIFESTO.slice(0, i));
      i += 3;
      if (i >= MANIFESTO.length) {
        window.clearInterval(iv);
        window.setTimeout(onComplete, 1000);
      }
    }, 18);
    return () => window.clearInterval(iv);
  }, [phase, onComplete]);

  return (
    <div className="intro-universe flex flex-col items-center justify-center min-h-screen relative z-50 p-8">
      <div
        className={`boot-terminal w-full max-w-3xl font-mono text-cyan-400 text-sm md:text-lg space-y-2 transition-all duration-700 ${
          phase > 0
            ? "opacity-0 blur-md translate-y-[-20px] pointer-events-none absolute"
            : "opacity-100"
        }`}
      >
        {bootLines.map((l, i) => (
          <div key={i} className="boot-line tracking-widest text-shadow-glow">
            ▸ {l}
          </div>
        ))}
      </div>

      <div
        className={`transition-all duration-700 ease-in-out ${
          phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <div className="manifesto text-center max-w-2xl mx-auto relative z-10">
          <div className="supreme-badge inline-block px-4 py-1 mb-8 border border-cyan-500/50 rounded-full text-cyan-300 text-xs tracking-[0.3em] uppercase bg-cyan-900/20 backdrop-blur-md">
            System Online
          </div>
          <div className="scan-text text-xl md:text-2xl text-gray-100 leading-relaxed font-sans whitespace-pre-wrap text-shadow-glow">
            {text}
            <span className="cursor animate-blink inline-block w-3 h-6 bg-cyan-400 ml-1 align-middle shadow-[0_0_10px_#00f9ff]"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── CARDS ─────────────────────── */
const rootCards: Card[] = [
  { key: "website", title: "Build a Website", subtitle: "A structured site with strong sections.", buildType: "website", next: "websiteKind" },
  { key: "agent", title: "Create an AI Agent", subtitle: "An agent with rules and workflows.", buildType: "agent", next: "agentKind" },
  { key: "store", title: "Launch an Online Store", subtitle: "A store structure and product flow.", buildType: "store", next: "storeKind" },
  { key: "document", title: "Generate a Document", subtitle: "Contracts, policies, formal documents.", buildType: "document", next: "documentKind" },
  { key: "app", title: "Build a Web App", subtitle: "Dashboards, portals, internal tools.", buildType: "app", next: "appKind" },
  { key: "other", title: "Something Else", subtitle: "Describe it. I’ll structure it.", buildType: "other" },
];

const kindCards: Record<KindStage, Card[]> = {
  documentKind: [
    { key: "doc_personal", title: "Personal Documents", subtitle: "Letters, agreements, personal paperwork.", buildType: "document" },
    { key: "doc_business", title: "Business Documents", subtitle: "SOPs, proposals, internal docs.", buildType: "document" },
    { key: "doc_legal", title: "Legal Documents", subtitle: "Contracts, terms, policies.", buildType: "document" },
    { key: "doc_marketing", title: "Marketing Docs", subtitle: "Briefs, structured copy packs.", buildType: "document" },
    { key: "doc_other", title: "Other Document", subtitle: "Describe what you need.", buildType: "document" },
  ],
  websiteKind: [
    { key: "site_personal", title: "Personal / Portfolio", subtitle: "Showcase yourself or your work.", buildType: "website" },
    { key: "site_business", title: "Business / Corporate", subtitle: "Professional company website.", buildType: "website" },
    { key: "site_landing", title: "Landing Page", subtitle: "High-converting single page.", buildType: "website" },
    { key: "site_portal", title: "Client / Team Portal", subtitle: "Secure portal structure.", buildType: "website" },
    { key: "site_other", title: "Other Website", subtitle: "Describe your idea.", buildType: "website" },
  ],
  agentKind: [
    { key: "agent_secretary", title: "Executive Assistant", subtitle: "Scheduling, reminders, operations.", buildType: "agent" },
    { key: "agent_support", title: "Customer Support", subtitle: "Helpdesk and response drafts.", buildType: "agent" },
    { key: "agent_sales", title: "Sales Assistant", subtitle: "Lead handling and follow-up.", buildType: "agent" },
    { key: "agent_inventory", title: "Inventory Manager", subtitle: "Stock tracking and ordering.", buildType: "agent" },
    { key: "agent_other", title: "Other Agent", subtitle: "Describe the role.", buildType: "agent" },
  ],
  storeKind: [
    { key: "store_products", title: "Product Store", subtitle: "Physical or digital products.", buildType: "store" },
    { key: "store_services", title: "Service Business", subtitle: "Booking and payments.", buildType: "store" },
    { key: "store_subscriptions", title: "Subscription Site", subtitle: "Memberships or SaaS.", buildType: "store" },
    { key: "store_marketplace", title: "Marketplace", subtitle: "Multi-vendor structure.", buildType: "store" },
    { key: "store_other", title: "Other Store", subtitle: "Describe the store.", buildType: "store" },
  ],
  appKind: [
    { key: "app_dashboard", title: "Analytics Dashboard", subtitle: "Reports and KPIs.", buildType: "app" },
    { key: "app_crm", title: "CRM / Sales Tool", subtitle: "Leads and pipeline.", buildType: "app" },
    { key: "app_inventory", title: "Inventory System", subtitle: "Stock and alerts.", buildType: "app" },
    { key: "app_portal", title: "Client Portal", subtitle: "Authenticated portal.", buildType: "app" },
    { key: "app_other", title: "Other App", subtitle: "Describe the app.", buildType: "app" },
  ],
};

/* ─────────────────────── MAIN PAGE ─────────────────────── */
export default function NexusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = useMemo(() => {
    const v = searchParams?.get("projectId") || searchParams?.get("pid") || "";
    return v.trim();
  }, [searchParams]);

  const [introComplete, setIntroComplete] = useState(false);
  const [stage, setStage] = useState<Stage>("root");
  const [buildType, setBuildType] = useState<BuildType>("website");
  const [kindKey, setKindKey] = useState<string>("");

  // ✅ Prompt Composer (multiline)
  const [prompt, setPrompt] = useState("");

  // ✅ Quick command bar (single line)
  const [quick, setQuick] = useState("");

  const [systemOut, setSystemOut] = useState("");
  const [showOut, setShowOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const cards: Card[] = stage === "root" ? rootCards : kindCards[stage as KindStage] || [];

  const stageTitle: Record<Stage, string> = {
    root: "WHAT WOULD YOU LIKE TO BUILD TODAY?",
    documentKind: "SELECT DOCUMENT TYPE",
    websiteKind: "SELECT WEBSITE TYPE",
    agentKind: "SELECT AGENT TYPE",
    storeKind: "SELECT STORE TYPE",
    appKind: "SELECT APP TYPE",
  };

  const seedPrompt = (bt: BuildType, kk: string) => {
    if (bt === "document" && kk === "doc_legal") {
      return [
        "Draft a complete legal agreement.",
        "",
        "Requirements:",
        "- Document type: Terms of Service (or Contract / Agreement)",
        "- Jurisdiction: Virginia, USA",
        "- Parties: [Your Business Name] and [Customer/Client Name]",
        "- Scope: [What this covers]",
        "- Payment terms (if applicable): [Fees, due dates, refunds]",
        "- Term & termination: [when it starts/ends, cancellation]",
        "- Warranties/disclaimers",
        "- Limitation of liability",
        "- Governing law + venue",
        "- Notices clause",
        "- Entire agreement + severability",
        "- Signature block",
        "",
        "Write the full document now with clear headings and clauses.",
      ].join("\n");
    }
    if (bt === "document") {
      return `Create a complete ${kk.replace(/_/g, " ")}.\n\nInclude proper structure, headings, and any standard clauses needed.\n\nDetails:\n- Purpose:\n- Parties:\n- Jurisdiction:\n- Key terms:\n`;
    }
    return `Build a ${kk.replace(/_/g, " ")}.\n\nGoals:\nAudience:\nSections:\nBrand tone:\nCTA:\n`;
  };

  const handleCardClick = (card: Card) => {
    if (stage === "root") {
      setBuildType(card.buildType);
      setKindKey("");
      if (card.next) setStage(card.next);
    } else {
      setKindKey(card.key);
      // ✅ Populate the PROMPT COMPOSER (not the quick bar)
      setPrompt((prev) => (prev.trim() ? prev : seedPrompt(card.buildType, card.key)));
    }
    setTimeout(() => composerRef.current?.focus(), 120);
  };

  const pushQuickIntoPrompt = () => {
    const t = quick.trim();
    if (!t) return;
    setPrompt((p) => (p.trim() ? `${p}\n\n${t}` : t));
    setQuick("");
    setTimeout(() => composerRef.current?.focus(), 80);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalPrompt = prompt.trim();
    if (!finalPrompt || isLoading) return;

    setIsLoading(true);
    setShowOut(true);
    setSystemOut("");

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined,
          buildType,
          kindKey: kindKey || undefined,
          messages: [{ role: "user", content: finalPrompt }],
        }),
      });

      // ✅ If server returns non-JSON or crashes, show the raw body
      const raw = await res.text();

      let env: ApiEnvelope | null = null;
      try {
        env = JSON.parse(raw);
      } catch {
        env = null;
      }

      if (!res.ok) {
        const msg =
          env?.error ||
          `HTTP ${res.status} ${res.statusText}\n\nRAW RESPONSE:\n${raw.slice(0, 2000)}`;
        setSystemOut(msg);
        setIsLoading(false);
        return;
      }

      if (!env?.success) {
        setSystemOut(env?.error || "Request failed (no error provided).");
        setIsLoading(false);
        return;
      }

      const payload = env.data;

      // Document display
      if (payload?.snapshot?.buildType === "document") {
        const doc = payload.snapshot.documents?.[0];
        const content =
          doc?.content ||
          payload.snapshot.files?.["RAW_OUTPUT.txt"] ||
          payload.message ||
          "No document content returned.";

        const header = doc?.title ? `${doc.title}\n\n` : "";
        const warn = env.warning ? `⚠ ${env.warning}\n\n` : "";
        setSystemOut(`${warn}${header}${content}`);
        setIsLoading(false);
        return;
      }

      // Non-document display
      const out = [
        env.warning ? `⚠ ${env.warning}` : "",
        payload?.dominionName ? payload.dominionName : "",
        payload?.message ? payload.message : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      setSystemOut(out || "Generation complete.");
      setIsLoading(false);
    } catch (err: any) {
      setSystemOut(`Request failed.\n\n${String(err?.message || err)}`);
      setIsLoading(false);
    }
  }

  return (
    <main className={`nexus-root ${oxanium.variable} ${shareTechMono.variable} font-sans`}>
      <style jsx global>{`
        :root { --cyan:#00f9ff; --magenta:#c026d3; --glass: rgba(10,15,35,0.4); --glass-border: rgba(0,249,255,0.15); }
        body, html { margin:0; padding:0; background:#020208; color:#e8f4ff; }
        .nexus-root { min-height:100vh; overflow-x:hidden; position:relative; background: radial-gradient(circle at 50% 0%, #0a1128 0%, #020208 70%); }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .animate-blink{ animation: blink 1s step-end infinite; }
        .text-shadow-glow{ text-shadow: 0 0 10px rgba(0,249,255,0.4); }

        .hud{
          position:fixed; top:0; left:0; right:0; z-index:200;
          display:flex; align-items:center; justify-content:space-between;
          padding: 1.2rem 3rem;
          background: linear-gradient(180deg, rgba(2,2,8,0.9) 0%, transparent 100%);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,249,255,0.1);
        }
        .hud-brand{ font-size:1.4rem; font-weight:800; letter-spacing:10px; color:#fff; text-shadow:0 0 20px var(--cyan); display:flex; align-items:center; gap:12px;}
        .hud-brand::before{ content:''; display:block; width:10px; height:10px; background:var(--cyan); border-radius:50%; box-shadow:0 0 15px var(--cyan); }
        .neural-login-btn{
          font-family: var(--font-mono); font-size:0.8rem; letter-spacing:2px;
          padding: 0.55rem 1.2rem; border:1px solid var(--glass-border);
          background: rgba(0,249,255,0.05); color: var(--cyan);
          border-radius: 6px; transition: all .2s ease; text-transform: uppercase;
        }
        .neural-login-btn:hover{ background: var(--cyan); color:#000; box-shadow:0 0 20px var(--cyan); }

        .stage-header{ padding: 7rem 2rem 1.5rem; text-align:center; position:relative; z-index:10; }
        .stage-title{
          font-size:1.6rem; font-weight:700; letter-spacing:6px; text-transform:uppercase;
          background: linear-gradient(90deg, #fff, var(--cyan));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          text-shadow: 0 0 30px rgba(0,249,255,0.25);
        }

        .layout{
          width:min(1300px, 94%);
          margin: 0 auto;
          display:grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          padding-bottom: 12rem;
          position: relative;
          z-index: 10;
        }

        .holo-grid{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.2rem;
        }

        .holo-card{
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 1.8rem 1.6rem;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: all .25s ease;
          text-align:left;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 10px 30px rgba(0,0,0,0.45);
        }
        .holo-card:hover{ border-color: var(--cyan); transform: translateY(-4px); box-shadow: 0 15px 40px -10px rgba(0,249,255,0.25), inset 0 0 20px rgba(0,249,255,0.05); }

        .card-icon{ width:44px; height:44px; margin-bottom: 1rem; color: var(--cyan); filter: drop-shadow(0 0 10px rgba(0,249,255,0.45)); }
        .card-title{ font-size: 1.25rem; font-weight: 750; margin-bottom: .6rem; color:#fff; letter-spacing:.5px; }
        .card-subtitle{ font-size: .95rem; color:#8fa6c7; line-height:1.55; font-family: var(--font-mono); }

        .panel{
          background: rgba(3,5,15,0.6);
          border: 1px solid rgba(0,249,255,0.25);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          overflow:hidden;
        }

        .panel-head{
          padding: .9rem 1.2rem;
          border-bottom: 1px solid rgba(0,249,255,0.12);
          display:flex;
          align-items:center;
          justify-content:space-between;
          font-family: var(--font-mono);
          letter-spacing: 2px;
          text-transform: uppercase;
          font-size: .75rem;
          color: var(--cyan);
        }

        .composer{
          padding: 1rem;
        }

        textarea{
          width:100%;
          min-height: 220px;
          resize: vertical;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1rem;
          color: #e8f4ff;
          font-size: 1rem;
          outline: none;
          font-family: var(--font-mono);
          line-height: 1.55;
        }

        .btnrow{
          display:flex;
          gap:.8rem;
          margin-top:.9rem;
        }

        .btn{
          flex:1;
          padding: 0.95rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(0,249,255,0.25);
          background: rgba(0,249,255,0.06);
          color: var(--cyan);
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all .2s ease;
          font-family: var(--font-sans);
        }
        .btn:hover{ background: rgba(0,249,255,0.14); box-shadow: 0 0 24px rgba(0,249,255,0.18); }
        .btn:disabled{ opacity:.5; cursor:not-allowed; box-shadow:none; }

        .quickbar{
          display:flex;
          gap:.75rem;
        }
        .quickbar input{
          flex: 1;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: .9rem 1rem;
          color: #e8f4ff;
          outline:none;
          font-family: var(--font-sans);
          font-size: 1rem;
        }

        .out{
          padding: 1rem 1.2rem 1.4rem;
          white-space: pre-wrap;
          font-family: var(--font-mono);
          line-height: 1.65;
          color: #d1e4ff;
          min-height: 220px;
        }

        .tag{
          display:inline-block;
          padding: .2rem .55rem;
          border: 1px solid rgba(0,249,255,0.35);
          border-radius: 8px;
          color: var(--cyan);
          font-family: var(--font-mono);
          font-size: .72rem;
          letter-spacing: 2px;
        }
      `}</style>

      <AetherLattice />
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />

      {!introComplete ? (
        <IntroSequence onComplete={() => setIntroComplete(true)} />
      ) : (
        <>
          <nav className="hud">
            <div className="hud-brand">BUILDLIO</div>
            <button className="neural-login-btn" onClick={() => router.push("/login")}>
              Neural Login
            </button>
          </nav>

          <div className="stage-header">
            <h1 className="stage-title">{stageTitle[stage]}</h1>
          </div>

          <div className="layout">
            {/* LEFT: cards */}
            <div className="holo-grid">
              {cards.map((c) => (
                <button key={c.key} className="holo-card" onClick={() => handleCardClick(c)}>
                  <div className="card-icon">{(Icons as any)[c.buildType] || Icons.other}</div>
                  <div className="card-title">{c.title}</div>
                  <div className="card-subtitle">{c.subtitle}</div>
                </button>
              ))}
            </div>

            {/* RIGHT: prompt composer + output */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div className="panel">
                <div className="panel-head">
                  <span>Prompt Composer</span>
                  <span className="tag">
                    {buildType.toUpperCase()}
                    {kindKey ? ` / ${kindKey.toUpperCase()}` : ""}
                  </span>
                </div>
                <div className="composer">
                  <textarea
                    ref={composerRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Your full request goes here (multi-line). Clicking cards will seed this composer."
                  />
                  <div className="btnrow">
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setPrompt("");
                        setKindKey("");
                        setStage("root");
                      }}
                      disabled={isLoading}
                      type="button"
                    >
                      Reset
                    </button>
                    <button className="btn" onClick={handleSubmit as any} disabled={!prompt.trim() || isLoading} type="button">
                      {isLoading ? "MANIFESTING…" : "Initialize"}
                    </button>
                  </div>

                  <div style={{ marginTop: ".9rem" }} className="quickbar">
                    <input
                      ref={quickRef}
                      value={quick}
                      onChange={(e) => setQuick(e.target.value)}
                      placeholder="Quick add (single line) — press Enter to append"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          pushQuickIntoPrompt();
                        }
                      }}
                    />
                    <button className="btn" type="button" onClick={pushQuickIntoPrompt} disabled={!quick.trim() || isLoading}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {showOut && (
                <div className="panel">
                  <div className="panel-head">
                    <span>System.Out</span>
                    <span className="tag">{isLoading ? "RUNNING" : "READY"}</span>
                  </div>
                  <div className="out">
                    {systemOut || (isLoading ? "Working…" : "—")}
                    <span className="animate-blink" style={{ marginLeft: 8, display: "inline-block", width: 6, height: 16, background: "var(--cyan)", verticalAlign: "middle" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}