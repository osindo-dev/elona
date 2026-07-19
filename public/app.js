// Fase 4 minimal dashboard. No build step, no framework - fetches directly
// from the serving-layer API (src/serving/router.ts).
//
// API_BASE: this UI's origin is not necessarily the Worker's origin (see
// Fase 4 report re: Cloudflare Pages vs Workers deploy target, unresolved
// at time of writing). Defaults to same-origin "/api"; override before this
// script loads with `window.ELONA_API_BASE = "https://<worker-host>/api"`.
const API_BASE = window.ELONA_API_BASE || "/api";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function setStaleness(card, flag) {
  const badge = card.querySelector("[data-staleness]");
  badge.textContent = flag;
  badge.dataset.flag = flag;
}

function setLastUpdated(card, iso) {
  card.querySelector("[data-last-updated]").textContent = iso ?? "belum ada data";
}

function renderError(card, err) {
  card.querySelector("[data-body]").innerHTML = `<p class="error">Gagal memuat: ${escapeHtml(err.message)}</p>`;
}

// Table cell values below come from D1, sourced from vendor API responses
// (GOAPI/Sectors.app) - not hardcoded, so treated as untrusted for HTML
// interpolation rather than assumed safe.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadMarketSummary() {
  const card = document.getElementById("card-market-summary");
  try {
    const data = await fetchJson("/screening/market-summary?sort=volume&limit=10");
    setStaleness(card, data.staleness_flag);
    setLastUpdated(card, data.last_updated);

    if (data.data.length === 0) {
      card.querySelector("[data-body]").innerHTML = `<p class="loading">Belum ada data (ingestion belum jalan).</p>`;
      return;
    }

    const rows = data.data
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.stock_code)}</td>
          <td>${escapeHtml(fmtNum(r.close))}</td>
          <td>${escapeHtml(fmtPct(r.change_percent))}</td>
          <td>${escapeHtml(fmtNum(r.volume))}</td>
        </tr>`,
      )
      .join("");

    card.querySelector("[data-body]").innerHTML = `
      <table>
        <thead><tr><th>Kode</th><th>Close</th><th>Chg%</th><th>Volume</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="card-meta">Tanggal: ${escapeHtml(data.date)}</p>
    `;
  } catch (err) {
    renderError(card, err);
  }
}

async function loadTopAccumulationForeign() {
  const card = document.getElementById("card-top-accumulation-foreign");
  try {
    const data = await fetchJson("/dashboard/top-accumulation-foreign?limit=10");
    setStaleness(card, data.staleness_flag);
    setLastUpdated(card, data.last_updated);

    if (data.data_source) {
      const el = card.querySelector("[data-vendor-disclosure]");
      el.hidden = false;
      el.textContent = `Sumber: ${data.data_source.vendor} (pihak ketiga) — ${data.data_source.note}`;
    }

    if (data.data.length === 0) {
      card.querySelector("[data-body]").innerHTML = `<p class="loading">Belum ada data (ingestion belum jalan atau foreign_net kosong).</p>`;
      return;
    }

    const rows = data.data
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.rank)}</td>
          <td>${escapeHtml(r.stock_code)}</td>
          <td>${escapeHtml(fmtNum(r.net))}</td>
        </tr>`,
      )
      .join("");

    card.querySelector("[data-body]").innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Kode</th><th>Net Foreign (Rp)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="card-meta">Tanggal: ${escapeHtml(data.date)}</p>
    `;
  } catch (err) {
    renderError(card, err);
  }
}

function fmtNum(n) {
  return n === null || n === undefined ? "—" : Number(n).toLocaleString("id-ID");
}

function fmtPct(n) {
  return n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n}%`;
}

loadMarketSummary();
loadTopAccumulationForeign();
