# Investigasi Scope Creep — 2026-07-19 (revisi)

Dokumen ini murni FAKTA hasil investigasi read-only terhadap branch
`worktree-fase4-serving-ui`. **Tidak ada kesimpulan "ini masalah" / "ini
tidak masalah", tidak ada rekomendasi tindakan** — itu keputusan Kris.
Semua perintah di bawah bersifat read-only (`git log`, `git diff`, `gh
run list`, `gh release list`, `git ls-remote --tags`) dan bisa
direproduksi persis oleh siapa pun dengan akses repo yang sama. Tidak
ada file source yang diubah, tidak ada commit/push/merge/deploy/install
yang dilakukan selama investigasi ini.

Revisi ini menggantikan isi versi sebelumnya dari file yang sama (yang
sudah ter-commit di `f60dbc5`) dengan struktur yang diminta eksplisit:
5 section bernomor, tiap klaim disertai command dan bukti.

---

## 1. Git log & metadata

**Command:** `git log worktree-fase4-serving-ui --all --format="%H|%ad|%an|%s" --date=iso`

Full history branch ini (25 commit, terlama ke terbaru — hasil lengkap,
urutan asli terbalik/terbaru-dulu dari command di atas):

```
2d21ede5 | 2026-07-18 23:07:28 +0700 | Kris Sri Sugianto | scaffold: initial Cloudflare Workers project structure
6f57fe33 | 2026-07-18 23:13:47 +0700 | Kris Sri Sugianto | docs: fase-0 broker summary per-stock validation findings
0a5a0355 | 2026-07-18 23:15:38 +0700 | Kris Sri Sugianto | docs: record acceptance of v2-placeholder recommendation
033baebc | 2026-07-18 23:16:24 +0700 | Kris Sri Sugianto | docs: add README with project status and setup instructions
0541f169 | 2026-07-18 23:23:47 +0700 | Kris Sri Sugianto | docs: add manual browser re-verification steps for broker summary check
cb213f10 | 2026-07-18 23:25:38 +0700 | Kris Sri Sugianto | docs: add v2 broker summary re-verification (cookie-priming attempt)
00019776 | 2026-07-19 00:35:05 +0700 | Kris Sri Sugianto | feat: add fase-1 D1 schema (stock_summary, broker_summary, broker_master, sector_mapping)
0ab38836 | 2026-07-19 00:35:13 +0700 | Kris Sri Sugianto | docs: verify company announcement data is unstructured (buyback stays v2-placeholder)
e9347031 | 2026-07-19 00:35:20 +0700 | Kris Sri Sugianto | docs: add fase-1 API contract for v1 and v2-placeholder endpoints
99fd3657 | 2026-07-19 01:10:09 +0700 | Kris Sri Sugianto | docs: validate GOAPI.IO delivers real per-stock broker summary data
b996eac4 | 2026-07-19 01:14:55 +0700 | Kris Sri Sugianto | docs: add GOAPI Developer/Enterprise pricing + volume estimate
241ca9de | 2026-07-19 01:43:35 +0700 | Kris Sri Sugianto | docs: research NeoBDM competitor - bandarmology categories & money management logic
f2e1e9b8 | 2026-07-19 01:56:35 +0700 | Kris Sri Sugianto | docs: confirm Cloudflare Workers network is also blocked by IDX (Task 1)
a23389af | 2026-07-19 02:07:36 +0700 | Kris Sri Sugianto | docs: GOAPI does not cover Stock Summary fields needed by our schema
b93bd31e | 2026-07-19 02:10:17 +0700 | Kris Sri Sugianto | test: add one-off GitHub Actions workflow to test IDX reachability
567aee67 | 2026-07-19 02:12:48 +0700 | Kris Sri Sugianto | docs: GitHub Actions (Azure IP) also blocked by IDX WAF
9ecb785f | 2026-07-19 02:16:34 +0700 | Kris Sri Sugianto | docs: Sectors.app also doesn't cover full Stock Summary (Opsi C check)
a78f7ce6 | 2026-07-19 02:32:54 +0700 | Kris Sri Sugianto | docs: correct NeoBDM Balance Position finding + add Terminal B competitor research
f6995915 | 2026-07-19 07:12:08 +0700 | Kris Sri Sugianto | fix: correct Balance Position Chart schema (ownership composition, not order book)
3e9ce917 | 2026-07-19 07:16:26 +0700 | Kris Sri Sugianto | docs: note inconclusive check of local securities web trader as data source (Opsi E)
c8c51d34 | 2026-07-19 07:23:24 +0700 | Kris Sri Sugianto | fix: resolve Fase 2 blocker - skip value/frequency, GOAPI now sufficient for stock_summary
a26b4031 | 2026-07-19 07:41:13 +0700 | Kris Sri Sugianto | docs: GOAPI due diligence + drop scope for vendor-uncovered fields
471485c7 | 2026-07-19 08:36:50 +0700 | Kris Sri Sugianto | feat: Fase 3 compute layer (rolling window) + Fase 2 ingestion (GOAPI/Sectors.app)
36c482be | 2026-07-19 08:55:03 +0700 | Kris Sri Sugianto | docs: document T+0 volume revision limitation found during Fase 3 validation   [HANYA DI main, tidak di branch ini]
9390d800 | 2026-07-19 09:01:24 +0700 | Kris Sri Sugianto | feat: Fase 4 serving layer (v1 endpoints + v2 placeholders) + minimal UI
193a78b4 | 2026-07-19 16:24:26 +0700 | Kris Sri Sugianto | docs: due diligence NeaByteLab/IDX-API + Invezgo Python SDK
974807d9 | 2026-07-19 16:44:41 +0700 | Kris Sri Sugianto | docs: Langkah 0 Fase 3 - lock vendor schema (GOAPI historical + Sectors.app foreign-flow)
bd7dd61a | 2026-07-19 16:50:37 +0700 | Kris Sri Sugianto | fix: route Balance Position Chart to v2-placeholder contract
f60dbc5a | 2026-07-19 17:08:08 +0700 | Kris Sri Sugianto | docs: investigasi scope creep Fase 4 (read-only audit)   [versi sebelumnya dari dokumen ini]
```

