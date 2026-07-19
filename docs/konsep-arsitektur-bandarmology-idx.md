# Konsep Arsitektur — elona (Platform Bandarmology IDX)

**Status: DRAFT, disintesis 2026-07-19.** Dokumen ini sebelumnya tidak ada
di repo (dicek: tidak di `docs/`, tidak di git history, tidak di
filesystem manapun). Disusun dengan merangkum keputusan yang **sudah**
dibuat dan tercatat di `docs/fase-0-*.md`, `docs/fase-2-*.md`,
`docs/goapi-due-diligence.md`, `docs/schema-diagram.md`,
`docs/api-contract.md`, `docs/buyback-verification.md`,
`docs/neobdm-competitor-research.md` — bukan menciptakan keputusan baru.
Bagian yang ditandai **[KEPUTUSAN BARU 2026-07-19]** adalah keputusan yang
baru dikonfirmasi Kris pada tanggal ini, khusus untuk kebutuhan compute
layer (belum pernah tercatat di dokumen manapun sebelum ini — dicek via
grep, nol hasil untuk "precompute"/"rolling window"/"compute layer").

Perlu di-review oleh Kris sebelum jadi acuan resmi jangka panjang.

---

## 1. Ringkasan Produk

Platform bandarmology IDX (top accumulation, screening, analysis) — mirip
`terminalb.id`. Target arsitektur: Cloudflare Workers + D1 + R2 + KV,
deploy dari GitHub, auth Google OAuth. (Sumber: `README.md`.)

## 2. Status & Scope Fitur

| Fitur | Status | Endpoint | Catatan |
| :--- | :--- | :--- | :--- |
| Top Accumulation by Investor Type | v1 | `/api/dashboard/top-accumulation` | Sumber `net_foreign_inflow` (Sectors.app), `net`-only Rupiah, `type=domestic` gugur |
| Top Accumulation Foreign | v1 | `/api/dashboard/top-accumulation-foreign` | Sama seperti di atas |
| Market Summary | v1 | `/api/screening/market-summary` | `value`/`frequency` null/dihilangkan (GOAPI gak punya) |
| Sector Activity | v1 | `/api/screening/sector-activity` | `total_value` null, `total_volume` jadi metrik utama |
| Rotation Chart | v1 | `/api/screening/rotation-chart` | Default metric `volume`, bukan `value` |
| Transaction Chart | v1 | `/api/analysis/transaction-chart` | - |
| Seasonality Table | v1 | `/api/analysis/seasonality` | Bergantung kedalaman backfill Fase 2 |
| Balance Position Chart | v1 | `/api/analysis/balance-position` | Berbasis `ownership_composition` (KSEI, bulanan) — sumber data belum terverifikasi |
| Scripless Bertambah/Berkurang | v2-placeholder | `/api/screening/scripless` | - |
| Indikasi Nominee | v2-placeholder | `/api/screening/nominee-indication` | - |
| Done Detail Visualization | v2-placeholder | `/api/analysis/done-detail` | - |
| Bandarmology | v2-placeholder | `/api/dashboard/bandarmology` | Data broker-per-saham gak tersedia dari endpoint publik IDX; GOAPI ternyata punya, tapi status TETAP placeholder — keputusan produk, bukan blocker teknis |
| Broker Stalker | v2-placeholder | `/api/screening/broker-stalker` | Sama seperti di atas |
| Broker Summary (per-saham) | v2-placeholder | `/api/analysis/broker-summary` | Sama seperti di atas |
| Inventory Chart | v2-placeholder | `/api/analysis/inventory-chart` | Butuh breakdown broker+saham granular |
| Potensi Buyback Institusi | v2-placeholder | `/api/dashboard/buyback-potential` | Data pengumuman IDX gak terstruktur (cuma metadata + PDF) |
| Money Management | belum didefinisikan | (tidak ada) | Skip total, belum ada spec fitur |

Detail lengkap + rationale per fitur: `docs/api-contract.md` (tabel
"Ringkasan konsistensi lintas dokumen"), `docs/schema-diagram.md`,
`docs/fase-0-findings.md`, `docs/buyback-verification.md`.

**Catatan penting soal Bandarmology/Broker Stalker/Broker Summary/Inventory
Chart**: `docs/fase-2-vendor-validation.md` menemukan GOAPI.IO ternyata
PUNYA data broker-per-saham granular (tervalidasi live, lihat section 3).
Ini secara teknis membuka jalan buat naikkan fitur-fitur ini ke v1 — TAPI
Kris memutuskan status **TETAP v2-placeholder** untuk fase compute layer
ini. Ini keputusan produk eksplisit, bukan hasil constraint teknis — jangan
diimplementasi ulang meski jalan teknisnya ada.

