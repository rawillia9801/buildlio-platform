"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Oxanium, Share_Tech_Mono } from "next/font/google";

/* ✅ Vercel/Next-safe font loading */
const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
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
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  hue: number;
};

type BuildType = "website" | "agent" | "store" | "document" | "app" | "other";
type Stage = "root" | "documentKind" | "websiteKind" | "agentKind" | "storeKind" | "appKind";
type KindStage = Exclude<Stage, "root">;

type Card = {
  key: string;
  title: string;
  subtitle: string;
  buildType: BuildType;
  next?: Stage;
};

/* ─────────────────────── PERSISTENCE ─────────────────────── */
type PersistedState = {
  v: number;
  sid: string;
  introComplete: boolean;
  stage: Stage;
  buildType: BuildType;
  draft: string;
  showResponse: boolean;
  streamText: string;
  lastInputSent: string;
};

const STORAGE_PREFIX = "buildlio:nexus:v1:";
const PERSIST_VERSION = 1;

function makeSid() {
  // short, URL-safe
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ─────────────────────── PARTICLE FIELD ─────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    let raf: number | null = null;
    let W = 0;
    let H = 0;

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 90;

    // ✅ High-DPI scaling
    function resize() {
      if (!canvasEl || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;

      canvasEl.width = W * dpr;
      canvasEl.height = H * dpr;

      // Reset transform before scaling (prevents cumulative scaling on resize)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener("resize", resize);

    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.1,
        hue: Math.random() > 0.5 ? 185 : 270,
      });
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,245,255,${(1 - d / 120) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Dots
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/* ─────────────────────── HOLOGRAPHIC CORE ─────────────────────── */
function HoloCore({ activated }: { activated: boolean }) {
  return (
    <div className="holo-wrap">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`scanner-ring sr-${i}`} />
      ))}

      <div className="hex-frame">
        <svg viewBox="0 0 200 200" width="200" height="200">
          <polygon
            points="100,10 185,55 185,145 100,190 15,145 15,55"
            fill="none"
            stroke="rgba(0,245,255,0.35)"
            strokeWidth="1"
            strokeDasharray="8 4"
            className="hex-spin"
          />
          <polygon
            points="100,25 172,66 172,134 100,175 28,134 28,66"
            fill="none"
            stroke="rgba(168,85,247,0.25)"
            strokeWidth="0.5"
            strokeDasharray="4 8"
            className="hex-spin-rev"
          />
        </svg>
      </div>

      <div className={`core-sphere ${activated ? "live" : ""}`}>
        <div className="sphere-glow" />
        <div className="sphere-inner">
          <div className="sphere-eye" />
        </div>
        <div className="equator" />
        <div className="meridian" />
      </div>

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`orb-dot od-${i}`} />
      ))}

      <svg className="data-arcs" viewBox="0 0 300 300" width="300" height="300">
        <circle
          cx="150"
          cy="150"
          r="120"
          fill="none"
          stroke="rgba(0,245,255,0.15)"
          strokeWidth="1"
          strokeDasharray="20 8"
          className="arc-spin"
        />
        <circle
          cx="150"
          cy="150"
          r="100"
          fill="none"
          stroke="rgba(168,85,247,0.2)"
          strokeWidth="1"
          strokeDasharray="12 16"
          className="arc-spin-rev"
        />
        <circle
          cx="150"
          cy="150"
          r="80"
          fill="none"
          stroke="rgba(0,245,255,0.1)"
          strokeWidth="0.5"
          strokeDasharray="6 20"
          className="arc-spin"
        />
      </svg>

      {["tl", "tr", "bl", "br"].map((pos) => (
        <div key={pos} className={`bracket br-${pos}`} />
      ))}
    </div>
  );
}

/* ─────────────────────── SCANLINE TEXT ─────────────────────── */
function ScanText({ text, done }: { text: string; done: boolean }) {
  return (
    <div className="scan-text-wrap">
      <div className="scan-text">
        {text}
        <span className={`cursor-blink ${done ? "hidden" : ""}`}>█</span>
      </div>
      <div className="scan-overlay" />
    </div>
  );
}

/* ─────────────────────── INTRO SEQUENCE ─────────────────────── */
const BOOT_SEQ: string[] = [
  "INITIALIZING NEURAL SUBSTRATE...",
  "LOADING COGNITIVE ARCHITECTURE v9.0...",
  "CALIBRATING QUANTUM INFERENCE ENGINE...",
  "ESTABLISHING SECURE UPLINK...",
  "SYNCHRONIZING KNOWLEDGE LATTICE...",
  "ALL SYSTEMS NOMINAL. BUILDLIO ONLINE.",
];

