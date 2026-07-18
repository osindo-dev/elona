# Fase 0 Findings — Validasi Broker Summary Per-Saham (IDX)

Tanggal validasi: 2026-07-18. Tanggal bursa yang dicoba: 2026-07-17 (hari
bursa terakhir sebelum tanggal validasi).

## Ringkasan Eksekutif

**TIDAK BISA dipastikan lewat live fetch** — seluruh domain `www.idx.co.id`
(bukan cuma endpoint API-nya) memblokir request dari environment ini di level
Cloudflare edge (403 "Attention Required"), sebelum request sampai ke origin
server IDX. Ini bukan soal parameter salah atau header kurang — bahkan
homepage biasa pun diblokir.

Namun dari bukti sekunder yang kuat (source code proyek reference
`NeaByteLab/IDX-API`, wrapper aktif untuk API publik IDX yang sama), **tidak
ada endpoint publik IDX yang menyediakan broker summary per-saham**
(broker X net-buy saham Y sekian lot). Endpoint yang ada cuma agregat
market-wide per broker. Detail di bawah.

## 1. Endpoint yang dicoba (live fetch)

Semua endpoint di bawah dicoba dengan `date=20260717`, User-Agent browser
normal (Chrome 126 desktop), header `Accept`/`Referer` standar. Tiap endpoint
di-retry 3x dengan delay 2s/5s/10s saat kena 403/429.

| # | Endpoint | Parameter | Hasil |
|---|----------|-----------|-------|
| 1 | `/primary/TradingSummary/GetBrokerSummary` | `length=10&start=0&date=20260717` | 403 setelah 3x retry |
| 2 | `/primary/TradingSummary/GetBrokerSummary` | `...&code=BBCA` | 403 setelah 3x retry |
| 3 | `/primary/TradingSummary/GetBrokerSummary` | `...&stockcode=BBCA` | 403 setelah 3x retry |
| 4 | `/primary/TradingSummary/GetBrokerSummary` | `...&Code=BBCA` | 403 setelah 3x retry |
| 5 | `/primary/TradingSummary/GetBrokerSummaryChart` | `...&stockcode=BBCA` | 403 setelah 3x retry |
| 6 | `/primary/StockData/GetBrokerSummary` | `stockcode=BBCA&date=20260717` | 403 setelah 3x retry |

Semua endpoint di atas: **TIDAK TERVERIFIKASI** (bukan berarti data tidak
ada — request-nya sendiri gagal sebelum sampai origin).

### Bukti block level-Cloudflare (bukan level-API)

Diagnostik tambahan: fetch homepage `https://www.idx.co.id/` (bukan API sama
sekali) dengan User-Agent yang sama juga return 403, dengan body:

```html
<title>Attention Required! | Cloudflare</title>
...
<meta name="robots" content="noindex, nofollow" />
```

Ini konfirmasi block terjadi di Cloudflare edge untuk seluruh domain dari IP
environment ini — bukan spesifik ke endpoint `GetBrokerSummary`. Kemungkinan
penyebab: IP data center (bukan residential/browser asli) kena filter WAF
IDX. Raw log lengkap (semua request, termasuk status code dan error) ada di
`docs/fase-0-raw-log.json`.

Catatan tambahan: reference client (lihat bagian 2) pakai flow session-cookie
(`GET /id` untuk ambil cookie, baru hit API dengan cookie itu). Flow ini
tidak relevan di sini karena bahkan `GET /id` awal sudah diblokir Cloudflare
sebelum ada kesempatan dapat cookie.

## 2. Bukti sekunder — source code `NeaByteLab/IDX-API`

Repo `NeaByteLab/IDX-API` (GitHub) adalah wrapper TypeScript aktif untuk API
publik IDX yang sama. Diperiksa seluruh struktur `src/` (Trading, Backend,
Statistics, Participants, Company, Market) plus `USAGE.md` (dokumentasi
lengkap semua method).

**Method broker yang ada:**