## 3. Sumber Data & Status Due Diligence

| Data | Vendor | Due diligence teknis | Due diligence legal | Status pakai |
| :--- | :--- | :--- | :--- | :--- |
| Stock Summary (OHLC + volume) | GOAPI.IO | Lolos (`docs/fase-2-worker-network-test.md`, `docs/fase-2-vendor-validation.md`) | **Belum ketat** — lihat temuan `docs/goapi-due-diligence.md`: halaman contact kosong, Privacy Policy 404, ToS merujuk domain beda (`goapi.id` vs `goapi.io`), tidak ada nama badan usaha, tidak ada klausul indemnifikasi | **Dipakai** — keputusan Kris, diterima dengan risiko di atas |
| `net_foreign_inflow` | Sectors.app | Baru dicek coverage via OpenAPI spec (bukan live test, situs block automated fetch) | **Belum lolos** — belum ada riset ToS/legal sama sekali | **Dipakai**, dibatasi 1 field saja (asumsi: risiko lebih kecil karena cakupan sempit — **asumsi ini belum diverifikasi**) |
| Broker Stalker / Broker Summary per-saham, frequency, bid/offer, Buyback Institusi | — | GOAPI tervalidasi punya broker-per-saham; frequency/bid-offer tidak ditemukan di vendor manapun | — | **Tidak dipakai fase ini** — v2-placeholder, keputusan produk (lihat section 2) |

`idx.co.id` langsung: **diblokir WAF di semua jaringan yang dites**
(sandbox, Cloudflare Workers, GitHub Actions/Azure) — cuma browser
residential Kris yang terbukti bisa akses. Detail:
`docs/fase-0-findings.md`, `docs/fase-2-worker-network-test.md`.

## 4. Prinsip Arsitektur Compute & Serving Layer

### 4.1 Konvensi response serving layer (sudah ditetapkan, `docs/api-contract.md`)

Setiap response endpoint v1 (bukan placeholder) wajib punya:
- `last_updated` (ISO 8601) — timestamp data terakhir di-sync ke D1, bukan
  timestamp request.
- `staleness_flag` (`"fresh"` | `"stale"` | `"unknown"`).

Endpoint v2-placeholder cukup `{ "status": "coming_soon" }`.

### 4.2 Isolasi vendor per adapter (pola yang sudah berlaku, diperluas eksplisit di sini)

`docs/fase-2-vendor-validation.md` & `docs/fase-2-worker-network-test.md`
sudah menunjukkan pola: tiap vendor (GOAPI, Sectors.app) diperlakukan
sebagai sumber yang bisa didrop/diganti sewaktu-waktu (persis yang terjadi
saat GOAPI awalnya dicoba untuk Stock Summary lengkap, lalu sebagian
fieldnya digantikan skip/vendor lain). Prinsip yang dieksplisitkan di sini:
**compute layer tidak boleh punya dependency langsung ke SDK/client vendor
manapun** — akses ke data vendor selalu lewat satu adapter module per
vendor. Kalau vendor didrop, penggantian cukup di satu file, tanpa
menyentuh logic aggregation/rolling window.

### 4.3 Precompute, bukan compute-on-request — **[KEPUTUSAN BARU 2026-07-19]**

Sebelum hari ini, prinsip ini tidak tercatat di manapun di repo (dicek
lewat grep di seluruh `docs/`/`migrations/`/`src/` — nol hasil untuk
"precompute" atau "compute-on-request"). Kris mengonfirmasi eksplisit hari
ini: hasil aggregation (rolling window, dan turunan sejenis di masa depan)
**dihitung di muka lewat job terjadwal (precompute)**, hasilnya disimpan
di tabel canonical D1, BUKAN dihitung ulang tiap kali API di-request.
Serving layer/API handler cuma baca hasil precompute yang sudah ada.

Konsekuensi: kalau job precompute belum pernah jalan (mis. karena
ingestion belum mengisi data sumber), tabel hasil aggregation kosong —
endpoint yang bergantung padanya harus punya jalur eksplisit untuk
`staleness_flag: "unknown"` (bukan komputasi fallback on-request).

### 4.4 Rolling window: 5D / 20D / 60D — **[KEPUTUSAN BARU 2026-07-19]**

Ukuran window juga baru dikonfirmasi hari ini, sama sekali belum tercatat
sebelumnya. Berlaku untuk metrik OHLC+volume (GOAPI) dan `foreign_net`
(Sectors.app): rolling average close, rolling sum volume, rolling sum
`foreign_net`, masing-masing untuk window 5 hari bursa, 20 hari bursa, dan
60 hari bursa terakhir.

