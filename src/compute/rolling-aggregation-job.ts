// Precompute job: reads stock_summary from D1, computes 5D/20D/60D
// rolling aggregates, writes them to stock_rolling_aggregate. Runs on a
// schedule (see wrangler.jsonc triggers.crons) rather than on API
// request - see docs/konsep-arsitektur-bandarmology-idx.md section 4.3.
//
// Deliberately has zero import of the Sectors.app adapter: foreign_net
// already lives in stock_summary (merged there by ingestion), so this
// job never touches a vendor SDK directly - see section 4.2.

import type { Env } from "../shared/types.ts";
import { computeRollingAggregates, type StockSummaryPoint } from "./rolling-window.ts";

const MAX_WINDOW_DAYS = 60;
const STALE_AFTER_DAYS = 1; // see docs/konsep-arsitektur-bandarmology-idx.md section 4.5

interface StockSummaryRow {
  date: string;
  close_price: number | null;
  volume: number | null;
  foreign_net: number | null;
}

/** Runs the rolling aggregation precompute for one stock, as of one date. */
export async function precomputeRollingAggregatesForStock(
  env: Env,
  stockCode: string,
  asOfDate: string,
  now: Date = new Date(),
): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT date, close_price, volume, foreign_net
     FROM stock_summary
     WHERE stock_code = ?1 AND date <= ?2
     ORDER BY date DESC
     LIMIT ?3`,
  )
    .bind(stockCode, asOfDate, MAX_WINDOW_DAYS)
    .all<StockSummaryRow>();

  // Query returns newest-first (for a cheap LIMIT); compute expects
  // ascending order with the as-of date last.
  const points: StockSummaryPoint[] = results
    .map((r) => ({
      date: r.date,
      close_price: r.close_price,
      volume: r.volume,
      foreign_net: r.foreign_net,
    }))
    .reverse();

  const staleness = computeStalenessFlag(points, now);
  const lastUpdated = now.toISOString();
  const aggregates = computeRollingAggregates(points);

  const statements = aggregates.map((agg) =>
    env.DB.prepare(
      `INSERT INTO stock_rolling_aggregate
         (stock_code, date, window, sample_size, avg_close, sum_volume, sum_foreign_net, last_updated, staleness_flag)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT (stock_code, date, window) DO UPDATE SET
         sample_size = excluded.sample_size,
         avg_close = excluded.avg_close,
         sum_volume = excluded.sum_volume,
         sum_foreign_net = excluded.sum_foreign_net,
         last_updated = excluded.last_updated,
         staleness_flag = excluded.staleness_flag`,
    ).bind(
      stockCode,
      asOfDate,
      agg.window,
      agg.sample_size,
      agg.avg_close,
      agg.sum_volume,
      agg.sum_foreign_net,
      lastUpdated,
      staleness,
    ),
  );

  await env.DB.batch(statements);
}

/** Runs the precompute for every stock that has a stock_summary row on `asOfDate`. */
export async function precomputeRollingAggregatesForDate(
  env: Env,
  asOfDate: string,
  now: Date = new Date(),
): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT stock_code FROM stock_summary WHERE date = ?1`,
  )
    .bind(asOfDate)
    .all<{ stock_code: string }>();

  for (const { stock_code } of results) {
    await precomputeRollingAggregatesForStock(env, stock_code, asOfDate, now);
  }
}

/**
 * Simplified staleness check: compares calendar days between the latest
 * source row and `now`. Does not model the IDX trading calendar (weekends/
 * holidays) - same simplification the rest of the codebase currently
 * defers (docs/api-contract.md: "Threshold pastinya ditentukan pas Fase 2
 * pas sync job dibangun"). Revisit once a real trading-calendar source
 * exists.
 */
function computeStalenessFlag(points: StockSummaryPoint[], now: Date): "fresh" | "stale" | "unknown" {
  if (points.length === 0) return "unknown";

  const latestDate = points[points.length - 1].date;
  const latest = parseYyyymmdd(latestDate);
  const daysSince = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));

  return daysSince <= STALE_AFTER_DAYS ? "fresh" : "stale";
}

function parseYyyymmdd(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day));
}
