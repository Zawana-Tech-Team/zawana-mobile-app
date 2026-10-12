#!/usr/bin/env python3
"""Compare a real native capture with the reference's inner display using Pillow.

This produces QA artifacts only, preserves source images, and does not certify
visual completion from a metric. Height/aspect mismatches remain visible.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageStat


REPO_ROOT = Path(__file__).resolve().parents[2]
QA_ROOT = REPO_ROOT / "development" / "qa" / "auth"


def crop_box(value: str) -> tuple[int, int, int, int]:
    try:
        parts = tuple(int(part) for part in value.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("Crop must be left,top,right,bottom integers.") from error
    if len(parts) != 4 or parts[0] < 0 or parts[1] < 0 or parts[2] <= parts[0] or parts[3] <= parts[1]:
        raise argparse.ArgumentTypeError("Crop must have nonnegative left/top and positive width/height.")
    return parts


def open_rgb(path: Path) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGBA")
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        return Image.alpha_composite(background, image).convert("RGB")


def checked_crop(image: Image.Image, box: tuple[int, int, int, int] | list[int]) -> Image.Image:
    if box[0] < 0 or box[1] < 0 or box[2] > image.width or box[3] > image.height or box[2] <= box[0] or box[3] <= box[1]:
        raise ValueError(f"Crop {box} is outside image size {image.size}.")
    return image.crop(tuple(box))


def width_normalize(image: Image.Image, width: int) -> Image.Image:
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--route", required=True, help="Route key in discovery/reference-map.json.")
    parser.add_argument("--actual", type=Path, required=True, help="Unmodified simulator/emulator PNG capture.")
    parser.add_argument("--map", type=Path, default=QA_ROOT / "discovery" / "reference-map.json")
    parser.add_argument("--actual-crop", type=crop_box, help="Optional measured app-display bounds, in raw screenshot pixels.")
    parser.add_argument("--reference-crop", type=crop_box, help="Override the documented approximate reference inner-display bounds.")
    parser.add_argument("--width", type=int, default=390)
    parser.add_argument("--align", choices=("top", "center", "bottom"), default="top")
    parser.add_argument("--ignore-top", type=int, default=0, help="Exclude this many normalized pixels from metrics only (e.g. status bar).")
    parser.add_argument("--out", type=Path, help="Output directory, restricted to development/qa/auth.")
    args = parser.parse_args()
    if args.width < 100 or args.width > 2000 or args.ignore_top < 0:
        parser.error("Width must be 100..2000 and ignore-top must be nonnegative.")

    mapping = json.loads(args.map.read_text(encoding="utf-8-sig"))
    entry = next((item for item in mapping if item["route"] == args.route), None)
    if entry is None:
        parser.error(f"No reference mapping exists for route {args.route!r}.")
    reference_path = (REPO_ROOT / entry["reference"]).resolve()
    actual_path = args.actual.resolve()
    if not actual_path.is_file():
        parser.error(f"Capture does not exist: {actual_path}")
    output = (args.out or (QA_ROOT / "comparisons" / args.route / actual_path.stem)).resolve()
    if not output.is_relative_to(QA_ROOT.resolve()) or output == QA_ROOT.resolve():
        parser.error("Output must be a dedicated directory inside development/qa/auth.")
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        parser.error("Output directory is not empty. Use a new pass directory to preserve earlier comparisons.")

    reference_raw = open_rgb(reference_path)
    actual_raw = open_rgb(actual_path)
    reference_crop = args.reference_crop or entry["viewportBoundsApproximate"]
    reference = width_normalize(checked_crop(reference_raw, reference_crop), args.width)
    actual = width_normalize(checked_crop(actual_raw, args.actual_crop) if args.actual_crop else actual_raw, args.width)
    reference.save(output / "reference-normalized.png")
    actual.save(output / "actual-normalized.png")

    common_height = min(reference.height, actual.height)
    if args.ignore_top >= common_height:
        parser.error("ignore-top excludes the entire common display.")
    top = {"top": lambda height: 0, "center": lambda height: (height - common_height) // 2, "bottom": lambda height: height - common_height}[args.align]
    reference_top, actual_top = top(reference.height), top(actual.height)
    reference_region = reference.crop((0, reference_top + args.ignore_top, args.width, reference_top + common_height))
    actual_region = actual.crop((0, actual_top + args.ignore_top, args.width, actual_top + common_height))
    difference = ImageChops.difference(reference_region, actual_region)
    difference.save(output / "absolute-difference.png")
    ImageEnhance.Contrast(difference).enhance(3).save(output / "difference-enhanced.png")
    Image.blend(reference_region, actual_region, 0.5).save(output / "overlay.png")

    label_height, gutter = 34, 16
    side = Image.new("RGB", (args.width * 2 + gutter, max(reference.height, actual.height) + label_height), "#EAEAEA")
    side.paste(reference, (0, label_height))
    side.paste(actual, (args.width + gutter, label_height))
    draw = ImageDraw.Draw(side)
    draw.text((8, 9), f"REFERENCE: {args.route}", fill="#101747")
    draw.text((args.width + gutter + 8, 9), f"ACTUAL INPUT: {actual_path.name}", fill="#101747")
    side.save(output / "side-by-side.png")

    stats = ImageStat.Stat(difference)
    absolute_error = sum(stats.mean) / 3
    metrics = {
        "route": args.route,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "reference": str(reference_path),
        "actual": str(actual_path),
        "captureProvenance": "Confirm the companion native capture metadata; this script does not attest image origin.",
        "referenceSourceDimensions": list(reference_raw.size),
        "actualSourceDimensions": list(actual_raw.size),
        "referenceCrop": list(reference_crop),
        "referenceCropApproximate": args.reference_crop is None,
        "actualCrop": list(args.actual_crop) if args.actual_crop else None,
        "referenceNormalizedDimensions": list(reference.size),
        "actualNormalizedDimensions": list(actual.size),
        "alignment": args.align,
        "normalizedHeightDifferencePixels": actual.height - reference.height,
        "comparedDimensions": list(difference.size),
        "ignoredTopPixels": args.ignore_top,
        "meanAbsoluteError0to255": round(absolute_error, 4),
        "meanAbsoluteErrorFraction": round(absolute_error / 255, 6),
        "perChannelMeanAbsoluteError": [round(value, 4) for value in stats.mean],
        "ssim": None,
        "status": "diagnostic-only; visual review required",
        "limitations": [
            "Reference crop bounds are approximate unless explicitly overridden.",
            "Both images are scaled proportionally to the same width; neither is stretched to hide aspect mismatch.",
            "Metrics cover the aligned overlapping height only; extra height remains visible in side-by-side and reported separately.",
            "Font rasterization, native status bars, cutouts, keyboard, artwork and reference sample data affect differences.",
            "No SSIM library is required or claimed, and no automatic pass threshold is used.",
        ],
    }
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "meanAbsoluteError0to255": metrics["meanAbsoluteError0to255"], "heightDifferencePixels": metrics["normalizedHeightDifferencePixels"], "status": metrics["status"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
