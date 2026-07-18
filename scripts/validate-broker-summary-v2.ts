/**
 * Fase 0 re-verification (v2): two-step cookie-priming flow with full
 * browser-style headers, single attempt per step (no aggressive retry -
 * the point is to confirm whether the block is edge/WAF-level, not to
 * hammer the server).
 *
 * Run: npx tsx scripts/validate-broker-summary-v2.ts
 * Output: console log + docs/fase-0-findings-v2.md (written by this script)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const STOCK_CODE = "BBCA";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  Referer: "https://www.idx.co.id/",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

interface StepResult {
  label: string;
  url: string;
  status: number | null;
  ok: boolean;
  bodySnippet: string | null;
  isCloudflareChallenge: boolean;
  error: string | null;
}

function lastTradingDayYYYYMMDD(from: Date): string {
  const d = new Date(from);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function detectCloudflareChallenge(body: string): boolean {
  return body.includes("Attention Required") || body.includes("cf-error-details") || body.includes("cf_styles-css");
}

async function step1_primeCookie(): Promise<{ cookie: string | null; result: StepResult }> {
  const url = "https://www.idx.co.id/";
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const cookie = setCookie.length > 0 ? setCookie.map((c) => c.split(";")[0]).join("; ") : null;
    const body = await res.text();
    const isChallenge = detectCloudflareChallenge(body);

    return {
      cookie,
      result: {
        label: "step1: prime cookie (GET /)",
        url,
        status: res.status,
        ok: res.ok,
        bodySnippet: body.slice(0, 500),
        isCloudflareChallenge: isChallenge,
        error: null,
      },
    };
  } catch (err) {
    return {
      cookie: null,
      result: {
        label: "step1: prime cookie (GET /)",
        url,
        status: null,
        ok: false,
        bodySnippet: null,
        isCloudflareChallenge: false,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

async function step2_fetchEndpoint(label: string, url: string, cookie: string | null): Promise<StepResult> {
  try {
    const headers: Record<string, string> = { ...BROWSER_HEADERS };
    if (cookie) {
      headers.Cookie = cookie;
    }
    const res = await fetch(url, { headers });
    const body = await res.text();
    const isChallenge = detectCloudflareChallenge(body);

    return {
      label,
      url,
      status: res.status,
      ok: res.ok,
      bodySnippet: body.slice(0, 1500),
      isCloudflareChallenge: isChallenge,
      error: null,
    };
  } catch (err) {
    return {
      label,
      url,
      status: null,
      ok: false,
      bodySnippet: null,
      isCloudflareChallenge: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function renderFindingsMd(date: string, step1: StepResult, cookieObtained: boolean, step2Results: StepResult[]): string {
  const lines: string[] = [];
  lines.push("# Fase 0 Findings v2 — Re-verifikasi Cookie-Priming Flow");
  lines.push("");
  lines.push(
    `Percobaan kedua, dijalankan ${new Date().toISOString()}, tanggal bursa dipakai: ${date}. ` +
      "Script ini TIDAK mengubah kesimpulan di `docs/fase-0-findings.md` — dokumen itu tetap " +
      "berlaku sebagai catatan temuan sebelumnya. File ini murni laporan percobaan tambahan.",
  );
  lines.push("");
  lines.push("## Step 1 — Priming cookie via GET https://www.idx.co.id/");
  lines.push("");
  if (step1.error) {
    lines.push(`**Gagal total (network error):** ${step1.error}`);
  } else {
    lines.push(`Status: ${step1.status}`);
    lines.push(`Cloudflare challenge terdeteksi: ${step1.isCloudflareChallenge ? "YA" : "TIDAK"}`);
    lines.push(
      `Cookie diterima dari response: ${cookieObtained ? "YA" : "TIDAK"}` +
        (cookieObtained && step1.isCloudflareChallenge
          ? " (tapi ini cookie challenge Cloudflare seperti `__cf_bm`, bukan session IDX asli — dikirim balik ke Cloudflare, bukan bukti sudah lolos block)"
          : ""),
    );
    lines.push("");
    lines.push("Body snippet (500 char pertama):");
    lines.push("```html");
    lines.push(step1.bodySnippet ?? "(kosong)");
    lines.push("```");
  }
  lines.push("");

  if (step1.isCloudflareChallenge) {
    lines.push(
      "**Kesimpulan step 1: block terjadi di edge/WAF sebelum sampai origin** — sama persis dengan " +
        "temuan `fase-0-findings.md` sebelumnya. Cookie yang didapat (kalau ada) adalah cookie challenge " +
        "Cloudflare, bukan session IDX asli, karena request tidak pernah sampai ke aplikasi IDX. Step 2 " +
        "tetap dicoba dengan cookie itu untuk kelengkapan bukti, tapi diperkirakan tetap gagal.",
    );
  } else if (!cookieObtained) {
    lines.push(
      "**Kesimpulan step 1: tidak ada Cloudflare challenge, tapi juga tidak ada cookie di response.** " +
        "Lanjut ke step 2 tanpa cookie.",
    );
  } else {
    lines.push("**Kesimpulan step 1: cookie berhasil didapat**, lanjut ke step 2 dengan cookie itu.");
  }
  lines.push("");

  lines.push("## Step 2 — Fetch endpoint broker summary (dengan cookie kalau ada)");
  lines.push("");
  lines.push("| Endpoint | Status | Cloudflare challenge? |");
  lines.push("| :--- | :--- | :--- |");
  for (const r of step2Results) {
    lines.push(`| ${r.label} | ${r.status ?? `ERROR: ${r.error}`} | ${r.isCloudflareChallenge ? "YA" : "TIDAK"} |`);
  }
  lines.push("");

  for (const r of step2Results) {
    lines.push(`### ${r.label}`);
    lines.push("");
    lines.push(`URL: \`${r.url}\``);
    lines.push("");
    if (r.error) {
      lines.push(`TIDAK TERVERIFIKASI — network error: ${r.error}`);
    } else if (r.isCloudflareChallenge) {
      lines.push("TIDAK TERVERIFIKASI — response adalah halaman Cloudflare challenge, bukan data API.");
    } else {
      lines.push("Response snippet:");
      lines.push("```json");
      lines.push(r.bodySnippet ?? "(kosong)");
      lines.push("```");
    }
    lines.push("");
  }

  const allBlocked = step2Results.every((r) => r.isCloudflareChallenge || r.error);
  lines.push("## Kesimpulan percobaan v2");
  lines.push("");
  if (allBlocked) {
    lines.push(
      "Semua endpoint tetap TIDAK TERVERIFIKASI dari environment ini, termasuk dengan flow cookie-priming " +
        "dan header lengkap ala browser. Ini **memperkuat** (bukan membantah) temuan `fase-0-findings.md`: " +
        "masalahnya di level IP/WAF Cloudflare untuk environment ini, bukan indikasi endpoint tidak ada " +
        "atau parameter salah. Root cause kemungkinan IP data center kena filter — bukan sesuatu yang bisa " +
        "diperbaiki dari sisi script/header.",
    );
  } else {
    lines.push(
      "Sebagian atau semua endpoint berhasil diakses dari environment ini pada percobaan kedua ini. Lihat " +
        "detail response per endpoint di atas untuk menentukan apakah ada breakdown per-saham.",
    );
  }
  lines.push("");
  lines.push(
    "**Keputusan final Bandarmology (v1 vs v2-placeholder) tetap menunggu hasil manual check dari user " +
      "sesuai `docs/fase-0-manual-check.md`** — script ini cuma percobaan tambahan dari sisi server, bukan " +
      "pengganti verifikasi dari browser session asli user.",
  );
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const date = lastTradingDayYYYYMMDD(new Date());
  console.log(`Using last trading day: ${date}\n`);

  console.log("Step 1: priming cookie via GET https://www.idx.co.id/ ...");
  const { cookie, result: step1 } = await step1_primeCookie();
  console.log(`  status=${step1.status ?? "N/A"} cloudflareChallenge=${step1.isCloudflareChallenge} error=${step1.error ?? "none"}`);
  const cookieObtained = Boolean(cookie);
  console.log(`  cookie obtained: ${cookieObtained}\n`);

  const targets: Array<{ label: string; url: string }> = [
    {
      label: "base (no stock param)",
      url: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}`,
    },
    {
      label: "code=BBCA",
      url: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}&code=${STOCK_CODE}`,
    },
    {
      label: "stockcode=BBCA",
      url: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=${date}&stockcode=${STOCK_CODE}`,
    },
    {
      label: "StockData/GetBrokerSummary",
      url: `https://www.idx.co.id/primary/StockData/GetBrokerSummary?stockcode=${STOCK_CODE}&date=${date}`,
    },
  ];

  const step2Results: StepResult[] = [];
  for (const target of targets) {
    console.log(`Step 2: fetching [${target.label}]: ${target.url}`);
    const result = await step2_fetchEndpoint(target.label, target.url, cookie);
    step2Results.push(result);
    console.log(`  status=${result.status ?? "N/A"} cloudflareChallenge=${result.isCloudflareChallenge} error=${result.error ?? "none"}\n`);
  }

  const markdown = renderFindingsMd(date, step1, cookieObtained, step2Results);
  writeFileSync(join(process.cwd(), "docs/fase-0-findings-v2.md"), markdown);
  console.log("Written to docs/fase-0-findings-v2.md");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
