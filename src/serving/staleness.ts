// Shared staleness-flag helper for v1 API responses (docs/api-contract.md
// "Konvensi wajib": last_updated + staleness_flag on every v1 response).
//
// ASSUMPTION (not finalized anywhere in docs — api-contract.md explicitly
// says the threshold is "ditentukan pas Fase 2 sync job dibangun", which is
// now the case): reuses the same STALE_AFTER_DAYS=1 calendar-day rule
// already implemented for stock_rolling_aggregate
// (src/compute/rolling-aggregation-job.ts) for consistency across the API
// surface. Same trading-calendar simplification noted there applies here.

const STALE_AFTER_DAYS = 1;

export type StalenessFlag = "fresh" | "stale" | "unknown";

/** `latestDate` is YYYYMMDD, the most recent date found in the source row(s). null means no rows at all. */
export function computeStalenessFlag(latestDate: string | null, now: Date = new Date()): StalenessFlag {
  if (latestDate === null) return "unknown";

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
