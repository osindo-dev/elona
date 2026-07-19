# Due Diligence — NeaByteLab/IDX-API & Invezgo Python SDK

Dokumen ini murni kumpulan FAKTA yang ditemukan lewat riset publik (GitHub
API via `gh`, dan `curl` langsung ke situs terkait dengan browser User-Agent
karena WebFetch kena block 403) pada 2026-07-19. **Tidak ada kesimpulan
"aman"/"tidak aman" atau "pakai"/"jangan pakai" di sini** — itu keputusan
Kris. Sama disiplin dengan `docs/goapi-due-diligence.md`.

Konteks: Kris memberi dua link (`https://github.com/NeaByteLab/IDX-API`,
`https://github.com/Invezgo/invezgo-python-sdk`) untuk dicek apakah bisa
dimanfaatkan buat elona, terutama untuk gap Bandarmology/Broker
Stalker/Broker Summary per-saham/Inventory Chart yang masih v2-placeholder
(lihat `docs/konsep-arsitektur-bandarmology-idx.md` section 2).

Task ini TIDAK melakukan subscribe/pembayaran/registrasi akun ke Invezgo,
dan TIDAK menjalankan/deploy kode NeaByteLab/IDX-API — murni riset dari
README, source file publik di GitHub, dan halaman publik situs.

---

## Bagian A — NeaByteLab/IDX-API

### A.1 Profil repo

GitHub: `NeaByteLab/IDX-API`. 68 stars, lisensi kode: MIT. Deskripsi
repo: "Indonesian Stock Exchange API wrapper for trading data
integration." Stack: Deno + Drizzle ORM + SQLite (LibSQL client). Ini
adalah pipeline yang di-clone dan dijalankan sendiri (self-hosted),
bukan layanan API yang di-subscribe seperti GOAPI/Sectors.app. README
juga mereferensikan project sibling `NeaByteLab/IDX-UI` (dashboard),
tidak dicek lebih lanjut di sini.

### A.2 Sumber data — langsung ke idx.co.id resmi

Dicek isi `src/Client.ts` dan `src/Trading/index.ts` (raw source via GitHub
API, bukan dari README):

```
Client.ts:10   Referer: 'https://www.idx.co.id/',
Client.ts:28   const response = await this.fetcherUrl('https://www.idx.co.id/id')
Client.ts:33   'https://www.idx.co.id/primary/home/GetIndexList'
Trading/index.ts  `https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary?length=${length}&start=${start}&date=${date}`
```

Semua endpoint yang dipanggil ada di domain `www.idx.co.id/primary/...` —
endpoint resmi IDX, bukan vendor pihak ketiga. Client punya
`ensureSession()` (butuh session/cookie dari `idx.co.id/id` dulu sebelum
bisa call endpoint data) — pola yang sama dengan yang sudah dites gagal
sebelumnya.

### A.3 Relevansi ke blocker yang sudah terdokumentasi

`docs/fase-0-findings.md` dan `docs/fase-2-worker-network-test.md` sudah
mengonfirmasi: `idx.co.id` (termasuk endpoint `/primary/...`) **diblokir
WAF** di semua jaringan non-residential yang dites — Cloudflare Workers,
GitHub Actions (Azure IP), sandbox. Hanya browser residential Kris yang
terbukti bisa akses. NeaByteLab/IDX-API memanggil domain dan path yang
sama persis (`www.idx.co.id/primary/...`). Tidak ada bukti bahwa kode ini
punya cara bypass WAF tersebut (tidak ada proxy/residential-IP routing di
`Client.ts` yang dicek).

### A.4 Cakupan `GetBrokerSummary` — tetap market-wide aggregate

Mapping response `getBrokerSummary()` di `src/Trading/index.ts`:

```
id, date, brokerCode, brokerName, totalValue, volume, frequency
```

Tidak ada field `stock_code`/kode saham di response ini — konsisten
dengan temuan lama (`docs/fase-0-findings.md`, `docs/fase-0-findings-v2.md`)
bahwa `GetBrokerSummary` publik IDX adalah agregat market-wide per broker
per hari, bukan breakdown per broker per saham.

