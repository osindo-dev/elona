# Riset Kompetitor: NeoBDM (neobdm.tech)

Eksplorasi via akun Kris yang sudah login (bukan scraping/reverse-engineer
API mereka — cuma pakai UI sebagai user biasa). Tujuan: pelajari gimana
NeoBDM dapat data + logic kategorisasi bandarmology & money management,
buat referensi desain elona. **Ini bukan blueprint buat nyalin persis** —
sebagian besar logic klasifikasi (broker mana masuk kategori apa) adalah
proprietary NeoBDM dan tidak dieksplorasi lebih jauh dari yang keliatan
di UI publik-untuk-member.

## 1. Sumber data

Fitur NeoBDM cocok 100% sama scope elona yang udah didesain: Screener,
Market Summary, Rotation Chart, Balance Position, Sector Activity,
Seasonality, Transaction Chart, Broker Stalker, Done Detail, Inventory
Chart, Money Management. Ini konfirmasi kuat kalau desain fitur elona
(dari task-task sebelumnya) memang modelnya NeoBDM.

**Bukti kuat soal sumber data broker summary:** dicoba `Broker Summary`
untuk BBCA tanggal 17 Jul 2026 di NeoBDM — hasilnya **identik persis**
sama respons GOAPI.IO yang udah divalidasi di
`docs/fase-2-vendor-validation.md`:

| Broker | Lot (NeoBDM) | Lot (GOAPI) | Avg (NeoBDM) | Avg (GOAPI) |
| :--- | :--- | :--- | :--- | :--- |
| DX (Bahana) | 278,997 | 278,997 | 6,378.4 | 6,378.4119 |

Angka sama sampai 1 lot & avg price. Ini kemungkinan besar: (a) NeoBDM
dan GOAPI sama-sama pakai sumber data broker summary yang sama (entah
IDX Data Feed berlisensi atau vendor lain yang sama), atau (b) salah satu
reselling dari yang lain. Yang penting buat elona: **ini validasi
independen kedua** bahwa data GOAPI akurat/bukan random, karena cocok
sama tool yang udah established & dipakai banyak orang.

Kepemilikan saham (Analisa Kepemilikan / KDA-PKDA) di NeoBDM sumbernya
beda — ada file XLSX resmi "Data per 30 jun 2026" yang kemungkinan dari
laporan KSEI (Kustodian Sentral Efek Indonesia), bukan dari GOAPI/scraping
real-time. Di luar scope validasi broker summary tapi relevan kalau elona
mau fitur Analisa Kepemilikan/Scripless/Nominee di masa depan.

## 2. Logic kategorisasi Bandarmology

NeoBDM klasifikasi broker ke beberapa "cohort" (kelompok perilaku), dua
sistem label yang kepake paralel di UI:

**Sistem A — Transaction Chart tabs** (tooltip persis, hover icon info
di halaman `/stock_detail/{ticker}/`):
- **M = Bandarmologi** ("Market Maker" — broker yang dianggap "bandar"/
  penggerak dominan)
- **NR = NonRetail** (flow institusional)
- **S = Sultanmologi** (istilah unik NeoBDM — kemungkinan whale/individu
  kaya lokal, beda dari institusi asing maupun broker "bandar")
- **F = Foreign Flow**
- **Z = Zombiemologi** ("Zombie" — broker dengan pola flow dianggap noise/
  gak reliable jadi sinyal)

**Sistem B — Broker Summary chart (per saham)**: 4 kategori standar
**F (Foreign) / R (Retail) / I (Institution) / Z (Zombie)** — stacked bar
chart per hari, tiap kategori punya warna sendiri (ungu/oranye/biru/pink).

Kedua sistem sepertinya representasi dari taxonomy yang sama, cuma Sistem
A nambahin nuansa lokal (Bandarmologi vs Sultanmologi sebagai pecahan
dari "non-retail besar") sementara Sistem B versi simpel 4-kategori.

**Cara kerja klasifikasi ini TIDAK terlihat di UI publik** — gak ada
halaman "daftar broker + kategori" yang bisa diakses. Kemungkinan besar
di-assign manual/semi-manual oleh tim NeoBDM berdasarkan riset histori
pola trading tiap broker (bukan field yang dikirim API data vendor kayak
GOAPI — field `investor` dari GOAPI cuma `FOREIGN`/`LOCAL`/`ALL`, gak ada
`RETAIL`/`INSTITUTION`/`ZOMBIE`). **Artinya kalau elona mau fitur serupa,
perlu bikin sendiri broker classification table** (mapping broker_code →
cohort), bukan sesuatu yang otomatis didapat dari vendor data manapun
yang udah dicek.

