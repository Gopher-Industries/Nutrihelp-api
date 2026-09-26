# USDA nutrition lookup and unit conversion: design

Status: in progress. Branch `feature/usda-nutrition-hashem`, based on the recipe sources work
(`/api/recipe-sources`, PRs #285 and #303).

## 1. Problem

Recipes imported from TheMealDB save with empty nutrition. Two causes, both in the save path:

1. **Created ingredients have no nutrient values.** `ingredientResolver` creates missing rows in the
   shared `ingredients` table with every nutrient column `null`, because we refuse to invent figures.
   27 of 303 rows are in that state today.
2. **The save calculation only understands weights.** `model/createRecipe.js` multiplies each
   ingredient's per-100 g value by a gram quantity. It accepts `g`, `kg`, `lb` and `oz`. Any other
   unit (`cup`, `tbsp`, `clove`, `large`) sets that nutrient's total to `null`. Most TheMealDB
   measures are volumes or counts.

One ingredient with either problem blanks the whole recipe.

## 2. Principle

The rule from recipe sources still holds: **no invented data**. Nutrient values always come from
USDA FoodData Central (public domain, CC0). An LLM may choose between USDA records or USDA portions.
It never supplies a nutrient value. Where an LLM estimates a weight, the result is labelled as an
estimate all the way to the UI.

## 3. Data source

USDA FoodData Central REST API, `https://api.nal.usda.gov/fdc/v1`.

| Call                                                     | Use                              |
| -------------------------------------------------------- | -------------------------------- |
| `GET /foods/search?query=&dataType=SR Legacy,Foundation` | candidates with nutrients        |
| `GET /food/{fdcId}`                                      | portion weights (`foodPortions`) |

Verified against the live API on 19 Sep 2026:

- Search ranking is weak. "olive oil" returns "Oil, corn, peanut, and olive" first. We rank
  candidates ourselves.
- Some `Foundation` records have no energy or macros at all. A candidate must carry the core
  nutrients or it is skipped.
- Portions come in two shapes. `SR Legacy`: `{amount: 1, modifier: "clove", gramWeight: 3}`.
  `Foundation`: `{amount: 100, measureUnit: {abbreviation: "ml"}, gramWeight: 90.7}`.
- `DEMO_KEY` allows 10 requests an hour. Set `USDA_API_KEY` (free from api.data.gov) for real use.
  Lookups are cached in memory. A rate-limited or failed lookup never blocks a save.

## 4. Storage units

The shared `ingredients` table stores everything **per 100 g**. Checked against existing rows
(Butter, Milk, Salt, Garlic):

| Column                      | Table unit | USDA nutrient id           | USDA unit | Factor   |
| --------------------------- | ---------- | -------------------------- | --------- | -------- |
| calories                    | kcal       | 1008 (fallback 2047, 2048) | kcal      | 1        |
| protein, fat, carbohydrates | g          | 1003, 1004, 1005           | g         | 1        |
| fiber                       | g          | 1079                       | g         | 1        |
| sugar                       | g          | 2000 (fallback 1063)       | g         | 1        |
| sodium                      | **g**      | 1093                       | mg        | 0.001    |
| vitamin_a                   | **g**      | 1106 (RAE)                 | µg        | 0.000001 |
| vitamin_c                   | **g**      | 1162                       | mg        | 0.001    |
| vitamin_d                   | **g**      | 1114                       | µg        | 0.000001 |
| vitamin_b                   | **g**      | 1178 (B-12)                | µg        | 0.000001 |

`vitamin_b` is ambiguous in the existing data: Milk and Butter match B-12, Tomato matches B-6. We
map B-12 and record the choice here. Known bad row: `Olive Oil` (id 3) holds per-tablespoon values.
We never overwrite existing values, so that row is left for a team data fix.

## 5. Unit conversion: quantity and unit to grams

Tiers, first hit wins. Each result records its `source`.

1. `mass`: g, kg, mg, oz, lb.
2. `usda_portion`: the food's own portion with the same unit (`clove`, `cup`, `large`, `slice`).
3. `usda_density`: the food has any volume portion, so its density converts every volume unit.
   Standard volumes: tsp 5 ml, tbsp 15 ml, cup 240 ml, fl oz 30 ml (US labelling rounding).
4. `negligible`: pinch, dash, sprinkling, to taste, garnish count as 0 g.
5. `llm_estimate`: last resort for measures USDA cannot weigh ("1 tin", "1 bunch"). The model is
   asked what ONE unit weighs, the quantity is applied in code, the answer must fall inside a
   plausibility range for the unit, and the label travels with the weight into the saved recipe.
6. Otherwise `null`. The total for that recipe stays empty, as today.

## 6. Where it plugs in

No schema change. `recipes.ingredients` is JSONB, so a parallel `grams` array needs no migration.

- `services/nutritionSources/`: `usdaClient`, `nutrientMapper`, `foodMatcher`, `unitConversion`,
  `index` (lookup with cache) and `ingredientEnricher`.
- `ingredientResolver` is unchanged. `ingredientEnricher.enrichIngredients(resolved, measures,
{ fillMissing, generate })` runs straight after it on the save path:
  - rows whose nutrition is entirely `null` are filled from a confident USDA match (`high`, or
    confirmed by the LLM). That covers rows the resolver has just created and older empty rows alike.
    A `low` confidence match is never written;
  - each item may carry `quantity`, `unit` and `notes`, and comes back with `grams`,
    `grams_source` and `nutrition: { status, source }`.
- `POST /api/recipe-sources/resolve-ingredients` returns the enriched items plus a `nutrition`
  summary (`provider`, `weighed`, `unweighed`, `filled`, `missing`, `complete`). If enrichment fails
  the plain resolution is returned and the recipe still saves.
- `POST /api/recipe/createRecipe` accepts optional `ingredient_grams` and `ingredient_grams_source`.
  The rollup prefers a supplied weight over the mass-unit factor, and a weight of 0 adds nothing.
- Web: the save path sends quantity and unit to resolve, forwards `ingredient_grams`, and shows the
  nutrition with USDA attribution and an "estimated" label when any weight was estimated.

## 6a. Matching a name to a USDA record

1. **Deterministic rank.** Every word of the name must appear. Candidates are scored on head-noun
   position, extra words, processed forms (`canned`, `powder`, `paste`) and `raw`. 25 candidates are
   requested because USDA's own relevance order is weak.
2. **The record must be about the ingredient.** USDA descriptions lead with the food, after an
   optional category heading (`Spices,`, `Beverages,`). `high` confidence needs that leading segment
   to be made of the ingredient's own words. "Chicken spread" and "Bread, cinnamon" merely mention
   the ingredient and are capped at `low`.
3. **LLM tie-break** for a `low` result: the model chooses an `fdcId` from the candidate list or
   answers `null`. An id that was not offered is ignored.
4. **LLM rewording** when nothing matched: USDA says "Catsup" for ketchup and "Sugars, granulated"
   for caster sugar. The model suggests up to three USDA-style search phrases. Whatever USDA returns
   then goes through step 3, judged against the original name. The model's text is only ever a search
   query.

In no tier does a model supply a nutrient value.

### What the dry run found

`node scripts/nutritionDryRun.js [--llm]` lists the proposed match for every empty row and writes
nothing. Run it before trusting a live fill. Its first run, over the 27 empty rows on 19 Sep 2026:

- **Defect caught.** "Water" matched the vegetable "Water convolvulus, raw" at `high` confidence,
  because it was the only candidate containing the word. Rule 2 above is the fix.
- 12 of 27 found nothing because of USDA's wording. Rule 4 is the fix.
- After both: 11 `high`, 11 `llm`, 5 with no USDA record (italian seasoning, English mustard, beef
  fillet, Parma ham, and a bare "Oil" that the model rightly refused to guess). All 22 proposed
  matches were checked by hand and are correct.

## 6b. Totals and coverage

The old rule blanked a total as soon as one ingredient was unknown. Half a teaspoon of an unlisted
herb erased a recipe that was 99.9% accounted for. `services/nutritionSources/recipeTotals.js` now
returns two layers.

**Strict totals** go in the `recipes` columns, which meal planning and daily plans add up. A
nutrient's total is published only when:

- every ingredient has a weight;
- ingredients with no figure for that nutrient are at most 5% of the recipe's weight;
- at most 25% of that nutrient's total comes from ingredients whose weight was estimated. This is
  measured per nutrient, not by weight: a live save had an estimated tin of tomatoes at 43% of the
  recipe's weight but 4% of its calories, and nearly all of its vitamin C.

**Coverage** goes in `recipes.ingredients.nutrition_coverage` (JSONB, no migration):
`ingredients`, `weighed`, `estimated`, `reliable`, and per nutrient `counted` and the `partial` sum.
`POST /api/recipe/createRecipe` returns it as `nutrition: { calories, coverage }`.

The web card shows "459 kcal per serving" for a strict total, and "About 459 kcal per serving,
covers 7 of 8 ingredients · 2 weights estimated" when the total was withheld. A recipe with no
coverage record shows nothing: its total predates gram weights and read "2 chicken breasts" as 2 g,
which put "7 kcal per serving" on real dishes.

## 7. Writes to shared data

Same scope as recipe sources: only at save time, only on an explicit user action. New here: filling
nutrient columns on rows where **all** of them are `null`. Existing values are never changed.

## 8. Out of scope

AFCD (Excel, no API), branded foods, per-user overrides, a migration to fix `Olive Oil` or the
`vitamin_b` ambiguity.
