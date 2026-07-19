# CLAUDE.md

## Proses wajib: audit read-only per fase

Setiap kali satu fase (Fase 0, 1, 2, 3, 4, dst.) selesai dikerjakan —
sebelum mulai fase berikutnya — jalankan audit read-only atas fase yang
baru selesai itu. Audit TIDAK boleh commit/push/edit apa pun, dan TIDAK
boleh menyimpulkan "aman"/"tidak aman" atau merekomendasikan tindakan —
itu keputusan Kris. Audit hanya melaporkan fakta mentah (raw command
output: git log, git diff, git show, dsb).

Checklist minimum per audit fase:

- Commit apa saja yang masuk fase ini (`git log --oneline` dibatasi ke
  commit fase terkait).
- Diff/isi file yang berubah — bukan ringkasan, tempel mentah.
- Apakah ada premis/klaim di dokumen approval sebelumnya yang jadi tidak
  akurat gara-gara perubahan fase ini (cross-check dengan
  `docs/fase3-approval.md` atau dokumen approval fase yang relevan).
- Status push: sudah di origin atau masih lokal saja
  (`git branch -r --contains <hash>`).

Simpan hasil audit sebagai file baru di `docs/` dengan nama
`audit-fase-N-<tanggal>.md`, bukan menimpa dokumen approval yang sudah
ada. Dokumen approval (`docs/fase3-approval.md` dkk.) hanya diubah kalau
Kris eksplisit minta approval baru/revisi — bukan otomatis tiap audit.

Repo `osindo-dev/elona` public — jangan asumsikan konten sensitif
(status DD legal vendor, catatan override guard, dsb.) aman disembunyikan
cuma karena ini repo kerja. Kalau ragu suatu konten terlalu sensitif buat
commit history publik, tanya dulu sebelum push.
