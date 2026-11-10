#!/usr/bin/env python3
"""Create non-cropped WebP gallery derivatives without changing originals.

Run with the Python environment that provides Pillow:
    python3 scripts/optimize-portfolio.py

Manifest keys are root-relative source URLs. Width/height describe the display
variant; the thumbnail preserves the same aspect ratio. No image is enlarged.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/site/optimized"
QUALITY = 84
SIZES = {"thumbnail": 320, "display": 1200}


def main():
    gallery = json.loads((ROOT / "content/gallery.json").read_text())
    sources = sorted({"/" + image["src"].lstrip("/")
                      for entry in gallery for image in entry["images"]})
    OUTPUT.mkdir(parents=True, exist_ok=True)
    variants = {}
    total = {"original": 0, "thumbnail": 0, "display": 0}

    for source in sources:
        original = (ROOT / source.lstrip("/")).resolve()
        if not original.is_relative_to(ROOT) or not original.is_file():
            raise ValueError(f"Invalid or missing gallery source: {source}")
        original_bytes = original.read_bytes()
        original_hash = hashlib.sha256(original_bytes).hexdigest()
        total["original"] += len(original_bytes)
        key = hashlib.sha256(source.encode()).hexdigest()[:8]
        record = {}
        with Image.open(original) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            for kind, target_width in SIZES.items():
                width = min(target_width, image.width)
                height = max(1, round(image.height * width / image.width))
                resized = image.resize((width, height), Image.Resampling.LANCZOS)
                destination = OUTPUT / f"{original.stem}-{key}-{kind}.webp"
                options = {"quality": QUALITY, "method": 6}
                if image.info.get("icc_profile"):
                    options["icc_profile"] = image.info["icc_profile"]
                resized.save(destination, "WEBP", **options)
                with Image.open(destination) as check:
                    check.load()
                    assert check.size == (width, height)
                record[kind] = "/" + str(destination.relative_to(ROOT))
                total[kind] += destination.stat().st_size
                if kind == "display":
                    record.update(width=width, height=height)
        assert hashlib.sha256(original.read_bytes()).hexdigest() == original_hash
        variants[source] = record

    manifest = ROOT / "content/image-variants.json"
    temporary = manifest.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(variants, indent=2) + "\n")
    temporary.replace(manifest)
    print(json.dumps({"images": len(sources), "bytes": total,
                      "displayReductionPercent": round(100 * (1 - total["display"] / total["original"]), 1),
                      "thumbnailReductionPercent": round(100 * (1 - total["thumbnail"] / total["original"]), 1)}, indent=2))


if __name__ == "__main__":
    main()
