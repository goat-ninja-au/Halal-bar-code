// app.js — scanning, Open Food Facts lookup, rendering.
(() => {
  const $ = (id) => document.getElementById(id);
  const scanBtn = $("scanBtn"), reader = $("reader"), scanMsg = $("scanMsg");
  const resultEl = $("result"), historyEl = $("history"), historyWrap = $("historyWrap");

  const FIELDS = [
    "code", "product_name", "product_name_en", "brands", "image_front_small_url",
    "ingredients_text", "ingredients_text_en", "ingredients_tags",
    "additives_tags", "labels_tags", "labels",
  ].join(",");

  const ICONS = { halal: "✅", clear: "🟢", doubtful: "⚠️", haram: "❌", unknown: "❔" };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Scanner ----------
  let scanner = null, scanning = false, busy = false;

  async function startScan() {
    if (!window.Html5Qrcode) {
      scanMsg.textContent = "Scanner failed to load — check your internet connection.";
      return;
    }
    const F = Html5QrcodeSupportedFormats;
    scanner = scanner || new Html5Qrcode("reader", {
      formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E],
      verbose: false,
    });
    reader.hidden = false;
    scanBtn.textContent = "✖ Stop scanning";
    scanMsg.textContent = "Point the camera at the barcode.";
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 130 } },
        onScan,
        () => {}
      );
      scanning = true;
    } catch (err) {
      reader.hidden = true;
      scanBtn.textContent = "📷 Scan barcode";
      scanMsg.textContent = "Couldn't open the camera. Allow camera access, or type the barcode below.";
    }
  }

  async function stopScan() {
    if (scanner && scanning) {
      try { await scanner.stop(); } catch {}
    }
    scanning = false;
    reader.hidden = true;
    scanBtn.textContent = "📷 Scan barcode";
  }

  async function onScan(code) {
    if (busy) return;
    if (navigator.vibrate) navigator.vibrate(60);
    await stopScan();
    lookup(code);
  }

  scanBtn.addEventListener("click", () => (scanning ? stopScan() : startScan()));

  $("manualForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("manualInput").value.replace(/\D/g, "");
    if (code.length >= 6) lookup(code);
    else scanMsg.textContent = "Enter a valid barcode number.";
  });

  // ---------- Lookup ----------
  async function lookup(code) {
    busy = true;
    scanMsg.textContent = "";
    resultEl.hidden = false;
    resultEl.className = "card result";
    resultEl.innerHTML = `<p class="muted">Looking up <b>${esc(code)}</b>…</p>`;
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) return renderNotFound(code);
      const product = { code, ...data.product };
      const result = HalalCheck.check(product);
      render(product, result);
      saveHistory(product, result);
    } catch {
      resultEl.innerHTML = `<p>Couldn't reach the product database. Check your connection and try again.</p>`;
    } finally {
      busy = false;
    }
  }

  // ---------- Rendering ----------
  function list(items, cls) {
    return items.map((i) => `<li class="${cls}"><b>${esc(i.term)}</b> — ${esc(i.why)}</li>`).join("");
  }

  function highlight(text, items) {
    let html = esc(text);
    for (const { term, cls } of items) {
      if (!term || term.length < 3 || /^E\d/.test(term)) continue; // E-numbers rarely appear verbatim
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      html = html.replace(re, `<mark class="${cls}">$1</mark>`);
    }
    return html;
  }

  function render(p, r) {
    const name = p.product_name_en || p.product_name || "Unnamed product";
    const flagged = [
      ...r.haram.map((i) => ({ ...i, cls: "haram" })),
      ...r.doubtful.map((i) => ({ ...i, cls: "doubtful" })),
      ...r.note.map((i) => ({ ...i, cls: "note" })),
    ];

    resultEl.className = `card result v-${r.verdict}`;
    resultEl.innerHTML = `
      <div class="product">
        ${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="">` : ""}
        <div>
          <h2>${esc(name)}</h2>
          <p class="muted small">${esc(p.brands || "")} · ${esc(p.code)}</p>
        </div>
      </div>
      <div class="verdict">
        <span class="icon">${ICONS[r.verdict]}</span>
        <div><strong>${esc(r.title)}</strong><p>${esc(r.summary)}</p></div>
      </div>
      ${r.haram.length ? `<h3>Haram</h3><ul class="flags">${list(r.haram, "haram")}</ul>` : ""}
      ${r.doubtful.length ? `<h3>Doubtful</h3><ul class="flags">${list(r.doubtful, "doubtful")}</ul>` : ""}
      ${r.note.length ? `<h3>Good to know</h3><ul class="flags">${list(r.note, "note")}</ul>` : ""}
      ${r.ingredientsText ? `
        <details>
          <summary>Full ingredients</summary>
          <p class="ingredients">${highlight(r.ingredientsText, flagged)}</p>
        </details>` : ""}
      <p class="small"><a href="https://world.openfoodfacts.org/product/${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Wrong or missing info? Fix it on Open Food Facts →</a></p>
    `;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderNotFound(code) {
    resultEl.className = "card result v-unknown";
    resultEl.innerHTML = `
      <div class="verdict">
        <span class="icon">❔</span>
        <div><strong>Product not found</strong>
        <p>Barcode ${esc(code)} isn't in Open Food Facts yet. You can add it with their free app, then scan again.</p></div>
      </div>
      <p class="small"><a href="https://world.openfoodfacts.org/contribute" target="_blank" rel="noopener">How to add a product →</a></p>`;
  }

  // ---------- History (kept on this device only) ----------
  const KEY = "halal-history";
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };

  function saveHistory(p, r) {
    const item = { code: p.code, name: p.product_name_en || p.product_name || p.code, verdict: r.verdict };
    const h = [item, ...loadHistory().filter((x) => x.code !== item.code)].slice(0, 20);
    try { localStorage.setItem(KEY, JSON.stringify(h)); } catch {}
    renderHistory();
  }

  function renderHistory() {
    const h = loadHistory();
    historyWrap.hidden = h.length === 0;
    historyEl.innerHTML = h
      .map((x) => `<li><button data-code="${esc(x.code)}"><span>${ICONS[x.verdict] || "❔"}</span>${esc(x.name)}</button></li>`)
      .join("");
  }

  historyEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-code]");
    if (btn) lookup(btn.dataset.code);
  });
  $("clearHistory").addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch {}
    renderHistory();
  });

  renderHistory();
})();
