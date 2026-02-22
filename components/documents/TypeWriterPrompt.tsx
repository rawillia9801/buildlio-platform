// FILE: components/documents/TypewriterPrompt.tsx
//
// CHANGELOG
// - v1.0
//   * Clean typewriter effect (no dependency)
//   * Cursor blink

"use client";

import { useEffect, useMemo, useState } from "react";

export default function TypewriterPrompt({
  text,
  speedMs = 20,
}: {
  text: string;
  speedMs?: number;
}) {
  const [out, setOut] = useState("");

  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }

    let i = 0;
    setOut("");
    const t = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speedMs);

    return () => clearInterval(t);
  }, [text, speedMs, reduced]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
        <div className="text-sm font-semibold tracking-wide text-slate-700">Buildlio</div>
      </div>

      <div className="mt-3 text-lg font-semibold text-slate-900 md:text-xl">
        {out}
        <span className="ml-1 inline-block w-[10px] align-baseline">
          <span className="animate-blink">▍</span>
        </span>
      </div>

      <style jsx>{`
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          50.01%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}