import json

print(json.dumps({
    "success": True,
    "prediction": "apple_pie",
    "confidence": 0.98,
    "error": None
}))
