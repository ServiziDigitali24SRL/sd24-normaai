# NormaLM — Italian Legal Language Model

> Fine-tuning di un modello base 7-9B sul corpus normativo italiano di NormaAI
> (`normaai_chunks`, 8.3M chunk → ~5M post-dedup), per produrre il primo modello
> aperto specializzato in diritto italiano.

## Perché

Nessun modello pubblico LLM al mondo è stato addestrato specificamente sul
corpus normativo italiano. Mistral, Llama, Gemma sanno il diritto italiano "per
incidente" — qualche pagina di Wikipedia legale, qualche decreto pescato nel
crawl. NormaAI ha:

1. **Corpus**: 8.3M chunk (Normattiva + EUR-Lex + Cassazione + Corte Cost. +
   Camera + AGCM + Garante + ...).
2. **GPU**: GEX44 (RTX 4000 Ada 20GB, sufficiente per LoRA fine-tuning su 7B).
3. **Audience**: 1.000+ studi legali target anno 1, ognuno valuta il modello.

Pubblicare NormaLM-7b su HuggingFace = NormaAI diventa standard de facto per
"AI legale italiana", lead generation gratis e organica, asset valutabile per
investitori.

## Pipeline

```
Step 1 — Dataset (00_extract_dataset.py)
    normaai_chunks  →  raw_corpus.jsonl       (continued pre-training)
    normaai_chunks  →  qa_pairs.jsonl         (synthetic Q&A da titolo+chunk)
    cassazione      →  orientamenti.jsonl     (massime → orientamento)

Step 2 — Base model selection (01_pick_base.py)
    Comparare:
      - mistralai/Mistral-7B-v0.3 (Apache 2.0, EU friendly)
      - Qwen/Qwen2.5-7B (Apache 2.0, multilingue)
      - meta-llama/Llama-3.1-8B (Llama license, prod ok)
    Scegliere via 5-shot italiano legale benchmark.

Step 3 — Continued pre-training (02_cpt.py)
    LoRA r=64 alpha=128, lr=2e-5, batch=16, ctx=4096.
    1 epoch su raw_corpus.jsonl (~5GB tokenizzato).
    Output: NormaLM-7b-base-cpt.

Step 4 — Instruction tuning (03_sft.py)
    LoRA r=32 alpha=64, lr=1e-5, batch=8, ctx=4096.
    3 epoch su qa_pairs.jsonl + orientamenti.jsonl.
    Output: NormaLM-7b-instruct.

Step 5 — Evaluation (04_eval.py)
    Golden set NormaAI (200 query reali con risposta validata da avvocato).
    Metriche: exact-match citation, recall, BLEU, expert rating 1-5.
    Confronto vs base model + GPT-4 + Claude Sonnet baseline.

Step 6 — Publish (05_publish.py)
    Push su HuggingFace `ServiziDigitali24/NormaLM-7b-instruct`.
    Model card con benchmark, esempio uso, licenza commerciale chiara.

Step 7 — Serve (06_serve.py)
    GGUF q4_k_m export per Ollama/llama.cpp deployment.
    Pull su GEX44 con `ollama create normalm -f Modelfile`.
    Aggiungere a router.ts come provider Ollama opzionale.
```

## Costi & Tempi

| Fase | Effort umano | GPU time GEX44 | Costo $ extra |
|------|--------------|----------------|---------------|
| Dataset extraction | 4h | 0 | 0 |
| Base model selection | 4h | 4h | 0 |
| CPT (1 epoch) | 2h setup | ~120h (5 giorni) | 0 (ammortizzato) |
| SFT (3 epoch) | 2h setup | ~40h (~2 giorni) | 0 |
| Eval + iterations | 8h | 10h | 0 |
| Publish | 2h | 0 | 0 |
| **Totale** | **~22h** | **~174h GEX44** | **0** |

Realisticamente: 3 settimane calendar time da zero a v0 su HuggingFace.

## Licenza & legale

- Base model: Mistral/Qwen/Llama Apache 2.0 → permesso commercial fine-tune.
- Corpus: 95% testi normativi pubblici (Normattiva, EUR-Lex, GU) → public domain
  per natura. Cassazione: dottrina dominante = uso anche per training senza
  necessità di licenza commerciale (sentenze sono atti pubblici).
- Output model: pubblicato sotto **Apache 2.0** per massima adozione.
- Disclaimer in model card: NON sostituisce consulenza legale, output da
  validare, training cutoff = data X.
