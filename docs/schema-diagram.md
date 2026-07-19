# Fase 1 — Schema Diagram & Rationale

Skema D1 di `migrations/0001_initial_schema.sql`. Dokumen ini jelasin
kenapa tiap tabel bentuknya begitu, dan gimana skema ini map ke scope
fitur v1 final (lihat `docs/api-contract.md` buat kontrak endpoint-nya).

**Revisi 2026-07-18**: `bid`/`offer`/`bid_volume`/`offer_volume` DIHAPUS
dari `stock_summary`, tabel baru `ownership_composition` ditambah.
Alasan: riset kompetitor (`docs/neobdm-competitor-research.md`) nemuin
kalau "Balance Position Chart" (nama fitur yang jadi acuan schema ini)
sebenarnya adalah **komposisi kepemilikan** (Foreign/Local per kategori
investor, data KSEI bulanan) — BUKAN order book bid/offer harian seperti
yang diasumsikan sebelumnya. Field bid/offer itu juga salah satu dari
dua field yang dikonfirmasi TIDAK ada di vendor data manapun yang dicek
(`docs/fase-2-vendor-validation.md`), jadi koreksi ini sekaligus nutup
gap arsitektur ingestion yang lagi diributkan di Fase 2
(`docs/fase-2-worker-network-test.md`).

## Diagram (ERD, mermaid)

```mermaid
erDiagram
    stock_summary {
        integer id PK
        text date
        text stock_code
        text stock_name
        real close_price
        integer volume
        integer value
        integer foreign_buy
        integer foreign_sell
        integer foreign_net "generated: buy - sell"
    }

    broker_summary {
        integer id PK
        text date
        text broker_code
        text broker_name
        integer total_value
        integer volume
        integer frequency
    }

    broker_master {
        text broker_code PK
        text broker_name
        text license
    }

    sector_mapping {
        text stock_code PK
        text sector
        text sub_sector
        text industry
        text sub_industry
    }

    ownership_composition {
        integer id PK
        text stock_code
        text period "YYYY-MM, monthly"
        real pct_institution
        real pct_retail
        real pct_foreign
        real free_float_pct
        real scripless_pct
    }

    broker_summary }o--|| broker_master : "broker_code (app-level join, no FK)"
    stock_summary }o--|| sector_mapping : "stock_code (app-level join, no FK)"
    ownership_composition }o--|| sector_mapping : "stock_code (app-level join, no FK)"
```

Catatan: D1/SQLite gak ada FK enforcement yang dipakai di sini (join di
level query aja, `broker_code`/`stock_code` sebagai natural key). Alasan:
data broker_summary dan stock_summary di-refresh harian dari sync job
independen (Fase 2) — FK constraint bakal bikin urutan sync jadi kaku
(broker_master/sector_mapping harus sync duluan tiap kali). Trade-off ini
disengaja untuk fase ini; revisit kalau muncul masalah data-integrity nyata.

## Kenapa 5 tabel ini

### `stock_summary`
Sumber tunggal buat hampir semua fitur v1: Market Summary, Transaction
Chart, Seasonality Table, DAN — paling penting — Top Accumulation by
Investor Type / Top Accumulation Foreign, karena field
`foreign_buy`/`foreign_sell`/`foreign_net` di sini **granular per saham**
(diverifikasi Fase 0, ini pengganti Bandarmology). Balance Position
Chart TIDAK lagi pakai tabel ini — lihat `ownership_composition` di
bawah.

`foreign_net` pakai `GENERATED ALWAYS AS ... STORED` (bukan dihitung di
app layer) supaya query "top net foreign buy hari ini" bisa langsung
`ORDER BY foreign_net DESC` tanpa compute ekstra tiap request — penting
buat D1 yang billing-nya rows-read based, generated+stored column gak
nambah cost dibanding kolom biasa.

### `broker_summary`
**AGGREGATE ONLY** — market-wide total per broker per hari, BUKAN
breakdown per saham. Ini keputusan eksplisit dari Fase 0
(`docs/fase-0-findings.md`, dikonfirmasi ulang `docs/fase-0-findings-v2.md`):
IDX gak expose broker-per-saham lewat endpoint publik manapun yang
ditemukan. Tabel ini tetap dibuat karena datanya beneran ada dan valid
buat dipakai di level lain (mis. ranking broker paling aktif market-wide
per hari) — TAPI tidak bisa dan tidak boleh dipakai buat fitur
Bandarmology/Broker Stalker/Broker Summary (yang butuh breakdown per
saham) — fitur-fitur itu di v2-placeholder.

