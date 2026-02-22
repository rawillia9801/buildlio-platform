// FILE: components/documents/DocumentBuilderHome.tsx
//
// CHANGELOG
// - v1.0
//   * White "typing" prompt
//   * Category tiles animated in
//   * Legal flow: state/county + motion search + motion detail panel
//
// REQUIREMENTS
// - Tailwind enabled
// - No external UI libs required

"use client";

import { useMemo, useState } from "react";
import TypewriterPrompt from "@/components/documents/TypewriterPrompt";
import { DOC_CATEGORIES, type DocCategoryKey } from "@/lib/documents/categories";
import { MOTIONS, type MotionTemplate } from "@/lib/documents/motions";

type ViewMode = "home" | "legal" | "letter" | "contracts" | "policies" | "business";

const STATES = [
  { code: "VA", name: "Virginia" },
  { code: "TN", name: "Tennessee" },
  { code: "NC", name: "North Carolina" },
  { code: "WV", name: "West Virginia" },
  { code: "KY", name: "Kentucky" },
];

const COUNTIES_BY_STATE: Record<string, string[]> = {
  VA: ["Smyth", "Washington", "Wythe", "Grayson", "Russell", "Buchanan", "Tazewell", "Scott", "Lee"],
  TN: ["Sullivan", "Washington", "Greene", "Hawkins"],
  NC: ["Alleghany", "Ashe", "Watauga"],
  WV: ["Mercer", "Raleigh", "Wyoming"],
  KY: ["Bell", "Harlan", "Knox"],
};

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function DocumentBuilderHome() {
  const [mode, setMode] = useState<ViewMode>("home");

  // Legal selectors
  const [stateCode, setStateCode] = useState<string>("VA");
  const [county, setCounty] = useState<string>("Smyth");
  const [query, setQuery] = useState<string>("");
  const [selectedMotion, setSelectedMotion] = useState<MotionTemplate | null>(null);

  const counties = useMemo(() => COUNTIES_BY_STATE[stateCode] ?? [], [stateCode]);

  const legalResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    return MOTIONS
      .filter((m) => (m.state === "ALL" ? true : m.state === stateCode))
      .filter((m) => (m.county === "ALL" ? true : m.county.toLowerCase() === county.toLowerCase()))
      .filter((m) => {
        if (!q) return true;
        const hay = `${m.title} ${m.tags.join(" ")} ${m.courtType} ${m.category}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 60);
  }, [stateCode, county, query]);

  function onPickCategory(key: DocCategoryKey) {
    if (key === "legal") setMode("legal");
    else if (key === "letter") setMode("letter");
    else if (key === "contracts") setMode("contracts");
    else if (key === "policies") setMode("policies");
    else setMode("business");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      {/* Header area */}
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-slate-500">
              DOCUMENTS
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 md:text-3xl">
              Draft & Generate
            </h1>
          </div>

          {mode !== "home" && (
            <button
              onClick={() => {
                setMode("home");
                setSelectedMotion(null);
                setQuery("");
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="mt-3">
          <TypewriterPrompt
            text="What kind of document can I help you create today?"
            speedMs={18}
          />
        </div>
      </div>

      {/* MAIN */}
      {mode === "home" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DOC_CATEGORIES.map((c, idx) => (
            <button
              key={c.key}
              onClick={() => onPickCategory(c.key)}
              className={clsx(
                "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm",
                "transition hover:shadow-md active:scale-[0.99]",
                "focus:outline-none focus:ring-2 focus:ring-slate-300"
              )}
              style={{
                animation: `riseIn 520ms ease-out ${(idx * 70)}ms both`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-base font-semibold text-slate-900">{c.title}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {c.description}
                  </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition group-hover:bg-slate-50">
                  →
                </div>
              </div>

              {/* subtle “underwater glow” */}
              <div className="pointer-events-none absolute -bottom-16 left-0 right-0 h-40 opacity-0 blur-2xl transition group-hover:opacity-100">
                <div className="h-full w-full bg-gradient-to-t from-sky-200/60 via-cyan-100/50 to-transparent" />
              </div>
            </button>
          ))}

          <style jsx global>{`
            @keyframes riseIn {
              0% {
                opacity: 0;
                transform: translateY(22px);
                filter: blur(6px);
              }
              70% {
                opacity: 1;
                transform: translateY(-2px);
                filter: blur(0px);
              }
              100% {
                opacity: 1;
                transform: translateY(0px);
                filter: blur(0px);
              }
            }
          `}</style>
        </div>
      )}

      {mode !== "home" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: Picker / Search */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {mode === "legal" && "Legal Motions & Court Filings"}
                    {mode === "letter" && "Letters (Personal / Business)"}
                    {mode === "contracts" && "Contracts & Agreements"}
                    {mode === "policies" && "Policies & Packets"}
                    {mode === "business" && "Business Documents"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {mode === "legal"
                      ? "Pick your state & county, then search and select a motion to generate."
                      : "This section is wired for the same flow — pick a type, fill details, generate."}
                  </p>
                </div>
              </div>

              {mode === "legal" ? (
                <>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold tracking-wide text-slate-600">
                        State
                      </label>
                      <select
                        value={stateCode}
                        onChange={(e) => {
                          const next = e.target.value;
                          setStateCode(next);
                          const nextCounties = COUNTIES_BY_STATE[next] ?? [];
                          setCounty(nextCounties[0] ?? "");
                          setSelectedMotion(null);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        {STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold tracking-wide text-slate-600">
                        County
                      </label>
                      <select
                        value={county}
                        onChange={(e) => {
                          setCounty(e.target.value);
                          setSelectedMotion(null);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        {counties.map((c) => (
                          <option key={c} value={c}>
                            {c} County
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-semibold tracking-wide text-slate-600">
                      Search motions
                    </label>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder='Try: "continuance", "custody", "show cause", "protective order"...'
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold tracking-wide text-slate-600">
                        Results ({legalResults.length})
                      </div>
                      <div className="text-xs text-slate-500">
                        Showing county/state-specific + general motions
                      </div>
                    </div>

                    <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                      {legalResults.length === 0 ? (
                        <div className="p-4 text-sm text-slate-600">
                          No matches. Try a broader search term.
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-200">
                          {legalResults.map((m) => {
                            const active = selectedMotion?.id === m.id;
                            return (
                              <li key={m.id}>
                                <button
                                  onClick={() => setSelectedMotion(m)}
                                  className={clsx(
                                    "w-full px-4 py-3 text-left transition",
                                    active ? "bg-slate-50" : "bg-white hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-slate-900">
                                        {m.title}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-600">
                                        {m.courtType} • {m.category}
                                        {m.state !== "ALL" ? ` • ${m.state}` : ""}
                                        {m.county !== "ALL" ? ` • ${m.county} County` : ""}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {m.tags.slice(0, 4).map((t) => (
                                          <span
                                            key={t}
                                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                      Select
                                    </span>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-700">
                  This category is ready for the same structure:
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                    <li>Show sub-types (example: “Business letter”, “Demand letter”, “Reference letter”)</li>
                    <li>Searchable template list</li>
                    <li>Fill form fields</li>
                    <li>Generate (PDF/DOCX/HTML)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Selection / Next */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">
                {mode === "legal" ? "Selected Motion" : "Next"}
              </h3>

              {mode === "legal" ? (
                selectedMotion ? (
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedMotion.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {selectedMotion.courtType} • {selectedMotion.category}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold tracking-wide text-slate-600">
                        What happens next
                      </div>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                        <li>Collect filing details (case style, parties, docket, judge, hearing date).</li>
                        <li>Populate motion template fields automatically.</li>
                        <li>Generate DOCX/PDF and save to your Documents history.</li>
                      </ol>
                    </div>

                    <button
                      onClick={() => {
                        // This is where you route to a "fill details" page or open a modal wizard.
                        // Example:
                        // router.push(`/documents/legal/${selectedMotion.id}`);
                        alert(
                          `Next step: open a fill-details wizard for "${selectedMotion.title}".\n\nWire this to your generation pipeline when ready.`
                        );
                      }}
                      className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Continue → Fill Details
                    </button>

                    <button
                      onClick={() => setSelectedMotion(null)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-600">
                    Select a motion from the list to continue.
                  </div>
                )
              ) : (
                <div className="mt-3 text-sm text-slate-600">
                  Pick a sub-type next (we’ll mirror the Legal layout).
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold tracking-wide text-slate-600">
                Document History (placeholder)
              </div>
              <div className="mt-2 text-sm text-slate-600">
                This will list generated items (DOCX/PDF) saved under your account.
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-700">
                Later: fetch from <code className="rounded bg-slate-100 px-1">generated_documents</code>
                and show recent docs with download buttons.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}