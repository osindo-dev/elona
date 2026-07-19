// Isolated adapter for Sectors.app - the ONLY file in this codebase
// allowed to know about Sectors.app's API shape. See
// docs/konsep-arsitektur-bandarmology-idx.md section 4.2: every vendor
// gets one adapter module; compute/serving layers depend on the
// ForeignFlowProvider interface below, never on Sectors.app directly.
// If Sectors.app is ever dropped (as happened with GOAPI for broker
// data), only this file needs to change.
//
// VENDOR DUE DILIGENCE STATUS (2026-07-19): Sectors.app has NOT passed
// legal/entity due diligence - only technical coverage was checked (via
// their public OpenAPI spec, docs/fase-2-vendor-validation.md; their site
// blocks automated fetch so this was never live-tested). It is used here
// scoped to exactly one field, net_foreign_inflow, on the assumption that
// a narrow field scope carries less legal risk than broker-level data -
// that assumption is Kris's working call and has NOT itself been
// verified. Do not extend this adapter to pull additional Sectors.app
// fields without re-running due diligence first.

export interface ForeignFlowProvider {
  /** Net foreign inflow in Rupiah for one stock on one trading day, or null if unavailable. */
  getNetForeignInflow(stockCode: string, date: string): Promise<number | null>;
}

interface SectorsAppDailyForeignFlowResponse {
  date: string;
  net_foreign_inflow: number;
}

export class SectorsAppForeignFlowAdapter implements ForeignFlowProvider {
  private readonly baseUrl = "https://api.sectors.app";

  constructor(private readonly apiKey: string) {}

  async getNetForeignInflow(stockCode: string, date: string): Promise<number | null> {
    const symbol = `${stockCode}.JK`;
    const url = `${this.baseUrl}/v2/foreign-flow/${symbol}/?date=${date}`;

    const res = await fetch(url, {
      headers: { Authorization: this.apiKey },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Sectors.app foreign-flow request failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as SectorsAppDailyForeignFlowResponse;
    return body.net_foreign_inflow;
  }
}
