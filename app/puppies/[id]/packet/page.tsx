// FILE: app/puppies/[id]/packet/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type PuppyRow = {
  id: string;
  name: string | null;
  buyer_id: string | null;
};

type PacketRow = {
  id: string;
  latest_version_no: number;
};

type VersionRow = {
  id: string;
  version_no: number;
  content_html: string | null;
  created_at: string;
};

export default function PuppyPacketPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const puppyId = params?.id;

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [puppy, setPuppy] = useState<PuppyRow | null>(null);

  const [packet, setPacket] = useState<PacketRow | null>(null);
  const [version, setVersion] = useState<VersionRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      router.replace(`/login?next=/puppies/${puppyId}/packet`);
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from("puppies")
      .select("id, name, buyer_id")
      .eq("id", puppyId)
      .single();

    if (pErr) {
      setError(pErr.message);
      setLoading(false);
      return;
    }

    setPuppy(p as PuppyRow);

    const { data: pkt, error: pktErr } = await supabase
      .from("puppy_packets")
      .select("id, latest_version_no")
      .eq("puppy_id", puppyId)
      .maybeSingle();

    if (pktErr) {
      setError(pktErr.message);
      setLoading(false);
      return;
    }

    if (!pkt) {
      setPacket(null);
      setVersion(null);
      setLoading(false);
      return;
    }

    setPacket(pkt as PacketRow);

    const { data: v, error: vErr } = await supabase
      .from("puppy_packet_versions")
      .select("id, version_no, content_html, created_at")
      .eq("packet_id", (pkt as any).id)
      .eq("version_no", (pkt as any).latest_version_no)
      .single();

    if (vErr) {
      setError(vErr.message);
      setLoading(false);
      return;
    }

    setVersion(v as VersionRow);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puppyId]);

  async function generate() {
    if (!puppyId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/puppy-packets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puppy_id: puppyId,
          buyer_id: puppy?.buyer_id || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate packet.");

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to generate packet.");
    } finally {
      setBusy(false);
    }
  }

  function print() {
    const iframe = document.getElementById("packetFrame") as HTMLIFrameElement | null;
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  }

  const title = puppy?.name ? `Packet — ${puppy.name}` : "Puppy Packet";

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-neutral-600">
              Generate a fresh packet or preview the latest version.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/puppies"
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Back
            </a>
            <button
              onClick={generate}
              disabled={busy}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate Packet"}
            </button>
            <button
              onClick={print}
              disabled={!version?.content_html}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              Print
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-neutral-600">Loading…</div>
        ) : !version?.content_html ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="text-sm font-semibold">No packet generated yet</div>
            <div className="mt-1 text-sm text-neutral-600">
              Click <span className="font-medium">Generate Packet</span> to create the first draft.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 px-4 py-3 text-xs text-neutral-600 flex items-center justify-between">
              <div>
                Version <span className="font-semibold">{version.version_no}</span>{" "}
                • Generated {new Date(version.created_at).toLocaleString()}
              </div>
              <div className="text-neutral-500">Preview</div>
            </div>

            <iframe
              id="packetFrame"
              title="Puppy Packet Preview"
              className="w-full"
              style={{ height: "75vh" }}
              srcDoc={version.content_html}
            />
          </div>
        )}
      </section>
    </main>
  );
}