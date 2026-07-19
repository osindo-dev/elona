# Fase 1 — API Contract

Kontrak/desain endpoint yang akan diserve dari serving layer (Cloudflare
Workers). **Belum ada implementasi handler** — ini format request/response
saja, disepakati dulu sebelum Fase 2 (ingestion) dan Fase 3 (serving).

Base path: `/api`. Semua tanggal format `YYYYMMDD` kecuali disebutkan lain.

## Konvensi wajib di semua response (v1)

Setiap response endpoint v1 (bukan placeholder) WAJIB punya dua field ini
di root object:

- `last_updated` (string, ISO 8601) — timestamp kapan data ini terakhir
  di-sync ke D1 (bukan timestamp request). Diambil dari
  `stock_summary.source_updated_at` / `broker_summary.created_at` /
  tabel terkait, tergantung endpoint.
- `staleness_flag` (string enum: `"fresh"` | `"stale"` | `"unknown"`) —
  `"fresh"` kalau `last_updated` dalam window yang diharapkan (mis. data
  hari bursa terakhir sudah ke-sync), `"stale"` kalau lewat window itu
  (sync job gagal/telat — Fase 2), `"unknown"` kalau tabel kosong sama
  sekali. Threshold pastinya (berapa jam dianggap stale) ditentukan pas
  Fase 2 pas sync job dibangun — belum relevan di fase ini.

Endpoint v2-placeholder TIDAK perlu field ini — responsenya selalu persis
`{ "status": "coming_soon" }`, gak ada field lain.

---

## Dashboard

### GET /api/dashboard/top-accumulation

```
GET /api/dashboard/top-accumulation?type=foreign&date=YYYYMMDD&limit=20
```

- `type` (required): `foreign` | `domestic`
- `date` (optional, default: hari bursa terakhir yang sudah ke-sync)
- `limit` (optional, default 20, max 100)

Response:
```json
{
  "date": "20260717",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": [
    { "stock_code": "BBCA", "stock_name": "Bank Central Asia Tbk", "buy": 1234567, "sell": 234567, "net": 1000000, "rank": 1 }
  ]
}
```

Sumber: `stock_summary.foreign_buy/foreign_sell/foreign_net`, sorted by
`net DESC` (untuk `type=foreign`). `type=domestic` dihitung sebagai
`volume - foreign_buy`/`volume - foreign_sell` (bukan field langsung —
CATAT: perlu diverifikasi ulang di Fase 2 apakah pendekatan ini akurat,
karena IDX gak expose domestic_buy/sell eksplisit, cuma foreign; domestic
di sini inferred, bukan field asli dari sumber data).

### GET /api/dashboard/top-accumulation-foreign

```
GET /api/dashboard/top-accumulation-foreign?date=YYYYMMDD&limit=20
```

Shortcut/alias untuk `top-accumulation?type=foreign`. Response shape
identik dengan di atas (field `type` dihilangkan dari query karena fixed).
Bukan endpoint terpisah secara implementasi — didokumentasikan sebagai
entry sendiri karena disebut eksplisit sebagai fitur v1 terpisah di scope.

### GET /api/dashboard/bandarmology — **v2-placeholder**

```
GET /api/dashboard/bandarmology?date=YYYYMMDD
Response: { "status": "coming_soon" }
```

### GET /api/dashboard/buyback-potential — **v2-placeholder**

```
GET /api/dashboard/buyback-potential
Response: { "status": "coming_soon" }
```

---

## Screening

### GET /api/screening/market-summary

**Catatan 2026-07-18**: `value` dan `frequency` DISKIP di v1 (keputusan
Kris) — GOAPI (sumber `stock_summary` di v1) gak punya field ini. Kedua
field tetap ada di response (biar kontrak stabil kalau nanti diisi),
tapi nilainya `null` dan `sort=value`/`sort=frequency` gak fungsional
sampai sumbernya ada.

```
GET /api/screening/market-summary?date=YYYYMMDD&sort=volume&limit=50&offset=0
```

- `date` (optional, default hari bursa terakhir)
- `sort` (optional, default `volume`): `volume` | `change_percent` |
  `value` | `frequency` (dua terakhir gak fungsional di v1, lihat catatan
  di atas — request tetap valid, hasil urutannya null semua kalau dipilih)
- `limit` (optional, default 50, max 200), `offset` (optional, default 0)

