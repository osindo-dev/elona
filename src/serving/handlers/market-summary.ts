// GET /api/screening/market-summary — docs/api-contract.md section "Screening".
// Reads only stock_summary (Fase 2 output); no compute/ingestion logic touched.

import type { Env } from "../../shared/types.ts";
import { computeStalenessFlag } from "../staleness.ts";
import { jsonResponse } from "../http.ts";

interface StockSummaryRow {
  stock_code: string;
  stock_name: string | null;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number | null;
  previous_price: number | null;
  change: number | null;
  volume: number | null;
  value: number | null;
  source_updated_at: string | null;
}

const VALID_SORTS = new Set(["volume", "change_percent", "value"]);

export async function handleMarketSummary(env: Env, url: URL): Promise<Response> {
  const sort = url.searchParams.get("sort") ?? "volume";
  if (!VALID_SORTS.has(sort)) {
    return jsonResponse({ error: `invalid sort: ${sort}` }, 400);
  }
  const limit = clamp(parseIntOr(url.searchParams.get("limit"), 50), 1, 200);
  const offset = Math.max(0, parseIntOr(url.searchParams.get("offset"), 0));

  const date = url.searchParams.get("date") ?? (await latestDate(env));
  if (date === null) {
    return jsonResponse({
      date: null,
      last_updated: null,
      staleness_flag: "unknown",
      pagination: { limit, offset, total: 0 },
      data: [],
    });
  }

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM stock_summary WHERE date = ?1`)
    .bind(date)
    .first<{ n: number }>();
  const total = totalRow?.n ?? 0;

  // No rows for this date at all -> nothing to judge freshness against.
  // Distinct from the `date === null` branch above (whole table empty);
  // this covers "table has data, just not for the requested date".
  if (total === 0) {
    return jsonResponse({
      date,
      last_updated: null,
      staleness_flag: "unknown",
      pagination: { limit, offset, total: 0 },
      data: [],
    });
  }

  // `value` is always null in v1 (no source, see stock_summary.value comment) so
  // sort=value can't be expressed as a meaningful SQL ORDER BY; fall back to the
  // table's natural order, matching api-contract.md ("hasil urutannya null semua").
  const orderBy = sort === "volume" ? "volume DESC" : sort === "change_percent" ? "change DESC" : "id ASC";

  const { results } = await env.DB.prepare(
    `SELECT stock_code, stock_name, open_price, high_price, low_price, close_price,
            previous_price, change, volume, value, source_updated_at
     FROM stock_summary
     WHERE date = ?1
     ORDER BY ${orderBy}
     LIMIT ?2 OFFSET ?3`,
  )
    .bind(date, limit, offset)
    .all<StockSummaryRow>();

  const lastUpdated = await latestSourceUpdatedAt(env, date);

  return jsonResponse({
    date,
    last_updated: lastUpdated,
    staleness_flag: computeStalenessFlag(date),
    pagination: { limit, offset, total },
    data: results.map((r) => ({
      stock_code: r.stock_code,
      stock_name: r.stock_name,
      open: r.open_price,
      high: r.high_price,
      low: r.low_price,
      close: r.close_price,
      change: r.change,
      change_percent: changePercent(r.change, r.previous_price),
      volume: r.volume,
      value: r.value,
    })),
  });
}

function changePercent(change: number | null, previous: number | null): number | null {
  if (change === null || previous === null || previous === 0) return null;
  return Math.round((change / previous) * 10000) / 100;
}

async function latestDate(env: Env): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT MAX(date) AS d FROM stock_summary`).first<{ d: string | null }>();
  return row?.d ?? null;
}

async function latestSourceUpdatedAt(env: Env, date: string): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT MAX(source_updated_at) AS u FROM stock_summary WHERE date = ?1`,
  )
    .bind(date)
    .first<{ u: string | null }>();
  return row?.u ?? null;
}

function parseIntOr(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
