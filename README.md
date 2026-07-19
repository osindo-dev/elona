# elona

Platform bandarmology IDX (top accumulation, screening, analysis) — Arsitektur target: Cloudflare Workers + D1 + R2 + KV, deploy
dari GitHub, auth Google OAuth.

## Status: Fase 0 (validasi data source)

Project baru scaffold dasar, belum ada fitur dashboard/UI. Fokus fase ini
cuma validasi apakah data source publik IDX cukup buat fitur yang direncanakan.

**Temuan kunci:** broker summary per-saham (broker X net-buy saham Y sekian
lot) **tidak tersedia** dari endpoint publik IDX yang diverifikasi. Fitur
Bandarmology / Broker Stalker / Broker Summary karena itu turun status ke
**v2-placeholder**, sejajar Scripless/Nominee/Done Detail. Detail lengkap +
raw log di [`docs/fase-0-findings.md`](docs/fase-0-findings.md).

Data yang sudah terverifikasi tersedia (via reference `NeaByteLab/IDX-API`):
stock summary (OHLC + foreign buy/sell per saham), broker summary
market-wide (agregat, bukan per-saham), top gainer/loser, index summary,
domestic/foreign trading investor flow.

## Struktur project

```
elona/
├── src/
│   ├── ingestion/       # scraper/fetcher dari IDX (belum diisi)
│   ├── normalization/   # validasi & transform data mentah (belum diisi)
│   ├── compute/         # aggregation jobs (belum diisi)
│   ├── serving/         # API handlers (placeholder Worker entry)
│   └── shared/
│       ├── types.ts     # tipe data schema (starter, belum lengkap)
│       └── idx-client.ts # HTTP client ke endpoint IDX
├── migrations/          # D1 schema migrations (belum diisi)
├── scripts/
│   └── validate-broker-summary.ts  # script validasi fase-0
├── docs/
│   ├── fase-0-findings.md    # kesimpulan validasi data source
│   └── fase-0-raw-log.json   # raw response log dari validasi
├── wrangler.jsonc        # config Cloudflare Workers (binding placeholder)
└── package.json
```

## Setup

Prasyarat: Node.js 20+, akun Cloudflare (buat deploy nanti — belum perlu di
fase ini).

```bash
npm install
```

### Typecheck

```bash
npm run typecheck
```

### Jalanin Worker lokal

```bash
npm run dev
```

### Dry-run deploy (validasi config, gak benar-benar deploy)

```bash
npx wrangler deploy --dry-run
```

### Deploy beneran (belum relevan di fase 0 — resource D1/R2/KV di
`wrangler.jsonc` masih placeholder, belum diprovision)

```bash
npm run deploy
```

## Catatan penting

- **Belum ada frontend/dashboard.** Framework frontend (React/Next/dsb)
  sengaja belum diinstall — di luar scope fase 0.
- **Binding D1/R2/KV di `wrangler.jsonc` masih placeholder** (`id`/
  `database_id`/`bucket_name` dummy). Provisioning resource asli belum
  dilakukan.
- Sebelum lanjut ke fitur, baca `docs/fase-0-findings.md` — ini menentukan
  scope Bandarmology (v1 vs v2-placeholder).
