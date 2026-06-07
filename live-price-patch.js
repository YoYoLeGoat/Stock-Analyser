// ============================================================
// PATCH — Prix en temps réel via Yahoo Finance
// À inclure APRÈS le <script> principal dans index.html
// ============================================================

// 1. Récupère le prix live depuis Yahoo Finance via proxy CORS
async function fetchLivePrice(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const data = JSON.parse(json.contents);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice || meta.previousClose;
    const mcap = meta.marketCap ? (meta.marketCap / 1e9) : null;
    return {
      price: parseFloat(parseFloat(price).toFixed(2)),
      mcap: mcap ? parseFloat(mcap.toFixed(1)) : null,
      currency: meta.currency || null
    };
  } catch (e) {
    return null;
  }
}

// 2. Remplace la fonction analyze() par une version async avec prix live
// (écrase la fonction définie dans le script principal)
analyze = async function(ticker) {
  const t = (ticker || document.getElementById("ticker-input").value).trim().toUpperCase();
  if (!t) return;
  document.getElementById("ticker-input").value = t;

  ["analyzer-welcome", "analyzer-error", "analyzer-result"].forEach(id =>
    document.getElementById(id).style.display = "none"
  );

  const loadEl = document.getElementById("analyzer-loading");
  loadEl.innerHTML = `
    <div style="font-size:30px;display:inline-block;animation:pulse 1s ease-in-out infinite">📊</div>
    <div class="syne" style="color:#06b6d4;font-weight:700;font-size:13px;margin-top:8px">Récupération du prix temps réel...</div>
  `;
  loadEl.style.display = "block";

  const d = STOCKS[t];
  if (!d) {
    loadEl.style.display = "none";
    const e = document.getElementById("analyzer-error");
    e.innerHTML = `<div style="color:#fca5a5;font-weight:700;font-size:12px;margin-bottom:3px">❌ "${t}" non disponible</div>
      <div style="color:#475569;font-size:11px">💡 Utilisez le Glossaire pour trouver le bon ticker.</div>`;
    e.style.display = "block";
    return;
  }

  // Fetch prix en temps réel
  const live = await fetchLivePrice(t);
  if (live && live.price) {
    d.price = live.price;
    if (live.mcap) d.mcap = live.mcap;
    if (live.currency) d.cur = live.currency;
    d._live = true;
    d._liveTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else {
    d._live = false; // garde le prix statique en fallback
  }

  loadEl.style.display = "none";
  const el = document.getElementById("analyzer-result");
  el.innerHTML = buildResultHTML(t, d, true);
  el.style.display = "block";
};

// 3. Patch buildResultHTML pour afficher l'indicateur live/statique
const _origBuildResult = buildResultHTML;
buildResultHTML = function(ticker, d, showExport) {
  let html = _origBuildResult(ticker, d, showExport);

  // Injecte le badge live/statique après le prix
  if (d._live === true) {
    const badge = `<span style="font-size:9px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:5px;padding:2px 6px;margin-left:6px;font-family:'Syne',sans-serif;font-weight:700">🟢 LIVE ${d._liveTime}</span>`;
    html = html.replace(
      `<div style="font-size:10px;color:#475569">Cap. ${d.cur} ${d.mcap} Mds</div>`,
      `<div style="font-size:10px;color:#475569">Cap. ${d.cur} ${d.mcap} Mds</div>${badge}`
    );
  } else if (d._live === false) {
    const badge = `<span style="font-size:9px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:#f59e0b;border-radius:5px;padding:2px 6px;margin-left:6px;font-family:'Syne',sans-serif;font-weight:700">⚠️ Prix indicatif</span>`;
    html = html.replace(
      `<div style="font-size:10px;color:#475569">Cap. ${d.cur} ${d.mcap} Mds</div>`,
      `<div style="font-size:10px;color:#475569">Cap. ${d.cur} ${d.mcap} Mds</div>${badge}`
    );
  }
  return html;
};

console.log("✅ Live price patch chargé — analyse en temps réel activée");
