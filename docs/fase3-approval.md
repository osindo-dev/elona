# Approval Fase 3 — Rolling Window Aggregation (Compute Layer)

- **Tanggal**: 2026-07-19
- **Disetujui oleh**: Kris
- **Scope yang disetujui**: Fase 3 — rolling window aggregation (compute
  layer) SAJA.

## Eksplisit TIDAK termasuk

- Serving/endpoint layer.
- Fase 4 secara umum.
- Reaktivasi route `top-accumulation-foreign` atau `top-accumulation` di
  `src/serving/router.ts` (masih ter-comment-out / disabled, lihat
  `docs/investigasi-scope-creep-2026-07-19.md`).

## Prasyarat yang masih terbuka (dicatat, bukan diblokir)

- Legal due diligence (DD) Sectors.app belum selesai.
- Field `foreign_net` masih berstatus zero-live-verification (per
  `docs/schema-vendor-goapi-sectors.md`).
- Approval Fase 3 ini **TIDAK berarti** field `foreign_net` boleh dipakai
  di compute layer seolah-olah valid tanpa penanganan status
  unverified-nya secara eksplisit di kode (misal placeholder/flag
  eksplisit), bukan pemakaian langsung tanpa disclosure.

## Referensi

- `docs/investigasi-scope-creep-2026-07-19.md`
