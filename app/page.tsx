/* FILE: app/page.tsx
   Buildlio Platform — AI Website Builder (Single-page router UI)

   CHANGELOG (2026-02-20)
   - v1.4: FULL SCRIPT RESTORATION
   - FIX: Implemented onAuthStateChange for instant "Log In" button updates
   - UPGRADE: Switched to @supabase/ssr createBrowserClient
   - MAINTAINED: All original UI sections (Pricing, FAQ, Payment, Contact)
   - MAINTAINED: All original Global CSS and Tailwind transitions
*/

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { createBrowserClient } from "@supabase/ssr";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

type PageId = "builder" | "pricing" | "faq" | "contact" | "login" | "payment";

export default function Home() {
  const [page, setPage] = useState<PageId>("builder");

  // Supabase Browser Client
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // Auth/session UI state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [whoami, setWhoami] = useState<{ email?: string; id?: string } | null>(null);

  // Builder state
  const [projectId, setProjectId] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [noteText, setNoteText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string>("");

  const nav = useMemo(
    () => [
      { id: "builder" as const, label: "Builder" },
      { id: "pricing" as const, label: "Pricing" },
      { id: "faq" as const, label: "FAQ" },
      { id: "contact" as const, label: "Contact" },
    ],
    []
  );

  // REAL-TIME AUTH LISTENER
  useEffect(() => {
    // Check session on load
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
    });

    // Listen for sign-in/sign-out events to flip UI buttons immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setWhoami(u ? { email: u.email ?? undefined, id: u.id } : null);
      
      if (event === "SIGNED_IN") {
        setPage("builder");
      }
      if (event === "SIGNED_OUT") {
        setWhoami(null);
        setProjectId("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function router(next: PageId) {
    setPage(next);
  }

  const navActive = (id: PageId) =>
    id === page
      ? "text-cyan-300 bg-cyan-500/10"
      : "text-slate-400 hover:text-white hover:bg-white/5";

  function shortId() {
    return Math.random().toString(16).slice(2, 10);
  }

  async function signInWithEmailPassword() {
    setAuthError("");
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError("Enter email + password.");
      return;
    }

    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
    } catch (e: any) {
      setAuthError(e?.message || "Login failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthError("");
    await supabase.auth.signOut();
    router("builder");
  }

  async function ensureProjectId(): Promise<string> {
    if (projectId.trim()) return projectId.trim();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      throw new Error("You’re not logged in yet. Log in first, then try again.");
    }

    const now = Date.now();
    const newProject = {
      owner_id: user.id,
      name: "Untitled Project",
      slug: `project-${now}-${shortId()}`,
      theme: "deep",
      published: false,
    };

    const { data: created, error: createErr } = await supabase
      .from("projects")
      .insert(newProject)
      .select("id")
      .single();

    if (createErr) throw createErr;
    if (!created?.id) throw new Error("Project created but no id returned.");

    setProjectId(created.id);
    return created.id as string;
  }

  async function runArchitectBuild() {
    setLastError("");
    setLastResult(null);

    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      setLastError("Type a prompt first (example: “3-page site: Home, Services, Contact — modern glass UI.”).");
      return;
    }

    setIsRunning(true);
    try {
      const pid = await ensureProjectId();

      const res = await fetch("/api/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pid,
          prompt: trimmedPrompt,
          note: noteText.trim() || undefined,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}).`);
      }

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "Request failed.");
      }

      setLastResult(data);
    } catch (e: any) {
      setLastError(e?.message || "Unknown error.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className={`${inter.variable} ${fira.variable} h-screen overflow-hidden`}>
      <style jsx global>{`
        :root {
          --deep: #0b0c15;
          --panel: #151725;
          --primary: #6366f1;
          --accent: #06b6d4;
          --success: #10b981;
          --surface: #1e293b;
        }
        html, body { height: 100%; background: var(--deep); color: #cbd5e1; font-family: var(--font-inter), ui-sans-serif, system-ui; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0c15; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
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

      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Nav */}
        <nav className="h-16 shrink-0 z-50 border-b border-slate-800/80 bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px]">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button onClick={() => router("builder")} className="flex items-center gap-3 cursor-pointer select-none">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white text-[12px] font-black">⬡</span>
                </div>
                <span className="font-extrabold text-xl text-white tracking-tight">
                  build<span className="text-cyan-300">lio</span>.site
                </span>
              </button>

              <div className="hidden md:flex items-center gap-1">
                {nav.map((n) => (
                  <button key={n.id} onClick={() => router(n.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${navActive(n.id)}`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-black/20">
                <span className={`text-xs ${whoami?.email ? "text-emerald-300" : "text-slate-400"}`}>
                  {whoami?.email ? "Signed in" : "Guest"}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-300 max-w-[220px] truncate">{whoami?.email || "Not logged in"}</span>
              </div>

              {whoami?.email ? (
                <button onClick={signOut} className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition">Sign Out</button>
              ) : (
                <button onClick={() => router("login")} className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition">Log In</button>
              )}

              <button onClick={() => router("pricing")} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-extrabold hover:bg-gray-200 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]">Get Started</button>
            </div>
          </div>
        </nav>

        {/* App Container */}
        <div className="flex-1 relative overflow-hidden bg-[#0b0c15]">
          {page === "builder" && (
            <div className="h-full w-full flex flex-row">
              <section className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-slate-800/80 bg-[#151725] z-10 shadow-2xl">
                <div className="p-4 border-b border-slate-800/80 bg-[#0b0c15]/50 shrink-0">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2"><span className="text-cyan-300">✦</span> Architect AI</h2>
                  <p className="text-xs text-slate-500 mt-1">Describe your vision. I write the code.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xs">⚡</div>
                    <div className="p-4 rounded-2xl rounded-tl-none bg-slate-800/90 border border-slate-700/50 text-sm text-slate-200">
                      Ready to build. Try: <span className="text-white font-semibold">“3-page site: Home, Services, Contact — modern glass UI.”</span>
                    </div>
                  </div>
                  <div className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="text-xs text-slate-500 font-mono">PROJECT</div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Project ID (optional)</label>
                      <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Leave blank to auto-create" className="w-full rounded-lg px-3 py-2 bg-slate-950/40 border border-slate-700/60 text-white focus:border-cyan-400 text-sm" />
                      <button disabled={isRunning} onClick={async () => { setIsRunning(true); try { await ensureProjectId(); } catch (e: any) { setLastError(e.message); } finally { setIsRunning(false); } }} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-white/5 transition text-xs font-semibold">Create Project</button>
                    </div>
                  </div>
                  {lastError && <div className="glass-card rounded-2xl p-4 border border-red-500/20 text-sm text-red-300">{lastError}</div>}
                  {lastResult && <div className="glass-card rounded-2xl p-4 text-xs text-slate-300"><pre className="whitespace-pre-wrap">{JSON.stringify(lastResult, null, 2)}</pre></div>}
                </div>
                <div className="p-4 border-t border-slate-800/80 bg-[#0b0c15]/90 shrink-0 space-y-3">
                  <textarea className="w-full bg-slate-900/90 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:border-cyan-400 resize-none h-20" placeholder="Type instructions..." value={promptText} onChange={(e) => setPromptText(e.target.value)} disabled={isRunning} />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">Endpoint: <span className="text-slate-300 font-mono">POST /api/claude-test</span></div>
                    <button className={`px-4 py-2 rounded-xl font-extrabold text-sm flex items-center gap-2 ${isRunning ? "bg-cyan-400/20 text-cyan-200" : "bg-cyan-400 text-[#0b0c15] hover:bg-cyan-300 shadow-lg"}`} onClick={runArchitectBuild} disabled={isRunning}>{isRunning ? "Running…" : "Run Build"} <span>➤</span></button>
                  </div>
                </div>
              </section>
              <section className="flex-1 bg-black relative flex flex-col">
                <div className="h-12 border-b border-slate-800/80 bg-[#151725] flex items-center justify-between px-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">🔒 preview.buildlio.site</div>
                  <button className="text-xs text-slate-400 hover:text-white" onClick={() => alert("Demo: open generated preview.")}>↗ Open New Tab</button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                  <div className="text-center text-slate-500/70"><div className="text-6xl mb-4">⬡</div><p className="text-sm">Canvas Empty</p></div>
                </div>
              </section>
            </div>
          )}

          {page === "pricing" && (
            <div className="h-full w-full overflow-y-auto flex flex-col items-center pt-10 pb-20">
              <div className="text-center max-w-2xl px-6 mb-12">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Fair Pricing for <span className="text-cyan-300">Infinite</span> Building.</h2>
                <p className="text-slate-400 text-lg">No hidden fees. Cancel anytime. Pay only for the compute you use.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 max-w-6xl w-full">
                <GlassCard>
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">$0 <span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <p className="text-slate-400 text-sm mt-2">Perfect for hobbyists.</p>
                  <ul className="mt-8 space-y-4 text-sm text-slate-300 flex-1">
                    <li className="flex items-center gap-3">✓ 1 Project</li>
                    <li className="flex items-center gap-3">✓ Community Support</li>
                  </ul>
                  <button onClick={() => router("login")} className="mt-8 w-full py-3 rounded-lg border border-slate-600 text-white font-semibold hover:bg-slate-800 transition">Get Started</button>
                </GlassCard>
                <GlassCard className="border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-slate-800/40 md:-translate-y-4">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-400 text-[#0b0c15] text-xs font-extrabold px-3 py-1 rounded-full">MOST POPULAR</div>
                  <h3 className="text-xl font-bold text-white">Pro Builder</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">$29 <span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <p className="text-cyan-300 text-sm mt-2">For serious creators.</p>
                  <ul className="mt-8 space-y-4 text-sm text-white flex-1">
                    <li className="flex items-center gap-3">✓ Unlimited Projects</li>
                    <li className="flex items-center gap-3">✓ 4x Faster Generation</li>
                  </ul>
                  <button onClick={() => router("payment")} className="mt-8 w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-extrabold hover:shadow-lg transition">Upgrade Now</button>
                </GlassCard>
                <GlassCard>
                  <h3 className="text-xl font-bold text-white">Agency</h3>
                  <div className="text-4xl font-extrabold text-white mt-4">$99 <span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <p className="text-slate-400 text-sm mt-2">For teams & client work.</p>
                  <ul className="mt-8 space-y-4 text-sm text-slate-300 flex-1">
                    <li className="flex items-center gap-3">✓ Everything in Pro</li>
                    <li className="flex items-center gap-3">✓ API Access</li>
                  </ul>
                  <button onClick={() => router("contact")} className="mt-8 w-full py-3 rounded-lg border border-slate-600 text-white font-semibold hover:bg-slate-800 transition">Contact Sales</button>
                </GlassCard>
              </div>
            </div>
          )}

          {page === "payment" && (
            <div className="h-full w-full overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-4xl bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <div className="w-full md:w-1/3 bg-slate-900/50 p-8 border-r border-slate-700/50">
                  <h3 className="text-xs font-mono text-slate-500 mb-6">ORDER SUMMARY</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xl">♛</div>
                    <div>
                      <div className="font-bold text-white">Pro Builder</div>
                      <div className="text-sm text-slate-400">Monthly Plan</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm mb-2"><span>Subtotal</span><span>$29.00</span></div>
                  <div className="flex justify-between text-white font-extrabold text-lg pt-6 border-t border-slate-700"><span>Total</span><span>$29.00</span></div>
                </div>
                <div className="flex-1 p-8">
                  <h2 className="text-2xl font-extrabold text-white mb-6">Secure Checkout</h2>
                  <form onSubmit={(e) => { e.preventDefault(); alert("Payment Simulation Successful!"); setTimeout(() => router("builder"), 700); }}>
                    <div className="space-y-4">
                      <Field label="EMAIL ADDRESS"><input type="email" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="you@company.com" required /></Field>
                      <Field label="CARD DETAILS"><input type="text" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="0000 0000 0000 0000" required /></Field>
                      <div className="flex gap-4">
                        <Field className="flex-1" label="EXPIRY"><input type="text" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="MM/YY" required /></Field>
                        <Field className="flex-1" label="CVC"><input type="text" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="123" required /></Field>
                      </div>
                      <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b0c15] font-extrabold py-3 rounded-lg transition mt-4">🔒 Pay $29.00</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {page === "faq" && (
            <div className="h-full w-full overflow-y-auto flex flex-col items-center pt-10 pb-20">
              <h2 className="text-3xl font-extrabold text-white mb-8">Frequently Asked Questions</h2>
              <div className="w-full max-w-3xl space-y-4 px-6">
                <FaqItem q="Does buildlio write clean code?" a="Yes. The Neural Architect targets modern patterns (Tailwind + component structure). Output is semantic and production-ready." />
                <FaqItem q="Can I export my project?" a="Yes. You can export a ZIP of HTML/CSS/JS or directly export to React/Vue components." />
                <FaqItem q="Is there a free trial?" a="The Starter plan is free forever with a limit of 1 project." />
              </div>
            </div>
          )}

          {page === "contact" && (
            <div className="h-full w-full overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-lg bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-extrabold text-white mb-2">Contact Support</h2>
                <p className="text-slate-400 text-sm mb-6">We usually respond within 2 hours.</p>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Message sent."); router("builder"); }}>
                  <Field label="YOUR EMAIL"><input type="email" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="you@example.com" required /></Field>
                  <Field label="MESSAGE"><textarea className="w-full rounded-lg px-4 py-3 h-32 resize-none bg-slate-950/40 border border-slate-700 text-white" placeholder="How can we help?" required /></Field>
                  <button className="w-full bg-white text-black font-extrabold py-3 rounded-lg hover:bg-gray-200 transition" type="submit">Send Message</button>
                </form>
              </div>
            </div>
          )}

          {page === "login" && (
            <div className="h-full w-full flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-[rgba(21,23,37,0.7)] backdrop-blur-[16px] border border-cyan-400/20 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center mx-auto mb-4"><span className="text-white text-lg font-black">⬡</span></div>
                  <h2 className="text-2xl font-extrabold text-white">Welcome Back</h2>
                </div>
                {authError && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{authError}</div>}
                <div className="space-y-4">
                  <input type="email" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} disabled={authBusy} />
                  <input type="password" className="w-full rounded-lg px-4 py-3 bg-slate-950/40 border border-slate-700 text-white" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={authBusy} />
                  <button onClick={signInWithEmailPassword} className="w-full bg-cyan-400 text-[#0b0c15] font-extrabold py-3 rounded-lg hover:bg-cyan-300 shadow-lg disabled:opacity-60" disabled={authBusy}>{authBusy ? "Signing In…" : "Sign In"}</button>
                  <button onClick={() => setPage("builder")} className="w-full text-xs text-slate-500 hover:text-slate-300 mt-2">← Back to Builder</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string; }) {
  return <div className={`glass-card relative rounded-2xl p-8 flex flex-col ${className}`}>{children}</div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string; }) {
  return (
    <div className={className}>
      <label className="block text-xs font-mono text-slate-400 mb-1" style={{ fontFamily: "var(--font-fira)" }}>{label}</label>
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="glass-card rounded-xl p-6">
      <summary className="font-bold text-white flex justify-between items-center cursor-pointer select-none">
        <span>{q}</span><span className="text-slate-500">▾</span>
      </summary>
      <p className="text-slate-400 text-sm mt-3 leading-relaxed">{a}</p>
    </details>
  );
}