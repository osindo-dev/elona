# Riset Kompetitor: Terminal B (terminalb.id)

Eksplorasi via akun Kris yang sudah login, halaman `/bandar` (Radar
Bandar) dan `/bantuan` (dokumentasi resmi mereka) plus `/dashboard`.
Sama seperti riset NeoBDM — pakai UI sebagai user biasa, bukan
scraping/reverse-engineer API mereka.

## Positioning

Tagline: **"Read the bandar, not the rumor."** UX-nya beda total dari
NeoBDM — gaya "terminal"/command-bar (ketik `/EMITEN BBCA`, `/ALERT`,
`/HELP` di command bar atas), navigasi via menu bernomor 1-11 atau
F-key (F1 Bantuan, F2 Komparasi). Lebih ke power-user/trader serius
dibanding dashboard klik-klik biasa.

Disclaimer eksplisit di tiap halaman: **"BUKAN nasihat investasi,
rekomendasi beli/jual, atau prediksi harga"** — framing "deskriptif
algoritmik atas data historis", bukan "analisa/rekomendasi". Ini pola
kompliance yang kuat, layak dicontoh elona buat kurangi resiko dianggap
memberi nasihat finansial berlisensi.

## Radar Bandar — metodologi (lebih matang dari NeoBDM)

Beda dari NeoBDM yang cuma nampilin raw net buy/sell broker, Terminal B
punya **skor komposit** buat ranking otomatis mana saham yang paling
meyakinkan pola akumulasi/distribusinya:

- **Konsentrasi (KON%)**: rendah <20%, sedang 20-45%, tinggi ≥45% — net
  buy/sell terkonsentrasi di sedikit broker ("tangan besar") vs
  tersebar di banyak broker.
- **Konsistensi (KONS%)**: rendah <80%, sedang 80-95%, tinggi ≥95% —
  arah net flow bertahan hari ke hari atau bolak-balik.
- **Skor -1...+1**: ranking komposit algoritmik dari Konsentrasi +
  Konsistensi + magnitude, **asimetris per sisi** (skor akumulasi dan
  skor distribusi gak boleh dibandingkan langsung satu sama lain,
  cuma valid dibandingkan sesama akumulasi atau sesama distribusi).
- **Window**: 1H/3H/5H/30H (1/3/5/30 hari bursa) — window lebih panjang
  = tren lebih stabil tapi konsistensi cenderung turun.

Eksplisit dinyatakan: **"Data bersumber dari transaksi broker asli IDX,
bukan sinyal teknikal"** — konfirmasi tambahan (independen dari NeoBDM
dan GOAPI) bahwa data broker-per-saham granular itu memang bisa didapat
dari suatu sumber (walau gak disebut vendor spesifiknya).

Tampilan publik (non-Pro) cuma nampilin **4 dari 173** hasil (2 teratas
tiap sisi akumulasi/distribusi) — pola paywall yang jelas: kasih preview
kecil gratis, detail lengkap di paket Pro.

## Fitur Pro yang menarik buat referensi desain elona

### Gorengan Radar
Deteksi pola abnormal berisiko tinggi: volume melonjak tanpa berita
jelas, harga bergerak ekstrem, pola pump/dump terdeteksi algoritmik.
Badge "RISIKO TINGGI" muncul kalau makin banyak kriteria terpenuhi.
Framing hati-hati: "Tidak otomatis berarti ada manipulasi — bisa juga
berita belum menyebar" — menghindari klaim tuduhan langsung.

### Fingerprint Broker — **paling relevan buat blocker elona saat ini**
Memetakan gaya transaksi **per-broker per-saham** ke tiga kategori:
- **Institusi**: dominasi order blok besar
- **Retail**: banyak order kecil
- **Flipper**: transaksi dua arah (buy & sell bolak-balik, indikasi
  scalping/day-trading bukan posisi)

**Beda penting dari pendekatan NeoBDM**: NeoBDM (setahu yang kekonfirmasi
dari riset sebelumnya, `docs/neobdm-competitor-research.md`) sepertinya
pakai **tabel mapping broker→kategori yang di-maintain manual/semi-manual**
(gak ada field itu di data vendor manapun yang dicek). Terminal B
mengklasifikasikan "Institusi vs Retail vs Flipper" dari **pola
transaksi itu sendiri** (ukuran order, frekuensi, dua-arah atau
searah) — ini **dihitung, bukan di-lookup dari tabel statis**.

**Implikasi buat elona**: kalau mau fitur broker classification
(dibutuhkan buat Inventory Chart versi lengkap, lihat
`docs/schema-diagram.md`), pendekatan "hitung dari pola transaksi"
lebih scalable dan gak butuh maintenance manual dibanding bikin tabel
broker→kategori sendiri dari nol. Trade-off: butuh cukup data historis
per broker buat pola itu stabil, dan logic klasifikasinya sendiri perlu
didesain/divalidasi (di luar scope riset ini — kita cuma tau KONSEPnya,
bukan formula persisnya, itu proprietary Terminal B).

### Aliran Smart Money
Deteksi akumulasi institusional yang **konsisten lintas emiten** (bukan
cuma 1 saham), dihitung dari skor bandar multi-window. "Sinyal kuat"
didefinisikan sebagai muncul di beberapa window sekaligus (1H, 3H, 5H
bersamaan) — bentuk validasi silang sederhana yang cukup elegan, bisa
diadopsi buat fitur serupa di elona tanpa perlu data tambahan (cuma
kombinasi dari data yang sama, beda window).

## Dashboard Pasar (`/dashboard`)

Data EOD (End of Day), bukan real-time — konsisten sama keterbatasan
sumber data yang kita hadapi juga (IDX cuma expose EOD publik). IHSG,
volume market-wide, "Asing 725,11 M" (net foreign flow market-wide,
bukan per-saham di halaman ini), pivot harian (Support/Pivot/Resistance
dari harga — turunan teknikal, bukan data mentah baru), "Sentimen
Pasar" (skor 0-100 dari kombinasi %saham naik/turun + aliran asing +
arah volume — turunan komposit, bukan data baru juga). Tabel trending
cuma tampilin kode/harga/perubahan — gak expose frequency atau bid/offer
di sini juga (konsisten sama temuan kita: field itu emang jarang
diekspos di produk consumer-facing manapun).

## Ringkasan takeaway buat elona

1. **Konfirmasi independen ketiga** (setelah IDX asli + GOAPI + NeoBDM)
   kalau broker-per-saham itu emang bisa didapat dari suatu sumber —
   makin kuat alasan buat gak nyerah ke v2-placeholder untuk
   Bandarmology/Broker Stalker.
2. **Skor komposit (Konsentrasi × Konsistensi) lebih baik dari raw net
   flow** — pertimbangkan buat Broker Stalker/Inventory Chart elona
   pakai pendekatan skor serupa, bukan cuma tabel angka mentah kayak
   desain awal.
3. **Fingerprint Broker (klasifikasi dari pola, bukan tabel manual)**
   adalah alternatif desain yang lebih baik dari NeoBDM buat masalah
   broker classification yang udah diidentifikasi di
   `docs/schema-diagram.md` — worth dieksplorasi lebih lanjut sebagai
   pendekatan.
4. **Framing compliance** ("deskriptif algoritmik, bukan rekomendasi")
   dipakai konsisten di semua halaman — pola yang baik buat elona ikutin
   dari awal, bukan ditambah belakangan.
5. **Paywall preview pattern** (4 dari 173, 2 teratas tiap sisi) — model
   freemium yang jelas buat dicontoh kalau elona mau ada tier gratis vs
   berbayar.