Response:
```json
{
  "date": "20260717",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "pagination": { "limit": 50, "offset": 0, "total": 900 },
  "data": [
    { "stock_code": "BBCA", "stock_name": "Bank Central Asia Tbk", "open": 9800, "high": 9900, "low": 9750, "close": 9875, "change": 75, "change_percent": 0.77, "volume": 12345600, "value": null, "frequency": null }
  ]
}
```

Sumber: `stock_summary`, satu row per stock per `date`.

### GET /api/screening/sector-activity

**Catatan 2026-07-18**: `total_value` diskip di v1 (sama alasan kayak
Market Summary — `value` gak ada dari GOAPI). `total_volume` jadi metrik
utama buat v1, bukan `total_value` seperti desain awal.

```
GET /api/screening/sector-activity?date=YYYYMMDD
```

Response:
```json
{
  "date": "20260717",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": [
    { "sector": "Financials", "stock_count": 95, "total_value": null, "total_volume": 890000000, "avg_change_percent": 1.2 }
  ]
}
```

Sumber: `stock_summary` JOIN `sector_mapping` ON `stock_code`, agregat
`GROUP BY sector` untuk `date` yang diminta.

### GET /api/screening/rotation-chart

**Catatan 2026-07-18**: default `metric` diubah ke `volume` (dari `value`
sebelumnya) — `value` gak diisi di v1, sama alasan kayak Market
Summary/Sector Activity. `metric=value` tetap valid dipanggil tapi
hasilnya null semua sampai sumbernya ada.

```
GET /api/screening/rotation-chart?date_from=YYYYMMDD&date_to=YYYYMMDD&metric=volume
```

- `metric` (optional, default `volume`): `volume` | `value` (`value` gak
  fungsional di v1, lihat catatan di atas)

Response:
```json
{
  "date_from": "20260701",
  "date_to": "20260717",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": [
    { "sector": "Financials", "series": [{ "date": "20260701", "value": 210500000 }, { "date": "20260702", "value": 198300000 }] }
  ]
}
```

Sumber: turunan time-series dari query Sector Activity di atas, per
tanggal dalam range `date_from`..`date_to`.

### GET /api/screening/scripless — **v2-placeholder**

```
GET /api/screening/scripless?date=YYYYMMDD
Response: { "status": "coming_soon" }
```

### GET /api/screening/nominee-indication — **v2-placeholder**

```
GET /api/screening/nominee-indication?date=YYYYMMDD
Response: { "status": "coming_soon" }
```

### GET /api/screening/broker-stalker — **v2-placeholder**

```
GET /api/screening/broker-stalker?broker_code=YP&stock_code=BBCA
Response: { "status": "coming_soon" }
```

---

## Analysis

### GET /api/analysis/transaction-chart

```
GET /api/analysis/transaction-chart?stock_code=BBCA&date_from=YYYYMMDD&date_to=YYYYMMDD
```

Response:
```json
{
  "stock_code": "BBCA",
  "date_from": "20260601",
  "date_to": "20260717",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": [
    { "date": "20260601", "open": 9700, "high": 9800, "low": 9650, "close": 9750, "volume": 10500000 }
  ]
}
```

Sumber: `stock_summary` filtered `stock_code` + `date` range, `ORDER BY date`.

### GET /api/analysis/seasonality

```
GET /api/analysis/seasonality?stock_code=BBCA&years=5
```

Response:
```json
{
  "stock_code": "BBCA",
  "years_analyzed": 5,
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": [
    { "month": 1, "avg_change_percent": 2.1, "positive_years": 3, "negative_years": 2, "sample_size": 5 }
  ]
}
```

Sumber: agregasi historis `stock_summary` per `stock_code`, `GROUP BY
strftime('%m', date)` (atau setara). CATAT: butuh data historis minimal
beberapa tahun untuk berguna — ini bergantung sepenuhnya pada Fase 2
(seberapa jauh backfill dilakukan). Kalau backfill cuma beberapa bulan,
endpoint ini secara teknis jalan tapi hasilnya gak representatif —
bukan masalah kontrak, dicatat sebagai dependency ke Fase 2.

### GET /api/analysis/balance-position

**Revisi 2026-07-18**: kontrak awal endpoint ini salah tafsir — "Balance
Position Chart" bukan order book bid/offer, tapi komposisi kepemilikan
per kategori investor (data bulanan, sumber KSEI). Lihat
`docs/schema-diagram.md` bagian `ownership_composition` untuk detail +
open item soal sumber data yang belum terverifikasi.

```
GET /api/analysis/balance-position?stock_code=BBCA&period=2026-06
```

