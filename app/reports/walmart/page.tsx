"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Settlement = {
  id: string;
  filename: string;
  period_start: string | null;
  period_end: string | null;
  payable_amount: number | null;
  currency: string | null;
  total_rows: number;
  created_at: string;
};

type ItemEvent = {
  id: string;
  event_kind: "SALE" | "RETURN" | "ADJUSTMENT";
  sale_date: string | null;
  return_date: string | null;
  po_last4: string | null;
  fulfillment_mode: "WFS" | "SELLER" | "UNKNOWN";
  item_name: string | null;
  qty: number;
  price_sold: number;
  commission: number;
  shipping: number;
  cogs: number;
  profit: number;

  return_deduction: number;
  return_shipping: number;
  wfs_return_shipping: number;
};

export default function WalmartReportsPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [events, setEvents] = useState<ItemEvent[]>([]);

  async function loadSettlements() {
    const { data, error } = await supabase
      .from("walmart_settlements")
      .select("id, filename, period_start, period_end, payable_amount, currency, total_rows, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setMsg(`Load settlements failed: ${error.message}`);
      return;
    }
    setSettlements((data || []) as any);
  }

  async function loadEvents(settlementId: string) {
    const { data, error } = await supabase
      .from("walmart_item_events")
      .select(
        "id,event_kind,sale_date,return_date,po_last4,fulfillment_mode,item_name,qty,price_sold,commission,shipping,cogs,profit,return_deduction,return_shipping,wfs_return_shipping"
      )
      .eq("settlement_id", settlementId)
      .order("sale_date", { ascending: true });

    if (error) {
      setMsg(`Load events failed: ${error.message}`);
      return;
    }
    setEvents((data || []) as any);
  }

  useEffect(() => {
    loadSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onImport() {
    if (!file) return;
    setBusy(true);
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/walmart/import", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Import failed");
        return;
      }

      setMsg(
        `Imported ✓ Settlement ${json.settlement_id} | Ledger rows: ${json.inserted_rows} | Item events: ${json.inserted_item_events} | Overhead rows: ${json.overhead_rows}`
      );
      await loadSettlements();
      setSelectedSettlement(json.settlement_id);
      await loadEvents(json.settlement_id);
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  const saleRows = events.filter((e) => e.event_kind === "SALE");
  const returnRows = events.filter((e) => e.event_kind === "RETURN");

  const totals = useMemo(() => {
    const sum = (arr: ItemEvent[], key: keyof ItemEvent) => arr.reduce((s, r) => s + Number(r[key] || 0), 0);
    return {
      sales: {
        revenue: sum(saleRows, "price_sold"),
        commission: sum(saleRows, "commission"),
        shipping: sum(saleRows, "shipping"),
        cogs: sum(saleRows, "cogs"),
        profit: sum(saleRows, "profit"),
      },
      returns: {
        deduction: sum(returnRows, "return_deduction"),
        rship: sum(returnRows, "return_shipping"),
        wrship: sum(returnRows, "wfs_return_shipping"),
        impact: sum(returnRows, "profit"),
      },
    };
  }, [saleRows, returnRows]);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Walmart Bi-Weekly Reports</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Upload the Walmart reconciliation XLSX. Buildlio imports raw ledger rows, then generates per-item Sales/Return lines.
        Storage/removal stays settlement-level overhead (not allocated).
      </p>

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          <button
            onClick={onImport}
            disabled={!file || busy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: busy ? "#eee" : "#111",
              color: busy ? "#111" : "#fff",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 650,
            }}
          >
            {busy ? "Importing…" : "Import XLSX"}
          </button>
          {msg ? <div style={{ marginLeft: 8, fontWeight: 600 }}>{msg}</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Settlements</h2>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {settlements.map((s) => {
              const active = selectedSettlement === s.id;
              return (
                <button
                  key={s.id}
                  onClick={async () => {
                    setSelectedSettlement(s.id);
                    await loadEvents(s.id);
                  }}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 10,
                    border: active ? "2px solid #111" : "1px solid #ddd",
                    background: active ? "#f6f6f6" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{s.filename}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                    {s.period_start || "?"} → {s.period_end || "?"} • Rows: {s.total_rows}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Payable: {s.payable_amount ?? "?"} {s.currency ?? ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Per-Item Events</h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
            <Stat label="Sales Revenue" value={totals.sales.revenue} />
            <Stat label="Sales Commission" value={totals.sales.commission} />
            <Stat label="Sales Shipping" value={totals.sales.shipping} />
            <Stat label="Sales COGS" value={totals.sales.cogs} />
            <Stat label="Sales Profit" value={totals.sales.profit} />
            <Stat label="Return Impact" value={totals.returns.impact} />
          </div>

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
              <thead>
                <tr>
                  {[
                    "Type",
                    "Sale/Return Date",
                    "PO (Last4)",
                    "WFS/Seller",
                    "Item",
                    "Qty",
                    "Price Sold",
                    "Commission",
                    "Shipping",
                    "COGS",
                    "Profit / Return Impact",
                    "Return Deduction",
                    "Return Ship",
                    "WFS Return Ship",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const date = e.event_kind === "RETURN" ? e.return_date : e.sale_date;
                  return (
                    <tr key={e.id}>
                      <td style={td}>{e.event_kind}</td>
                      <td style={td}>{date || ""}</td>
                      <td style={td}>{e.po_last4 || ""}</td>
                      <td style={td}>{e.fulfillment_mode}</td>
                      <td style={td}>{e.item_name || ""}</td>
                      <td style={tdNum}>{e.qty}</td>
                      <td style={tdNum}>{fmt(e.price_sold)}</td>
                      <td style={tdNum}>{fmt(e.commission)}</td>
                      <td style={tdNum}>{fmt(e.shipping)}</td>
                      <td style={tdNum}>{fmt(e.cogs)}</td>
                      <td style={tdNum}>{fmt(e.profit)}</td>
                      <td style={tdNum}>{fmt(e.return_deduction)}</td>
                      <td style={tdNum}>{fmt(e.return_shipping)}</td>
                      <td style={tdNum}>{fmt(e.wfs_return_shipping)}</td>
                    </tr>
                  );
                })}
                {!events.length ? (
                  <tr>
                    <td style={{ padding: 14, opacity: 0.7 }} colSpan={14}>
                      Select a settlement to view item events.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Note: Return rows show “Profit” as the net return payout impact for that item (signed). Dispute recoveries and
            “returned to Walmart” recoveries are tracked in the disputes table and can be applied as additional credits.
          </p>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 10, minWidth: 160 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{fmt(value)}</div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #ddd",
  fontSize: 12,
  opacity: 0.8,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const tdNum: React.CSSProperties = {
  ...td,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};