Catatan identitas: semua commit tercatat atas nama `Kris Sri Sugianto`
karena itu `user.name`/`user.email` git config lokal environment ini —
bukan verifikasi independen siapa yang mengetik `git commit`.

### Timestamp Fase 4 vs "tanda Fase 3 disetujui"

**Command:** `grep -rniE "disetujui|approved" docs/`

Hasil: **nol match** di seluruh `docs/`. Tidak ada tanda eksplisit
"Fase 3 disetujui" (atau padanan Inggrisnya "approved") di manapun
dalam repo ini pada titik commit manapun.

Yang ADA adalah dokumen `docs/schema-vendor-goapi-sectors.md` (commit
`974807d9`, 2026-07-19 16:44:41), yang isinya justru kebalikan dari
approval — baris 200-203 dokumen tersebut:

> "Sesuai instruksi prompt Fase 3: dokumen ini TIDAK dilanjutkan ke
> Langkah 1 sebelum direview Kris. Empat gap di atas murni dilaporkan
> sebagai fakta — keputusan apakah gap ini cukup untuk lanjut compute
> logic, atau perlu capture live baru dulu (butuh API key aktif), ada
> di tangan Kris."

Fakta urutan waktu (dari log di atas):
- `9390d800` (Fase 4 serving layer, termasuk endpoint
  `top-accumulation-foreign` yang meng-query `foreign_net`) — **09:01:24**
- `974807d9` (dokumen yang secara eksplisit menyatakan gap Sectors.app
  belum direview/disetujui Kris, dan melarang lanjut ke "Langkah 1"
  sampai direview) — **16:44:41**, yaitu **7 jam 43 menit SETELAH**
  commit Fase 4 di atas.

Jadi: commit Fase 4 yang men-serve `foreign_net` **mendahului** dokumen
yang menyatakan data itu belum direview/disetujui — bukan sebaliknya.
Tidak ditemukan tanda approval Fase 3 di titik manapun, sebelum maupun
sesudah commit Fase 4.

### Diff file — main vs branch

**Command:** `git diff main...worktree-fase4-serving-ui --stat`

```
 docs/addendum-arsitektur-2026-07-19.md           |  50 ++++
 docs/investigasi-scope-creep-2026-07-19.md       | 311 +++++++++++++++++++++++
 docs/invezgo-neabytelab-due-diligence.md         | 215 ++++++++++++++++
 docs/schema-vendor-goapi-sectors.md              | 203 +++++++++++++++
 public/app.js                                    | 126 +++++++++
 public/index.html                                |  88 +++++++
 public/style.css                                 | 144 +++++++++++
 src/serving/handlers/market-summary.ts           | 126 +++++++++
 src/serving/handlers/placeholder.ts              |  12 +
 src/serving/handlers/rolling-aggregate.ts        |  89 +++++++
 src/serving/handlers/top-accumulation-foreign.ts | 116 +++++++++
 src/serving/http.ts                              |   9 +
 src/serving/index.ts                             |   8 +-
 src/serving/router.ts                            |  59 +++++
 src/serving/staleness.ts                         |  29 +++
 15 files changed, 1584 insertions(+), 1 deletion(-)
```

