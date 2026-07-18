# Fase 2 — Vendor Validation: Broker Summary Per-Saham TERSEDIA (via GOAPI.IO)

**Ini temuan baru yang MEMBALIKKAN kesimpulan Fase 0.** Dokumen
`docs/fase-0-findings.md` dan `docs/fase-0-findings-v2.md` TIDAK diubah —
tetap valid sebagai catatan bahwa endpoint publik IDX langsung tidak bisa
diakses dari environment manapun yang dites (Cloudflare Worker, Browser
Rendering, sandbox). Temuan di dokumen ini spesifik soal vendor pihak
ketiga yang TERNYATA punya data broker-per-saham granular.

## Konteks: kenapa riset vendor dimulai

Fase 2 (ingestion pipeline) mentok di dua percobaan:
1. Cloudflare Worker fetch langsung ke `idx.co.id` → 403 (JS challenge Cloudflare).
2. Cloudflare Worker + Browser Rendering (headless Chrome asli) → block
   eksplisit ("Sorry, you have been blocked").

Kris pilih arah "cari vendor data resmi/berlisensi" alih-alih coba
lewatin WAF lebih jauh.

## Riset vendor

Tiga kandidat ditemukan lewat web search: **Sectors.app**, **GOAPI.IO**,
**Invezgo**. Ketiganya klaim py fitur broker-per-saham/bandarmology.

**Sectors.app** — paling well-documented (OpenAPI spec publik di GitHub
`supertypeai/sectors_api_docs`). Endpoint `GET /v2/broker-summary/{symbol}/`
schema-nya sudah dikonfirmasi lewat spec (bukan live test — situsnya
block automated fetch/WebFetch). Butuh plan "Insider", harga belum
kekonfirmasi (situs pricing block juga).

**GOAPI.IO — DIVALIDASI LIVE, DATA ASLI.** Detail di bawah.

**Invezgo** — klaim "full bandarmology suite" tapi gak ada detail teknis
yang bisa digali (situs block WebFetch, gak ada docs publik yang ketemu).

## Validasi live GOAPI.IO

Dilakukan via browser Kris yang udah login (`app.goapi.io`), bukan dari
sandbox — supaya gak kena isu network yang sama kayak Fase 0/spike Worker.

**Setup:**
- Subscribe paket **Free Trial** untuk service "Stock Market IDX": Rp 0,
  All Endpoints, 30 request/hari, 500 request/bulan, durasi **2 minggu**
  (expired sekitar 2026-08-01 — cek tanggal pasti di dashboard GOAPI).
- API key dibuat: label `elona-fase2-spike`, scope `Stock Market Idx`.
  **Key value TIDAK dicatat di sini** (secret) — ada di dashboard
  `app.goapi.io/key-manager` Kris. Kalau lanjut ke implementasi beneran,
  simpan sebagai Cloudflare Workers secret (`wrangler secret put`), JANGAN
  hardcode di kode atau commit ke git.

**Base URL:** `https://api.goapi.io`
**Auth:** header `X-API-KEY: <key>` (alternatif: query param `api_key`)

**Endpoint yang divalidasi:**
```
GET /stock/idx/{symbol}/broker_summary?date=YYYY-MM-DD&investor={FOREIGN|LOCAL|ALL}
```

**Request yang dites:**
```
GET https://api.goapi.io/stock/idx/BBCA/broker_summary?date=2026-07-17
```

**Hasil: HTTP 200, data asli.** 65 baris broker untuk BBCA tanggal
2026-07-17 (hari bursa terakhir), sorted BUY (net beli) descending lalu
SELL (net jual) descending. Nama-nama broker semua real & terverifikasi
(Bahana Sekuritas, J.P. Morgan Sekuritas Indonesia, CLSA Sekuritas
Indonesia, Maybank Sekuritas, Mandiri Sekuritas, Stockbit Sekuritas
Digital, Ajaib Sekuritas Asia, dll — cocok dengan daftar broker IDX yang
dikenal). Angka lot/value/avg price masuk akal secara skala (ratusan ribu
lot, puluhan-ratusan miliar rupiah, avg price ~6300-6500 per saham BBCA).

**Contoh response (dipotong):**
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

