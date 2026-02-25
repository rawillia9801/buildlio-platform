"use client";

import * as React from "react";

type BuildType = "website" | "store" | "app" | "document";

export type BuildlioSplashProps = {
  onSelect: (buildType: BuildType) => void;
  defaultChoice?: BuildType;
};

const CARD: Array<{
  key: BuildType;
  title: string;
  desc: string;
  meta: string;
  accent: string;
}> = [
  {
    key: "website",
    title: "WEBSITE",
    desc: "Landing pages, multi-page sites, business presence",
    meta: "SITE FORGE",
    accent: "from-cyan-400 to-sky-500",
  },
  {
    key: "store",
    title: "STORE",
    desc: "Products, checkout-ready structure, conversion sections",
    meta: "COMMERCE NODE",
    accent: "from-emerald-400 to-teal-500",
  },
  {
    key: "app",
    title: "APPLICATION",
    desc: "Forms, intake flows, onboarding experience",
    meta: "LOGIC LATTICE",
    accent: "from-violet-400 to-purple-500",
  },
  {
    key: "document",
    title: "DOCUMENT",
    desc: "Policies, contracts, guides, professional documents",
    meta: "KNOWLEDGE FORGE",
    accent: "from-rose-400 to-fuchsia-500",
  },
];

export default function BuildlioSplash({ onSelect, defaultChoice = "website" }: BuildlioSplashProps) {
  const [hovered, setHovered] = React.useState<BuildType | null>(null);
  const [selected, setSelected] = React.useState<BuildType>(defaultChoice);

  const active = hovered ?? selected;

  const handleSelect = (type: BuildType) => {
    setSelected(type);
    onSelect(type);
  };

  return (
    <div className="min-h-screen w-full bg-[#0a001f] relative overflow-hidden flex items-center justify-center">
      {/* Ultra deep cosmic void */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,#2a0055_0%,#0a001f_70%)]" />

      {/* Massive layered energy orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[10%] h-[920px] w-[920px] rounded-full bg-cyan-500/20 blur-[180px] animate-[pulse_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-30%] right-[8%] h-[1100px] w-[1100px] rounded-full bg-fuchsia-600/15 blur-[200px] animate-[pulse_18s_ease-in-out_infinite_1.4s]" />
        <div className="absolute top-[35%] right-[15%] h-[620px] w-[620px] rounded-full bg-violet-500/20 blur-[140px] animate-[pulse_11s_ease-in-out_infinite_3s]" />
      </div>

      {/* Matrix grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(#ffffff04_1px,transparent_1px),linear-gradient(90deg,#ffffff04_1px,transparent_1px)] bg-[size:42px_42px]" />

      <div className="relative z-10 w-full max-w-6xl px-6 py-12">
        {/* Logo + Title */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="relative mb-8">
            {/* Outer energy rings */}
            <div className="absolute -inset-12 rounded-full border border-cyan-400/30 animate-[ping_3.5s_ease-out_infinite]" />
            <div className="absolute -inset-[68px] rounded-full border border-fuchsia-400/20 animate-[ping_4.8s_ease-out_infinite_0.6s]" />

            <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-cyan-300 via-fuchsia-500 to-violet-500 p-[4px] shadow-[0_0_120px_#67e8f9]">
              <div className="h-full w-full rounded-3xl bg-black flex items-center justify-center relative overflow-hidden">
                <span className="text-7xl font-black tracking-[-6px] text-white drop-shadow-[0_0_50px_#c026d3]">B</span>
                {/* Inner electric core */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/50 to-fuchsia-500/40 animate-pulse" />
              </div>
            </div>
          </div>

          <h1 className="text-8xl md:text-[110px] font-black tracking-[-7px] leading-none bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            HI, I’M{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              BUILDLIO
            </span>.
          </h1>

          <p className="mt-6 text-2xl text-neutral-400 max-w-lg">
            Choose your creation. I will materialize it instantly.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARD.map((card) => {
            const isActive = active === card.key;
            return (
              <button
                key={card.key}
                onClick={() => handleSelect(card.key)}
                onMouseEnter={() => setHovered(card.key)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  group relative h-full overflow-hidden rounded-3xl border p-10 text-left transition-all duration-700
                  ${isActive 
                    ? "border-cyan-400 shadow-[0_0_90px_#67e8f9] scale-[1.02]" 
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:-translate-y-3"
                  }
                `}
              >
                {/* Heavy glass + inner glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-10 group-hover:opacity-30 transition-all ${isActive ? "opacity-40" : ""}`} />

                {/* Shine sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                <div className="relative">
                  <div className="font-mono text-xs tracking-[3px] text-neutral-500 mb-3">{card.meta}</div>

                  <h3 className="text-5xl font-black tracking-[-3px] text-white mb-5">
                    {card.title}
                  </h3>

                  <p className="text-neutral-400 text-[15px] leading-relaxed">
                    {card.desc}
                  </p>

                  <div className="mt-10 flex justify-between items-end">
                    <div className={`text-sm font-medium tracking-wider transition-colors ${isActive ? "text-cyan-400" : "text-white/70 group-hover:text-white"}`}>
                      INITIALIZE PROTOCOL →
                    </div>
                    
                    <div className={`h-4 w-4 rounded-full transition-all duration-300 ${isActive ? "bg-cyan-400 shadow-[0_0_30px_#67e8f9]" : "bg-white/30 group-hover:bg-white/60"}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom status bar */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-10 py-3 text-xs font-mono tracking-[3px] text-neutral-400 shadow-[0_0_40px_rgba(0,0,0,.8)]">
            NEURAL FORGE v∞ • SYSTEM STATUS: 
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}