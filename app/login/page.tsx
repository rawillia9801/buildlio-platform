"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Oxanium, Share_Tech_Mono } from "next/font/google";

/* ─────────────────────── FONTS (FIXED) ─────────────────────── */
const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: ["400"],           // ← THIS WAS MISSING (required for this font)
  display: "swap",
  variable: "--font-mono",
});

/* ─────────────────────── AETHER LATTICE ─────────────────────── */
function AetherLattice() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf: number;
    let W = 0, H = 0;
    const particles: any[] = [];
    const COUNT = 120;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.3,
        hue: [175, 195, 265, 310][Math.floor(Math.random() * 4)],
      });
    }

    const draw = () => {
      ctx.fillStyle = "rgba(3, 3, 14, 0.12)";
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 82%, 0.6)`;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 79%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none mix-blend-screen" />;
}

/* ─────────────────────── LOGIN PAGE ─────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleNeuralLogin = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    router.push("/");
  };

  return (
    <main className={`login-universe ${oxanium.variable} ${shareTechMono.variable}`}>
      <AetherLattice />

      <div className="login-container">
        <div className="login-holo">
          <div className="neural-symbol">⌬</div>
          <h1>NEURAL ACCESS</h1>
          <p>IDENTITY VERIFICATION REQUIRED</p>

          <div className="input-group">
            <label>QUANTUM ID (EMAIL)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@consciousness.net"
              className="neural-input"
            />
          </div>

          <button
            onClick={handleNeuralLogin}
            disabled={isLoading || !email.trim()}
            className="forge-btn"
          >
            {isLoading ? "ESTABLISHING QUANTUM LINK..." : "CONNECT TO THE LATTICE"}
          </button>

          <div className="login-footer">
            <p>SECURE • AES-512 + QKD • ZERO-KNOWLEDGE</p>
            <button onClick={() => router.push("/")} className="back-btn">
              ← RETURN TO NEXUS
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .login-universe {
          min-height: 100vh;
          background: #03030f;
          color: #e8f4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .login-container { z-index: 10; width: 100%; max-width: 460px; padding: 2rem; }
        .login-holo {
          background: rgba(10,15,42,0.88);
          backdrop-filter: blur(32px);
          border: 1px solid rgba(0,249,255,0.35);
          border-radius: 28px;
          padding: 3.5rem 2.8rem;
          box-shadow: 0 0 100px -20px rgba(0,249,255,0.45);
          text-align: center;
        }
        .neural-symbol { font-size: 5rem; margin-bottom: 1rem; color: #00f9ff; }
        .login-holo h1 { font-size: 3.2rem; font-weight: 700; letter-spacing: 6px; margin-bottom: 0.4rem; }
        .login-holo p { opacity: 0.7; font-family: var(--font-mono); letter-spacing: 3px; }
        .input-group { margin: 2.5rem 0; text-align: left; }
        .input-group label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          letter-spacing: 2px;
          margin-bottom: 0.7rem;
          color: #00f9ff;
        }
        .neural-input {
          width: 100%;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(0,249,255,0.4);
          padding: 1.1rem 1.4rem;
          border-radius: 14px;
          color: white;
          font-size: 1.15rem;
        }
        .neural-input:focus {
          outline: none;
          border-color: #00f9ff;
          box-shadow: 0 0 0 4px rgba(0,249,255,0.15);
        }
        .forge-btn {
          width: 100%;
          padding: 1.25rem;
          background: linear-gradient(90deg, #00f9ff, #c026d3);
          color: #000;
          font-weight: 700;
          font-size: 1.15rem;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s;
        }
        .forge-btn:hover:not(:disabled) {
          transform: scale(1.04);
          box-shadow: 0 0 50px rgba(0,249,255,0.6);
        }
        .login-footer { margin-top: 2.5rem; }
        .login-footer p { font-family: var(--font-mono); font-size: 0.8rem; opacity: 0.6; }
        .back-btn {
          margin-top: 1.5rem;
          background: none;
          border: none;
          color: #7a9bb5;
          font-family: var(--font-mono);
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}