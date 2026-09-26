# AI Recommendation Integration Contract

## Purpose
This document defines the backend contract for integrating nutrition recommendation signals from the AI team.

The backend recommendation layer accepts AI-derived recommendation signals as optional input and combines them with:
- user profile
- user preferences
- dietary constraints
- health context
- recent meal history
- recipe nutrition metadata

The backend must still return recommendations when AI signals are missing or unavailable.

## Backend Endpoint

`POST /api/recommendations`

Authentication:
- Bearer access token required

## Request Shape

```json
{
  "healthGoals": {
    "labels": ["weight management"],
    "targetCalories": 500,
    "prioritizeProtein": true,
    "prioritizeFiber": false,
    "limitSugar": false,
    "limitSodium": false
  },
  "dietaryConstraints": {
    "dietaryRequirementIds": [1, 2],
    "allergyIds": [3]
  },
  "aiInsights": {
    "preferredCuisineIds": [10],
    "preferredCookingMethodIds": [3],
    "preferredRecipeIds": [25],
    "excludedRecipeIds": [8],
    "goalLabels": ["blood sugar management"],
    "prioritizeProtein": true,
    "prioritizeFiber": true,
    "limitSugar": true,
    "limitSodium": false,
    "explanationTags": ["model_v1", "ranking_signal"]
  },
  "medicalReport": {},
  "maxResults": 5,
  "refreshCache": false
}
```

## AI Signal Contract

The backend expects AI recommendation signals in this shape:

```json
{
  "version": "v1",
  "hints": {
    "preferredCuisineIds": [10],
    "preferredCookingMethodIds": [3],
    "preferredRecipeIds": [25],
    "excludedRecipeIds": [8],
    "goalLabels": ["weight management"],
    "prioritizeProtein": true,
    "prioritizeFiber": true,
    "limitSugar": false,
    "limitSodium": false,
    "explanationTags": ["ai_service", "candidate_ranking"]
  }
}
```

## Backend Response Shape

```json
{
  "success": true,
  "generatedAt": "2026-03-22T12:00:00.000Z",
  "contractVersion": "recommendation-response-v1",
  "cache": {
    "key": "...",
    "hit": false,
    "ttlMs": 300000
  },
  "source": {
    "strategy": "hybrid_rule_based",
    "ai": {
      "source": "request",
      "version": "v1",
      "applied": true,
      "fallbackUsed": false,
      "adapterFailed": false,
      "warnings": []
    }
  },
  "input": {},
  "userContext": {},
  "recommendations": [
    {
      "rank": 1,
      "recipeId": 25,
      "title": "Protein Bowl",
      "score": 71,
      "explanation": "matches preferred cuisine; boosted by AI preference signal; supports higher protein intake",
      "metadata": {
        "nutrition": {},
        "matchedSignals": ["preferred_cuisine", "ai_preferred_recipe", "high_protein"],
        "sourceTags": ["request", "hybrid_rule_based"]
      }
    }
  ]
}
```

## Integration Notes

- AI signals are optional augmentation, not a hard dependency.
- If AI signals are unavailable, the backend falls back to rule-based recommendation logic.
- The frontend should always receive a stable response structure.
- The AI team can evolve ranking quality independently as long as the `hints` contract remains compatible.
