// FILE: app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ──────────────────────────────────────────────────────────────────────────────
  BUILDLIO — Awakening + Cards + Plunge → Chat Builder
  - White start
  - Heartbeat ring becomes 010101 dust
  - Dust returns to center and forms an abstract "presence" (NOT a face)
  - Greeting types
  - Cards appear
  - Click card: plunge transition into chat builder
────────────────────────────────────────────────────────────────────────────── */

type BuildType = "website" | "document" | "app" | "store" | "agent" | "other";
type WakeStage = "void" | "pulse" | "swarm" | "reticle" | "greeting" | "cards" | "plunge" | "builder";

type Card = {
  key: string;
  title: string;
  subtitle: string;
  buildType: BuildType;
};

const CARDS: Card[] = [
  { key: "website", title: "Website", subtitle: "A clean, modern site that converts.", buildType: "website" },
  { key: "document", title: "Document", subtitle: "Agreements, policies, letters, SOPs.", buildType: "document" },
  { key: "app", title: "Web App", subtitle: "Dashboards, portals, internal tools.", buildType: "app" },
  { key: "store", title: "Store", subtitle: "Ecommerce structure + flows.", buildType: "store" },
  { key: "agent", title: "AI Agent", subtitle: "Support, sales, operations automation.", buildType: "agent" },
  { key: "other", title: "Something Else", subtitle: "Describe it. Buildlio structures it.", buildType: "other" },
];

const GREETING_LINES = [
  "Hi. I’m Buildlio.",
  "I build what you imagine — correctly.",
  "Tell me what you need.",
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** A subtle grain overlay (CSS-only). */
function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] opacity-[0.035]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
        mixBlendMode: "multiply",
      }}
    />
  );
}

type Dust = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  glyph: "0" | "1";
  size: number;
  phase: number;
  life: number;
};

