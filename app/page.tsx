// FILE: app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient, type Session } from "@supabase/supabase-js";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

type RouteResponse = {
  text?: string;
  assistant?: string;
  threadId?: string | null;
  context?: {
    buyerName?: string | null;
    puppyName?: string | null;
  };
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const sb =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

const STARTER_PROMPTS = [
  "How much do I still owe?",
  "What was my puppy’s latest update?",
  "Do I have any documents left to sign?",
  "Has my puppy had vaccines yet?",
  "What is my pickup or delivery status?",
  "What was my puppy’s most recent weight?",
];

function makeId(prefix = "msg") {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFromEmail(email?: string | null) {
  if (!email) return "C";
  return email.trim().charAt(0).toUpperCase() || "C";
}

function displayNameFromEmail(email?: string | null) {
  if (!email) return "there";
  return email.split("@")[0] || "there";
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [puppyName, setPuppyName] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId("assistant"),
      role: "assistant",
      text:
        "Hi, I’m ChiChi. I can help with your puppy profile, payments, documents, messages, milestones, health records, and pickup details.",
      createdAt: nowLabel(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!sb) {
        if (mounted) setSessionChecked(true);
        return;
      }

      const { data } = await sb.auth.getSession();
      if (mounted) {
        setSession(data.session ?? null);
        setSessionChecked(true);
      }
    }

    loadSession();

    const { data: authListener } = sb?.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setSessionChecked(true);
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const signedIn = !!session?.access_token;
  const userEmail = session?.user?.email || null;
  const accountLabel = buyerName || displayNameFromEmail(userEmail);
  const puppyLabel = puppyName || "your puppy";

  const quickFacts = useMemo(() => {
    return [
      {
        label: "Assistant",
        value: "ChiChi",
        sub: "Account-aware support",
      },
      {
        label: "Focus",
        value: signedIn ? "Portal-linked" : "Sign-in required",
        sub: signedIn
          ? "Uses your buyer and puppy records"
          : "Connect your account to load your portal context",
      },
      {
        label: "Best For",
        value: "Questions + guidance",
        sub: "Payments, milestones, documents, messages, pickup",
      },
    ];
  }, [signedIn]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const question = draft.trim();
    if (!question || sending) return;

    if (!signedIn || !session?.access_token) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId("user"),
          role: "user",
          text: question,
          createdAt: nowLabel(),
        },
        {
          id: makeId("assistant"),
          role: "assistant",
          text: "Please sign in through your portal account first so I can safely load your puppy and account details.",
          createdAt: nowLabel(),
        },
      ]);
      setDraft("");
      return;
    }

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      text: question,
      createdAt: nowLabel(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    try {
      const routeMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/buildlio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          threadId,
          accessToken: session.access_token,
          max_tokens: 1200,
          messages: routeMessages,
        }),
      });

      const data = (await res.json()) as RouteResponse;

      const assistantText =
        data?.text?.trim() ||
        "I hit a problem while loading your account context. Please try again.";

      if (data?.threadId) setThreadId(data.threadId);
      if (data?.context?.buyerName) setBuyerName(data.context.buyerName);
      if (data?.context?.puppyName) setPuppyName(data.context.puppyName);

      setMessages((prev) => [
        ...prev,
        {
          id: makeId("assistant"),
          role: "assistant",
          text: assistantText,
          createdAt: nowLabel(),
        },
      ]);
    } catch (error) {
      console.error("ChiChi page error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: makeId("assistant"),
          role: "assistant",
          text: "I ran into a connection error while trying to answer that. Please try again.",
          createdAt: nowLabel(),
        },
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function usePrompt(prompt: string) {
    setDraft(prompt);
    textareaRef.current?.focus();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f2ea_0%,#f3ece2_48%,#efe6db_100%)] text-stone-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#d9cbb8] bg-white/70 px-5 py-4 shadow-[0_12px_40px_rgba(146,116,78,0.10)] backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#b79267_0%,#8b6a4b_100%)] text-lg font-black text-white shadow-[0_12px_28px_rgba(146,116,78,0.28)]">
              C
            </div>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9c7b58]">
                Southwest Virginia Chihuahua
              </div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#4e3a28] sm:text-3xl">
                ChiChi Assistant
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/portal"
              className="inline-flex items-center justify-center rounded-xl border border-[#d8cab7] bg-white px-4 py-2 text-sm font-semibold text-[#6f5338] shadow-sm transition hover:-translate-y-[1px] hover:bg-[#fffaf5]"
            >
              Open Portal
            </Link>
            <Link
              href="/portal/messages"
              className="inline-flex items-center justify-center rounded-xl bg-[#7b5b3f] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(123,91,63,0.24)] transition hover:bg-[#6e5037]"
            >
              Messages
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <div className="overflow-hidden rounded-[32px] border border-[#deceba] bg-white/72 shadow-[0_18px_52px_rgba(146,116,78,0.12)] backdrop-blur">
              <div className="relative overflow-hidden border-b border-[#eadfce] px-6 py-6 sm:px-8">
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#ecdcc8] blur-3xl opacity-70" />
                <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-[#f5e9d8] blur-3xl opacity-80" />

                <div className="relative">
                  <div className="mb-3 inline-flex items-center rounded-full border border-[#e7d8c5] bg-[#fffaf5]/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#a17a54]">
                    Account-aware support
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
                    <div>
                      <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight text-[#4f3a28] sm:text-4xl">
                        {sessionChecked
                          ? signedIn
                            ? `Welcome back, ${accountLabel}`
                            : "Your puppy portal assistant"
                          : "Loading your account…"}
                      </h2>

                      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#705742] sm:text-[15px]">
                        ChiChi is here to answer questions about your puppy, payments,
                        documents, messages, health records, milestones, and pickup or
                        delivery details.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <div className="rounded-2xl border border-[#e7d8c5] bg-white/75 px-4 py-3 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9f7d58]">
                            Account
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#4e3a28]">
                            {userEmail || "Not signed in"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#e7d8c5] bg-white/75 px-4 py-3 shadow-sm">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9f7d58]">
                            Puppy
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#4e3a28]">
                            {signedIn ? puppyLabel : "Portal sign-in required"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-[#e4d3be] bg-[linear-gradient(180deg,#fffaf4_0%,#fffdfb_100%)] p-5 shadow-sm">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b56]">
                        Best questions to ask
                      </div>

                      <div className="space-y-2">
                        {STARTER_PROMPTS.slice(0, 4).map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => usePrompt(prompt)}
                            className="w-full rounded-2xl border border-[#eadcc9] bg-white px-4 py-3 text-left text-sm font-medium text-[#5f4632] transition hover:-translate-y-[1px] hover:bg-[#fff9f2]"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
                <div className="min-h-[620px] border-r border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#fff9f4_100%)]">
                  <div className="h-[460px] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isUser = message.role === "user";
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={[
                                "max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm sm:max-w-[78%]",
                                isUser
                                  ? "bg-[linear-gradient(135deg,#8b6a4b_0%,#6f5338_100%)] text-white"
                                  : "border border-[#eadcc9] bg-white text-[#5a4330]",
                              ].join(" ")}
                            >
                              <div className="whitespace-pre-wrap text-sm leading-7">
                                {message.text}
                              </div>
                              <div
                                className={`mt-2 text-[11px] ${
                                  isUser ? "text-white/80" : "text-[#9b7c5a]"
                                }`}
                              >
                                {message.createdAt}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {sending && (
                        <div className="flex justify-start">
                          <div className="max-w-[88%] rounded-[24px] border border-[#eadcc9] bg-white px-4 py-3 text-sm text-[#6a523d] shadow-sm">
                            ChiChi is thinking…
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  <div className="border-t border-[#eadfce] bg-white/80 px-5 py-4 sm:px-6">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="rounded-[26px] border border-[#dfcfba] bg-[#fffaf4] p-3 shadow-inner">
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          placeholder="Ask ChiChi about payments, updates, documents, milestones, messages, or your puppy’s health."
                          className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[#4f3a28] outline-none placeholder:text-[#b19473]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {STARTER_PROMPTS.slice(0, 3).map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => usePrompt(prompt)}
                              className="rounded-full border border-[#e3d5c3] bg-white px-3 py-1.5 text-xs font-semibold text-[#7b5f43] transition hover:bg-[#fff8f0]"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>

                        <button
                          type="submit"
                          disabled={sending || !draft.trim()}
                          className="inline-flex items-center justify-center rounded-xl bg-[#7b5b3f] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(123,91,63,0.24)] transition hover:bg-[#6e5037] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sending ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <aside className="bg-[linear-gradient(180deg,#fff8f0_0%,#fffdfb_100%)] px-5 py-5 sm:px-6">
                  <div className="space-y-4">
                    <div className="rounded-[26px] border border-[#e5d6c4] bg-white p-5 shadow-sm">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b56]">
                        Account snapshot
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-2xl bg-[#faf3ea] px-4 py-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9c7853]">
                            Buyer
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#4f3a28]">
                            {signedIn ? accountLabel : "Not signed in"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-[#faf3ea] px-4 py-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9c7853]">
                            Puppy
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#4f3a28]">
                            {signedIn ? puppyLabel : "Portal sign-in required"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-[#faf3ea] px-4 py-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9c7853]">
                            Thread
                          </div>
                          <div className="mt-1 break-all text-sm font-semibold text-[#4f3a28]">
                            {threadId || "A new conversation will be created automatically"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-[#e5d6c4] bg-white p-5 shadow-sm">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b56]">
                        What ChiChi can help with
                      </div>

                      <div className="space-y-3">
                        {quickFacts.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-[#eee2d3] bg-[#fffaf4] px-4 py-3"
                          >
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9d7a55]">
                              {item.label}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#4f3a28]">
                              {item.value}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-[#876a4d]">
                              {item.sub}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-[#e5d6c4] bg-white p-5 shadow-sm">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b56]">
                        Portal links
                      </div>

                      <div className="grid gap-2">
                        {[
                          { href: "/portal/mypuppy", label: "My Puppy" },
                          { href: "/portal/payments", label: "Payments" },
                          { href: "/portal/documents", label: "Documents" },
                          { href: "/portal/messages", label: "Messages" },
                          { href: "/portal/transportation", label: "Transportation" },
                        ].map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-2xl border border-[#eadcc8] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-[#654b35] transition hover:bg-white"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-[#e5d6c4] bg-white p-5 shadow-sm">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b56]">
                        Notes
                      </div>
                      <p className="text-sm leading-7 text-[#765b42]">
                        ChiChi is designed to answer from your portal data when you’re
                        signed in. If a detail is missing from your account, ChiChi will
                        say so instead of guessing.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="xl:col-span-4">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[32px] border border-[#ddcfbd] bg-white/72 p-6 shadow-[0_18px_52px_rgba(146,116,78,0.12)] backdrop-blur">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d7b28d_0%,#b38a61_100%)] text-sm font-black text-white">
                    {initialsFromEmail(userEmail)}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9d7b56]">
                      Portal session
                    </div>
                    <div className="text-sm font-semibold text-[#4e3a28]">
                      {signedIn ? "Connected" : "Not connected"}
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-7 text-[#705742]">
                  {signedIn
                    ? "Your portal session is active. ChiChi can use your account context to answer questions more accurately."
                    : "Sign in through your portal account to let ChiChi answer with your real buyer, puppy, payment, and document data."}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/portal"
                    className="inline-flex items-center justify-center rounded-xl bg-[#7b5b3f] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(123,91,63,0.24)] transition hover:bg-[#6e5037]"
                  >
                    Go to Portal
                  </Link>

                  <Link
                    href="/portal/profile"
                    className="inline-flex items-center justify-center rounded-xl border border-[#dccdbb] bg-white px-4 py-2 text-sm font-semibold text-[#6f5338] transition hover:bg-[#fffaf5]"
                  >
                    Profile
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-[#ddcfbd] bg-[linear-gradient(180deg,#fffaf4_0%,#fffdfb_100%)] p-6 shadow-[0_18px_52px_rgba(146,116,78,0.10)]">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#9d7b56]">
                  Suggested questions
                </div>

                <div className="grid gap-3">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => usePrompt(prompt)}
                      className="rounded-2xl border border-[#e8dac8] bg-white px-4 py-3 text-left text-sm font-medium text-[#5e4734] transition hover:-translate-y-[1px] hover:bg-[#fffaf4]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}