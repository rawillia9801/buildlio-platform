"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

/* ───────────────── TYPES ───────────────── */

type LogItem = {
  kind: "you" | "system" | "error";
  text: string;
  at: string;
};

type PuppyDraft = {
  name?: string;
  sex?: string;
  color?: string;
  birth_weight_oz?: number;
  price?: number;
  registry_type?: string;
};

type FlowState =
  | "idle"
  | "await_name"
  | "await_sex"
  | "await_color"
  | "await_weight"
  | "await_price"
  | "await_registry"
  | "confirm";

/* ───────────────── PAGE ───────────────── */

export default function BreederChatPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogItem[]>([]);
  const [busy, setBusy] = useState(false);

  const [flow, setFlow] = useState<FlowState>("idle");
  const [puppy, setPuppy] = useState<PuppyDraft>({});

  /* ───────────────── AUTH ───────────────── */

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login?next=/breeder");
      }
    })();
  }, [router, supabase]);

  /* ───────────────── HELPERS ───────────────── */

  function push(kind: LogItem["kind"], text: string) {
    setLog((prev) => [
      ...prev,
      { kind, text, at: new Date().toISOString() },
    ]);
  }

  function resetFlow() {
    setFlow("idle");
    setPuppy({});
  }

  /* ───────────────── SUBMIT TO API ───────────────── */

  async function submitPuppy(finalPuppy: PuppyDraft) {
    setBusy(true);

    const payload = {
      actions: [
        {
          type: "create_puppy",
          ...finalPuppy,
        },
      ],
    };

    try {
      const res = await fetch("/api/breeder-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        push("error", json?.error || "Insert failed.");
      } else {
        push("system", "Puppy successfully added.");
        push("system", JSON.stringify(json, null, 2));
      }
    } catch {
      push("error", "Network error.");
    }

    setBusy(false);
    resetFlow();
  }

  /* ───────────────── MAIN SEND HANDLER ───────────────── */

  async function send() {
    const message = input.trim();
    if (!message) return;

    push("you", message);
    setInput("");

    // IDLE MODE
    if (flow === "idle") {
      if (message.toLowerCase().includes("add puppy")) {
        setFlow("await_name");
        push("system", "What is the puppy's name?");
        return;
      }

      push(
        "system",
        "You can say things like 'Add puppy' or 'Create litter'."
      );
      return;
    }

    // FLOW STEPS
    if (flow === "await_name") {
      setPuppy((p) => ({ ...p, name: message }));
      setFlow("await_sex");
      push("system", "Is the puppy male or female?");
      return;
    }

    if (flow === "await_sex") {
      setPuppy((p) => ({ ...p, sex: message.toLowerCase() }));
      setFlow("await_color");
      push("system", "What color or collar description?");
      return;
    }

    if (flow === "await_color") {
      setPuppy((p) => ({ ...p, color: message }));
      setFlow("await_weight");
      push("system", "Birth weight in ounces?");
      return;
    }

    if (flow === "await_weight") {
      const weight = Number(message);
      if (!Number.isFinite(weight)) {
        push("system", "Please enter a number for weight.");
        return;
      }
      setPuppy((p) => ({ ...p, birth_weight_oz: weight }));
      setFlow("await_price");
      push("system", "What is the price?");
      return;
    }

    if (flow === "await_price") {
      const price = Number(message);
      if (!Number.isFinite(price)) {
        push("system", "Please enter a valid number for price.");
        return;
      }
      setPuppy((p) => ({ ...p, price }));
      setFlow("await_registry");
      push("system", "Registry type? (CKC, AKC, etc)");
      return;
    }

    if (flow === "await_registry") {
      const finalPuppy = { ...puppy, registry_type: message };
      push("system", "Adding puppy now...");
      await submitPuppy(finalPuppy);
      return;
    }
  }

  /* ───────────────── UI ───────────────── */

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between">
          <h1 className="text-lg font-semibold text-cyan-400">
            Breeder Command Interface
          </h1>
          <a
            href="/dashboard"
            className="text-sm border border-neutral-700 px-3 py-2 rounded hover:bg-neutral-800"
          >
            Dashboard
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-8 grid gap-6">
        <div className="border border-neutral-800 rounded-xl bg-neutral-900 p-6 space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {log.map((item, i) => (
              <div
                key={i}
                className={`text-sm p-3 rounded-lg ${
                  item.kind === "you"
                    ? "bg-neutral-800"
                    : item.kind === "error"
                    ? "bg-red-900 text-red-200"
                    : "bg-green-900 text-green-200"
                }`}
              >
                {item.text}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type here..."
              className="flex-1 bg-black border border-neutral-700 rounded-lg px-4 py-2 text-sm"
              disabled={busy}
            />
            <button
              onClick={send}
              disabled={busy}
              className="bg-cyan-500 text-black px-4 py-2 rounded hover:bg-cyan-400 disabled:opacity-50"
            >
              {busy ? "Working..." : "Send"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}