/* FILE: components/buildlio/BuildlioSplash.tsx
White first paint → center binary ripple → type lines → show choices
*/
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BuildChoice } from "@/lib/buildlio-types";
import { clamp, sleep } from "@/lib/buildlio-utils";

export default function BuildlioSplash({ onSelect }: { onSelect: (choice: BuildChoice) => void }) {
  const choices: Array<{ label: BuildChoice; desc: string }> = [
    { label: "Website", desc: "A full professional website with pages, sections, and polish." },
    { label: "Application", desc: "A product-style build with screens, flow, and structure." },
    { label: "Documents", desc: "Letters, contracts, policies — clean and professional." },
    { label: "Store", desc: "A conversion-focused product & checkout experience." },
    { label: "Landing Page", desc: "One high-performing page for an offer or campaign." },
    { label: "Other", desc: "Anything else — you describe it, I’ll shape it." },
  ];

  // phases:
  // 0: pure white
  // 1: binary ripple begins
  // 2: line1 typing
  // 3: pause
  // 4: line2 typing
  // 5: pause
  // 6: line3 typing
  // 7: pause
  // 8: reveal choices
  // 9: exiting
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(0);

  const line1 = "Hi, I’m Buildlio.";
  const line2 = "Your AI chat builder.";
  const line3 = "Let’s turn your dream into a reality. What are we creating today?";

  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [typed3, setTyped3] = useState("");

  const [rippleOn, setRippleOn] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [sinkKey, setSinkKey] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  const origin = useMemo(() => ({ x: 50, y: 50 }), []);
  const [sploosh, setSploosh] = useState<{ x: number; y: number; active: boolean }>({
    x: origin.x,
    y: origin.y,
    active: false,
  });

  async function typeLine(setter: (s: string) => void, full: string, msPerChar: number) {
    for (let i = 1; i <= full.length; i++) {
      setter(full.slice(0, i));
      await sleep(msPerChar);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      // SOLID WHITE HOLD (first paint)
      await sleep(650);
      if (!alive) return;

      // Center binary ripple begins
      setPhase(1);
      setRippleOn(true);
      await sleep(900);
      if (!alive) return;

      // Type line 1
      setPhase(2);
      await typeLine(setTyped1, line1, 44);
      if (!alive) return;

      setPhase(3);
      await sleep(980);
      if (!alive) return;

      // Type line 2
      setPhase(4);
      await typeLine(setTyped2, line2, 40);
      if (!alive) return;

      setPhase(5);
      await sleep(1100);
      if (!alive) return;

      // Type line 3
      setPhase(6);
      await typeLine(setTyped3, line3, 28);
      if (!alive) return;

      setPhase(7);
      await sleep(1400);
      if (!alive) return;

      // Reveal choices
      setPhase(8);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleChoiceClick = async (choice: BuildChoice, ev: React.MouseEvent<HTMLButtonElement>) => {
    if (isExiting || phase < 8) return;

    const rect = rootRef.current?.getBoundingClientRect();
    const cx = rect ? ((ev.clientX - rect.left) / rect.width) * 100 : origin.x;
    const cy = rect ? ((ev.clientY - rect.top) / rect.height) * 100 : origin.y;

    setSinkKey(choice);
    setSploosh({ x: clamp(cx, 6, 94), y: clamp(cy, 6, 94), active: true });

    setPhase(9);
    setIsExiting(true);

    await sleep(880);
    onSelect(choice);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] bg-white text-zinc-900 overflow-hidden"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
    >
      {/* CENTER binary ripple field */}
      {rippleOn && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={
            {
              ["--cx" as any]: `${origin.x}%`,
              ["--cy" as any]: `${origin.y}%`,
            } as React.CSSProperties
          }
        >
          <div className="binary-ripple binary-ripple-1" />
          <div className="binary-ripple binary-ripple-2" />
          <div className="binary-ripple binary-ripple-3" />
          <div className="binary-ripple binary-ripple-4" />
        </div>
      )}

      {/* Click sploosh */}
      {sploosh.active && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={
            {
              ["--sx" as any]: `${sploosh.x}%`,
              ["--sy" as any]: `${sploosh.y}%`,
            } as React.CSSProperties
          }
        >
          <div className="sploosh-ring sploosh-ring-1" />
          <div className="sploosh-ring sploosh-ring-2" />
          <div className="sploosh-ring sploosh-ring-3" />
          <div className="sploosh-wash" />
        </div>
      )}

      <div className="relative h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Text block */}
          <div className="min-h-[220px]">
            {phase >= 2 && (
              <div className="text-zinc-900">
                <div className="text-4xl md:text-5xl font-black tracking-[-0.045em] leading-[1.08]">
                  {typed1}
                  <span className={`caret ${phase < 3 ? "caret-on" : "caret-off"}`} />
                </div>

                {phase >= 4 && (
                  <div className="mt-8 text-2xl md:text-3xl font-semibold text-zinc-700 tracking-[-0.02em]">
                    {typed2}
                    <span className={`caret ${phase >= 4 && phase < 5 ? "caret-on" : "caret-off"}`} />
                  </div>
                )}

                {phase >= 6 && (
                  <div className="mt-10 text-xl md:text-2xl font-medium text-zinc-600 leading-relaxed max-w-3xl">
                    {typed3}
                    <span className={`caret ${phase >= 6 && phase < 8 ? "caret-on" : "caret-off"}`} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choices appear only after intro completes */}
          {phase >= 8 && (
            <div className={`mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${isExiting ? "choices-exiting" : "choices-buoy"}`}>
              {choices.map((c, idx) => {
                const sinking = sinkKey === c.label && isExiting;
                return (
                  <button
                    key={c.label}
                    onClick={(ev) => handleChoiceClick(c.label, ev)}
                    disabled={isExiting}
                    className={[
                      "choice-card",
                      `delay-${idx}`,
                      sinking ? "choice-sink" : "",
                      isExiting && !sinking ? "choice-fade" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-lg font-extrabold tracking-[-0.02em]">{c.label}</div>
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-800 font-black">
                        →
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-zinc-600 leading-relaxed">{c.desc}</div>
                    <div className="card-ripples pointer-events-none" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .caret {
          display: inline-block;
          width: 10px;
          margin-left: 6px;
        }
        .caret-on {
          height: 0.95em;
          border-right: 3px solid rgba(0, 0, 0, 0.35);
          animation: blink 0.95s step-end infinite;
        }
        .caret-off {
          border-right: 3px solid transparent;
        }
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* --- Binary texture tile (SVG) --- */
        :global(.binary-ripple) {
          position: absolute;
          left: var(--cx);
          top: var(--cy);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          opacity: 0;
          width: 18px;
          height: 18px;

          /* a subtle binary-text tile */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='90'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Cg fill='%23111111' fill-opacity='0.28' font-family='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, %22Liberation Mono%22, %22Courier New%22, monospace' font-size='18'%3E%3Ctext x='0' y='22'%3E010101001%20010101001%20010101001%3C/text%3E%3Ctext x='0' y='48'%3E010101001%20010101001%20010101001%3C/text%3E%3Ctext x='0' y='74'%3E010101001%20010101001%20010101001%3C/text%3E%3C/g%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 220px 90px;

          /* keep it soft */
          filter: blur(0.15px);

          /* turn the texture into an expanding “ring” feel with a mask */
          -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%);
          mask-image: radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%);

          animation: binaryRing 2.25s ease-out infinite;
        }

        :global(.binary-ripple-2) { animation-delay: 0.32s; opacity: 0; }
        :global(.binary-ripple-3) { animation-delay: 0.64s; opacity: 0; }
        :global(.binary-ripple-4) { animation-delay: 0.96s; opacity: 0; }

        @keyframes binaryRing {
          0% {
            transform: translate(-50%, -50%) scale(0.18);
            opacity: 0;
          }
          16% {
            opacity: 0.55;
          }
          100% {
            transform: translate(-50%, -50%) scale(22.0);
            opacity: 0;
          }
        }

        /* Buoy pop */
        .choices-buoy .choice-card {
          opacity: 0;
          transform: translateY(26px) scale(0.985);
          animation: buoyPop 980ms cubic-bezier(0.18, 0.92, 0.2, 1) forwards;
        }
        @keyframes buoyPop {
          0% { opacity: 0; transform: translateY(34px) scale(0.98); }
          60% { opacity: 1; transform: translateY(-6px) scale(1); }
          78% { transform: translateY(2px) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .delay-0 { animation-delay: 0ms; }
        .delay-1 { animation-delay: 140ms; }
        .delay-2 { animation-delay: 280ms; }
        .delay-3 { animation-delay: 420ms; }
        .delay-4 { animation-delay: 560ms; }
        .delay-5 { animation-delay: 700ms; }

        .choice-card {
          position: relative;
          text-align: left;
          padding: 22px;
          border-radius: 28px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          background: #fff;
          transition: transform 260ms ease, box-shadow 260ms ease, opacity 260ms ease;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.07);
        }
        .choice-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.085);
        }
        .choice-card:active { transform: translateY(1px); }

        .choice-sink {
          transform: translateY(14px) scale(0.985) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
        }
        .choice-sink::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 30px;
          border: 2px solid rgba(0, 0, 0, 0.09);
          opacity: 0;
          animation: sinkOutline 720ms ease-out forwards;
          pointer-events: none;
        }
        @keyframes sinkOutline {
          0% { opacity: 0; transform: scale(1); }
          18% { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.14); }
        }

        .card-ripples {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 14px;
          height: 44px;
          opacity: 0;
        }
        .choice-sink .card-ripples {
          opacity: 1;
          background: radial-gradient(circle at 50% 65%, rgba(0, 0, 0, 0.10), rgba(255, 255, 255, 0) 58%),
            radial-gradient(circle at 50% 65%, rgba(0, 0, 0, 0.07), rgba(255, 255, 255, 0) 62%);
          animation: cardRipple 720ms ease-out forwards;
        }
        @keyframes cardRipple {
          0% { transform: translateY(0) scale(0.90); opacity: 0.22; }
          35% { opacity: 0.32; }
          100% { transform: translateY(10px) scale(1.28); opacity: 0; }
        }

        .choice-fade {
          opacity: 0.35 !important;
          transform: translateY(10px) scale(0.99) !important;
        }

        .sploosh-ring {
          position: absolute;
          left: var(--sx);
          top: var(--sy);
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%) scale(0.2);
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.10);
          opacity: 0;
          animation: ring 880ms ease-out forwards;
        }
        .sploosh-ring-2 { animation-delay: 130ms; border-color: rgba(0, 0, 0, 0.08); }
        .sploosh-ring-3 { animation-delay: 240ms; border-color: rgba(0, 0, 0, 0.06); }
        @keyframes ring {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          12% { opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(92); opacity: 0; }
        }
        .sploosh-wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at var(--sx) var(--sy),
            rgba(0, 0, 0, 0.06),
            rgba(0, 0, 0, 0.02) 18%,
            rgba(255, 255, 255, 0) 50%
          );
          animation: wash 880ms ease-out forwards;
          opacity: 0;
        }
        @keyframes wash {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}