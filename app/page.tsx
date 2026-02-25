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
type Stage = "root" | "documentKind" | "websiteKind" | "agentKind" | "storeKind" | "appKind";
type KindStage = Exclude<Stage, "root">;

type Card = {
  key: string; // also used as kindKey for second-stage choices
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
  // pages?: any[]; // not needed for rendering text panel here
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

/* ─────────────────────── AETHER LATTICE (Background) ─────────────────────── */
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // FIX: avoid cumulative scaling on resize
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
  "SUPERINTELLIGENCE v∞ ONLINE",
  "I AM BUILDLIO — THE APEX OF POSSIBILITY",
];

const MANIFESTO = `I am Buildlio.\n\nYour intent becomes structure.\nYour structure becomes output.\n\nChoose what you want built.\nThen declare your requirements.\n\nI will manifest a complete result.`;

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
        window.setTimeout(() => setPhase(1), 900);
      }
    }, 320);
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
        window.setTimeout(() => setPhase(2), 1200);
        window.setTimeout(onComplete, 1800);
      }
    }, 20);
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
        className={`transition-all duration-1000 ease-in-out ${
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
  {
    key: "website",
    title: "Build a Website",
    subtitle: "Modern, fast, beautiful websites that actually convert visitors into customers.",
    buildType: "website",
    next: "websiteKind",
  },
  {
    key: "agent",
    title: "Create an AI Agent",
    subtitle: "Agents that handle support, sales, operations, or other internal workflows.",
    buildType: "agent",
    next: "agentKind",
  },
  {
    key: "store",
    title: "Launch an Online Store",
    subtitle: "Ecommerce storefronts with strong structure and clean merchandising.",
    buildType: "store",
    next: "storeKind",
  },
  {
    key: "document",
    title: "Generate a Document",
    subtitle: "Contracts, policies, agreements, proposals, and formal documents.",
    buildType: "document",
    next: "documentKind",
  },
  {
    key: "app",
    title: "Build a Web App",
    subtitle: "Dashboards, portals, tools, internal apps, and structured application shells.",
    buildType: "app",
    next: "appKind",
  },
  {
    key: "other",
    title: "Something Else",
    subtitle: "Describe exactly what you need and it will be structured correctly.",
    buildType: "other",
  },
];

const kindCards: Record<KindStage, Card[]> = {
  documentKind: [
    { key: "doc_personal", title: "Personal Documents", subtitle: "Letters, agreements, or personal paperwork.", buildType: "document" },
    { key: "doc_business", title: "Business Documents", subtitle: "Proposals, SOPs, reports, or internal docs.", buildType: "document" },
    { key: "doc_legal", title: "Legal Documents", subtitle: "Contracts, terms, policies, compliance documents.", buildType: "document" },
    { key: "doc_marketing", title: "Marketing Documents", subtitle: "Pitch decks, briefs, structured copy packs.", buildType: "document" },
    { key: "doc_other", title: "Any Other Document", subtitle: "Describe what you need.", buildType: "document" },
  ],
  websiteKind: [
    { key: "site_personal", title: "Personal / Portfolio", subtitle: "Showcase yourself or your work.", buildType: "website" },
    { key: "site_business", title: "Business / Corporate", subtitle: "Professional company website.", buildType: "website" },
    { key: "site_landing", title: "Landing Page", subtitle: "High-converting single page.", buildType: "website" },
    { key: "site_portal", title: "Client / Team Portal", subtitle: "Secure portal structure.", buildType: "website" },
    { key: "site_other", title: "Any Other Website", subtitle: "Describe your idea.", buildType: "website" },
  ],
  agentKind: [
    { key: "agent_secretary", title: "Executive Assistant", subtitle: "Scheduling, reminders, operations.", buildType: "agent" },
    { key: "agent_support", title: "Customer Support", subtitle: "Helpdesk, triage, response drafts.", buildType: "agent" },
    { key: "agent_sales", title: "Sales Assistant", subtitle: "Lead handling and follow-up.", buildType: "agent" },
    { key: "agent_inventory", title: "Inventory Manager", subtitle: "Stock tracking and ordering.", buildType: "agent" },
    { key: "agent_other", title: "Custom Agent", subtitle: "Any role you need.", buildType: "agent" },
  ],
  storeKind: [
    { key: "store_products", title: "Product Store", subtitle: "Physical or digital products.", buildType: "store" },
    { key: "store_services", title: "Service Business", subtitle: "Booking and payments.", buildType: "store" },
    { key: "store_subscriptions", title: "Subscription Site", subtitle: "Memberships or SaaS.", buildType: "store" },
    { key: "store_marketplace", title: "Marketplace", subtitle: "Multi-vendor structure.", buildType: "store" },
    { key: "store_other", title: "Any Other Store", subtitle: "Describe your store idea.", buildType: "store" },
  ],
  appKind: [
    { key: "app_dashboard", title: "Analytics Dashboard", subtitle: "Reports and KPIs.", buildType: "app" },
    { key: "app_crm", title: "CRM / Sales Tool", subtitle: "Leads and pipeline.", buildType: "app" },
    { key: "app_inventory", title: "Inventory System", subtitle: "Stock and alerts.", buildType: "app" },
    { key: "app_portal", title: "Client Portal", subtitle: "Authenticated portal.", buildType: "app" },
    { key: "app_other", title: "Any Other App", subtitle: "Describe the app.", buildType: "app" },
  ],
};

/* ─────────────────────── MAIN PAGE ─────────────────────── */
export default function NexusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefer an actual project UUID if you have one in your app:
  // use ?projectId=... (or ?pid=...)
  const projectId = useMemo(() => {
    const v = searchParams?.get("projectId") || searchParams?.get("pid") || "";
    return v.trim();
  }, [searchParams]);

  // Keep sid for UI identity; not used for DB charging (DB expects UUID)
  const sid = useMemo(() => searchParams?.get("sid") || "", [searchParams]);

  const [introComplete, setIntroComplete] = useState(false);
  const [stage, setStage] = useState<Stage>("root");
  const [buildType, setBuildType] = useState<BuildType>("website");
  const [kindKey, setKindKey] = useState<string>("");

  const [draft, setDraft] = useState("");
  const [streamText, setStreamText] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sid) router.replace(`/?sid=nxs-${Date.now()}`);
  }, [sid, router]);

  const cards: Card[] = stage === "root" ? rootCards : kindCards[stage as KindStage] || [];

  const stageTitle: Record<Stage, string> = {
    root: "WHAT WOULD YOU LIKE TO BUILD TODAY?",
    documentKind: "SELECT DOCUMENT TYPE",
    websiteKind: "SELECT WEBSITE TYPE",
    agentKind: "SELECT AGENT TYPE",
    storeKind: "SELECT STORE TYPE",
    appKind: "SELECT APP TYPE",
  };

  const seedDraftFor = (bt: BuildType, kk: string) => {
    if (bt === "document") {
      if (kk === "doc_legal") {
        return `Draft a complete legal agreement.\n\nRequirements:\n- Document type: [choose: Terms of Service / Contract / Agreement]\n- Parties: [Company/Person] and [Customer/Client]\n- Scope: ...\n- Payment terms (if applicable): ...\n- Governing law: Virginia, USA\n- Include signatures block\n\nWrite the full document.`;
      }
      if (kk) return `Create a complete ${kk.replace(/_/g, " ")}.\n\nDescribe the purpose, parties, scope, and any key clauses.`;
      return `Create a professional document.\n\nDescribe what it is, who it's for, and any required clauses.`;
    }

    // Non-document defaults
    if (bt === "website") return `Build a ${kk ? kk.replace(/_/g, " ") : "website"} for...\n\nGoals:\nAudience:\nSections:\nBrand tone:\nCTA:\n`;
    if (bt === "store") return `Build a ${kk ? kk.replace(/_/g, " ") : "store"} for...\n\nProducts:\nCheckout needs:\nBrand tone:\n`;
    if (bt === "app") return `Build a ${kk ? kk.replace(/_/g, " ") : "web app"}.\n\nCore features:\nUsers:\nPages:\n`;
    if (bt === "agent") return `Create a ${kk ? kk.replace(/_/g, " ") : "smart agent"}.\n\nRole:\nInputs:\nOutputs:\nRules:\n`;
    return `Build this:\n\nDescribe exactly what you need.`;
  };

  const handleCardClick = (card: Card) => {
    setPressedKey(card.key);

    // If root card, it's a type selection
    if (stage === "root") {
      setBuildType(card.buildType);
      setKindKey("");
    } else {
      // Second-stage cards represent the "kindKey"
      setKindKey(card.key);
    }

    window.setTimeout(() => {
      setPressedKey(null);

      if (card.next) {
        // Move deeper (root -> kind stage)
        setStage(card.next);
        setStageKey((k) => k + 1);
      } else {
        // Selecting a kind card: seed draft if empty
        setDraft((prev) => (prev.trim() ? prev : seedDraftFor(card.buildType, card.key)));
      }

      window.setTimeout(() => inputRef.current?.focus(), 120);
    }, 220);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isLoading) return;

    setIsLoading(true);
    setShowResponse(true);
    setStreamText("");

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined, // optional; only persists if UUID + auth
          buildType,
          kindKey: kindKey || undefined,
          messages: [{ role: "user", content: draft }],
        }),
      });

      const env: ApiEnvelope = await res.json();

      if (!env.success) {
        const msg = env.error || "Request failed.";
        setStreamText(msg);
        setIsLoading(false);
        return;
      }

      const payload = env.data;

      // Render documents cleanly
      if (payload?.snapshot?.buildType === "document") {
        const doc = payload.snapshot.documents?.[0];
        const content =
          doc?.content ||
          payload.snapshot.files?.["RAW_OUTPUT.txt"] ||
          payload.message ||
          "No document content returned.";

        const header = doc?.title ? `${doc.title}\n\n` : "";
        const meta =
          env.warning
            ? `⚠ ${env.warning}\n\n`
            : env.persisted === false && projectId
            ? `⚠ Not persisted (missing auth or persistence failed).\n\n`
            : "";

        const fullText = `${meta}${header}${content}`;
        typeWriter(fullText);
        return;
      }

      // Non-document: show message + dominion + (optional) warning
      const txt =
        [
          env.warning ? `⚠ ${env.warning}` : "",
          payload?.dominionName ? `${payload.dominionName}` : "",
          payload?.message ? `${payload.message}` : "",
        ]
          .filter(Boolean)
          .join("\n\n") || "Generation complete.";

      typeWriter(txt);
    } catch {
      typeWriter("Link disrupted. Please re-transmit.");
    } finally {
      // typeWriter handles loading end when finished
    }
  }

  const typeWriter = (full: string) => {
    let i = 0;
    const speed = 6; // smaller = faster
    const iv = window.setInterval(() => {
      setStreamText(full.slice(0, i + 1));
      i += 2;
      if (i >= full.length) {
        setStreamText(full);
        window.clearInterval(iv);
        setIsLoading(false);
      }
    }, speed);
  };

  return (
    <main className={`nexus-root ${oxanium.variable} ${shareTechMono.variable} font-sans`}>
      <style jsx global>{`
        :root {
          --cyan: #00f9ff;
          --magenta: #c026d3;
          --glass: rgba(10, 15, 35, 0.4);
          --glass-border: rgba(0, 249, 255, 0.15);
        }

        body,
        html {
          margin: 0;
          padding: 0;
          background: #020208;
          color: #e8f4ff;
        }

        .nexus-root {
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          background: radial-gradient(circle at 50% 0%, #0a1128 0%, #020208 70%);
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(0, 249, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 40px rgba(0, 249, 255, 0.5);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(0, 249, 255, 0.4);
        }

        .hud {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 4rem;
          background: linear-gradient(180deg, rgba(2, 2, 8, 0.9) 0%, transparent 100%);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 249, 255, 0.1);
        }

        .hud-brand {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: 12px;
          color: #fff;
          text-shadow: 0 0 20px var(--cyan);
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .hud-brand::before {
          content: "";
          display: block;
          width: 12px;
          height: 12px;
          background: var(--cyan);
          border-radius: 50%;
          box-shadow: 0 0 15px var(--cyan);
        }

        .neural-login-btn {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          letter-spacing: 2px;
          padding: 0.6rem 1.5rem;
          border: 1px solid var(--glass-border);
          background: rgba(0, 249, 255, 0.05);
          color: var(--cyan);
          border-radius: 4px;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }
        .neural-login-btn:hover {
          background: var(--cyan);
          color: #000;
          box-shadow: 0 0 20px var(--cyan);
        }

        .stage-header {
          padding: 8rem 3rem 3rem;
          text-align: center;
          position: relative;
          z-index: 10;
        }
        .stage-title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 6px;
          text-transform: uppercase;
          color: #fff;
          background: linear-gradient(90deg, #fff, var(--cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(0, 249, 255, 0.3);
        }

        .holo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 2rem;
          padding: 0 4rem 10rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .holo-card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .holo-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 249, 255, 0.1), transparent);
          transform: skewX(-20deg);
          transition: 0.5s;
        }

        .holo-card:hover {
          border-color: var(--cyan);
          box-shadow: 0 15px 40px -10px rgba(0, 249, 255, 0.3), inset 0 0 20px rgba(0, 249, 255, 0.05);
          transform: translateY(-8px);
        }

        .holo-card:hover::before {
          left: 200%;
        }

        .holo-card:active,
        .holo-card.pressed {
          transform: scale(0.97);
          border-color: var(--magenta);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 1.5rem;
          color: var(--cyan);
          filter: drop-shadow(0 0 10px rgba(0, 249, 255, 0.5));
          transition: all 0.3s;
        }
        .holo-card:hover .card-icon {
          color: #fff;
          transform: scale(1.1);
          filter: drop-shadow(0 0 15px var(--cyan));
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.8rem;
          color: #fff;
          letter-spacing: 1px;
        }
        .card-subtitle {
          font-size: 1rem;
          color: #8fa6c7;
          line-height: 1.6;
          font-family: var(--font-mono);
        }

        .command-nexus-wrapper {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 1000px;
          z-index: 300;
        }

        .command-nexus {
          background: rgba(3, 5, 15, 0.7);
          border: 1px solid rgba(0, 249, 255, 0.3);
          border-radius: 24px;
          padding: 0.8rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          animation: pulse-glow 4s infinite;
        }

        .neural-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 1rem 1.5rem;
          color: white;
          font-size: 1.2rem;
          outline: none;
          font-family: var(--font-sans);
          letter-spacing: 0.5px;
        }

        .neural-input::placeholder {
          color: rgba(143, 166, 199, 0.5);
        }

        .forge-btn {
          padding: 1.2rem 2.5rem;
          background: linear-gradient(135deg, var(--cyan) 0%, var(--magenta) 100%);
          color: #000;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 2px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(192, 38, 211, 0.4);
        }

        .forge-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(0, 249, 255, 0.6);
          color: #fff;
        }

        .forge-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
          box-shadow: none;
        }

        .response-panel {
          margin: 0 auto 12rem;
          max-width: 1000px;
          width: 90%;
          background: linear-gradient(180deg, rgba(10, 15, 35, 0.8) 0%, rgba(5, 8, 20, 0.9) 100%);
          border: 1px solid var(--cyan);
          border-radius: 16px;
          padding: 2.5rem;
          font-family: var(--font-mono);
          line-height: 1.8;
          box-shadow: 0 0 40px rgba(0, 249, 255, 0.15);
          position: relative;
          z-index: 10;
          font-size: 1.05rem;
          color: #d1e4ff;
          white-space: pre-wrap;
        }

        .response-panel::before {
          content: "SYSTEM.OUT";
          position: absolute;
          top: -12px;
          left: 30px;
          background: #020208;
          padding: 0 10px;
          color: var(--cyan);
          font-size: 0.8rem;
          letter-spacing: 3px;
          border: 1px solid var(--cyan);
          border-radius: 4px;
        }
      `}</style>

      <AetherLattice />

      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

      {!introComplete ? (
        <IntroSequence onComplete={() => setIntroComplete(true)} />
      ) : (
        <div>
          <nav className="hud">
            <div className="hud-brand">BUILDLIO</div>
            <button className="neural-login-btn" onClick={() => router.push("/login")}>
              Neural Login
            </button>
          </nav>

          <div className="stage-header">
            <h1 className="stage-title">{stageTitle[stage]}</h1>
          </div>

          <div key={stageKey} className="holo-grid" style={{ animation: "float 6s ease-in-out infinite" }}>
            {cards.map((c) => (
              <button
                key={c.key}
                className={`holo-card ${pressedKey === c.key ? "pressed" : ""}`}
                onClick={() => handleCardClick(c)}
              >
                <div className="card-icon">{(Icons as any)[c.buildType] || Icons.other}</div>
                <div className="card-title">{c.title}</div>
                <div className="card-subtitle">{c.subtitle}</div>
              </button>
            ))}
          </div>

          {showResponse && (
            <div className="response-panel">
              {streamText}
              <span className="animate-blink inline-block w-2 h-5 bg-cyan-400 ml-2 align-middle"></span>
            </div>
          )}

          <div className="command-nexus-wrapper">
            <form className="command-nexus" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Declare your requirements..."
                className="neural-input"
              />
              <button type="submit" className="forge-btn" disabled={!draft.trim() || isLoading}>
                {isLoading ? "MANIFESTING..." : "INITIALIZE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}