# Recipe Sources Integration — Design & Decisions

**Feature:** Real Recipe Data — external recipe search + prefill on Create Recipe
**Area:** Integration · **Repos:** Nutrihelp-api (backend), Nutrihelp-web (frontend)
**Branch:** `feature/recipe-sources-hashem` · **Status:** Approved design, pre-implementation
**Date:** 2026-07-27

## 1. Problem

Catalogue recipes in `recipe_library` are currently produced by an LLM from just a dish name
(`generateRecipeEnrichment` in `services/recipeLibraryService.js`): ingredients, instructions and
nutrition are model guesses. Users creating their own recipes type everything from scratch.
Both problems share one fix: let people start from a **real** recipe retrieved from a trusted
external database, and keep humans in control of what gets saved.

## 2. Solution overview

A "Start from a real recipe" search field on the create-recipe surfaces. The user types a few
words, we search an external recipe source, the user picks a result, and an LLM agent maps the
external recipe onto the NutriHelp recipe schema — **mapping only, no enrichment**, with
ingredients and instruction steps verified in code against the source text (see §4 guardrails for
the precise scope of that guarantee). The mapped draft prefills the form; the user reviews,
completes any missing fields, and saves through the existing, unchanged save path.

## 3. Decisions (with rationale)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Entry point | Both the user Create Recipe page and the admin library import form, backed by one shared API | One backend serves web, mobile and future integrations; both audiences benefit |
| D2 | First source | TheMealDB (live API) | Zero data engineering, ~600 curated recipes **with images**, free for educational use with attribution; big datasets (Food.com 231K w/ nutrition, RecipeNLG 2.2M) deferred to future adapters — evaluated and documented in the ticket. Edamam/Spoonacular rejected: no instructions on free tier / storage forbidden by ToS |
| D3 | Mapper | Pure LLM mapper (Gemini `gemini-flash-latest`, temperature 0) | Single prompt maps the whole source recipe to our schema; guarded by validation + fidelity checks (below). **Revised 2026-08-09** — originally Groq `llama-3.3-70b`; Groq's API returns `403 Access denied` from the developer's network, so the mapper could not be run or verified against it. Model id comes from `RECIPE_SOURCES_GEMINI_MODEL` and defaults to the floating `-latest` alias rather than a dated id, because Google retired `gemini-2.5-flash` mid-project and broke `recipeLibraryService.js` |
| D4 | Persistence | Prefill-only; no DB schema changes | Zero risk to the shared Supabase; `recipe_library` saves already carry `source`/attribution columns; provenance columns on the user `recipes` table deferred (needs team schema coordination) |
| D5 | Code location | New module inside Nutrihelp-api following existing route→controller→service pattern | Reusable by web/mobile/future MCP; familiar review surface for the team |

## 4. Backend design

```
routes/recipeSources.js               mounted at /api/recipe-sources
controller/recipeSourcesController.js
services/recipeSources/
  index.js                            source registry (adapter interface)
  adapters/theMealDb.js               adapter #1
  mapperService.js                    LLM mapper + guardrails
```

### GET /api/recipe-sources/search?q=<text>&source=all  (authenticateToken)
Adapter fan-out (MVP: TheMealDB `search.php?s=`). Response:

```json
{ "results": [{ "source": "themealdb", "external_id": "52771",
    "title": "Spicy Arrabiata Penne", "thumbnail": "https://.../preview",
    "cuisine": "Italian", "category": "Pasta" }] }
```

### POST /api/recipe-sources/map  (authenticateToken)
Body `{ "source": "themealdb", "external_id": "52771" }`. The server re-fetches the full recipe
from the source (client-supplied recipe content is never trusted), runs the mapper, and returns:

```json
{ "draft":          { "recipe_name": "...", "ingredients": [], "instructions": [],
                      "cuisine_name": "...", "image_url": "...", "servings": null },
  "unmapped_fields": ["calories", "protein", "prep_time_minutes"],
  "source_meta":     { "source": "themealdb", "external_id": "52771",
                       "source_url": "...", "attribution": "TheMealDB",
                       "license": "Free with attribution" } }
```

Each drafted ingredient additionally carries `ingredient_id` / `matched_name` / `resolution` when
it matched an existing NutriHelp ingredient, plus an `ingredient_resolution` summary
`{ matched, unmatched, failed }`. **`/map` is read-only** — it matches, it never creates.

