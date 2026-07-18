# Fase 0 Findings v2 — Re-verifikasi Cookie-Priming Flow

Percobaan kedua, dijalankan 2026-07-18T16:25:25.282Z, tanggal bursa dipakai: 20260717. Script ini TIDAK mengubah kesimpulan di `docs/fase-0-findings.md` — dokumen itu tetap berlaku sebagai catatan temuan sebelumnya. File ini murni laporan percobaan tambahan.

## Step 1 — Priming cookie via GET https://www.idx.co.id/

Status: 403
Cloudflare challenge terdeteksi: YA
Cookie diterima dari response: YA (tapi ini cookie challenge Cloudflare seperti `__cf_bm`, bukan session IDX asli — dikirim balik ke Cloudflare, bukan bukti sudah lolos block)

Body snippet (500 char pertama):
```html
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>Attention Required! | Cloudflare</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" 
```

**Kesimpulan step 1: block terjadi di edge/WAF sebelum sampai origin** — sama persis dengan temuan `fase-0-findings.md` sebelumnya. Cookie yang didapat (kalau ada) adalah cookie challenge Cloudflare, bukan session IDX asli, karena request tidak pernah sampai ke aplikasi IDX. Step 2 tetap dicoba dengan cookie itu untuk kelengkapan bukti, tapi diperkirakan tetap gagal.

## Step 2 — Fetch endpoint broker summary (dengan cookie kalau ada)

| Endpoint | Status | Cloudflare challenge? |
| :--- | :--- | :--- |
| base (no stock param) | 403 | YA |
| code=BBCA | 403 | YA |
| stockcode=BBCA | 403 | YA |
| StockData/GetBrokerSummary | 403 | YA |

### base (no stock param)

URL: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717`

TIDAK TERVERIFIKASI — response adalah halaman Cloudflare challenge, bukan data API.

### code=BBCA

URL: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717&code=BBCA`

TIDAK TERVERIFIKASI — response adalah halaman Cloudflare challenge, bukan data API.

### stockcode=BBCA

URL: `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717&stockcode=BBCA`

TIDAK TERVERIFIKASI — response adalah halaman Cloudflare challenge, bukan data API.

### StockData/GetBrokerSummary

URL: `https://www.idx.co.id/primary/StockData/GetBrokerSummary?stockcode=BBCA&date=20260717`

TIDAK TERVERIFIKASI — response adalah halaman Cloudflare challenge, bukan data API.

## Kesimpulan percobaan v2

Semua endpoint tetap TIDAK TERVERIFIKASI dari environment ini, termasuk dengan flow cookie-priming dan header lengkap ala browser. Ini **memperkuat** (bukan membantah) temuan `fase-0-findings.md`: masalahnya di level IP/WAF Cloudflare untuk environment ini, bukan indikasi endpoint tidak ada atau parameter salah. Root cause kemungkinan IP data center kena filter — bukan sesuatu yang bisa diperbaiki dari sisi script/header.

**Keputusan final Bandarmology (v1 vs v2-placeholder) tetap menunggu hasil manual check dari user sesuai `docs/fase-0-manual-check.md`** — script ini cuma percobaan tambahan dari sisi server, bukan pengganti verifikasi dari browser session asli user.
