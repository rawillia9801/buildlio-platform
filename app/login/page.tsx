// FILE: app/login/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createBrowserClient(url, key);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Redirect target (supports ?next=/dashboard)
      const next = params.get("next") || "/dashboard";
      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword() {
    setError(null);
    setMsg(null);

    const em = email.trim();
    if (!em) {
      setError("Enter your email first, then click Reset Password.");
      return;
    }

    setBusy(true);
    try {
      // If you have a dedicated reset page, set redirectTo accordingly.
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;

      setMsg("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-white text-neutral-900 relative overflow-hidden">
      {/* If you have any canvas/animation in layout, this ensures the form stays clickable */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div className="relative z-50 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Sign in to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Email
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900/10"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Password
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900/10"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {msg ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {msg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-neutral-900 text-white py-2.5 font-medium disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onResetPassword}
                disabled={busy}
                className="text-sm text-neutral-700 underline underline-offset-2 disabled:opacity-60"
              >
                Reset password
              </button>

              <button
                type="button"
                onClick={() => router.replace("/")}
                className="text-sm text-neutral-700 underline underline-offset-2"
              >
                Back to home
              </button>
            </div>
          </form>

          <div className="mt-6 text-xs text-neutral-500">
            If clicks still don’t work, you have an overlay in a layout/component
            above this page. We’ll disable pointer events on it next.
          </div>
        </div>
      </div>
    </main>
  );
}