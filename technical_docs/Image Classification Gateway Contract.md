# Image Classification Gateway — Response Contract (v1)

The backend now exposes a **single stable contract** for every outcome of
`POST /api/imageClassification`. Frontend code (`ScanProducts.jsx`,
`FoodDetails.js`, upload-history pages) should consume this shape and stop
reading the legacy `{ success, prediction, confidence, error }` flat payload.

## Endpoint

```
POST /api/imageClassification
Content-Type: multipart/form-data
Field:        image (JPEG or PNG, ≤ 5 MB)
```

## Response envelope (always)

```jsonc
{
  "success": true | false,
  "data":    { ... }      // present on success
  "error":   "string",    // present on failure
  "code":    "MACHINE_CODE" // present on failure
}
```

`success` is the only discriminator the frontend should branch on.

## Success payload (`data`)

```jsonc
{
  "classification": {
    "label":        "Banana",                              // null when uncertain
    "rawLabel":     "Banana:~89 calories per 100 grams",
    "calories":     { "value": 89, "unit": "kcal/100g" },  // null when uncertain
    "confidence":   0.91,                                  // 0..1, may be null
    "uncertain":    false,                                 // true when confidence < threshold
    "source":       "ai",                                  // "ai" | "fallback" | "none"
    "fallbackUsed": false,
    "alternatives": []
  },
  "explainability": {
    "service":             "image_classification",
    "source":              "ai",
    "fallbackUsed":        false,
    "timedOut":            false,
    "circuitOpen":         false,
    "durationMs":          42,
    "confidence":          0.91,
    "confidenceThreshold": 0.6,
    "warnings":            [],
    "generatedAt":         "2026-04-23T12:34:56.000Z",
    "contractVersion":     "v1"
  }
}
```

### Rendering rules for the frontend

| State | `classification.uncertain` | `classification.source` | UI guidance |
|---|---|---|---|
| Confident AI result | `false` | `"ai"` | Show label + calories + "Powered by NutriHelp AI". |
| Low-confidence AI result | `true` | `"ai"` | Show "We're not sure — here's a similar match" + `rawLabel`. |
| Fallback classifier | any | `"fallback"` | Show "Running on backup classifier — result may be less accurate". |
| Fallback + uncertain | `true` | `"fallback"` | Show "We couldn't confidently recognise this image. Try a clearer photo." |

`explainability.fallbackUsed` and `explainability.timedOut` can drive
analytics, a "report issue" button, or a retry prompt.

## Error payloads

| `code`                   | HTTP | When                                                 |
|--------------------------|------|------------------------------------------------------|
| `IMAGE_MISSING`          | 400  | No file uploaded                                     |
| `VALIDATION_ERROR`       | 400  | Bad MIME type, extension, or size. Has `errors[]`.   |
| `UPLOAD_FAILED`          | 400  | Multer-level failure                                 |
| `INTERNAL_ERROR`         | 500  | Unhandled controller error                           |
| `AI_SERVICE_UNAVAILABLE` | 503  | **Both** primary AI and fallback failed              |

Example validation error:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "image", "message": "Image exceeds the maximum allowed size." }]
}
```

## Migration checklist for the frontend

In `ScanProducts.jsx` / `FoodDetails.js` / upload-history pages:

1. **Switch on `response.success`**, not on the presence of `prediction`.
2. Read `response.data.classification.label` (may be `null`).
3. Use `response.data.classification.uncertain` to decide whether to show a
   definitive answer or a "not sure" state.
4. Use `response.data.classification.calories` (object or `null`) — do not
   parse `rawLabel` on the client.
5. Use `response.data.classification.source === 'fallback'` to show the
   backup-classifier notice.
6. Handle `code === 'AI_SERVICE_UNAVAILABLE'` as a retry-later state.
7. Handle `code === 'VALIDATION_ERROR'` by showing `errors[].message`.

## Where this is implemented (BE)

- `routes/imageClassification.js`             — upload + validation pipeline
- `validators/imageValidator.js`              — safe validation errors
- `controller/imageClassificationController.js` — thin handler
- `services/imageClassificationGateway.js`    — AI + fallback + uncertainty
- `services/imageClassificationContract.js`   — the shape definition
- `model/imageClassification.py`              — primary TF classifier
- `model/imageClassificationFallback.py`      — safe fallback classifier
- `test/imageClassificationGateway.test.js`   — gateway branch coverage
- `test/imageClassificationController.test.js`— controller contract tests
