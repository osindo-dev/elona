// Ingestion job: fetches OHLC+volume from GOAPI and (best-effort)
// net_foreign_inflow from Sectors.app, merges them, and upserts into the
// canonical stock_summary table in D1. Runs on a schedule (see
// wrangler.jsonc triggers.crons), Worker `elona` serving/compute layers
// only ever read from stock_summary afterward.

import type { Env } from "../shared/types.ts";
import { GoapiStockPriceAdapter, type StockPriceProvider } from "./adapters/goapi-stock-price.ts";
import { SectorsAppForeignFlowAdapter, type ForeignFlowProvider } from "./adapters/sectors-app-foreign-flow.ts";

const BACKFILL_DAYS = 110; // calendar days; live-tested 2026-07-19: 90 calendar days only yielded 58 trading days (short of the 60 Fase 3 needs), so padded further

export async function ingestStockSummaryForStock(
  env: Env,
  priceProvider: StockPriceProvider,
  foreignFlowProvider: ForeignFlowProvider | null,
  stockCode: string,
  fromDate: string,
  toDate: string,
  now: Date = new Date(),
): Promise<number> {
  const prices = await priceProvider.getHistoricalPrices(stockCode, fromDate, toDate);

  const statements = [];
  for (const p of prices) {
    let foreignNet: number | null = null;
    if (foreignFlowProvider) {
      try {
        foreignNet = await foreignFlowProvider.getNetForeignInflow(stockCode, p.date);
      } catch {
        // Sectors.app is not legal-cleared and unproven at scale - treat
        // any failure as "no data" rather than failing the whole
        // ingestion run over one vendor's flaky field.
        foreignNet = null;
      }
    }

    statements.push(
      env.DB.prepare(
        `INSERT INTO stock_summary (date, stock_code, open_price, high_price, low_price, close_price, volume, foreign_net, source_updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT (date, stock_code) DO UPDATE SET
           open_price = excluded.open_price,
           high_price = excluded.high_price,
           low_price = excluded.low_price,
           close_price = excluded.close_price,
           volume = excluded.volume,
           foreign_net = excluded.foreign_net,
           source_updated_at = excluded.source_updated_at`,
      ).bind(p.date, stockCode, p.open, p.high, p.low, p.close, p.volume, foreignNet, now.toISOString()),
    );
  }

  if (statements.length > 0) await env.DB.batch(statements);
  return statements.length;
}

export async function ingestStockSummaryForUniverse(
  env: Env,
  stockCodes: readonly string[],
  now: Date = new Date(),
): Promise<void> {
  const priceProvider = new GoapiStockPriceAdapter(env.GOAPI_API_KEY);
  // No live SECTORS_APP_API_KEY configured yet in this environment ->
  // skip Sectors.app entirely rather than firing calls guaranteed to
  // fail. foreign_net stays null until a key is provisioned.
  const foreignFlowProvider = env.SECTORS_APP_API_KEY
    ? new SectorsAppForeignFlowAdapter(env.SECTORS_APP_API_KEY)
    : null;

  const toDate = formatYyyymmdd(now);
  const fromDate = formatYyyymmdd(addDays(now, -BACKFILL_DAYS));

  for (const stockCode of stockCodes) {
    await ingestStockSummaryForStock(env, priceProvider, foreignFlowProvider, stockCode, fromDate, toDate, now);
  }
}

function formatYyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
