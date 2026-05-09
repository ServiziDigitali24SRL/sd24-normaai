#!/usr/bin/env python3
"""
Generate 2 variants per seed query via Ollama qwen2.5:7b on GEX44.

Variant types:
  1. paraphrase  — same intent, different wording (same difficulty)
  2. edge_case   — narrower/sharper (one difficulty step harder when possible)

Inputs : scripts/eval/seed_50.json
Outputs: scripts/eval/variants_100.json   (each variant = full eval_normaai_v1 row)

Env:
  LLM_URL              default https://llm.normaai.it
  EMBED_API_KEY        Bearer token (NormaAI internal, same key as embed/rerank)
  OLLAMA_DIRECT_URL    optional, e.g. http://100.75.7.44:11434  (Tailscale)
  OLLAMA_MODEL         default qwen2.5:7b-instruct

Run:
  python3 scripts/eval/generate_variants.py            # uses LLM
  python3 scripts/eval/generate_variants.py --dry-run  # no LLM (placeholder variants)
  python3 scripts/eval/generate_variants.py --limit 5  # only first 5 seeds (=10 variants)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "scripts" / "eval" / "seed_50.json"
OUT = ROOT / "scripts" / "eval" / "variants_100.json"

LLM_URL = os.environ.get("LLM_URL", "https://llm.normaai.it").rstrip("/")
LLM_KEY = os.environ.get("EMBED_API_KEY") or os.environ.get("NORMAAI_INTERNAL_API_KEY")
OLLAMA_DIRECT = os.environ.get("OLLAMA_DIRECT_URL")  # Tailscale, no auth
MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b-instruct")

DIFFICULTY_LABEL = {1: "easy", 2: "medium", 3: "hard"}
DIFFICULTY_INV = {v: k for k, v in DIFFICULTY_LABEL.items()}

PROMPT_TEMPLATE = """Sei un esperto giurista italiano. Ti do una query legale e devo generare 2 varianti per un eval set.

Query originale:
"{question}"
Verticale: {vertical}
Difficoltà: {difficulty}

Genera ESATTAMENTE 2 varianti in JSON:
1. "paraphrase": stesso intento, formulazione diversa, stessa difficoltà
2. "edge_case": caso più complesso/specifico/limite, difficoltà {next_difficulty}

Le varianti devono essere domande naturali che un cittadino o un professionista farebbe a un assistente legale.
NON aggiungere preamboli, NON tradurre, mantieni l'italiano.

Rispondi SOLO con JSON valido nel formato:
{{
  "paraphrase": "domanda paraphrase",
  "edge_case": "domanda edge case"
}}"""


def next_difficulty(d: int) -> str:
    return DIFFICULTY_LABEL[min(d + 1, 3)]


def call_llm(prompt: str, timeout: float = 60.0) -> str:
    """Call Ollama via either direct (Tailscale) or llm.normaai.it (Bearer)."""
    if OLLAMA_DIRECT:
        url = f"{OLLAMA_DIRECT.rstrip('/')}/api/chat"
        body = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 400},
        }
        headers = {"Content-Type": "application/json"}
    else:
        url = f"{LLM_URL}/v1/chat/completions"
        body = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 400,
            "stream": False,
        }
        headers = {"Content-Type": "application/json"}
        if LLM_KEY:
            headers["Authorization"] = f"Bearer {LLM_KEY}"

    with httpx.Client(timeout=timeout) as cli:
        r = cli.post(url, json=body, headers=headers)
        r.raise_for_status()
        j = r.json()

    if OLLAMA_DIRECT:
        return j["message"]["content"]
    return j["choices"][0]["message"]["content"]


def parse_variants(raw: str) -> dict[str, str]:
    raw = raw.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"No JSON object in response: {raw[:200]}")
    obj = json.loads(raw[start : end + 1])
    p = obj.get("paraphrase") or ""
    e = obj.get("edge_case") or ""
    if not p or not e:
        raise ValueError(f"Missing paraphrase/edge_case keys: {obj}")
    return {"paraphrase": p.strip(), "edge_case": e.strip()}


def variant_row(seed: dict, kind: str, idx: int, new_question: str) -> dict:
    """Build eval_normaai_v1-shaped row for a variant."""
    base_id = seed["query_id"]
    new_id = f"{base_id}-{kind[:1].upper()}{idx:02d}"
    new_diff = seed["difficulty"]
    if kind == "edge_case":
        new_diff = min(seed["difficulty"] + 1, 3)
    rubric = dict(seed["rubric"])
    rubric["source"] = f"llm-variant-{kind}"
    rubric["parent_query_id"] = base_id
    rubric["difficulty_label"] = DIFFICULTY_LABEL[new_diff]
    return {
        "query_id": new_id,
        "query_text": new_question,
        "category": seed["category"],
        "difficulty": new_diff,
        "expected_topics": list(seed.get("expected_topics", [])),
        "expected_norma_refs": list(seed.get("expected_norma_refs", [])),
        "rubric": rubric,
        "notes": f"variant {kind} of {base_id}",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="No LLM, placeholder variants")
    ap.add_argument("--limit", type=int, default=None, help="Only first N seeds")
    ap.add_argument("--rate-sleep", type=float, default=0.3, help="Seconds between calls")
    args = ap.parse_args()

    if not SEED.exists():
        print(f"ERROR: {SEED} not found. Run extract_seed.py first.", file=sys.stderr)
        return 1
    seeds = json.loads(SEED.read_text(encoding="utf-8"))
    if args.limit:
        seeds = seeds[: args.limit]

    print(f"Generating variants for {len(seeds)} seeds (dry_run={args.dry_run}, model={MODEL})")
    if not args.dry_run and not OLLAMA_DIRECT and not LLM_KEY:
        print("ERROR: set EMBED_API_KEY or OLLAMA_DIRECT_URL", file=sys.stderr)
        return 1

    out: list[dict] = []
    for i, seed in enumerate(seeds, 1):
        if args.dry_run:
            variants = {
                "paraphrase": f"[DRY] paraphrase di: {seed['query_text']}",
                "edge_case": f"[DRY] edge case di: {seed['query_text']}",
            }
        else:
            prompt = PROMPT_TEMPLATE.format(
                question=seed["query_text"],
                vertical=seed["category"],
                difficulty=DIFFICULTY_LABEL[seed["difficulty"]],
                next_difficulty=next_difficulty(seed["difficulty"]),
            )
            try:
                raw = call_llm(prompt)
                variants = parse_variants(raw)
            except Exception as e:
                print(f"  [{i}/{len(seeds)}] {seed['query_id']}: ERROR {e}", file=sys.stderr)
                continue

        out.append(variant_row(seed, "paraphrase", i, variants["paraphrase"]))
        out.append(variant_row(seed, "edge_case", i, variants["edge_case"]))
        print(f"  [{i}/{len(seeds)}] {seed['query_id']}: ok")
        if not args.dry_run and args.rate_sleep:
            time.sleep(args.rate_sleep)

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {len(out)} variants -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
