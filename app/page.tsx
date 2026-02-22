/* FILE: app/page.tsx
   BUILDLIO.SITE — v4.8: White-First Corner Ripple + Typewriter Intro + Float-Up Choices + SPLOOSH Sink (Full File)

   CHANGELOG
   - v4.8
     * Splash starts as SOLID WHITE (nothing visible)
     * Corner “under-the-surface” ripple appears first
     * Intro text types across screen (no extra on-screen commentary)
     * Options float up only after typing completes
     * Click option -> selected card “sinks” + expanding ripple -> app transitions
     * Chat input focus stability (fixes “1 letter at a time” symptom)
     * Keeps: Builder UI, preview, export, logs, history

   ANCHOR:CONFIG
   - Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
*/

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type ViewState = "landing" | "auth" | "builder" | "pricing";
type Message = { role: "user" | "assistant"; content: string };
type LogEntry = { timestamp: string; message: string; type: "info" | "success" | "error" };
type Tab = "chat" | "console" | "history";
type UserLite = { email?: string; id?: string } | null;

type BuildChoice = "Website" | "Application" | "Documents" | "Store" | "Landing Page" | "Other";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------------------------------
   ANCHOR:SPLASH — Pure White -> Corner Ripple -> Typewriter -> Float-Up Choices -> SPLOOSH Sink
