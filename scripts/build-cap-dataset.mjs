#!/usr/bin/env node
// scripts/build-cap-dataset.mjs
//
// Builds the complete CAP dataset (~8000 comuni italiani) from the
// `comuni-json` npm package (data ISTAT, CC-BY-SA 4.0).
//
// Output: src/data/cap-dataset.json (compact format consumed by
// src/app/api/onboarding/lookup/cap/route.ts).
//
// Run:   npm run build:cap     (defined in package.json)
//
// Format output:
//   { ranges: [[cap_start,cap_end,citta,prov,regione],...],
//     singles: [[cap,citta,prov,regione],...] }

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/cap-dataset.json");

const require = createRequire(import.meta.url);
const PKG_PATH = require.resolve("comuni-json/comuni.json");

// Range metro maggiori (la sigla CAP varia all'interno della città)
const METRO_RANGES = [
  ["00118", "00199", "Roma", "RM", "Lazio"],
  ["10121", "10156", "Torino", "TO", "Piemonte"],
  ["16121", "16167", "Genova", "GE", "Liguria"],
  ["20121", "20162", "Milano", "MI", "Lombardia"],
  ["30121", "30176", "Venezia", "VE", "Veneto"],
  ["34121", "34151", "Trieste", "TS", "Friuli-Venezia Giulia"],
  ["40121", "40141", "Bologna", "BO", "Emilia-Romagna"],
  ["50121", "50145", "Firenze", "FI", "Toscana"],
  ["70121", "70132", "Bari", "BA", "Puglia"],
  ["80121", "80147", "Napoli", "NA", "Campania"],
  ["90121", "90151", "Palermo", "PA", "Sicilia"],
  ["95121", "95131", "Catania", "CT", "Sicilia"],
  ["09121", "09134", "Cagliari", "CA", "Sardegna"],
];

const METRO_NAMES = new Set(METRO_RANGES.map(r => r[2].toLowerCase()));

console.log("📥 Loading ISTAT comuni from comuni-json package…");
const comuni = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
console.log(`✓ Got ${comuni.length} comuni`);

const singles = [];
let skippedMetro = 0;
let skippedNoCap = 0;

for (const c of comuni) {
  const name = c.nome ?? "";
  if (METRO_NAMES.has(name.toLowerCase())) { skippedMetro++; continue; }

  const capList = Array.isArray(c.cap) ? c.cap : (c.cap ? [c.cap] : []);
  if (capList.length === 0) { skippedNoCap++; continue; }

  const provSigla = c.sigla ?? c.provincia?.codice ?? "";
  const regione = c.regione?.nome ?? "";

  for (const cap of capList) {
    singles.push([cap, name, provSigla, regione]);
  }
}

// Dedupe per CAP (keep first) — comune raro che 2 comuni condividano CAP
const seen = new Set();
const deduped = [];
for (const row of singles) {
  if (seen.has(row[0])) continue;
  seen.add(row[0]);
  deduped.push(row);
}

const dataset = { ranges: METRO_RANGES, singles: deduped };
const json = JSON.stringify(dataset);

writeFileSync(OUT, json);

console.log(`\n📊 Stats:`);
console.log(`   • Metro ranges:  ${METRO_RANGES.length}`);
console.log(`   • Single comuni: ${deduped.length}`);
console.log(`   • Skipped (metro overlap): ${skippedMetro}`);
console.log(`   • Skipped (no CAP in source): ${skippedNoCap}`);
console.log(`   • Output size:   ${(json.length / 1024).toFixed(1)} KB (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`\n✓ Written: ${OUT}`);
