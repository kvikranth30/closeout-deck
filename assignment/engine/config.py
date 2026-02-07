from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_model: str
    openai_timeout_seconds: int
    reasoning_steps_enabled: bool
    cache_dir: Path
    default_hourly_rate: float
    break_dispute_policy: str
    api_host: str
    api_port: int


def _to_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _normalize_break_policy(value: str | None) -> str:
    normalized = (value or "worker_favor").strip().lower()
    if normalized not in {"worker_favor", "midpoint", "facility_favor"}:
        return "worker_favor"
    return normalized


def get_settings() -> Settings:
    cache_dir = Path(os.getenv("CACHE_DIR", ".cache"))
    cache_dir.mkdir(parents=True, exist_ok=True)
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
        openai_timeout_seconds=int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30")),
        reasoning_steps_enabled=_to_bool(os.getenv("REASONING_STEPS_ENABLED"), True),
        cache_dir=cache_dir,
        default_hourly_rate=float(os.getenv("DEFAULT_HOURLY_RATE", "22.0")),
        break_dispute_policy=_normalize_break_policy(os.getenv("BREAK_DISPUTE_POLICY")),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
    )
