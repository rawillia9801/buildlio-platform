/* FILE: app/page.tsx
   Buildlio Platform — AI Website Builder (Single-page router UI)

   NOTES
   - This page recreates the look/feel of your provided build.io HTML:
     deep background, glass panels, left “Architect AI” chat rail, and routed sections.
   - No external icon/font CDNs required (keeps it deploy-safe).
*/

"use client";

import React, { useMemo, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type PageId = "builder" | "pricing" | "faq" | "contact" | "login" | "payment";

export default function Home() {
  const [page, setPage] = useState<PageId>("builder");

  const nav = useMemo(
    () => [
      { id: "builder" as const, label: "Builder" },
      { id: "pricing" as const, label: "Pricing" },
      { id: "faq" as const, label: "FAQ" },
      { id: "contact" as const, label: "Contact" },
    ],
    []
  );

  const navActive = (id: PageId) =>
    id === page
      ? "text-cyan-300 bg-cyan-500/10"
      : "text-slate-400 hover:text-white hover:bg-white/5";

  function router(next: PageId) {
    setPage(next);
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden`}>
      {/* Global styles to match your provided HTML vibe */}
      <style jsx global>{`
        :root {
          --deep: #0b0c15;
          --panel: #151725;
          --primary: #6366f1;
          --accent: #06b6d4;
          --success: #10b981;
          --surface: #1e293b;
        }
        html,
        body {
          height: 100%;
        }
        body {
          background: var(--deep);
          color: #cbd5e1;
          font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial,
            sans-serif;
        }
        /* Hide scrollbar (subtle) */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0b0c15;
        }
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Nav */}
        <nav className="h-16 shrink-0 z-50 border-b border-slate-800/80 bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px]">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Brand */}
              <button
                type="button"
                onClick={() => router("builder")}
                className="flex items-center gap-3 cursor-pointer select-none"
                aria-label="Go to Builder"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white text-[12px] font-black">⬡</span>
                </div>
                <span className="font-extrabold text-xl text-white tracking-tight">
                  build<span className="text-cyan-300">lio</span>
                  <span className="text-white/90">.site</span>
                </span>
              </button>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-1">
                {nav.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => router(n.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${navActive(n.id)}`}
                    type="button"
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router("login")}
                className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition"
                type="button"
              >
                Log In
              </button>
              <button
                onClick={() => router("pricing")}
                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-extrabold hover:bg-gray-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                type="button"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* App Container */}
        <div className="flex-1 relative overflow-hidden bg-[#0b0c15]">
          {/* BUILDER */}
          {page === "builder" && (
            <div className="h-full w-full flex flex-row">
              {/* Left Chat Rail */}
              <section className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-slate-800/80 bg-[#151725] z-10 shadow-2xl">
                <div className="p-4 border-b border-slate-800/80 bg-[#0b0c15]/50 shrink-0">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="text-cyan-300">✦</span> Architect AI
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Describe your vision. I write the code.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xs">
                      ⚡
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-none bg-slate-800/90 border border-slate-700/50 text-sm text-slate-200">
                      Ready to build. Try:{" "}
                      <span className="text-white font-semibold">
                        “Create a portfolio for a sci-fi writer.”
                      </span>
                    </div>
                  </div>

                  {/* Placeholder “conversation” blocks */}
                  <div className="space-y-3">
                    <div className="glass-card rounded-2xl p-4">
                      <div className="text-xs text-slate-500 mb-1 font-mono" style={{ fontFamily: "var(--font-fira)" }}>
                        SYSTEM
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed">
                        Your builder canvas is ready. Add a prompt to generate a site shell, then iterate section by
                        section.
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="text-xs text-slate-500 mb-1 font-mono" style={{ fontFamily: "var(--font-fira)" }}>
                        TIP
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed">
                        Mention layout + vibe + pages, e.g. “3-page site: Home, Services, Contact — modern glass UI.”
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800/80 bg-[#0b0c15]/90 backdrop-blur-md shrink-0">
                  <div className="relative">
                    <textarea
                      className="w-full bg-slate-900/90 border border-slate-700 text-slate-200 text-sm rounded-xl pl-4 pr-12 py-3 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none h-14"
                      placeholder="Type instructions..."
                    />
                    <button
                      className="absolute right-2 top-2 w-10 h-10 rounded-lg bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400 hover:text-[#0b0c15] transition flex items-center justify-center"
                      type="button"
                      onClick={() => {
                        // demo only
                        alert("Demo: wire this to your generation pipeline next.");
                      }}
                      aria-label="Send"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </section>

              {/* Right Preview Canvas */}
              <section className="flex-1 bg-black relative flex flex-col">
                <div className="h-12 border-b border-slate-800/80 bg-[#151725] flex items-center justify-between px-4">
                  <div
                    className="flex items-center gap-2 text-slate-500 text-xs font-mono"
                    style={{ fontFamily: "var(--font-fira)" }}
                  >
                    <span className="text-emerald-400">🔒</span> preview.buildlio.site
                  </div>
                  <button
                    className="text-xs text-slate-400 hover:text-white transition"
                    type="button"
                    onClick={() => {
                      // demo only
                      alert("Demo: open generated preview in a new tab.");
                    }}
                  >
                    ↗ Open New Tab
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                  <div className="text-center text-slate-500/70">
                    <div className="text-6xl mb-4">⬡</div>
                    <p className="text-sm">Canvas Empty</p>
                    <p className="text-xs text-slate-600 mt-2">
                      Connect your generator to render output here.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* PRICING */}
          {page === "pricing" && (
            <div className="h-full w-full overflow-y-auto flex flex-col items-center pt-10 pb-20">
              <div className="text-center max-w-2xl px-6 mb-12">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                  Fair Pricing for <span className="text-cyan-300">Infinite</span> Building.
                </h2>
                <p className="text-slate-400 text-lg">No hidden fees. Cancel anytime. Pay only for the compute you use.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 max-w-6xl w-full">
                <GlassCard>
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">
                    $0 <span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Perfect for hobbyists.</p>
                  <ul className="mt-8 space-y-4 text-sm text-slate-300 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> 1 Project
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> Community Support
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> Standard AI Speed
                    </li>
                  </ul>
                  <button
                    onClick={() => router("login")}
                    className="mt-8 w-full py-3 rounded-lg border border-slate-600 text-white font-semibold hover:bg-slate-800 transition"
                    type="button"
                  >
                    Get Started
                  </button>
                </GlassCard>

                <GlassCard className="border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-slate-800/40 md:-translate-y-4">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-400 text-[#0b0c15] text-xs font-extrabold px-3 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                  <h3 className="text-xl font-bold text-white">Pro Builder</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">
                    $29 <span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                  <p className="text-cyan-300 text-sm mt-2">For serious creators.</p>
                  <ul className="mt-8 space-y-4 text-sm text-white flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-cyan-300">✓</span> Unlimited Projects
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-cyan-300">✓</span> Priority Support
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-cyan-300">✓</span> 4x Faster Generation
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-cyan-300">✓</span> Export Code to React/Vue
                    </li>
                  </ul>
                  <button
                    onClick={() => router("payment")}
                    className="mt-8 w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-extrabold hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition"
                    type="button"
                  >
                    Upgrade Now
                  </button>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-xl font-bold text-white">Agency</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">
                    $99 <span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">For teams & client work.</p>
                  <ul className="mt-8 space-y-4 text-sm text-slate-300 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> Everything in Pro
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> White-label Editor
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-500">✓</span> API Access
                    </li>
                  </ul>
                  <button
                    onClick={() => router("contact")}
                    className="mt-8 w-full py-3 rounded-lg border border-slate-600 text-white font-semibold hover:bg-slate-800 transition"
                    type="button"
                  >
                    Contact Sales
                  </button>
                </GlassCard>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          {page === "payment" && (
            <div className="h-full w-full overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-4xl bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <div className="w-full md:w-1/3 bg-slate-900/50 p-8 border-r border-slate-700/50">
                  <h3 className="text-xs font-mono text-slate-500 mb-6" style={{ fontFamily: "var(--font-fira)" }}>
                    ORDER SUMMARY
                  </h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xl">
                      ♛
                    </div>
                    <div>
                      <div className="font-bold text-white">Pro Builder</div>
                      <div className="text-sm text-slate-400">Monthly Plan</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm mb-2">
                    <span>Subtotal</span>
                    <span>$29.00</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm mb-6 pb-6 border-b border-slate-700">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold text-lg">
                    <span>Total</span>
                    <span>$29.00</span>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  <h2 className="text-2xl font-extrabold text-white mb-6">Secure Checkout</h2>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      alert("Payment Simulation Successful! Redirecting...");
                      setTimeout(() => router("builder"), 700);
                    }}
                  >
                    <div className="space-y-4">
                      <Field label="EMAIL ADDRESS">
                        <input
                          type="email"
                          className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                          placeholder="you@company.com"
                          required
                        />
                      </Field>

                      <Field label="CARD DETAILS">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-lg px-4 py-3 pl-10 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                            placeholder="0000 0000 0000 0000"
                            required
                          />
                          <div className="absolute left-3 top-3.5 text-slate-500">💳</div>
                        </div>
                      </Field>

                      <div className="flex gap-4">
                        <Field className="flex-1" label="EXPIRY">
                          <input
                            type="text"
                            className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                            placeholder="MM/YY"
                            required
                          />
                        </Field>
                        <Field className="flex-1" label="CVC">
                          <input
                            type="text"
                            className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                            placeholder="123"
                            required
                          />
                        </Field>
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b0c15] font-extrabold py-3 rounded-lg transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          🔒 Pay $29.00
                        </button>
                        <div className="text-center mt-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                          🛡️ 256-bit SSL Encrypted
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => router("pricing")}
                          className="w-full py-3 rounded-lg border border-slate-700 text-slate-200 font-semibold hover:bg-white/5 transition"
                        >
                          ← Back to Pricing
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* FAQ */}
          {page === "faq" && (
            <div className="h-full w-full overflow-y-auto flex flex-col items-center pt-10 pb-20">
              <h2 className="text-3xl font-extrabold text-white mb-8">Frequently Asked Questions</h2>
              <div className="w-full max-w-3xl space-y-4 px-6">
                <FaqItem
                  q="Does buildlio write clean code?"
                  a="Yes. The Neural Architect targets modern patterns (Tailwind + component structure). Output should be semantic and ready to refine."
                />
                <FaqItem
                  q="Can I export my project?"
                  a="Yes. You can export a ZIP of HTML/CSS/JS or later add “export to React/Vue” as part of your pipeline."
                />
                <FaqItem
                  q="Is there a free trial?"
                  a="The Starter plan can remain free with a limited project count so users can test before upgrading."
                />
              </div>
            </div>
          )}

          {/* CONTACT */}
          {page === "contact" && (
            <div className="h-full w-full overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-lg bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-white mb-2">Contact Support</h2>
                <p className="text-slate-400 text-sm mb-6">We usually respond within 2 hours.</p>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Demo: message sent (wire to your ticket system).");
                    router("builder");
                  }}
                >
                  <Field label="YOUR EMAIL">
                    <input
                      type="email"
                      className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      placeholder="you@example.com"
                      required
                    />
                  </Field>

                  <Field label="TOPIC">
                    <select className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700/60 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20">
                      <option>Technical Support</option>
                      <option>Billing Inquiry</option>
                      <option>Enterprise Sales</option>
                    </select>
                  </Field>

                  <Field label="MESSAGE">
                    <textarea
                      className="w-full rounded-lg px-4 py-3 h-32 resize-none bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      placeholder="How can we help?"
                      required
                    />
                  </Field>

                  <button
                    className="w-full bg-white text-black font-extrabold py-3 rounded-lg hover:bg-gray-200 transition"
                    type="submit"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* LOGIN */}
          {page === "login" && (
            <div className="h-full w-full overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-white/10 rounded-2xl p-8 shadow-2xl border-t border-cyan-400/20">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
                    <span className="text-white text-lg font-black">⬡</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Welcome Back</h2>
                </div>

                <div className="space-y-4">
                  <button
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition border border-slate-700 flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => alert("Demo: GitHub OAuth here.")}
                  >
                    <span className="text-lg">🐙</span> Continue with GitHub
                  </button>

                  <button
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition border border-slate-700 flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => alert("Demo: Google OAuth here.")}
                  >
                    <span className="text-lg">G</span> Continue with Google
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#151725] px-2 text-xs text-slate-500">OR</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="email"
                      className="w-full rounded-lg px-4 py-3 mb-4 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      placeholder="Email Address"
                    />
                    <input
                      type="password"
                      className="w-full rounded-lg px-4 py-3 mb-6 bg-slate-950/40 border border-slate-700/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      placeholder="Password"
                    />
                    <button
                      onClick={() => router("builder")}
                      className="w-full bg-cyan-400 text-[#0b0c15] font-extrabold py-3 rounded-lg hover:bg-cyan-300 transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      type="button"
                    >
                      Sign In
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-slate-500 mt-6">
                  Don&apos;t have an account?{" "}
                  <button className="text-cyan-300 hover:underline" onClick={() => router("pricing")} type="button">
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared component styles (glass-card hover, etc.) */}
      <style jsx global>{`
        .glass-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(6, 182, 212, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card relative rounded-2xl p-8 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-mono text-slate-400 mb-1" style={{ fontFamily: "var(--font-fira)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="glass-card rounded-xl p-6">
      <summary className="font-bold text-white flex justify-between items-center cursor-pointer select-none">
        <span>{q}</span>
        <span className="text-slate-500">▾</span>
      </summary>
      <p className="text-slate-400 text-sm mt-3 leading-relaxed">{a}</p>
    </details>
  );
}