const FULL_TEXT =
  "Hi. I'm Buildlio.\n\nA high-intelligence platform engineered to execute\ncomplex, ambitious visions with precision and speed.\n\nWhat extraordinary system shall we build today?";

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [bootLines, setBootLines] = useState<string[]>([]);

  useEffect(() => {
    let lineIdx = 0;
    const bootInterval = setInterval(() => {
      setBootLines((prev) => [...prev, BOOT_SEQ[lineIdx]]);
      lineIdx++;
      if (lineIdx >= BOOT_SEQ.length) {
        clearInterval(bootInterval);
        setTimeout(() => setPhase(1), 400);
      }
    }, 220);
    return () => clearInterval(bootInterval);
  }, []);

  useEffect(() => {
    if (phase !== 2) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i < FULL_TEXT.length) {
        setText((prev) => prev + FULL_TEXT.charAt(i));
        i++;
      } else {
        clearInterval(iv);
        setPhase(3);
        setTimeout(onComplete, 1800);
      }
    }, 28);
    return () => clearInterval(iv);
  }, [phase, onComplete]);

  useEffect(() => {
    if (phase === 1) {
      setTimeout(() => setPhase(2), 1400);
    }
  }, [phase]);

  return (
    <div className="intro-shell">
      <div className={`boot-terminal ${phase >= 1 ? "boot-exit" : ""}`}>
        <div className="boot-header">
          <span className="boot-tag">BUILDLIO CORE</span>
          <span className="boot-ver">v9.0.0-NEURAL</span>
        </div>
        {bootLines.map((line, i) => (
          <div key={i} className="boot-line" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="boot-prompt">›</span> {line}
          </div>
        ))}
        {phase === 0 && <div className="boot-cursor" />}
      </div>

      <div className={`intro-main ${phase >= 1 ? "intro-visible" : ""}`}>
        <HoloCore activated={phase >= 1} />
        {phase >= 2 && (
          <div className="intro-taglines">
            <div className="intro-badge">NEURAL LINK ESTABLISHED</div>
            <ScanText text={text} done={phase === 3} />
          </div>
        )}
      </div>

      <div className="hud-corner hud-tl">SECTOR 01 • ACTIVE</div>
      <div className="hud-corner hud-tr">LAT: 37.7° • LON: -122.4°</div>
      <div className="hud-corner hud-bl">UPTIME: {phase >= 1 ? "LIVE" : "INIT"}</div>
      <div className="hud-corner hud-br">ENC: AES-512-QKD</div>
    </div>
  );
}

/* ─────────────────────── ICONS & DATA ─────────────────────── */
const CARD_ICONS: Record<string, string> = {
  website: "⬡",
  agent: "◈",
  store: "◎",
  document: "▣",
  app: "⬢",
  other: "◇",
};

