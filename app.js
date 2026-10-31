// app.js — scanning, Open Food Facts lookup, label photo reading, rendering.
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
  const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // The product currently on screen (from the database, or a placeholder for a manual check)
  let current = null;

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
    } catch {
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

  $("ingredientsBtn").addEventListener("click", async () => {
    await stopScan();
    current = { code: "", product_name: "Ingredients you checked", manual: true };
    resultEl.hidden = false;
    resultEl.className = "card result";
    resultEl.innerHTML = `
      <h2 class="tools-title">Check from the ingredients</h2>
      <p class="muted small">Take a clear photo of just the ingredients list, or type it in.</p>
      ${toolsHTML("", true)}`;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Lookup ----------
  // Barcodes can be stored with or without a leading 0 (UPC-A vs EAN-13), so try both.
  function codeVariants(code) {
    const v = [code];
    if (code.length === 12) v.push("0" + code);
    if (code.length === 13 && code.startsWith("0")) v.push(code.slice(1));
    return v;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Open Food Facts sometimes answers with an HTML "too busy" page instead of JSON — retry those.
  async function fetchJSON(url, tries = 3) {
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetch(url);
        if (res.status === 404) return { status: 0 };
        if (res.ok) return await res.json();
      } catch {}
      if (i < tries - 1) await sleep(1200 * (i + 1));
    }
    throw new Error("database busy");
  }

  async function fetchProduct(code) {
    for (const c of codeVariants(code)) {
      const data = await fetchJSON(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=${FIELDS}`
      );
      if (data.status === 1 && data.product) return { code: c, ...data.product };
    }
    return null;
  }

  // ---------- Labels you've photographed or typed (saved on this device) ----------
  const LABELS_KEY = "halal-labels";
  const loadLabels = () => {
    try { return JSON.parse(localStorage.getItem(LABELS_KEY)) || {}; } catch { return {}; }
  };
  function saveLabel(code, name, text) {
    if (!code) return;
    const all = loadLabels();
    all[code] = { name, text };
    try { localStorage.setItem(LABELS_KEY, JSON.stringify(all)); } catch {}
  }

  async function lookup(code) {
    busy = true;
    scanMsg.textContent = "";
    resultEl.hidden = false;
    resultEl.className = "card result";
    resultEl.innerHTML = `<p class="muted">Looking up <b>${esc(code)}</b>…</p>`;
    try {
      const product = await fetchProduct(code);
      const saved = loadLabels()[code];
      const hasIngredients = product && (product.ingredients_text || product.ingredients_text_en ||
        (product.ingredients_tags || []).length);
      if (saved && !hasIngredients) {
        current = product || { code, product_name: saved.name };
        return checkText(saved.text, true);
      }
      if (!product) return renderNotFound(code);
      current = product;
      const result = HalalCheck.check(product);
      render(product, result);
      saveHistory(product, result);
    } catch {
      const saved = loadLabels()[code];
      if (saved) {
        current = { code, product_name: saved.name };
        return checkText(saved.text, true);
      }
      current = { code, product_name: `Barcode ${code}` };
      resultEl.className = "card result v-unknown";
      resultEl.innerHTML = `
        <div class="verdict">
          <span class="icon">⏳</span>
          <div><strong>Database is busy</strong>
          <p>Open Food Facts didn't answer. Try again in a moment — or check from a photo of the ingredients now.</p></div>
        </div>
        <button class="btn" type="button" data-retry="${esc(code)}">↻ Try again</button>
        ${toolsHTML()}`;
    } finally {
      busy = false;
    }
  }

  // ---------- Photo / typed ingredients ----------
  function toolsHTML(prefill = "", open = false) {
    return `
      <div class="tools">
        <label class="btn tool">📸 Photo of ingredients
          <input type="file" accept="image/*" capture="environment" data-ocr hidden>
        </label>
        <button class="btn tool" type="button" data-type>✏️ Type them in</button>
      </div>
      <div class="ocr" ${open || prefill ? "" : "hidden"}>
        <p class="muted small" data-status></p>
        <textarea rows="6" placeholder="Paste or type the ingredients list…">${esc(prefill)}</textarea>
        <button class="btn primary" type="button" data-check>Check these ingredients</button>
      </div>`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Shrink big phone photos so text reading is quicker, and convert to greyscale.
  async function prepareImage(file) {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.filter = "grayscale(1) contrast(1.3)";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function readLabel(file, statusEl, textarea, ocrBox) {
    ocrBox.hidden = false;
    try {
      if (!window.Tesseract) {
        statusEl.textContent = "Loading the text reader (first time only)…";
        await loadScript(TESSERACT_URL);
      }
      const image = await prepareImage(file);
      statusEl.textContent = "Reading the label…";
      const { data } = await Tesseract.recognize(image, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text")
            statusEl.textContent = `Reading the label… ${Math.round(m.progress * 100)}%`;
        },
      });
      const text = data.text.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
      if (text.length < 10) {
        statusEl.textContent = "Couldn't read much text. Try a closer, sharper photo in good light — or type it in.";
        return;
      }
      textarea.value = text;
      checkText(text);
    } catch {
      statusEl.textContent = "Couldn't read the photo. Try again, or type the ingredients in.";
    }
  }

  function checkText(text, fromSaved = false) {
    if (!text.trim()) return;
    const base = current || { code: "", product_name: "Ingredients you checked" };
    const product = {
      code: base.code,
      product_name: base.product_name_en || base.product_name || "Ingredients you checked",
      brands: base.brands,
      image_front_small_url: base.image_front_small_url,
      labels_tags: base.labels_tags,
      labels: base.labels,
      ingredients_text: text,
    };
    const result = HalalCheck.check(product);
    render(product, result, { manualText: text, fromSaved });
    if (product.code) {
      saveLabel(product.code, product.product_name, text);
      saveHistory(product, result);
    }
  }

  resultEl.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-ocr]");
    if (!input || !input.files[0]) return;
    const card = input.closest(".card");
    readLabel(
      input.files[0],
      card.querySelector("[data-status]"),
      card.querySelector("textarea"),
      card.querySelector(".ocr")
    );
    input.value = "";
  });

  resultEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-type]")) {
      const box = resultEl.querySelector(".ocr");
      box.hidden = false;
      box.querySelector("textarea").focus();
    }
    const retry = e.target.closest("[data-retry]");
    if (retry) lookup(retry.dataset.retry);
    if (e.target.closest("[data-check]")) {
      checkText(resultEl.querySelector("textarea").value);
    }
  });

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

  function render(p, r, opts = {}) {
    const name = p.product_name_en || p.product_name || "Unnamed product";
    const flagged = [
      ...r.haram.map((i) => ({ ...i, cls: "haram" })),
      ...r.doubtful.map((i) => ({ ...i, cls: "doubtful" })),
      ...r.note.map((i) => ({ ...i, cls: "note" })),
    ];
    const needsLabel = r.verdict === "unknown";
    const meta = [p.brands, p.code].filter(Boolean).map(esc).join(" · ");
    const summary = needsLabel && !opts.manualText
      ? "Nobody has added this product's ingredients yet. Take a photo of the ingredients and I'll check them."
      : r.summary;

    resultEl.className = `card result v-${r.verdict}`;
    resultEl.innerHTML = `
      <div class="product">
        ${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="">` : ""}
        <div>
          <h2>${esc(name)}</h2>
          ${meta ? `<p class="muted small">${meta}</p>` : ""}
        </div>
      </div>
      <div class="verdict">
        <span class="icon">${ICONS[r.verdict]}</span>
        <div><strong>${esc(r.title)}</strong><p>${esc(summary)}</p></div>
      </div>
      ${opts.fromSaved
        ? `<p class="small muted from-photo">Using the ingredients label you saved for this barcode.</p>`
        : opts.manualText ? `<p class="small muted from-photo">Checked from the ingredients you gave — double-check any words the photo misread.</p>` : ""}
      ${r.haram.length ? `<h3>Haram</h3><ul class="flags">${list(r.haram, "haram")}</ul>` : ""}
      ${r.doubtful.length ? `<h3>Doubtful</h3><ul class="flags">${list(r.doubtful, "doubtful")}</ul>` : ""}
      ${r.note.length ? `<h3>Good to know</h3><ul class="flags">${list(r.note, "note")}</ul>` : ""}
      ${needsLabel || opts.manualText
        ? toolsHTML(opts.manualText || "")
        : r.ingredientsText ? `
        <details>
          <summary>Full ingredients</summary>
          <p class="ingredients">${highlight(r.ingredientsText, flagged)}</p>
        </details>
        <details class="wrong">
          <summary>Ingredients look wrong? Check from a photo</summary>
          ${toolsHTML()}
        </details>` : ""}
      ${p.code ? `<p class="small"><a href="https://world.openfoodfacts.org/product/${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Add or fix this product on Open Food Facts →</a></p>` : ""}
    `;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderNotFound(code) {
    current = { code, product_name: `Barcode ${code}` };
    resultEl.className = "card result v-unknown";
    resultEl.innerHTML = `
      <div class="verdict">
        <span class="icon">❔</span>
        <div><strong>Product not in the database</strong>
        <p>Barcode ${esc(code)} isn't in Open Food Facts yet. Take a photo of the ingredients and I'll check them instead.</p></div>
      </div>
      ${toolsHTML()}
      <p class="small"><a href="https://world.openfoodfacts.org/contribute" target="_blank" rel="noopener">Add it to Open Food Facts so it scans next time →</a></p>`;
  }

  // ---------- Search by name ----------
  const searchForm = $("searchForm"), searchInput = $("searchInput"), searchResults = $("searchResults");
  const VERDICT_WORD = { halal: "Certified", clear: "OK", doubtful: "Doubtful", haram: "Haram", unknown: "No info" };
  const isAU = (p) => ((p.countries_tags || []).includes("en:australia") ? 1 : 0);
  let lastResults = [];

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q.length < 2) return;
    searchInput.blur();
    await stopScan();
    resultEl.hidden = true;
    searchResults.hidden = false;
    searchResults.innerHTML = `<p class="muted">Searching for <b>${esc(q)}</b>…</p>`;
    searchResults.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const data = await fetchJSON(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS},countries_tags`
      );
      const products = (data.products || []).filter((p) => p.code && (p.product_name || p.product_name_en));
      products.sort((a, b) => isAU(b) - isAU(a)); // Australian products first
      lastResults = products;
      renderSearch(q, products);
    } catch {
      searchResults.innerHTML = `<p>Search is busy right now — try again in a moment.</p>`;
    }
  });

  function renderSearch(q, products) {
    const head = `<div class="row"><h2>Results for “${esc(q)}”</h2><button class="link" type="button" data-close>Close</button></div>`;
    if (!products.length) {
      searchResults.innerHTML = `${head}
        <p class="muted small">Nothing found. Try the brand plus the product name (e.g. “Arnott's Tim Tam”), or scan the barcode / photograph the ingredients instead.</p>`;
      return;
    }
    searchResults.innerHTML = `${head}
      <ul class="results">${products.map((p, i) => {
        const r = HalalCheck.check(p);
        const name = p.product_name_en || p.product_name;
        const brand = (p.brands || "").split(",")[0];
        return `<li><button type="button" data-i="${i}">
          ${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" loading="lazy">` : `<span class="noimg">🛒</span>`}
          <span class="r-text"><b>${esc(name)}</b><span class="muted small">${esc(brand)}${isAU(p) ? " · 🇦🇺" : ""}</span></span>
          <span class="r-verdict v-${r.verdict}">${ICONS[r.verdict]}<small>${VERDICT_WORD[r.verdict]}</small></span>
        </button></li>`;
      }).join("")}</ul>
      <p class="muted small">Tap a product for the full breakdown.</p>`;
  }

  searchResults.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { searchResults.hidden = true; return; }
    const btn = e.target.closest("button[data-i]");
    if (!btn) return;
    const p = lastResults[+btn.dataset.i];
    current = p;
    resultEl.hidden = false;
    const saved = loadLabels()[p.code];
    const r = HalalCheck.check(p);
    if (r.verdict === "unknown" && saved) return checkText(saved.text, true);
    render(p, r);
    saveHistory(p, r);
  });

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
