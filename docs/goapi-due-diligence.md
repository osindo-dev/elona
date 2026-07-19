# Due Diligence — GOAPI.IO

Dokumen ini murni kumpulan FAKTA yang ditemukan lewat riset publik
(web search, WebFetch, dan browser Kris untuk halaman yang butuh render
penuh) pada 2026-07-19, plus sumbernya masing-masing. **Tidak ada
kesimpulan "aman"/"tidak aman" di sini** — itu keputusan Kris. Konteks:
lihat `docs/fase-2-vendor-validation.md` untuk validasi teknis endpoint
`broker_summary` yang sudah dilakukan sebelumnya.

Task ini TIDAK melakukan subscribe/pembayaran ke GOAPI — murni riset.

---

## 1. Sumber data

**Disclosure resmi yang ditemukan** — di halaman Swagger
(https://goapi.io/swagger/), di bawah header kategori "Data Saham IDX"
(kategori ini mencakup SEMUA endpoint termasuk `broker_summary`):

> "API data saham indonesia memiliki delay harga antara 3-10 menit.
> sumber: YFinance + GoogleFinance + MSN Money + MarketWatch (YTTA)"

**Ketidakjelasan**: disclosure ini ditulis sebagai header umum untuk
seluruh kategori "Data Saham IDX", yang di halaman yang sama mencakup
endpoint harga (`/prices`, `/historical`, dst) MAUPUN endpoint
`/{symbol}/broker_summary`. Tidak ada disclosure terpisah khusus untuk
`broker_summary`. Sumber yang disebut (YFinance/GoogleFinance/MSN
Money/MarketWatch) secara umum dikenal sebagai agregator harga saham,
bukan penyedia data breakdown broker per-transaksi — tapi ini
observasi, bukan konfirmasi dari GOAPI sendiri. GOAPI tidak menyebutkan
secara eksplisit di manapun (ToS, halaman docs, swagger, halaman
marketing) dari mana data `broker_summary` spesifik berasal.

**ToS** (https://goapi.io/terms/) — sama sekali TIDAK membahas sumber
data atau lisensi data feed apapun (termasuk IDX).

**Halaman docs API** (https://goapi.io/docs/#/docs/api-market-data-idx)
— berisi daftar endpoint dan contoh request/response, tidak ada
penjelasan sumber data di halaman ini.

**Halaman marketing** (https://goapi.io/api-data-saham-indonesia/) —
tidak menyebut sumber data sama sekali, hanya klaim umum "snapshot
real-time" dan "pusat data pasar modal Indonesia".

## 2. Hak redistribusi

Satu-satunya klausul terkait di ToS:

> "You agree not to sell, duplicate, or exploit GOAPI's API services
> without written permission from GOAPI."

**Ketidakjelasan**: klausul ini melarang "sell, duplicate, or exploit"
API services tanpa izin tertulis, tapi tidak mendefinisikan apakah
menampilkan ulang data (yang diambil lewat API) di produk sendiri ke
end user — termasuk kalau produk itu nanti komersial — termasuk
kategori "exploit" atau tidak. Tidak ada klausul terpisah yang secara
eksplisit mengizinkan ATAU melarang redistribusi/tampilan data ke end
user produk turunan. Tidak ditemukan halaman ToS/lisensi data terpisah
selain yang di atas.

## 3. Disclaimer/liability

Ditemukan eksplisit di ToS:

> "GOAPI will strive to maintain the functionality and error-free
> operation of its API services but does not guarantee that the API
> services will always be available or free from errors."

> "You agree that the use of GOAPI's API services is at your own risk.
> GOAPI is not responsible for any losses incurred from the use of
> these API services, including losses caused by errors, delays, or
> unavailability of the API services."

Ini klausul disclaimer penuh — GOAPI melepas tanggung jawab atas
kerugian dari data salah, delay, atau layanan down.

## 4. Indemnifikasi (masalah hukum dari IDX)

**TIDAK DITEMUKAN.** ToS tidak memuat klausul indemnifikasi ke arah
manapun — tidak ada pasal soal apa yang terjadi kalau GOAPI kena
masalah hukum dari IDX (atau pihak ketiga manapun) terkait data yang
mereka distribusikan, dan tidak ada kewajiban pelanggan untuk
mengindemnifikasi GOAPI juga. Topik ini sama sekali tidak dibahas di
ToS yang tersedia publik.

## 5. Kejanggalan: ToS merujuk domain yang berbeda

Kalimat pembuka ToS (https://goapi.io/terms/), dikutip apa adanya:

> "The use of API services provided by GOAPI on the domain goapi.id and
> app.goapi.id is governed by these Terms of Service (ToS)."

Domain yang disebut adalah **`goapi.id` dan `app.goapi.id`** — BUKAN
`goapi.io` / `app.goapi.io` yang dipakai Kris untuk validasi di
`docs/fase-2-vendor-validation.md` (base URL API yang dites:
`https://api.goapi.io`, login: `app.goapi.io`). Definisi API di ToS
juga merujuk domain yang sama (goapi.id/app.goapi.id).

**Ketidakjelasan**: tidak diketahui apakah ini (a) sisa teks dari
rebrand `.id` → `.io` yang tidak diupdate, (b) `goapi.io` dan `goapi.id`
adalah entitas/perusahaan yang sama beroperasi di dua domain, atau (c)
kesalahan template murni. Situs `goapi.id` (https://goapi.id/) tidak
bisa diverifikasi langsung — WebFetch dapat HTTP 403 (block automated
fetch), belum dicek via browser Kris.

## 6. Halaman Privacy Policy — link mati (404)

Halaman login (`app.goapi.io/login`) mencantumkan teks "You acknowledge
that you read, and agree to our Terms of Service and our Privacy
Policy." Link "Privacy Policy" mengarah ke `https://goapi.io/privacy`
— saat diakses (2026-07-19, via browser), halaman ini **404 Not
Found** ("The page can't be found. It looks like nothing was found at
this location."). Tidak ada Privacy Policy yang bisa ditemukan di
domain `goapi.io` manapun (dicoba juga `/privacy/` dengan trailing
slash — sama-sama 404).

## 7. Identitas entitas bisnis

Dicek di semua tempat berikut, **tidak satupun mencantumkan nama badan
usaha resmi (PT/CV), alamat fisik, atau NPWP**:

- Homepage (https://goapi.io/) — footer hanya "2025 - GOAPI.IO", tidak
  ada link "About"/"Company" di navigasi (menu hanya: Blog, API Hub,
  Docs, Login).
- Halaman Contact (https://goapi.io/contact/) — dicek via browser
  (render penuh, bukan cuma WebFetch), halaman ini **kosong total**:
  tidak ada email, nomor telepon, alamat, maupun form kontak. Hanya
  menampilkan ulang tagline homepage dan copyright footer.
- ToS (https://goapi.io/terms/) — entitas hanya disebut sebagai "GOAPI
  Service Provider (hereinafter referred to as 'GOAPI')", tanpa nama
  badan hukum.
- GitHub organisasi (https://github.com/goapi-io) — deskripsi generik
  ("GOAPI adalah organisasi yang menyediakan SDK..."), lokasi hanya
  "Indonesia" (tidak spesifik kota/alamat), email `hi@goapi.io`, 5
  follower. 5 repo SDK (PHP, JS, Elixir, Go, Python) — `php-sdk` 3
  stars/1 fork, `ex-sdk` 1 fork, sisanya tanpa star tercatat.
- Email kontak yang ditemukan (dari hasil web search, bukan dari
  halaman contact yang kosong): `hi@goapi.io`.
- Instagram: akun `@goapi.io` ditemukan lewat web search
  (belum dicek isi/aktivitas kontennya).

**Catatan penting soal nama domain mirip** (supaya gak ketuker):
- `goapi.io` — ini yang dipakai Kris, subjek due diligence ini.
- `goapi.ai` — perusahaan BEDA TOTAL, layanan AI image/music generation
  (Midjourney API, Suno API, Flux API). Tidak ada hubungan yang
  terverifikasi dengan goapi.io.
- `goapi.id` — domain terpisah, disebut di ToS goapi.io (lihat poin 5
  di atas), tapi belum bisa diverifikasi isinya (block automated
  fetch). Muncul di hasil ScamAdviser search sebagai entri terpisah
  ("goapi.id Reviews... very likely not a scam but legit and reliable"
  menurut algoritma ScamAdviser) — tapi penilaian ScamAdviser bersifat
  otomatis berbasis sinyal domain/hosting, bukan audit manual, jadi
  tidak dijadikan bukti kuat di sini.

## 8. Review/reputasi independen

**Tidak ditemukan** review independen (Trustpilot, forum developer
Indonesia, thread Reddit, Twitter/X) yang secara spesifik membahas
pengalaman memakai `goapi.io`. Web search untuk kombinasi kata kunci
"goapi.io" + review/complaint/scam/down tidak mengembalikan hasil yang
relevan — hasil yang muncul kebanyakan soal layanan lain yang mirip
namanya (twitterapi.io) atau soal ScamAdviser sendiri. Tidak ada thread
GitHub Issues yang ditemukan mengeluhkan (atau memuji) layanan
`goapi.io` — repo SDK mereka juga tidak menunjukkan aktivitas issue
yang tercatat di hasil pencarian.

---

## Ringkasan hal yang tidak jelas / red flag (bukan kesimpulan aman/tidak aman)

Sesuai instruksi task, bagian ini secara eksplisit menandai temuan yang
menimbulkan keraguan, supaya dipertimbangkan serius oleh Kris — bukan
rekomendasi final:

1. **Halaman Contact benar-benar kosong** — tidak ada cara menghubungi
   GOAPI selain email `hi@goapi.io` yang ditemukan lewat web search
   (bukan dari situs resmi mereka sendiri).
2. **Privacy Policy yang direferensikan di halaman login — 404, tidak
   ada.** Halaman login secara eksplisit meminta persetujuan pada
   dokumen yang tidak eksis.
3. **Tidak ada nama badan usaha resmi (PT/CV) di manapun** yang bisa
   ditemukan — ToS, homepage, contact, GitHub, web search.
4. **ToS merujuk domain berbeda** (`goapi.id`/`app.goapi.id`) dari yang
   dipakai Kris (`goapi.io`/`app.goapi.io`) — tidak jelas ToS ini
   benar-benar mengikat untuk layanan yang dipakai atau residu
   kesalahan template.
5. **Tidak ada klausul indemnifikasi sama sekali** — kalau GOAPI kena
   masalah hukum soal sumber data mereka, tidak ada kejelasan
   kontraktual soal dampaknya ke pelanggan.
6. **Sumber data `broker_summary` spesifik tidak pernah dikonfirmasi**
   — disclosure yang ada (YFinance/GoogleFinance/MSN Money/MarketWatch)
   ditulis untuk kategori umum "Data Saham IDX", bukan dikonfirmasi
   khusus untuk endpoint broker per-saham.
7. **Tidak ada review independen** yang bisa memvalidasi rekam jejak
   atau kredibilitas GOAPI di luar situs mereka sendiri.

Poin 1-5 adalah temuan yang relatif jarang di layanan API komersial
yang sudah establish — biasanya jadi sinyal untuk diperiksa lebih lanjut
sebelum commit jangka panjang (mis. subscribe tahunan / jadi dependency
kritis produksi), tapi keputusan tetap di tangan Kris.