/* ─────────────────────── MAIN PAGE ─────────────────────── */
export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Workspace/session id in URL (prevents “starts over”)
  const sid = useMemo(() => {
    const urlSid = searchParams?.get("sid");
    return urlSid && urlSid.trim().length >= 6 ? urlSid : "";
  }, [searchParams]);

  const [introComplete, setIntroComplete] = useState<boolean>(false);
  const [fadeOut, setFadeOut] = useState<boolean>(false);

  const [stage, setStage] = useState<Stage>("root");
  const [buildType, setBuildType] = useState<BuildType>("website");
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState<number>(0);

  // IMPORTANT: “draft” is what user types. “streamText” is output.
  const [draft, setDraft] = useState<string>("");
  const [lastInputSent, setLastInputSent] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResponse, setShowResponse] = useState<boolean>(false);
  const [streamText, setStreamText] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Ensure URL has sid once app boots
  useEffect(() => {
    if (!searchParams) return;
    if (sid) return;
    const newSid = makeSid();
    router.replace(`/?sid=${encodeURIComponent(newSid)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, router, searchParams]);

  // Load persisted state
  useEffect(() => {
    if (!sid) return;
    const key = STORAGE_PREFIX + sid;
    const saved = safeParse<PersistedState>(localStorage.getItem(key));
    if (!saved || saved.v !== PERSIST_VERSION) return;

    setIntroComplete(saved.introComplete);
    setStage(saved.stage);
    setBuildType(saved.buildType);
    setDraft(saved.draft);
    setShowResponse(saved.showResponse);
    setStreamText(saved.streamText);
    setLastInputSent(saved.lastInputSent || "");
    // stageKey forces grid re-anim without wiping
    setStageKey((k) => k + 1);
  }, [sid]);

  // Persist state on changes
  useEffect(() => {
    if (!sid) return;
    const key = STORAGE_PREFIX + sid;
    const payload: PersistedState = {
      v: PERSIST_VERSION,
      sid,
      introComplete,
      stage,
      buildType,
      draft,
      showResponse,
      streamText,
      lastInputSent,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [sid, introComplete, stage, buildType, draft, showResponse, streamText, lastInputSent]);

  const rootCards: Card[] = [
    {
      key: "website",
      title: "Build a Website",
      subtitle: "Precision-crafted digital experiences that captivate and convert at scale.",
      buildType: "website",
      next: "websiteKind",
    },
    {
      key: "agent",
      title: "Create an AI Agent",
      subtitle: "Autonomous intelligence for operations, support, sales, and strategic analysis.",
      buildType: "agent",
      next: "agentKind",
    },
    {
      key: "store",
      title: "Launch an Online Store",
      subtitle: "Conversion-optimized commerce with enterprise-grade checkout systems.",
      buildType: "store",
      next: "storeKind",
    },
    {
      key: "document",
      title: "Generate a Document",
      subtitle: "Architecturally perfect contracts, proposals, and technical specifications.",
      buildType: "document",
      next: "documentKind",
    },
    {
      key: "app",
      title: "Build a Web App",
      subtitle: "Sophisticated dashboards, internal tools, and workflow automation engines.",
      buildType: "app",
      next: "appKind",
    },
    {
      key: "other",
      title: "Something Else",
      subtitle: "A truly custom system. Describe your vision and I'll engineer it precisely.",
      buildType: "other",
    },
  ];

  const kindCards: Record<KindStage, Card[]> = {
    documentKind: [
      { key: "doc_personal", title: "Personal", subtitle: "Letters, agreements, creative briefs — executed with precision.", buildType: "document" },
      { key: "doc_business", title: "Business", subtitle: "SOPs, proposals, investor decks — professionally structured.", buildType: "document" },
      { key: "doc_legal", title: "Legal", subtitle: "Contracts, terms, compliance documents — airtight and clear.", buildType: "document" },
      { key: "doc_marketing", title: "Marketing", subtitle: "Campaign assets, pitch decks, product messaging.", buildType: "document" },
      { key: "doc_other", title: "Other", subtitle: "Any document you need engineered to perfection.", buildType: "document" },
    ],
    websiteKind: [
      { key: "site_personal", title: "Personal", subtitle: "Portfolios, bios, and digital presences that command attention.", buildType: "website" },
      { key: "site_business", title: "Business", subtitle: "Corporate sites engineered for trust, leads, and growth.", buildType: "website" },
      { key: "site_landing", title: "Landing Page", subtitle: "High-conversion experiences with pixel-perfect design.", buildType: "website" },
      { key: "site_portal", title: "Customer Portal", subtitle: "Secure, intuitive client and team workspaces.", buildType: "website" },
      { key: "site_other", title: "Other", subtitle: "Any website architecture you can imagine.", buildType: "website" },
    ],
    agentKind: [
      { key: "agent_secretary", title: "Secretary (Ops)", subtitle: "Proactive scheduling, reminders, and execution intelligence.", buildType: "agent" },
      { key: "agent_support", title: "Customer Support", subtitle: "24/7 intelligent resolution with escalation intelligence.", buildType: "agent" },
      { key: "agent_sales", title: "Sales Assistant", subtitle: "Autonomous lead qualification and pipeline acceleration.", buildType: "agent" },
      { key: "agent_inventory", title: "Inventory Manager", subtitle: "Real-time supply chain intelligence and optimization.", buildType: "agent" },
      { key: "agent_other", title: "Other", subtitle: "Any specialized intelligence role you require.", buildType: "agent" },
    ],
    storeKind: [
      { key: "store_products", title: "Products Store", subtitle: "High-conversion ecommerce with advanced checkout flows.", buildType: "store" },
      { key: "store_services", title: "Services + Payments", subtitle: "Booking, invoicing, and recurring revenue systems.", buildType: "store" },
      { key: "store_subscriptions", title: "Subscriptions", subtitle: "Membership platforms with intelligent tier management.", buildType: "store" },
      { key: "store_marketplace", title: "Marketplace", subtitle: "Multi-channel fulfillment and inventory synchronization.", buildType: "store" },
      { key: "store_other", title: "Other", subtitle: "Any commerce architecture you envision.", buildType: "store" },
    ],
    appKind: [
      { key: "app_dashboard", title: "Dashboard", subtitle: "Real-time analytics and command centers.", buildType: "app" },
      { key: "app_crm", title: "CRM / Pipeline", subtitle: "Intelligent sales and relationship management.", buildType: "app" },
      { key: "app_inventory", title: "Inventory System", subtitle: "Enterprise-grade tracking and forecasting.", buildType: "app" },
      { key: "app_portal", title: "Client Portal", subtitle: "Secure, beautiful collaboration environments.", buildType: "app" },
      { key: "app_other", title: "Other", subtitle: "Any custom internal or external application.", buildType: "app" },
    ],
  };

  const cards: Card[] = stage === "root" ? rootCards : kindCards[stage as KindStage];

  const stageTitle: Record<Stage, string> = {
    root: "What ambitious system shall we construct together?",
    documentKind: "What document architecture do you need engineered?",
    websiteKind: "What kind of website shall we architect?",
    agentKind: "What role should your autonomous intelligence fulfill?",
    storeKind: "What commerce system are we deploying?",
    appKind: "What powerful application shall we build?",
  };

  function handleCardClick(card: Card) {
    setPressedKey(card.key);
    setBuildType(card.buildType);

    setTimeout(() => {
      setPressedKey(null);

      if (card.next) {
        setStage(card.next);
        setStageKey((k) => k + 1);
        setTimeout(() => inputRef.current?.focus(), 160);
      } else {
        // Seed as DRAFT (not output)
        setDraft((prev) => (prev.trim().length ? prev : seedFromSelection(card)));
        setTimeout(() => inputRef.current?.focus(), 120);
      }
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.trim() || isLoading) return;

    setIsLoading(true);
    setShowResponse(true);
    setStreamText("");
    setLastInputSent(draft);

    const systemPrompt = `You are Buildlio — an ultra-high-intelligence AI platform specializing in architecting, analyzing, and delivering world-class digital systems.
IMPORTANT: Output must be directly useful. Avoid generic essays. Follow the user's request precisely.`;

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: draft }],
        }),
      });

      const data: { text?: string; error?: string } = await res.json();
      const full = data.text || data.error || "Neural link established. Processing...";

      let i = 0;
      const iv = setInterval(() => {
        if (i < full.length) {
          setStreamText(full.slice(0, i + 1));
          i += 3;
        } else {
          setStreamText(full);
          clearInterval(iv);
          setIsLoading(false);
        }
      }, 12);
    } catch {
      setStreamText("Neural link disrupted. Please verify API connectivity and retry.");
      setIsLoading(false);
    }
  }

  const handleIntroComplete = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      setIntroComplete(true);
      setFadeOut(false);
    }, 700);
  }, []);

  return (
    <main className={`bl-root ${oxanium.variable} ${shareTechMono.variable}`}>
      <style jsx global>{`
        /* (your styles unchanged, except small additions at bottom) */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --c: #00f5ff;
          --v: #a855f7;
          --g: #22ff88;
          --bg: #04040c;
          --s1: #0a0a1a;
          --s2: #0f1729;
          --text: #e8f4ff;
          --muted: #7a9bb5;
          --border: rgba(0,245,255,0.2);
        }

        body { background: var(--bg); }

        .bl-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans), sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        .bl-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 1;
        }

        .bl-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,0.06) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0,245,255,0.04) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        /* HUD additions */
        .hud-btn {
          border: 1px solid rgba(0,245,255,0.25);
          background: rgba(0,245,255,0.04);
          color: rgba(0,245,255,0.85);
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 2px;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hud-btn:hover { border-color: var(--c); color: var(--c); box-shadow: 0 0 24px rgba(0,245,255,0.18); }

        .mini-actions { display:flex; gap:10px; align-items:center; }

        .clear-btn {
          border: 1px solid rgba(0,245,255,0.22);
          background: rgba(0,245,255,0.03);
          color: rgba(122,155,181,0.95);
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 2px;
          padding: 12px 14px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover { border-color: rgba(0,245,255,0.45); color: var(--c); }

        /* keep the rest of your original CSS here (unchanged) */
      `}</style>

      <ParticleField />

      {!introComplete ? (
        <IntroSequence onComplete={handleIntroComplete} />
      ) : (
        <>
          <div className="bl-hud">
            <div className="status-pip" />
            <span className="hud-brand">BUILDLIO</span>
            <span className="hud-sep">•</span>
            <span style={{ color: "rgba(0,245,255,0.5)", fontSize: 11, letterSpacing: "1px" }}>
              NEURAL CORE ONLINE
            </span>

            <div className="hud-meta">
              <span>
                <span className="hud-tag">MODE:</span>
                <span className="hud-val">{buildType.toUpperCase()}</span>
              </span>
              <span>
                <span className="hud-tag">SYS:</span>
                <span className="hud-val">v9.0 • ACTIVE</span>
              </span>

              {/* Auth placeholder (wire later to /login) */}
              <div className="mini-actions">
                <button
                  type="button"
                  className="hud-btn"
                  onClick={() => router.push("/login")}
                  title="Login / Signup (wire this route next)"
                >
                  LOGIN
                </button>
              </div>
            </div>
          </div>

          <div className="bl-wrap">
            <div className="bl-stage-shell">
              <div className="stage-top">
                <div className="stage-breadcrumb">
                  {stage === "root" ? "NEXUS://ROOT" : `NEXUS:// ${stage.replace("Kind", "").toUpperCase()}`}
                </div>
                {stage !== "root" && (
                  <button
                    className="stage-back"
                    onClick={() => {
                      // IMPORTANT: don't wipe draft/output; only change stage
                      setStage("root");
                      setStageKey((k) => k + 1);
                      setTimeout(() => inputRef.current?.focus(), 120);
                    }}
                    type="button"
                  >
                    ← RETURN TO NEXUS
                  </button>
                )}
              </div>
              <div className="stage-body">
                <div className="stage-title">{stageTitle[stage]}</div>
                <div className="stage-sub">
                  Select a module to configure, or describe your exact vision in the command interface below.
                </div>
              </div>
            </div>

            <div key={stageKey} className="bl-grid">
              {cards.map((c) => (
                <button
                  key={c.key}
                  className={`bl-card ${pressedKey === c.key ? "pressed" : ""}`}
                  type="button"
                  onClick={() => handleCardClick(c)}
                >
                  <div className="card-top">
                    <div className="card-icon">{CARD_ICONS[c.buildType] || "◉"}</div>
                    <span className="card-title">{c.title}</span>
                    {c.next && <span className="card-arrow">›</span>}
                  </div>
                  <div className="card-body">
                    <div className="card-sub">{c.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>

            {showResponse && (
              <div className="response-panel">
                <div className="response-top">
                  <div className="response-dot" />
                  <div className="response-label">BUILDLIO NEURAL OUTPUT</div>
                  {isLoading && (
                    <div className="thinking-dots" style={{ marginLeft: "auto" }}>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
                <div className="response-body">
                  {streamText || " "}
                  {isLoading && <span style={{ color: "var(--c)" }}>█</span>}
                </div>
              </div>
            )}
          </div>

          <form className="bl-command-bar" onSubmit={handleSubmit}>
            <div className="command-inner">
              <span className="command-prompt">›</span>

              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Describe the complex system you want to architect..."
                className="command-input"
                disabled={isLoading}
                type="text"
              />

              <button
                type="button"
                className="clear-btn"
                onClick={() => setDraft("")}
                disabled={isLoading || !draft.trim()}
                title="Clear draft prompt"
              >
                CLEAR
              </button>

              <button className="command-btn" type="submit" disabled={!draft.trim() || isLoading}>
                {isLoading ? "PROCESSING..." : "EXECUTE ⚡"}
              </button>
            </div>
          </form>
        </>
      )}

      {fadeOut && <div className="fade-veil" />}
    </main>
  );
}

function seedFromSelection(card: Pick<Card, "buildType">) {
  if (card.buildType === "document")
    return "Engineer a professional document. Specify: purpose, target audience, tone, and required sections.";
  if (card.buildType === "agent")
    return "Design an autonomous AI agent. Define: primary mission, available tools, escalation triggers, and critical guardrails.";
  if (card.buildType === "website")
    return "Architect a website. Specify: personal or enterprise scope, key pages, performance targets, and desired aesthetic.";
  if (card.buildType === "store")
    return "Deploy an ecommerce system. Define: product type, fulfillment model, payment methods, and compliance requirements.";
  if (card.buildType === "app")
    return "Build a web application. Define: target users, core workflows, data requirements, and integration needs.";
  return "Describe your vision in full detail. I am ready to architect something extraordinary.";
}