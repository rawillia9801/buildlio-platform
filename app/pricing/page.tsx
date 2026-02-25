// FILE: app/pricing/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  const tiers = [
    {
      name: "Free",
      price: "$0",
      note: "Try Buildlio",
      items: ["5 credits / month", "Basic generation", "Export: text / HTML"],
      cta: "Start Free",
      href: "/signup",
    },
    {
      name: "Pro",
      price: "$29/mo",
      note: "For builders",
      items: ["100 credits / month", "Project history", "Better quality + stability", "Exports + versions"],
      cta: "Go Pro",
      href: "/signup",
    },
    {
      name: "Business",
      price: "$99/mo",
      note: "Teams & systems",
      items: ["500 credits / month", "Team seats (v1)", "Document templates (v1)", "Priority queue (v1)"],
      cta: "Start Business",
      href: "/signup",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Buildlio</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/")}
              style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.03)", fontWeight: 800 }}
            >
              Home
            </button>
            <button
              onClick={() => router.push("/login")}
              style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.03)", fontWeight: 800 }}
            >
              Login
            </button>
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <h1 style={{ fontSize: 44, letterSpacing: -0.6, margin: 0, fontWeight: 950 }}>Pricing</h1>
          <p style={{ marginTop: 10, color: "rgba(0,0,0,0.60)", maxWidth: 720, lineHeight: 1.5 }}>
            Buildlio is friendly, informative, helpful — and correct. Credits keep pricing simple and predictable.
          </p>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 16px 60px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 16 }}>{t.name}</div>
              <div style={{ marginTop: 8, fontSize: 34, fontWeight: 950, letterSpacing: -0.6 }}>{t.price}</div>
              <div style={{ marginTop: 6, color: "rgba(0,0,0,0.55)", fontWeight: 700 }}>{t.note}</div>

              <ul style={{ marginTop: 14, paddingLeft: 18, color: "rgba(0,0,0,0.70)", lineHeight: 1.6 }}>
                {t.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>

              <button
                onClick={() => router.push(t.href)}
                style={{
                  marginTop: 16,
                  width: "100%",
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 26, color: "rgba(0,0,0,0.55)", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 900 }}>Credit costs (default)</div>
          <div>Document: 1 credit • Website: 3 credits • Store: 4 credits • App: 5 credits • Agent: 5 credits</div>
        </div>
      </div>
    </div>
  );
}