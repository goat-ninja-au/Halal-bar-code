// halal.js — rules that decide whether a product looks halal.
// Works in the browser (window.HalalCheck) and in Node (module.exports) for testing.
(function (root) {
  const norm = (s) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // ---- Ingredient keyword rules -------------------------------------------
  // level: "haram" = clearly not halal, "doubtful" = depends on the source,
  // "note" = worth knowing but doesn't change the verdict.
  // animal: true = could only be a problem if it comes from an animal,
  // so a vegan/vegetarian label clears it.
  const WORD_RULES = [
    // Haram
    { level: "haram", re: /\b(pork|pig|swine|porc|cerdo|schwein\w*)\b/g, why: "Pork" },
    { level: "haram", re: /\b(lard|saindoux)\b/g, why: "Lard (pork fat)" },
    { level: "haram", re: /\b(bacon|ham|prosciutto|pancetta|chorizo)\b/g, why: "Pork product" },
    { level: "haram", re: /\b(wine|beer|rum|brandy|whisky|whiskey|vodka|liqueur|cognac|sherry|sake|mirin|champagne|bourbon|cider)\b(?!\s*vinegar)/g, why: "Alcoholic drink" },
    { level: "haram", re: /(?<!sugar\s)\b(alcohol|ethanol)\b/g, why: "Alcohol" },

    // Doubtful – source unknown, or scholars differ
    { level: "doubtful", re: /\b(carmine|cochineal|carminic acid)\b/g, why: "Carmine – red colour made from insects. Hanafi scholars say haram; many others allow it" },
    { level: "doubtful", animal: true, re: /\b(gelatine?|gelatina)\b/g, why: "Gelatine – often from pork unless stated halal/beef/fish" },
    { level: "doubtful", animal: true, re: /\b(rennet|animal enzymes?)\b/g, why: "Rennet – may come from non-halal animals" },
    { level: "doubtful", animal: true, re: /\bwhey\b/g, why: "Whey – made with rennet, source unknown" },
    { level: "doubtful", animal: true, re: /\bmono[\s-]*(and|&)?[\s-]*di[\s-]*glycerides\b/g, why: "Mono- & diglycerides – can be animal fat" },
    { level: "doubtful", animal: true, re: /\b(glycerine?|glycerol)\b/g, why: "Glycerine – can be animal fat" },
    { level: "doubtful", animal: true, re: /\bl[\s-]?cysteine\b/g, why: "L-cysteine – can come from feathers or hair" },
    { level: "doubtful", animal: true, re: /\b(tallow|animal fat|shortening|dripping)\b/g, why: "Animal fat – source unknown" },
    { level: "doubtful", animal: true, re: /\b(beef|chicken|lamb|mutton|veal|turkey|goat|duck)\b/g, why: "Meat – must be halal-slaughtered" },

    // Notes
    { level: "note", re: /\b(natural )?flavou?rs?(ings?)?\b/g, why: "Flavouring – may use an alcohol carrier" },
    { level: "note", re: /\bvanilla extract\b/g, why: "Vanilla extract – usually contains alcohol" },
    { level: "note", re: /\b(wine|cider|sherry) vinegar\b/g, why: "Wine vinegar – most scholars consider it halal" },
  ];

  // ---- E-number rules -----------------------------------------------------
  const ADDITIVE_RULES = {
    e120: { level: "doubtful", why: "E120 Carmine – red colour made from insects. Hanafi scholars say haram; many others allow it" },
  };
  const DOUBTFUL_ADDITIVES = {
    e441: "Gelatine", e422: "Glycerol", e470a: "Fatty acid salts", e470b: "Fatty acid salts",
    e471: "Mono- & diglycerides", e472a: "Fatty acid esters", e472b: "Fatty acid esters",
    e472c: "Fatty acid esters", e472d: "Fatty acid esters", e472e: "Fatty acid esters",
    e472f: "Fatty acid esters", e473: "Sucrose esters", e474: "Sucroglycerides",
    e475: "Polyglycerol esters", e477: "Propylene glycol esters",
    e481: "Sodium stearoyl lactylate", e482: "Calcium stearoyl lactylate",
    e491: "Sorbitan monostearate", e492: "Sorbitan tristearate", e493: "Sorbitan monolaurate",
    e494: "Sorbitan monooleate", e495: "Sorbitan monopalmitate", e542: "Bone phosphate",
    e570: "Stearic acid", e572: "Magnesium stearate", e627: "Disodium guanylate",
    e631: "Disodium inosinate", e635: "Disodium ribonucleotides", e920: "L-cysteine",
  };
  for (const [code, name] of Object.entries(DOUBTFUL_ADDITIVES)) {
    ADDITIVE_RULES[code] = {
      level: "doubtful",
      animal: true,
      why: `${code.toUpperCase()} ${name} – can be from animal sources`,
    };
  }

  function check(product) {
    const rawText = [product.ingredients_text_en, product.ingredients_text]
      .filter(Boolean)
      .join(" ; ");
    const tagText = (product.ingredients_tags || [])
      .map((t) => t.split(":").pop().replace(/-/g, " "))
      .join(" ; ");
    const hay = norm(rawText + " ; " + tagText);

    const additives = new Set(
      (product.additives_tags || []).map((t) => t.split(":").pop().toLowerCase())
    );
    // E-numbers written as "E471", "INS 471", or Australian-style "emulsifier (471, 472e)"
    for (const m of hay.matchAll(/\b(?:e|ins)\s?-?(\d{3,4}[a-f]?)\b/g)) additives.add("e" + m[1]);
    for (const grp of hay.matchAll(/\(([^)]*)\)/g)) {
      for (const m of grp[1].matchAll(/\b(\d{3,4}[a-f]?)\b/g)) additives.add("e" + m[1]);
    }

    const labels = norm((product.labels_tags || []).join(" ") + " " + (product.labels || ""));
    const certified = /halal/.test(labels);
    const veg = /\b(vegan|vegetarian)\b/.test(labels);

    const found = { haram: [], doubtful: [], note: [] };
    const seen = new Set();
    const add = (rule, term) => {
      if (rule.animal && veg) return; // vegan/vegetarian label rules out animal sources
      const key = rule.level + rule.why;
      if (seen.has(key)) return;
      seen.add(key);
      found[rule.level].push({ why: rule.why, term });
    };

    for (const rule of WORD_RULES) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(hay);
      if (m) add(rule, m[0]);
    }
    for (const code of additives) {
      if (ADDITIVE_RULES[code]) add(ADDITIVE_RULES[code], code.toUpperCase());
    }

    const hasData = hay.replace(/[\s;]/g, "").length > 0 || additives.size > 0;
    let verdict, title, summary;

    if (found.haram.length && certified) {
      verdict = "doubtful";
      title = "Check carefully";
      summary = "It has a halal label, but the ingredients list something that is normally haram.";
    } else if (found.haram.length) {
      verdict = "haram";
      title = "Not halal";
      summary = "Contains an ingredient that is haram.";
    } else if (certified) {
      verdict = "halal";
      title = "Halal certified";
      summary = "This product carries a halal certification label.";
    } else if (!hasData) {
      verdict = "unknown";
      title = "No ingredient info";
      summary = "This product is in the database, but nobody has added its ingredients yet.";
    } else if (found.doubtful.length) {
      verdict = "doubtful";
      title = "Doubtful (mushbooh)";
      summary = "Some ingredients could be from a non-halal source. Look for a halal logo or check with the maker.";
    } else {
      verdict = "clear";
      title = "No haram ingredients found";
      summary = "Nothing haram or doubtful was found, but it isn't halal certified.";
    }

    return { verdict, title, summary, certified, veg, ...found, ingredientsText: rawText };
  }

  const api = { check };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HalalCheck = api;
})(typeof window !== "undefined" ? window : globalThis);
