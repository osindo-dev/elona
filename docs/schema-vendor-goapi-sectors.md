# Schema Vendor — GOAPI.IO & Sectors.app (Langkah 0, Fase 3 compute-layer prompt)

Dokumen ini adalah Langkah 0 dari prompt "Fase 3: Compute Layer" —
mengunci skema vendor sebelum compute logic didesain. **Tidak ada sample
baru yang di-capture hari ini** — sesuai keputusan Kris (dikonfirmasi
2026-07-19), dokumen ini disusun dari sample nyata yang SUDAH ada di
`docs/fase-2-vendor-validation.md` dan `docs/fase-2-worker-network-test.md`,
bukan capture baru, karena tidak ada `GOAPI_API_KEY`/`SECTORS_APP_API_KEY`
tersedia di environment kerja saat ini (cek: tidak ada `.env`/`.dev.vars`,
`wrangler secret list` gagal — belum ada `CLOUDFLARE_API_TOKEN`/login,
dan belum ada deploy nyata untuk cek secret remote).

**Provenance dibedakan eksplisit per sumber di bawah** — sebagian
live-verified (request nyata, response nyata), sebagian cuma dari
spesifikasi/dokumentasi vendor (belum pernah benar-benar dipanggil).
Ini bukan detail kosmetik: Langkah 0 aslinya minta sample nyata supaya
skema TIDAK dibangun dari asumsi vendor — untuk satu sumber di bawah
(Sectors.app), itu belum sepenuhnya terpenuhi, ditandai jelas di section
2.

---

## 1. GOAPI.IO — Stock Price (OHLC + volume)