function BuildlioAwakeningCanvas({
  stage,
  onStageAdvance,
  setPresenceStrength,
}: {
  stage: WakeStage;
  onStageAdvance: (next: WakeStage) => void;
  setPresenceStrength: (v: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<Dust[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // internal stage timer
  const stageStartRef = useRef<number>(0);
  const stageRef = useRef<WakeStage>(stage);

  useEffect(() => {
    stageRef.current = stage;
    stageStartRef.current = performance.now();
  }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // init dust
    const initDust = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      const N = 720; // enough for a premium ring without heaviness
      const dust: Dust[] = [];
      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2;
        // start near center; will be pushed outward by pulse
        dust.push({
          x: cx + Math.cos(ang) * (10 + Math.random() * 8),
          y: cy + Math.sin(ang) * (10 + Math.random() * 8),
          vx: 0,
          vy: 0,
          a: 0,
          glyph: Math.random() > 0.5 ? "1" : "0",
          size: 10 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          life: Math.random(),
        });
      }
      dustRef.current = dust;
    };

    initDust();
    startRef.current = performance.now();
    stageStartRef.current = performance.now();

    const draw = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      // clear to transparent (page is white)
      ctx.clearRect(0, 0, w, h);

      const elapsed = now - (stageStartRef.current || now);
      const st = stageRef.current;

      // Common styling
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

      // pulse ring parameters
      // stage timings
      // void: 0.4s (handled by parent)
      // pulse: ~0.9s
      // swarm: ~2.0s
      // reticle: ~0.8s
      const dust = dustRef.current;

      // helper: draw a soft ring (pre-dust)
      const drawSoftRing = (r: number, alpha: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(30,30,30,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };

      // Presence (abstract geometry) — layered arcs + radial ticks, not a face
      const drawPresence = (strength: number) => {
        // strength: 0..1
        const s = clamp(strength, 0, 1);

        ctx.save();
        ctx.globalAlpha = 0.35 * s;

        // core
        ctx.beginPath();
        ctx.arc(cx, cy, 18 + 10 * s, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fill();

        // concentric rings
        for (let i = 0; i < 5; i++) {
          const rr = 42 + i * 18 + Math.sin(now / 900 + i) * (2 + 4 * s);
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.10)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // partial arcs
        for (let i = 0; i < 6; i++) {
          const rr = 70 + i * 14;
          const a0 = (now / 1400 + i) % (Math.PI * 2);
          const span = 0.8 + 0.6 * s;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, a0, a0 + span);
          ctx.strokeStyle = "rgba(0,0,0,0.14)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // radial ticks
        const ticks = 36;
        for (let i = 0; i < ticks; i++) {
          const ang = (i / ticks) * Math.PI * 2;
          const r1 = 36;
          const r2 = 92 + 20 * s * Math.sin(now / 700 + i);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
          ctx.strokeStyle = "rgba(0,0,0,0.05)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      };

      // Stage behavior
      if (st === "pulse") {
        // ring expands outward; dust gets velocity outward; dust alpha up
        const t = clamp(elapsed / 900, 0, 1);
        const e = easeOutCubic(t);
        const r = 22 + e * Math.max(w, h) * 0.55;

        // thin ring first
        drawSoftRing(r, 0.28 * (1 - t));

        // push dust outward along their angular direction
        for (let i = 0; i < dust.length; i++) {
          const p = dust[i];
          const dx = p.x - cx;
          const dy = p.y - cy;
          const ang = Math.atan2(dy, dx);
          const targetR = r + (Math.sin(p.phase + now / 600) * 10);
          const tx = cx + Math.cos(ang) * targetR;
          const ty = cy + Math.sin(ang) * targetR;

          // move toward ring position
          p.x += (tx - p.x) * 0.08;
          p.y += (ty - p.y) * 0.08;

          // fade up
          p.a = Math.min(0.36, p.a + 0.018);

          // render glyph
          ctx.save();
          ctx.globalAlpha = p.a * (0.85 + 0.15 * Math.sin(p.phase + now / 500));
          ctx.fillStyle = "rgba(0,0,0,0.60)";
          ctx.fillText(p.glyph, p.x, p.y);
          ctx.restore();
        }

        if (t >= 1) {
          // edge hit pause ~100ms is effectively in next stage
          onStageAdvance("swarm");
        }
      }

      if (st === "swarm") {
        // dust returns from edges, controlled spiral inward, forming abstract presence
        const t = clamp(elapsed / 2100, 0, 1);
        const e = easeInOutCubic(t);

        // presence strength ramps up
        setPresenceStrength(e);
        drawPresence(e);

        // dust target: a torus + spiral around center (abstract)
        for (let i = 0; i < dust.length; i++) {
          const p = dust[i];

          // spiral in
          const baseAng = (i / dust.length) * Math.PI * 2;
          const swirl = now / 900;
          const ang = baseAng + swirl * 0.6 + Math.sin(p.phase + now / 1300) * 0.25;
          const rr = (1 - e) * (Math.max(w, h) * 0.46) + (42 + 50 * Math.sin(baseAng * 2 + now / 900) * 0.15);
          const tx = cx + Math.cos(ang) * rr;
          const ty = cy + Math.sin(ang) * rr;

          p.x += (tx - p.x) * (0.020 + e * 0.040);
          p.y += (ty - p.y) * (0.020 + e * 0.040);

          // alpha: stable, slightly reduced near end
          p.a = 0.22 + 0.10 * (1 - e);

          // render: smaller, calmer
          ctx.save();
          ctx.globalAlpha = p.a;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillText(p.glyph, p.x, p.y);
          ctx.restore();
        }

        if (t >= 1) {
          onStageAdvance("reticle");
        }
      }

      if (st === "reticle") {
        // dust collapses into a tight ring and then fades; presence stays faint
        const t = clamp(elapsed / 800, 0, 1);
        const e = easeInOutCubic(t);
        setPresenceStrength(1 - e * 0.6);
        drawPresence(0.9);

        for (let i = 0; i < dust.length; i++) {
          const p = dust[i];
          const ang = (i / dust.length) * Math.PI * 2 + now / 900;
          const rr = 92 - e * 64;
          const tx = cx + Math.cos(ang) * rr;
          const ty = cy + Math.sin(ang) * rr;

          p.x += (tx - p.x) * 0.10;
          p.y += (ty - p.y) * 0.10;

          p.a = 0.18 * (1 - e);

          ctx.save();
          ctx.globalAlpha = p.a;
          ctx.fillStyle = "rgba(0,0,0,0.50)";
          ctx.fillText(p.glyph, p.x, p.y);
          ctx.restore();
        }

        // draw a crisp reticle hint (very faint)
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 58, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 92, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (t >= 1) {
          setPresenceStrength(0.6);
          onStageAdvance("greeting");
        }
      }

      // greeting/cads/builder: canvas mostly idle, presence at low watermark
      if (st === "greeting" || st === "cards" || st === "plunge" || st === "builder") {
        setPresenceStrength(0.45);
        drawPresence(0.6);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onStageAdvance, setPresenceStrength]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[10] pointer-events-none" />;
}

function ReticleOverlay({ strength }: { strength: number }) {
  const s = clamp(strength, 0, 1);
  return (
    <div className="fixed inset-0 z-[12] pointer-events-none flex items-center justify-center">
      <div
        style={{
          width: 280,
          height: 280,
          opacity: 0.10 + 0.12 * s,
          transform: `scale(${0.96 + 0.04 * s})`,
          transition: "opacity 250ms ease, transform 250ms ease",
        }}
      >
        <svg viewBox="0 0 280 280" width="280" height="280">
          <g stroke="rgba(0,0,0,0.55)" strokeWidth="1" fill="none">
            <circle cx="140" cy="140" r="48" />
            <circle cx="140" cy="140" r="86" />
            <circle cx="140" cy="140" r="120" />
            {Array.from({ length: 24 }).map((_, i) => {
              const ang = (i / 24) * Math.PI * 2;
              const x1 = 140 + Math.cos(ang) * 92;
              const y1 = 140 + Math.sin(ang) * 92;
              const x2 = 140 + Math.cos(ang) * 120;
              const y2 = 140 + Math.sin(ang) * 120;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={0.55} />;
            })}
          </g>
          <circle cx="140" cy="140" r="14" fill="rgba(0,0,0,0.10)" />
        </svg>
      </div>
    </div>
  );
}

function Cards({
  visible,
  onSelect,
  selectedKey,
}: {
  visible: boolean;
  onSelect: (c: Card) => void;
  selectedKey: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-[30] flex items-center justify-center px-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(8px)",
        transition: "opacity 450ms ease, transform 450ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="w-full max-w-5xl">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {CARDS.map((c) => {
            const selected = selectedKey === c.key;
            return (
              <button
                key={c.key}
                onClick={() => onSelect(c)}
                className="text-left"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 16,
                  padding: "18px 16px",
                  boxShadow: selected
                    ? "0 18px 60px rgba(0,0,0,0.12)"
                    : "0 10px 30px rgba(0,0,0,0.08)",
                  transform: selected ? "translateY(-2px) scale(1.01)" : "translateY(0px)",
                  transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                }}
              >
                <div style={{ fontWeight: 800, letterSpacing: 0.2, color: "#111", fontSize: 16 }}>
                  {c.title}
                </div>
                <div style={{ marginTop: 8, color: "rgba(0,0,0,0.55)", lineHeight: 1.35, fontSize: 13 }}>
                  {c.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BuilderChat({
  buildType,
  onRequireAuth,
}: {
  buildType: BuildType;
  onRequireAuth: () => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: `You selected: ${buildType.toUpperCase()}.\n\nDescribe exactly what you want. I will structure it and generate a complete output.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [out, setOut] = useState("");
  const [running, setRunning] = useState(false);

  async function send() {
    const prompt = draft.trim();
    if (!prompt || running) return;

    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setDraft("");
    setRunning(true);
    setOut("");

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // projectId optional; route will warn if missing
          buildType,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const raw = await res.text();
      let env: any = null;
      try {
        env = JSON.parse(raw);
      } catch {
        env = null;
      }

      if (!res.ok) {
        const msg = env?.error || `HTTP ${res.status} ${res.statusText}\n\n${raw.slice(0, 2000)}`;
        setOut(msg);
        setMessages((m) => [...m, { role: "assistant", text: "Request failed. See System Output." }]);
        setRunning(false);
        return;
      }

      if (!env?.success) {
        const msg = env?.error || "Request failed.";
        setOut(msg);
        // If unauthorized, nudge user to login
        if (res.status === 401 || /unauthorized/i.test(msg)) onRequireAuth();
        setMessages((m) => [...m, { role: "assistant", text: "Request failed. See System Output." }]);
        setRunning(false);
        return;
      }

      const data = env.data;
      // For documents, prefer documents[0].content
      const snapshot = data?.snapshot || {};
      const isDoc = snapshot?.buildType === "document" || buildType === "document";
      const content =
        (isDoc && snapshot?.documents?.[0]?.content) ||
        snapshot?.files?.["RAW_OUTPUT.txt"] ||
        data?.message ||
        "Generation complete.";

      if (env?.warning) {
        setOut(`⚠ ${env.warning}\n\n${content}`);
      } else {
        setOut(content);
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Done. Review the output below. If you want changes, tell me what to adjust." },
      ]);

      setRunning(false);
    } catch (e: any) {
      setOut(String(e?.message || e));
      setMessages((m) => [...m, { role: "assistant", text: "Request failed. See System Output." }]);
      setRunning(false);
    }
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#fff" }}>
      <div
        className="flex items-center justify-between px-5"
        style={{
          height: 58,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          position: "sticky",
          top: 0,
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(10px)",
          zIndex: 5,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.2, color: "#111" }}>Buildlio</div>
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>{buildType.toUpperCase()}</div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5" style={{ maxWidth: 980, width: "100%", margin: "0 auto" }}>
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div
                style={{
                  maxWidth: "86%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: isUser ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  color: "#111",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.45,
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 18, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: "rgba(0,0,0,0.55)", fontWeight: 800 }}>
            SYSTEM OUTPUT
          </div>
          <div
            style={{
              marginTop: 10,
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
              padding: 14,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
              color: "#111",
              minHeight: 180,
            }}
          >
            {running ? "Working…" : out || "—"}
          </div>
        </div>
      </div>

      <div
        className="px-5 py-4"
        style={{
          borderTop: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", gap: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message Buildlio…"
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 140,
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              padding: "12px 14px",
              outline: "none",
              fontSize: 15,
              lineHeight: 1.45,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || running}
            style={{
              width: 110,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: draft.trim() && !running ? "#111" : "rgba(0,0,0,0.08)",
              color: draft.trim() && !running ? "#fff" : "rgba(0,0,0,0.40)",
              fontWeight: 900,
              letterSpacing: 0.2,
              cursor: draft.trim() && !running ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const [stage, setStage] = useState<WakeStage>("void");
  const [presenceStrength, setPresenceStrength] = useState(0.0);

  const [typed, setTyped] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(false);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [plunge, setPlunge] = useState(false);

  const [builderOn, setBuilderOn] = useState(false);
  const buildType: BuildType = selectedCard?.buildType || "document";

  // Phase scheduler
  useEffect(() => {
    if (stage !== "void") return;
    const t = window.setTimeout(() => setStage("pulse"), 400);
    return () => window.clearTimeout(t);
  }, [stage]);

  const onStageAdvance = (next: WakeStage) => {
    // prevent regress
    setStage((prev) => {
      const order: WakeStage[] = ["void", "pulse", "swarm", "reticle", "greeting", "cards", "plunge", "builder"];
      if (order.indexOf(next) <= order.indexOf(prev)) return prev;
      return next;
    });
  };

  // Greeting typing
  useEffect(() => {
    if (stage !== "greeting") return;

    const currentLine = GREETING_LINES[lineIndex] || "";
    const fullTextUpToLine = GREETING_LINES.slice(0, lineIndex).join("\n") + (lineIndex > 0 ? "\n" : "");
    const visibleLine = currentLine.slice(0, charIndex);

    setTyped(fullTextUpToLine + visibleLine);

    let speed = 18;
    if (lineIndex === 0) speed = 14; // quick
    if (lineIndex === 1) speed = 20; // slower
    if (lineIndex === 2) speed = 18;

    const doneLine = charIndex >= currentLine.length;
    if (!doneLine) {
      const t = window.setTimeout(() => setCharIndex((c) => c + 1), speed);
      return () => window.clearTimeout(t);
    }

    // pause between lines
    const pause = lineIndex === 0 ? 300 : lineIndex === 1 ? 400 : 450;
    const t2 = window.setTimeout(() => {
      if (lineIndex < GREETING_LINES.length - 1) {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      } else {
        // greeting done → cards
        setStage("cards");
        setCardsVisible(true);
      }
    }, pause);
    return () => window.clearTimeout(t2);
  }, [stage, lineIndex, charIndex]);

  // if stage is greeting but typed not initialized, ensure it begins
  useEffect(() => {
    if (stage === "greeting" && typed === "" && lineIndex === 0 && charIndex === 0) {
      // kick typing loop via effect dependency
      setTyped("");
    }
  }, [stage, typed, lineIndex, charIndex]);

  const handleSelect = (c: Card) => {
    setSelectedCard(c);
    // plunge transition
    setStage("plunge");
    setPlunge(true);
    window.setTimeout(() => {
      setBuilderOn(true);
      setStage("builder");
    }, 520);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111" }}>
      <style jsx global>{`
        html, body {
          height: 100%;
          margin: 0;
          background: #fff;
        }
        * { box-sizing: border-box; }
      `}</style>

      <Grain />
      <BuildlioAwakeningCanvas stage={stage} onStageAdvance={onStageAdvance} setPresenceStrength={setPresenceStrength} />
      <ReticleOverlay strength={presenceStrength} />

      {/* Greeting (center) */}
      {!builderOn && (
        <div className="fixed inset-0 z-[20] flex items-center justify-center px-6">
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              textAlign: "center",
              opacity: stage === "greeting" || stage === "cards" || stage === "plunge" ? 1 : 0,
              transform: stage === "greeting" || stage === "cards" || stage === "plunge" ? "translateY(0px)" : "translateY(6px)",
              transition: "opacity 450ms ease, transform 450ms ease",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: -0.2,
                lineHeight: 1.2,
                whiteSpace: "pre-wrap",
              }}
            >
              {typed}
              {stage === "greeting" && (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 22,
                    marginLeft: 6,
                    background: "#111",
                    opacity: 0.65,
                    verticalAlign: "middle",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              )}
            </div>

            <style jsx>{`
              @keyframes blink {
                0%,
                100% {
                  opacity: 0.65;
                }
                50% {
                  opacity: 0;
                }
              }
            `}</style>

            <div style={{ marginTop: 18, fontSize: 14, color: "rgba(0,0,0,0.55)" }}>
              Buildlio.Site — websites, documents, apps, stores, agents.
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", pointerEvents: "auto" }}>
              <button
                onClick={() => router.push("/pricing")}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(0,0,0,0.03)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Pricing
              </button>
              <button
                onClick={() => router.push("/login")}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(0,0,0,0.03)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      {!builderOn && <Cards visible={cardsVisible && stage !== "plunge"} selectedKey={selectedCard?.key || null} onSelect={handleSelect} />}

      {/* Plunge overlay */}
      {!builderOn && (
        <div
          className="fixed inset-0 z-[40] pointer-events-none"
          style={{
            opacity: plunge ? 1 : 0,
            background: "rgba(0,0,0,0.03)",
            transition: "opacity 220ms ease",
          }}
        />
      )}
      {!builderOn && selectedCard && (
        <div
          className="fixed left-1/2 top-1/2 z-[50]"
          style={{
            transform: plunge ? "translate(-50%, -50%) scale(1.12)" : "translate(-50%, -50%) scale(1)",
            opacity: plunge ? 0 : 1,
            transition: "transform 350ms ease, opacity 350ms ease",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 380,
              borderRadius: 18,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              boxShadow: "0 24px 80px rgba(0,0,0,0.14)",
              padding: 18,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>{selectedCard.title}</div>
            <div style={{ marginTop: 8, color: "rgba(0,0,0,0.55)", fontSize: 13 }}>{selectedCard.subtitle}</div>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(0,0,0,0.50)", fontWeight: 800 }}>
              INITIALIZING…
            </div>
          </div>
        </div>
      )}

      {/* Builder */}
      {builderOn && (
        <div className="fixed inset-0 z-[60]">
          <BuilderChat
            buildType={buildType}
            onRequireAuth={() => {
              // do not force redirect; just guide user toward auth
              // (you can change this to router.push("/login") if you want hard-gating)
              console.log("Auth required");
            }}
          />
        </div>
      )}
    </div>
  );
}