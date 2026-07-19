// GET /api/analysis/rolling-aggregate — reads stock_rolling_aggregate
// (Fase 3 precompute output, migrations/0002_rolling_aggregate.sql).
//
// NOT in docs/api-contract.md — no endpoint contract exists yet for the
// Fase 3 rolling-window table. Fase 4 task explicitly asks for this data
// to be served, so a path/shape was added here following the exact same
// last_updated/staleness_flag convention as every other v1 endpoint
// (docs/api-contract.md "Konvensi wajib"). Flagged as an assumption in the
// Fase 4 report, not a product/scope decision - purely wiring an existing
// precomputed table through the established response envelope.

import type { Env } from "../../shared/types.ts";
import { jsonResponse } from "../http.ts";

interface RollingAggregateRow {
  window: string;
  sample_size: number;
  avg_close: number | null;
  sum_volume: number | null;
  sum_foreign_net: number | null;
  last_updated: string;
  staleness_flag: string;
}

export async function handleRollingAggregate(env: Env, url: URL): Promise<Response> {
  const stockCode = url.searchParams.get("stock_code");
  if (!stockCode) {
    return jsonResponse({ error: "stock_code is required" }, 400);
  }

  const date = url.searchParams.get("date") ?? (await latestDate(env, stockCode));
  if (date === null) {
    return jsonResponse({
      stock_code: stockCode,
      date: null,
      last_updated: null,
      staleness_flag: "unknown",
      data: [],
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT window, sample_size, avg_close, sum_volume, sum_foreign_net, last_updated, staleness_flag
     FROM stock_rolling_aggregate
     WHERE stock_code = ?1 AND date = ?2
     ORDER BY CASE window WHEN '5D' THEN 1 WHEN '20D' THEN 2 WHEN '60D' THEN 3 ELSE 4 END`,
  )
    .bind(stockCode, date)
    .all<RollingAggregateRow>();

  if (results.length === 0) {
    return jsonResponse({
      stock_code: stockCode,
      date,
      last_updated: null,
      staleness_flag: "unknown",
      data: [],
    });
  }

  // All windows for a given (stock_code, date) are written in the same
  // precompute run (src/compute/rolling-aggregation-job.ts), so
  // last_updated/staleness_flag are identical across rows - taking the
  // first is representative, not a lossy aggregation.
  const [first] = results;

  return jsonResponse({
    stock_code: stockCode,
    date,
    last_updated: first.last_updated,
    staleness_flag: first.staleness_flag,
    data: results.map((r) => ({
      window: r.window,
      sample_size: r.sample_size,
      avg_close: r.avg_close,
      sum_volume: r.sum_volume,
      sum_foreign_net: r.sum_foreign_net,
    })),
  });
}

async function latestDate(env: Env, stockCode: string): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT MAX(date) AS d FROM stock_rolling_aggregate WHERE stock_code = ?1`,
  )
    .bind(stockCode)
    .first<{ d: string | null }>();
  return row?.d ?? null;
}