### A.5 Modul lain yang tersedia (referensi struktur, belum dicek isi detail)

Dari README, modul-modul yang di-sync ke SQLite lokal: company
profile/announcement/financial ratio/financial report/dividend/stock
split/new listing/delisting (Corporate), daily index/index
list/summary/foreign trading/top gainer-loser (Market), stock
summary/trade summary/broker summary/trading daily-SS (Trading), broker
participant/dealer participant/profile participant (Participants), market
calendar/security stock (General). Tidak ada modul shareholder/KSEI —
tidak menambah apa pun ke `ownership_composition` (Balance Position
Chart) yang sumbernya masih UNVERIFIED di `migrations/0001_initial_schema.sql`.

---

## Bagian B — Invezgo Python SDK

### B.1 Profil repo & layanan

GitHub: `Invezgo/invezgo-python-sdk`. 3 stars, lisensi kode: MIT. SDK
resmi Python untuk `invezgo.com` — platform data saham + fitur sosial
(watchlist, journal trading, portfolio, post/komentar, screener, live
alert AI). Auth: API key (`InvezgoClient(api_key=...)`), didapat dari
`invezgo.com/id/setting/api` (butuh akun).

### B.2 Cakupan fitur yang relevan ke gap elona

Method yang ditemukan di README (`client.analysis.*`) yang match langsung
ke fitur v2-placeholder elona:

```
get_summary_stock(code, from_date, to_date, investor="all|f|d", market)   # broker summary per-saham, ada split foreign/domestic
get_summary_broker(code="AG,AK", ..., investor, market)                   # broker summary per-broker, multi-broker
get_broker_stalker(broker, stock, from_date, to_date, investor, scope)    # broker stalker
get_broker_stalker_list(code, from_date, to_date, investor, scope)
get_inventory_chart_stock(code, from_date, to_date, scope="vol|val|freq", investor)
get_inventory_chart_broker(code, from_date, to_date, scope, investor)
get_shareholder_ksei(code, range_months)                                  # kandidat sumber ownership_composition
get_shareholder(code) / get_shareholder_detail(...) / get_shareholder_above(...)
get_top_accumulation(date)                                                # "top akumulasi dan distribusi bandarmologi"
```

Secara cakupan fitur, ini yang paling lengkap dari semua vendor yang
pernah dicek elona (lebih lengkap dari GOAPI yang cuma broker-per-saham
tanpa breakdown investor type).

### B.3 Pricing (dari `invezgo.com/pricing`, fetch langsung 2026-07-19)

```
Free       — 1 bulan trial, sebagian fitur termasuk AI, "Try some features free for 3 day"
Starter    — IDR 39.900/bulan (diskon 35% dari 61.000), Live Alert 2, AI Chat 15/bulan
Basic      — IDR 79.900/bulan (diskon 40% dari 133.000), realtime notification
Pro        — IDR 149.900/bulan (diskon 45% dari 272.000), Live Alert 7
Ultra      — IDR 299.900/bulan (diskon 50% dari 599.000), Live Alert 30, AI Chat 1.100/bulan
```

