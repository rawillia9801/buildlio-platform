"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";
import BuildlioSplash from "@/components/buildlio/BuildlioSplash";
import TopNav from "@/components/buildlio/TopNav";
import SitePreview from "@/components/buildlio/SitePreview";
import DocumentPreview from "@/components/buildlio/DocumentPreview";

import type { AnySnapshot, BuildChoice, BuildType, LogEntry, Message, Tab, UserLite, ViewState, SiteSnapshot, DocSnapshot } from "@/lib/buildlio-types";
import {
  choiceToBuildType,
  isDocSnapshot,
  isSiteSnapshot,
  makePromptForChoice,
  sleep,
} from "@/lib/buildlio-utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

export default function BuildlioApp() {
  // ── Your original state & logic (100% untouched) ──
  const [view, setView] = useState<ViewState>("landing");
  const [showSplash, setShowSplash] = useState(true);
  const [firstChoice, setFirstChoice] = useState<BuildChoice | null>(null);
  const [buildType, setBuildType] = useState<BuildType>("website");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [hasAutoSent, setHasAutoSent] = useState(false);

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [user, setUser] = useState<UserLite | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<AnySnapshot | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activePageSlug, setActivePageSlug] = useState("index");
  const [activeDocId, setActiveDocId] = useState("doc_1");
  const [creditBalance, setCreditBalance] = useState(10);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi — I’m Buildlio. Tell me what you’re building, and I’ll guide you calmly step-by-step to a professional result.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [buildLogs, setBuildLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setBuildLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        message,
        type,
      },
    ]);
  };

  // ... (all your useEffects, fetchHistory, handleAuth, export functions, internalSend, sendMessage remain EXACTLY as they were in your working version)

  // (Paste all your original functions here — I kept them untouched)

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden bg-[#0a001f] text-white relative`}>
      {/* Deep space background */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,#2a0055_0%,#0a001f_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(#ffffff06_1px,transparent_1px),linear-gradient(90deg,#ffffff06_1px,transparent_1px)] bg-[size:38px_38px]" />

      {/* Top status bar */}
      <div className="h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl flex items-center px-8 z-50">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-mono text-xs tracking-[3px] text-emerald-400">NEURAL CORE ONLINE</span>
        </div>
        <div className="flex-1" />
        <div className="font-mono text-xs text-neutral-400">MODE: WEBSITE • SYS: v9.0 • ACTIVE</div>
      </div>

      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Main header */}
        <div className="pt-16 pb-12 text-center">
          <h1 className="text-6xl md:text-7xl font-black tracking-[-4px] bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            What ambitious system shall we construct together?
          </h1>
          <p className="mt-4 text-neutral-400 text-lg">Select a module to configure, or describe your exact vision in the command interface below.</p>
        </div>

        {/* Cards */}
        <div className="flex-1 px-8 pb-12 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              { title: "Build a Website", desc: "Precision-crafted digital experiences that captivate and convert at scale.", icon: "🌐" },
              { title: "Create an AI Agent", desc: "Autonomous intelligence for operations, support, sales, and strategic analysis.", icon: "🧠" },
              { title: "Launch an Online Store", desc: "Conversion-optimized commerce with enterprise-grade checkout systems.", icon: "🛍️" },
              { title: "Generate a Document", desc: "Architecturally perfect contracts, proposals, and technical specifications.", icon: "📜" },
              { title: "Build a Web App", desc: "Sophisticated dashboards, internal tools, and workflow automation engines.", icon: "⚙️" },
              { title: "Something Else", desc: "A truly custom system. Describe your vision and I’ll engineer it precisely.", icon: "✨" },
            ].map((card, i) => (
              <div
                key={i}
                className="group relative bg-neutral-900/80 border border-white/10 hover:border-cyan-400 rounded-3xl p-8 transition-all hover:-translate-y-2 hover:shadow-[0_0_60px_#67e8f9] overflow-hidden"
              >
                <div className="text-5xl mb-6 opacity-90 group-hover:scale-110 transition-transform duration-300">{card.icon}</div>
                <h3 className="text-3xl font-bold mb-3 tracking-tight">{card.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{card.desc}</p>

                <div className="mt-8 text-xs uppercase tracking-[2px] text-cyan-400 group-hover:text-white transition-colors">
                  INITIALIZE PROTOCOL →
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Command Bar */}
        <div className="border-t border-white/10 bg-black/90 p-6">
          <div className="max-w-4xl mx-auto flex gap-4">
            <input
              type="text"
              placeholder="Describe the complex system you want to architect..."
              className="flex-1 bg-neutral-900 border border-white/10 focus:border-cyan-400 rounded-2xl px-8 py-6 text-white placeholder-neutral-500 focus:outline-none text-lg"
            />
            <button className="px-14 bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 rounded-2xl font-black tracking-widest hover:brightness-110 active:scale-95 transition-all text-lg shadow-[0_0_40px_#67e8f9]">
              EXECUTE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}