// app/api/walmart/import/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { z } from "zod";

type AnyRow = Record<string, any>;

function normalizeHeader(h: string) {
  return String(h || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function pick(row: AnyRow, keys: string[]) {
  for (const k of keys) {
    if (k in row && row[k] !== "" && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return null;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[$,]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: any): string | null {
  if (!v) return null;

  // XLSX may give Date objects
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);

  // Excel serial numbers
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y && d.m && d.d) {
      const yyyy = String(d.y).padStart(4, "0");
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // string
  const s = String(v).trim();
  if (!s) return null;

  // if already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // try Date parse (handles timestamps like "2025-12-16T..." or "12/16/2025 10:22:33")
  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);

  return null;
}

function hashRow(obj: any) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

/**
 * Classify into buckets for building item events.
 * NOTE: We use Amount Type first (more reliable), and this classifier as fallback.
 */
function classifyRow(tType: string | null, desc: string | null, reason: string | null) {
  const tt = (tType || "").toLowerCase();
  const ds = (desc || "").toLowerCase();
  const rs = (reason || "").toLowerCase();
  const text = `${tt} ${ds} ${rs}`;

  const isReturn = text.includes("refund") || text.includes("returned") || text.includes("return");
  const isCommission = text.includes("commission");
  const isShipping = text.includes("shipping") || text.includes("label");
  const isWfs = text.includes("wfs") || text.includes("fulfillment");
  const isTax = text.includes("tax");

  // Settlement-level overhead (excluded from per-item profit, per your choice B)
  const isStorage = text.includes("storage");
  const isRemoval = text.includes("removal");
  const isLostFound = text.includes("lost") || text.includes("found") || text.includes("reimbursement");
  const isOverhead = isStorage || isRemoval || isLostFound;

  const isReturnShipping = isReturn && isShipping;
  const isWfsReturnShipping = isReturnShipping && isWfs;

  return {
    isReturn,
    isCommission,
    isShipping,
    isWfs,
    isTax,
    isOverhead,
    isReturnShipping,
    isWfsReturnShipping,
  };
}

/**
 * Fulfillment: use "Fulfillment Type" / "Fulfillment Details" FIRST.
 */
function inferFulfillment(row: AnyRow) {
  const hint = String(pick(row, ["fulfillment type", "fulfillment details"]) || "")
    .toLowerCase()
    .trim();

  if (hint.includes("wfs") || hint.includes("walmart")) return "WFS";
  if (hint.includes("seller")) return "SELLER";

  // fallback: look at descriptions if fulfillment fields are blank
  const tType = String(pick(row, ["transaction type"]) || "").toLowerCase();
  const desc = String(pick(row, ["transaction description"]) || "").toLowerCase();
  const text = `${hint} ${tType} ${desc}`;

  if (text.includes("wfs") || text.includes("walmart fulfilled") || text.includes("fulfillment")) return "WFS";
  if (text.includes("seller fulfilled") || text.includes("seller")) return "SELLER";
  if ((text.includes("label") || text.includes("shipping")) && !text.includes("wfs")) return "SELLER";

  return "UNKNOWN";
}

/**
 * Amount Type bucketing (your export includes this — use it)
 */
function bucketByAmountType(amountTypeRaw: string | null) {
  const at = (amountTypeRaw || "").toLowerCase();

  const isProductPrice = at.includes("product price");
  const isTax = at.includes("tax");
  const isCommission = at.includes("commission");
  const isShipping = at.includes("shipping") || at.includes("label");
  const isWfs = at.includes("wfs") || at.includes("fulfillment");

  return { isProductPrice, isTax, isCommission, isShipping, isWfs };
}

const ImportResponse = z.object({
  settlement_id: z.string().uuid(),
  inserted_rows: z.number(),
  inserted_item_events: z.number(),
  overhead_rows: z.number(),
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rowsRaw: AnyRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rowsRaw.length) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 400 });
    }

    // Normalize row keys (headers -> lowercase)
    const rows: AnyRow[] = rowsRaw.map((r) => {
      const out: AnyRow = {};
      for (const [k, v] of Object.entries(r)) out[normalizeHeader(k)] = v;
      return out;
    });

    // Validate we have your expected columns
    const hasTransactionType = rows.some((r) => "transaction type" in r);
    const hasPostedTs = rows.some((r) => "transaction posted timestamp" in r);

    if (!hasTransactionType || !hasPostedTs) {
      return NextResponse.json(
        {
          error:
            "Could not detect Walmart reconciliation headers. Expected 'Transaction Type' and 'Transaction Posted Timestamp' columns.",
        },
        { status: 400 }
      );
    }

    // Settlement meta
    const periodStart = toDate(pick(rows[0], ["period start date"])) || null;
    const periodEnd = toDate(pick(rows[0], ["period end date"])) || null;
    const payable = toNumber(pick(rows[0], ["total payable"])) ?? null;
    const currency = String(pick(rows[0], ["currency"]) || "") || null;

    const { data: settlement, error: setErr } = await supabase
      .from("walmart_settlements")
      .insert({
        owner_id: user.id,
        filename: file.name,
        period_start: periodStart,
        period_end: periodEnd,
        payable_amount: payable,
        currency,
        total_rows: 0,
      })
      .select("id")
      .single();

    if (setErr || !settlement) {
      return NextResponse.json({ error: setErr?.message || "Failed to create settlement" }, { status: 500 });
    }

    const settlement_id = settlement.id as string;

    // Build raw ledger inserts
    const ledgerInserts: any[] = [];
    let overhead_rows = 0;

    for (const r of rows) {
      const posted_date = toDate(pick(r, ["transaction posted timestamp"]));

      const transaction_key = String(pick(r, ["transaction key"]) || "") || null;
      const transaction_type = String(pick(r, ["transaction type"]) || "") || null;
      const transaction_desc = String(pick(r, ["transaction description"]) || "") || null;
      const reason_desc = String(pick(r, ["transaction reason description"]) || "") || null;

      const customer_order_id = String(pick(r, ["customer order #"]) || "") || null;
      const purchase_order_id = String(pick(r, ["purchase order #"]) || "") || null;

      const partner_item_id = String(pick(r, ["partner item id"]) || "") || null;
      const gtin = String(pick(r, ["partner gtin"]) || "") || null;
      const item_name = String(pick(r, ["partner item name"]) || "") || null;

      const qty = toNumber(pick(r, ["ship qty"])) ?? null;
      const amount = toNumber(pick(r, ["amount"])) ?? null;
      const amount_type = String(pick(r, ["amount type"]) || "") || null;

      const ship_city = String(pick(r, ["ship to city"]) || "") || null;
      const ship_state = String(pick(r, ["ship to state"]) || "") || null;

      const fulfillment_type = String(pick(r, ["fulfillment type"]) || "") || null;
      const fulfillment_details = String(pick(r, ["fulfillment details"]) || "") || null;

      const cls = classifyRow(transaction_type, transaction_desc, reason_desc);
      if (cls.isOverhead) overhead_rows++;

      const row_hash =
        (transaction_key && transaction_key.trim()) ||
        hashRow({
          posted_date,
          transaction_type,
          transaction_desc,
          reason_desc,
          customer_order_id,
          purchase_order_id,
          partner_item_id,
          gtin,
          item_name,
          qty,
          amount,
          amount_type,
          ship_city,
          ship_state,
          fulfillment_type,
          fulfillment_details,
        });

      ledgerInserts.push({
        settlement_id,
        owner_id: user.id,

        posted_date,
        transaction_type,
        transaction_desc,

        purchase_order_id,
        customer_order_id,
        order_id: null,
        partner_item_id,
        gtin,
        sku: null,
        item_name,

        qty,
        amount,

        fulfillment_hint: `${fulfillment_type || ""} ${fulfillment_details || ""}`.trim() || null,
        ship_city,
        ship_state,

        row_hash,
        raw_json: r,
      });
    }

    // Insert ledger rows in chunks
    const chunkSize = 500;
    let inserted_rows = 0;

    for (let i = 0; i < ledgerInserts.length; i += chunkSize) {
      const chunk = ledgerInserts.slice(i, i + chunkSize);
      const { error } = await supabase.from("walmart_ledger_rows").insert(chunk);
      if (error) {
        return NextResponse.json({ error: `Insert ledger failed: ${error.message}` }, { status: 500 });
      }
      inserted_rows += chunk.length;
    }

    await supabase.from("walmart_settlements").update({ total_rows: inserted_rows }).eq("id", settlement_id);

    // Read ledger rows back
    const { data: ledgerRows, error: readErr } = await supabase
      .from("walmart_ledger_rows")
      .select("*")
      .eq("settlement_id", settlement_id)
      .eq("owner_id", user.id);

    if (readErr || !ledgerRows) {
      return NextResponse.json({ error: readErr?.message || "Failed reading ledger" }, { status: 500 });
    }

    // Load products for COGS mapping
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, gtin, partner_item_id, default_cogs")
      .eq("owner_id", user.id);

    const productIndex = new Map<string, number>();
    for (const p of products || []) {
      if (p.partner_item_id) productIndex.set(`pid:${p.partner_item_id}`, Number(p.default_cogs ?? 0));
      if (p.gtin) productIndex.set(`gtin:${p.gtin}`, Number(p.default_cogs ?? 0));
      if (p.sku) productIndex.set(`sku:${p.sku}`, Number(p.default_cogs ?? 0));
    }

    type Agg = {
      key: string;
      po: string;
      fulfillment: string;

      partner_item_id: string | null;
      gtin: string | null;
      sku: string | null;
      item_name: string | null;

      qty: number;

      sale_date: string | null;
      return_date: string | null;

      price_sold: number;
      commission: number;
      shipping: number;
      wfs_fees: number;

      return_deduction: number;
      return_shipping: number;
      wfs_return_shipping: number;

      evidence: any;
      hasSale: boolean;
      hasReturn: boolean;
    };

    const byKey = new Map<string, Agg>();

    function itemKey(r: any) {
      const po = (r.purchase_order_id || r.customer_order_id || "").toString();
      const pid = r.partner_item_id ? `pid:${r.partner_item_id}` : "";
      const gt = r.gtin ? `gtin:${r.gtin}` : "";
      const nm = r.item_name ? `name:${String(r.item_name).slice(0, 120)}` : "name:unknown";
      const itemPart = pid || gt || nm;
      return `${po}||${itemPart}`;
    }

    for (const lr of ledgerRows) {
      const po = (lr.purchase_order_id || lr.customer_order_id || null) as string | null;
      if (!po) continue;

      const raw = (lr.raw_json || {}) as AnyRow;

      const tType = (lr.transaction_type as string | null) ?? null;
      const desc = (lr.transaction_desc as string | null) ?? null;
      const reason = String(pick(raw, ["transaction reason description"]) || "") || null;

      const amt = Number(lr.amount ?? 0);
      const qty = Number(lr.qty ?? 0);

      const amountType = String(pick(raw, ["amount type"]) || "") || null;

      const cls = classifyRow(tType, desc, reason);
      if (cls.isOverhead) continue;

      const k = itemKey(lr);

      if (!byKey.has(k)) {
        byKey.set(k, {
          key: k,
          po,
          fulfillment: inferFulfillment(raw),

          partner_item_id: lr.partner_item_id ?? null,
          gtin: lr.gtin ?? null,
          sku: lr.sku ?? null,
          item_name: lr.item_name ?? null,

          qty: 0,

          sale_date: null,
          return_date: null,

          price_sold: 0,
          commission: 0,
          shipping: 0,
          wfs_fees: 0,

          return_deduction: 0,
          return_shipping: 0,
          wfs_return_shipping: 0,

          evidence: { rows: [] as any[] },
          hasSale: false,
          hasReturn: false,
        });
      }

      const agg = byKey.get(k)!;

      agg.evidence.rows.push({
        posted_date: lr.posted_date,
        transaction_type: tType,
        transaction_desc: desc,
        transaction_reason: reason,
        amount_type: amountType,
        amount: amt,
        qty,
      });

      if (qty && qty > agg.qty) agg.qty = qty;

      const d = (lr.posted_date as string | null) ?? null;
      if (cls.isReturn) {
        agg.hasReturn = true;
        if (!agg.return_date) agg.return_date = d;
      } else {
        agg.hasSale = true;
        if (!agg.sale_date) agg.sale_date = d;
      }

      const at = bucketByAmountType(amountType);

      if (cls.isReturn) {
        if (at.isShipping || cls.isReturnShipping) {
          const isWfsReturn = inferFulfillment(raw) === "WFS" && (at.isWfs || cls.isWfsReturnShipping);
          if (isWfsReturn) agg.wfs_return_shipping += amt;
          else agg.return_shipping += amt;
        } else if (at.isCommission || cls.isCommission) {
          agg.commission += amt;
        } else if (at.isTax || cls.isTax) {
          // ignore tax
        } else {
          agg.return_deduction += amt;
        }
      } else {
        if (at.isProductPrice) {
          agg.price_sold += amt;
        } else if (at.isCommission || cls.isCommission) {
          agg.commission += amt;
        } else if (at.isShipping || cls.isShipping) {
          agg.shipping += amt;
        } else if (at.isWfs || cls.isWfs) {
          agg.wfs_fees += amt;
        } else if (at.isTax || cls.isTax) {
          // ignore tax
        } else {
          if (amt > 0) agg.price_sold += amt;
          else agg.commission += amt;
        }
      }
    }

    // Shipping split rule: only if multiple distinct items under same PO
    const poToKeys = new Map<string, string[]>();
    for (const agg of byKey.values()) {
      if (!poToKeys.has(agg.po)) poToKeys.set(agg.po, []);
      poToKeys.get(agg.po)!.push(agg.key);
    }

    for (const [po, keys] of poToKeys.entries()) {
      if (keys.length <= 1) continue;
      const totalShip = keys.reduce((s, k) => s + (byKey.get(k)!.shipping || 0), 0);
      const each = totalShip / keys.length;
      for (const k of keys) byKey.get(k)!.shipping = each;
    }

    // Build inserts for walmart_item_events
    const itemEventInserts: any[] = [];

    for (const agg of byKey.values()) {
      const po_last4 = agg.po ? agg.po.slice(-4) : null;
      const qtyFinal = agg.qty || 1;

      const unitCogs =
        (agg.partner_item_id && productIndex.get(`pid:${agg.partner_item_id}`)) ??
        (agg.gtin && productIndex.get(`gtin:${agg.gtin}`)) ??
        (agg.sku && productIndex.get(`sku:${agg.sku}`)) ??
        0;

      const totalCogs = Number(unitCogs ?? 0) * Number(qtyFinal ?? 0);

      const sale_profit =
        Number(agg.price_sold ?? 0) +
        Number(agg.commission ?? 0) +
        Number(agg.shipping ?? 0) +
        Number(agg.wfs_fees ?? 0) -
        Number(totalCogs ?? 0);

      if (agg.hasSale) {
        itemEventInserts.push({
          settlement_id,
          owner_id: user.id,
          event_kind: "SALE",
          sale_date: agg.sale_date,
          purchase_order_id: agg.po,
          po_last4,
          fulfillment_mode: agg.fulfillment,

          partner_item_id: agg.partner_item_id,
          gtin: agg.gtin,
          sku: agg.sku,
          item_name: agg.item_name,

          qty: qtyFinal,

          price_sold: agg.price_sold || 0,
          commission: agg.commission || 0,
          shipping: agg.shipping || 0,
          wfs_fees: agg.wfs_fees || 0,

          cogs: totalCogs,
          profit: sale_profit,

          evidence: agg.evidence,
        });
      }

      if (agg.hasReturn) {
        const net_return_impact =
          Number(agg.return_deduction ?? 0) +
          Number(agg.commission ?? 0) +
          Number(agg.return_shipping ?? 0) +
          Number(agg.wfs_return_shipping ?? 0);

        itemEventInserts.push({
          settlement_id,
          owner_id: user.id,
          event_kind: "RETURN",
          return_date: agg.return_date,
          purchase_order_id: agg.po,
          po_last4,
          fulfillment_mode: agg.fulfillment,

          partner_item_id: agg.partner_item_id,
          gtin: agg.gtin,
          sku: agg.sku,
          item_name: agg.item_name,

          qty: qtyFinal,

          return_deduction: agg.return_deduction || 0,
          return_shipping: agg.return_shipping || 0,
          wfs_return_shipping: agg.wfs_return_shipping || 0,

          profit: net_return_impact,

          evidence: agg.evidence,
        });
      }
    }

    // Insert item events
    let inserted_item_events = 0;

    for (let i = 0; i < itemEventInserts.length; i += chunkSize) {
      const chunk = itemEventInserts.slice(i, i + chunkSize);
      const { error } = await supabase.from("walmart_item_events").insert(chunk);
      if (error) {
        return NextResponse.json({ error: `Insert item events failed: ${error.message}` }, { status: 500 });
      }
      inserted_item_events += chunk.length;
    }

    const payload = ImportResponse.parse({
      settlement_id,
      inserted_rows,
      inserted_item_events,
      overhead_rows,
    });

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Import failed" }, { status: 500 });
  }
}