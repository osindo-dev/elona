# Investigasi Scope Creep — 2026-07-19

Dokumen ini murni FAKTA hasil investigasi read-only. **Tidak ada
kesimpulan "ini masalah" / "ini tidak masalah", tidak ada rekomendasi
tindakan** — itu keputusan Kris. Semua perintah yang dijalankan untuk
investigasi ini bersifat read-only (`git log`, `git show`, `git diff`,
`cat`, `find`, `wrangler whoami`, `wrangler deployments list`, `ps aux`).

**Disclosure penting soal siapa yang menulis dokumen ini**: dokumen ini
sendiri ditulis oleh sesi Claude Code yang sama yang mengerjakan commit
Fase 4 dan seterusnya yang jadi subjek investigasi ini (sesi ini
berjalan sebagai background job di worktree
`.claude/worktrees/fase4-serving-ui`, riwayat percakapannya berlanjut
dari sesi yang sama yang menghasilkan commit-commit di bawah). Investigasi
ini TIDAK dilakukan oleh pihak independen/eksternal — dicatat di sini
sebagai fakta yang relevan untuk menilai kredibilitas laporan ini
sendiri.

---

## 1. Peta branch dan worktree

**`git branch -a` (raw):**
```
+ main
* worktree-fase4-serving-ui
  remotes/origin/main
  remotes/origin/worktree-fase4-serving-ui
```

**`git worktree list` (raw):**
```
/Users/tytoalba/elona                                     36c482b [main]
/Users/tytoalba/elona/.claude/worktrees/fase4-serving-ui  bd7dd61 [worktree-fase4-serving-ui] locked
```

Cuma ada 2 branch: `main` dan `worktree-fase4-serving-ui`. Keduanya ada
counterpart di remote `origin` (`https://github.com/osindo-dev/elona.git`)
— artinya sudah pernah di-push ke GitHub, bukan cuma lokal.

