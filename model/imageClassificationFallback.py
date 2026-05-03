#!/usr/bin/env python3
"""
imageClassificationFallback.py

Safe heuristic classifier used when the primary Tensorflow-based
image-classification service is unavailable (missing weights file,
torch/tensorflow not installed, circuit-breaker open, etc.).

The goal here is NOT to be accurate — it is to return a deterministic,
well-shaped response so the backend never falls through to a 500 on a
user-facing endpoint.  The backend is responsible for flagging the
response as `uncertain` and `source: fallback` in the final contract.

Input:   raw image bytes on stdin
Output:  single-line JSON on stdout matching the primary script's schema
         {
           "success":    bool,
           "prediction": "Label:~NN calories per 100 grams" | None,
           "confidence": float in [0, 1],
           "error":      string | None,
           "warnings":   [ "fallback_classifier" ]
         }

Exit codes: 0 on success (even for "unknown"), 1 only on truly fatal errors.
"""

import io
import json
import sys


# Minimal colour → label map.  Values taken from the primary classifier's
# calorie table so downstream parsers work unchanged.
COLOUR_TABLE = [
    # (r_hi, g_hi, b_hi, label)
    ("Banana:~89 calories per 100 grams",              (230, 220, 120), (255, 255, 200)),
    ("Apple Red 1:~52 calories per 100 grams",         (120,   0,   0), (255, 120, 120)),
    ("Apple Golden 1:~52 calories per 100 grams",      (200, 180,   0), (255, 240, 160)),
    ("Orange:~47 calories per 100 grams",              (200, 120,   0), (255, 190, 120)),
    ("Tomato 1:~18 calories per 100 grams",            (150,   0,   0), (255,  90,  90)),
    ("Pear:~57 calories per 100 grams",                (100, 130,   0), (200, 230, 140)),
    ("Blueberry:~57 calories per 100 grams",           (  0,   0,  80), ( 90, 120, 200)),
    ("Watermelon:~30 calories per 100 grams",          (140,   0,  40), (230,  90, 130)),
]


def emit(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def classify_dominant_colour(img_bytes):
    """Pick a label whose colour range matches the image's mean RGB.

    Falls back to 'unknown' if PIL isn't available or the image can't be
    opened — a real production deployment can swap this for a distilled
    MobileNet / ONNX model.
    """
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return None, 0.0, ["pil_not_installed"]

    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize((32, 32))
        # Use load() + iteration so we stay forward-compatible with Pillow 14+
        # where Image.Image.getdata() is removed.
        px = img.load()
        w, h = img.size
        pixels = [px[x, y] for y in range(h) for x in range(w)]
    except Exception as e:  # noqa: BLE001
        return None, 0.0, [f"fallback_open_failed:{type(e).__name__}"]

    if not pixels:
        return None, 0.0, ["empty_image"]

    n = len(pixels)
    r = sum(p[0] for p in pixels) / n
    g = sum(p[1] for p in pixels) / n
    b = sum(p[2] for p in pixels) / n

    for label, lo, hi in COLOUR_TABLE:
        if lo[0] <= r <= hi[0] and lo[1] <= g <= hi[1] and lo[2] <= b <= hi[2]:
            # Fixed moderate confidence — the contract layer will decide
            # whether to surface this as an uncertain result.
            return label, 0.45, []

    return None, 0.0, ["no_colour_match"]


def main():
    try:
        img_bytes = sys.stdin.buffer.read()
    except Exception as e:  # noqa: BLE001
        emit({
            "success": False,
            "prediction": None,
            "confidence": None,
            "error": f"fallback_stdin_failed: {type(e).__name__}",
            "warnings": ["fallback_classifier"],
        })
        sys.exit(1)

    if not img_bytes:
        emit({
            "success": False,
            "prediction": None,
            "confidence": None,
            "error": "fallback_no_image_bytes",
            "warnings": ["fallback_classifier"],
        })
        sys.exit(1)

    label, confidence, warnings = classify_dominant_colour(img_bytes)

    emit({
        "success": True,
        "prediction": label,
        "confidence": confidence,
        "error": None,
        "warnings": ["fallback_classifier", *warnings],
    })


if __name__ == "__main__":
    main()
