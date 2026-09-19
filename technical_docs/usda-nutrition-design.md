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
5. `llm_estimate`: optional last resort, bounded by sanity ranges, labelled as an estimate.
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

## 7. Writes to shared data

Same scope as recipe sources: only at save time, only on an explicit user action. New here: filling
nutrient columns on rows where **all** of them are `null`. Existing values are never changed.

## 8. Out of scope

AFCD (Excel, no API), branded foods, per-user overrides, a migration to fix `Olive Oil` or the
`vitamin_b` ambiguity.