--------------------------------------------------- */
function BuildlioSplash({
  onSelect,
}: {
  onSelect: (choice: BuildChoice) => void;
}) {
  const choices: Array<{ label: BuildChoice; desc: string }> = [
    { label: "Website", desc: "A complete professional site with sections & pages" },
    { label: "Application", desc: "A product-style build with UX flow & structure" },
    { label: "Documents", desc: "Contracts, policies, packets, proposals" },
    { label: "Store", desc: "A product-led landing experience built to convert" },
    { label: "Landing Page", desc: "One high-converting page for an offer" },
    { label: "Other", desc: "Describe what you want to build" },
  ];

  // 0 = pure white
  // 1 = corner ripple begins (still white)
  // 2 = typing
  // 3 = choices float up
  // 4 = exiting (click sploosh)
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

  const intro =
    "Hi! I’m Buildlio — your AI Chat Website Builder. Let’s turn your dream into a reality! What are we creating today?";

  const [typed, setTyped] = useState("");
  const [cornerRippleOn, setCornerRippleOn] = useState(false);

  const [isExiting, setIsExiting] = useState(false);
  const [sinkKey, setSinkKey] = useState<string | null>(null);

  // Corner origin (looks like “something under the screen”)
  const origin = useMemo(() => ({ x: 92, y: 12 }), []);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click ripple
  const [sploosh, setSploosh] = useState<{ x: number; y: number; active: boolean }>({
    x: origin.x,
    y: origin.y,
    active: false,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      // Pure white first
      await new Promise((r) => setTimeout(r, 450));
      if (!alive) return;

      // Corner ripple appears
      setPhase(1);
      setCornerRippleOn(true);

      await new Promise((r) => setTimeout(r, 520));
      if (!alive) return;

      // Start typing
      setPhase(2);

      // Typewriter
      const speedMs = 18;
      for (let i = 1; i <= intro.length; i++) {
        if (!alive) return;
        setTyped(intro.slice(0, i));
        await new Promise((r) => setTimeout(r, speedMs));
      }

      await new Promise((r) => setTimeout(r, 180));
      if (!alive) return;

      // Choices float up
      setPhase(3);
    })();

    return () => {
      alive = false;
    };
  }, [intro]);

  const handleChoiceClick = async (choice: BuildChoice, ev: React.MouseEvent<HTMLButtonElement>) => {
    if (isExiting) return;

    // Click point relative to container for ripple origin
    const rect = rootRef.current?.getBoundingClientRect();
    const cx = rect ? ((ev.clientX - rect.left) / rect.width) * 100 : origin.x;
    const cy = rect ? ((ev.clientY - rect.top) / rect.height) * 100 : origin.y;

    setSinkKey(choice);
    setSploosh({ x: clamp(cx, 6, 94), y: clamp(cy, 6, 94), active: true });

    setPhase(4);
    setIsExiting(true);

    await new Promise((r) => setTimeout(r, 640));
    onSelect(choice);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] bg-white text-zinc-900 overflow-hidden"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
    >
      {/* Corner ripple (phase 1+) */}
      {cornerRippleOn && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={
            {
              ["--cx" as any]: `${origin.x}%`,
              ["--cy" as any]: `${origin.y}%`,
            } as React.CSSProperties
          }
        >
          <div className="corner-ripple corner-ripple-1" />
          <div className="corner-ripple corner-ripple-2" />
          <div className="corner-ripple corner-ripple-3" />
        </div>
      )}

      {/* Click sploosh ripple (phase 4) */}
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

      {/* Typed text + choices */}
      <div className="relative h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Typed line */}
          <div className="min-h-[140px]">
            {(phase >= 2) && (
              <div className="text-zinc-900">
                <div className="text-4xl md:text-5xl font-black tracking-[-0.045em] leading-[1.08]">
                  {typed}
                  <span className={`caret ${phase < 3 ? "caret-on" : "caret-off"}`} />
                </div>
              </div>
            )}
          </div>

          {/* Choices float up */}
          {phase >= 3 && (
            <div className={`mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${isExiting ? "choices-exiting" : "choices-enter"}`}>
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
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-700 font-black">
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
          border-bottom: 4px solid transparent;
        }
        .caret-on {
          height: 0.95em;
          border-right: 3px solid rgba(0, 0, 0, 0.55);
          animation: blink 0.9s step-end infinite;
        }
        .caret-off {
          border-right: 3px solid transparent;
        }
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* Corner ripple: subtle rings from corner like something under the surface */
        .corner-ripple {
          position: absolute;
          left: var(--cx);
          top: var(--cy);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.08);
          opacity: 0;
          width: 24px;
          height: 24px;
          animation: corner 1.35s ease-out infinite;
          filter: blur(0.1px);
        }
        .corner-ripple-2 { animation-delay: 0.22s; border-color: rgba(0,0,0,0.06); }
        .corner-ripple-3 { animation-delay: 0.44s; border-color: rgba(0,0,0,0.045); }

        @keyframes corner {
          0% { transform: translate(-50%, -50%) scale(0.35); opacity: 0; }
          18% { opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(9.5); opacity: 0; }
        }

        /* Choices entrance */
        .choices-enter .choice-card {
          opacity: 0;
          transform: translateY(18px);
          animation: floatUp 520ms cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
        }
        @keyframes floatUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stagger */
        .delay-0 { animation-delay: 0ms; }
        .delay-1 { animation-delay: 60ms; }
        .delay-2 { animation-delay: 120ms; }
        .delay-3 { animation-delay: 180ms; }
        .delay-4 { animation-delay: 240ms; }
        .delay-5 { animation-delay: 300ms; }

        .choice-card {
          position: relative;
          text-align: left;
          padding: 22px;
          border-radius: 28px;
          border: 1px solid rgba(0,0,0,0.12);
          background: #fff;
          transition: transform 220ms ease, box-shadow 220ms ease, opacity 220ms ease;
          box-shadow: 0 10px 24px rgba(0,0,0,0.06);
        }
        .choice-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.085);
        }
        .choice-card:active {
          transform: translateY(1px);
        }

        /* Sink effect */
        .choice-sink {
          transform: translateY(10px) scale(0.985) !important;
          box-shadow: 0 6px 18px rgba(0,0,0,0.05) !important;
        }
        .choice-sink::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 30px;
          border: 2px solid rgba(0,0,0,0.10);
          opacity: 0;
          animation: sinkOutline 520ms ease-out forwards;
          pointer-events: none;
        }
        @keyframes sinkOutline {
          0% { opacity: 0; transform: scale(1); }
          15% { opacity: 0.55; }
          100% { opacity: 0; transform: scale(1.10); }
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
          background:
            radial-gradient(circle at 50% 65%, rgba(0,0,0,0.11), rgba(255,255,255,0) 58%),
            radial-gradient(circle at 50% 65%, rgba(0,0,0,0.08), rgba(255,255,255,0) 62%);
          animation: cardRipple 520ms ease-out forwards;
        }
        @keyframes cardRipple {
          0% { transform: translateY(0) scale(0.88); opacity: 0.22; }
          35% { opacity: 0.34; }
          100% { transform: translateY(7px) scale(1.24); opacity: 0; }
        }

        .choice-fade {
          opacity: 0.35 !important;
          transform: translateY(8px) scale(0.99) !important;
        }

        /* Click sploosh ripple across the page */
        .sploosh-ring {
          position: absolute;
          left: var(--sx);
          top: var(--sy);
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%) scale(0.2);
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.11);
          opacity: 0.0;
          animation: ring 640ms ease-out forwards;
          filter: blur(0.1px);
        }
        .sploosh-ring-2 { animation-delay: 90ms; border-color: rgba(0,0,0,0.085); }
        .sploosh-ring-3 { animation-delay: 160ms; border-color: rgba(0,0,0,0.06); }
        @keyframes ring {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.0; }
          12% { opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(78); opacity: 0.0; }
        }
        .sploosh-wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--sx) var(--sy),
            rgba(0,0,0,0.06),
            rgba(0,0,0,0.02) 18%,
            rgba(255,255,255,0) 48%);
          animation: wash 640ms ease-out forwards;
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

