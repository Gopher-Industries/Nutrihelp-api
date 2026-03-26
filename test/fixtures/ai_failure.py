import json
import sys

print(json.dumps({
    "success": False,
    "prediction": None,
    "confidence": None,
    "error": "model failure"
}))
sys.exit(1)
