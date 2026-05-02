# Recommendation Intelligence, Safety-Aware Scoring & Explainability (BE20)

**Endpoint:** `POST /recommendations`
**Auth:** JWT (`authenticateToken`)
**Contract version:** `recommendation-response-v2`
**Strategy id:** `safety-aware-hybrid-v2`

This document describes the new recommendation response shape, the scoring
layers that produce it, and the frontend migration steps required.

## Goals

1. Deliver stable ranked recommendations users and reviewers can trust.
2. Make the scoring logic inspectable and easy to extend.
3. Filter recipes that conflict with a user's allergies.
4. Adjust scores based on chronic conditions (diabetes, hypertension, high
   cholesterol, renal disease, obesity, coeliac).
5. Surface *cautionary* safety notes where a user's medications and a
   recipe's ingredients are known to interact.
6. Attach structured explanations — reasons, warnings, safety notes — so
   the frontend can render rationale, not just a label.
7. Frame every output as recommendation support. Never as diagnosis.

## Scoring architecture

```
services/recommendationScoring/
  allergyFilter.js       — hard block layer
  conditionAdjuster.js   — chronic-condition score deltas + warnings
  medicationGuard.js     — medication-aware safety notes (caution only)
  nutritionBalance.js    — generic nutritional balance score
  preferenceMatcher.js   — cuisine, cooking method, AI hints, goal alignment
  reasonBuilder.js       — packs reasons/warnings/safetyNotes into the contract shape
  orchestrator.js        — rankRecipes(recipes, context) entry point
  index.js               — public surface
```

Each layer takes the recipe row and a small slice of the user context and
returns a deterministic payload. Composition happens in the orchestrator
so the layers remain independent and individually testable.

### Scoring layers at a glance

| Layer | Blocks? | Score delta | Outputs |
|-------|---------|-------------|---------|
| allergyFilter | Yes — hard block | — | blockers, severity, notes |
| preferenceMatcher | No | +/- on cuisine, method, goal fit | reasons, warnings, matched signals |
| conditionAdjuster | No | +/- on nutrient/condition alignment | reasons, warnings |
| nutritionBalance | No | +/- on meal balance | reasons, warnings, breakdown |
| medicationGuard | No | minor penalty only if high severity | safetyNotes (with disclaimer) |

### Medication rules covered

| Rule id | Medication keywords | Food keywords | Severity |
|---------|---------------------|---------------|----------|
| warfarin_vitamin_k | warfarin, coumadin | kale, spinach, collard greens, … | warn |
| maoi_tyramine | phenelzine, tranylcypromine, MAOI | aged cheese, cured meats, miso, … | high |
| statin_grapefruit | statin, atorvastatin, simvastatin | grapefruit, pomelo | warn |
| diabetes_meds_alcohol | metformin, insulin, glipizide | wine, beer, whiskey, cocktail | warn |

All medication rules emit `disclaimer: true` so the FE must render the
"not medical advice — please consult your clinician" copy alongside.

### Condition rules covered

diabetes / pre-diabetes, hypertension / high blood pressure, high
cholesterol / cardio / heart, renal / kidney, obesity / overweight /
weight management, celiac / coeliac / gluten.

## Response shape

