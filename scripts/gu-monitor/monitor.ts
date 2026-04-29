#!/usr/bin/env tsx
/**
 * SER-85: Monitor Gazzetta Ufficiale → corpus versioning automatico
 *
 * Polling RSS della GU Serie Generale per rilevare nuove pubblicazioni
 * di interesse (leggi, D.Lgs., D.P.R., regolamenti UE).
 * Aggiorna norma_changelog nel DB e opzionalmente invalida la cache semantica.
 *
 * Usage:
 *   tsx monitor.ts                           # check + insert in DB
 *   tsx monitor.ts --dry-run                 # solo stampa, nessuna scrittura
 *   tsx monitor.ts --from 2026-04-01         # processa da data specifica
 *   tsx monitor.ts --invalidate-cache        # invalida cache dopo nuove norme
 *
 * Scheduled: .github/workflows/gu-monitor.yml (daily 07:00 UTC)
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CORPUS_WEBHOOK_URL = process.env.CORPUS_WEBHOOK_URL; // es. https://normaai.it/api/corpus-webhook
const CORPUS_WEBHOOK_SECRET = process.env.CORPUS_WEBHOOK_SECRET;

// Feed RSS Gazzetta Ufficiale (serie pubblica)
const GU_RSS_URLS = [
  "https://www.gazzettaufficiale.it/rss/esecutivo.xml",   // Decreti esecutivi
  "https://www.gazzettaufficiale.it/rss/serie_generale.xml",  // Serie generale
];

// Parole chiave per filtrare atti rilevanti per NormaAI
const RELEVANT_KEYWORDS = [
  "decreto legislativo", "decreto legge", "legge", "d.lgs", "d.l.",
  "regolamento", "direttiva", "gdpr", "privacy", "sicurezza lavoro",
  "codice del lavoro", "tribut", "fiscal", "irpef", "iva", "appalti",
  "edilizia", "urbanistica", "consumator", "contratto", "responsabilità",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface GURssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  guid: string;
}

interface NormaChangelog {
  gu_id: string;
  titolo: string;
  tipo_atto: string;
  data_pubblicazione: string;
  url_gu: string;
  rilevanza_score: number;
  verticali_coinvolti: string[];
  status: "pending" | "processed" | "skipped";
  raw_data: Record<string, unknown>;
}

// ── RSS Parser (senza dipendenze esterne) ─────────────────────────────────────

function parseRssXml(xml: string): GURssItem[] {
  const items: GURssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const get = (tag: string) => {
      const m = itemXml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] ?? m[2] ?? "").trim() : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description"),
      guid: get("guid"),
    });
  }
  return items;
}

// ── Classificazione rilevanza ─────────────────────────────────────────────────

function classifyRelevance(item: GURssItem): { score: number; verticali: string[]; tipo: string } {
  const text = `${item.title} ${item.description}`.toLowerCase();

  let score = 0;
  const verticali: string[] = [];

  // Tipo atto (peso maggiore)
  let tipo = "altro";
  if (/decreto legislativo/i.test(text)) { tipo = "D.Lgs."; score += 40; }
  else if (/decreto.legge/i.test(text)) { tipo = "D.L."; score += 35; }
  else if (/\blegge\b/i.test(text) && /\bn\.\s*\d/i.test(text)) { tipo = "Legge"; score += 35; }
  else if (/d\.p\.r\./i.test(text)) { tipo = "D.P.R."; score += 25; }
  else if (/regolamento ue/i.test(text)) { tipo = "Reg. UE"; score += 30; }
  else if (/direttiva/i.test(text) && /ue|ce\b/i.test(text)) { tipo = "Dir. UE"; score += 25; }

  // Verticali NormaAI
  if (/lavoro|lavoratori|occupazione|assunzione|licenziamento/i.test(text)) { verticali.push("lavoro"); score += 15; }
  if (/privacy|gdpr|dati personali|garante/i.test(text)) { verticali.push("privacy"); score += 20; }
  if (/fisco|tribut|irpef|iva|imposte|entrate/i.test(text)) { verticali.push("fisco"); score += 15; }
  if (/edilizia|urbanistica|costruzioni|immobili/i.test(text)) { verticali.push("edilizia"); score += 15; }
  if (/appalti|gare|procurement|bcp/i.test(text)) { verticali.push("appalti"); score += 15; }
  if (/consumatori|contratti|responsabilità civile/i.test(text)) { verticali.push("civile"); score += 10; }
  if (/penale|reato|sanzione penale|codice penale/i.test(text)) { verticali.push("penale"); score += 10; }
  if (/famiglia|minori|divorzio|separazione/i.test(text)) { verticali.push("famiglia"); score += 10; }

  return { score: Math.min(score, 100), verticali: [...new Set(verticali)], tipo };
}

// ── Fetch + parse RSS ─────────────────────────────────────────────────────────

async function fetchRss(url: string): Promise<GURssItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NormaAI-CorpusMonitor/1.0 (+https://normaai.it)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`⚠️  RSS ${url}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseRssXml(xml);
  } catch (err) {
    console.warn(`⚠️  RSS ${url}: ${(err as Error).message}`);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const invalidateCache = args.includes("--invalidate-cache");
  const fromDate = args[args.indexOf("--from") + 1];
  const minScore = parseInt(args[args.indexOf("--min-score") + 1] ?? "30", 10);

  console.log(`📰 NormaAI GU Monitor — ${new Date().toISOString()}`);
  if (dryRun) console.log("🔍 DRY RUN");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Recupera ultima data processata
  let sinceDate = fromDate;
  if (!sinceDate) {
    const { data } = await supabase
      .from("gu_monitor_log")
      .select("data_pubblicazione")
      .order("data_pubblicazione", { ascending: false })
      .limit(1)
      .single();
    sinceDate = data?.data_pubblicazione ?? new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  }
  console.log(`📅 Monitoring da: ${sinceDate}\n`);

  // Fetch tutti i feed
  const allItems: GURssItem[] = [];
  for (const feedUrl of GU_RSS_URLS) {
    const items = await fetchRss(feedUrl);
    console.log(`📡 ${feedUrl}: ${items.length} item`);
    allItems.push(...items);
  }

  // Dedup per guid
  const seen = new Set<string>();
  const uniqueItems = allItems.filter(i => !seen.has(i.guid) && (seen.add(i.guid), true));

  // Filtra per data e rilevanza
  const relevant: Array<NormaChangelog> = [];
  for (const item of uniqueItems) {
    const pubDate = new Date(item.pubDate).toISOString().slice(0, 10);
    if (pubDate < sinceDate) continue;

    const { score, verticali, tipo } = classifyRelevance(item);
    if (score < minScore) continue;

    relevant.push({
      gu_id: item.guid || item.link,
      titolo: item.title.slice(0, 500),
      tipo_atto: tipo,
      data_pubblicazione: pubDate,
      url_gu: item.link,
      rilevanza_score: score,
      verticali_coinvolti: verticali,
      status: "pending",
      raw_data: { title: item.title, description: item.description.slice(0, 1000) },
    });
  }

  console.log(`\n🎯 Atti rilevanti (score ≥ ${minScore}): ${relevant.length}`);

  if (relevant.length === 0) {
    console.log("✅ Nessun aggiornamento normativo rilevante.");
    return;
  }

  for (const item of relevant) {
    console.log(`  [${item.rilevanza_score}] ${item.tipo_atto}: ${item.titolo.slice(0, 80)}`);
  }

  if (dryRun) { console.log("\n🔍 DRY RUN — nessuna scrittura"); return; }

  // Inserisci nel changelog
  const { error } = await supabase
    .from("gu_monitor_log")
    .upsert(relevant, { onConflict: "gu_id" });

  if (error) {
    console.error("❌ DB error:", error.message);
    process.exit(1);
  }
  console.log(`\n✅ ${relevant.length} atti inseriti in norma_changelog`);

  // Notifica webhook se configurato
  if (CORPUS_WEBHOOK_URL && relevant.length > 0) {
    try {
      await fetch(CORPUS_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(CORPUS_WEBHOOK_SECRET ? { "X-Webhook-Secret": CORPUS_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify({ new_norme: relevant.length, items: relevant.slice(0, 10) }),
        signal: AbortSignal.timeout(5_000),
      });
      console.log("📬 Webhook notificato");
    } catch (err) {
      console.warn("⚠️  Webhook failed:", (err as Error).message);
    }
  }

  // Invalida cache semantica se richiesto
  if (invalidateCache && relevant.length > 0) {
    const { invalidateAllCache } = await import("../../src/lib/semantic-cache");
    const deleted = await invalidateAllCache();
    console.log(`🗑️  Cache invalidata: ${deleted} chiavi rimosse`);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
