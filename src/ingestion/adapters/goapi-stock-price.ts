// Isolated adapter for GOAPI.IO stock price data (OHLC+volume). Only file
// in this codebase allowed to know GOAPI's request/response shape - see
// docs/konsep-arsitektur-bandarmology-idx.md section 4.2.
//
// VENDOR DUE DILIGENCE STATUS (2026-07-19): GOAPI.IO has technical
// due diligence passed (docs/fase-2-vendor-validation.md,
// docs/fase-2-worker-network-test.md) but legal due diligence is NOT
// strict/complete - see docs/goapi-due-diligence.md for red flags found
// (empty contact page, 404 privacy policy, ToS referencing a different
// domain, no indemnification clause, no registered business entity
// found). Kris has decided to use it anyway; this comment exists so
// anyone reading this adapter later sees that status.

const GOAPI_BASE_URL = "https://api.goapi.io";

export interface StockPricePoint {
  date: string; // YYYYMMDD
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface StockPriceProvider {
  getHistoricalPrices(stockCode: string, fromDate: string, toDate: string): Promise<StockPricePoint[]>;
}

interface GoapiHistoricalResult {
  symbol: string;
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface GoapiHistoricalResponse {
  status: string;
  data: { results: GoapiHistoricalResult[] };
}

export class GoapiStockPriceAdapter implements StockPriceProvider {
  constructor(private readonly apiKey: string) {}

  /**
   * `fromDate`/`toDate` in YYYYMMDD. GOAPI's `/historical` endpoint
   * defaults to the last 21 trading days with no params; passing
   * `from`/`to` (YYYY-MM-DD, live-tested 2026-07-19 - not documented in
   * any GOAPI docs page found so far) extends the range. Needed here
   * because the Fase 3 60D rolling window requires at least 60 trading
   * days of history.
   */
  async getHistoricalPrices(stockCode: string, fromDate: string, toDate: string): Promise<StockPricePoint[]> {
    const url = `${GOAPI_BASE_URL}/stock/idx/${stockCode}/historical?from=${toDash(fromDate)}&to=${toDash(toDate)}`;
    const res = await fetch(url, { headers: { "X-API-KEY": this.apiKey } });

    if (!res.ok) {
      throw new Error(`GOAPI historical request failed for ${stockCode}: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as GoapiHistoricalResponse;
    return body.data.results.map((r) => ({
      date: r.date.replace(/-/g, ""),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
  }
}

function toDash(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