### `broker_master`
Registry sederhana (kode, nama, lisensi broker) dari
`participants.getBrokerSearch`. Dipakai buat resolve `broker_code` di
`broker_summary` jadi nama yang enak dibaca di UI.

### `sector_mapping`
Diverifikasi ada dari `NeaByteLab/IDX-API` — dua sumber independen
konsisten: `ListedCompany/GetCompanyProfilesDetail` (`profile.sector`,
`profile.subSector`) dan stock-screener API
(`sector`/`subSector`/`industry`/`subIndustry`). Basis buat Sector
Activity dan Rotation Chart (agregasi `stock_summary` di-join by sector).

### `ownership_composition` (baru, revisi 2026-07-18)
Basis buat Balance Position Chart versi yang benar (komposisi
kepemilikan per kategori investor, bukan order book). Snapshot bulanan,
bukan harian — beda cadence dari `stock_summary`/`broker_summary`
(itu sebabnya `period` formatnya `YYYY-MM`, bukan `YYYYMMDD`, dan gak
ikut pola index `(date, stock_code)` yang dipakai tabel time-series
harian lainnya).

**BELUM TERVERIFIKASI**: sumber data + cara aksesnya. NeoBDM
nampilinnya dari file yang kelihatan kayak export resmi KSEI, tapi kita
belum cek langsung apakah/gimana file itu bisa didapat (publik? perlu
akun KSEI? berbayar?). Kolom di tabel ini juga cuma versi ringkas dari
apa yang keliatan di UI NeoBDM (`%Institution`/`%Retail`/`%Foreign`,
scripless %, free float %) — breakdown detail per kategori investor
(Foreign Bank/Asuransi/Dapen/dst yang keliatan di legend chart mereka)
SENGAJA belum dimasukkan ke schema karena field-name aslinya belum
kekonfirmasi dari sumber data manapun, cuma dari legend UI. Revisi tabel
ini begitu sumber KSEI dicek beneran — jangan asumsikan struktur final.

## Keputusan eksplisit: Inventory Chart

Task ini minta keputusan eksplisit soal Inventory Chart — apakah butuh
data broker-level atau bisa dari OHLC/volume biasa.

**Keputusan: Inventory Chart PINDAH ke v2-placeholder.**

Alasan: "Inventory Chart" di platform bandarmology (referensi: Stockbit,
RTI Business, dan platform sejenis) secara definisi umum adalah **running
cumulative position broker tertentu di saham tertentu** — total akumulasi
net-buy/net-sell broker X di saham Y dari waktu ke waktu. Ini secara
definisi butuh breakdown broker+saham granular, persis data yang sudah
dikonfirmasi TIDAK tersedia dari endpoint publik IDX (sama kayak
Bandarmology/Broker Stalker/Broker Summary). Gak ada versi "aggregate
market-wide" dari Inventory Chart yang masuk akal — beda dari Top
Accumulation (yang emang by-design market-wide per investor-type, bukan
per-broker), Inventory Chart secara konsep spesifik ke satu broker. Jadi
turun ke v2-placeholder, sejajar Bandarmology/Broker Stalker/Broker Summary.

## Open items / belum terjawab

- **Sumber data `ownership_composition`**: belum dicek sama sekali —
  lihat catatan di section tabel itu di atas. Blocker buat Balance
  Position Chart jadi v1 beneran (schema udah ada, tapi ingestion-nya
  belum, dan sumbernya sendiri belum diverifikasi).
- **`stock_summary.frequency`**: masih gap — dikonfirmasi TIDAK ada di
  GOAPI maupun Sectors.app (`docs/fase-2-vendor-validation.md`). Dengan
  bid/offer udah dihapus dari tabel ini, `frequency` sekarang jadi
  satu-satunya field `stock_summary` yang masih butuh Opsi A (ingestion
  dari jaringan non-datacenter, lihat `docs/fase-2-worker-network-test.md`)
  atau turun status kalau Kris terima kompromi (Market Summary tanpa
  kolom frequency).
- **Company announcement / buyback**: lihat `docs/buyback-verification.md`
  — kesimpulan: data TIDAK terstruktur, gak ada tabel `company_announcement`
  di migration ini.
- **Money Management**: SKIP total di fase ini sesuai instruksi task —
  belum ada definisi fitur yang jelas, jadi belum ada schema.
- **D1 rows-read cost di scale besar**: index yang ada (`date, stock_code`
  dan `stock_code, date` masing-masing tabel time-series) cover pola query
  yang diketahui sekarang (by-date dan by-stock). Kalau nanti muncul pola
  query baru (mis. by-sector langsung tanpa join), perlu index tambahan —
  belum dibuat sekarang biar gak over-index tabel yang belum ada data
  volumenya.
