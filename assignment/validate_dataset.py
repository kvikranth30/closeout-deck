from __future__ import annotations

import argparse
import json
from pathlib import Path

from engine.parsers import load_shift


REQUIRED_FILES = ["facility.csv", "worker.json", "gps.json", "messages.txt"]


def validate_shift(shift_dir: Path) -> list[str]:
    errors: list[str] = []
    for filename in REQUIRED_FILES:
        if not (shift_dir / filename).exists():
            errors.append(f"Missing {filename}")

    if errors:
        return errors

    shift = load_shift(shift_dir)

    if shift.facility.shift_id != shift.worker.shift_id or shift.facility.shift_id != shift.gps.shift_id:
        errors.append("shift_id mismatch across files")

    if shift.facility.worker_id != shift.worker.worker_id or shift.facility.worker_id != shift.gps.worker_id:
        errors.append("worker_id mismatch across files")

    if shift.facility.clock_in and shift.facility.clock_out and shift.facility.clock_out <= shift.facility.clock_in:
        errors.append("facility clock_out <= clock_in")

    if shift.worker.clock_in and shift.worker.clock_out and shift.worker.clock_out <= shift.worker.clock_in:
        errors.append("worker clock_out <= clock_in")

    for event in shift.gps.events:
        if not (-90 <= event.lat <= 90 and -180 <= event.lng <= 180):
            errors.append("invalid GPS coordinates")
            break

    return errors


def validate_dataset(root: Path) -> dict:
    report = {"valid": True, "total": 0, "errors": {}}

    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name == "__pycache__":
            continue
        report["total"] += 1
        errors = validate_shift(child)
        if errors:
            report["valid"] = False
            report["errors"][child.name] = errors

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate generated dataset")
    parser.add_argument("path", type=Path)
    args = parser.parse_args()

    report = validate_dataset(args.path)
    print(json.dumps(report, indent=2))

    if not report["valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
