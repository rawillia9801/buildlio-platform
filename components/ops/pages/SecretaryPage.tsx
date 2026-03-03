// FILE: components/ops/pages/SecretaryPage.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, Button, Input, Pill } from "@/components/ops/ui";

type Thread = {
  id: string;
  title: string;
  lane: "Puppies" | "Retail" | "Hosting" | "Personal";
  last: string;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
};

const mockThreads: Thread[] = [
  { id: "t1", title: "Angela — Max & Bandit", lane: "Puppies", last: "Pickup scheduled Aug 3. Payment plan follow-up." },
  { id: "t2", title: "Walmart — Fee Reconciliation", lane: "Retail", last: "Check commissions & shipping costs for WFS." },
  { id: "t3", title: "Domains — Renewals", lane: "Hosting", last: "List renewals next 45 days + nameserver status." },
  { id: "t4", title: "Daily Plan", lane: "Personal", last: "What’s critical today? Bills, orders, puppies." },
];

const seedMessages: Record<string, ChatMsg[]> = {
  t1: [
    { id: "m1", role: "assistant", text: "I’m ready. Paste what Angela sent and I’ll draft a clean reply + set the follow-up task.", ts: "09:12" },
  ],
  t2: [
    { id: "m1", role: "assistant", text: "Tell me the date range (or paste the statement). I’ll summarize fees and what looks off.", ts: "09:10" },
  ],
  t3: [
    { id: "m1", role: "assistant", text: "I can track every domain, renewal, and DNS target. When wired, I’ll alert before deadlines.", ts: "09:08" },
  ],
  t4: [
    { id: "m1", role: "assistant", text: "Here’s today’s mission: handle urgent messages, confirm payments, and review low-stock items.", ts: "09:05" },
  ],
};

function laneTone(lane: Thread["lane"]) {
  switch (lane) {
    case "Puppies": return "ok";
    case "Retail": return "important";
    case "Hosting": return "routine";
    case "Personal": return "routine";
  }
}

export function SecretaryPage() {
  const [activeId, setActiveId] = useState<string>("t4");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Record<string, ChatMsg[]>>(seedMessages);

  const activeThread = useMemo(() => mockThreads.find(t => t.id === activeId)!, [activeId]);
  const activeMsgs = messages[activeId] || [];

  function send() {
    const text = draft.trim();
    if (!text) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text, ts };
    const assistantMsg: ChatMsg = {
      id: `a-${Date.now() + 1}`,
      role: "assistant",
      ts,
      text:
        "Understood. (Visual mode) When we wire this: I’ll link this thread to the correct buyer/site/record, draft the reply, and create the follow-up task automatically.",
    };

    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), userMsg, assistantMsg],
    }));
    setDraft("");
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Threads */}
      <Card>
        <div className="xl:col-span-3">
          <CardHeader title="THREADS" subtitle="Choose a lane. Keep it organized." />
          <div className="p-3">
            {mockThreads.map((t) => {
              const active = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={[
                    "mb-2 w-full rounded-2xl border p-3 text-left transition",
                    active ? "border-[#0b5fff]/30 bg-[#0b5fff]/5" : "border-black/10 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    <Pill tone={laneTone(t.lane)}>{t.lane.toUpperCase()}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{t.last}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Chat */}
      <div className="xl:col-span-6 space-y-4">
        <Card>
          <CardHeader
            title="SECRETARY"
            subtitle={activeThread.title}
            right={<Button variant="ghost">NEW THREAD</Button>}
          />
          <div className="max-h-[56vh] overflow-auto px-5 py-4">
            <div className="space-y-3">
              {activeMsgs.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-800",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-2 text-[11px] opacity-70">{m.ts}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-black/5 p-4">
            <div className="flex gap-2">
<Input
  value={draft}
  onChange={(e) => setDraft(e.target.value)} // <-- Update this line!
  placeholder="Ask me anything: buyers, puppies, orders, domains, bills..."
/>
              <Button variant="primary" onClick={send}>
                SEND
              </Button>
            </div>

            {/* Suggestion chips (do NOT auto-fill input) */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Today’s priorities",
                "Unpaid balances",
                "Upcoming puppy milestones",
                "Domain renewals (45 days)",
                "Draft a reply",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setDraft(chip)}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Context panel */}
      <div className="xl:col-span-3 space-y-4">
        <Card>
          <CardHeader title="CONTEXT" subtitle="This auto-populates when wired." />
          <div className="p-5 text-sm text-slate-600 space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="text-xs font-semibold tracking-widest text-slate-500">LINKED ENTITIES</div>
              <div className="mt-2 text-sm text-slate-800">
                Buyer: —<br />
                Puppies: —<br />
                Order: —<br />
                Domain/Site: —
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="text-xs font-semibold tracking-widest text-slate-500">SUGGESTED TASKS</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                <li>Follow up on payments</li>
                <li>Send contract + receipt</li>
                <li>Confirm pickup details</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="GUARDRAILS" subtitle="Keeps replies clean and safe." />
          <div className="p-5 text-sm text-slate-600 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
              <span>Don’t store secrets in chat</span>
              <span className="text-xs font-semibold text-emerald-700">ON</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
              <span>Always propose tasks</span>
              <span className="text-xs font-semibold text-emerald-700">ON</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
              <span>Require approval before actions</span>
              <span className="text-xs font-semibold text-emerald-700">ON</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}