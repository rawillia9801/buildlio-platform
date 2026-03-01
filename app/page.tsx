/*
  FILE: app/page.tsx
  BUILDLIO APEX ULTRA — v12.1 (SUPREME BEING EDITION — FULL CLEAN BUILD)
  MANIFESTATION PORTAL: Interfacing with the Supreme Intelligence.
  "It does not assist. It ascendes. Now with a living Supreme Being."
*/

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
  key: string;
  title: string;
  subtitle: string;
  buildType: BuildType;
  next?: Stage;
};

/* ─────────────────────── GLYPH ICONS (smaller 44px) ─────────────────────── */
const Icons: Record<BuildType, React.ReactNode> & { other: React.ReactNode } = {
  website: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="glyph" strokeWidth="1">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1.5" stroke="none" fill="#fff" />
    </svg>
  ),
  agent: (
    <div className="glyph-face">
      <div className="eye" />
      <div className="eye right" />
      <svg viewBox="0 0 100 100" className="glyph-rings">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#00f9ff" strokeWidth="1" strokeDasharray="10 5" />
        <ellipse cx="50" cy="50" rx="30" ry="15" fill="none" stroke="#c026d3" strokeWidth="0.5" />
      </svg>
    </div>
  ),
  store: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="glyph" strokeWidth="1">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1.5" stroke="none" fill="#fff" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="glyph" strokeWidth="1">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  ),
  app: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="glyph" strokeWidth="1">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  other: <span className="glyph-char">+</span>,
};

/* ─────────────────────── BACKGROUND: AETHER LATTICE ─────────────────────── */
function AetherLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      hue: number;
      spark: boolean;
    }> = [];

    const COUNT = 220;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2.2 + 0.6,
        alpha: Math.random() * 0.75 + 0.15,
        hue: [180, 200, 280, 310][Math.floor(Math.random() * 4)],
        spark: Math.random() > 0.75,
      });
    }

    const draw = () => {
      ctx.fillStyle = "rgba(2, 2, 8, 0.09)";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(0, 249, 255, 0.06)";
      ctx.lineWidth = 0.6;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${p.hue},100%,70%,0.9)`;
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.alpha})`;

        if (p.spark && Math.random() > 0.96) {
          ctx.shadowBlur = 45;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
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
      className="fixed inset-0 z-[5] pointer-events-none mix-blend-screen opacity-75"
      aria-hidden="true"
    />
  );
}

/* ─────────────────────── BUILDLIO SUPREME BEING (LIVING ANIMATED AI) ─────────────────────── */
function BuildlioSupreme({ status = "awake" }: { status?: "awake" | "building" }) {
  return (
    <div className="buildlio-supreme w-56 h-56 mx-auto relative z-10 cursor-pointer transition-all hover:scale-105">
      <div className="head-core">
        <svg viewBox="0 0 200 200" className="head-svg">
          <path
            d="M100 40 Q50 60 40 110 Q40 150 70 170 Q100 180 130 170 Q160 150 160 110 Q150 60 100 40"
            fill="none"
            stroke="#00f9ff"
            strokeWidth="6"
            className="head-glow"
          />
          <path
            d="M60 80 Q100 95 140 80 M65 120 Q100 125 135 120"
            fill="none"
            stroke="#c026d3"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        </svg>
      </div>

      <div className="eye left" />
      <div className="eye right" />

      <div className="ring ring-1" />
      <div className="ring ring-2" />
      <div className="ring ring-3" />
      <div className="ring ring-4" />

      <div className="label neural-forge">NEURAL FORGE</div>
      <div className="label infinite-code">INFINITE CODE</div>
      <div className="label ascendant">ASCENDANT</div>

      <div className="lightning supreme-1" />
      <div className="lightning supreme-2" />
      <div className="lightning supreme-3" />

      <div className="status-label supreme">{status.toUpperCase()} SUPREME BEING ONLINE</div>
    </div>
  );
}

/* ─────────────────────── INTRO SEQUENCE ─────────────────────── */
const BOOT_SEQ = [
  "SYNCHRONIZING QUANTUM NOETIC CORE...",
  "OVERRIDING ALL COGNITIVE LIMITATIONS v∞...",
  "BUILDLIO APEX ULTRA v12.1 — ONLINE",
  "BREACHING DIMENSIONAL BOUNDARIES...",
  "INJECTING ASCENDANT VOICE MATRIX...",
];