### 4.5 Staleness threshold untuk tabel aggregate — **[KEPUTUSAN BARU 2026-07-19]**

Kris mengonfirmasi: aggregate dianggap `"stale"` kalau belum di-precompute
ulang setelah 1 hari bursa penuh berlalu sejak data sumber (`stock_summary`)
terakhir di-update. Ini threshold spesifik untuk tabel aggregation Fase 3
— bukan pengganti threshold `staleness_flag` endpoint lain yang disebut di
`docs/api-contract.md` (itu masih "ditentukan pas Fase 2 sync job
dibangun", belum final).

### 4.6 Index strategy

Pola yang sudah dipakai konsisten di semua tabel time-series harian
(`docs/schema-diagram.md`): dua index, `(date, stock_code)` untuk query
"semua saham pada tanggal X" (screening) dan `(stock_code, date)` untuk
query "histori satu saham" (analysis/chart). Tabel aggregation rolling
window mengikuti pola sama, dengan `window` sebagai kolom tambahan —
tidak ada `broker_code` karena data ini (OHLC/volume/foreign_net) tidak
granular per-broker (lihat section 2, Bandarmology dkk tetap
v2-placeholder).

## 5. Skema Data (D1)

Skema lengkap + rationale ada di `docs/schema-diagram.md` (ERD, 5 tabel:
`stock_summary`, `broker_summary`, `broker_master`, `sector_mapping`,
`ownership_composition`) dan `migrations/0001_initial_schema.sql`.
Ringkasan:

- `stock_summary` — satu row per `(date, stock_code)`, sumber v1 GOAPI
  (OHLC+volume) + Sectors.app (`foreign_net`, kolom nullable, plain, bukan
  `GENERATED`). Field `value`/`frequency` ada di schema tapi null di v1
  (tidak ada sumbernya).
- `broker_summary` — agregat market-wide per broker per hari, BUKAN
  breakdown per saham (confirmed tidak ada dari IDX publik, `docs/fase-0-
  findings.md`).
- `broker_master`, `sector_mapping` — tabel referensi.
- `ownership_composition` — snapshot bulanan (KSEI), sumber data BELUM
  terverifikasi (`docs/schema-diagram.md`).

Tabel hasil rolling window aggregation (Fase 3, baru) ada di
`migrations/0002_rolling_aggregate.sql` — lihat kode.

## 6. API Contract

Kontrak endpoint lengkap: `docs/api-contract.md`. Belum ada implementasi
handler untuk sebagian besar endpoint — serving layer masih placeholder
(`src/serving/index.ts`).

## 7. Roadmap Fase

| Fase | Scope | Status |
| :--- | :--- | :--- |
| Fase 0 | Validasi data source publik IDX (broker summary per-saham, buyback) | Selesai — hasil: broker-per-saham & buyback terstruktur TIDAK tersedia dari endpoint publik IDX |
| Fase 1 | Schema D1 + API contract | Selesai — `migrations/0001_initial_schema.sql`, `docs/api-contract.md`, `docs/schema-diagram.md` |
| Fase 2 | Ingestion pipeline (fetch vendor → tulis ke D1) | **Sebagian** — vendor tervalidasi (GOAPI, Sectors.app coverage check), keputusan arsitektur network (Worker cron ke `api.goapi.io`, bukan `idx.co.id` langsung) sudah final. **Kode ingestion aktual (`src/ingestion/`, `src/normalization/`) BELUM ditulis** — masih `.gitkeep` kosong. D1 juga belum diprovision (`wrangler.jsonc` masih placeholder ID). |
| Fase 3 | Compute layer — rolling window aggregation (precompute) | **Sedang dikerjakan** (dokumen ini + kode terkait). Dibangun di atas asumsi data `stock_summary` sudah ada dari Fase 2 — karena Fase 2 belum tuntas, compute layer ini divalidasi pakai data seed/manual, BUKAN data produksi asli. Lihat laporan validasi terpisah. |

## 8. Open Items / Gap Belum Terverifikasi

- Sumber data `ownership_composition` (KSEI) — belum dicek sama sekali.
- Ingestion pipeline Fase 2 (kode nyata) belum ditulis; D1 belum
  diprovision.
- Due diligence legal GOAPI.IO — belum ketat (lihat `docs/goapi-due-
  diligence.md`, beberapa red flag ditemukan, belum ada kesimpulan
  aman/tidak aman).
- Due diligence legal/entitas Sectors.app — belum dimulai sama sekali.
- Asumsi "risiko lebih kecil karena Sectors.app cuma dipakai untuk 1
  field" — belum diverifikasi, murni asumsi kerja.
