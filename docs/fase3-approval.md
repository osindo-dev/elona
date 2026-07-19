# Approval Fase 3 — Rolling Window Aggregation (Compute Layer)

- **Tanggal**: 2026-07-19
- **Disetujui oleh**: Kris
- **Scope yang disetujui**: Fase 3 — rolling window aggregation (compute
  layer) SAJA.

## Eksplisit TIDAK termasuk

- Serving/endpoint layer di luar yang diapprove eksplisit di bagian
  "Approval Fase 4" di bawah.
- Fase 4 secara umum, di luar scope yang diapprove eksplisit di bagian
  "Approval Fase 4" di bawah.

## Koreksi (2026-07-19, ditulis ulang saat approval Fase 4 di bawah)

Versi awal dokumen ini menyatakan route `top-accumulation-foreign` /
`top-accumulation` di `src/serving/router.ts` "masih ter-comment-out /
disabled". Itu salah. Dicek ulang lewat `git log --all --oneline --
src/serving/router.ts` dan `git show <hash>:src/serving/router.ts`: route
ini aktif sejak commit yang membuatnya (`9390d80`, "feat: Fase 4 serving
layer") dan tidak pernah di-comment-out atau dinonaktifkan di commit
manapun pada branch ini. Premis itu tidak pernah benar secara historis —
dicatat di sini supaya tidak dianggap "koreksi status yang berubah",
melainkan koreksi fakta yang dari awal salah.

## Prasyarat yang masih terbuka (dicatat, bukan diblokir)

- Legal due diligence (DD) Sectors.app belum selesai.
- Field `foreign_net` masih berstatus zero-live-verification (per
  `docs/schema-vendor-goapi-sectors.md`).
- Approval Fase 3 ini **TIDAK berarti** field `foreign_net` boleh dipakai
  di compute layer seolah-olah valid tanpa penanganan status
  unverified-nya secara eksplisit di kode (misal placeholder/flag
  eksplisit), bukan pemakaian langsung tanpa disclosure.

## Catatan verifikasi (Fase 3)

Approval Fase 3 di atas dicatat berdasarkan konfirmasi Kris lewat sesi
chat Claude (claude.ai), BUKAN lewat GitHub PR review atau kanal
independen lain. Guard otomatis sempat menolak commit ini karena
satu-satunya bukti approval adalah prompt chat itu sendiri (self-attested,
tanpa verifikasi independen) — dilanjutkan atas override eksplisit dari
Kris di sesi yang sama. Dicatat di sini agar transparan, bukan disamakan
dengan approval formal terverifikasi.

---

## Approval Fase 4 — Reaktivasi Serving Layer (`top-accumulation-foreign`)

- **Tanggal**: 2026-07-19
- **Disetujui oleh**: Kris
- **Scope yang disetujui**: reaktivasi route
  `/api/dashboard/top-accumulation-foreign` dan
  `/api/dashboard/top-accumulation` di `src/serving/router.ts`, yang
  menyajikan field `foreign_net` bersumber Sectors.app.

### Syarat approval (sama seperti Fase 3, wajib tetap berlaku)

- Field `foreign_net` masih berstatus zero-live-verification, DD legal
  Sectors.app belum kelar (lihat `docs/schema-vendor-goapi-sectors.md`).
- Approval ini **TIDAK berarti** field `foreign_net` boleh disajikan
  seolah-olah valid tanpa disclosure eksplisit. Response WAJIB tetap
  membawa flag unverified eksplisit selama DD belum kelar:
  - `data_notes` di level top-level response object.
  - `foreign_net_verification` per-item di dalam setiap elemen array
    `data` (bukan cuma sekali di top-level).
  (Diverifikasi ada di kode uncommitted per audit read-only 2026-07-19,
  lihat `src/serving/handlers/top-accumulation-foreign.ts`.)
- Kalau flag unverified ini dihapus atau di-downgrade di masa depan
  sebelum DD Sectors.app kelar, approval Fase 4 ini otomatis tidak
  berlaku lagi untuk perubahan tersebut — perlu approval baru.

### Catatan verifikasi (Fase 4)

Approval ini, sama seperti Fase 3 di atas, dicatat berdasarkan konfirmasi
Kris lewat sesi chat Claude (claude.ai), bukan lewat GitHub PR review atau
kanal independen lain. Self-attested, dicatat agar transparan.

## Referensi

- `docs/investigasi-scope-creep-2026-07-19.md`
- `src/serving/handlers/top-accumulation-foreign.ts`
