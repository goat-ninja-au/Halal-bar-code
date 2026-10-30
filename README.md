# Halal Scanner

Scan a food barcode with your phone and get an instant halal check.

**Live:** https://goat-ninja-au.github.io/Halal-bar-code/

## How it works
1. The camera reads the barcode (EAN-13 / EAN-8 / UPC) using [html5-qrcode](https://github.com/mebjas/html5-qrcode).
2. The product is looked up in [Open Food Facts](https://world.openfoodfacts.org), a free open food database.
3. `halal.js` checks the ingredients, E-numbers and labels and gives one of these verdicts:

| Verdict | Meaning |
|---|---|
| ✅ Halal certified | Product has a halal label |
| 🟢 No haram ingredients found | Nothing flagged, but not certified |
| ⚠️ Doubtful (mushbooh) | Something could come from a non-halal source (gelatine, E471, rennet…) |
| ❌ Not halal | Contains pork, alcohol, carmine (E120) etc. |
| ❔ Unknown | Product or ingredients missing from the database |

A vegan/vegetarian label clears the "could be animal" warnings.

## Files
- `index.html` – the page
- `app.js` – scanning, lookup, display, scan history
- `halal.js` – the halal rules (edit this to add or change ingredients)
- `style.css` – styling (light + dark mode)
- `test.js` – rule tests, run with `node test.js`

## Disclaimer
Guidance only. Always check for a trusted halal certification logo.
