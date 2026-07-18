# Fase 2, Task 1 — Bisakah Cloudflare Workers Production Akses idx.co.id?

**Jawaban: TIDAK BISA.** Cloudflare Workers diblokir IDX sama persis
kayak environment sandbox di Fase 0 (403, Cloudflare JS challenge "Just
a moment..."). Ini bukan masalah IP data center sandbox — masalahnya di
level jaringan Cloudflare Workers itu sendiri.

## Setup test

Worker minimal, satu fungsi: `fetch("https://www.idx.co.id/")`, log
status code + deteksi apakah body-nya halaman challenge Cloudflare.
Tidak ada logic lain (bukan cron, trigger manual via curl ke URL Worker).

```js
export default {
  async fetch() {
    const res = await fetch("https://www.idx.co.id/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/json,*/*",
      },
    });
    const text = await res.text();
    return new Response(JSON.stringify({
      status: res.status,
      isCloudflareChallenge: text.includes("Just a moment") || text.includes("Attention Required"),
      bodySnippet: text.slice(0, 300),
    }));
  },
};
```

## Cara deploy

Deploy pakai `wrangler deploy --temporary` — ini bikin akun preview
Cloudflare sementara (auto-expired ~60 menit, bukan akun asli Kris),
TAPI Worker-nya tetap jalan di infrastruktur Workers Cloudflare yang
sungguhan (IP range/jaringan yang sama dipakai semua Worker, termasuk
Worker production di akun berbayar manapun). Dipilih cara ini karena:
wrangler CLI di environment ini belum ter-`login` ke akun Cloudflare
Kris (`wrangler whoami` → "You are not authenticated"), dan `wrangler
login` butuh flow OAuth browser interaktif yang gak bisa dijalankan di
sandbox ini. Untuk pertanyaan spesifik "apakah jaringan Workers
diblokir", akun sementara ini valid secara arsitektur karena Workers
tidak punya IP keluar yang beda per akun — jawabannya berlaku sama buat
Worker "elona" beneran nanti di akun `osindo-dev`.

(Catatan: ada juga Cloudflare MCP integration yang sudah terhubung ke
akun asli Kris — dicek via `workers_list`, ketemu 6 Worker existing:
citaharmoni, survey, catalog, jaringan, osindo, lingering-flower-750b.
Tapi MCP ini cuma bisa READ resource (list/get Worker, D1, R2, KV) —
tidak ada tool buat deploy kode Worker baru. Jadi tetap gak bisa dipakai
buat task ini.)

## Hasil (3x percobaan, worker `elona-fase2-network-test`)

| # | Waktu (UTC) | Status | Cloudflare Challenge? |
| :--- | :--- | :--- | :--- |
| 1 | 2026-07-18T18:55:04Z | 403 | YA ("Just a moment...") |
| 2 | 2026-07-18T18:55:18Z | 403 | YA |
| 3 | 2026-07-18T18:55:21Z | 403 | YA |

Konsisten 3/3 — bukan kegagalan transient/kebetulan.

## Kesimpulan

Cloudflare Workers **TIDAK BISA** dipakai untuk fetch langsung ke
`idx.co.id` — baik dari sandbox (Fase 0) maupun dari jaringan Workers
sungguhan (test ini). IDX kemungkinan besar memblokir seluruh range IP
Cloudflare (bukan cuma IP data center tertentu), yang artinya ini
berlaku untuk SEMUA Worker Cloudflare, bukan spesifik ke environment
Claude. Percobaan Browser Rendering (headless Chrome asli di Workers)
sebelumnya juga sudah dicoba dan tetap diblokir eksplisit (lihat
`docs/fase-2-vendor-validation.md`) — jadi bukan soal "kurang canggih
render JS", IDX memang menolak traffic dari IP Cloudflare.

**Sesuai instruksi task: STOP di sini. Task 2 (ingestion job dari
Worker) dan Task 3 (normalization job) TIDAK dikerjakan** — gak ada
gunanya bangun cron job yang manggil endpoint yang pasti gagal terus.

## Rekomendasi ke Kris

Pipeline ingestion **tidak bisa** pakai arsitektur "Worker cron fetch
langsung ke idx.co.id" yang jadi asumsi awal desain elona. Sudah ada
keputusan terkait di `docs/fase-2-vendor-validation.md` (GOAPI.IO buat
broker summary) — pertanyaan sekarang: apakah Stock Summary juga mau
lewat vendor yang sama, atau opsi lain.

**Opsi A — Ingestion dari luar Cloudflare, push ke D1 via API**
Jalankan job ingestion dari mesin/VPS dengan IP non-Cloudflare (laptop
Kris, VPS biasa, GitHub Actions runner — belum dites juga, bisa jadi
tetap kena kalau IDX blokir semua cloud/datacenter IP secara luas, cuma
residential/ISP biasa yang mungkin lolos). Hasil push ke D1 lewat
Cloudflare REST API (D1 punya HTTP API terpisah dari binding Worker) atau
lewat `wrangler d1 execute` dari mesin itu. Cron dijalankan di luar
Cloudflare (cron OS, GitHub Actions scheduled workflow, dst), Worker
elona cuma jadi consumer/serving layer baca dari D1.

**Opsi B — Pakai vendor data (GOAPI.IO) untuk Stock Summary juga**
Sama seperti keputusan Broker Summary — GOAPI.IO endpoint
`GET /stock/idx/{symbol}` atau `GetStockSummary`-equivalent (perlu dicek
apakah free trial/tier yang sama juga cover stock summary, kemungkinan
besar iya karena satu paket "Stock Market IDX"). Worker Cloudflare fetch
ke `api.goapi.io` (bukan `idx.co.id` langsung) — TIDAK diblokir karena
domainnya beda, arsitektur "Worker cron fetch" jadi bisa dipertahankan
tanpa perlu Opsi A. Ini kemungkinan jalan paling simpel karena udah ada
API key trial yang aktif.

**Rekomendasi teknis:** Opsi B lebih konsisten sama keputusan Broker
Summary yang udah diambil, dan gak perlu infra tambahan (VPS/GitHub
Actions) di luar Cloudflare — satu vendor, satu pola integrasi. Perlu
konfirmasi Kris: apakah GOAPI cover Stock Summary di paket yang sama,
dan keputusan final soal budget vendor (Developer vs Enterprise tier,
lihat estimasi volume di `docs/fase-2-vendor-validation.md`).

**Keputusan arsitektur ini perlu dikonfirmasi Kris sebelum lanjut ke
Fase 2 Task 2/3 (versi revisi).**
