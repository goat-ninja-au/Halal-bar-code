// restaurants.js — halal status of fast food chains in Australia.
// Keep every entry backed by a source. Update "checked" when you re-verify.
// status: "halal" | "chicken" | "some" | "notcert" | "no"
(function (root) {
  const CHECKED = "Oct 2026";

  const STATUS = {
    halal:   { icon: "✅", label: "Halal certified chicken", cls: "halal" },
    chicken: { icon: "🟡", label: "Halal chicken — store not certified", cls: "doubtful" },
    some:    { icon: "📍", label: "Only some stores are halal", cls: "unknown" },
    notcert: { icon: "⚠️", label: "Not halal certified", cls: "doubtful" },
    no:      { icon: "❌", label: "Not halal certified", cls: "haram" },
  };

  const CHAINS = [
    {
      id: "eljannah", name: "El Jannah", aliases: ["el jannah", "eljannah", "el janna"],
      status: "halal",
      summary: "All El Jannah chicken comes from halal-certified suppliers.",
      points: [
        "Chicken is from 100% halal-certified suppliers (Cordina / Turosi, certified by ANIC and AMO Saudi).",
        "You can ask to see the current halal certificate at any El Jannah.",
      ],
      cautions: ["The chicken is halal certified but not hand-slaughtered."],
      sources: [{ title: "El Jannah — Halal FAQs", url: "https://eljannah.com.au/?p=3432" }],
    },
    {
      id: "redrooster", name: "Red Rooster", aliases: ["red rooster", "redrooster", "rooster"],
      status: "chicken",
      summary: "Red Rooster's chicken, gravy and chips are halal certified, but the restaurants aren't.",
      points: [
        "Chicken is halal certified by their suppliers.",
        "Signature gravy and chips are also halal certified.",
      ],
      cautions: ["Restaurants aren't halal certified — Red Rooster says it can't fully rule out cross-contamination."],
      sources: [{ title: "Red Rooster — FAQ", url: "https://redrooster.com.au/faq" }],
    },
    {
      id: "oporto", name: "Oporto", aliases: ["oporto", "o porto"],
      status: "chicken",
      summary: "Oporto's chicken is halal certified, but the stores aren't.",
      points: ["Halal chicken includes whole chickens, grilled fillets, crispy strips, Bolas and grilled tenders."],
      cautions: [
        "Stores aren't halal certified — Oporto can't guarantee no cross-contamination.",
        "Oporto says it's up to you whether this counts as halal.",
      ],
      sources: [{ title: "Oporto — FAQs (“Is your menu halal?”)", url: "https://web2.tst.oporto.com.au/faqs/" }],
    },
    {
      id: "gyg", name: "Guzman y Gomez", aliases: ["guzman y gomez", "guzman", "gyg", "guzman and gomez"],
      status: "chicken",
      summary: "GYG uses halal-certified chicken at every Australian store.",
      points: ["Chicken is halal certified across all locations, Australia-wide."],
      cautions: [
        "The Guerrero marinade isn't halal certified.",
        "Restaurant processes aren't certified, and GYG takes no extra steps to keep halal and non-halal ingredients apart.",
      ],
      sources: [{ title: "GYG Help Centre — Is GYG Halal?", url: "https://help-centre.guzmanygomez.com.au/hc/en-us/articles/11840857062159-Is-GYG-Halal" }],
    },
    {
      id: "kfc", name: "KFC", aliases: ["kfc", "kentucky", "kentucky fried chicken"],
      status: "chicken",
      summary: "KFC's chicken comes from suppliers that say their chicken is halal certified, but KFC stores aren't halal certified.",
      points: [
        "Main chicken suppliers (Inghams, Baiada/Steggles, Turi Foods) say their chicken is halal certified.",
        "In 2015 KFC said it had only 3 halal-certified stores nationally.",
        "KFC Punchbowl and KFC Bankstown South (NSW) were reported as not selling bacon.",
      ],
      cautions: [
        "Most KFC stores sell bacon, and some seasonings/marinades aren't halal certified.",
        "We couldn't find a current official halal statement from KFC Australia — ask the store to show a certificate.",
      ],
      sources: [
        { title: "SmartCompany (2015) — KFC spokesperson on halal stores", url: "https://www.smartcompany.com.au/marketing/facebook-group-boycotts-kfc-store-after-confusing-no-bacon-notice-for-halal-certification/" },
        { title: "Halal Advisor (2020) — Halal KFC in Sydney", url: "https://halaladvisor.com.au/halal-kfc-in-sydney/" },
      ],
    },
    {
      id: "mcdonalds", name: "McDonald's", aliases: ["mcdonalds", "mcdonald's", "maccas", "macca's", "mcds", "macdonalds", "mcd"],
      status: "some",
      summary: "Only 21 McDonald's in Australia serve halal options — and only the items on that store's certificate are halal.",
      points: ["Everywhere else, McDonald's isn't halal."],
      stores: {
        NSW: ["Punchbowl", "Liverpool", "Auburn", "Bankstown", "Lidcombe", "Lakemba", "Greenacre North", "Greenacre", "Rockdale", "Centro Bankstown", "Granville"],
        ACT: ["Braddon", "Gungahlin"],
        VIC: ["Preston", "St Albans", "Brunswick East", "Roxburgh Park", "Wyndham Waters", "Dandenong"],
        WA: ["Mirrabooka", "Ballajura"],
      },
      cautions: ["No halal McDonald's listed in QLD, SA, TAS or NT.", "Check the certificate in store — not every item is covered."],
      sources: [{ title: "McDonald's Australia — Do you have any halal menu options?", url: "https://www.mcdonalds.com/au/en-au/help-centre/do-you-have-any-halal-menu-options.html" }],
    },
    {
      id: "grilld", name: "Grill'd", aliases: ["grilld", "grill'd", "grill d"],
      status: "some",
      summary: "Grill'd opened its first halal-certified restaurant in Blacktown, NSW. Other stores aren't halal certified.",
      points: ["Blacktown uses halal-certified suppliers, removes bacon and serves no alcohol."],
      stores: { NSW: ["Blacktown"] },
      cautions: ["We found no halal certification for any other Grill'd store."],
      sources: [{ title: "Inside Retail (2023) — Grill'd to open its first halal-certified restaurant", url: "https://insideretail.com.au/sectors/food-beverage/grilld-to-open-its-first-halal-certified-restaurant-202305" }],
    },
    {
      id: "hungryjacks", name: "Hungry Jack's", aliases: ["hungry jacks", "hungry jack's", "hj", "hjs", "hungry jack", "burger king"],
      status: "some",
      summary: "Hungry Jack's has no official chain-wide halal statement. A few stores in Sydney and Melbourne are reported to be halal.",
      points: ["Halal stores have been reported around western Sydney and northern/western Melbourne (e.g. Bankstown, Auburn, Granville, Coolaroo, Roxburgh Park)."],
      cautions: ["These are community reports, not confirmed by Hungry Jack's — always ask to see the certificate.", "Most stores sell bacon."],
      sources: [
        { title: "Halal Advisor — Halal Hungry Jacks in Sydney", url: "https://halaladvisor.com.au/halal-hungry-jacks-in-sydney/" },
        { title: "Halal Advisor — Halal Hungry Jack's in Melbourne", url: "https://halaladvisor.com.au/halal-hungry-jacks-in-melbourne/" },
      ],
    },
    {
      id: "nandos", name: "Nando's", aliases: ["nandos", "nando's", "nando"],
      status: "notcert",
      summary: "Nando's isn't halal certified. In Queensland, its chicken supplier isn't halal certified either.",
      points: [
        "All bastings (sauces/marinades) are halal.",
        "Outside QLD, many suppliers are halal certified — but Nando's doesn't pay for certification.",
      ],
      cautions: [
        "QLD: chicken is NOT from a halal-certified supplier.",
        "Ribs in WA, SA, ACT, NSW and QLD aren't halal certified.",
        "Grills are shared with bacon and non-certified ribs/chicken.",
      ],
      sources: [{ title: "Nando's Help — Do you provide Halal or Kosher meals?", url: "https://help.nandos.com.au/hc/en-au/articles/54016279945241-Do-you-provide-Halal-or-Kosher-meals" }],
    },
    {
      id: "dominos", name: "Domino's", aliases: ["dominos", "domino's", "domino"],
      status: "no",
      summary: "We couldn't find any halal certification for Domino's in Australia.",
      points: [],
      cautions: ["The menu includes pork (ham, bacon, pepperoni) and they're prepared in the same kitchen."],
      sources: [],
    },
    {
      id: "pizzahut", name: "Pizza Hut", aliases: ["pizza hut", "pizzahut"],
      status: "no",
      summary: "We couldn't find any halal certification for Pizza Hut in Australia.",
      points: [],
      cautions: ["The menu includes pork (ham, bacon, pepperoni) and they're prepared in the same kitchen."],
      sources: [],
    },
    {
      id: "subway", name: "Subway", aliases: ["subway"],
      status: "no",
      summary: "We couldn't find any halal-certified Subway stores in Australia.",
      points: [],
      cautions: ["The menu includes ham and bacon, prepared on the same counter."],
      sources: [],
    },
  ];

  const norm = (s) => (s || "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const flat = (s) => norm(s).replace(/[^a-z0-9]/g, "");

  function find(query) {
    const q = norm(query), qf = flat(query);
    if (!qf) return null;
    return CHAINS.find((c) =>
      c.aliases.some((a) => norm(a) === q || flat(a) === qf) ||
      (qf.length >= 4 && c.aliases.some((a) => flat(a).startsWith(qf)))
    ) || null;
  }


  // ---------- Store-level rules ----------
  // Each rule gets (suburb, stateCode) for a specific store and returns
  // { status, title, note } — or null to fall back to the chain's general status.
  const STATE_CODES = {
    "new south wales": "NSW", "victoria": "VIC", "queensland": "QLD", "western australia": "WA",
    "south australia": "SA", "tasmania": "TAS", "australian capital territory": "ACT", "northern territory": "NT",
  };
  const sub = (s) => norm(s).replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
  const inList = (list, suburb) => {
    const x = sub(suburb);
    return !!x && list.some((l) => { const y = sub(l); return y === x || y.endsWith(" " + x) || x.endsWith(" " + y); });
  };
  const listFor = (stores, state) => (state && stores[state]) || Object.values(stores).flat();

  // Hungry Jack's stores listed as halal on Zabihah (community listings, not confirmed by HJ)
  const HJ_REPORTED = {
    NSW: ["Bankstown", "Wiley Park", "Granville", "Auburn", "Casula", "Greenacre", "St Peters"],
    VIC: ["Deer Park", "Coolaroo", "Craigieburn", "Narre Warren", "Hallam", "Roxburgh Park", "Jacana", "Truganina", "Campbellfield", "Dandenong"],
  };
  const KFC_NO_BACON = { NSW: ["Punchbowl", "Bankstown South"] };

  const STORE_RULES = {
    mcdonalds: (suburb, state) => inList(listFor(CHAINS.find((c) => c.id === "mcdonalds").stores, state), suburb)
      ? { status: "halal", title: "Halal McDonald's", note: "This suburb has a McDonald's on the official halal list. Only items on the store's certificate are halal — and if the suburb has more than one McDonald's, check you're at the right one." }
      : { status: "no", title: "Not a halal McDonald's", note: "This store isn't on McDonald's official list of halal restaurants." },
    grilld: (suburb, state) => inList(["Blacktown"], suburb) && (!state || state === "NSW")
      ? { status: "halal", title: "Halal certified Grill'd", note: "Blacktown is Grill'd's halal-certified restaurant: halal suppliers, no bacon, no alcohol." }
      : { status: "no", title: "Not halal certified", note: "Only Grill'd Blacktown (NSW) is halal certified." },
    hungryjacks: (suburb, state) => inList(listFor(HJ_REPORTED, state), suburb)
      ? { status: "some", title: "Reported halal — unconfirmed", note: "This store is listed as halal by the community (Zabihah), but Hungry Jack's hasn't confirmed it. Ask to see the halal certificate." }
      : { status: "no", title: "No halal certification found", note: "We found no halal report for this Hungry Jack's. Most stores sell bacon." },
    kfc: (suburb, state) => inList(listFor(KFC_NO_BACON, state), suburb)
      ? { status: "chicken", title: "Halal chicken, no bacon reported", note: "This KFC was reported (2020) as not selling bacon. The store still isn't confirmed as halal certified — ask to see a certificate." }
      : null,
    nandos: (suburb, state) => state === "QLD"
      ? { status: "no", title: "Chicken not halal certified in QLD", note: "Nando's says its Queensland chicken supplier is NOT halal certified, and ribs aren't either." }
      : state
        ? { status: "notcert", title: "Not halal certified", note: "Outside QLD Nando's chicken comes from halal-certified suppliers, but the store isn't certified, grills are shared with bacon, and ribs in WA, SA, ACT and NSW aren't certified." }
        : null,
  };

  function storeStatus(chain, suburb, stateName) {
    const state = STATE_CODES[norm(stateName)] || (stateName && stateName.length <= 3 ? stateName.toUpperCase() : null);
    const rule = STORE_RULES[chain.id];
    const r = rule && rule(suburb, state);
    if (r) return r;
    return { status: chain.status, title: STATUS[chain.status].label, note: chain.summary };
  }

  // Split "kfc punchbowl", "maccas in lakemba", "punchbowl kfc" into { chain, place }
  function parse(query) {
    const words = norm(query).replace(/[,]/g, " ").split(" ").filter(Boolean);
    const strip = (w) => w.filter((x) => !["in", "at", "near", "the", "store", "halal", "is", "?"].includes(x)).join(" ");
    for (let n = Math.min(4, words.length); n >= 1; n--) {
      const head = words.slice(0, n).join(" "), tail = words.slice(-n).join(" ");
      let c = CHAINS.find((c) => c.aliases.some((a) => flat(a) === flat(head)));
      if (c) return { chain: c, place: strip(words.slice(n)) };
      c = CHAINS.find((c) => c.aliases.some((a) => flat(a) === flat(tail)));
      if (c) return { chain: c, place: strip(words.slice(0, -n)) };
    }
    const c = find(query);
    return c ? { chain: c, place: "" } : null;
  }

  // Name used to find the chain's stores on the map
  const OSM_NAME = { mcdonalds: "McDonald's", hungryjacks: "Hungry Jack's", gyg: "Guzman y Gomez", eljannah: "El Jannah",
    redrooster: "Red Rooster", nandos: "Nando's", grilld: "Grill'd", dominos: "Domino's", pizzahut: "Pizza Hut" };
  const osmName = (c) => OSM_NAME[c.id] || c.name;

  root.Restaurants = { CHAINS, STATUS, CHECKED, find, parse, storeStatus, osmName };
})(typeof window !== "undefined" ? window : globalThis);
