/*
  FILE: app/dashboard/page.tsx
  BUILDLIO — Dashboard + Claude Chat Console (via /api/buildlio)
  - Single-file page you can drop in immediately.
  - Uses your existing POST /api/buildlio endpoint (same payload shape you used on the Nexus page).
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "user" | "assistant" | "system";
type ChatMsg = {
  id: string;
  role: Exclude<Role, "system">;
  content: string;
  ts: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Neural console online.\n\nTell me what you want done (e.g., “Draft an SOP”, “Create a customer email”, “Plan a feature”, “Write code for X”).",
      ts: Date.now(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const SYSTEM_PROMPT = useMemo(
    () => `You are Buildlio’s Claude-powered operations console.
You perform tasks with crisp, step-by-step clarity and produce usable outputs.
When the user asks for code, deliver complete, correct files (not snippets) unless they explicitly request otherwise.
When the user asks for plans, produce concrete checklists, templates, and ready-to-send copy.
Ask short, targeted follow-ups only when absolutely necessary.`,
    []
  );

  useEffect(() => {
    // auto-scroll to bottom on new messages
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setIsSending(true);

    const userMsg: ChatMsg = { id: uid(), role: "user", content: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    // create placeholder assistant bubble we will "type" into
    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "…", ts: Date.now() },
    ]);

    // Build Claude message history from our chat
    const chatHistory = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2200,
          system: SYSTEM_PROMPT,
          messages: chatHistory,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`API error (${res.status}). ${t || ""}`.trim());
      }

      const data = await res.json().catch(() => ({} as any));
      const fullText: string =
        data?.text ||
        data?.content?.[0]?.text ||
        "No response text returned. (Check your /api/buildlio handler output shape.)";

      // smooth type-in effect
      let i = 0;
      const step = 2;

      const typeTick = () => {
        i = Math.min(fullText.length, i + step);
        const slice = fullText.slice(0, i);

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: slice } : m))
        );

        if (i < fullText.length) {
          window.setTimeout(typeTick, 8);
        } else {
          setIsSending(false);
        }
      };

      // start typing (replace the placeholder “…”)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: "" } : m))
      );
      window.setTimeout(typeTick, 20);
    } catch (e: any) {
      setIsSending(false);
      setError(e?.message || "Unknown error");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Link disrupted. Your /api/buildlio endpoint did not respond successfully.\n\nIf you paste the server route code, I’ll wire it correctly.",
              }
            : m
        )
      );
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = input;
    setInput("");
    sendMessage(t);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function quickPrompt(p: string) {
    setInput(p);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }

  return (
    <main className="min-h-screen bg-[#020208] text-[#e8f4ff]">
      <style jsx global>{`
        :root {
          --cyan: #00f9ff;
          --magenta: #c026d3;
          --glass: rgba(10, 15, 30, 0.35);
          --glass2: rgba(3, 6, 18, 0.72);
          --border: rgba(0, 249, 255, 0.18);
        }
        html,
        body {
          background: #020208;
        }
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 18px rgba(0, 249, 255, 0.18);
          }
          50% {
            box-shadow: 0 0 28px rgba(0, 249, 255, 0.26);
          }
        }
        @keyframes floaty {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-[rgba(0,249,255,0.12)] bg-[rgba(2,2,8,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl border border-[rgba(0,249,255,0.25)] bg-[rgba(0,249,255,0.06)]"
              style={{ animation: "glow 3.6s ease-in-out infinite" }}
            />
            <div>
              <div className="text-sm tracking-[0.35em] text-white">BUILDLIO</div>
              <div className="text-xs tracking-[0.22em] text-[rgba(0,249,255,0.75)]">
                DASHBOARD CONSOLE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-[rgba(0,249,255,0.18)] bg-[rgba(0,249,255,0.05)] px-3 py-2 text-xs tracking-widest text-[rgba(0,249,255,0.85)] transition hover:bg-[rgba(0,249,255,0.12)]"
            >
              HOME
            </button>
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg border border-[rgba(0,249,255,0.18)] bg-[rgba(0,249,255,0.05)] px-3 py-2 text-xs tracking-widest text-[rgba(0,249,255,0.85)] transition hover:bg-[rgba(0,249,255,0.12)]"
            >
              LOGIN
            </button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[320px_1fr]">
        {/* Left: Quick Actions */}
        <aside className="rounded-2xl border border-[rgba(0,249,255,0.14)] bg-[rgba(10,15,30,0.25)] p-4 backdrop-blur-2xl">
          <div className="mb-3 text-xs tracking-[0.35em] text-[rgba(0,249,255,0.8)]">
            QUICK DIRECTIVES
          </div>

          <div className="grid gap-2">
            <button
              onClick={() =>
                quickPrompt(
                  "Create a task list for my next 7 days to push Buildlio forward. Include coding tasks, testing, and marketing."
                )
              }
              className="rounded-xl border border-[rgba(0,249,255,0.14)] bg-[rgba(3,6,18,0.55)] px-3 py-3 text-left text-sm transition hover:bg-[rgba(3,6,18,0.72)]"
            >
              7-Day Execution Plan
              <div className="mt-1 text-xs text-[rgba(232,244,255,0.65)]">
                Concrete checklist + priorities
              </div>
            </button>

            <button
              onClick={() =>
                quickPrompt(
                  "Draft a professional customer email. Context: I need to explain X, offer options, and keep it short and polite."
                )
              }
              className="rounded-xl border border-[rgba(0,249,255,0.14)] bg-[rgba(3,6,18,0.55)] px-3 py-3 text-left text-sm transition hover:bg-[rgba(3,6,18,0.72)]"
            >
              Draft Email
              <div className="mt-1 text-xs text-[rgba(232,244,255,0.65)]">Ready-to-send copy</div>
            </button>

            <button
              onClick={() =>
                quickPrompt(
                  "Write a complete Next.js page file for a new feature. Ask me only the minimum questions needed."
                )
              }
              className="rounded-xl border border-[rgba(0,249,255,0.14)] bg-[rgba(3,6,18,0.55)] px-3 py-3 text-left text-sm transition hover:bg-[rgba(3,6,18,0.72)]"
            >
              Generate Code File
              <div className="mt-1 text-xs text-[rgba(232,244,255,0.65)]">Full file output</div>
            </button>

            <button
              onClick={() =>
                quickPrompt(
                  "Create an SOP (step-by-step) for handling new leads, including follow-ups and reminders."
                )
              }
              className="rounded-xl border border-[rgba(0,249,255,0.14)] bg-[rgba(3,6,18,0.55)] px-3 py-3 text-left text-sm transition hover:bg-[rgba(3,6,18,0.72)]"
            >
              SOP / Workflow
              <div className="mt-1 text-xs text-[rgba(232,244,255,0.65)]">Process you can reuse</div>
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-[rgba(0,249,255,0.14)] bg-[rgba(0,249,255,0.04)] p-3 text-xs text-[rgba(232,244,255,0.7)]">
            <div className="mb-1 text-[rgba(0,249,255,0.8)]">Tip</div>
            Start messages with an action verb:
            <span className="text-[rgba(232,244,255,0.9)]"> “Draft…”, “Build…”, “Fix…”, “Summarize…”, “Plan…”</span>
          </div>
        </aside>

        {/* Right: Chat */}
        <section className="rounded-2xl border border-[rgba(0,249,255,0.14)] bg-[rgba(10,15,30,0.25)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-[rgba(0,249,255,0.12)] px-4 py-4">
            <div>
              <div className="text-sm tracking-[0.25em] text-white">CLAUDE CHAT</div>
              <div className="text-xs tracking-widest text-[rgba(0,249,255,0.75)]">
                /api/buildlio
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setMessages([
                    {
                      id: uid(),
                      role: "assistant",
                      content:
                        "Neural console reset.\n\nTell me what you want done (e.g., “Draft an SOP”, “Create a customer email”, “Plan a feature”, “Write code for X”).",
                      ts: Date.now(),
                    },
                  ]);
                }}
                className="rounded-lg border border-[rgba(0,249,255,0.18)] bg-[rgba(3,6,18,0.55)] px-3 py-2 text-xs tracking-widest text-[rgba(0,249,255,0.85)] transition hover:bg-[rgba(3,6,18,0.72)]"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="h-[58vh] overflow-y-auto px-4 py-4 lg:h-[70vh]"
          >
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={[
                    "max-w-[92%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto border-[rgba(192,38,211,0.22)] bg-[rgba(192,38,211,0.08)]"
                      : "mr-auto border-[rgba(0,249,255,0.18)] bg-[rgba(0,249,255,0.05)]",
                  ].join(" ")}
                >
                  <div className="mb-1 text-[10px] tracking-[0.35em] text-[rgba(232,244,255,0.55)]">
                    {m.role === "user" ? "YOU" : "CLAUDE"}
                  </div>
                  <div className="text-[rgba(232,244,255,0.92)]">{m.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-3 rounded-xl border border-[rgba(255,80,80,0.35)] bg-[rgba(255,80,80,0.08)] px-4 py-3 text-sm text-[rgba(255,200,200,0.95)]">
              {error}
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-[rgba(0,249,255,0.12)] p-4">
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a directive…"
                rows={3}
                className="w-full resize-none rounded-2xl border border-[rgba(0,249,255,0.18)] bg-[rgba(3,6,18,0.70)] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(232,244,255,0.35)] focus:border-[rgba(0,249,255,0.45)]"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs tracking-widest text-[rgba(232,244,255,0.55)]">
                  {isSending ? "TRANSMITTING…" : "READY"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => quickPrompt("Write a complete file for: app/api/buildlio/route.ts using Anthropic SDK and return JSON { text }.")}
                    className="rounded-xl border border-[rgba(0,249,255,0.18)] bg-[rgba(0,249,255,0.05)] px-3 py-2 text-xs tracking-widest text-[rgba(0,249,255,0.85)] transition hover:bg-[rgba(0,249,255,0.10)]"
                  >
                    FIX API ROUTE
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="rounded-xl bg-[linear-gradient(135deg,var(--cyan),var(--magenta))] px-4 py-2 text-xs font-extrabold tracking-[0.30em] text-black transition disabled:opacity-50 disabled:grayscale"
                    style={!isSending ? { animation: "glow 3.6s ease-in-out infinite" } : undefined}
                  >
                    SEND
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-3 text-[11px] tracking-widest text-[rgba(232,244,255,0.45)]">
              Uses: <span className="text-[rgba(0,249,255,0.75)]">POST /api/buildlio</span> • Model:{" "}
              <span className="text-[rgba(0,249,255,0.75)]">claude-sonnet-4-20250514</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}