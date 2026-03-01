// FILE: app/puppies/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type PuppyRow = {
  id: string;
  name: string | null;
  sex: "male" | "female" | null;
  color: string | null;
  dob: string | null;
  status: string | null;
  price: number | null;
  buyer_id: string | null;
};

export default function PuppiesPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PuppyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login?next=/puppies");
        return;
      }

      const { data: pups, error: pErr } = await supabase
        .from("puppies")
        .select("id, name, sex, color, dob, status, price, buyer_id")
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (pErr) {
        setError(pErr.message);
        setRows([]);
      } else {
        setError(null);
        setRows((pups as PuppyRow[]) || []);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Puppies</h1>
            <p className="text-sm text-neutral-600">
              Select a puppy to generate or view its packet.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-0 bg-neutral-50 text-xs font-semibold text-neutral-700 px-4 py-3">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Sex</div>
            <div className="col-span-2">Color</div>
            <div className="col-span-2">DOB</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-neutral-600">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-neutral-600">
              No puppies yet. Add a puppy row in Supabase (Table Editor → puppies) and refresh.
            </div>
          ) : (
            rows.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-12 px-4 py-3 border-t border-neutral-200 text-sm items-center"
              >
                <div className="col-span-3 font-medium">
                  {p.name || "Unnamed Puppy"}
                </div>
                <div className="col-span-2">{p.sex || "—"}</div>
                <div className="col-span-2">{p.color || "—"}</div>
                <div className="col-span-2">{p.dob || "—"}</div>
                <div className="col-span-1">{p.status || "—"}</div>
                <div className="col-span-2 flex justify-end gap-2">
                  <a
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50"
                    href={`/puppies/${p.id}/packet`}
                  >
                    Packet
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}