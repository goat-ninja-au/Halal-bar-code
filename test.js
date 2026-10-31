// Quick tests for the halal rules: node test.js
const { check } = require("./halal.js");
const cases = [
  ["Gummy bears", { ingredients_text: "Glucose syrup, sugar, gelatine, citric acid, colour (120)", additives_tags: ["en:e120"] }, "doubtful"],
  ["Halal certified chips", { ingredients_text: "Potatoes, vegetable oil, salt, natural flavour", labels_tags: ["en:halal"] }, "halal"],
  ["Bread with E471", { ingredients_text: "Wheat flour, water, yeast, emulsifier (471)", additives_tags: ["en:e471"] }, "doubtful"],
  ["Vegan bread with E471", { ingredients_text: "Wheat flour, water, emulsifier (471)", additives_tags: ["en:e471"], labels_tags: ["en:vegan"] }, "clear"],
  ["Salad dressing", { ingredients_text: "Oil, red wine vinegar, sugar alcohol, salt" }, "clear"],
  ["Pasta sauce with wine", { ingredients_text: "Tomatoes, red wine, basil" }, "haram"],
  ["Hamburger buns (not ham)", { ingredients_text: "Flour, water, sugar, yeast" }, "clear"],
  ["Pork sausages", { ingredients_text: "Pork (85%), water, rice flour" }, "haram"],
  ["No ingredients", {}, "unknown"],
  ["AU style emulsifier (no tags)", { ingredients_text: "Flour, sugar, emulsifiers (471, 481), salt" }, "doubtful"],
  ["AU style colour 120 (no tags)", { ingredients_text: "Sugar, water, colour (120)" }, "doubtful"],
  ["Tim Tam (cochineal, PGPR)", { ingredients_text: "Milk chocolate (sugar, milk solids, emulsifiers (soy lecithin, 476)), wheat flour, colours (beet red, cochineal)", additives_tags: ["en:e120", "en:e476"] }, "doubtful"],
  ["PGPR alone is fine", { ingredients_text: "Cocoa butter, sugar, emulsifier (476)", additives_tags: ["en:e476"] }, "clear"],
  ["Pork gelatine is haram", { ingredients_text: "Sugar, pork gelatine, colour (120)" }, "haram"],
  ["Percentages and weights are not E-numbers", { ingredients_text: "Oats (85%), honey (500g pack), salt" }, "clear"],
  ["OCR text with INS code", { ingredients_text: "INGREDIENTS: SUGAR, GLUCOSE, INS 441, CITRIC ACID" }, "doubtful"],
];
let fail = 0;
for (const [name, p, want] of cases) {
  const r = check(p);
  const ok = r.verdict === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${r.verdict}${ok ? "" : ` (wanted ${want})`}`);
}
process.exit(fail ? 1 : 0);