(Baris `docs/investigasi-scope-creep-2026-07-19.md | 311` mengacu ke
versi file ini SEBELUM revisi ini ditulis, karena diff diambil terhadap
`main` yang tidak punya versi manapun dari file ini.)

`main` sendiri sudah maju 1 commit terpisah (`36c482be`, tidak ada di
branch ini) — kedua branch sudah divergen sejak titik cabang `471485c7`.

---

## 2. Klaim "sudah diserve"

### Definisi handler dan route registration

**Command:** `grep -n "top-accumulation-foreign\|handleTopAccumulation" src/serving/router.ts src/serving/handlers/top-accumulation-foreign.ts src/serving/index.ts`

- Handler didefinisikan di `src/serving/handlers/top-accumulation-foreign.ts:21` —
  `export async function handleTopAccumulationForeign(env: Env, url: URL): Promise<Response>`.
  Isinya query SQL nyata ke D1 (baris 35-43):
  ```
  const { results } = await env.DB.prepare(
    `SELECT stock_code, stock_name, foreign_net
     FROM stock_summary
     WHERE date = ?1
     ORDER BY foreign_net DESC
     LIMIT ?2`,
  )
    .bind(date, limit)
    .all<ForeignFlowRow>();
  ```
- Route registration AKTIF di `src/serving/router.ts:50-51`:
  ```
  case "/api/dashboard/top-accumulation-foreign":
    return handleTopAccumulationForeign(env, url);
  ```
  di dalam `switch (url.pathname)` pada fungsi `routeApiRequest` (`router.ts:35`).
- `routeApiRequest` dipanggil dari `src/serving/index.ts` di dalam
  `export default { async fetch... }` — entry point Worker yang
  dirujuk `wrangler.jsonc:4` (`"main": "src/serving/index.ts"`).

Kesimpulan fakta: ini bukan fungsi menggantung tanpa registration —
route-nya aktif terdaftar dan tersambung ke entry point Worker.
"Terdaftar di kode" ini TIDAK sama dengan "berjalan di server nyata" —
lihat section 3.

### Bukti proses server benar-benar berjalan

**Command:** `find . -iname "Dockerfile*" -o -iname "docker-compose*" -o -iname "*.service" -o -iname "Procfile"`

Hasil: **nol file ditemukan**. Tidak ada Dockerfile, docker-compose,
systemd unit, atau Procfile di repo ini.

**Command:** `find . -iname "*.yml" -o -iname "*.yaml"`

Hasil: hanya **satu file**, `.github/workflows/network-test.yml`.
Isinya (`name:` baris 1): `"Fase 2 - IDX network reachability test
(spike, manual trigger)"`, trigger `on: workflow_dispatch` (manual),
job satu-satunya cuma `curl` ke `idx.co.id` untuk cek status HTTP —
**tidak deploy/publish apapun**. Tidak ada job deploy di file manapun
di repo.

`wrangler.jsonc` (isi lengkap, dibaca langsung — dikutip apa adanya):
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "elona",
  "main": "src/serving/index.ts",
  "compatibility_date": "2025-07-18",
  "compatibility_flags": ["nodejs_compat"],

  // Placeholder bindings — resource belum diprovision di Cloudflare (fase 0).
  // Isi id/bucket_name/database_id nyata pas provisioning beneran dilakukan.
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
`database_id` dan `kv_namespaces[0].id` masih literal string
`"PLACEHOLDER_..."` — komentar di file itu sendiri (baris 8-9) bilang
"resource belum diprovision di Cloudflare (fase 0)". Tidak ada field
`routes`/`route`/`workers_dev`/`assets` di file ini — jadi tidak ada
domain/URL publik terkonfigurasi untuk endpoint ini, dan folder
`public/` (UI-nya) tidak disambungkan ke Worker manapun di config ini.

### Log run lokal / bukti pemanggilan nyata

**Command:** `find . -iname ".env*" -o -iname "*.log"`

Hasil: **nol file ditemukan** (tidak ada `.env`, tidak ada `.log`).

