#!/usr/bin/env python3
"""Voice latency bench — POST audio samples to /api/voice/chat-stream, parse SSE
timing events, compute P50/P95.

Target SER-163 SQ-AGENTS / lat_voice: P50 < 800ms first_audio_ms_from_request_start.

Run:
  python3 scripts/eval/voice-latency-bench.py --base https://normaai.it --samples ./voice-samples/
  python3 scripts/eval/voice-latency-bench.py --base $VERCEL_PREVIEW --fast 1   # enable fast-chunk mode

Audio samples expected: webm/m4a/wav files in --samples dir.
"""
from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path
from typing import Any

import httpx


def stream_sse(client: httpx.Client, url: str, files: dict[str, Any], data: dict[str, str]) -> dict[str, Any]:
    """POST multipart, parse SSE stream, return aggregated timing dict."""
    timings: dict[str, int] = {}
    request_id: str | None = None
    fast_mode: bool | None = None

    with client.stream("POST", url, files=files, data=data, timeout=60) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if not line.startswith("data: "):
                continue
            try:
                ev = json.loads(line[6:])
            except Exception:
                continue
            # Tracked events: meta (requestId), timing (phase, ms), done (totalMs)
            if "requestId" in ev:
                request_id = ev["requestId"]
            if "fastChunkMode" in ev:
                fast_mode = ev["fastChunkMode"]
            phase = ev.get("phase")
            if phase and "ms" in ev:
                timings[phase] = int(ev["ms"])
            if "totalMs" in ev:
                timings["total"] = int(ev["totalMs"])
    return {"request_id": request_id, "fast_mode": fast_mode, **timings}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://normaai.it")
    ap.add_argument("--samples", required=True, help="dir with .webm/.m4a/.wav samples")
    ap.add_argument("--fast", default=None, help="set VOICE_FAST_FIRST_CHUNK=1 via header (informational only)")
    ap.add_argument("--limit", type=int, default=20)
    args = ap.parse_args()

    sample_dir = Path(args.samples)
    if not sample_dir.is_dir():
        print(f"ERROR: {sample_dir} not a directory", file=sys.stderr)
        return 1

    audio_files = sorted([
        p for p in sample_dir.iterdir()
        if p.suffix.lower() in {".webm", ".m4a", ".wav", ".mp3", ".ogg"}
    ])[: args.limit]
    if not audio_files:
        print(f"ERROR: no audio files in {sample_dir}", file=sys.stderr)
        return 1

    url = f"{args.base.rstrip('/')}/api/voice/chat-stream"
    print(f"Bench: {len(audio_files)} samples -> {url}")
    print(f"Fast mode hint: {args.fast}\n")

    runs: list[dict[str, Any]] = []
    with httpx.Client() as cli:
        for i, f in enumerate(audio_files, 1):
            t_start = time.time()
            try:
                with f.open("rb") as fh:
                    runs.append({
                        "file": f.name,
                        **stream_sse(cli, url, files={"file": (f.name, fh)}, data={"history": "[]"}),
                        "wall_ms": int((time.time() - t_start) * 1000),
                    })
                tot = runs[-1].get("total")
                fa = runs[-1].get("first_audio_ms_from_request_start")
                print(f"  [{i}/{len(audio_files)}] {f.name:40} first_audio={fa}ms total={tot}ms")
            except Exception as e:
                print(f"  [{i}/{len(audio_files)}] {f.name}: ERROR {e}", file=sys.stderr)
                runs.append({"file": f.name, "error": str(e)})

    ok_runs = [r for r in runs if "first_audio_ms_from_request_start" in r]
    if not ok_runs:
        print("\nNo successful runs; cannot compute percentiles.", file=sys.stderr)
        return 1

    fa_vals = [r["first_audio_ms_from_request_start"] for r in ok_runs]
    total_vals = [r["total"] for r in ok_runs if "total" in r]
    fa_vals.sort()
    p50 = statistics.median(fa_vals)
    p95 = fa_vals[int(len(fa_vals) * 0.95)] if len(fa_vals) >= 2 else fa_vals[0]

    print(f"\n{'-' * 60}")
    print(f"first_audio_ms (target: P50<800, P95<1500)")
    print(f"  n      = {len(ok_runs)}/{len(runs)}")
    print(f"  P50    = {p50}ms")
    print(f"  P95    = {p95}ms")
    print(f"  mean   = {statistics.mean(fa_vals):.0f}ms")
    if total_vals:
        print(f"\ntotal_ms  mean = {statistics.mean(total_vals):.0f}ms")

    return 0 if p50 < 800 and p95 < 1500 else 2


if __name__ == "__main__":
    sys.exit(main())
