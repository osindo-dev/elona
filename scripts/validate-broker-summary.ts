/**
 * Fase 0 validation: does IDX's public GetBrokerSummary endpoint (or any
 * variant) expose broker activity broken down per-stock, or only
 * market-wide aggregates per broker?
 *
 * Run: npx tsx scripts/validate-broker-summary.ts
 * Output: console log + raw JSON dump to docs/fase-0-raw-log.json
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchIdx } from "../src/shared/idx-client.ts";

const STOCK_CODE = "BBCA";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 5000, 10000];

interface AttemptResult {
  label: string;
  url: string;
  status: number | null;
  ok: boolean;
  verified: boolean;
  body: unknown;
  error: string | null;
}

function lastTradingDayYYYYMMDD(from: Date): string {
  const d = new Date(from);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6); // skip Sun(0)/Sat(6)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(label: string, url: string): Promise<AttemptResult> {
  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchIdx(url);
      lastStatus = res.status;

      if (res.status === 403 || res.status === 429) {
        lastError = `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[attempt] ?? 10000;
          console.log(`  [${label}] ${res.status}, retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
          await sleep(delay);
          continue;
        }
        return { label, url, status: res.status, ok: false, verified: false, body: null, error: lastError };
      }

      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = { _unparsable_raw_text: text.slice(0, 2000) };
      }

      return { label, url, status: res.status, ok: res.ok, verified: true, body, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 10000;
        console.log(`  [${label}] fetch error "${lastError}", retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
        continue;
      }
    }
  }

  return { label, url, status: lastStatus, ok: false, verified: false, body: null, error: lastError };
}

async function main() {
  const date = lastTradingDayYYYYMMDD(new Date());
  console.log(`Using last trading day: ${date}\n`);

  const targets: Array<{ label: string; url: string }> = [
    {
      label: "base (no stock param)",
      url: `/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}`,
    },
    {
      label: "code=BBCA",
      url: `/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}&code=${STOCK_CODE}`,
    },
    {
      label: "stockcode=BBCA",
      url: `/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}&stockcode=${STOCK_CODE}`,
    },
    {
      label: "Code=BBCA (capitalized)",
      url: `/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}&Code=${STOCK_CODE}`,
    },
    {
      label: "GetBrokerSummaryChart",
      url: `/primary/TradingSummary/GetBrokerSummaryChart?length=10&start=0&date=${date}&stockcode=${STOCK_CODE}`,
    },
    {
      label: "StockData/GetBrokerSummary",
      url: `/primary/StockData/GetBrokerSummary?stockcode=${STOCK_CODE}&date=${date}`,
    },
  ];

  const results: AttemptResult[] = [];

  for (const target of targets) {
    console.log(`Fetching [${target.label}]: ${target.url}`);
    const result = await fetchWithRetry(target.label, target.url);
    results.push(result);

    if (result.verified) {
      console.log(`  status=${result.status} ok=${result.ok}`);
      console.log(`  body: ${JSON.stringify(result.body).slice(0, 1500)}\n`);
    } else {
      console.log(`  TIDAK TERVERIFIKASI - error: ${result.error}\n`);
    }

    // small politeness delay between distinct endpoint calls
    await sleep(1000);
  }

  writeFileSync(
    join(process.cwd(), "docs/fase-0-raw-log.json"),
    JSON.stringify({ date, results }, null, 2),
  );
  console.log("Raw log written to docs/fase-0-raw-log.json");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
