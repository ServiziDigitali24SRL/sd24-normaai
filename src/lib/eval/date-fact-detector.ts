// Detect "date-fact" queries — questions whose correct answer is a specific
// number/date/threshold pegged to a calendar year (e.g. IRPEF aliquote 2024,
// soglia appalti sotto-soglia 2024). Pure LLM training data lags reality on
// these, so RAG metrics overpenalize Groq llama-3.3-70b on them. We tag them
// here so the eval suite can split them out and (in a future PR) the chat
// pipeline can route them to a dedicated tool (Tavily web_search OR a date-
// filtered RAG sub-corpus).
//
// Reference: SER-162, baseline-30 results (3 failures all date-fact patterns:
// GS-005 IRPEF 2024, GS-007 fatturazione forfettari 2024, GS-015 soglie 2024).
//
// Pure function, no I/O. Easy to unit-test and to wire upstream.

export const DATE_FACT_VERTICALS = new Set(["fisco", "appalti", "lavoro"]);

// Match: 4-digit year 20xx | euro amount | "aliquota"/"soglia" keyword
// Tuned to flag canonical date-fact patterns; intentionally narrow — false
// positives push too many queries to the slower tool path.
export const DATE_FACT_RE = /\b20\d{2}\b|€\s*\d|\baliquota\b|\bsoglia\b/i;

export interface DateFactClassification {
  isDateFact: boolean;
  matchedVertical: boolean;
  matchedRegex: boolean;
  reason: string | null;
}

/**
 * Classify a query as date-fact (true) or general (false).
 *
 * Both conditions must hold:
 *   - vertical ∈ {fisco, appalti, lavoro}
 *   - query matches DATE_FACT_RE
 */
export function classifyDateFact(query: string, vertical: string): DateFactClassification {
  const v = (vertical ?? "").toLowerCase();
  const matchedVertical = DATE_FACT_VERTICALS.has(v);
  const matchedRegex = DATE_FACT_RE.test(query);
  const isDateFact = matchedVertical && matchedRegex;
  let reason: string | null = null;
  if (isDateFact) {
    const m = query.match(DATE_FACT_RE);
    reason = `vertical=${v} + match="${m?.[0] ?? ""}"`;
  } else if (matchedRegex && !matchedVertical) {
    reason = `regex match in non-date-fact vertical (${v})`;
  } else if (matchedVertical && !matchedRegex) {
    reason = `vertical match without numeric/date keyword`;
  }
  return { isDateFact, matchedVertical, matchedRegex, reason };
}