**Endpoint yang dipakai ingestion (`src/ingestion/adapters/goapi-stock-price.ts`):**
`GET https://api.goapi.io/stock/idx/{symbol}/historical?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Status verifikasi: LIVE-VERIFIED (field list), TIDAK ada raw JSON body lengkap tersimpan.**
`docs/fase-2-worker-network-test.md` baris 117-128: dicek langsung via
`curl` pakai API key trial nyata (`X-API-KEY`, scope Stock Market IDX),
2026-07-18. Field yang dikonfirmasi balik dari response nyata:

| Endpoint | Field yang dikonfirmasi live |
| :--- | :--- |
| `GET /stock/idx/prices?symbols=BBCA` | `symbol, date, open, high, low, close, volume, change, change_pct` |
| `GET /stock/idx/{symbol}/historical` | `symbol, date, open, high, low, close, volume` |

Doc sumber cuma mencatat tabel nama field yang balik, **bukan** body JSON
lengkap dengan nilai contoh — jadi struktur nesting/array exact tidak
terdokumentasi ulang di sini. Adapter kode (`goapi-stock-price.ts:29-42`)
mengasumsikan bentuk berikut, konsisten dengan tabel di atas:

```ts
interface GoapiHistoricalResult {
  symbol: string;
  date: string;   // "YYYY-MM-DD"
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
```

Bentuk wrapper `{status, data:{results:[...]}}` ini disalin dari pola
response `broker_summary` yang RAW JSON-nya memang tercatat lengkap
(lihat 1.2 di bawah) — **belum ada bukti langsung bahwa `/historical`
persis pakai wrapper yang sama**, ini asumsi kode yang belum
diverifikasi ulang terhadap raw body historical. Ditandai sebagai gap.

- **Tipe data**: `open/high/low/close` — angka, kemungkinan Rupiah utuh
  (bukan basis poin) berdasarkan pola nilai broker_summary di 1.2 (avg
  harga BBCA ~6300-6500, skala harga saham nominal, bukan basis poin).
  Tidak ada disclosure eksplisit soal unit di respons manapun yang
  tercatat.
- **`date`**: format `YYYY-MM-DD` (adapter men-strip jadi `YYYYMMDD`
  buat konsistensi sama kolom D1).
- **Null/missing behavior**: TIDAK terdokumentasi dari test live —
  belum pernah ditemukan kasus field null di sample yang tercatat.
  Adapter kode saat ini mengasumsikan semua field selalu number (tipe
  `number`, bukan `number | null`, di `GoapiHistoricalResult`) — asumsi
  ini belum diverifikasi lewat live edge-case (misal: hari libur bursa,
  saham baru listing, saham suspend).
- **Frekuensi update / delay**: `docs/goapi-due-diligence.md` mengutip
  disclosure GOAPI: "API data saham indonesia memiliki delay harga
  antara 3-10 menit. sumber: YFinance + GoogleFinance + MSN Money +
  MarketWatch." Disclosure ini ditulis untuk header kategori umum "Data
  Saham IDX" (mencakup SEMUA endpoint kategori itu) — **tidak ada
  disclosure terpisah khusus buat `/historical`**. Karena job ingestion
  jalan setelah bursa tutup (cron `0 10 * * 1-5` ≈ 17:00 WIB, lihat
  `wrangler.jsonc`), delay 3-10 menit ini secara praktis tidak relevan
  ke ingestion harian (data EOD sudah settle jauh sebelum cron jalan) —
  tapi tetap dicatat sebagai fakta belum sepenuhnya jelas.
- **`from`/`to` param historical**: `goapi-stock-price.ts:48-52` mencatat
  param ini live-tested 2026-07-19 tapi **tidak terdokumentasi di
  halaman docs GOAPI manapun yang ditemukan** — dipakai karena default
  endpoint (tanpa param) cuma balikin 21 hari terakhir, kurang dari 60
  hari yang dibutuhkan window 60D Fase 3.

### 1.2 GOAPI.IO — Broker Summary (referensi, TIDAK dipakai di ingestion saat ini)

Endpoint ini divalidasi live dengan raw JSON tercatat lengkap
(`docs/fase-2-vendor-validation.md:73-95`), tapi **scope-nya di luar Fase
3** — broker-per-saham tetap v2-placeholder (keputusan produk, constraint
4 di prompt Fase 3). Dicatat di sini murni sebagai referensi struktur
response GOAPI yang sudah confirmed-real, bukan sesuatu yang perlu
di-compute:

```json
{
  "status": "success",
  "message": "Menampilkan data broker summary",
  "data": {
    "results": [
      {
        "broker": { "code": "DX", "name": "BAHANA SEKURITAS" },
        "code": "DX",
        "date": "2026-07-17",
        "side": "BUY",
        "lot": 278997,
        "value": 177878210000,
        "transaction_type": "NET",
        "investor": "ALL",
        "avg": 6378.4119006583,
        "symbol": "BBCA"
      }
    ]
  }
}
```

Catatan null-behavior nyata yang ditemukan di sini (relevan sebagai pola
umum GOAPI, bukan spesifik ke endpoint ini): satu baris broker punya
`broker: null` dengan `code: "JB"` tetap ada — GOAPI broker master data
tidak lengkap untuk semua kode, field nested bisa null meski field
sibling-nya ada isi.

---

## 2. Sectors.app — Net Foreign Inflow

**Endpoint yang dipakai ingestion (`src/ingestion/adapters/sectors-app-foreign-flow.ts`):**
`GET https://api.sectors.app/v2/foreign-flow/{symbol}.JK/?date=YYYY-MM-DD`

**Status verifikasi: TIDAK LIVE-VERIFIED. Spec-only.**
Komentar di adapter kode sendiri (`sectors-app-foreign-flow.ts:9-11`):
"their site blocks automated fetch so this was never live-tested."
`docs/fase-2-vendor-validation.md:182-212` mengonfirmasi ulang: dicek
lewat OpenAPI spec publik di GitHub (`supertypeai/sectors_api_docs`),
bukan lewat request nyata ke `api.sectors.app`. Sample di bawah adalah
**contoh dari dokumentasi spec vendor**, bukan response yang pernah
benar-benar diterima dari server Sectors.app:

```json
{ "date": "2025-05-02", "net_foreign_inflow": 199859810000 }
```

- **Tipe data**: `net_foreign_inflow` — number, diasumsikan Rupiah
  (berdasarkan skala angka ~200 miliar, masuk akal untuk net foreign
  flow harian saham besar seperti BBCA) — **tidak ada disclosure unit
  eksplisit di spec** yang tercatat.
- **`date`**: format `YYYY-MM-DD` (beda dari GOAPI yang juga `YYYY-MM-DD`
  di response tapi `YYYYMMDD` dipakai di query param GOAPI — Sectors.app
  pakai `YYYY-MM-DD` juga di query param, lihat adapter baris 36).
- **Null/missing behavior**: adapter kode (`getNetForeignInflow:42`)
  menangani HTTP 404 sebagai "no data" → return `null`. Ini asumsi
  desain, bukan hasil observasi response 404 yang nyata (karena belum
  pernah live call sama sekali) — kemungkinan berdasarkan konvensi REST
  API umum, bukan konfirmasi dari Sectors.app.
- **Frekuensi update / delay**: **tidak diketahui**. Tidak ada informasi
  soal delay/update frequency yang ditemukan di riset Fase 2 (situs
  block automated fetch, spec OpenAPI juga tidak mencantumkan SLA/delay
  info berdasarkan yang sudah digali).
- **Auth**: header `Authorization: <key>` (bukan `Bearer <key>` —
  `sectors-app-foreign-flow.ts:39` kirim value key mentah tanpa prefix
  `Bearer`, ini juga belum diverifikasi live, disalin dari asumsi umum
  format Authorization header REST API).
- **Symbol suffix**: adapter menambahkan suffix `.JK` ke stock_code
  (`${stockCode}.JK`) — konsisten dengan sample spec Sectors.app yang
  pakai `"BBCA.JK"`, tapi ini juga belum dikonfirmasi lewat request
  nyata.

---

## 3. Ringkasan gap yang perlu direview Kris sebelum Langkah 1

1. **Sectors.app: zero live verification.** Field `foreign_net` yang
   dipakai di production `stock_summary` table dan sudah diserve di
   endpoint `top-accumulation-foreign` (Fase 4) berasal dari vendor yang
   API-nya belum pernah benar-benar dipanggil sekali pun — semua asumsi
   (unit Rupiah, null-on-404, format Authorization header, symbol
   suffix `.JK`) diturunkan dari dokumentasi spec, bukan observasi.
2. **GOAPI `/historical`: field list live-verified, tapi raw JSON body
   tidak tercatat.** Wrapper response (`{status, data:{results:[...]}}`)
   adalah asumsi yang disalin dari pola `broker_summary` (endpoint
   beda), belum dikonfirmasi langsung untuk `/historical`.
3. **Null/missing-value behavior kedua vendor untuk field harga
   (bukan broker_summary) belum pernah diobservasi nyata** — baik GOAPI
   maupun Sectors.app, karena sample yang ada baru mencakup kasus "data
   normal ada", belum kasus tepi (libur bursa, saham suspend, saham baru
   listing, hari tanpa data foreign flow).
4. **Delay/update frequency Sectors.app sepenuhnya tidak diketahui** —
   berbeda dari GOAPI yang setidaknya punya disclosure kategori umum
   (3-10 menit, meski juga tidak spesifik per-endpoint).

Sesuai instruksi prompt Fase 3: dokumen ini TIDAK dilanjutkan ke Langkah
1 sebelum direview Kris. Empat gap di atas murni dilaporkan sebagai
fakta — keputusan apakah gap ini cukup untuk lanjut compute logic, atau
perlu capture live baru dulu (butuh API key aktif), ada di tangan Kris.
