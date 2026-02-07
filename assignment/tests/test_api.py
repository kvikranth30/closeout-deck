from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

import engine.api as api_module


ROOT = Path(__file__).resolve().parents[1]
api_module.SETTINGS = replace(api_module.SETTINGS, openai_api_key=None, reasoning_steps_enabled=False)
app = api_module.app
client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_reconcile_upload_success() -> None:
    shift_dir = ROOT / "test_shifts/shift_001_overtime"
    files = {
        "facility": ("facility.csv", (shift_dir / "facility.csv").read_bytes(), "text/csv"),
        "worker": ("worker.json", (shift_dir / "worker.json").read_bytes(), "application/json"),
        "gps": ("gps.json", (shift_dir / "gps.json").read_bytes(), "application/json"),
        "messages": ("messages.txt", (shift_dir / "messages.txt").read_bytes(), "text/plain"),
    }
    response = client.post("/api/reconcile/upload", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["shift_id"] == "SHF-7829A"
    assert "recommendation" in payload


def test_reconcile_upload_missing_file() -> None:
    shift_dir = ROOT / "test_shifts/shift_001_overtime"
    files = {
        "facility": ("facility.csv", (shift_dir / "facility.csv").read_bytes(), "text/csv"),
        "worker": ("worker.json", (shift_dir / "worker.json").read_bytes(), "application/json"),
        "gps": ("gps.json", (shift_dir / "gps.json").read_bytes(), "application/json"),
    }
    response = client.post("/api/reconcile/upload", files=files)
    assert response.status_code == 422


def test_reconcile_by_shift_id() -> None:
    response = client.post("/api/reconcile/SHF-7829A")
    assert response.status_code == 200
    payload = response.json()
    assert payload["shift_id"] == "SHF-7829A"
    assert "recommendation" in payload