/* -----------------------------
   Top Navigation
-------------------------------- */
function TopNav({
  view,
  setView,
  user,
  creditBalance,
  userEmail,
  onSignOut,
}: {
  view: ViewState;
  setView: (v: ViewState) => void;
  user: UserLite;
  creditBalance: number;
  userEmail?: string;
  onSignOut: () => void;
}) {
  return (
    <nav className="h-14 shrink-0 bg-zinc-950/90 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl flex items-center justify-center text-sm font-black text-black">
          ⬡
        </div>
        <span className="font-black text-2xl tracking-[-1px] text-white">buildlio</span>
        <span className="text-cyan-400 text-sm font-mono -ml-1">.site</span>
      </div>

      <div className="flex items-center gap-7 text-sm font-medium">
        <button onClick={() => setView("builder")} className={`transition-colors ${view === "builder" ? "text-white" : "text-zinc-400 hover:text-white"}`}>
          Builder
        </button>
        <button onClick={() => setView("pricing")} className={`transition-colors ${view === "pricing" ? "text-white" : "text-zinc-400 hover:text-white"}`}>
          Pricing
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-widest">
              {creditBalance} CR
            </div>
            <span className="text-xs text-zinc-500 hidden md:block">{userEmail}</span>
            <button onClick={onSignOut} className="text-xs text-zinc-400 hover:text-white transition">
              Sign out
            </button>
          </>
        ) : (
          <button onClick={() => setView("auth")} className="font-medium text-sm text-zinc-300 hover:text-white">
            Log in
          </button>
        )}
      </div>
    </nav>
  );
}

