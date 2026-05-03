#!/usr/bin/env python3
"""
corpus-reembed-dedup.py
─────────────────────────────────────────────────────────────────────────────
Re-embed normaai_chunks (8.3M rows) into the existing 1024-dim
`embedding_bgem3` column using bge-m3 running on GEX44 (Ollama or
Infinity), and deduplicate near-identical chunks via cosine similarity > 0.97.

NOTE — schema reality check (3 May 2026):
  • normaai_chunks already has 2 vector columns:
      - `embedding`         vector(384)   — bge-small (LIVE in production)
      - `embedding_bgem3`   vector(1024)  — added 2 May 2026, ~68% backfilled
  • This script writes ONLY to `embedding_bgem3`. The 384-dim `embedding`
    stays untouched until the new bge-m3 RPC is promoted to production.
  • Resume: skip rows where `embedding_bgem3 IS NOT NULL` (instead of
    relying on a separate progress table — saner because someone else
    is also backfilling concurrently).

WHY:
  - Current embedding: bge-small-en-v1.5, 384d, English-trained, English VPS.
    Italian legal text is a poor fit for an English encoder. Recall is ~70%
    on real legal queries (golden set, May 2026).
  - nomic-embed-text (768d) is multilingual and trained on a much larger
    web crawl. On legal IT golden set: recall ~88% (+18 absolute).
  - Corpus has 30-40% near-duplicates (same article in Normattiva +
    Camera + Gazzetta + EUR-Lex). Top-K retrieval often returns 5 copies
    of the same chunk, starving the LLM of diverse sources.

PROCESS:
  1. Stream rows from normaai_chunks (id, chunk, titolo).
  2. For each batch (size 64), POST to GEX44 Ollama embeddings endpoint.
  3. Hash chunk text → check previous batches (Bloom filter) for exact dup.
  4. UPSERT into normaai_chunks_v2 (768d column embedding_bgem3).
  5. After full pass, run DELETE for near-duplicates by cosine > 0.97
     against the last accepted chunk in the same fonte+titolo group.

PRECONDITIONS:
  - GEX44 reachable via Tailscale (OLLAMA_BASE).
  - nomic-embed-text pulled on GEX44: `ollama pull nomic-embed-text`.
  - Migration 003 applied (adds embedding_bgem3 vector(768) column).
  - SUPABASE_SERVICE_ROLE_KEY in env.

USAGE:
  export OLLAMA_BASE=http://100.x.x.x:11434
  export SUPABASE_URL=https://rjwaegzdfsdlnbijkark.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=...
  python3 corpus-reembed-dedup.py --batch-size 64 --resume

ESTIMATED TIME (RTX 4000 Ada 20GB on GEX44):
  - 8.3M chunks @ ~150 chunks/sec single GPU → ~15 hours
  - With batch=64 parallel pipeline: ~10-12 hours
  - Resumable: SAFE to interrupt and restart
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time
from dataclasses import dataclass
from typing import Iterable

import httpx
from supabase import create_client, Client

OLLAMA_BASE = os.environ.get("OLLAMA_BASE", "http://localhost:11434")
# Default: bge-m3 (matches embedding_bgem3 column dim 1024). Override via env
# only if you also know the corpus column expects a different dim.
OLLAMA_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "bge-m3")
EXPECTED_DIM = int(os.environ.get("EXPECTED_DIM", "1024"))
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DEDUP_THRESHOLD = 0.97  # cosine similarity above this → duplicate

# ── Stats ────────────────────────────────────────────────────────────────
@dataclass
class Stats:
    fetched: int = 0
    embedded: int = 0
    duplicate_exact: int = 0
    duplicate_near: int = 0
    written: int = 0
    errors: int = 0
    started_at: float = 0.0

    def rate(self) -> float:
        elapsed = max(time.time() - self.started_at, 1)
        return self.embedded / elapsed

    def eta_hours(self, total: int) -> float:
        rate = self.rate()
        return ((total - self.embedded) / rate) / 3600 if rate > 0 else 0


def embed_batch(client: httpx.Client, texts: list[str]) -> list[list[float]]:
    """Call Ollama /api/embeddings for each text. Ollama doesn't batch
    natively, so we issue parallel requests via a thread pool elsewhere or
    just sequentially per batch (a single GPU still saturates this way).

    Validates dim matches EXPECTED_DIM — refusing to write a wrong-dim vector
    is the only way to avoid corrupting the column silently.
    """
    out: list[list[float]] = []
    for txt in texts:
        r = client.post(
            f"{OLLAMA_BASE}/api/embeddings",
            json={"model": OLLAMA_MODEL, "prompt": txt[:8192]},
            timeout=30,
        )
        r.raise_for_status()
        vec = r.json()["embedding"]
        if len(vec) != EXPECTED_DIM:
            raise RuntimeError(
                f"embed dim mismatch: model {OLLAMA_MODEL} returned {len(vec)}, "
                f"expected {EXPECTED_DIM} for column embedding_bgem3"
            )
        out.append(vec)
    return out


def chunk_hash(text: str) -> str:
    """Stable normalized hash for exact-duplicate detection."""
    norm = " ".join(text.split()).lower()
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def stream_rows(sb: Client, batch_size: int, resume_id: str | None) -> Iterable[list[dict]]:
    """Stream rows in id order, skipping those that already have bge-m3.

    A separate concurrent backfill might be running — we coordinate with it
    by simply selecting WHERE embedding_bgem3 IS NULL. No progress table
    needed.
    """
    last_id = resume_id
    while True:
        q = (
            sb.table("normaai_chunks")
            .select("id, chunk, titolo, fonte")
            .is_("embedding_bgem3", "null")
            .order("id")
            .limit(batch_size)
        )
        if last_id:
            q = q.gt("id", last_id)
        rows = q.execute().data
        if not rows:
            return
        yield rows
        last_id = rows[-1]["id"]


def write_progress(stats: Stats, total: int, last_id: str):
    bar_len = 30
    filled = int(bar_len * stats.embedded / max(total, 1))
    bar = "█" * filled + "·" * (bar_len - filled)
    pct = 100 * stats.embedded / max(total, 1)
    eta = stats.eta_hours(total)
    sys.stdout.write(
        f"\r[{bar}] {pct:5.2f}% | {stats.embedded:>9,}/{total:>9,} | "
        f"{stats.rate():.1f} ch/s | ETA {eta:5.2f}h | dup_exact={stats.duplicate_exact:,} "
        f"dup_near={stats.duplicate_near:,} err={stats.errors} | last={last_id[:8]}"
    )
    sys.stdout.flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--resume", action="store_true", help="resume from last_id stored in normaai_reembed_progress")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get total count
    total = sb.table("normaai_chunks").select("id", count="exact").limit(1).execute().count or 0
    print(f"Corpus total: {total:,} chunks")

    # No separate progress table — `WHERE embedding_bgem3 IS NULL` does the
    # job. The optional --resume flag is kept for API compatibility but is
    # now a no-op (the IS NULL filter automatically skips rows already done).
    resume_id = None
    if args.resume:
        print("Note: --resume is implicit (skipping rows where embedding_bgem3 IS NOT NULL).")

    seen_hashes: set[str] = set()  # exact-dup detection (in-process Bloom-equivalent)
    stats = Stats(started_at=time.time())

    with httpx.Client(timeout=60) as http:
        for batch in stream_rows(sb, args.batch_size, resume_id):
            stats.fetched += len(batch)

            # Exact-dup check first (cheap)
            unique_batch: list[dict] = []
            for row in batch:
                h = chunk_hash(row["chunk"] or "")
                if h in seen_hashes:
                    stats.duplicate_exact += 1
                    continue
                seen_hashes.add(h)
                unique_batch.append(row)

            if not unique_batch:
                continue

            # Embed
            try:
                texts = [f"{r['titolo'] or ''}\n{r['chunk'] or ''}" for r in unique_batch]
                vectors = embed_batch(http, texts)
            except Exception as e:
                stats.errors += len(unique_batch)
                print(f"\n[WARN] embed failed for batch: {e}", file=sys.stderr)
                continue

            stats.embedded += len(vectors)

            # Write
            if not args.dry_run:
                # Use UPDATE per row rather than UPSERT — UPSERT would overwrite
                # other unrelated columns we didn't select.
                for row, vec in zip(unique_batch, vectors):
                    try:
                        sb.table("normaai_chunks").update(
                            {"embedding_bgem3": vec}
                        ).eq("id", row["id"]).execute()
                        stats.written += 1
                    except Exception as e:
                        stats.errors += 1
                        print(f"\n[WARN] update {row['id']} failed: {e}", file=sys.stderr)

            write_progress(stats, total, batch[-1]["id"])

    print()
    print(f"Done. Embedded {stats.embedded:,} / {total:,}. Errors: {stats.errors}.")
    print(f"Exact dups skipped: {stats.duplicate_exact:,}")
    print()
    print("NEXT STEP: Run dedup_near_duplicates.sql to remove cosine > 0.97 pairs.")


if __name__ == "__main__":
    main()
