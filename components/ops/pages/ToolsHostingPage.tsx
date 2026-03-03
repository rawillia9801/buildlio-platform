// FILE: components/ops/pages/ToolsHostingPage.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, Button, Input, Pill } from "@/components/ops/ui";

type Domain = {
  domain: string;
  registrar: string;
  renew: string;
  status: "OK" | "DUE" | "ISSUE";
  nameservers: string;
  notes: string;
};

type Site = {
  name: string;
  domain: string;
  status: "LIVE" | "DRAFT" | "MIGRATING";
  hosting: string;
};

type Server = {
  name: string;
  ip: string;
  panel: string;
  status: "UP" | "WARN";
};

const mockDomains: Domain[] = [
  { domain: "swvachihuahua.com", registrar: "—", renew: "—", status: "OK", nameservers: "—", notes: "Main site" },
  { domain: "portal.swvachihuahua.com", registrar: "—", renew: "—", status: "OK", nameservers: "—", notes: "Customer portal" },
  { domain: "chihuahuahq.com", registrar: "—", renew: "—", status: "DUE", nameservers: "—", notes: "Business site" },
];

const mockSites: Site[] = [
  { name: "SWVA Chihuahua", domain: "swvachihuahua.com", status: "LIVE", hosting: "Verpex s13415" },
  { name: "Puppy Portal", domain: "portal.swvachihuahua.com", status: "LIVE", hosting: "Vercel" },
  { name: "HostMyWeb Admin", domain: "hostmyweb.co", status: "DRAFT", hosting: "Verpex s13415" },
];

const mockServers: Server[] = [
  { name: "s13415", ip: "185.181.252.49", panel: "cPanel/WHM", status: "UP" },
  { name: "Vercel", ip: "—", panel: "Deploy", status: "UP" },
];

function statusPill(v: string) {
  if (v === "DUE" || v === "WARN" || v === "ISSUE") return <Pill tone="important">{v}</Pill>;
  if (v === "MIGRATING") return <Pill tone="routine">{v}</Pill>;
  return <Pill tone="ok">{v}</Pill>;
}

export function ToolsHostingPage() {
  const [tab, setTab] = useState<"Domains" | "Sites" | "Servers">("Domains");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { domains: mockDomains, sites: mockSites, servers: mockServers };
    return {
      domains: mockDomains.filter(d => d.domain.toLowerCase().includes(term) || d.notes.toLowerCase().includes(term)),
      sites: mockSites.filter(s => s.name.toLowerCase().includes(term) || s.domain.toLowerCase().includes(term)),
      servers: mockServers.filter(s => s.name.toLowerCase().includes(term) || s.ip.toLowerCase().includes(term)),
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-slate-400">TOOLS & HOSTING</div>
          <div className="mt-1 text-sm text-slate-600">Domains, DNS, websites, servers — visual first. Wiring next.</div>
        </div>

        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search domains, sites, servers..." />
          <Button variant="primary">ADD</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["Domains", "Sites", "Servers"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold tracking-widest transition",
                active ? "bg-[#0b5fff] text-white" : "border border-black/10 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={tab.toUpperCase()}
          subtitle={tab === "Domains" ? "Renewals, nameservers, and health." : tab === "Sites" ? "What’s deployed and where." : "Hosting targets & status."}
          right={<Button variant="ghost">SYNC (LATER)</Button>}
        />

        <div className="overflow-x-auto">
          {tab === "Domains" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">DOMAIN</th>
                  <th className="px-5 py-3">STATUS</th>
                  <th className="px-5 py-3">RENEW</th>
                  <th className="px-5 py-3">REGISTRAR</th>
                  <th className="px-5 py-3">NOTES</th>
                  <th className="px-5 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.domains.map((d) => (
                  <tr key={d.domain} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{d.domain}</td>
                    <td className="px-5 py-4">{statusPill(d.status)}</td>
                    <td className="px-5 py-4 text-slate-600">{d.renew}</td>
                    <td className="px-5 py-4 text-slate-600">{d.registrar}</td>
                    <td className="px-5 py-4 text-slate-600">{d.notes}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Sites" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">SITE</th>
                  <th className="px-5 py-3">DOMAIN</th>
                  <th className="px-5 py-3">STATUS</th>
                  <th className="px-5 py-3">HOSTING</th>
                  <th className="px-5 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.sites.map((s) => (
                  <tr key={s.domain} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{s.name}</td>
                    <td className="px-5 py-4 text-slate-600">{s.domain}</td>
                    <td className="px-5 py-4">{statusPill(s.status)}</td>
                    <td className="px-5 py-4 text-slate-600">{s.hosting}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        OPEN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Servers" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">SERVER</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">PANEL</th>
                  <th className="px-5 py-3">STATUS</th>
                  <th className="px-5 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.servers.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{s.name}</td>
                    <td className="px-5 py-4 text-slate-600">{s.ip}</td>
                    <td className="px-5 py-4 text-slate-600">{s.panel}</td>
                    <td className="px-5 py-4">{statusPill(s.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        DETAILS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}