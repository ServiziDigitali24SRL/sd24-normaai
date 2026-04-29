#!/usr/bin/env tsx
/**
 * SER-84: Corpus-as-Code — import script
 *
 * Legge file YAML/JSON dalla cartella corpus-dsl/norme/
 * e aggiorna le tabelle norma_relazioni e corpus_versions.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... tsx import.ts
 *   tsx import.ts --dry-run    # valida senza scrivere
 *   tsx import.ts --dir ./norme --version "2026-Q3"
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { validateNorma, type CorpusDslFile, type Relazione } from "./schema";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    dir: args[args.indexOf("--dir") + 1] ?? path.join(__dirname, "norme"),
    version: args[args.indexOf("--version") + 1] ?? `${new Date().toISOString().slice(0, 7)}-auto`,
  };
}

function loadDslFiles(dir: string): CorpusDslFile[] {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} non esiste — creazione con esempio.`);
    fs.mkdirSync(dir, { recursive: true });
    // Crea file di esempio
    fs.writeFileSync(
      path.join(dir, "dlgs-81-2008.json"),
      JSON.stringify(EXAMPLE_DSL_FILE, null, 2)
    );
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml"));
  const results: CorpusDslFile[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    try {
      const parsed = JSON.parse(content) as CorpusDslFile;
      results.push(parsed);
    } catch {
      console.warn(`⚠️  ${file}: JSON parse error, skip`);
    }
  }
  return results;
}

// ── Import relazioni in DB ────────────────────────────────────────────────────

async function upsertRelazioni(relazioni: Array<Relazione & { norma_da: string }>, dryRun: boolean): Promise<number> {
  if (dryRun) return relazioni.length;
  let count = 0;
  for (const rel of relazioni) {
    const { error } = await supabase.from("norma_relazioni").upsert(
      {
        norma_da: rel.norma_da,
        norma_a: rel.norma_a,
        tipo: rel.tipo,
        descrizione: rel.descrizione ?? null,
        data_relazione: rel.data ?? null,
        bidirezionale: rel.bidirezionale ?? false,
        confidence: rel.confidence ?? 0.9,
        urn_articolo_da: rel.articolo_da ?? null,
        urn_articolo_a: rel.articolo_a ?? null,
        fonte: "corpus-dsl",
      },
      { onConflict: "norma_da,norma_a,tipo" }
    );
    if (error) console.warn(`  ❌ Upsert relazione ${rel.norma_da} → ${rel.norma_a}: ${error.message}`);
    else count++;
  }
  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, dir, version } = parseArgs();
  console.log(`📚 NormaAI Corpus DSL Import`);
  console.log(`📁 Directory: ${dir}`);
  console.log(`🏷️  Version: ${version}`);
  console.log(`${dryRun ? "🔍 DRY RUN — nessuna scrittura" : "✍️  Modalità scrittura"}\n`);

  const files = loadDslFiles(dir);
  console.log(`📄 File trovati: ${files.length}`);

  let totalRelazioni = 0;
  let errors = 0;
  const allContent: string[] = [];

  for (const dslFile of files) {
    const { norma } = dslFile;
    const { valid, errors: valErrors } = validateNorma(norma);

    if (!valid) {
      console.error(`❌ ${norma.identificatore ?? "??"}: ${valErrors.join(", ")}`);
      errors++;
      continue;
    }

    const relazioniFlat = (norma.relazioni ?? []).map(r => ({ ...r, norma_da: norma.urn }));
    const importedCount = await upsertRelazioni(relazioniFlat, dryRun);
    totalRelazioni += importedCount;

    allContent.push(JSON.stringify(norma));
    console.log(`✅ ${norma.identificatore} — ${relazioniFlat.length} relazioni${dryRun ? " (dry)" : ""}`);
  }

  // Checksum corpus
  const checksum = createHash("sha256").update(allContent.join("\n")).digest("hex");

  // Registra versione corpus
  if (!dryRun && files.length > 0) {
    await supabase.from("corpus_versions").upsert({
      version_tag: version,
      description: `Import automatico — ${files.length} norme, ${totalRelazioni} relazioni`,
      norma_count: files.length,
      checksum,
      deployed_by: "corpus-dsl-import",
    }, { onConflict: "version_tag" });
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 Norme processate: ${files.length - errors}/${files.length}`);
  console.log(`🔗 Relazioni importate: ${totalRelazioni}`);
  console.log(`#️⃣  Checksum: ${checksum.slice(0, 12)}...`);
  if (errors > 0) console.error(`❌ Errori: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
}

// ── Esempio DSL file ──────────────────────────────────────────────────────────

const EXAMPLE_DSL_FILE: CorpusDslFile = {
  version: "1.0",
  norma: {
    urn: "urn:nir:stato:decreto.legislativo:2008-04-09;81",
    identificatore: "D.Lgs. 81/2008",
    titolo: "Testo unico in materia di tutela della salute e della sicurezza nei luoghi di lavoro",
    alias: ["TUSL", "Testo Unico Sicurezza"],
    data_approvazione: "2008-04-09",
    data_vigenza: "2008-05-15",
    status: "vigente",
    fonte: "GU n. 101 del 30-04-2008",
    verticali: ["lavoro", "edilizia", "salute"],
    relazioni: [
      {
        tipo: "abroga",
        norma_a: "urn:nir:stato:decreto.legislativo:1994-09-19;626",
        descrizione: "Abroga il D.Lgs. 626/1994 (Decreto sulla sicurezza lavoro)",
        confidence: 1.0,
      },
      {
        tipo: "modifica",
        norma_a: "urn:nir:stato:legge:1970-05-20;300",
        articolo_da: "art. 304",
        articolo_a: "art. 9",
        descrizione: "Modifica art. 9 dello Statuto dei lavoratori in materia di RSA sicurezza",
        confidence: 0.95,
      },
      {
        tipo: "implementa",
        norma_a: "urn:celex:32009L0104",
        descrizione: "Implementa Dir. 2009/104/CE sull'uso delle attrezzature di lavoro",
        confidence: 0.90,
      },
    ],
  },
};

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
