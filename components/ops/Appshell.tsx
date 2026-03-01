// FILE: components/ops/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navOps: NavItem[] = [
  { label: "Daily Ops", href: "/", icon: <Icon d="M4 12h6M4 6h16M4 18h16M14 12h6" /> },
  { label: "Inventory", href: "/inventory", icon: <Icon d="M4 7h16M6 7v14h12V7M9 11h6" /> },
  { label: "Dogs & Breeding", href: "/dogs-breeding", icon: <Icon d="M8 12c1.5-2 3-3 4-3s2.5 1 4 3M7 14c1 2 2.5 3 5 3s4-1 5-3" /> },
  { label: "Retail & Biz", href: "/retail-biz", icon: <Icon d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9z" /> },
];

const navAdmin: NavItem[] = [
  { label: "Finance & Sales", href: "/finance-sales", icon: <Icon d="M12 6v12M7 10h10M5 6h14v14H5z" /> },
  { label: "Tools & Hosting", href: "/tools-hosting", icon: <Icon d="M10 14l-2 2m0 0l2 2m-2-2h10m4-10h-6m0 0l2-2m-2 2l2 2" /> },
  { label: "Secretary", href: "/secretary", icon: <Icon d="M8 7h12M8 12h12M8 17h8M4 7h.01M4 12h.01M4 17h.01" /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0b5fff] text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold tracking-widest text-slate-500">CHEROLEE OPS</div>
              <div className="text-sm font-semibold text-slate-900">MISSION CONTROL</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600 md:block">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-700">
              rawillia9809
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0 px-0">
        {/* Sidebar */}
        <aside className="col-span-12 border-r border-black/5 bg-white md:col-span-3 lg:col-span-2">
          <div className="px-4 py-5">
            <div className="mb-3 text-[10px] font-semibold tracking-widest text-slate-400">OPERATIONS</div>
            <nav className="space-y-1">
              {navOps.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-[#0b5fff]/10 text-[#0b5fff]"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className={active ? "text-[#0b5fff]" : "text-slate-400"}>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="my-5 border-t border-black/5" />

            <div className="mb-3 text-[10px] font-semibold tracking-widest text-slate-400">ADMINISTRATION</div>
            <nav className="space-y-1">
              {navAdmin.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-[#0b5fff]/10 text-[#0b5fff]"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className={active ? "text-[#0b5fff]" : "text-slate-400"}>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 rounded-2xl border border-black/5 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Status</div>
              <div className="mt-1 text-xs text-slate-500">
                Visual-first mode (mock data). Wiring comes next.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-600">Ready</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 bg-[#f6f8fb] md:col-span-9 lg:col-span-10">
          <div className="p-5 md:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}