/* -----------------------------
   Main App
-------------------------------- */
export default function BuildlioApp() {
  // ANCHOR:STATE
  const [view, setView] = useState<ViewState>("landing");

  // Splash control
  const [showSplash, setShowSplash] = useState(true);
  const [firstChoice, setFirstChoice] = useState<BuildChoice | null>(null);

  // Supabase
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [user, setUser] = useState<UserLite>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [projectId, setProjectId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activePageSlug, setActivePageSlug] = useState("index");
  const [creditBalance, setCreditBalance] = useState(10);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Buildlio — your AI website architect. Tell me about your business or idea and I'll instantly create a stunning professional website with navbar, rich sections, testimonials, pricing, FAQ, and footer.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Console & Tabs
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

  // ANCHOR:AUTH
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data?.user ? { email: data.user.email, id: data.user.id } : null)
    );
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null)
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Route after splash selection
  useEffect(() => {
    if (!showSplash && firstChoice) {
      if (user) setView("builder");
      else setView("auth");
    }
  }, [showSplash, firstChoice, user]);

  // History load
  useEffect(() => {
    if (view === "builder" && projectId) fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, view]);

  // Scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus stability (helps “1 letter at a time” behavior)
  useEffect(() => {
    if (view === "builder" && activeTab === "chat" && !isRunning) {
      const t = setTimeout(() => chatInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [view, activeTab, isRunning]);

  async function fetchHistory() {
    const { data } = await supabase.from("versions").select("*").eq("project_id", projectId).order("version_no", { ascending: false });
    if (data) setHistory(data);
  }

  async function handleAuth() {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (!error) setView("builder");
  }

  function seedPrompt(choice: BuildChoice) {
    const prompt =
      choice === "Website"
        ? "Build a premium, modern marketing website. Ask me 2–3 smart questions, then generate the full site with strong copy, clear sections, testimonials, pricing, FAQ, and a bold CTA."
        : choice === "Application"
        ? "Design a web application experience. Ask what the app does, who it’s for, and the key pages. Then generate a professional product-led site with navigation, feature highlights, pricing, FAQ, and a clear story."
        : choice === "Documents"
        ? "Help me create professional documents. Ask what industry and purpose (contract/policy/proposal). Then generate a clean site that presents the documents, trust signals, FAQs, and a CTA."
        : choice === "Store"
        ? "Build an ecommerce-style landing experience. Ask what products, price range, and audience. Then generate a modern store landing with product highlights, social proof, pricing, FAQ, and CTA."
        : choice === "Landing Page"
        ? "Create a single high-converting landing page. Ask the offer, audience, and goal. Then generate persuasive copy with benefits, proof, pricing, FAQ, and CTA."
        : "Ask me what I’m building, then generate a premium site with WOW-level copy and structure.";

    setChatInput(prompt);
  }

  // ANCHOR:EXPORT
  function exportHTML() {
    if (!snapshot) return;
    const currentPage = snapshot.pages?.find((p: any) => p.slug === activePageSlug) || snapshot.pages?.[0];
    if (!currentPage) return;

    const navItems = snapshot.navigation?.items || ["Home", "Features", "Pricing", "About", "Contact"];
    const siteName = snapshot.appName || "Your Site";
    const tagline = snapshot.tagline || "";

    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentPage.title || siteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-zinc-50 text-zinc-900">

  <nav class="bg-white border-b sticky top-0 z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="font-black text-3xl tracking-tighter">${siteName}</div>
        ${tagline ? `<div class="text-sm text-zinc-500 ml-2">${tagline}</div>` : ""}
      </div>
      <div class="flex items-center gap-10 text-sm font-medium">
        ${navItems.map((item: string) => `<a href="#" class="hover:text-cyan-600 transition">${item}</a>`).join("")}
      </div>
      <a href="#" class="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-black transition">Get Started</a>
    </div>
  </nav>

  <main>
    ${(currentPage.blocks || [])
      .map((block: any) => {
        if (block.type === "hero") return `
          <section class="py-32 bg-gradient-to-br from-zinc-900 to-black text-white text-center">
            <div class="max-w-5xl mx-auto px-6">
              <h1 class="text-7xl font-black tracking-[-2px] mb-6">${block.headline}</h1>
              <p class="text-2xl text-zinc-400 max-w-3xl mx-auto">${block.subhead}</p>
              ${block.cta ? `<a href="#" class="mt-12 inline-block bg-white text-black px-12 py-4 rounded-3xl font-bold text-lg hover:scale-105 transition">${block.cta.label}</a>` : ""}
            </div>
          </section>`;

        if (block.type === "features") return `
          <section class="py-28 bg-white">
            <div class="max-w-6xl mx-auto px-6">
              ${block.title ? `<h2 class="text-4xl font-semibold text-center mb-16">${block.title}</h2>` : ""}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                ${(block.items || [])
                  .map((item: any) => `
                    <div class="bg-zinc-50 hover:bg-white border border-transparent hover:border-zinc-200 p-10 rounded-3xl transition-all">
                      <h3 class="text-2xl font-semibold mb-4">${item.title}</h3>
                      <p class="text-zinc-600">${item.description}</p>
                    </div>`)
                  .join("")}
              </div>
            </div>
          </section>`;

        if (block.type === "stats") return `
          <section class="py-20 bg-white border-t border-b">
            <div class="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              ${(block.stats || [])
                .map((s: any) => `
                  <div>
                    <div class="text-6xl font-black text-cyan-600">${s.value}</div>
                    <div class="text-zinc-600 mt-2 font-medium">${s.label}</div>
                  </div>`)
                .join("")}
            </div>
          </section>`;

        if (block.type === "testimonials") return `
          <section class="py-28 bg-zinc-50">
            <div class="max-w-6xl mx-auto px-6">
              <h2 class="text-4xl font-semibold text-center mb-16">What our customers say</h2>
              <div class="grid md:grid-cols-3 gap-8">
                ${(block.items || [])
                  .map((t: any) => `
                    <div class="bg-white p-10 rounded-3xl border">
                      <p class="italic text-lg leading-relaxed">"${t.quote}"</p>
                      <div class="mt-8 flex items-center gap-3">
                        <div class="w-10 h-10 bg-zinc-200 rounded-full"></div>
                        <div>
                          <div class="font-semibold">${t.name}</div>
                          <div class="text-sm text-zinc-500">${t.role}${t.company ? ` at ${t.company}` : ""}</div>
                        </div>
                      </div>
                    </div>`)
                  .join("")}
              </div>
            </div>
          </section>`;

        if (block.type === "pricing") return `
          <section class="py-28 bg-white">
            <div class="max-w-6xl mx-auto px-6">
              <h2 class="text-4xl font-semibold text-center mb-16">Simple pricing</h2>
              <div class="grid md:grid-cols-3 gap-8">
                ${(block.plans || [])
                  .map((plan: any) => `
                    <div class="${plan.popular ? "ring-2 ring-cyan-500 scale-105" : ""} bg-white border rounded-3xl p-10 transition">
                      <h3 class="text-2xl font-semibold">${plan.name}</h3>
                      <div class="mt-6 flex items-baseline">
                        <span class="text-6xl font-black">${plan.price}</span>
                        <span class="ml-2 text-zinc-500">${plan.interval}</span>
                      </div>
                      <ul class="mt-10 space-y-4">
                        ${(plan.features || []).map((f: string) => `<li class="flex items-center gap-3"><span class="text-emerald-500">✔</span> ${f}</li>`).join("")}
                      </ul>
                      <a href="#" class="mt-12 block text-center py-4 bg-zinc-900 text-white rounded-2xl font-semibold">${plan.cta || "Get started"}</a>
                    </div>`)
                  .join("")}
              </div>
            </div>
          </section>`;

        if (block.type === "faq") return `
          <section class="py-28 bg-zinc-50">
            <div class="max-w-3xl mx-auto px-6">
              <h2 class="text-4xl font-semibold text-center mb-16">Frequently asked questions</h2>
              ${(block.items || [])
                .map((item: any) => `
                  <details class="group border-b py-6">
                    <summary class="flex justify-between items-center font-medium cursor-pointer list-none">
                      ${item.q}
                      <span class="text-xl group-open:rotate-45 transition">+</span>
                    </summary>
                    <p class="mt-4 text-zinc-600">${item.a}</p>
                  </details>`)
                .join("")}
            </div>
          </section>`;

        if (block.type === "content") return `
          <section class="py-24 max-w-3xl mx-auto px-6 prose prose-zinc prose-lg">
            ${block.title ? `<h2>${block.title}</h2>` : ""}
            <div>${block.body || block.content}</div>
          </section>`;

        if (block.type === "cta") return `
          <section class="py-28 bg-gradient-to-r from-cyan-600 to-violet-600 text-white text-center">
            <div class="max-w-3xl mx-auto px-6">
              <h2 class="text-5xl font-black tracking-tight">${block.headline}</h2>
              <p class="mt-6 text-xl">${block.subhead}</p>
              ${block.buttonLabel ? `<a href="#" class="mt-10 inline-block bg-white text-black px-12 py-4 rounded-3xl font-bold text-lg">${block.buttonLabel}</a>` : ""}
            </div>
          </section>`;

        return "";
      })
      .join("")}
  </main>

  <footer class="bg-zinc-950 text-zinc-400 py-20">
    <div class="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-10">
      <div>
        <div class="font-black text-white text-3xl tracking-tighter">${siteName}</div>
        ${tagline ? `<p class="mt-2">${tagline}</p>` : ""}
      </div>
      <div>
        <div class="font-semibold text-white mb-4">Product</div>
        <div class="space-y-3 text-sm">${navItems.map((i: string) => `<div>${i}</div>`).join("")}</div>
      </div>
      <div>
        <div class="font-semibold text-white mb-4">Company</div>
        <div class="space-y-3 text-sm"><div>About</div><div>Blog</div><div>Careers</div></div>
      </div>
      <div>
        <div class="font-semibold text-white mb-4">Legal</div>
        <div class="space-y-3 text-sm"><div>Privacy</div><div>Terms</div></div>
      </div>
    </div>
    <div class="text-center text-xs mt-20 opacity-60">© ${new Date().getFullYear()} ${siteName} • Built instantly with Buildlio</div>
  </footer>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentPage.slug || "index"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ANCHOR:SEND
  async function sendMessage() {
    if (!chatInput.trim() || isRunning) return;

    if (creditBalance <= 0) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Out of credits. Please upgrade to keep building." }]);
      return;
    }

    const userMessage = chatInput.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setChatInput("");
    setIsRunning(true);
    setBuildLogs([]);
    setActiveTab("console");

    const addLogWithDelay = async (msg: string, type: LogEntry["type"] = "info", delayMs = 380) => {
      await new Promise((r) => setTimeout(r, delayMs));
      addLog(msg, type);
    };

    try {
      await addLogWithDelay("🔍 Analyzing your requirements...", "info");
      await addLogWithDelay("📐 Designing premium layout & navigation", "info");
      await addLogWithDelay("✍️ Writing high-converting marketing copy", "info");

      let currentPid = projectId;
      if (!currentPid) {
        if (!user) throw new Error("Please log in first.");

        const { data: proj, error: projError } = await supabase
          .from("projects")
          .insert({ owner_id: user.id, name: "Professional Site", slug: `pro-${Date.now()}` })
          .select("id")
          .single();

        if (projError || !proj?.id) throw new Error(projError?.message || "Could not create project.");
        currentPid = proj.id;
        setProjectId(currentPid);
      }

      await addLogWithDelay("🧠 Consulting Claude architect...", "info");

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentPid, messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");

      const aiResponse = data.data;

      await addLogWithDelay("🎨 Rendering beautiful sections...", "info");
      await addLogWithDelay("📝 Adding rich content, FAQ & final polish", "info");

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse.message }]);

      if (aiResponse.type === "build" && aiResponse.snapshot) {
        setSnapshot(aiResponse.snapshot);
        setCreditBalance((prev) => prev - 1);
        fetchHistory();
        await addLogWithDelay("✅ Full professional website ready — with navigation, footer & every section", "success");
      }
    } catch (err: any) {
      const errMsg = `❌ ${err.message}`;
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
      addLog(errMsg, "error");
    } finally {
      setIsRunning(false);
      setTimeout(() => setActiveTab("chat"), 1600);
    }
  }

  const SitePreview = () => {
    const currentPage = snapshot?.pages?.find((p: any) => p.slug === activePageSlug) || snapshot?.pages?.[0];
    const navItems = snapshot?.navigation?.items || ["Home", "Features", "Pricing", "About", "Contact"];
    const siteName = snapshot?.appName || "Your Site";
    const tagline = snapshot?.tagline || "";

    return (
      <div className="flex-1 bg-zinc-950 flex flex-col relative overflow-hidden">
        <div className="h-11 bg-zinc-900 flex items-center px-4 border-b border-zinc-800">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <div className="mx-auto bg-zinc-800 text-zinc-400 text-[10px] px-12 py-px rounded-full font-mono">
            https://{siteName.toLowerCase().replace(/\s+/g, "")}.com
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <nav className="bg-white border-b sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="font-black text-3xl tracking-tighter">{siteName}</div>
                {tagline && <div className="text-sm text-zinc-500 max-w-72 leading-tight">{tagline}</div>}
              </div>
              <div className="flex items-center gap-9 text-sm font-medium text-zinc-700">
                {navItems.map((item: string, i: number) => (
                  <a key={i} href="#" className="hover:text-cyan-600 transition-colors">
                    {item}
                  </a>
                ))}
              </div>
              <button className="bg-zinc-900 hover:bg-black text-white px-7 py-3 rounded-2xl font-semibold text-sm transition">
                Get in touch
              </button>
            </div>
          </nav>

          {!snapshot ? (
            <div className="h-[calc(100vh-110px)] flex flex-col items-center justify-center bg-zinc-50">
              <div className="text-8xl opacity-10 mb-6">⬡</div>
              <p className="text-xl font-medium text-zinc-400">Chat with Buildlio — a full professional site will appear here</p>
            </div>
          ) : (
            <div className="pb-12">
              {currentPage?.blocks?.map((block: any, i: number) => (
                <div key={i}>
                  {block.type === "hero" && (
                    <section className="py-32 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-white text-center">
                      <div className="max-w-5xl mx-auto px-6">
                        <h1 className="text-7xl md:text-[5.5rem] font-black tracking-[-3px] leading-none mb-8">{block.headline}</h1>
                        <p className="text-2xl text-zinc-400 max-w-3xl mx-auto">{block.subhead}</p>
                        {block.cta && (
                          <button className="mt-12 bg-white text-black px-14 py-4 rounded-3xl font-bold text-xl hover:scale-105 transition">
                            {block.cta.label}
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {block.type === "features" && (
                    <section className="py-28 bg-white">
                      <div className="max-w-6xl mx-auto px-6">
                        {block.title && <h2 className="text-4xl font-semibold text-center mb-16">{block.title}</h2>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {block.items?.map((item: any, j: number) => (
                            <div key={j} className="group bg-zinc-50 hover:bg-white border p-10 rounded-3xl transition-all">
                              <h3 className="text-2xl font-semibold mb-4 group-hover:text-cyan-600 transition">{item.title}</h3>
                              <p className="text-zinc-600 leading-relaxed">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {block.type === "stats" && (
                    <section className="py-24 bg-white border-t border-b">
                      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                        {block.stats?.map((s: any, j: number) => (
                          <div key={j}>
                            <div className="text-7xl font-black text-cyan-600 tracking-tighter">{s.value}</div>
                            <div className="mt-3 font-medium text-zinc-600">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {block.type === "testimonials" && (
                    <section className="py-28 bg-zinc-50">
                      <div className="max-w-6xl mx-auto px-6">
                        <h2 className="text-4xl font-semibold text-center mb-16">Real stories</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                          {block.items?.map((t: any, j: number) => (
                            <div key={j} className="bg-white p-10 rounded-3xl border shadow-sm">
                              <p className="italic text-xl leading-relaxed">“{t.quote}”</p>
                              <div className="mt-8 flex items-center gap-4">
                                <div className="w-11 h-11 bg-gradient-to-br from-cyan-200 to-violet-200 rounded-full" />
                                <div>
                                  <div className="font-semibold">{t.name}</div>
                                  <div className="text-sm text-zinc-500">{t.role}{t.company ? ` • ${t.company}` : ""}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {block.type === "pricing" && (
                    <section className="py-28 bg-white">
                      <div className="max-w-6xl mx-auto px-6">
                        <h2 className="text-4xl font-semibold text-center mb-16">Choose your plan</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                          {block.plans?.map((plan: any, j: number) => (
                            <div key={j} className={`rounded-3xl p-10 border transition-all ${plan.popular ? "ring-2 ring-offset-4 ring-cyan-500 scale-[1.03]" : "hover:shadow-xl"}`}>
                              <div className="font-semibold text-lg">{plan.name}</div>
                              <div className="mt-8 flex items-baseline gap-1">
                                <span className="text-6xl font-black tracking-tighter">{plan.price}</span>
                                <span className="text-zinc-400">/{plan.interval}</span>
                              </div>
                              <ul className="mt-12 space-y-4 text-sm">
                                {plan.features?.map((f: string, k: number) => (
                                  <li key={k} className="flex items-start gap-3"><span className="text-emerald-500 mt-0.5">✔</span> {f}</li>
                                ))}
                              </ul>
                              <button className="mt-12 w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-2xl font-semibold transition">
                                {plan.cta || "Choose plan"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {block.type === "faq" && (
                    <section className="py-28 bg-zinc-50">
                      <div className="max-w-3xl mx-auto px-6">
                        <h2 className="text-4xl font-semibold text-center mb-16">Questions?</h2>
                        <div className="space-y-1">
                          {block.items?.map((item: any, j: number) => (
                            <details key={j} className="group border-b bg-white rounded-2xl px-8 py-6">
                              <summary className="font-medium flex justify-between cursor-pointer list-none items-center">
                                {item.q}
                                <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                              </summary>
                              <p className="mt-6 text-zinc-600 pr-8">{item.a}</p>
                            </details>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {block.type === "content" && (
                    <section className="py-24 max-w-4xl mx-auto px-6 prose prose-zinc prose-lg">
                      {block.title && <h2 className="text-center mb-12">{block.title}</h2>}
                      <div dangerouslySetInnerHTML={{ __html: block.body || block.content || "" }} />
                    </section>
                  )}

                  {block.type === "cta" && (
                    <section className="py-28 bg-gradient-to-br from-cyan-600 via-violet-600 to-fuchsia-600 text-white text-center">
                      <div className="max-w-3xl mx-auto px-6">
                        <h2 className="text-5xl font-black tracking-tight">{block.headline}</h2>
                        <p className="mt-6 text-xl text-white/90">{block.subhead}</p>
                        {block.buttonLabel && (
                          <button className="mt-12 bg-white text-black px-14 py-4 rounded-3xl font-bold text-xl hover:scale-105 transition">
                            {block.buttonLabel}
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              ))}
            </div>
          )}

          <footer className="bg-zinc-950 text-zinc-400 py-20">
            <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-y-12">
              <div>
                <div className="font-black text-white text-3xl tracking-tighter">{siteName}</div>
                {tagline && <p className="mt-2 text-sm">{tagline}</p>}
              </div>
              <div>
                <div className="font-semibold text-white mb-5">Product</div>
                <div className="space-y-2 text-sm">{navItems.map((i: string) => <div key={i}>{i}</div>)}</div>
              </div>
              <div>
                <div className="font-semibold text-white mb-5">Company</div>
                <div className="space-y-2 text-sm"><div>About Us</div><div>Blog</div><div>Careers</div></div>
              </div>
              <div>
                <div className="font-semibold text-white mb-5">Legal</div>
                <div className="space-y-2 text-sm"><div>Privacy Policy</div><div>Terms of Service</div></div>
              </div>
            </div>
            <div className="text-center text-xs mt-16 opacity-60">© {new Date().getFullYear()} — Instant professional websites by Buildlio</div>
          </footer>
        </div>
      </div>
    );
  };

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden`}>
      {/* Splash sits ABOVE everything; it’s pure white until it starts */}
      {showSplash && (
        <BuildlioSplash
          onSelect={(choice) => {
            setFirstChoice(choice);
            seedPrompt(choice);
            setShowSplash(false);
          }}
        />
      )}

      <TopNav
        view={view}
        setView={setView}
        user={user}
        creditBalance={creditBalance}
        userEmail={user?.email}
        onSignOut={() => supabase.auth.signOut()}
      />

      <main className="flex-1 flex overflow-hidden">
        {view === "landing" && (
          <div className="flex-1 flex items-center justify-center bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px]">
            <div className="text-center max-w-3xl px-6">
              <div className="mb-8 inline-flex items-center gap-4">
                <div className="text-8xl">⬡</div>
              </div>
              <h1 className="text-7xl font-black tracking-[-3.5px] leading-[1.05] mb-6">
                Prompt.<br />Build.<br />
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Ship professional sites.
                </span>
              </h1>
              <p className="text-2xl text-zinc-400 mb-12">
                Complete websites with navbar, rich sections, testimonials, pricing, FAQ &amp; footer — instantly.
              </p>
              <button
                onClick={() => (user ? setView("builder") : setView("auth"))}
                className="px-14 py-6 bg-white text-black rounded-3xl font-black text-2xl hover:scale-105 active:scale-95 transition"
              >
                Start building free
              </button>
            </div>
          </div>
        )}

        {view === "auth" && (
          <div className="flex-1 flex items-center justify-center bg-zinc-950">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-12 rounded-3xl">
              <h2 className="text-3xl font-black mb-8">Welcome back</h2>

              {firstChoice && (
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-1">Selected</div>
                  <div className="font-semibold">{firstChoice}</div>
                </div>
              )}

              <input
                type="email"
                placeholder="you@company.com"
                className="w-full mb-4 bg-zinc-950 border border-white/10 rounded-2xl p-5 focus:border-cyan-500 outline-none"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full mb-8 bg-zinc-950 border border-white/10 rounded-2xl p-5 focus:border-cyan-500 outline-none"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button
                onClick={handleAuth}
                className="w-full py-5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-100 transition"
              >
                Sign in
              </button>
            </div>
          </div>
        )}

        {view === "builder" && (
          <div className="flex h-full w-full">
            {/* Left Sidebar */}
            <aside className="w-96 border-r border-white/10 bg-zinc-950 flex flex-col">
              <div className="flex border-b border-white/10">
                {(["chat", "console", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-sm font-medium transition-all ${
                      activeTab === tab ? "text-white border-b-2 border-cyan-500" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Chat Tab */}
              {activeTab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-zinc-950">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-3xl px-6 py-4 text-[15px] leading-relaxed ${
                            msg.role === "user" ? "bg-cyan-600 text-white" : "bg-zinc-900 border border-white/10"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="uppercase text-[10px] tracking-[2px] text-cyan-400 mb-2 font-mono">
                              BUILDLIO
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {isRunning && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-3 text-sm text-zinc-400">
                          <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-150" />
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-300" />
                          </div>
                          Building your site...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-6 border-t border-white/10 bg-zinc-900">
                    <div className="relative">
                      <input
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isRunning && sendMessage()}
                        placeholder="Describe your website or business..."
                        className="w-full bg-zinc-950 border border-white/10 focus:border-cyan-500 rounded-3xl pl-7 pr-16 py-5 text-sm outline-none"
                        disabled={isRunning}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={isRunning || !chatInput.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-br from-cyan-400 to-violet-500 w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40 hover:scale-110 transition"
                      >
                        ↑
                      </button>
                    </div>
                    <p className="text-center text-[10px] text-zinc-500 mt-4">The AI will generate a complete professional site when ready</p>
                  </div>
                </>
              )}

              {/* Console Tab */}
              {activeTab === "console" && (
                <div className="flex-1 overflow-y-auto p-6 font-mono text-xs bg-black/70 text-emerald-300 space-y-4">
                  {buildLogs.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">Build activity will appear here in real time...</div>
                  ) : (
                    buildLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex gap-4 ${
                          log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "error"
                            ? "text-red-400"
                            : "text-emerald-300"
                        }`}
                      >
                        <span className="text-zinc-600 shrink-0 w-20">[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === "history" && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Version History</div>
                  {history.length === 0 ? (
                    <p className="text-zinc-500">No versions yet. Build your first site!</p>
                  ) : (
                    history.map((v, i) => (
                      <div key={i} className="mb-4 bg-zinc-900 rounded-3xl p-5 text-sm">
                        <div className="flex justify-between text-xs">
                          <span>Version {v.version_no}</span>
                          <span className="text-zinc-500">{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2 text-emerald-400 text-xs">Ready to export</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </aside>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col">
              <div className="h-14 border-b border-white/10 bg-zinc-900 flex items-center px-6 gap-2 overflow-x-auto">
                {snapshot?.pages?.map((p: any) => (
                  <button
                    key={p.slug}
                    onClick={() => setActivePageSlug(p.slug)}
                    className={`px-6 py-2 text-sm rounded-2xl transition whitespace-nowrap ${
                      activePageSlug === p.slug ? "bg-white text-black font-semibold" : "hover:bg-white/10"
                    }`}
                  >
                    {p.title || (p.slug === "index" ? "Home" : p.slug.charAt(0).toUpperCase() + p.slug.slice(1))}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={exportHTML}
                  disabled={!snapshot}
                  className="flex items-center gap-2 px-7 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-medium disabled:opacity-40 transition"
                >
                  Export Full HTML
                </button>
              </div>

              <SitePreview />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}