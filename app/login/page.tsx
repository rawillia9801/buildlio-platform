// FILE: app/login/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => sp?.get("next") || "/", [sp]);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return createBrowserClient(url, anon);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setBusy(true);
    setMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        router.replace(nextPath);
        return;
      }

      // signup
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      setMsg("Account created. If email confirmation is enabled, check your inbox.");
      setMode("login");
    } catch (err: any) {
      setMsg(err?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10 bg-[#05070f] text-white">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,249,255,0.08)]">
        <div className="mb-6">
          <div className="text-xs tracking-[0.35em] text-cyan-300/80">BUILDLIO</div>
          <h1 className="text-2xl font-semibold mt-2">
            {mode === "login" ? "Neural Login" : "Create Account"}
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {mode === "login"
              ? "Sign in to access your projects."
              : "Create an account to start building."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <div className="text-xs text-white/70 mb-1">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400/60"
              placeholder="you@domain.com"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/70 mb-1">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400/60"
              placeholder="••••••••"
            />
          </label>

          {msg && (
            <div className="text-sm rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="w-full rounded-xl py-3 font-semibold tracking-wide bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black disabled:opacity-50"
          >
            {busy ? "WORKING..." : mode === "login" ? "LOGIN" : "SIGN UP"}
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm text-cyan-300/90 hover:text-cyan-200"
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
            </button>

            <button
              type="button"
              onClick={() => router.replace("/")}
              className="text-sm text-white/60 hover:text-white/80"
            >
              Back
            </button>
          </div>
        </form>

        <div className="mt-6 text-xs text-white/40">
          Tip: If signup “works” but you can’t log in, check Supabase Auth settings
          (email confirmation, password policy).
        </div>
      </div>
    </main>
  );
}