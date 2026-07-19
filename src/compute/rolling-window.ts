// Pure rolling-window math over stock_summary rows. No D1/vendor
// dependency here on purpose - this module only ever sees plain data,
// so it stays untouched regardless of which vendor feeds stock_summary
// (see docs/konsep-arsitektur-bandarmology-idx.md section 4.2).

export const ROLLING_WINDOWS = [5, 20, 60] as const;
export type RollingWindowDays = (typeof ROLLING_WINDOWS)[number];

export function windowLabel(days: RollingWindowDays): string {
  return `${days}D`;
}

export interface StockSummaryPoint {
  date: string; // YYYYMMDD
  close_price: number | null;
  volume: number | null;
  foreign_net: number | null;
}

export interface RollingAggregateResult {
  window: string; // '5D' | '20D' | '60D'
  sample_size: number;
  avg_close: number | null;
  sum_volume: number | null;
  sum_foreign_net: number | null;
}

/**
 * Computes 5D/20D/60D rolling aggregates as of the last point in `points`.
 * `points` must be sorted ascending by date and already filtered to
 * date <= the as-of date; the last entry is treated as "today".
 */
export function computeRollingAggregates(points: StockSummaryPoint[]): RollingAggregateResult[] {
  return ROLLING_WINDOWS.map((days) => {
    const slice = points.slice(-days);
    const closes = slice.map((p) => p.close_price).filter((v): v is number => v !== null);
    const volumes = slice.map((p) => p.volume).filter((v): v is number => v !== null);
    const foreignNets = slice.map((p) => p.foreign_net).filter((v): v is number => v !== null);

    return {
      window: windowLabel(days),
      sample_size: slice.length,
      avg_close: closes.length > 0 ? mean(closes) : null,
      sum_volume: volumes.length > 0 ? sum(volumes) : null,
      sum_foreign_net: foreignNets.length > 0 ? sum(foreignNets) : null,
    };
  });
}

function mean(values: number[]): number {
  return sum(values) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