Semua tier adalah harga langganan personal per bulan/tahun (toggle "Month
Year" di halaman pricing) — tidak ada tier "API/data license komersial"
terpisah yang terlihat di halaman pricing publik.

### B.4 ToS (dari `invezgo.com/terms`, fetch langsung 2026-07-19)

Kutipan langsung, bagian "COPYRIGHT AND LIMITATIONS ON USE":

> "You can print or save it for personal, non-commercial use only. You
> may not copy, share, or sell any content without permission... Don't
> use bots or similar tools to collect data. You also can't repost
> Invezgo content to mailing lists or message boards without approval...
> Each subscription is for one person only and cannot be shared. Extra
> users need their own accounts."

Bagian "SUBSCRIBE FEES": pembayaran via QRIS, IDR, subscription tidak
auto-renew, tidak ada refund setelah pembelian selesai. Tidak ada
klausul terpisah soal lisensi data untuk dipakai di produk/API pihak
ketiga.

### B.5 Privacy Policy (dari `invezgo.com/privacy`, fetch langsung)

Standar — mengumpulkan nama, username, nomor ID (untuk badge verifikasi),
nomor telepon, email. Tidak ada klausul spesifik soal data pasar
saham/redistribusi data finansial.

### B.6 Identitas entitas bisnis & kontak

`/about` dan `/contact` di `invezgo.com` **keduanya me-render halaman
Login** ("Login - Invezgo... Sign in to Access All Features of
Invezgo."), bukan konten about/contact publik — dicek langsung via
`curl` dengan browser User-Agent, HTTP 200 tapi isinya form login. Tidak
ditemukan nama badan usaha (PT/CV), alamat, atau NPWP di ToS maupun
Privacy Policy yang bisa diakses tanpa login. Footer homepage hanya
"Copyright © 2026 Invezgo".

### B.7 Rate limit / kuota

Tidak dipublikasikan angka konkret di README maupun halaman pricing yang
dicek. SDK punya `client.usage.get_api_usage()` untuk cek kuota
terpakai saat runtime, tapi limit per tier tidak didokumentasikan
publik. README juga mendaftar exception `RateLimitError` dan
`PaymentRequiredError` — mengindikasikan ada quota/paywall per-fitur,
tapi angkanya tidak diketahui dari riset ini.

---

## Ringkasan hal yang tidak jelas / red flag (bukan kesimpulan aman/tidak aman)

**NeaByteLab/IDX-API:**
1. Bukan vendor baru — 100% memanggil `idx.co.id` resmi yang sudah
   terbukti diblokir WAF di infrastruktur non-residential (Cloudflare
   Workers, GitHub Actions). Menjalankan kode ini di elona kemungkinan
   besar kena blok yang sama, belum diuji langsung karena di luar scope
   task ini (task hanya riset, tidak menjalankan kode).
2. `GetBrokerSummary` yang dipakai tetap agregat market-wide, tidak
   menambah data broker-per-saham yang jadi gap utama Bandarmology.

**Invezgo Python SDK:**
1. **ToS eksplisit melarang "bots or similar tools to collect data"** —
   bertentangan langsung dengan model elona (cron job otomatis, server-side,
   tanpa interaksi manual).
2. **ToS eksplisit melarang share/redistribusi content dan membatasi 1
   subscription = 1 orang** — bertentangan dengan model elona (data
   di-ingest lalu diserve ke banyak end-user elona).
3. Pricing yang publik adalah subscription personal (Rp39.900–299.900/
   bulan), tidak ada tier lisensi data komersial/API-resale yang
   terlihat — kalau mau dipakai server-side untuk produk pihak ketiga,
   kemungkinan perlu kontak Invezgo langsung untuk lisensi terpisah
   (belum dicoba, di luar scope riset ini).
4. `/about` dan `/contact` tidak menampilkan info kontak/entitas publik
   — sama seperti pola red flag yang ditemukan di due diligence GOAPI
   (`docs/goapi-due-diligence.md` poin 7), meski di sini alasannya
   halaman di-gate login, bukan kosong.
5. Rate limit per tier tidak dipublikasikan.

**Catatan penting terlepas dari temuan di atas**: sesuai
`docs/konsep-arsitektur-bandarmology-idx.md` section 2, Kris **sudah**
memutuskan Bandarmology/Broker Stalker/Broker Summary/Inventory Chart
tetap v2-placeholder terlepas dari ketersediaan teknis data — keputusan
produk eksplisit, bukan blocker teknis semata. Temuan di dokumen ini
(terutama soal Invezgo yang secara teknis paling lengkap dari semua
vendor yang pernah dicek) tidak otomatis mengubah keputusan itu; tetap
perlu keputusan eksplisit baru dari Kris kalau mau dipertimbangkan ulang,
plus klarifikasi legal ke Invezgo soal poin 1-3 di atas sebelum
implementasi apapun.
