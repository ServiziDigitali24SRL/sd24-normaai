#!/usr/bin/env python3
"""
Map golden-set.json (50 manually-curated queries, SER-82) → eval_normaai_v1 schema.

Outputs scripts/eval/seed_50.json. Does NOT touch Postgres.

Schema mapping:
  golden-set            eval_normaai_v1
  -----------------     -------------------
  id                    query_id
  question              query_text
  vertical              category
  difficulty (str)      difficulty (smallint 1-3)
  required_topics       expected_topics (text[])
  expected_citations    expected_norma_refs (text[])
  forbidden_hallucinations + difficulty + meta → rubric (jsonb)

Run: python3 scripts/eval/extract_seed.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOLDEN = ROOT / "scripts" / "golden-set-eval" / "golden-set.json"
OUT = ROOT / "scripts" / "eval" / "seed_50.json"

DIFFICULTY_MAP = {"easy": 1, "medium": 2, "hard": 3}

DEFAULT_WEIGHTS = {
    "accuracy": 0.30,
    "completeness": 0.25,
    "citations": 0.25,
    "hallucination": 0.20,
}


def map_query(q: dict, source: str) -> dict:
    diff_str = (q.get("difficulty") or "medium").lower()
    rubric = {
        "gold_answer": q.get("gold_answer"),
        "expected_citations": [
            {"source": c, "article": None, "year": None}
            for c in q.get("expected_citations", [])
        ],
        "forbidden_hallucinations": q.get("forbidden_hallucinations", []),
        "weights": DEFAULT_WEIGHTS,
        "difficulty_label": diff_str,
        "source": source,
    }
    return {
        "query_id": q["id"],
        "query_text": q["question"],
        "category": q["vertical"],
        "difficulty": DIFFICULTY_MAP.get(diff_str, 2),
        "expected_topics": q.get("required_topics", []),
        "expected_norma_refs": q.get("expected_citations", []),
        "rubric": rubric,
        "notes": None,
    }


def main() -> int:
    if not GOLDEN.exists():
        print(f"ERROR: {GOLDEN} not found", file=sys.stderr)
        return 1

    data = json.loads(GOLDEN.read_text(encoding="utf-8"))
    queries = data.get("queries", [])
    if not queries:
        print("ERROR: golden-set.json has no queries", file=sys.stderr)
        return 1

    mapped = [map_query(q, source="golden-set-v1") for q in queries]

    OUT.write_text(json.dumps(mapped, ensure_ascii=False, indent=2), encoding="utf-8")

    by_cat: dict[str, int] = {}
    by_diff: dict[int, int] = {}
    for m in mapped:
        by_cat[m["category"]] = by_cat.get(m["category"], 0) + 1
        by_diff[m["difficulty"]] = by_diff.get(m["difficulty"], 0) + 1

    print(f"Wrote {len(mapped)} queries -> {OUT.relative_to(ROOT)}")
    print("\nDistribution by category:")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {c:<14} {n:>3}")
    print("\nDistribution by difficulty (1=easy, 2=medium, 3=hard):")
    for d in (1, 2, 3):
        print(f"  {d}: {by_diff.get(d, 0)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