**Titik cabang**: `git reflog show worktree-fase4-serving-ui` baris
terakhir: `471485c worktree-fase4-serving-ui@{4}: branch: Created from
origin/main` — branch ini dibuat dari `origin/main` persis di commit
`471485c` ("feat: Fase 3 compute layer (rolling window) + Fase 2
ingestion (GOAPI/Sectors.app)").

**Commit yang belum di-merge ke `main`** (`git log main..worktree-fase4-serving-ui --oneline`):
```
bd7dd61 fix: route Balance Position Chart to v2-placeholder contract
974807d docs: Langkah 0 Fase 3 - lock vendor schema (GOAPI historical + Sectors.app foreign-flow)
193a78b docs: due diligence NeaByteLab/IDX-API + Invezgo Python SDK
9390d80 feat: Fase 4 serving layer (v1 endpoints + v2 placeholders) + minimal UI
```
4 commit, belum satupun masuk `main`.

**Commit di `main` yang TIDAK ada di `worktree-fase4-serving-ui`**
(`git log worktree-fase4-serving-ui..main --oneline`):
```
36c482b docs: document T+0 volume revision limitation found during Fase 3 validation
```
1 commit — `main` sendiri sudah maju satu commit terpisah (soal validasi
Fase 3) setelah titik cabang, yang tidak ada di branch worktree ini.
Kedua branch sudah divergen, bukan cuma satu arah.

---

## 2. Isi lengkap `worktree-fase4-serving-ui` (4 commit di atas titik cabang)

### Commit `9390d80` — 2026-07-19 09:01:24 +0700
Author (git config lokal): Kris Sri Sugianto <139259438+tytoalba89@users.noreply.github.com>

Subject: `feat: Fase 4 serving layer (v1 endpoints + v2 placeholders) + minimal UI`

Body lengkap:
```
Serving layer (src/serving/): market-summary, top-accumulation-foreign
(+ top-accumulation?type=foreign|domestic alias per docs/api-contract.md),
and rolling-aggregate (no prior doc contract - added following the same
last_updated/staleness_flag envelope, flagged as assumption). All 8
v2-placeholder paths return exactly {status:"coming_soon"}. Does not touch
src/compute or src/ingestion/adapters.

UI (public/): framework-free static dashboard - v1 cards (Market Summary,
Top Accumulation Foreign) with staleness badge + last_updated + Sectors.app
vendor disclosure, v2 cards shown as coming-soon (not hidden).

Deploy pipeline (Cloudflare Pages) intentionally not attempted - no
Cloudflare credentials available in this environment, and Pages Functions
don't support the scheduled() cron handler already used by this Worker for
Fase 2/3 ingestion/compute, which is an architecture conflict outside this
change's authority to resolve unilaterally.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

File yang berubah:
```
 public/app.js                                    | 126 ++++++++++++++++++++
 public/index.html                                |  88 ++++++++++++++
 public/style.css                                 | 144 +++++++++++++++++++++++
 src/serving/handlers/market-summary.ts           | 126 ++++++++++++++++++++
 src/serving/handlers/placeholder.ts              |  12 ++
 src/serving/handlers/rolling-aggregate.ts        |  89 ++++++++++++++
 src/serving/handlers/top-accumulation-foreign.ts | 116 ++++++++++++++++++
 src/serving/http.ts                              |   9 ++
 src/serving/index.ts                             |   8 +-
 src/serving/router.ts                            |  53 +++++++++
 src/serving/staleness.ts                         |  29 +++++
 11 files changed, 799 insertions(+), 1 deletion(-)
```

### Commit `193a78b` — 2026-07-19 16:24:26 +0700
Subject: `docs: due diligence NeaByteLab/IDX-API + Invezgo Python SDK`
File: `docs/invezgo-neabytelab-due-diligence.md` (215 insertions, 1 file).

### Commit `974807d` — 2026-07-19 16:44:41 +0700
Subject: `docs: Langkah 0 Fase 3 - lock vendor schema (GOAPI historical + Sectors.app foreign-flow)`
File: `docs/schema-vendor-goapi-sectors.md` (203 insertions, 1 file).

### Commit `bd7dd61` — 2026-07-19 16:50:37 +0700
Subject: `fix: route Balance Position Chart to v2-placeholder contract`
File:
```
 docs/addendum-arsitektur-2026-07-19.md | 50 ++++++++++++++++++++++++++++++++++
 src/serving/router.ts                  |  6 ++++
 2 files changed, 56 insertions(+)
```

**Catatan soal identitas commit**: semua 4 commit di atas tercatat atas
nama git `Kris Sri Sugianto` — ini adalah `user.name`/`user.email` yang
sudah dikonfigurasi di git config environment ini, BUKAN bukti independen
bahwa seseorang bernama Kris yang mengetik perintah `git commit`. Siapa
pun (manusia atau agent) yang menjalankan `git commit` di environment ini
akan tercatat dengan identitas yang sama, karena itu diambil dari
konfigurasi lokal, bukan diverifikasi per-commit.

### Highlight: isi `src/serving/` (folder endpoint/serving layer)

```
src/serving/handlers/market-summary.ts            126 baris
src/serving/handlers/placeholder.ts                12 baris
src/serving/handlers/rolling-aggregate.ts           89 baris
src/serving/handlers/top-accumulation-foreign.ts   116 baris
src/serving/http.ts                                  9 baris
src/serving/index.ts                                38 baris
src/serving/router.ts                               59 baris
src/serving/staleness.ts                            29 baris
                                             Total: 478 baris
```

Ini **bukan skeleton/stub** — tiap handler v1 (`market-summary.ts`,
`top-accumulation-foreign.ts`, `rolling-aggregate.ts`) berisi query SQL
nyata ke tabel D1 (`stock_summary`, `stock_rolling_aggregate`), parsing
query param, pagination, dan komputasi field turunan (`change_percent`,
staleness flag). `placeholder.ts` yang memang cuma 12 baris — itu
disengaja, isinya cuma return `{status:"coming_soon"}` untuk 8 endpoint
v2. `router.ts` mem-forward path `/api/*` ke handler di atas berdasarkan
exact match path.

Field `foreign_net` (sumber Sectors.app) dipakai langsung di
`top-accumulation-foreign.ts` — query `ORDER BY foreign_net DESC` dari
tabel `stock_summary`, dan diserve lewat endpoint
`/api/dashboard/top-accumulation-foreign` dengan blok `data_source`
eksplisit yang isinya disclosure "Legal due diligence not yet passed."

**Klarifikasi kalimat pemicu investigasi ini**: `docs/schema-vendor-goapi-sectors.md`
baris 182-183 menulis "Field `foreign_net` yang dipakai di **production**
`stock_summary` table dan sudah diserve di endpoint
`top-accumulation-foreign` (Fase 4)". Kata "production" di kalimat itu
merujuk ke *kode aplikasi yang sudah non-placeholder/non-stub* (lawan
dari kode scratch/test), BUKAN klaim bahwa ini sudah deploy ke
infrastruktur production Cloudflare — tapi dicatat di sini apa adanya
karena kalimat itu memang berpotensi dibaca sebagai klaim deployment;
detail deployment sesungguhnya ada di section 3 di bawah.

---

## 3. Status deployment nyata

**`wrangler.jsonc` (isi lengkap saat ini):**
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "elona",
  "main": "src/serving/index.ts",
  "compatibility_date": "2025-07-18",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "elona-db", "database_id": "PLACEHOLDER_D1_DATABASE_ID" }
  ],
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "elona-bucket" }
  ],
  "kv_namespaces": [
    { "binding": "CACHE", "id": "PLACEHOLDER_KV_NAMESPACE_ID" }
  ],
  "triggers": {
    "crons": ["0 10 * * 1-5", "0 11 * * 1-5"]
  }
}
```
`database_id` dan KV `id` masih literal string `"PLACEHOLDER_..."` — belum
diisi ID resource Cloudflare asli. Tidak ada field `routes`, `route`,
`workers_dev`, atau konfigurasi `custom_domains`/Pages di file ini —
`grep -n "route\|custom_domain\|workers.dev\|pages" wrangler.jsonc`
mengembalikan nol hasil. Tidak ditemukan URL production/staging apapun
tercatat di config manapun di repo ini.

**`wrangler whoami` (dijalankan, read-only):**
```
You are not authenticated. Please run `wrangler login`.
```

**`wrangler deployments list` (dijalankan, read-only):**
```
[ERROR] In a non-interactive environment, it's necessary to set a
CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
```
`env | grep -i cloudflare` di environment ini: kosong, tidak ada
`CLOUDFLARE_API_TOKEN` ter-set.

**Limitasi investigasi eksplisit**: environment kerja ini tidak punya
kredensial Cloudflare apapun (tidak login, tidak ada API token) — jadi
TIDAK BISA mengecek riwayat deployment nyata di akun Cloudflare
`osindo-dev` dari sini. Ini dilaporkan sebagai limitasi, bukan bukti
"berarti belum pernah deploy" — kemungkinan deploy dilakukan dari
environment/mesin lain (mis. laptop Kris langsung) tidak bisa
dikonfirmasi maupun disangkal dari sini.

**Bukti yang BISA dikonfirmasi dari sini**: ada folder `.wrangler/`
(state lokal Miniflare — simulasi D1/KV/R2 di disk lokal untuk `wrangler
dev`), isinya `cache/`, `state/v3/{d1,kv,r2,cache,workflows}`, `tmp/`.
Ini adalah state **local dev only** (`wrangler dev`), bukan deployment —
Miniflare selalu membuat folder ini untuk emulasi lokal, terpisah total
dari infrastruktur Cloudflare asli. Tidak ada proses `wrangler dev` yang
sedang berjalan saat investigasi ini dilakukan (`ps aux | grep wrangler`
kosong).

**Endpoint `top-accumulation-foreign` dari luar**: tidak ditemukan URL
apapun (production/staging/preview) di config yang bisa diakses dari
luar — lihat poin `wrangler.jsonc` di atas, nol route/domain
terkonfigurasi. Endpoint ini TIDAK dicoba diakses/di-curl sebagai bagian
dari investigasi ini, sesuai instruksi.

---

## 4. Riwayat instruksi/prompt yang memicu Fase 4

Dicek: tidak ada folder `.claude/` yang ter-track di repo git ini
(worktree berada di `.claude/worktrees/fase4-serving-ui` di level
filesystem host, tapi itu bukan bagian dari repo — `git ls-files` tidak
mencakup path itu). Tidak ada `CLAUDE.md`/`AGENTS.md` di repo. Tidak ada
log percakapan/session transcript tersimpan sebagai file di repo manapun
yang ditemukan.

Satu-satunya jejak yang ada adalah **kutipan/parafrase di dalam commit
message dan komentar kode itu sendiri** (bukan transcript instruksi
lengkap):
- `src/serving/router.ts` baris 12-17 (komentar kode): "...Inventory
  Chart is included even though the Fase 4 task prompt's v2 list
  doesn't name it explicitly... the task asks to prep contracts for
  'semua fitur v2' - flagged as an assumption in the Fase 4 report."
  — ini memparafrasekan keberadaan sebuah "Fase 4 task prompt", tapi
  teks instruksi aslinya sendiri tidak ada tersimpan sebagai file di
  repo.
- Commit `9390d80` body menyebut "Deploy pipeline (Cloudflare Pages)
  intentionally not attempted... architecture conflict outside this
  change's authority to resolve unilaterally" — mengindikasikan ada
  batasan scope yang diikuti, tapi lagi-lagi tidak ada dokumen sumber
  instruksi yang tersimpan.

**Kesimpulan bagian ini**: tidak ditemukan jejak instruksi/prompt asli
yang tersimpan sebagai file di repo yang menjelaskan otorisasi memulai
Fase 4. Yang ada hanya parafrase dalam commit message dan komentar kode
dari sesi yang mengerjakannya sendiri — bukan bukti independen pihak
ketiga.

---

## 5. Ringkasan objektif

- Branch `worktree-fase4-serving-ui` berisi 4 commit di atas titik cabang
  dari `main` (`471485c`): 1 commit kode (`9390d80`, serving layer +
  UI), 3 commit dokumentasi/fix (`193a78b`, `974807d`, `bd7dd61`).
  Semuanya sudah di-push ke `origin` (GitHub), belum di-merge ke `main`.
- `main` sendiri sudah maju 1 commit terpisah (`36c482b`) yang tidak ada
  di branch ini — kedua branch sudah divergen.
- Kode Fase 4 (`src/serving/`, `public/`) adalah implementasi fungsional
  penuh (query D1 nyata, bukan stub), bukan sekadar skeleton — kecuali
  8 endpoint v2-placeholder yang memang sengaja cuma return
  `{status:"coming_soon"}`.
- Tidak ada bukti dari environment ini bahwa kode ini sudah live-deploy
  ke infrastruktur Cloudflare production: binding D1/KV masih
  placeholder ID, tidak ada route/domain terkonfigurasi, tidak ada
  kredensial Cloudflare tersedia untuk mengecek riwayat deployment
  akun `osindo-dev` secara langsung — poin terakhir ini adalah limitasi
  investigasi, bukan konfirmasi negatif.
- Satu-satunya state lokal yang ditemukan (`.wrangler/`) adalah artefak
  `wrangler dev` (emulasi lokal), bukan deployment.
- Tidak ditemukan file instruksi/transcript prompt asli yang tersimpan
  di repo yang menjelaskan otorisasi Fase 4 — hanya parafrase di commit
  message/komentar kode dari sesi yang sama yang mengerjakannya.

---

**Tidak ada perubahan state yang dilakukan selama investigasi ini.**
Semua perintah yang dijalankan bersifat read-only. Satu-satunya file
baru yang dibuat adalah dokumen laporan ini sendiri, dan file ini
**sengaja tidak di-commit/push** sesuai instruksi eksplisit sesi ini
("DILARANG KERAS ... commit, push") — statusnya masih untracked di
working tree `worktree-fase4-serving-ui`.