### Participation

Chart stacked 100% per hari, isinya % kontribusi tiap cohort (F/R/I/Z)
terhadap total transaksi saham itu hari itu. Tooltip resmi: *"Partisipasi
transaksi masing-masing komponen market di [ticker]."* — pada dasarnya
jawab pertanyaan "hari ini yang paling dominan transaksi di saham ini
tipe investor apa?"

### Compatibility

Skor per-cohort (ditampilkan buat F/NR/M) yang diklaim sebagai
*"Rekomendasi AI NeoBDM apakah metode yang dipilih cocok untuk [ticker]
atau tidak."* — intinya: gak semua saham cocok dianalisa pakai lensa
"ikutin foreign flow" atau "ikutin bandar" — Compatibility kasih tau
lensa mana yang secara historis paling reliable buat saham spesifik itu.
Contoh BBCA: F 79.7%, NR 70.8%, M 63.7% — berarti di BBCA, ngikutin
Foreign Flow secara historis paling "cocok"/prediktif dibanding NonRetail
atau Bandarmologi.

Ini kemungkinan hasil backtest sederhana (korelasi arah net-flow cohort
vs pergerakan harga berikutnya), tapi metodologi persisnya gak
dipublikasikan — cuma hasil skornya yang ditampilkan.

## 3. Money Management (Lot Sizing Calculator)

Bukan fund-flow analysis — ini kalkulator **position sizing berbasis
risk %**, standar di edukasi trading:

**Input:**
- Entry Price 1-4 (support DCA/rata-rata masuk bertahap)
- SL Price (stop loss)
- Risk: 10 tingkatan 0.5%-5% dari balance, dikasih label naratif
  (Defensive → Standard → Optimistic → Aggressive → Risky → Medium Risk →
  High Risk → Extreme Risk → Gamble → Dangerous)
- Fee: 9 tingkatan 0%-0.48% (macam-macam skema fee broker Indonesia)
- Balance ("bukan equity, bukan cash" — modal referensi tetap buat
  konsistensi hitungan risk, bukan saldo real-time)

**Output:** lot per entry, %m (persentase balance terpakai), value Rp,
estimated average, estimated loss, TP, estimated profit.

**Formula (reverse-engineered dari test case):** entry 6400, SL 6200,
risk 1%, balance Rp100jt → hasil 44 lot, senilai Rp28.16jt (28.4% dari
balance).

```
risk_amount = balance × risk%
per_share_risk ≈ (entry - SL) + fee × SL   # fee di-charge di sisi exit/SL
shares = risk_amount / per_share_risk
lot = floor(shares / 100)                  # 1 lot IDX = 100 lembar
```

Ini formula klasik "risk % of capital ÷ jarak stop-loss" yang disesuaikan
biaya transaksi, diperluas buat multi-entry (averaging). Cek: 1,000,000
(risk 1% dari 100jt) / [(6400-6200) + 0.004×6200] = 1,000,000/224.8 ≈
4448 lembar ≈ 44.48 lot → dibulatkan ke bawah jadi 44. Cocok dengan hasil
UI.

## Implikasi buat elona

- **Broker Stalker & Broker Summary** (v1, setelah keputusan pindah dari
  v2-placeholder): bisa dibangun langsung dari data GOAPI, formatnya
  udah persis sama kayak NeoBDM (per broker per saham per hari, BUY/SELL,
  lot/value/avg).
- **Inventory Chart** kalau mau full setara NeoBDM (kategori F/R/I/Z +
  Participation + Compatibility): butuh (1) broker classification table
  buatan sendiri (gak ada di data vendor manapun), dan (2) logic
  backtest buat skor Compatibility — ini scope tambahan non-trivial,
  bukan cuma soal data ada/gak ada seperti temuan Fase 0/2 sebelumnya.
  Rekomendasi: kalau mau kejar fitur ini di v1, breakdown jadi sub-task
  terpisah (bikin broker cohort mapping dulu, baru chart-nya).
- **Money Management**: independen dari data source IDX — pure kalkulator
  di client/serving layer, gampang diimplementasi, gak perlu API
  eksternal apapun. Formula di atas cukup buat jadi starting point.
