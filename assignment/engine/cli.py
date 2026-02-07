from __future__ import annotations

import json
from pathlib import Path

import click
import uvicorn

from .api import app
from .cache import FileCache
from .config import get_settings
from .parsers import load_all_shifts, load_shift
from .reconcile import reconcile_shift


@click.group()
def cli() -> None:
    """Timesheet reconciliation CLI."""


@cli.command("reconcile")
@click.option("--shift-dir", type=click.Path(exists=True, file_okay=False, path_type=Path), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=False)
def reconcile_command(shift_dir: Path, output: Path | None) -> None:
    settings = get_settings()
    cache = FileCache(settings.cache_dir)
    result = reconcile_shift(load_shift(shift_dir), settings=settings, cache=cache)
    payload = result.model_dump(mode="json")
    text = json.dumps(payload, indent=2)
    click.echo(text)
    if output:
        output.write_text(text + "\n", encoding="utf-8")


@cli.command("reconcile-batch")
@click.option("--input-root", type=click.Path(exists=True, file_okay=False, path_type=Path), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=True)
def reconcile_batch_command(input_root: Path, output: Path) -> None:
    settings = get_settings()
    cache = FileCache(settings.cache_dir)
    results = []
    for shift in load_all_shifts(input_root):
        results.append(reconcile_shift(shift, settings=settings, cache=cache).model_dump(mode="json"))
    output.write_text(json.dumps({"results": results}, indent=2) + "\n", encoding="utf-8")
    click.echo(f"Wrote {len(results)} reconciliations to {output}")


@cli.command("serve")
def serve_command() -> None:
    settings = get_settings()
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)


if __name__ == "__main__":
    cli()
