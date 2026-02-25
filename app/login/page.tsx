// FILE: app/login/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "login" | "signup";

function supabaseServer() {
  const cookieStore = cookies(); // ✅ NOT async
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // Next's cookieStore supports set(name, value, options)
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

async function signInAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const sid = String(formData.get("sid") || "").trim();

  if (!email || !password) {
    redirect(`/login?e=${encodeURIComponent("Email and password are required.")}${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`);
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?e=${encodeURIComponent(error.message)}${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`);
  }

  // Go back to Nexus (preserve sid if provided)
  redirect(sid ? `/?sid=${encodeURIComponent(sid)}` : `/`);
}

async function signUpAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const sid = String(formData.get("sid") || "").trim();

  if (!email || !password) {
    redirect(`/login?m=signup&e=${encodeURIComponent("Email and password are required.")}${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`);
  }

  const supabase = supabaseServer();

  // NOTE: if email confirmations are enabled in Supabase, user may need to confirm
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // after email confirmation, Supabase can redirect here if you later add an auth callback route
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
        : undefined,
    },
  });

  if (error) {
    redirect(`/login?m=signup&e=${encodeURIComponent(error.message)}${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`);
  }

  // If confirmations are OFF, this will also set the session cookie.
  // If confirmations are ON, they'll confirm email then sign in.
  redirect(sid ? `/?sid=${encodeURIComponent(sid)}` : `/`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const mode: Mode = (Array.isArray(sp.m) ? sp.m[0] : sp.m) === "signup" ? "signup" : "login";
  const sid = (Array.isArray(sp.sid) ? sp.sid[0] : sp.sid) || "";
  const err = (Array.isArray(sp.e) ? sp.e[0] : sp.e) || "";

  return (
    <main style={styles.page}>
      <div style={styles.bgGrid} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.pip} />
            <div style={styles.brand}>BUILDLIO</div>
            <div style={styles.sep}>•</div>
            <div style={styles.tag}>SECURE ACCESS</div>
          </div>

          <div style={styles.modeRow}>
            <a href={`/login?m=login${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`} style={mode === "login" ? styles.tabOn : styles.tabOff}>
              LOGIN
            </a>
            <a href={`/login?m=signup${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`} style={mode === "signup" ? styles.tabOn : styles.tabOff}>
              SIGN UP
            </a>
          </div>
        </div>

        {err ? <div style={styles.errorBox}>{err}</div> : null}

        <form action={mode === "signup" ? signUpAction : signInAction} style={styles.form}>
          <input type="hidden" name="sid" value={sid} />

          <label style={styles.label}>EMAIL</label>
          <input name="email" type="email" placeholder="you@domain.com" autoComplete="email" required style={styles.input} />

          <label style={styles.label}>PASSWORD</label>
          <input name="password" type="password" placeholder="••••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} required style={styles.input} />

          <button type="submit" style={styles.button}>
            {mode === "signup" ? "CREATE ACCOUNT" : "ENTER NEXUS"}
          </button>

          <div style={styles.footRow}>
            <a href={sid ? `/?sid=${encodeURIComponent(sid)}` : "/"} style={styles.backLink}>
              ← Back to Nexus
            </a>
          </div>
        </form>

        <div style={styles.note}>
          If your Supabase project has <b>email confirmations</b> enabled, signup may require confirming your email before your session becomes active.
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#04040c",
    color: "#e8f4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    width: "min(520px, 92vw)",
    borderRadius: 18,
    border: "1px solid rgba(0,245,255,0.22)",
    background: "rgba(10,10,26,0.90)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
    backdropFilter: "blur(22px)",
    position: "relative",
    zIndex: 1,
    overflow: "hidden",
  },
  header: {
    padding: "18px 18px 14px",
    borderBottom: "1px solid rgba(0,245,255,0.12)",
    background: "rgba(0,245,255,0.02)",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#22ff88",
    boxShadow: "0 0 12px rgba(34,255,136,0.55)",
  },
  brand: { color: "#00f5ff", fontWeight: 800, letterSpacing: 4, fontSize: 12 },
  sep: { color: "rgba(0,245,255,0.35)" },
  tag: { color: "rgba(122,155,181,0.95)", fontSize: 11, letterSpacing: 2 },
  modeRow: { display: "flex", gap: 10, marginTop: 14 },
  tabOn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,245,255,0.38)",
    background: "rgba(0,245,255,0.06)",
    color: "#00f5ff",
    fontSize: 11,
    letterSpacing: 2,
    textDecoration: "none",
    flex: 1,
  },
  tabOff: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,245,255,0.18)",
    background: "rgba(0,245,255,0.02)",
    color: "rgba(122,155,181,0.95)",
    fontSize: 11,
    letterSpacing: 2,
    textDecoration: "none",
    flex: 1,
  },
  errorBox: {
    margin: 16,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255, 90, 90, 0.35)",
    background: "rgba(255, 90, 90, 0.08)",
    color: "rgba(255, 220, 220, 0.95)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  form: { padding: 18, display: "flex", flexDirection: "column", gap: 10 },
  label: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(0,245,255,0.55)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(0,245,255,0.25)",
    background: "rgba(4,4,12,0.92)",
    color: "#e8f4ff",
    padding: "14px 14px",
    outline: "none",
    fontSize: 14,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  button: {
    marginTop: 8,
    borderRadius: 14,
    border: "none",
    padding: "14px 14px",
    fontWeight: 900,
    letterSpacing: 2,
    cursor: "pointer",
    color: "#04040c",
    background: "linear-gradient(90deg, #00f5ff, #a855f7)",
    boxShadow: "0 0 34px rgba(0,245,255,0.25)",
  },
  footRow: { marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" },
  backLink: {
    color: "rgba(122,155,181,0.95)",
    fontSize: 12,
    textDecoration: "none",
  },
  note: {
    padding: "0 18px 18px",
    color: "rgba(122,155,181,0.95)",
    fontSize: 12,
    lineHeight: 1.45,
  },
};