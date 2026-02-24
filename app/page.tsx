"use client";
import React, { useRef, useState, useEffect } from "react";

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

/* ─────────────────────── PARTICLE FIELD ─────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number | null = null;
    let W = 0;
    let H = 0;

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 90;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.1,
        hue: Math.random() > 0.5 ? 185 : 270,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // connections
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

      // dots
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
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

/* ─────────────────────── HOLOGRAPHIC CORE ─────────────────────── */
function HoloCore({ activated }: { activated: boolean }) {
  return (
    <div className="holo-wrap">
      {/* Outer scanner rings */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`scanner-ring sr-${i}`} />
      ))}

      {/* Hexagonal frame */}
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

      {/* Core sphere */}
      <div className={`core-sphere ${activated ? "live" : ""}`}>
        <div className="sphere-glow" />
        <div className="sphere-inner">
          <div className="sphere-eye" />
        </div>
        {/* Equatorial band */}
        <div className="equator" />
        {/* Meridian */}
        <div className="meridian" />
      </div>

      {/* Orbital dots */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`orb-dot od-${i}`} />
      ))}

      {/* Data arcs */}
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

      {/* Corner brackets */}
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
function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<number>(0); // 0=boot, 1=core, 2=type, 3=done
  const [text, setText] = useState<string>("");
  const [bootLines, setBootLines] = useState<string[]>([]);

  const bootSeq: string[] = [
    "INITIALIZING NEURAL SUBSTRATE...",
    "LOADING COGNITIVE ARCHITECTURE v9.0...",
    "CALIBRATING QUANTUM INFERENCE ENGINE...",
    "ESTABLISHING SECURE UPLINK...",
    "SYNCHRONIZING KNOWLEDGE LATTICE...",
    "ALL SYSTEMS NOMINAL. BUILDLIO ONLINE.",
  ];

  const fullText =
    "Hi. I'm Buildlio.\n\nA high-intelligence platform engineered to execute\ncomplex, ambitious visions with precision and speed.\n\nWhat extraordinary system shall we build today?";

  useEffect(() => {
    // Phase 0: boot lines
    let lineIdx = 0;
    const bootInterval = setInterval(() => {
      setBootLines((prev) => [...prev, bootSeq[lineIdx]]);
      lineIdx++;
      if (lineIdx >= bootSeq.length) {
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
      if (i < fullText.length) {
        setText((prev) => prev + fullText.charAt(i));
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
      <ParticleField />

      {/* Boot terminal — phase 0 */}
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

      {/* Core + text — phase 1+ */}
      <div className={`intro-main ${phase >= 1 ? "intro-visible" : ""}`}>
        <HoloCore activated={phase >= 1} />
        {phase >= 2 && (
          <div className="intro-taglines">
            <div className="intro-badge">NEURAL LINK ESTABLISHED</div>
            <ScanText text={text} done={phase === 3} />
          </div>
        )}
      </div>

      {/* Corner HUD elements */}
      <div className="hud-corner hud-tl">SECTOR 01 • ACTIVE</div>
      <div className="hud-corner hud-tr">LAT: 37.7° • LON: -122.4°</div>
      <div className="hud-corner hud-bl">UPTIME: {phase >= 1 ? "LIVE" : "INIT"}</div>
      <div className="hud-corner hud-br">ENC: AES-512-QKD</div>
    </div>
  );
}

/* ─────────────────────── ICONS ─────────────────────── */
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
  const [introComplete, setIntroComplete] = useState<boolean>(false);
  const [fadeOut, setFadeOut] = useState<boolean>(false);
  const [stage, setStage] = useState<Stage>("root");
  const [buildType, setBuildType] = useState<BuildType>("website");
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResponse, setShowResponse] = useState<boolean>(false);
  const [streamText, setStreamText] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);

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
        setInput(seedFromSelection(card));
        setTimeout(() => inputRef.current?.focus(), 120);
      }
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setShowResponse(true);
    setStreamText("");

    const systemPrompt = `You are Buildlio — an ultra-high-intelligence AI platform specializing in architecting, analyzing, and delivering world-class digital systems. You are building a ${buildType}.

Your personality:
- Exceptionally smart, precise, and authoritative
- Friendly, energizing, and collaborative — you make people feel capable
- You deliver complete, production-ready, correct outputs — never vague placeholders
- You think in systems: architecture first, then implementation details
- You proactively surface risks, optimizations, and opportunities the user hasn't thought of

When responding:
1. Begin with a crisp 1-sentence acknowledgment of what you're building
2. Provide a complete, detailed, actionable plan or output — no "lorem ipsum," no hand-waving
3. Include specific technical recommendations, stack choices, architecture patterns
4. End with 2-3 smart follow-up questions to refine the vision further

Format your response with clear sections using markdown headers. Be thorough but scannable.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: input }],
          stream: false,
        }),
      });

      const data = await res.json();
      const full: string = data.content?.[0]?.text || "Neural link established. Processing...";

      // Simulate streaming for effect
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

  const handleIntroComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      setIntroComplete(true);
      setFadeOut(false);
    }, 700);
  };

  return (
    <main className="bl-root">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;600;700;800&family=Share+Tech+Mono&display=swap');

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
          font-family: 'Oxanium', sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* ══════════════════════ GRID BACKGROUND ══════════════════════ */
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

        /* ══════════════════════ INTRO ══════════════════════ */
        .intro-shell {
          position: fixed;
          inset: 0;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          flex-direction: column;
          gap: 0;
        }

        /* Boot terminal */
        .boot-terminal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 640px;
          background: rgba(10,10,26,0.97);
          border: 1px solid rgba(0,245,255,0.3);
          border-radius: 12px;
          padding: 24px 28px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px;
          transition: opacity 0.6s ease, transform 0.6s ease;
          box-shadow: 0 0 80px rgba(0,245,255,0.08), inset 0 0 40px rgba(0,245,255,0.02);
        }
        .boot-terminal.boot-exit {
          opacity: 0;
          transform: translate(-50%, -54%) scale(0.96);
          pointer-events: none;
        }
        .boot-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,245,255,0.15);
        }
        .boot-tag { color: var(--c); font-weight: 700; letter-spacing: 3px; }
        .boot-ver { color: var(--muted); font-size: 11px; }
        .boot-line {
          color: var(--text);
          margin-bottom: 6px;
          opacity: 0;
          animation: bootFadeIn 0.3s ease forwards;
          line-height: 1.5;
        }
        .boot-line:last-child { color: var(--g); }
        .boot-prompt { color: var(--c); margin-right: 8px; }
        .boot-cursor {
          display: inline-block;
          width: 8px; height: 14px;
          background: var(--c);
          animation: cyberBlink 0.8s step-end infinite;
          vertical-align: middle;
          margin-left: 4px;
        }
        @keyframes bootFadeIn { to { opacity: 1; } }

        /* Main intro content */
        .intro-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 64px;
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.8s cubic-bezier(0.23,1,0.32,1), transform 0.8s cubic-bezier(0.23,1,0.32,1);
          pointer-events: none;
        }
        .intro-main.intro-visible {
          opacity: 1;
          transform: scale(1);
          pointer-events: all;
        }

        /* Holo Core */
        .holo-wrap {
          position: relative;
          width: 200px; height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .data-arcs {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .arc-spin { animation: spinCW 20s linear infinite; transform-origin: 150px 150px; }
        .arc-spin-rev { animation: spinCCW 14s linear infinite; transform-origin: 150px 150px; }
        @keyframes spinCW { to { transform: rotate(360deg); } }
        @keyframes spinCCW { to { transform: rotate(-360deg); } }

        .scanner-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(0,245,255,0.12);
          animation: scanPulse 4s ease-in-out infinite;
        }
        .sr-1 { inset: -20px; animation-delay: 0s; }
        .sr-2 { inset: -42px; animation-delay: 0.6s; }
        .sr-3 { inset: -66px; animation-delay: 1.2s; }
        .sr-4 { inset: -94px; animation-delay: 1.8s; }
        .sr-5 { inset: -126px; animation-delay: 2.4s; }
        @keyframes scanPulse {
          0%, 100% { opacity: 0.15; border-color: rgba(0,245,255,0.12); }
          50% { opacity: 0.5; border-color: rgba(0,245,255,0.3); }
        }

        .hex-frame {
          position: absolute;
          inset: -16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hex-spin { animation: spinCW 18s linear infinite; transform-origin: 100px 100px; }
        .hex-spin-rev { animation: spinCCW 12s linear infinite; transform-origin: 100px 100px; }

        .core-sphere {
          width: 120px; height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle at 38% 30%, #67e8f9 0%, #6366f1 45%, #1e0a3c 100%);
          box-shadow: 
            0 0 60px rgba(103,232,249,0.5),
            0 0 120px rgba(168,85,247,0.3),
            inset 0 0 50px rgba(255,255,255,0.08);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        .core-sphere.live { animation: spherePulse 3.5s ease-in-out infinite; }
        @keyframes spherePulse {
          0%,100% { box-shadow: 0 0 60px rgba(103,232,249,0.5), 0 0 120px rgba(168,85,247,0.3); }
          50% { box-shadow: 0 0 100px rgba(103,232,249,0.8), 0 0 200px rgba(168,85,247,0.5); }
        }

        .sphere-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4) 0%, transparent 50%);
          border-radius: 50%;
        }
        .sphere-inner {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: rgba(4,4,12,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sphere-eye {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, #00f5ff 0%, #4f46e5 60%, transparent 100%);
          box-shadow: 0 0 20px rgba(0,245,255,0.8);
          animation: eyePulse 2s ease-in-out infinite;
        }
        @keyframes eyePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }

        .equator {
          position: absolute;
          top: 50%; left: -10%; right: -10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,245,255,0.6), transparent);
          transform: translateY(-50%);
          animation: equatorSpin 4s ease-in-out infinite;
        }
        .meridian {
          position: absolute;
          left: 50%; top: -10%; bottom: -10%;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(168,85,247,0.5), transparent);
          transform: translateX(-50%);
        }

        .orb-dot {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--c);
          box-shadow: 0 0 10px var(--c);
          z-index: 11;
        }
        .od-0 { top: 8%; left: 50%; animation: orbitDot0 6s linear infinite; }
        .od-1 { top: 50%; right: 8%; animation: orbitDot1 7s linear infinite; }
        .od-2 { bottom: 8%; left: 50%; animation: orbitDot2 8s linear infinite; }
        .od-3 { top: 50%; left: 8%; animation: orbitDot3 9s linear infinite; background: var(--v); box-shadow: 0 0 10px var(--v); }
        .od-4 { top: 18%; right: 18%; animation: orbitDot4 5s linear infinite; width: 4px; height: 4px; }
        .od-5 { bottom: 18%; left: 18%; animation: orbitDot5 11s linear infinite; width: 4px; height: 4px; background: var(--v); }
        @keyframes orbitDot0 { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -8px); } }
        @keyframes orbitDot1 { 0%,100% { transform: translate(0, -50%); } 50% { transform: translate(8px, -50%); } }
        @keyframes orbitDot2 { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 8px); } }
        @keyframes orbitDot3 { 0%,100% { transform: translate(0, -50%); } 50% { transform: translate(-8px, -50%); } }
        @keyframes orbitDot4 { 0%,100% { transform: translate(0, 0); } 50% { transform: translate(6px, -6px); } }
        @keyframes orbitDot5 { 0%,100% { transform: translate(0, 0); } 50% { transform: translate(-6px, 6px); } }

        /* Corner brackets */
        .bracket { position: absolute; width: 16px; height: 16px; z-index: 15; }
        .br-tl { top: -8px; left: -8px; border-top: 2px solid var(--c); border-left: 2px solid var(--c); }
        .br-tr { top: -8px; right: -8px; border-top: 2px solid var(--c); border-right: 2px solid var(--c); }
        .br-bl { bottom: -8px; left: -8px; border-bottom: 2px solid var(--c); border-left: 2px solid var(--c); }
        .br-br { bottom: -8px; right: -8px; border-bottom: 2px solid var(--c); border-right: 2px solid var(--c); }

        /* Intro text */
        .intro-taglines { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .intro-badge {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          letter-spacing: 4px;
          color: var(--g);
          background: rgba(34,255,136,0.08);
          border: 1px solid rgba(34,255,136,0.25);
          padding: 6px 16px;
          border-radius: 100px;
          animation: badgePulse 2s ease-in-out infinite;
        }
        @keyframes badgePulse { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }
        .scan-text-wrap {
          position: relative;
          max-width: 700px;
          text-align: center;
        }
        .scan-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 22px;
          line-height: 1.5;
          color: var(--text);
          white-space: pre-line;
          text-shadow: 0 0 30px rgba(0,245,255,0.2);
        }
        .scan-overlay {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.06) 3px,
            rgba(0,0,0,0.06) 4px
          );
          pointer-events: none;
        }
        .cursor-blink {
          color: var(--c);
          animation: cyberBlink 0.85s step-end infinite;
          font-size: 24px;
        }
        .cursor-blink.hidden { display: none; }
        @keyframes cyberBlink { 50% { opacity: 0; } }

        /* HUD corners on intro */
        .hud-corner {
          position: absolute;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          color: rgba(0,245,255,0.4);
          animation: cornerPulse 3s ease-in-out infinite;
        }
        .hud-tl { top: 28px; left: 28px; }
        .hud-tr { top: 28px; right: 28px; }
        .hud-bl { bottom: 28px; left: 28px; }
        .hud-br { bottom: 28px; right: 28px; }
        @keyframes cornerPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }

        /* ══════════════════════ MAIN UI ══════════════════════ */
        .bl-hud {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 56px;
          background: rgba(10,10,26,0.9);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(24px);
          z-index: 100;
          display: flex;
          align-items: center;
          padding: 0 28px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 12px;
          letter-spacing: 1.5px;
          color: var(--muted);
        }
        .status-pip {
          width: 7px; height: 7px;
          background: var(--g);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--g);
          margin-right: 10px;
          animation: pipBeat 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pipBeat { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .hud-brand { color: var(--c); font-weight: 700; letter-spacing: 3px; margin-right: 4px; }
        .hud-sep { color: rgba(0,245,255,0.3); margin: 0 6px; }
        .hud-meta { margin-left: auto; display: flex; gap: 32px; align-items: center; }
        .hud-tag { color: var(--muted); font-size: 11px; }
        .hud-val { color: var(--c); font-size: 11px; margin-left: 6px; }

        /* ── Main layout ── */
        .bl-wrap {
          position: relative;
          z-index: 10;
          max-width: 1280px;
          margin: 0 auto;
          padding: 76px 28px 160px;
        }

        /* ── Stage shell ── */
        .bl-stage-shell {
          background: rgba(10,10,26,0.85);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 20px;
          backdrop-filter: blur(32px);
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,245,255,0.05) inset;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .stage-top {
          padding: 18px 28px;
          border-bottom: 1px solid rgba(0,245,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0,245,255,0.02);
        }
        .stage-breadcrumb {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          letter-spacing: 3px;
          color: rgba(0,245,255,0.6);
        }
        .stage-back {
          background: none;
          border: 1px solid rgba(0,245,255,0.25);
          color: var(--muted);
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          letter-spacing: 1.5px;
          padding: 6px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .stage-back:hover {
          border-color: var(--c);
          color: var(--c);
          box-shadow: 0 0 20px rgba(0,245,255,0.15);
        }
        .stage-body {
          padding: 32px 28px 24px;
        }
        .stage-title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text);
          margin-bottom: 10px;
          line-height: 1.2;
        }
        .stage-sub { color: var(--muted); font-size: 15px; }

        /* ── Cards ── */
        .bl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .bl-card {
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(0,245,255,0.18);
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
          text-align: left;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          position: relative;
        }
        .bl-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,245,255,0.04) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          border-radius: 18px;
        }
        .bl-card:hover { 
          transform: translateY(-10px) scale(1.01);
          border-color: rgba(0,245,255,0.6);
          box-shadow: 0 28px 80px rgba(0,245,255,0.2), 0 8px 32px rgba(0,0,0,0.6);
        }
        .bl-card:hover::before { opacity: 1; }
        .bl-card.pressed { transform: scale(0.97); opacity: 0.85; }

        .card-top {
          padding: 18px 20px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(0,245,255,0.1);
          background: rgba(0,245,255,0.03);
        }
        .card-icon {
          width: 36px; height: 36px;
          border: 1px solid rgba(0,245,255,0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--c);
          background: rgba(0,245,255,0.05);
          flex-shrink: 0;
        }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--c);
          letter-spacing: -0.2px;
        }
        .card-arrow {
          margin-left: auto;
          color: rgba(0,245,255,0.4);
          font-size: 18px;
          transition: transform 0.2s;
        }
        .bl-card:hover .card-arrow { transform: translateX(4px); }
        .card-body { padding: 20px 20px 18px; }
        .card-sub {
          font-size: 13.5px;
          color: #94a3b8;
          line-height: 1.5;
        }

        /* ── Response panel ── */
        .response-panel {
          background: rgba(10,10,26,0.92);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 20px;
          backdrop-filter: blur(32px);
          overflow: hidden;
          margin-top: 28px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7);
          animation: slideUp 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .response-top {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(0,245,255,0.1);
          background: rgba(0,245,255,0.02);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .response-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--g);
          box-shadow: 0 0 10px var(--g);
          animation: pipBeat 1.5s ease-in-out infinite;
        }
        .response-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          letter-spacing: 3px;
          color: rgba(0,245,255,0.6);
        }
        .response-body {
          padding: 28px;
          font-size: 15px;
          line-height: 1.7;
          color: var(--text);
          white-space: pre-wrap;
          max-height: 520px;
          overflow-y: auto;
        }
        .response-body::-webkit-scrollbar { width: 4px; }
        .response-body::-webkit-scrollbar-track { background: transparent; }
        .response-body::-webkit-scrollbar-thumb { background: rgba(0,245,255,0.2); border-radius: 4px; }

        /* ── Bottom command bar ── */
        .bl-command-bar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(10,10,26,0.97);
          border-top: 1px solid rgba(0,245,255,0.2);
          backdrop-filter: blur(40px);
          z-index: 150;
          padding: 16px 28px;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.6);
        }
        .command-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .command-prompt {
          font-family: 'Share Tech Mono', monospace;
          font-size: 17px;
          color: var(--c);
          flex-shrink: 0;
          text-shadow: 0 0 20px rgba(0,245,255,0.5);
        }
        .command-input {
          flex: 1;
          background: rgba(4,4,12,0.9);
          border: 1px solid rgba(0,245,255,0.3);
          color: var(--text);
          font-family: 'Share Tech Mono', monospace;
          font-size: 15px;
          padding: 14px 20px;
          border-radius: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .command-input::placeholder { color: rgba(122,155,181,0.6); }
        .command-input:focus {
          border-color: var(--c);
          box-shadow: 0 0 0 3px rgba(0,245,255,0.12), 0 0 40px rgba(0,245,255,0.08);
        }
        .command-btn {
          background: linear-gradient(90deg, var(--c), var(--v));
          color: #04040c;
          font-family: 'Oxanium', sans-serif;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 2px;
          padding: 14px 28px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 0 30px rgba(0,245,255,0.3);
        }
        .command-btn:hover:not(:disabled) {
          transform: scale(1.04);
          box-shadow: 0 0 50px rgba(0,245,255,0.5);
        }
        .command-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Loading animation */
        .thinking-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }
        .thinking-dots span {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--c);
          animation: thinkBounce 1.2s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes thinkBounce {
          0%,100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }

        /* Fade out intro */
        .fade-veil {
          position: fixed;
          inset: 0;
          background: var(--bg);
          z-index: 290;
          opacity: 0;
          animation: veilFade 0.7s ease forwards;
          pointer-events: none;
        }
        @keyframes veilFade { to { opacity: 1; } }

        /* Scrollbar global */
        * { scrollbar-width: thin; scrollbar-color: rgba(0,245,255,0.2) transparent; }
      `}</style>

      {!introComplete ? (
        <IntroSequence onComplete={handleIntroComplete} />
      ) : (
        <>
          {/* Top HUD */}
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
            </div>
          </div>

          <ParticleField />

          <div className="bl-wrap">
            {/* Stage panel */}
            <div className="bl-stage-shell">
              <div className="stage-top">
                <div className="stage-breadcrumb">
                  {stage === "root" ? "NEXUS://ROOT" : `NEXUS:// ${stage.replace("Kind", "").toUpperCase()}`}
                </div>
                {stage !== "root" && (
                  <button
                    className="stage-back"
                    onClick={() => {
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

            {/* Cards */}
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

            {/* Response panel */}
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

          {/* Command bar */}
          <form className="bl-command-bar" onSubmit={handleSubmit}>
            <div className="command-inner">
              <span className="command-prompt">›</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the complex system you want to architect..."
                className="command-input"
                disabled={isLoading}
              />
              <button className="command-btn" type="submit" disabled={!input.trim() || isLoading}>
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