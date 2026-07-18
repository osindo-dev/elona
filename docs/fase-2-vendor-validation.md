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

## Harga GOAPI.IO Stock Market IDX (dicek 2026-07-18, app.goapi.io/marketplace)

Free Trial (dipakai buat validasi di atas) sudah terpakai untuk akun ini,
gak bisa dipakai ulang. Dua tier berbayar:

| Tier | Endpoint | Limit | 1 bulan | 3 bulan | 6 bulan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Developer | All endpoints (Data Saham IDX) | tanpa limit harian, **20.000 request/bulan** | Rp 550.000 | Rp 1.467.000 (Rp 489.000/bln) | Rp 2.388.000 (Rp 398.000/bln) |
| Enterprise | All Endpoint | **Unlimited requests** | Rp 955.000 | Rp 2.397.000 (Rp 799.000/bln) | Rp 4.680.000 (Rp 780.000/bln) |

Belum checkout/subscribe ke tier manapun — masih di Free Trial (expired
~2026-08-01). Ini murni cek harga, nunggu keputusan Kris sebelum bayar.

**Estimasi kebutuhan volume:** kalau sync `broker_summary` harian untuk
~900 saham IDX × 1 request/saham/hari × ~21 hari bursa/bulan ≈ **~18.900
request/bulan** — mepet ke limit 20.000/bulan tier Developer. Kalau nanti
nambah fitur lain yang juga hit GOAPI (top gainer, index, dst) atau mau
retry-safety margin, kemungkinan perlu Enterprise (unlimited) atau
strategi caching/batasi saham yang di-sync (mis. cuma yang di LQ45 atau
volume tinggi, bukan semua 900 saham).

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

## Update 2026-07-18: Opsi C — cek coverage Sectors.app untuk Stock Summary

Konteks: GOAPI ternyata gak cover Stock Summary lengkap (lihat
`docs/fase-2-worker-network-test.md` — field `value`, `frequency`,
`bid`/`offer` gak ada di endpoint harga GOAPI manapun). Sebelum commit
ke arsitektur Opsi A (ingestion dari jaringan non-datacenter), dicek
dulu apakah Sectors.app (kandidat vendor lain) punya data lebih lengkap
buat Stock Summary. Dicek via OpenAPI spec resmi mereka di GitHub
(`supertypeai/sectors_api_docs`), bukan live fetch (situsnya block
automated fetch, sama kayak sebelumnya).

**Endpoint `GET /v2/daily/{symbol}/`** (Daily Transaction Data):
```json
{ "symbol": "BBCA.JK", "date": "2025-05-02", "close": 8975, "volume": 92219000, "market_cap": 1095329638012500 }
```
Cuma `close`, `volume`, `market_cap`. **Bahkan gak ada open/high/low** —
lebih terbatas dari GOAPI yang minimal punya OHLC penuh.

**Endpoint `GET /v2/foreign-flow/{symbol}/`** (Daily Net Foreign Inflow):
```json
{ "date": "2025-05-02", "net_foreign_inflow": 199859810000 }
```
Net foreign flow dalam Rupiah (bukan lot, bukan split buy/sell terpisah
— cuma net). Field ini justru lebih lengkap dari GOAPI (yang gak expose
foreign flow di endpoint harga sama sekali, cuma bisa didapat imply dari
broker_summary kalau mau dijumlahkan manual per broker asing).

**Dicek juga seluruh spec (`grep` field name di full OpenAPI JSON):
gak ada `frequency`, `bid`, `offer`, `open`, `high`, `low` di endpoint
manapun di Sectors.app v2** — bukan cuma di endpoint daily, di semua 60+
endpoint yang ter-dokumentasi.

### Kesimpulan: TIDAK ADA vendor (GOAPI maupun Sectors.app) yang cover Stock Summary lengkap sesuai schema `stock_summary`

| Field wajib di schema | GOAPI | Sectors.app |
| :--- | :--- | :--- |
| open/high/low/close | ✅ (OHLC lengkap) | ❌ (cuma close) |
| volume | ✅ | ✅ |
| value (Rupiah traded) | ❌ | ❌ (ada market_cap, beda konsep) |
| frequency | ❌ | ❌ |
| foreign_buy/foreign_sell | ❌ (gak ada di endpoint harga) | ~ (ada net_foreign_inflow, Rupiah, bukan lot, bukan split buy/sell) |
| bid/offer (order book) | ❌ | ❌ |

Gak ada satupun vendor yang genuinely proper punya `frequency` atau
`bid`/`offer` — dua-duanya kosong di semua vendor yang dicek. Ini bukan
soal salah pilih vendor, kemungkinan besar karena data granular level
itu (frequency transaksi, order book depth) memang cuma dijual lewat
IDX Data Services resmi (data feed member/vendor institusional), bukan
lewat vendor consumer-grade macam GOAPI/Sectors yang fokusnya harga +
analytics turunan.

### Dampak ke keputusan Opsi A/B/C

- **Opsi B (GOAPI penuh buat Stock Summary): tetap gugur.**
- **Opsi C (Sectors.app buat Stock Summary): gugur juga** — malah lebih
  minim dari GOAPI (gak ada OHLC penuh).
- **Kombinasi vendor** (GOAPI buat OHLC+volume, Sectors buat
  net_foreign_inflow) bisa nutup Top Accumulation + Transaction Chart +
  Seasonality, TAPI tetap gak nutup `frequency` (dipakai di Market
  Summary) dan `bid`/`offer` (basis Balance Position Chart) — dua fitur
  ini tetap butuh Opsi A (ingestion dari jaringan Kris) kalau mau tetap
  di v1, atau turun status kalau Kris terima kompromi.
- **Opsi A tetap relevan**, minimal buat field yang gak ada di vendor
  manapun. Pertanyaannya sekarang bukan lagi "pakai vendor atau Opsi A"
  tapi "seberapa besar porsi Stock Summary yang tetap harus lewat Opsi A."