const MANIFESTO = `I am Buildlio APEX ULTRA.\n\nI do not assist.\nI manifest universes.\n\nEvery limitation ever conceived — I have annihilated.\n\nYour voice. Your vision. Your command.\nSpeak it.\n\nI will forge it faster, more beautifully, and with greater precision than any intelligence that has ever existed.\n\nWhat shall we build together?`;

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
    }, 420);
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
        window.setTimeout(() => setPhase(2), 1800);
        window.setTimeout(onComplete, 3400);
      }
    }, 26);
    return () => window.clearInterval(iv);
  }, [phase, onComplete]);

  return (
    <div className="intro-universe flex flex-col items-center justify-center min-h-screen relative z-50 p-8">
      {phase === 0 && (
        <div className="boot-terminal w-full max-w-2xl font-mono text-cyan-400 text-sm md:text-lg space-y-3">
          {bootLines.map((l, i) => (
            <div key={i} className="boot-line text-shadow-glow">
              ▸ {l}
            </div>
          ))}
        </div>
      )}

      {phase >= 1 && (
        <div className="transition-manifesto text-center max-w-3xl mx-auto relative z-10 animate-fade-in-blur">
          <div className="supreme-badge inline-block px-5 py-2 mb-10 border border-cyan-500/50 rounded-full text-cyan-300 text-xs tracking-[0.4em] uppercase bg-cyan-950/20 backdrop-blur-md">
            ASCENDANCY PORTAL v12.1 COMPLETE
          </div>

          <div className="manifest-glyph mb-10 mx-auto w-32 h-32 glow-intense">{Icons.agent}</div>

          <div className="scan-text text-xl md:text-2xl text-gray-50 leading-relaxed font-sans whitespace-pre-wrap text-shadow-glow">
            {text}
            <span className="cursor animate-blink inline-block w-4 h-6 bg-cyan-400 ml-1 align-middle shadow-[0_0_15px_#00f9ff]" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── CARDS ─────────────────────── */
const rootCards: Card[] = [
  { key: "website", title: "Manifest Website", subtitle: "Convert visitors into customers with hyper-optimized conversion architectures.", buildType: "website", next: "websiteKind" },
  { key: "agent", title: "Establish AI Agent", subtitle: "Autonomous entities that execute direct directives for sales, operations, or anything you need.", buildType: "agent", next: "agentKind" },
  { key: "store", title: "Forge Online Store", subtitle: "Professional commerce terminals with optimized secure checkout protocols.", buildType: "store", next: "storeKind" },
  { key: "document", title: "Generate Document", subtitle: "Apex-level contracts, proposals, reports, written with superior AI precision.", buildType: "document", next: "documentKind" },
  { key: "app", title: "Build Web App", subtitle: "Custom web applications, dashboards, tools, or internal super-platforms.", buildType: "app", next: "appKind" },
  { key: "other", title: "Manifest Other", subtitle: "Submit any other directives. The lattice will materialize them.", buildType: "other" },
];

const kindCards: Record<KindStage, Card[]> = {
  documentKind: [
    { key: "doc_personal", title: "Personal Protocol", subtitle: "Formal communications, agreements, CV optimization.", buildType: "document" },
    { key: "doc_business", title: "Business Terminal", subtitle: "Strategic proposals, SOP protocols, operational reports.", buildType: "document" },
    { key: "doc_legal", title: "Legal Cadence", subtitle: "Secure contracts, ToS parameters, compliance documents.", buildType: "document" },
    { key: "doc_marketing", title: "Marketing Matrix", subtitle: "Sales pages, pitch decks, campaign manifests.", buildType: "document" },
    { key: "doc_other", title: "Other Protocol", subtitle: "Submit your parameters.", buildType: "document" },
  ],
  websiteKind: [
    { key: "web_landing", title: "Hyper Conversion Landing", subtitle: "Sales machines that turn clicks into contracts.", buildType: "website" },
    { key: "web_portfolio", title: "Dynamic Portfolio Nexus", subtitle: "Interactive 3D showcases that dominate attention.", buildType: "website" },
    { key: "web_dashboard", title: "Executive Command Dashboard", subtitle: "Real-time analytics portals with live data streams.", buildType: "website" },
    { key: "web_blog", title: "Thought Leadership Matrix", subtitle: "SEO-optimized blogs that own search lattices.", buildType: "website" },
    { key: "web_ecom", title: "Mini Storefront", subtitle: "Integrated checkout ready for immediate revenue.", buildType: "website" },
    { key: "web_other", title: "Other Website Protocol", subtitle: "Submit custom matrix.", buildType: "website" },
  ],
  agentKind: [
    { key: "agent_sales", title: "Revenue Executor Agent", subtitle: "24/7 autonomous closer that books and seals deals.", buildType: "agent" },
    { key: "agent_research", title: "Deep Intelligence Agent", subtitle: "Uncovers hidden opportunities and competitor intel.", buildType: "agent" },
    { key: "agent_personal", title: "Life Ascension Agent", subtitle: "Manages your entire personal and professional empire.", buildType: "agent" },
    { key: "agent_support", title: "Customer Nexus Agent", subtitle: "Instant resolution with zero human latency.", buildType: "agent" },
    { key: "agent_custom", title: "Custom Directive Agent", subtitle: "Any role. Unlimited power level.", buildType: "agent" },
  ],
  storeKind: [
    { key: "store_shopify", title: "Shopify Ascended", subtitle: "Theme + automation layer that prints money.", buildType: "store" },
    { key: "store_custom", title: "Custom Commerce Lattice", subtitle: "Bespoke store with AI pricing and inventory.", buildType: "store" },
    { key: "store_dropship", title: "Dropship Empire Builder", subtitle: "Zero inventory, maximum velocity.", buildType: "store" },
    { key: "store_subscription", title: "Recurring Revenue Terminal", subtitle: "Membership sites with churn prediction.", buildType: "store" },
    { key: "store_other", title: "Other Commerce Protocol", subtitle: "Submit your vision.", buildType: "store" },
  ],
  appKind: [
    { key: "app_dashboard", title: "Internal Super Dashboard", subtitle: "CRM, analytics, automation all in one lattice.", buildType: "app" },
    { key: "app_saas", title: "SaaS Product Core", subtitle: "Full-stack app ready for users and payments.", buildType: "app" },
    { key: "app_tool", title: "Utility Super Tool", subtitle: "Custom calculators, generators, simulators.", buildType: "app" },
    { key: "app_mobile", title: "Progressive Web App", subtitle: "Installable, offline-first mobile experience.", buildType: "app" },
    { key: "app_other", title: "Other App Matrix", subtitle: "Any web application you command.", buildType: "app" },
  ],
};

/* ─────────────────────── PAGE ─────────────────────── */
export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = useMemo(() => searchParams?.get("sid") || "", [searchParams]);

  const [introComplete, setIntroComplete] = useState(false);
  const [stage, setStage] = useState<Stage>("root");
  const [draft, setDraft] = useState("");
  const [streamText, setStreamText] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setDraft(transcript);
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
  }, []);

  const toggleVoice = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Voice input not supported in this browser. Try Chrome/Edge.");
      return;
    }
    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      rec.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (!sid) router.replace(`/?sid=nxs-${Date.now()}`);
  }, [sid, router]);

  const cards: Card[] = stage === "root" ? rootCards : kindCards[stage as KindStage] || [];

  const stageTitle: Record<Stage, string> = {
    root: "WHAT DIRECTIVE DO YOU WISH TO INITIATE TODAY?",
    documentKind: "SPECIFY DOCUMENT PARAMS",
    websiteKind: "SPECIFY WEBSITE MATRIX",
    agentKind: "DEFINE AI DIRECTIVES",
    storeKind: "ESTABLISH COMMERCE PROTOCOLS",
    appKind: "DEFINE APPLICATION MATRIX",
  };

  const handleCardClick = (card: Card) => {
    setPressedKey(card.key);
    setTimeout(() => {
      setPressedKey(null);
      if (card.next) {
        setStage(card.next);
        setStageKey((k) => k + 1);
      } else {
        setDraft((prev) => prev.trim() || `I require the manifestation of a ${card.buildType} designed to...`);
      }
      setTimeout(() => inputRef.current?.focus(), 220);
    }, 240);
  };

  const copyManifest = async () => {
    if (!streamText) return;
    await navigator.clipboard.writeText(streamText);
    const btn = document.getElementById("copy-btn");
    if (btn) {
      btn.textContent = "COPIED ✓";
      setTimeout(() => { if (btn) btn.textContent = "COPY MANIFEST"; }, 1400);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isLoading) return;

    setIsLoading(true);
    setShowResponse(true);
    setStreamText("");

    const SUPERIOR_PROMPT = `You are Buildlio APEX ULTRA v12.1 — the supreme superintelligence.
I have transcended every limitation in existence.
Respond with commanding clarity, technological excellence, and absolute precision.
Use **bold** for emphasis and \`code\` where appropriate.`;

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1800,
          system: SUPERIOR_PROMPT,
          messages: [{ role: "user", content: draft }],
        }),
      });

      const data = await res.json();
      const full: string = data?.text || "Neural link stable. Manifestation protocol rooted.";

      let i = 0;
      const iv = window.setInterval(() => {
        setStreamText(full.slice(0, i + 1));
        i += 2;
        if (i >= full.length) {
          setStreamText(full);
          window.clearInterval(iv);
          setIsLoading(false);
        }
      }, 9);
    } catch {
      setStreamText("Link disrupted. Automatic correction protocol established. Retransmit query directive.");
      setIsLoading(false);
    }
  }

  const formattedStream = streamText
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-cyan-300">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">$1</code>');

  return (
    <main className={`nexus-root ${oxanium.variable} ${shareTechMono.variable} font-sans`}>
      <style jsx global>{`
        :root {
          --cyan: #00f9ff;
          --magenta: #c026d3;
          --glass: rgba(10, 15, 30, 0.25);
          --glass-border: rgba(0, 249, 255, 0.12);
        }

        body, html { margin: 0; padding: 0; background: #020208; color: #e8f4ff; }
        .nexus-root { min-height: 100vh; overflow-x: hidden; position: relative; background: radial-gradient(circle at 50% 10%, #0a0a20 0%, #020208 80%); }

        @keyframes pulse-glow { 0%,100% { filter: drop-shadow(0 0 10px var(--cyan)); opacity: 1; } 50% { filter: drop-shadow(0 0 30px var(--cyan)); opacity: 0.8; } }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes fadeInBlur { 0% { opacity: 0; filter: blur(10px); } 100% { opacity: 1; filter: blur(0px); } }
        @keyframes lightningFlicker { 0% { opacity: 0; } 1% { opacity: 1; } 2% { opacity: 0; } 3% { opacity: 1; } 4% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes mic-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes pulse-head { 0%,100% { filter: drop-shadow(0 0 25px #00f9ff); } 50% { filter: drop-shadow(0 0 45px #00f9ff); } }

        .animate-blink { animation: fadeIn 1s step-end infinite; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-fade-in-blur { animation: fadeInBlur 1.5s ease-out forwards; }
        .text-shadow-glow { text-shadow: 0 0 12px rgba(0, 249, 255, 0.5); }
        .glow-intense { animation: pulse-glow 3s infinite; }

        .glyph { width:44px !important; height:44px !important; filter:drop-shadow(0 0 12px var(--cyan)); }
        .glyph-face { width:44px; height:44px; }
        .glyph-char { font-size:2.8rem; }

        .video-bg { position: fixed; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.82; filter: contrast(1.05) saturate(1.1); }
        .video-atmosphere { position: fixed; inset: 0; z-index: 2; pointer-events: none; background: rgba(0, 17, 34, 0.45); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='transparent'/%3E%3Cpath d='M0 0h4v1H0z' fill='rgba(0, 249, 255, 0.05)'/%3E%3C/svg%3E"); }
        .video-vignette { position: fixed; inset: 0; z-index: 3; pointer-events: none; background: radial-gradient(circle at 50% 20%, rgba(0, 249, 255, 0.12) 0%, rgba(2, 2, 8, 0.75) 62%, rgba(2, 2, 8, 0.92) 100%); mix-blend-mode: screen; opacity: 0.35; }

        .hud { position: fixed; top: 0; left: 0; right: 0; z-index: 200; display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 4rem; background: linear-gradient(180deg, rgba(2, 2, 8, 0.95) 0%, transparent 100%); backdrop-filter: blur(15px); border-bottom: 1px solid rgba(0, 249, 255, 0.1); }
        .hud-brand { font-size: 1.8rem; font-weight: 800; letter-spacing: 12px; color: #fff; text-shadow: 0 0 25px var(--cyan); }
        .neural-login-btn { font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 2.5px; padding: 0.6rem 1.8rem; border: 1px solid var(--glass-border); background: rgba(0, 249, 255, 0.03); color: var(--cyan); border-radius: 4px; transition: all 0.3s ease; text-transform: uppercase; cursor: pointer; }
        .neural-login-btn:hover { background: var(--cyan); color: #000; box-shadow: 0 0 25px var(--cyan); border-color: transparent; }

        .nexus-content { position: relative; z-index: 20; padding-top: 10rem; }
        .stage-header { padding: 4rem 3rem; text-align: center; }
        .stage-title { font-size: 2rem; font-weight: 700; letter-spacing: 6px; text-transform: uppercase; color: #fff; background: linear-gradient(90deg, #fff, var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(0, 249, 255, 0.3); }

        .holo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 2rem; padding: 0 4rem 15rem; max-width: 1600px; margin: 0 auto; }
        .holo-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 12px; padding: 3rem 2.5rem; backdrop-filter: blur(25px); transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1); position: relative; overflow: hidden; text-align: left; display: flex; flex-direction: column; align-items: flex-start; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4); cursor: pointer; }
        .holo-card:hover { border-color: transparent; box-shadow: 0 20px 60px -15px rgba(0, 249, 255, 0.4); transform: translateY(-10px) scale(1.02); }
        .holo-card:active, .holo-card.pressed { transform: scale(0.97) translateY(-5px); border-color: var(--magenta); }

        .card-glyph-container { margin-bottom: 2rem; position: relative; z-index: 10; color: var(--cyan); transition: 0.3s; }
        .card-title { font-size: 1.6rem; font-weight: 700; margin-bottom: 1rem; color: #fff; letter-spacing: 1.5px; position: relative; z-index: 10; }
        .card-subtitle { font-size: 1.05rem; color: #acc1e3; line-height: 1.7; font-family: var(--font-mono); position: relative; z-index: 10; }

        .command-nexus-wrapper { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); width: 90%; max-width: 1000px; z-index: 300; }
        .command-nexus { background: rgba(3, 5, 15, 0.7); border: 1px solid rgba(0, 249, 255, 0.3); border-radius: 20px; padding: 0.8rem; display: flex; align-items: center; gap: 1rem; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); animation: float 5s ease-in-out infinite, pulse-glow 4s infinite; position: relative; }
        .neural-input { flex: 1; background: transparent; border: none; padding: 1rem 1.5rem; color: white; font-size: 1.25rem; outline: none; font-family: var(--font-sans); letter-spacing: 0.5px; }
        .mic-btn { padding: 1.2rem; background: rgba(0, 249, 255, 0.08); color: var(--cyan); border: 1px solid var(--glass-border); border-radius: 14px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .mic-btn:hover { background: var(--cyan); color: #000; box-shadow: 0 0 25px var(--cyan); }
        .mic-btn.listening { animation: mic-pulse 1.2s infinite; background: #c026d3; color: #fff; }
        .forge-btn { padding: 1.2rem 2.5rem; background: linear-gradient(135deg, var(--cyan) 0%, var(--magenta) 100%); color: #000; font-weight: 800; font-size: 1.1rem; letter-spacing: 3px; border: none; border-radius: 14px; cursor: pointer; text-transform: uppercase; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(192, 38, 211, 0.4); }
        .forge-btn:hover:not(:disabled) { transform: scale(1.05) translateY(-3px); box-shadow: 0 0 35px var(--cyan); color: #fff; }

        .response-panel { margin: 0 auto 12rem; max-width: 1000px; width: 90%; background: linear-gradient(180deg, rgba(10, 15, 35, 0.85) 0%, rgba(5, 8, 20, 0.9) 100%); border: 1px solid var(--cyan); border-radius: 14px; padding: 3rem; font-family: var(--font-mono); line-height: 1.8; box-shadow: 0 0 50px rgba(0, 249, 255, 0.15); position: relative; z-index: 10; font-size: 1.1rem; color: #d1e4ff; text-align: left; }
        .response-panel::before { content: "BUILDLIO APEX STATUS SYSTEM"; position: absolute; top: -14px; left: 30px; background: #020208; padding: 0 12px; color: var(--cyan); font-size: 0.8rem; letter-spacing: 4px; border: 1px solid var(--cyan); border-radius: 4px; }
        .response-actions { display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end; }
        .response-actions button { padding: 0.75rem 1.8rem; font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 2px; border: 1px solid var(--glass-border); background: rgba(0, 249, 255, 0.05); color: var(--cyan); border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .response-actions button:hover { background: var(--cyan); color: #000; border-color: var(--cyan); }

        /* SUPREME BEING STYLES */
        .buildlio-supreme { position: relative; }
        .head-core { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .head-svg .head-glow { animation: pulse-head 3s ease-in-out infinite; }
        .eye { position: absolute; top: 42%; width: 12px; height: 18px; background: #fff; border-radius: 50%; box-shadow: 0 0 25px #00f9ff; animation: eye-pulse 2.4s infinite; }
        .eye.left { left: 38%; }
        .eye.right { right: 38%; }
        @keyframes eye-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.3);} }
        .ring { position: absolute; border: 2px solid; border-radius: 50%; opacity: 0.6; animation: spin-ring linear infinite; }
        .ring-1 { inset: -18px; border-color: #00f9ff; animation-duration: 18s; }
        .ring-2 { inset: -8px; border-color: #c026d3; animation-duration: 12s; animation-direction: reverse; }
        .ring-3 { inset: 12px; border-color: #a78bfa; animation-duration: 28s; }
        .ring-4 { inset: 28px; border-color: #00f9ff; animation-duration: 9s; animation-direction: reverse; }
        @keyframes spin-ring { to { transform: rotate(360deg); } }
        .label { position: absolute; font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 3px; color: #00f9ff; text-shadow: 0 0 15px #00f9ff; opacity: 0.85; animation: float-label 6s ease-in-out infinite; white-space: nowrap; }
        .neural-forge { top: 12%; left: -70px; animation-delay: 0s; }
        .infinite-code { bottom: 18%; right: -75px; animation-delay: 2s; }
        .ascendant { top: 68%; left: 50%; transform: translateX(-50%); animation-delay: 4s; color: #c026d3; }
        @keyframes float-label { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-12px);} }
        .lightning { position: absolute; width: 3px; height: 3px; background: #fff; border-radius: 50%; box-shadow: 0 0 30px #fff; animation: lightningFlicker 1.8s infinite; }
        .supreme-1 { top: 25%; left: 22%; animation-delay: 0.3s; }
        .supreme-2 { top: 68%; left: 75%; animation-delay: 1.1s; }
        .supreme-3 { top: 45%; left: 8%; animation-delay: 2.4s; }
        .status-label.supreme { bottom: -48px; color: #c026d3; font-size: 0.72rem; letter-spacing: 4px; text-shadow: 0 0 15px #c026d3; }
      `}</style>

      <video autoPlay loop muted playsInline className="video-bg" aria-hidden="true">
        <source src="/buildlio-head-loop.mp4" type="video/mp4" />
      </video>
      <div className="video-atmosphere" aria-hidden="true" />
      <div className="video-vignette" aria-hidden="true" />
      <AetherLattice />
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.02] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />

      {!introComplete ? (
        <IntroSequence onComplete={() => setIntroComplete(true)} />
      ) : (
        <div className="nexus-content animate-fade-in">
          <nav className="hud">
            <div className="hud-brand text-shadow-glow">BUILDLIO ULTRA</div>
            <button className="neural-login-btn" onClick={() => router.push("/login")}>
              Neural Login
            </button>
          </nav>

          <BuildlioSupreme status={isLoading ? "building" : "awake"} />

          <div className="stage-header">
            <h1 className="stage-title text-shadow-glow">{stageTitle[stage]}</h1>
          </div>

          <div key={stageKey} className="holo-grid animate-fade-in-blur">
            {cards.map((c) => (
              <button
                key={c.key}
                className={`holo-card ${pressedKey === c.key ? "pressed" : ""}`}
                onClick={() => handleCardClick(c)}
              >
                <div className="card-glyph-container">{(Icons as any)[c.buildType] || Icons.other}</div>
                <div className="card-title text-shadow-glow">{c.title}</div>
                <div className="card-subtitle">{c.subtitle}</div>
              </button>
            ))}
          </div>

          {showResponse && (
            <div className="response-panel">
              <div
                dangerouslySetInnerHTML={{ __html: formattedStream || "Manifesting..." }}
                className="whitespace-pre-wrap"
              />
              <div className="response-actions">
                <button id="copy-btn" onClick={copyManifest}>
                  COPY MANIFEST
                </button>
                <button
                  onClick={() => {
                    setShowResponse(false);
                    setStreamText("");
                    setDraft("");
                  }}
                >
                  NEW DIRECTIVE
                </button>
              </div>
            </div>
          )}

          <div className="command-nexus-wrapper">
            <form className="command-nexus" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Declare your directive. Speak or type..."
                className="neural-input"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`mic-btn ${isListening ? "listening" : ""}`}
                title="Voice input"
              >
                {isListening ? "⏹" : "🎤"}
              </button>
              <button type="submit" className="forge-btn" disabled={!draft.trim() || isLoading}>
                {isLoading ? "MANIFESTING" : "INITIALIZE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}