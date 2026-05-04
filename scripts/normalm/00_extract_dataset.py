#!/usr/bin/env python3
"""
00_extract_dataset.py
─────────────────────────────────────────────────────────────────────────────
Estrae 3 dataset di training da normaai_chunks (Supabase):

  1. raw_corpus.jsonl       — chunk grezzi per continued pre-training (CPT)
  2. qa_pairs.jsonl         — Q&A sintetici "Cos'è X?" / "L'art. Y..." per SFT
  3. orientamenti.jsonl     — massime Cassazione → orientamento giurisprudenziale

Uso:
  export SUPABASE_URL=https://rjwaegzdfsdlnbijkark.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=...
  python3 00_extract_dataset.py --out ./data --max-chunks 0  # 0 = all

I file vanno in `data/` e sono già nel formato JSONL atteso dai trainer
HuggingFace (datasets.load_dataset("json", data_files=...)).

Stima dimensioni:
  - raw_corpus.jsonl   : ~5GB (8.3M chunk × ~600 char medi)
  - qa_pairs.jsonl     : ~150MB (~500K Q&A generate)
  - orientamenti.jsonl : ~30MB (~80K massime)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── Q&A templates (italiano legale) ──────────────────────────────────────
# Ognuno produce un esempio nel formato instruct:
#   {"instruction": "...", "input": "...", "output": "..."}
QA_TEMPLATES = [
    # Lookup per articolo
    ('Cos\'è l\'{art} del {fonte}?',                'Spiega l\'{art} del {fonte}.'),
    ('Cosa dice l\'{art} {fonte}?',                  'Riporta il testo dell\'{art} {fonte}.'),
    ('Riassumi l\'{art} {fonte}.',                   'Sintetizza il contenuto dell\'{art} {fonte}.'),
    # Vigenza
    ('L\'{art} {fonte} è ancora in vigore?',         'Verifica se l\'{art} {fonte} è vigente.'),
    # Definizioni
    ('Cosa intende il legislatore con "{titolo}"?',  'Definisci il concetto di "{titolo}" nel {fonte}.'),
]

ART_RE = re.compile(r"\bart(?:icolo|\.)\s*(\d+(?:[\-\s]?(?:bis|ter|quater|quinquies))?)", re.IGNORECASE)


def extract_article(titolo: str | None, chunk: str | None) -> str | None:
    for source in [titolo or "", chunk or ""]:
        m = ART_RE.search(source[:300])
        if m:
            return f"art. {m.group(1)}"
    return None


def write_raw_corpus(sb: Client, out_path: Path, max_chunks: int):
    """For continued pre-training: one chunk per line, plain text."""
    print(f"→ raw_corpus → {out_path}")
    written = 0
    last_id = None
    with out_path.open("w", encoding="utf-8") as f:
        while True:
            q = sb.table("normaai_chunks").select("id, titolo, chunk, fonte").order("id").limit(1000)
            if last_id:
                q = q.gt("id", last_id)
            rows = q.execute().data
            if not rows:
                break
            for r in rows:
                if max_chunks and written >= max_chunks:
                    return
                txt = (r.get("titolo") or "").strip()
                body = (r.get("chunk") or "").strip()
                if not body:
                    continue
                full = f"{txt}\n\n{body}" if txt else body
                # JSONL: {"text": "..."} as expected by HF trainer
                f.write(json.dumps({"text": full, "fonte": r.get("fonte")}, ensure_ascii=False) + "\n")
                written += 1
            last_id = rows[-1]["id"]
            if written % 10000 < 1000:
                print(f"  ... {written:,} righe scritte", end="\r")
    print(f"\n  totale: {written:,}")


def write_qa_pairs(sb: Client, out_path: Path, max_examples: int):
    """SFT instruct dataset built deterministically from chunk metadata."""
    print(f"→ qa_pairs → {out_path}")
    written = 0
    last_id = None
    with out_path.open("w", encoding="utf-8") as f:
        while True:
            q = sb.table("normaai_chunks").select("id, titolo, chunk, fonte").order("id").limit(1000)
            if last_id:
                q = q.gt("id", last_id)
            rows = q.execute().data
            if not rows:
                break
            for r in rows:
                if max_examples and written >= max_examples:
                    return
                titolo = (r.get("titolo") or "").strip()
                chunk = (r.get("chunk") or "").strip()
                fonte = (r.get("fonte") or "").strip()
                if not chunk or not fonte:
                    continue

                art = extract_article(titolo, chunk)
                # Prefer article-grounded templates when we have an article
                if art:
                    for q_tpl, instr_tpl in QA_TEMPLATES[:4]:
                        question = q_tpl.format(art=art, fonte=fonte, titolo=titolo)
                        instruction = instr_tpl.format(art=art, fonte=fonte, titolo=titolo)
                        record = {
                            "instruction": instruction,
                            "input": question,
                            "output": chunk,
                            "meta": {"fonte": fonte, "id": r["id"]},
                        }
                        f.write(json.dumps(record, ensure_ascii=False) + "\n")
                        written += 1
                else:
                    # No article → only the definition template
                    q_tpl, instr_tpl = QA_TEMPLATES[4]
                    if not titolo:
                        continue
                    record = {
                        "instruction": instr_tpl.format(fonte=fonte, titolo=titolo),
                        "input": q_tpl.format(titolo=titolo),
                        "output": chunk,
                        "meta": {"fonte": fonte, "id": r["id"]},
                    }
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    written += 1
            last_id = rows[-1]["id"]
            if written % 10000 < 1000:
                print(f"  ... {written:,} esempi", end="\r")
    print(f"\n  totale: {written:,}")


def write_orientamenti(sb: Client, out_path: Path):
    """Filter Cassazione/Corte Cost. chunks → 'massima' style training."""
    print(f"→ orientamenti → {out_path}")
    written = 0
    last_id = None
    GIURIS_TIPI = ["sentenza", "cassazione", "corte_costituzionale"]
    with out_path.open("w", encoding="utf-8") as f:
        while True:
            q = sb.table("normaai_chunks").select("id, titolo, chunk, fonte, tipo").order("id").limit(1000)
            if last_id:
                q = q.gt("id", last_id)
            rows = q.execute().data
            if not rows:
                break
            for r in rows:
                tipo = (r.get("tipo") or "").lower()
                if not any(t in tipo for t in GIURIS_TIPI):
                    continue
                chunk = (r.get("chunk") or "").strip()
                fonte = (r.get("fonte") or "").strip()
                if not chunk or len(chunk) < 200:
                    continue
                record = {
                    "instruction": f"Riassumi l'orientamento giurisprudenziale di {fonte}.",
                    "input": "",
                    "output": chunk,
                    "meta": {"fonte": fonte, "tipo": tipo, "id": r["id"]},
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                written += 1
            last_id = rows[-1]["id"]
            if written % 5000 < 1000:
                print(f"  ... {written:,} massime", end="\r")
    print(f"\n  totale: {written:,}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("./data"))
    ap.add_argument("--max-chunks", type=int, default=0,
                    help="limit raw_corpus + qa_pairs (0 = no limit)")
    ap.add_argument("--skip", nargs="*", default=[],
                    choices=["raw", "qa", "orientamenti"])
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    if "raw" not in args.skip:
        write_raw_corpus(sb, args.out / "raw_corpus.jsonl", args.max_chunks)
    if "qa" not in args.skip:
        write_qa_pairs(sb, args.out / "qa_pairs.jsonl", args.max_chunks * 4 if args.max_chunks else 0)
    if "orientamenti" not in args.skip:
        write_orientamenti(sb, args.out / "orientamenti.jsonl")

    print()
    print("Dataset estratti. Prossimo step:")
    print("  python3 02_cpt.py --base mistralai/Mistral-7B-v0.3 --train data/raw_corpus.jsonl")


if __name__ == "__main__":
    main()
