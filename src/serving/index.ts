import type { Env } from "../shared/types.ts";
import { precomputeRollingAggregatesForDate } from "../compute/rolling-aggregation-job.ts";
import { ingestStockSummaryForUniverse } from "../ingestion/stock-summary-ingestion-job.ts";
import { STOCK_UNIVERSE_SUBSET } from "../ingestion/stock-universe.ts";

const INGESTION_CRON = "0 10 * * 1-5";
const COMPUTE_CRON = "0 11 * * 1-5";

export default {
  async fetch(): Promise<Response> {
    return new Response("elona: ok", { status: 200 });
  },

  // Dispatches on which cron fired (wrangler.jsonc triggers.crons).
  // Ingestion writes stock_summary; compute (Fase 3, section 4.3) reads
  // it and precomputes rolling aggregates. Neither runs on API request -
  // serving/API handlers only ever read already-computed tables.
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    if (controller.cron === INGESTION_CRON) {
      await ingestStockSummaryForUniverse(env, STOCK_UNIVERSE_SUBSET);
      return;
    }
    if (controller.cron === COMPUTE_CRON) {
      const asOfDate = todayAsYyyymmdd();
      await precomputeRollingAggregatesForDate(env, asOfDate);
    }
  },
} satisfies ExportedHandler<Env>;

function todayAsYyyymmdd(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
