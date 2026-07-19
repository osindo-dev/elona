// GET /api/dashboard/top-accumulation-foreign and
// GET /api/dashboard/top-accumulation?type=foreign|domestic —
// docs/api-contract.md section "Dashboard". `type=domestic` returns 400,
// per the 2026-07-19 revision documented there (no domestic source in v1).
//
// net_foreign_inflow comes from Sectors.app, a vendor that has NOT passed
// legal due diligence (src/ingestion/adapters/sectors-app-foreign-flow.ts).
// Per task constraint #5, the response carries a `data_source` block so the
// UI can render a third-party-vendor disclosure instead of hiding it.

import type { Env } from "../../shared/types.ts";
import { computeStalenessFlag } from "../staleness.ts";
import { jsonResponse } from "../http.ts";

interface ForeignFlowRow {
  stock_code: string;
  stock_name: string | null;
  foreign_net: number | null;
}

export async function handleTopAccumulationForeign(env: Env, url: URL): Promise<Response> {
  const limit = clamp(parseIntOr(url.searchParams.get("limit"), 20), 1, 100);
  const date = url.searchParams.get("date") ?? (await latestDate(env));

  if (date === null) {
    return jsonResponse({
      date: null,
      last_updated: null,
      staleness_flag: "unknown",
      data_source: SECTORS_APP_DISCLOSURE,
      data: [],
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT stock_code, stock_name, foreign_net
     FROM stock_summary
     WHERE date = ?1
     ORDER BY foreign_net DESC
     LIMIT ?2`,
  )
    .bind(date, limit)
    .all<ForeignFlowRow>();

  // No stock_summary rows at all for this date -> nothing to judge
  // freshness against, distinct from the `date === null` branch above.
  if (results.length === 0) {
    return jsonResponse({
      date,
      last_updated: null,
      staleness_flag: "unknown",
      data_source: SECTORS_APP_DISCLOSURE,
      data: [],
    });
  }

  const lastUpdated = await latestSourceUpdatedAt(env, date);

  return jsonResponse({
    date,
    last_updated: lastUpdated,
    staleness_flag: computeStalenessFlag(date),
    data_source: SECTORS_APP_DISCLOSURE,
    data: results.map((r, i) => ({
      stock_code: r.stock_code,
      stock_name: r.stock_name,
      net: r.foreign_net,
      rank: i + 1,
    })),
  });
}

/** GET /api/dashboard/top-accumulation?type=foreign|domestic — thin wrapper, see doc note above. */
export async function handleTopAccumulation(env: Env, url: URL): Promise<Response> {
  const type = url.searchParams.get("type");
  if (type === "domestic") {
    return jsonResponse(
      { error: "type=domestic is not supported in v1 - no domestic buy/sell split source available" },
      400,
    );
  }
  if (type !== "foreign") {
    return jsonResponse({ error: "type is required: foreign (domestic not supported in v1)" }, 400);
  }
  return handleTopAccumulationForeign(env, url);
}

const SECTORS_APP_DISCLOSURE = {
  vendor: "Sectors.app",
  field: "net_foreign_inflow",
  note: "Third-party vendor data. Legal due diligence not yet passed - see docs/goapi-due-diligence.md and docs/konsep-arsitektur-bandarmology-idx.md section 3.",
};

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
