#!/usr/bin/env python3
"""
Triage CLI — Francesco reviews seed_50.json + variants_100.json and inserts
into Supabase eval_normaai_v1 with frozen_at=NULL. Final FREEZE command sets
frozen_at=NOW() on accepted rows.

Inputs:
  scripts/eval/seed_50.json
  scripts/eval/variants_100.json

Env:
  SUPABASE_URL              https://rjwaegzdfsdlnbijkark.supabase.co
  SUPABASE_SERVICE_ROLE_KEY (service role, write access to eval_normaai_v1)

Commands during triage:
  [Enter]/a   accept as-is, save to staging (next)
  e           edit fields interactively
  s           skip (do not insert)
  g           gap-fill: type a brand-new query
  q           quit (save staging, do not freeze)
  /save       flush staging to Postgres (frozen_at NULL)
  /dist       show category/difficulty distribution
  /freeze     final lock: UPDATE frozen_at=NOW() WHERE frozen_at IS NULL
  /help       this menu

State: scripts/eval/.triage_state.json (resume after quit)
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: pip install supabase", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
SEED_FILE = ROOT / "scripts" / "eval" / "seed_50.json"
VAR_FILE = ROOT / "scripts" / "eval" / "variants_100.json"
STATE = ROOT / "scripts" / "eval" / ".triage_state.json"

SUPA_URL = os.environ.get("SUPABASE_URL", "https://rjwaegzdfsdlnbijkark.supabase.co")
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

DIFF_LABEL = {1: "easy", 2: "medium", 3: "hard"}


def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"index": 0, "accepted": [], "skipped": [], "gap_fills": []}


def save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")


def load_pool() -> list[dict]:
    pool: list[dict] = []
    if SEED_FILE.exists():
        pool.extend(json.loads(SEED_FILE.read_text(encoding="utf-8")))
    if VAR_FILE.exists():
        pool.extend(json.loads(VAR_FILE.read_text(encoding="utf-8")))
    return pool


def show_query(q: dict, idx: int, total: int) -> None:
    print("\n" + "=" * 78)
    print(f"  [{idx + 1}/{total}]  {q['query_id']}  · {q['category']} · diff={DIFF_LABEL[q['difficulty']]}")
    print("=" * 78)
    print(f"\n  Q: {q['query_text']}\n")
    print(f"  expected_topics    : {q.get('expected_topics', [])}")
    print(f"  expected_norma_refs: {q.get('expected_norma_refs', [])}")
    rub = q.get("rubric", {})
    print(f"  forbidden_halluc.  : {rub.get('forbidden_hallucinations', [])}")
    print(f"  source             : {rub.get('source')}")
    if rub.get("parent_query_id"):
        print(f"  parent             : {rub['parent_query_id']}")
    if rub.get("gold_answer"):
        print(f"  gold_answer        : {rub['gold_answer'][:200]}")
    print()


def edit_query(q: dict) -> dict:
    print("\nEdit (Enter = keep current). Use ; as separator for arrays.")
    new_text = input(f"  query_text [{q['query_text'][:60]}...]: ").strip()
    if new_text:
        q["query_text"] = new_text
    diff_in = input(f"  difficulty 1-3 [{q['difficulty']}]: ").strip()
    if diff_in.isdigit() and int(diff_in) in (1, 2, 3):
        q["difficulty"] = int(diff_in)
        q["rubric"]["difficulty_label"] = DIFF_LABEL[int(diff_in)]
    topics_in = input(f"  expected_topics [{';'.join(q.get('expected_topics', []))}]: ").strip()
    if topics_in:
        q["expected_topics"] = [t.strip() for t in topics_in.split(";") if t.strip()]
    refs_in = input(f"  expected_norma_refs [{';'.join(q.get('expected_norma_refs', []))}]: ").strip()
    if refs_in:
        q["expected_norma_refs"] = [r.strip() for r in refs_in.split(";") if r.strip()]
    gold_in = input(f"  gold_answer (optional, blank = skip): ").strip()
    if gold_in:
        q["rubric"]["gold_answer"] = gold_in
    return q


def gap_fill() -> dict | None:
    print("\nGap-fill new query:")
    qid = input("  query_id (e.g. GAP-001): ").strip()
    text = input("  question: ").strip()
    cat = input("  category (lavoro/fisco/...): ").strip()
    diff_in = input("  difficulty 1-3: ").strip()
    if not (qid and text and cat and diff_in.isdigit() and int(diff_in) in (1, 2, 3)):
        print("  cancelled (missing required fields)")
        return None
    diff = int(diff_in)
    topics = [t.strip() for t in input("  expected_topics (;): ").split(";") if t.strip()]
    refs = [r.strip() for r in input("  expected_norma_refs (;): ").split(";") if r.strip()]
    gold = input("  gold_answer (optional): ").strip() or None
    return {
        "query_id": qid,
        "query_text": text,
        "category": cat,
        "difficulty": diff,
        "expected_topics": topics,
        "expected_norma_refs": refs,
        "rubric": {
            "gold_answer": gold,
            "expected_citations": [{"source": r, "article": None, "year": None} for r in refs],
            "forbidden_hallucinations": [],
            "weights": {"accuracy": 0.30, "completeness": 0.25, "citations": 0.25, "hallucination": 0.20},
            "difficulty_label": DIFF_LABEL[diff],
            "source": "francesco-gap-fill",
        },
        "notes": "gap-fill",
    }


def show_distribution(rows: list[dict]) -> None:
    by_cat: dict[str, int] = {}
    by_diff: dict[int, int] = {}
    for r in rows:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
        by_diff[r["difficulty"]] = by_diff.get(r["difficulty"], 0) + 1
    print(f"\n  Total accepted: {len(rows)}")
    print("  By category:")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"    {c:<14} {n:>3}")
    print("  By difficulty:")
    for d in (1, 2, 3):
        print(f"    {DIFF_LABEL[d]:<7} {by_diff.get(d, 0)}")


def get_supa() -> Client:
    if not SUPA_KEY:
        print("ERROR: set SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)
    return create_client(SUPA_URL, SUPA_KEY)


def flush_to_db(rows: list[dict]) -> int:
    """Upsert rows into eval_normaai_v1 with frozen_at=NULL. Returns inserted count."""
    if not rows:
        return 0
    sb = get_supa()
    payload = []
    for r in rows:
        payload.append({
            "query_id": r["query_id"],
            "query_text": r["query_text"],
            "category": r["category"],
            "difficulty": r["difficulty"],
            "expected_topics": r["expected_topics"],
            "expected_norma_refs": r["expected_norma_refs"],
            "rubric": r["rubric"],
            "notes": r.get("notes"),
        })
    res = sb.table("eval_normaai_v1").upsert(payload, on_conflict="query_id").execute()
    return len(res.data or [])


def freeze_db() -> int:
    """Set frozen_at=NOW() on rows that are still NULL. Returns count locked."""
    sb = get_supa()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
    res = sb.table("eval_normaai_v1").update({"frozen_at": now_iso}).is_("frozen_at", "null").execute()
    return len(res.data or [])


def main() -> int:
    pool = load_pool()
    if not pool:
        print(f"ERROR: pool empty. Run extract_seed.py + generate_variants.py first.", file=sys.stderr)
        return 1
    state = load_state()
    print(f"\nLoaded pool: {len(pool)} candidates. Resuming at index {state['index']}.")
    print("Commands: [Enter]/a accept, e edit, s skip, g gap-fill, q quit, /save /freeze /dist /help\n")

    i = state["index"]
    while i < len(pool):
        q = dict(pool[i])
        show_query(q, i, len(pool))
        cmd = input("  cmd> ").strip().lower()

        if cmd in ("", "a"):
            state["accepted"].append(q)
            i += 1
        elif cmd == "e":
            q = edit_query(q)
            state["accepted"].append(q)
            i += 1
        elif cmd == "s":
            state["skipped"].append(q["query_id"])
            i += 1
        elif cmd == "g":
            new_q = gap_fill()
            if new_q:
                state["accepted"].append(new_q)
                state["gap_fills"].append(new_q["query_id"])
        elif cmd == "/dist":
            show_distribution(state["accepted"])
        elif cmd == "/save":
            n = flush_to_db(state["accepted"])
            print(f"  upserted {n} rows (frozen_at=NULL).")
        elif cmd == "/freeze":
            confirm = input("  Type FREEZE to confirm lock: ").strip()
            if confirm == "FREEZE":
                n = flush_to_db(state["accepted"])
                print(f"  upserted {n} rows.")
                locked = freeze_db()
                print(f"  LOCKED {locked} rows with frozen_at=NOW().")
            else:
                print("  cancelled.")
        elif cmd == "q":
            break
        elif cmd == "/help":
            print("  Enter/a accept | e edit | s skip | g gap-fill | q quit | /save /freeze /dist")
        else:
            print(f"  unknown: {cmd}")

        state["index"] = i
        save_state(state)

    show_distribution(state["accepted"])
    print(f"\nState saved to {STATE.relative_to(ROOT)}. Run again to resume.")
    print("Run /save to push to DB, /freeze to lock.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
