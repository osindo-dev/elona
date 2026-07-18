# Buyback Verification — Potensi Buyback Institusi

Task: cek apakah `syncCompanyAnnouncement()` (dan endpoint yang
dipakainya) mengembalikan data buyback **terstruktur** (jumlah saham,
periode, harga) atau cuma link ke PDF pengumuman.

## Kesimpulan

**TIDAK TERSTRUKTUR.** Data cuma metadata pengumuman (judul, tipe,
subjek/perihal) + daftar link PDF attachment. Tidak ada field numerik
apapun (jumlah saham, harga, periode buyback) di struktur data yang
dikembalikan endpoint ini. **Potensi Buyback Institusi tetap di
v2-placeholder** — tidak ditambahkan tabel `company_announcement` ke
migration Fase 1.

## Bukti

### 1. Source code `NeaByteLab/IDX-API` (bukti utama, konklusif)

Method: `company.getAnnouncements(companyCode, pageSize, indexFrom, dateFrom, dateTo, language)`
— dipakai oleh `syncCompanyAnnouncement()`.

Endpoint yang dihit: `GET /primary/ListedCompany/GetAnnouncement?kodeEmiten=...&indexFrom=...&pageSize=...&dateFrom=...&dateTo=...&lang=...`
(lihat `src/Company/index.ts`).

Raw field dari response IDX yang di-map (semua raw field Bahasa
Indonesia dari `rawResponse.Replies[].pengumuman`):

| Raw field IDX | Field yang di-map | Tipe |
| :--- | :--- | :--- |
| `Id2` | `id` | string |
| `NoPengumuman` | `number` | string |
| `TglPengumuman` | `date` | string (tanggal) |
| `JudulPengumuman` | `title` | string (free text) |
| `JenisPengumuman` | `type` | string (kategori, tapi free-form) |
| `Kode_Emiten` | `companyCode` | string |
| `CreatedDate` | `createdDate` | string |
| `Form_Id` | `formId` | string |
| `PerihalPengumuman` | `subject` | string (free text) |
| `EfekEmiten_Saham` / `EfekEmiten_Obligasi` | `isStock` / `isBond` | boolean |

Plus `attachments[]` per pengumuman, raw field `PDFFilename` /
`FullSavePath` / `OriginalFilename` / `IsAttachment` — ini murni metadata
file (nama file, URL PDF), bukan data terstruktur.

**Tidak ada field** seperti `sharesAmount`, `buybackPeriodStart/End`,
`price`, `budgetAllocation`, atau sejenisnya di struktur ini maupun di
schema DB proyek reference (`src/Backend/Schemas/CompanyAnnouncement.ts`
— kolom: `id, number, date, title, type, company_code, created_date,
form_id, subject, is_stock, is_bond, attachments`).

Sebagai perbandingan: event korporasi LAIN yang memang terstruktur di
proyek yang sama (`DividendAnnouncement`, `StockSplit`, `RightOffering`)
semuanya punya field numerik eksplisit (`cashDividend`, `ratio`,
`exercisePrice`, dst) dari endpoint `DigitalStatistic/GetApiDataPaginated`
yang berbeda. Buyback TIDAK punya endpoint sejenis itu — tidak
direferensikan di manapun di source `NeaByteLab/IDX-API` (40+ endpoint
IDX ter-cover, termasuk seluruh modul `DigitalStatistic`). Ini pola yang
konsisten: kalau IDX punya data buyback terstruktur secara publik, proyek
reference ini kemungkinan besar sudah meng-cover-nya juga (mengingat
cakupannya yang luas ke event-event serupa).

### 2. Live check (percobaan, hasil sama seperti Fase 0)

Dicoba fetch langsung:
```
GET https://www.idx.co.id/primary/ListedCompany/GetAnnouncement?kodeEmiten=&indexFrom=0&pageSize=20&dateFrom=20260701&dateTo=20260718&lang=id
```
Hasil: **403** — halaman Cloudflare "Attention Required", sama persis
polanya dengan blocking yang sudah didokumentasikan di
`docs/fase-0-findings.md` dan `docs/fase-0-findings-v2.md`. Environment
ini masih diblokir Cloudflare di level edge untuk seluruh domain
`idx.co.id`, jadi ini TIDAK bisa dipakai sebagai bukti tambahan (bukan
konfirmasi maupun bantahan) — cuma konsisten dengan block yang sudah
diketahui.

Live check ini tidak krusial di sini karena bukti dari source code
(bagian 1) sudah cukup konklusif: strukturnya memang gak punya field
numerik buyback sama sekali, ini bukan soal "belum ketemu parameter yang
benar" seperti kasus broker summary — di sini strukturnya sendiri sudah
jelas cuma metadata pengumuman + PDF.

### Opsional — manual check tambahan (kalau mau dobel pastiin)

Kalau Kris mau verifikasi manual tambahan (gak wajib, kesimpulan di atas
sudah cukup kuat): buka
`https://www.idx.co.id/primary/ListedCompany/GetAnnouncement?kodeEmiten=&indexFrom=0&pageSize=20&dateFrom=20260701&dateTo=20260718&lang=id`
langsung di browser biasa (sama caranya kayak
`docs/fase-0-manual-check.md`), lihat apakah field JSON yang balik ada
angka jumlah saham/harga/periode buyback di dalamnya. Kemungkinan besar
hasilnya cuma konfirmasi: field yang ada cuma judul/perihal/link PDF.

## Dampak ke schema & scope

- **Tidak ada tabel `company_announcement`** di
  `migrations/0001_initial_schema.sql`.
- **Potensi Buyback Institusi tetap v2-placeholder** — kalau nanti mau
  jadi v1, butuh parsing PDF (OCR/text-extraction dari lampiran
  pengumuman) yang di luar scope Fase 1, atau sumber data alternatif
  (vendor data buyback terstruktur).
