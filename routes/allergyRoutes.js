// routes/allergyRoutes.js
const express = require('express');
const router = express.Router();

/**
 * Lightweight, DB-free allergy matcher.
 * - Accepts items or bare ingredients
 * - Normalizes synonyms (e.g., "whey" -> milk, "prawns" -> shellfish)
 * - Returns warnings grouped by item and allergen
 */

// Canonical allergen keys (12 common)
const CANON = [
  'milk', 'egg', 'peanut', 'tree_nut',
  'soy', 'wheat_gluten', 'fish', 'shellfish',
  'sesame', 'mustard', 'celery', 'sulphite'
];

// Synonyms / triggers mapped to canonical keys
const SYNONYMS = [
  // milk / dairy
  { re: /\b(milk|dairy|cream|whey|casein|lactose|butter|ghee|yogurt|cheese|kefir)\b/i, canon: 'milk' },
  // eggs
  { re: /\b(egg|albumin|ovalbumin|ovomucoid|mayonnaise)\b/i, canon: 'egg' },
  // peanuts
  { re: /\b(peanut|groundnut|arachis)\b/i, canon: 'peanut' },
  // tree nuts
  { re: /\b(almond|hazelnut|walnut|pecan|cashew|pistachio|brazil nut|macadamia|pine nut|praline|marzipan)\b/i, canon: 'tree_nut' },
  // soy
  { re: /\b(soy|soya|tofu|edamame|tempeh|soybean|shoyu|miso|lecithin\s*e322)\b/i, canon: 'soy' },
  // gluten/wheat
  { re: /\b(wheat|gluten|barley|rye|spelt|kamut|farro|semolina|malt|seitan|bulgur|couscous)\b/i, canon: 'wheat_gluten' },
  // fish
  { re: /\b(cod|salmon|tuna|haddock|anchovy|sardine|mackerel|trout|pollock|fish\s*sauce)\b/i, canon: 'fish' },
  // shellfish / crustaceans / molluscs
  { re: /\b(shrimp|prawn|lobster|crab|crayfish|scampi|clam|mussel|oyster|squid|cuttlefish|octopus)\b/i, canon: 'shellfish' },
  // sesame
  { re: /\b(sesame|tahini|benne)\b/i, canon: 'sesame' },
  // mustard
  { re: /\b(mustard|dijon|english\s*mustard)\b/i, canon: 'mustard' },
  // celery
  { re: /\b(celery|celeriac)\b/i, canon: 'celery' },
  // sulphites
  { re: /\b(sulphite|sulfite|e220|e221|e222|e223|e224|e226|e227|e228)\b/i, canon: 'sulphite' },
];

// Helper: normalize text safely
const norm = (s) => (s || '').toString().trim();

// Match a single ingredient text -> set of matched canon keys and the term that triggered
function matchIngredient(ingredientText) {
  const text = norm(ingredientText);
  const hits = [];
  for (const { re, canon } of SYNONYMS) {
    const m = text.match(re);
    if (m) hits.push({ canon, trigger: m[0], source: text });
  }
  return hits;
}

// Given an array of ingredient strings -> grouped matches by canon
function matchIngredients(ingredientList = []) {
  const byCanon = {};
  ingredientList.forEach((ing) => {
    matchIngredient(ing).forEach((hit) => {
      if (!byCanon[hit.canon]) byCanon[hit.canon] = [];
      byCanon[hit.canon].push({ ingredient: hit.source, trigger: hit.trigger });
    });
  });
  return byCanon; // { milk: [{ingredient, trigger}], ... }
}

// Map userAllergens (free text) to canon keys when possible
function normalizeUserAllergens(userAllergens = []) {
  const result = new Set();
  const mapGuess = (txt) => {
    const t = norm(txt).toLowerCase();
    for (const { re, canon } of SYNONYMS) {
      if (re.test(t)) return canon;
    }
    // direct canonical names?
    if (CANON.includes(t)) return t;
    // simple common-name guesses
    if (/\b(gluten|wheat)\b/.test(t)) return 'wheat_gluten';
    if (/\b(nut|tree\s*nut)\b/.test(t)) return 'tree_nut';
    return null;
  };
  userAllergens.forEach(a => {
    const canon = mapGuess(a);
    if (canon) result.add(canon);
  });
  return Array.from(result);
}

/**
 * GET /api/allergy/common
 * returns canonical allergen keys and human labels
 */
router.get('/common', (req, res) => {
  const labels = {
    milk: 'Milk / Dairy',
    egg: 'Egg',
    peanut: 'Peanut',
    tree_nut: 'Tree Nuts',
    soy: 'Soy',
    wheat_gluten: 'Gluten (Wheat/Barley/Rye)',
    fish: 'Fish',
    shellfish: 'Shellfish (Crustaceans/Molluscs)',
    sesame: 'Sesame',
    mustard: 'Mustard',
    celery: 'Celery',
    sulphite: 'Sulphites'
  };
  res.json({
    allergens: CANON.map(k => ({ key: k, label: labels[k] }))
  });
});

/**
 * POST /api/allergy/check
 * Body can be EITHER:
 *  A) { ingredients: string[], userAllergens?: string[] }
 *  B) { items: [{name: string, ingredients: string[]}, ...], userAllergens?: string[] }
 *
 * Returns warnings grouped per item (or single batch) and a summary.
 */
router.post('/check', (req, res) => {
  try {
    const { ingredients, items, userAllergens = [] } = req.body || {};
    const userCanon = normalizeUserAllergens(userAllergens);

    // Helper to shape a warning block
    const buildWarningBlock = (itemName, ingredientList) => {
      const matched = matchIngredients(ingredientList); // { canon: [{ingredient, trigger}] }
      // If user allergens are provided, filter to those. Otherwise return all matched.
      const keys = Object.keys(matched);
      const filteredKeys = userCanon.length
        ? keys.filter(k => userCanon.includes(k))
        : keys;

      return {
        itemName,
        warnings: filteredKeys.map(k => ({
          allergen: k,
          occurrences: matched[k]   // [{ingredient, trigger}]
        }))
      };
    };

    let result = [];
    if (Array.isArray(items) && items.length) {
      result = items.map((it, i) =>
        buildWarningBlock(norm(it.name) || `Item ${i + 1}`, Array.isArray(it.ingredients) ? it.ingredients : [])
      );
    } else {
      // Single batch mode
      result = [buildWarningBlock('Batch', Array.isArray(ingredients) ? ingredients : [])];
    }

    // Flatten to build summary set
    const summarySet = new Set();
    result.forEach(block => {
      block.warnings.forEach(w => summarySet.add(w.allergen));
    });

    res.json({
      ok: true,
      userAllergens: userCanon,        // normalized filter (if any)
      summary: {
        hasRisk: summarySet.size > 0,
        allergens: Array.from(summarySet)
      },
      result
    });
  } catch (err) {
    console.error('[allergy/check] error:', err);
    res.status(400).json({ ok: false, error: 'Invalid payload' });
  }
});

module.exports = router;
