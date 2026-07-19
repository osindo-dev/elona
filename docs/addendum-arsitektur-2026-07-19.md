# Addendum — Reklasifikasi Arsitektur Ingestion (2026-07-19)

> Menggantikan bagian §4, §6 (tabel status fitur), dan §7 Fase 0-2 dari dokumen master `konsep-arsitektur-bandarmology-idx.md`. Dokumen asli TIDAK diubah (read-only) — addendum ini jadi rujukan aktif dan sebaiknya digabung manual ke dokumen master oleh Kris.

---

## A. Alasan Perubahan

Eksekusi Fase 0-2 membuktikan asumsi arsitektur di §4 dan §6 dokumen master tidak berlaku:

- **Direct scraping idx.co.id dari semua platform cloud (Cloudflare Workers, Browser Rendering, GitHub Actions, Azure) diblokir WAF.** Hanya browser residential milik Kris yang bisa akses. Ini membatalkan §4 ("Cloudflare Workers Cron scraper terjadwal ke idx.co.id") dan §7 Fase 0 action item ("clone IDX-API, jalankan `syncBrokerSummary()`") sebagai jalur utama ingestion.
- Arsitektur ingestion final: **hybrid vendor pihak ketiga**, bukan self-hosted scraper.

## B. Arsitektur Ingestion Final

| Layer | Sumber | Menggantikan |
|---|---|---|
| Stock Summary (OHLC + volume) | **GOAPI.IO** | `syncStockSummary()`/`syncTradeSummary()` via IDX-API langsung |
| Net Foreign Inflow | **Sectors.app** | `syncForeignTrading()` via IDX-API langsung |

Field yang **hilang** dibanding rencana awal:
- **Frequency** (Market Summary) — tidak tersedia di vendor manapun
- **Bid/offer order book** (Balance Position Chart) — tidak tersedia di vendor manapun

## C. Reklasifikasi Status Fitur (menggantikan tabel §6 baris 201-211)

| Fitur | Status baru | Catatan |
|---|---|---|
| Market Summary | **v1, tapi field frequency hilang** | Downgrade dari "Confirmed" penuh — cek apakah frequency esensial atau bisa di-drop dari UI v1 |
| Balance Position Chart | **v2-placeholder** (downgrade) | Butuh bid/offer order book, tidak tersedia di GOAPI/Sectors.app |
| Top Accumulation Foreign | Perlu verifikasi ulang | Bergantung granularitas `net_foreign_inflow` Sectors.app — belum tentu setara `syncForeignTrading()` |
| Bandarmology / Broker Stalker / Broker Summary (per-saham) | **v2-placeholder (tetap)** | GOAPI punya datanya, tapi due diligence vendor gagal (lihat §D) — keputusan produk, bukan keterbatasan data |
| Potensi Buyback Institusi | **v2-placeholder (tetap)** | Data cuma metadata pengumuman + PDF tidak terstruktur — dikonfirmasi live, bukan lagi "perlu verifikasi" |
| Rotation Chart, Sector Activity | **Belum diverifikasi ulang** | Rencana lama pakai bid/offer per sektor dari IDX-UI companion — perlu cek apakah Sectors.app punya padanan |
| Seasonality Table | **Belum diverifikasi ulang** | Perlu cek historical depth GOAPI |

## D. Due Diligence Vendor — Status

**GOAPI.IO:** Selesai, hasil **negatif** untuk data broker-level. Red flags: tidak ada indemnifikasi, contact page kosong, privacy policy 404, ToS merujuk domain berbeda (goapi.id vs goapi.io), tidak ada badan usaha resmi terdaftar. Keputusan Kris: risiko tidak sepadan meski data tersedia secara teknis.

**Sectors.app:** **Belum selesai.** Baru dicek coverage teknis (field apa yang tersedia). DD legal (ToS, badan usaha, SLA, data retention policy) **belum dilakukan.**

⚠️ **Implikasi untuk Fase 3:** Membangun compute layer di atas Sectors.app sebelum DD legal selesai menciptakan risiko rework — kalau DD nanti gagal seperti GOAPI, seluruh net_foreign_inflow pipeline harus diganti vendor.

## E. Field-Level Schema — BELUM DIKUNCI

Dokumen ini **tidak** memuat kontrak skema konkret (nama field, tipe data, frekuensi update, format response JSON) untuk GOAPI Stock Summary maupun Sectors.app net_foreign_inflow. Ini adalah prasyarat untuk desain rolling window aggregation di Fase 3 — lihat prompt Fase 3 bagian Langkah 1.

---
*Ditulis berdasarkan ringkasan status kerja per 2026-07-19. Belum divalidasi ulang terhadap kode/output Claude Code yang sebenarnya — Kris perlu cross-check sebelum menggabung ke dokumen master.*
