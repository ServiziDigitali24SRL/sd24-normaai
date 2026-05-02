#!/usr/bin/env python3
"""
02_cpt.py — Continued Pre-Training (CPT) di un base model 7B sul corpus
normativo italiano via LoRA. Designed for GEX44 (RTX 4000 Ada 20GB).

Strategia LoRA scelta perché:
  - 20GB VRAM è insufficiente per full fine-tuning di un 7B in fp16
    (richiede ~80GB con AdamW + gradients + optimizer states)
  - LoRA adapter (r=64) richiede ~12GB → entra comodo in VRAM
  - Adapter è piccolo (~250MB), facile da pubblicare e mergeare

Uso:
  pip install transformers peft datasets accelerate bitsandbytes trl
  python3 02_cpt.py \\
    --base mistralai/Mistral-7B-v0.3 \\
    --train data/raw_corpus.jsonl \\
    --out outputs/normalm-7b-cpt \\
    --epochs 1 --lr 2e-5 --batch 4 --grad-accum 4

Tempo stimato GEX44:
  - 5GB testo, ~1.3M token tokenizzati
  - 1 epoch a batch 4 + grad-accum 4 = effective batch 16
  - ~120h GPU = 5 giorni continuative (resumable da checkpoint)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="HF base model id, e.g. mistralai/Mistral-7B-v0.3")
    ap.add_argument("--train", required=True, type=Path, help="JSONL file con campo 'text'")
    ap.add_argument("--out", required=True, type=Path, help="output dir per checkpoint + adapter")
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--grad-accum", type=int, default=4)
    ap.add_argument("--max-len", type=int, default=4096)
    ap.add_argument("--lora-r", type=int, default=64)
    ap.add_argument("--lora-alpha", type=int, default=128)
    ap.add_argument("--lora-dropout", type=float, default=0.05)
    ap.add_argument("--save-steps", type=int, default=500)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    # Defer heavy imports so --help works without GPU stack installed
    import torch
    from datasets import load_dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        DataCollatorForLanguageModeling,
        Trainer,
        TrainingArguments,
    )

    args.out.mkdir(parents=True, exist_ok=True)

    print(f"⟶ Loading base model {args.base} in 4-bit (QLoRA)…")
    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    tok = AutoTokenizer.from_pretrained(args.base, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.base,
        quantization_config=bnb,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2",
    )
    model = prepare_model_for_kbit_training(model)

    lora = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        # Mistral / Llama target modules
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    print(f"⟶ Loading dataset {args.train}…")
    ds = load_dataset("json", data_files=str(args.train), split="train")

    def tokenize(example):
        return tok(example["text"], truncation=True, max_length=args.max_len)

    ds = ds.map(tokenize, batched=True, remove_columns=ds.column_names, num_proc=4)

    collator = DataCollatorForLanguageModeling(tok, mlm=False)

    targs = TrainingArguments(
        output_dir=str(args.out),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        bf16=True,
        logging_steps=20,
        save_steps=args.save_steps,
        save_total_limit=3,
        warmup_steps=100,
        lr_scheduler_type="cosine",
        weight_decay=0.0,
        gradient_checkpointing=True,
        report_to=["tensorboard"],
        dataloader_num_workers=2,
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=targs,
        train_dataset=ds,
        data_collator=collator,
    )

    print("⟶ Training…")
    trainer.train(resume_from_checkpoint=args.resume)
    trainer.save_model(args.out / "final")
    tok.save_pretrained(args.out / "final")
    print(f"✔ adapter salvato in {args.out / 'final'}")


if __name__ == "__main__":
    main()