```json
{
  "success": true,
  "generatedAt": "2026-04-24T09:15:22.123Z",
  "contractVersion": "recommendation-response-v2",
  "disclaimer": "Recommendations are informational and do not replace guidance from a healthcare professional.",
  "cache": { "key": "...", "hit": false, "ttlMs": 300000 },
  "source": {
    "strategy": "safety-aware-hybrid-v2",
    "scoringContractVersion": "recommendation-scoring-v2",
    "ai": {
      "source": "request | medical_report | ai_service | none",
      "version": "v1",
      "applied": true,
      "fallbackUsed": false,
      "adapterFailed": false,
      "warnings": []
    }
  },
  "input": {
    "userId": 5,
    "healthGoals": { "labels": [...], "targetCalories": 500, "prioritizeProtein": true, ... },
    "dietaryConstraints": { "dietaryRequirementIds": [], "allergyIds": [] },
    "maxResults": 5
  },
  "userContext": {
    "profile": { ... },
    "preferences": { "cuisines": [...], "hasPreferences": true, ... },
    "healthContext": {
      "allergies": [{ "referenceId": 11, "name": "Peanut", "severity": "severe" }],
      "chronic_conditions": [{ "referenceId": 7, "name": "Diabetes", "status": "managed" }],
      "medications": [{ "name": "Metformin", "active": true, ... }],
      "normalized_summary": { "allergyNames": [...], "chronicConditionNames": [...], "activeMedicationNames": [...] }
    },
    "recentRecipeIds": []
  },
  "recommendations": [
    {
      "rank": 1,
      "recipeId": 1,
      "title": "Chicken Quinoa Bowl",
      "blocked": false,
      "safetyLevel": "safe | caution | blocked",
      "score": 42,
      "breakdown": {
        "preference": 26,
        "condition": 8,
        "nutrition": 6,
        "aiSignal": 2,
        "medicationPenalty": 0
      },
      "explanation": {
        "summary": "Matches a cuisine you prefer. Delivers 32g of protein — a strong hit toward a balanced meal. Supports your higher-protein goal.",
        "reasons": [
          { "tag": "preferred_cuisine", "message": "Matches a cuisine you prefer.", "weight": 18 },
          { "tag": "balanced_protein", "message": "Delivers 32g of protein — a strong hit toward a balanced meal.", "weight": 6 }
        ],
        "warnings": [],
        "safetyNotes": [],
        "disclaimer": "Recommendations are informational and do not replace guidance from a healthcare professional."
      },
      "matchedSignals": ["preferred_cuisine", "goal_high_protein"],
      "appliedConditions": ["diabetes"],
      "triggeredMedicationRuleIds": [],
      "metadata": {
        "cuisineId": 3,
        "cookingMethodId": 2,
        "preparationTime": null,
        "totalServings": null,
        "nutrition": { "calories": 520, "protein": 32, "fiber": 8, "sugar": 6, "sodium": 380, "fat": 16, "carbohydrates": 42 },
        "strategy": "safety-aware-hybrid-v2",
        "aiSource": "request",
        "aiApplied": true,
        "fallbackUsed": false,
        "adapterFailed": false
      }
    }
  ],
  "blockedRecipes": [
    { "recipeId": 2, "title": "Chicken Peanut Satay", "reason": "allergy_blocked", "blockers": ["peanut"], "severity": "severe" }
  ],
  "downgradedRecipes": [
    { "recipeId": 3, "title": "Grapefruit Avocado Salad", "safetyLevel": "caution", "warnings": [...], "safetyNotes": [...] }
  ],
  "summary": {
    "totalCandidates": 100,
    "totalBlocked": 1,
    "totalDowngraded": 2,
    "totalReturned": 5
  }
}
```

### Discriminators the frontend should use

- `success` — the only boolean the FE should branch on first.
- `recommendations[].safetyLevel` — drives chip colour / badge:
  - `safe` → render normally
  - `caution` → render with warning badge, surface `warnings` + `safetyNotes`
  - `blocked` → do not render in the list. Surfaces only in `blockedRecipes`.
- `recommendations[].explanation.warnings` / `.safetyNotes` — render
  expandable rationale with severity-coloured icons.
- `recommendations[].explanation.reasons[].tag` — stable identifier for
  analytics / i18n.
- `blockedRecipes[]` — show a collapsed "hidden for safety" group so the
  user understands why a dish they expected is missing.

## Error shape

```json
{ "success": false, "error": "dietaryConstraints is required and must be an object" }
```

HTTP codes:

| Code | When |
|------|------|
| 200  | Success |
| 400  | Validation failure |
| 500  | Unhandled service error |

## Frontend migration checklist

1. Treat the response as `v2`. `explanation` is now an object, not a string.
   Consume `explanation.summary` where the string used to live.
2. Read `safetyLevel` to decide how to render a card. Only show `safe` and
   `caution`. Render `caution` with a subtle amber badge and an
   expandable safety panel driven by `explanation.warnings` and
   `explanation.safetyNotes`.
3. Show `explanation.disclaimer` once per panel that contains any
   `safetyNote` with `disclaimer: true`.
4. Show a "hidden for your safety" chip using `blockedRecipes`. The user
   should be able to tap it for the list of hidden dishes and their
   `blockers`.
5. Read `metadata.aiSource` instead of `metadata.sourceTags`. Values:
   `request`, `medical_report`, `ai_service`, `none`.
6. Read `metadata.fallbackUsed` instead of
   `metadata.explanationMetadata.fallbackUsed`.
7. If `summary.totalReturned === 0 && summary.totalBlocked > 0`, show an
   empty-state message explaining that all matching meals were filtered
   for safety, and offer to loosen filters.

## Tests

All new tests live in:

- `test/recommendationScoring.test.js` — 26 unit tests covering each
  scoring layer plus the orchestrator for blocked / safe / caution /
  conflicted paths.
- `test/recommendationService.test.js` — service-level tests now also
  cover allergy-blocking and medication-caution flows end-to-end.

Run locally:

```bash
npx mocha test/recommendationService.test.js test/recommendationScoring.test.js
```

Current status: 34 / 34 passing.

## Non-goals / intentional limitations

- The medication guard is substring-matching, not a drug-interaction DB.
  It is a safety net, not a clinical tool. All outputs carry a
  disclaimer.
- Allergy matching relies on recipe name keywords plus the legacy
  `recipes.allergy` column. A future enhancement can wire in the
  structured ingredient list when that column is populated.
- Nothing in this module produces a diagnosis, prescribes a change, or
  tells the user to alter medication. The response is framed purely as
  recommendation support.