**Field:**
- `broker.code`, `broker.name` — identitas broker (satu baris punya
  `broker: null` dengan `code: "JB"` — edge case, broker master data GOAPI
  gak lengkap untuk semua kode, perlu di-handle saat parsing, jangan
  asumsikan `broker` selalu ada)
- `side`: `"BUY"` | `"SELL"` (posisi net broker itu untuk hari itu)
- `lot`, `value`, `avg` — volume, nilai rupiah, harga rata-rata
- `transaction_type`: `"NET"` (di contoh ini semua NET — parameter lain
  mungkin ada nilai lain, belum dites)
- `investor`: filter yang dikirim balik (`ALL` di request ini; parameter
  `investor=FOREIGN`/`LOCAL` tersedia di endpoint tapi belum dites live)

**Endpoint terkait yang juga tersedia** (dari docs, belum semua dites live):
- `GET /stock/idx/brokers` — registry broker
- `GET /stock/idx/broker_activities` — data per kode broker (kebalikan
  dari broker_summary yang per-saham)

**Catatan penting soal sumber data:** dokumentasi GOAPI menyebut data
saham umum (harga, dll) bersumber dari "YFinance + GoogleFinance + MSN
Money + MarketWatch", BUKAN dari IDX langsung, dengan delay 3-10 menit.
Sumber spesifik untuk `broker_summary` tidak disebutkan terpisah — data
yang divalidasi di atas terlihat konsisten & masuk akal, tapi sumber
aslinya (apakah dari IDX Data Feed berlisensi, scraping mereka sendiri,
atau agregasi dari tempat lain) tidak diketahui pasti. Tidak mengubah
kesimpulan bahwa datanya valid dan bisa dipakai — tapi relevan untuk
due-diligence kalau mau commit jangka panjang ke vendor ini.

## Dampak ke keputusan Fase 1 (BELUM DIEKSEKUSI — nunggu keputusan Kris)

Keputusan Fase 1 di `docs/schema-diagram.md` dan `docs/api-contract.md`
yang menurunkan fitur berikut ke v2-placeholder — SEKARANG PERLU
DITINJAU ULANG karena premisnya ("data gak tersedia dari sumber manapun
yang bisa diakses") sudah gak valid:

| Fitur | Status Fase 1 | Status setelah temuan ini |
| :--- | :--- | :--- |
| Bandarmology | v2-placeholder | Berpotensi balik ke v1 (via GOAPI) |
| Broker Stalker | v2-placeholder | Berpotensi balik ke v1 (via GOAPI) |
| Broker Summary (per-saham) | v2-placeholder | Berpotensi balik ke v1 (via GOAPI) |
| Inventory Chart | v2-placeholder | Berpotensi balik ke v1 (via GOAPI) |

**Belum dieksekusi karena:**
1. Free Trial GOAPI cuma 2 minggu, 500 request/bulan — jauh dari cukup
   untuk produksi (perlu sync harian × ratusan saham). Paket berbayar
   "Stock Market IDX" mulai Rp 550.000 (tier di atas trial belum dicek
   detail benefit/limitnya — perlu dicek tier "Developer"/"Enterprise").
2. Ini keputusan budget & arsitektur (commit ke vendor pihak ketiga
   sebagai dependency kritis) — bukan keputusan teknis semata.
3. Migration schema (`migrations/0001_initial_schema.sql`) dan API
   contract (`docs/api-contract.md`) perlu direvisi kalau fitur-fitur ini
   naik balik ke v1 (tabel baru buat broker-per-saham time-series, ubah
   endpoint dari `coming_soon` ke kontrak beneran).

## Rekomendasi

1. Kris cek detail & harga tier "Developer"/"Enterprise" GOAPI (dan/atau
   lanjut cek harga Sectors.app di `sectors.app/pricing` langsung).
2. Putuskan: commit ke GOAPI, banding dulu ke Sectors.app, atau tetap di
   v2-placeholder untuk sekarang (defer keputusan vendor ke fase lain).
3. Kalau commit ke vendor: revisi `docs/schema-diagram.md` (tabel baru,
   mis. `broker_stock_activity`) dan `docs/api-contract.md` (endpoint
   Bandarmology dkk naik dari placeholder ke kontrak v1 beneran) sebelum
   lanjut nulis ingestion sync job yang manggil GOAPI.
