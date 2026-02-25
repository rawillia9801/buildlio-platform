// FILE: app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    router.push("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 18, padding: 18, boxShadow: "0 16px 60px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 950, fontSize: 18 }}>Login</div>
        <div style={{ marginTop: 8, color: "rgba(0,0,0,0.55)" }}>Access generation, saved projects, and exports.</div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: "rgba(0,0,0,0.60)" }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginTop: 6, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", padding: "12px 12px", outline: "none" }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: "rgba(0,0,0,0.60)" }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginTop: 6, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", padding: "12px 12px", outline: "none" }} />
        </div>

        {msg && <div style={{ marginTop: 12, color: "#b00020", fontWeight: 800 }}>{msg}</div>}

        <button onClick={onLogin} disabled={busy || !email || !password} style={{ marginTop: 14, width: "100%", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(0,0,0,0.12)", background: "#111", color: "#fff", fontWeight: 950, cursor: "pointer", opacity: busy || !email || !password ? 0.5 : 1 }}>
          {busy ? "Signing in…" : "Login"}
        </button>

        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => router.push("/")} style={{ borderRadius: 999, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.03)", fontWeight: 900 }}>
            Home
          </button>
          <button onClick={() => router.push("/signup")} style={{ borderRadius: 999, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.03)", fontWeight: 900 }}>
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}