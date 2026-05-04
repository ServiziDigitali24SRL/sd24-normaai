#!/usr/bin/env python3
"""
03_sft.py — Supervised Fine-Tuning (instruct) sopra il CPT adapter.
Usa formato chat-template Mistral/Qwen e applica un secondo LoRA sopra il
primo (LoRA stacking). L'output finale è un modello che segue istruzioni
italiane in dominio legale.

Pipeline tipica:
  1. 02_cpt.py → adapter base CPT (knowledge injection)
  2. 03_sft.py → adapter SFT (behavior shaping)

Uso:
  python3 03_sft.py \\
    --base mistralai/Mistral-7B-v0.3 \\
    --cpt-adapter outputs/normalm-7b-cpt/final \\
    --train data/qa_pairs.jsonl,data/orientamenti.jsonl \\
    --out outputs/normalm-7b-instruct \\
    --epochs 3 --lr 1e-5 --batch 8

Tempo stimato GEX44: ~40h.
"""
from __future__ import annotations

import argparse
from pathlib import Path


def format_example(ex, tokenizer):
    """Build a chat-template prompt from {instruction, input, output}."""
    user = ex["instruction"]
    if ex.get("input"):
        user = f"{ex['instruction']}\n\n{ex['input']}"
    messages = [
        {"role": "system", "content": "Sei NormaAI, assistente legale italiano. Rispondi citando le fonti normative."},
        {"role": "user", "content": user},
        {"role": "assistant", "content": ex["output"]},
    ]
    return tokenizer.apply_chat_template(messages, tokenize=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--cpt-adapter", type=Path, required=True)
    ap.add_argument("--train", required=True, help="comma-separated JSONL paths")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--lr", type=float, default=1e-5)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--grad-accum", type=int, default=2)
    ap.add_argument("--max-len", type=int, default=4096)
    ap.add_argument("--lora-r", type=int, default=32)
    ap.add_argument("--lora-alpha", type=int, default=64)
    args = ap.parse_args()

    import torch
    from datasets import load_dataset, concatenate_datasets
    from peft import LoraConfig, PeftModel, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
    )
    from trl import SFTConfig, SFTTrainer

    args.out.mkdir(parents=True, exist_ok=True)

    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    tok = AutoTokenizer.from_pretrained(args.base, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    print(f"⟶ Loading base + CPT adapter from {args.cpt_adapter}…")
    model = AutoModelForCausalLM.from_pretrained(
        args.base,
        quantization_config=bnb,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2",
    )
    model = PeftModel.from_pretrained(model, str(args.cpt_adapter), is_trainable=False)
    # Merge CPT into base, then add a new SFT adapter on top
    model = model.merge_and_unload()
    model = prepare_model_for_kbit_training(model)

    sft_lora = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, sft_lora)
    model.print_trainable_parameters()

    print(f"⟶ Loading datasets {args.train}…")
    files = [p.strip() for p in args.train.split(",")]
    parts = [load_dataset("json", data_files=f, split="train") for f in files]
    ds = concatenate_datasets(parts).shuffle(seed=42)

    def map_fn(ex):
        return {"text": format_example(ex, tok)}

    ds = ds.map(map_fn, remove_columns=ds.column_names, num_proc=4)

    config = SFTConfig(
        output_dir=str(args.out),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        bf16=True,
        logging_steps=20,
        save_steps=500,
        warmup_steps=50,
        lr_scheduler_type="cosine",
        gradient_checkpointing=True,
        max_seq_length=args.max_len,
        packing=True,
        dataset_text_field="text",
        report_to=["tensorboard"],
    )

    trainer = SFTTrainer(model=model, args=config, train_dataset=ds, tokenizer=tok)
    print("⟶ Training SFT…")
    trainer.train()
    trainer.save_model(args.out / "final")
    tok.save_pretrained(args.out / "final")
    print(f"✔ NormaLM-7b-instruct salvato in {args.out / 'final'}")


if __name__ == "__main__":
    main()