**Command:** `cat package.json` (bagian `scripts`):
```json
"scripts": {
  "dev": "wrangler dev",
  "deploy": "wrangler deploy",
  "typecheck": "tsc --noEmit",
  "validate:broker-summary": "tsx scripts/validate-broker-summary.ts"
}
```
Script `dev`/`deploy` ADA dan BISA menjalankan/publish Worker via
`wrangler` — tapi ketersediaan script bukan bukti eksekusi. Tidak ada
script `validate` khusus untuk endpoint `top-accumulation-foreign`.

**Command:** `grep -rn "top-accumulation" docs/ scripts/ README.md 2>/dev/null | grep -iE "curl|tested|invoked|manual|smoke"`

Hasil: **nol match**. Tidak ditemukan catatan di manapun (docs, script,
README) bahwa endpoint ini pernah benar-benar dipanggil/di-tes
terhadap server yang jalan (lokal maupun remote).

Satu-satunya artefak lokal terkait wrangler adalah folder `.wrangler/`
(state Miniflare untuk `wrangler dev` — emulasi lokal, bukan
deployment). Tidak ada proses `wrangler` yang berjalan saat investigasi
ini (`ps aux | grep wrangler` kosong).

---

## 3. Deployment status nyata

### GitHub Actions run history (run, bukan cuma file workflow)

**Command:** `gh run list --branch worktree-fase4-serving-ui --limit 20`

Hasil: **kosong** — nol run pernah dijalankan untuk branch ini.

**Command:** `gh run list --limit 20` (semua branch, seluruh repo)

Hasil: **satu run total di seluruh repo**:
```
completed  success  Fase 2 - IDX network reachability test (spike, manual trigger)  main  workflow_dispatch  29657291547  11s  2026-07-18T19:10:39Z
```
Run ini di branch `main`, trigger manual, isinya cuma tes reachability
jaringan IDX — **tidak ada hubungannya dengan deploy Fase 4** dan
terjadi sebelum commit Fase 4 (`9390d800`, 2026-07-19 09:01) dibuat.

### Artefak deployment (release / tag / image push)

**Command:** `gh release list` → hasil: **kosong**, nol release.

**Command:** `git ls-remote --tags origin` → hasil: **kosong**, nol tag di remote.

**Command:** `git tag -l` (lokal) → hasil: **kosong**, nol tag lokal.

Tidak ada Dockerfile/registry config (lihat section 2) sehingga tidak
ada mekanisme container image push yang bisa dicek — tidak relevan
karena tidak ada infrastrukturnya sama sekali di repo ini.

**Kredensial Cloudflare di environment ini**: `wrangler whoami` →
`"You are not authenticated. Please run wrangler login."`
`wrangler deployments list` → error, minta `CLOUDFLARE_API_TOKEN` yang
tidak tersedia (`env | grep -i cloudflare` kosong).

### Pernyataan eksplisit

**TIDAK ADA bukti deployment** untuk branch `worktree-fase4-serving-ui`
yang bisa dikonfirmasi dari environment investigasi ini: nol GitHub
Actions run terkait deploy, nol release, nol tag, nol konfigurasi
route/domain publik, tidak ada kredensial Cloudflare untuk mengecek
langsung akun `osindo-dev`.

**Limitasi eksplisit**: environment ini tidak punya kredensial
Cloudflare, sehingga tidak bisa mengecek riwayat deployment di akun
Cloudflare `osindo-dev` secara langsung (di luar GitHub). Kemungkinan
deploy manual dari mesin lain (mis. laptop Kris, di luar GitHub Actions
dan di luar environment ini) **tidak bisa dikonfirmasi maupun
disangkal** dari sini — ini dilaporkan sebagai limitasi investigasi,
bukan sebagai "kemungkinan belum deploy".

---

## 4. Ketergantungan pada data zero-verified

**Konfirmasi:** YA, kode endpoint ini memakai field `foreign_net` dari
Sectors.app, dan `docs/schema-vendor-goapi-sectors.md` secara eksplisit
menyatakan status field itu "zero live verification".

**Baris kode yang memanggil field tersebut** (`src/serving/handlers/top-accumulation-foreign.ts`):

- Baris 6-9 (komentar header file):
  ```
  // net_foreign_inflow comes from Sectors.app, a vendor that has NOT passed
  // legal due diligence (src/ingestion/adapters/sectors-app-foreign-flow.ts).
  // Per task constraint #5, the response carries a `data_source` block so the
  // UI can render a third-party-vendor disclosure instead of hiding it.
  ```