- `period` (optional, format `YYYY-MM`, default: periode terbaru yang
  ke-sync)

Response:
```json
{
  "stock_code": "BBCA",
  "period": "2026-06",
  "last_updated": "2026-07-18T02:15:00Z",
  "staleness_flag": "fresh",
  "data": {
    "pct_institution": 63.7,
    "pct_retail": 20.1,
    "pct_foreign": 42.5,
    "free_float_pct": 42.5,
    "scripless_pct": 42.6,
    "source_period_date": "2026-06-30"
  }
}
```

Sumber: tabel `ownership_composition`, satu row per `(stock_code,
period)`. `staleness_flag` di sini beda makna dari endpoint harian
lain — karena datanya bulanan, "fresh" berarti periode terbaru yang
tersedia sudah ke-sync, BUKAN "hari ini sudah update". Threshold pasti
ditentukan pas ingestion job dibangun (Fase 2), sama kayak endpoint
lain.

**CATAT**: response shape di atas berdasarkan schema
`ownership_composition` yang field-nya sendiri masih placeholder
(diambil dari legend UI kompetitor, belum dari sumber data asli) —
kontrak ini kemungkinan besar direvisi lagi begitu sumber KSEI dicek.

### GET /api/analysis/broker-summary — **v2-placeholder**

```
GET /api/analysis/broker-summary?broker_code=YP&date=YYYYMMDD
Response: { "status": "coming_soon" }
```

Catatan: path ini sengaja gak dipakai untuk data `broker_summary` table
yang sudah ada (agregat market-wide) — karena ekspektasi fitur "Broker
Summary" di scope awal adalah breakdown per-saham, yang gak tersedia.
Kalau nanti ada kebutuhan expose agregat market-wide broker (beda dari
fitur ini), itu endpoint baru, bukan endpoint ini.

### GET /api/analysis/done-detail — **v2-placeholder**

```
GET /api/analysis/done-detail?stock_code=BBCA&date=YYYYMMDD
Response: { "status": "coming_soon" }
```

### GET /api/analysis/inventory-chart — **v2-placeholder**

```
GET /api/analysis/inventory-chart?broker_code=YP&stock_code=BBCA
Response: { "status": "coming_soon" }
```

Keputusan turun ke v2-placeholder dijelaskan di
`docs/schema-diagram.md` bagian "Keputusan eksplisit: Inventory Chart" —
butuh breakdown broker+saham granular yang gak tersedia dari sumber
publik IDX.

---

## Belum ada kontrak (out of scope Fase 1)

- **Money Management** — belum didefinisikan fiturnya sama sekali, sesuai
  instruksi task ini di-skip total. Gak ada placeholder endpoint pun.

## Ringkasan konsistensi lintas dokumen

| Fitur | Dokumen scope | Status | Endpoint |
| :--- | :--- | :--- | :--- |
| Top Accumulation by Investor Type | task prompt | v1 | `/api/dashboard/top-accumulation` |
| Top Accumulation Foreign | task prompt | v1 | `/api/dashboard/top-accumulation-foreign` |
| Market Summary | task prompt | v1 | `/api/screening/market-summary` |
| Sector Activity | task prompt | v1 | `/api/screening/sector-activity` |
| Rotation Chart | task prompt | v1 | `/api/screening/rotation-chart` |
| Transaction Chart | task prompt | v1 | `/api/analysis/transaction-chart` |
| Seasonality Table | task prompt | v1 | `/api/analysis/seasonality` |
| Balance Position Chart | task prompt | v1 | `/api/analysis/balance-position` |
| Scripless Bertambah/Berkurang | task prompt | v2-placeholder | `/api/screening/scripless` |
| Indikasi Nominee | task prompt | v2-placeholder | `/api/screening/nominee-indication` |
| Done Detail Visualization | task prompt | v2-placeholder | `/api/analysis/done-detail` |
| Bandarmology | task prompt | v2-placeholder | `/api/dashboard/bandarmology` |
| Broker Stalker | task prompt | v2-placeholder | `/api/screening/broker-stalker` |
| Broker Summary (per-saham) | task prompt | v2-placeholder | `/api/analysis/broker-summary` |
| Potensi Buyback Institusi | task prompt, `docs/buyback-verification.md` | v2-placeholder | `/api/dashboard/buyback-potential` |
| Inventory Chart | `docs/schema-diagram.md` (keputusan Fase 1) | v2-placeholder | `/api/analysis/inventory-chart` |
| Money Management | task prompt | belum didefinisikan | (tidak ada) |
