from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .cache import FileCache
from .config import get_settings
from .parsers import load_all_shifts, load_shift
from .reconcile import reconcile_shift


SETTINGS = get_settings()
CACHE = FileCache(SETTINGS.cache_dir)
BASE_DIR = Path(__file__).resolve().parents[1]
TEST_SHIFTS_DIR = BASE_DIR / "test_shifts"
GENERATED_SHIFTS_DIR = BASE_DIR / "generated_shifts"


class BatchRequest(BaseModel):
    shift_dirs: list[str]


app = FastAPI(title="Timesheet Reconciliation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _all_shift_roots() -> list[Path]:
    roots: list[Path] = []
    for candidate in [TEST_SHIFTS_DIR, GENERATED_SHIFTS_DIR]:
        if candidate.exists():
            roots.append(candidate)
    return roots


def _load_index() -> list[dict]:
    items: list[dict] = []
    for root in _all_shift_roots():
        for shift in load_all_shifts(root):
            items.append(
                {
                    "folder_name": shift.folder_name,
                    "shift_id": shift.facility.shift_id,
                    "worker_id": shift.facility.worker_id,
                    "worker_name": shift.facility.worker_name,
                    "path": str(root / shift.folder_name),
                }
            )
    return items


def _find_shift_dir(shift_id: str) -> Path | None:
    for record in _load_index():
        if record["shift_id"] == shift_id or record["folder_name"] == shift_id:
            return Path(record["path"])
    return None


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/shifts")
def list_shifts() -> list[dict]:
    return _load_index()


@app.get("/api/shifts/{shift_id}")
def get_shift(shift_id: str) -> dict:
    shift_dir = _find_shift_dir(shift_id)
    if shift_dir is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift = load_shift(shift_dir)
    return shift.model_dump(mode="json")


@app.post("/api/reconcile/upload")
async def reconcile_upload(
    facility: UploadFile = File(...),
    worker: UploadFile = File(...),
    gps: UploadFile = File(...),
    messages: UploadFile = File(...),
) -> dict:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        files = {
            "facility.csv": facility,
            "worker.json": worker,
            "gps.json": gps,
            "messages.txt": messages,
        }

        for target_name, upload in files.items():
            target = temp / target_name
            target.write_bytes(await upload.read())

        shift = load_shift(temp)
        result = reconcile_shift(shift, settings=SETTINGS, cache=CACHE)
        return result.model_dump(mode="json")


@app.post("/api/reconcile/batch")
def reconcile_batch(request: BatchRequest) -> dict:
    results = []
    for shift_dir in request.shift_dirs:
        path = Path(shift_dir)
        if not path.exists():
            raise HTTPException(status_code=400, detail=f"Shift directory does not exist: {shift_dir}")
        result = reconcile_shift(load_shift(path), settings=SETTINGS, cache=CACHE)
        results.append(result.model_dump(mode="json"))
    return {"results": results}


@app.post("/api/reconcile/{shift_id}")
def reconcile_by_id(shift_id: str) -> dict:
    shift_dir = _find_shift_dir(shift_id)
    if shift_dir is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    result = reconcile_shift(load_shift(shift_dir), settings=SETTINGS, cache=CACHE)
    return result.model_dump(mode="json")