- Baris 18 (tipe): `foreign_net: number | null;`
- Baris 36-39 (query SQL nyata):
  ```
  `SELECT stock_code, stock_name, foreign_net
   FROM stock_summary
   WHERE date = ?1
   ORDER BY foreign_net DESC
   LIMIT ?2`
  ```
- Baris 67 (mapping ke response): `net: r.foreign_net,`
- Disclosure block yang disertakan di response (baris 88-92):
  ```
  const SECTORS_APP_DISCLOSURE = {
    vendor: "Sectors.app",
    field: "net_foreign_inflow",
    note: "Third-party vendor data. Legal due diligence not yet passed - see docs/goapi-due-diligence.md and docs/konsep-arsitektur-bandarmology-idx.md section 3.",
  };
  ```

**Kutipan status "zero live verification"** dari
`docs/schema-vendor-goapi-sectors.md:181-186`:

> "1. **Sectors.app: zero live verification.** Field `foreign_net` yang
> dipakai di production `stock_summary` table dan sudah diserve di
> endpoint `top-accumulation-foreign` (Fase 4) berasal dari vendor yang
> API-nya belum pernah benar-benar dipanggil sekali pun — semua asumsi
> (unit Rupiah, null-on-404, format Authorization header, symbol
> suffix `.JK`) diturunkan dari dokumentasi spec, bukan observasi."

Dokumen ini sendiri (commit `974807d9`, 16:44:41) ditulis **setelah**
endpoint yang men-serve field tersebut sudah ada di commit `9390d800`
(09:01:24) — lihat cross-reference timeline di section 1.

Referensi lain field `foreign_net`/Sectors.app di repo (tidak dikutip
penuh, hanya lokasi): `docs/api-contract.md:71-73`,
`docs/schema-diagram.md:31`, `src/compute/rolling-aggregation-job.ts:6`,
`migrations/0001_initial_schema.sql:45`.

---

## 5. Ringkasan fakta

**Timeline commit** (lengkap di section 1) — titik kunci:
- `471485c7` 08:36:50 — Fase 3 compute layer + Fase 2 ingestion dibuat.
- `9390d800` 09:01:24 — Fase 4 serving layer dibuat, termasuk endpoint
  yang men-serve `foreign_net` dari Sectors.app.
- `974807d9` 16:44:41 — dokumen "lock vendor schema" Fase 3 dibuat,
  isinya menyatakan gap Sectors.app belum direview/disetujui Kris.
- `bd7dd61a` 16:50:37 — commit terakhir di branch ini.

**Status approval Fase 3 vs commit Fase 4**: Commit Fase 4 (`9390d800`,
09:01:24) **MENDAHULUI** dokumen `974807d9` (16:44:41) yang menyatakan
gap vendor Sectors.app belum direview/disetujui. Tidak ditemukan tanda
eksplisit "Fase 3 disetujui"/"approved" di manapun dalam repo, baik
sebelum maupun sesudah commit Fase 4 — jadi tidak ada titik approval
Fase 3 yang bisa dijadikan pembanding sama sekali; yang ada hanya
dokumen yang secara eksplisit menyatakan gap belum direview, dan
dokumen itu datang setelah endpoint sudah men-serve datanya.

**Bukti deployment**: **TIDAK ADA**. Nol GitHub Actions run untuk
branch ini, nol release, nol tag, nol config route/domain publik di
`wrangler.jsonc`, tidak ada kredensial Cloudflare untuk cek langsung ke
akun `osindo-dev` (limitasi investigasi, dicatat terpisah dari
kesimpulan "tidak ada bukti").

**Ketergantungan data tervalidasi**: **TIDAK**. Endpoint
`top-accumulation-foreign` secara aktif ter-routing dan men-query field
`foreign_net` yang, per `docs/schema-vendor-goapi-sectors.md:181-186`,
berstatus "zero live verification" — API vendor Sectors.app belum
pernah benar-benar dipanggil, semua asumsi format data diturunkan dari
dokumentasi spec vendor, bukan observasi langsung.

---

**Tidak ada perubahan state lain yang dilakukan selain menulis file
laporan ini.** Semua command di atas read-only dan bisa direproduksi
persis dengan command yang sama. Sesuai instruksi eksplisit sesi ini:
tidak ada `git commit`, `git push`, `git merge`, `npm install`, deploy,
edit file source, atau hapus branch yang dilakukan.
