"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** The line to type out */
  text: string;

  /** Typing speed in ms per character */
  speedMs?: number;

  /** Optional prefix displayed before text (like buildlio>) */
  prefix?: string;

  /** Start typing immediately */
  autoStart?: boolean;

  /** Called when typing completes */
  onDone?: () => void;

  /** Optional className hook */
  className?: string;
};

/**
 * TempPrompt / TypewriterPrompt
 * A minimal, reliable “typewriter prompt” used by DocumentBuilderHome.
 * (Keeps builds from failing if the old component went missing.)
 */
export default function TypewriterPrompt({
  text,
  speedMs = 18,
  prefix = "buildlio>",
  autoStart = true,
  onDone,
  className = "",
}: Props) {
  const full = useMemo(() => `${text ?? ""}`, [text]);
  const [shown, setShown] = useState(autoStart ? "" : full);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const iRef = useRef<number>(0);

  useEffect(() => {
    // reset when text changes
    setShown(autoStart ? "" : full);
    setDone(!autoStart);
    iRef.current = 0;
    lastRef.current = 0;

    if (!autoStart) return;

    const tick = (t: number) => {
      if (!lastRef.current) lastRef.current = t;

      const elapsed = t - lastRef.current;
      if (elapsed >= speedMs) {
        lastRef.current = t;

        iRef.current = Math.min(full.length, iRef.current + 1);
        setShown(full.slice(0, iRef.current));

        if (iRef.current >= full.length) {
          setDone(true);
          onDone?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [full, speedMs, autoStart, onDone]);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 10px 34px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <span style={dotStyle} />
        <span style={dotStyle} />
        <span style={dotStyle} />
        <span
          style={{
            marginLeft: 6,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          prompt://typewriter
        </span>
      </div>

      <div
        style={{
          padding: "14px 12px",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 14,
          lineHeight: 1.55,
          color: "#111",
          whiteSpace: "pre-wrap",
        }}
      >
        <span style={{ opacity: 0.75 }}>{prefix}</span>{" "}
        <span>{shown}</span>
        {!done && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 8,
              height: 16,
              marginLeft: 6,
              background: "#111",
              opacity: 0.85,
              verticalAlign: "text-bottom",
              animation: "tempPromptBlink 900ms steps(1) infinite",
            }}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes tempPromptBlink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#fff",
};