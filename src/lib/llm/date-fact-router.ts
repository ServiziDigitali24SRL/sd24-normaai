// Date-fact router (pre-LLM) — soft mitigation for queries whose correct
// answer is a number/date pegged to a specific year (aliquote, soglie, etc.)
// Groq llama-3.3-70b training cutoff lags reality on these → answers cite
// stale figures with high confidence.
//
// This module is intentionally minimal: it injects an EXTRA system instruction
// when a date-fact query is detected, telling the model not to invent specific
// numbers and to recommend checking current sources. No web call, no DB filter
// here — those are out of scope until DDL `normaai_chunks_data_recent_idx` and
// optional Tavily tool land in a follow-up PR.
//
// Wire (env-flagged) in `src/app/api/chat/route.ts`:
//   const dateFactHint = process.env.DATE_FACT_HINT_ENABLED === "1"
//     ? buildDateFactSystemAddendum(userQuery)
//     : null;
//   // ... pass dateFactHint as part of dynamicSystemSuffix.
//
// With the flag unset, behaviour is identical to today.

import { classifyDateFact } from "@/lib/eval/date-fact-detector";

export { classifyDateFact };

/**
 * Build a system-prompt addendum for a date-fact query, or return null if the
 * query is general (no addendum needed).
 *
 * `vertical` is optional: when omitted, we run the regex check alone (slightly
 * broader trigger). When present, we apply the strict vertical+regex AND.
 */
export function buildDateFactSystemAddendum(
  query: string,
  vertical?: string | null,
): string | null {
  // Vertical-strict path: only the canonical fisco/appalti/lavoro × regex match
  if (vertical) {
    const c = classifyDateFact(query, vertical);
    if (!c.isDateFact) return null;
  } else {
    // Vertical-unknown path: regex-only. Less precise (false positives possible)
    // but the addendum is just a soft hint — false positive cost is low.
    const re = /\b20\d{2}\b|€\s*\d|\baliquota\b|\bsoglia\b/i;
    if (!re.test(query)) return null;
  }

  return [
    "ISTRUZIONE AGGIUNTIVA — La domanda dell'utente fa riferimento a un numero,",
    "soglia, aliquota o data pegged a un anno specifico. I dati di addestramento",
    "del modello potrebbero essere obsoleti su questi valori. REGOLE:",
    "- Se il CONTESTO RAG contiene il numero esatto richiesto, citalo con [Fonte X].",
    "- Se NON contiene il numero esatto, NON inventare cifre: usa l'etichetta",
    "  [NON SO] e suggerisci di verificare su fonte ufficiale (es. Agenzia",
    "  delle Entrate, Gazzetta Ufficiale, Portale Contratti Pubblici).",
    "- Indica il periodo per cui hai informazioni affidabili e dichiara",
    "  esplicitamente di non poter confermare le ultime modifiche.",
  ].join("\n");
}
