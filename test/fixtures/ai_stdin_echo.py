import json
import sys


def main():
    payload = sys.stdin.buffer.read().decode("utf-8")
    print(json.dumps({
        "success": True,
        "prediction": payload,
        "confidence": 1.0,
        "error": None
    }))


if __name__ == "__main__":
    main()
