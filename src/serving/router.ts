// Fase 4 serving layer router. Plain path-based dispatch on the native
// Request/Response objects already used by src/serving/index.ts - no
// framework dependency added for ~10 routes.

import type { Env } from "../shared/types.ts";
import { jsonResponse } from "./http.ts";
import { handleMarketSummary } from "./handlers/market-summary.ts";
import { handleTopAccumulation, handleTopAccumulationForeign } from "./handlers/top-accumulation-foreign.ts";
import { handleRollingAggregate } from "./handlers/rolling-aggregate.ts";
import { handleComingSoon } from "./handlers/placeholder.ts";

// v2-placeholder paths, per docs/konsep-arsitektur-bandarmology-idx.md
// section 2 and docs/api-contract.md. Inventory Chart is included even
// though the Fase 4 task prompt's v2 list doesn't name it explicitly,
// because it's already decided v2-placeholder elsewhere in the docs and
// the task asks to prep contracts for "semua fitur v2" - flagged as an
// assumption in the Fase 4 report.
//
// Balance Position Chart added 2026-07-19 per docs/addendum-arsitektur-2026-07-19.md
// section C: downgraded from v1 to v2-placeholder (needs bid/offer order
// book, not available from GOAPI/Sectors.app). Was previously unrouted
// entirely (fell through to generic 404) - flagged during Fase 3 audit.
const V2_PLACEHOLDER_PATHS = new Set([
  "/api/screening/scripless",
  "/api/screening/nominee-indication",
  "/api/screening/broker-stalker",
  "/api/dashboard/bandarmology",
  "/api/dashboard/buyback-potential",
  "/api/analysis/broker-summary",
  "/api/analysis/done-detail",
  "/api/analysis/inventory-chart",
  "/api/analysis/balance-position",
]);

export async function routeApiRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  if (request.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  if (V2_PLACEHOLDER_PATHS.has(url.pathname)) {
    return handleComingSoon();
  }

  switch (url.pathname) {
    case "/api/screening/market-summary":
      return handleMarketSummary(env, url);
    case "/api/dashboard/top-accumulation-foreign":
      return handleTopAccumulationForeign(env, url);
    case "/api/dashboard/top-accumulation":
      return handleTopAccumulation(env, url);
    case "/api/analysis/rolling-aggregate":
      return handleRollingAggregate(env, url);
    default:
      return jsonResponse({ error: "not found" }, 404);
  }
}
