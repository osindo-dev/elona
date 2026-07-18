# Fase 0 — Manual Check: Broker Summary Per-Saham dari Browser Kamu

Tujuan: cek apakah endpoint `GetBrokerSummary` beneran gak punya data
per-saham, atau itu cuma karena IP server yang dipakai Claude tadi diblokir
IDX. Ikuti langkah di bawah **dari browser kamu sendiri** (bukan incognito),
laptop/HP biasa, koneksi internet biasa (bukan VPN kantor/data center).

Kalau ada langkah yang gagal atau bingung, stop di situ dan kasih tau — gak
perlu maksa lanjut.

## Langkah 1 — Buka homepage IDX dulu

1. Buka https://www.idx.co.id/ di tab baru, browser normal (Chrome/Firefox/
   Safari biasa, jangan mode incognito/private).
2. Pastikan halaman kebuka normal — ada logo IDX, menu navigasi, dll.
3. **Kalau yang muncul malah halaman putih dengan tulisan "Attention
   Required" atau "Checking your browser" (Cloudflare)** — stop, screenshot,
   kirim ke saya. Itu berarti IP kamu juga kena block, sama kayak
   environment Claude.
4. Kalau halaman normal — lanjut ke Langkah 2.

## Langkah 2 — Cek tanggal hari bursa terakhir

Endpoint di bawah butuh parameter tanggal format `YYYYMMDD`. Pakai hari
bursa (weekday, bukan libur) terakhir sebelum hari ini. Kalau hari ini
Senin, berarti Jumat kemarin. Kalau ragu librunya, buka
https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham
dulu, tanggal yang otomatis kepilih di situ itu tanggal yang valid — pakai
itu.

Ganti `20260717` di semua URL Langkah 3 dengan tanggal itu kalau beda.

## Langkah 3 — Buka 4 URL ini satu-satu, di tab baru

Klik/copy-paste tiap URL ke address bar, satu per satu. Untuk tiap URL:

- Kalau yang muncul teks JSON (kurung kurawal `{...}` atau kurung siku
  `[...]`) — **select all (Ctrl+A / Cmd+A), copy, paste ke saya**, tandai
  ini URL nomor berapa.
- Kalau yang muncul bukan JSON (halaman error, blank, "Attention
  Required") — **screenshot, kirim ke saya**, tandai URL nomor berapa.

URL-nya:

1. `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717`
2. `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717&code=BBCA`
3. `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=10&start=0&date=20260717&stockcode=BBCA`
4. `https://www.idx.co.id/primary/StockData/GetBrokerSummary?stockcode=BBCA&date=20260717`

## Langkah 4 — Cek Network tab pas nyari saham di web IDX

Ini buat nemuin endpoint yang mungkin belum kita tau namanya.

1. Buka https://www.idx.co.id/ (tab baru).
2. Tekan **F12** (atau klik kanan → "Inspect") buat buka DevTools.
3. Klik tab **"Network"** di DevTools.
4. Di kotak search DevTools Network, ketik `broker` — biar nanti gampang
   nyaring hasil (kosongin dulu kalau belum ada apa-apa).
5. Di halaman IDX, cari fitur pencarian saham (biasanya ada kolom search
   atau menu "Ringkasan Saham" / "Statistik" yang bisa input kode saham
   kayak BBCA), lalu ketik/pilih **BBCA** dan submit/enter.
6. Balik ke DevTools tab Network. Lihat daftar request yang muncul.
7. Cari yang ada kata **"broker"** di kolom Name/URL.
8. Kalau ketemu — klik request itu, buka tab **"Headers"**, copy bagian
   **"Request URL"** (URL lengkapnya), kirim ke saya.
9. Kalau gak ketemu apa-apa yang ada kata "broker" — kasih tau juga, itu
   info penting (berarti web IDX sendiri juga gak manggil endpoint broker
   per-saham).

## Yang perlu kamu kirim balik ke saya

- Hasil Langkah 1: normal atau kena Cloudflare block (+ screenshot kalau
  block).
- Hasil Langkah 3: JSON mentah (atau screenshot) untuk tiap 1 dari 4 URL,
  ditandai nomornya.
- Hasil Langkah 4: URL request yang ketemu (kalau ada), atau konfirmasi
  gak ada request "broker" sama sekali.