- `trading.getBrokerSummary(date, start, length)` — implementasinya hit URL
  persis sama: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=${length}&start=${start}&date=${date}`
  — **tanpa parameter stock code sama sekali**. Response di-map ke field:
  `id, date, brokerCode, brokerName, totalValue, volume, frequency` — identik
  dengan field yang disebutkan di task ini, mengonfirmasi ini agregat
  market-wide per broker, bukan breakdown per-saham.
- `participants.getBrokerSearch(start, length)` — cuma registry broker
  (kode, nama, lisensi), bukan data transaksi/aktivitas.

**Tidak ditemukan** method atau endpoint lain yang mengkombinasikan broker +
stock code di seluruh source:
- `src/Backend/Schemas/` — 40 file schema DB, satu-satu dicek by name, cuma
  ada `BrokerSummary.ts` (mirror struktur agregat di atas) dan
  `BrokerParticipant.ts` (registry). Tidak ada `BrokerStockActivity` atau
  sejenisnya.
- `src/Backend/Sync/` — mirror persis nama-nama di Schemas, sync jobs untuk
  tiap tabel. Tidak ada modul sync tambahan yang tersembunyi.
- `src/Statistics/` — modul discovery buat `DigitalStatistic` links
  (statistik makro/monthly seperti top gainer, trading investor domestik/
  asing), tidak ada yang granularitas broker+saham.
- Tidak ada endpoint `GetBrokerSummaryChart` atau `StockData/GetBrokerSummary`
  direferensikan di mana pun dalam source ini (dua endpoint ini murni dugaan
  dari nama pola URL, bukan dari source yang terverifikasi ada).

Referensi: https://github.com/NeaByteLab/IDX-API, commit
`910b8db70893b93920a1bba331d00a1a245907c6`.

## Kesimpulan

Broker summary **per-saham** (broker X net-buy saham Y sekian lot) **TIDAK
BISA** didapat dari endpoint publik IDX yang diketahui saat ini:

- Live fetch tidak bisa memverifikasi ulang secara langsung karena IP
  environment ini diblokir Cloudflare di level domain (bukan bukti bahwa
  endpoint tidak ada, tapi juga tidak bisa membuktikan sebaliknya).
- Bukti sekunder dari wrapper aktif yang sudah dipakai orang lain untuk
  scraping IDX (`NeaByteLab/IDX-API`) — yang mencakup >40 endpoint IDX
  lainnya dan jelas sudah eksplorasi API ini secara ekstensif — hanya
  punya satu endpoint broker summary, dan itu market-wide agregat, sama
  persis dengan yang sudah diketahui sebelumnya di task ini.

**Rekomendasi:** Turunkan status fitur **Bandarmology / Broker Stalker /
Broker Summary** ke **v2-placeholder**, sejajar dengan Scripless/Nominee/Done
Detail. Fitur-fitur ini butuh data broker-per-saham granular yang tidak
tersedia dari sumber publik IDX yang sudah diverifikasi. Opsi untuk v1+:

1. Cari sumber data alternatif (mis. data vendor berbayar, atau broker
   summary historis dari file lampiran resmi IDX kalau ada — belum dicek di
   fase ini).
2. Re-verifikasi live fetch dari environment/IP yang tidak diblokir
   Cloudflare (mis. dari residential IP atau lewat browser asli) untuk
   memastikan tidak ada parameter tersembunyi yang terlewat.
3. Kalau tetap tidak ada, scope Bandarmology diarahkan ke data yang memang
   tersedia publik: `getForeignTradingSummary` (net foreign flow per hari,
   market-wide), `getDomesticTradingSummary`, dan `ForeignBuy`/`ForeignSell`
   per saham dari `GetStockSummary` (field `foreign.buy`/`foreign.sell` per
   stock code, ini granular per-saham dan sudah terverifikasi struktur field-
   nya lewat source `NeaByteLab/IDX-API`) — bukan broker-level, tapi
   investor-type-level, granular per-saham.

## Action item berikutnya

Sebelum lanjut fitur Bandarmology, perlu keputusan eksplisit dari product
owner: terima rekomendasi v2-placeholder di atas, atau alokasikan waktu untuk
re-verifikasi dari network lain / cari data vendor alternatif.