### POST /api/recipe-sources/resolve-ingredients  (authenticateToken)
Body `{ "ingredients": [{ "name": "penne rigate", "category": "Pantry" }] }`, max 30 items.
Matches as `/map` does but **creates** the ingredients NutriHelp does not have yet, returning
`{ "resolved": [{ name, id, category, status }] }`.

Split from `/map` deliberately: creation writes to the team's shared `ingredients` table, so it is
tied to the user actually saving a recipe rather than merely previewing one. Previewing a recipe
and walking away leaves no trace. The 30-item cap bounds how much a single request can write.

### Mapper guardrails ("map, never invent")
1. Prompt embeds the raw source JSON + target field list; instruction: every output value must be
   copied or restructured from the source; missing data stays `null`.
2. Output schema-validated (same validator style as existing routes); one retry on invalid JSON.
3. Fidelity check in code: every mapped ingredient must appear in the source text; instruction
   text compared against source with normalized similarity. Any rewrite ⇒ reject LLM output and
   fall back to a minimal deterministic mapping.
4. `cuisine_name` and `cooking_method_name` are clamped to NutriHelp's controlled vocabularies
   (the `cuisines` and `cooking_methods` tables); an off-list value is nulled and reported in
   `unmapped_fields` rather than copied through.

**What the guarantee actually covers.** Only **ingredients** and **instruction steps** are
verified in code against the source text — those cannot be invented. Nutrition is never populated
at all. Every other scalar field (`description`, `meal_type`, `difficulty`, prep/cook times,
`servings`, `cooking_method_name`) is constrained by the prompt and the output schema only, plus
the vocabulary clamp where one applies. `cooking_method_name` in particular is *derived* from the
instruction prose rather than copied from a source field, because TheMealDB has no such column.
So the honest claim is "verified for ingredients and instructions, prompt-and-schema-constrained
elsewhere", not "never returns invented content".

## 5. Frontend design (Nutrihelp-web)

Shared component `src/components/ExternalRecipeSearch/`, mounted on:
- `src/routes/CreateRecipe/CreateRecipe.jsx` (user form)
- `AdminDataCenter` library-tab import form (admin)

Behaviour: debounced (400 ms) typeahead from 3 characters; dropdown rows show thumbnail, title,
cuisine and a source badge, with a "Recipes from TheMealDB" attribution footer. Selecting a
result calls `/map`, shows a "Mapping recipe…" state, prefills the form, and highlights
`unmapped_fields` with a "please complete" hint. A "Clear prefill" link resets the form.
The existing save logic is untouched in both forms.

## 6. Error handling

| Case | Behaviour |
|------|-----------|
| No results | "No recipes found — you can create it manually below"; form fully usable |
| Source API down / >5 s timeout | Same graceful message; search quietly disabled for the session |
| Mapper invalid after 1 retry | Toast "Couldn't map this recipe — try another or fill manually" |
| Any feature failure | Never blocks manual recipe creation |

## 7. Testing

- Unit: TheMealDB adapter (mocked HTTP); mapper validation + fidelity check (LLM injected as a stub).
- Integration: search → map happy path.
- Manual E2E on both forms: search → select → prefill → edit → save.

## 7a. Measured behaviour (backend, 2026-08-09)

First live runs against real TheMealDB and real Gemini, from the stage tracing in the module:

| Stage | Time |
|---|---|
| `search.php` | ~0.9 s |
| `lookup.php` | ~0.3 s |
| LLM mapping call | **43–71 s** |

The model call is ~99% of `/map`. `gemini-flash-latest` currently resolves to `gemini-3.6-flash`,
which does extended thinking by default — wasted effort on a mechanical field-mapping task.

**Resolved.** OpenRouter is now the preferred provider whenever `OPENROUTER_API_KEY` is set,
which brings the mapping call down to **~3 s**. Gemini remains the fallback for when the key is
absent, and its call is now bounded by `LLM_TIMEOUT_MS` like the OpenRouter one. The latency
blocker on the D4 loading state no longer applies.

Fallback behaviour confirmed live: on a provider error both attempts are made, then the
deterministic mapping returns a complete draft (8 ingredients with parsed quantities, 10 steps)
in ~1 s. No unsourced ingredient or instruction step reached a draft in any run.

## 8. Out of scope (future tickets)

Additional adapters (Food.com dataset indexed in Supabase, RecipeNLG), provenance columns on the
user `recipes` table, nutrition auto-lookup (USDA FoodData Central / AFCD), MCP server exposing
recipe search to agents.
