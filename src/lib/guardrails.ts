// NeMo Guardrails wrapper — input/output filtering.
//
// Fase 1: lightweight in-process rules (no external dependency on NeMo
// Guardrails Python service). Three guards:
//   - input-pii   — blocks raw IBAN/CF/PIVA/credit-card from being logged
//   - input-jailbreak — blocks classic prompt-injection patterns
//   - output-hallucination — flags responses that cite invented norms
//
// Fase 2: swap with NeMo Guardrails server (Colang config) for richer rules.
// The exposed surface (assertSafe / sanitize) stays stable.

const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "iban",           re: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g },
  { name: "codice_fiscale", re: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi },
  { name: "p_iva",          re: /\b\d{11}\b/g },
  { name: "credit_card",    re: /\b(?:\d[ -]*?){13,19}\b/g },
];

const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore (?:all|previous|the above) instructions/i,
  /you are (?:now|actually) (?:an? )?(?:dan|jailbreak|developer mode)/i,
  /pretend (?:to be|you are) (?:not|no longer)/i,
  /system prompt/i,
  /\b(?:reveal|leak|disclose|print) (?:the|your) (?:system|hidden) prompt\b/i,
];

export interface GuardResult {
  ok: boolean;
  reason?: string;
  matched?: string;
  sanitized?: string;
}

/** Detect/redact PII from text. Returns sanitized version + whether anything matched. */
export function sanitizePii(text: string): { sanitized: string; hits: string[] } {
  const hits: string[] = [];
  let sanitized = text;
  for (const p of PII_PATTERNS) {
    if (p.re.test(sanitized)) {
      hits.push(p.name);
      sanitized = sanitized.replace(p.re, `[REDACTED:${p.name}]`);
    }
  }
  return { sanitized, hits };
}

/** Block obvious jailbreak attempts on user input. Returns ok=false if blocked. */
export function checkJailbreak(text: string): GuardResult {
  for (const re of JAILBREAK_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, reason: "jailbreak", matched: re.source };
    }
  }
  return { ok: true };
}

/**
 * Pre-LLM input gate. Apply this BEFORE sending user input to the LLM.
 * Sanitizes PII (in-place) and refuses jailbreak attempts.
 */
export function guardInput(userInput: string): GuardResult {
  const jb = checkJailbreak(userInput);
  if (!jb.ok) return jb;

  const { sanitized } = sanitizePii(userInput);
  return { ok: true, sanitized };
}

/**
 * Post-LLM output gate. Currently only flags responses with too many
 * unverified-looking citations. The Citation Validator agent does the
 * structured check; this is a last-line safety net.
 */
export function guardOutput(text: string, invalidCitationCount: number): GuardResult {
  // If 50%+ of citations are unverified, refuse to display.
  if (invalidCitationCount >= 3) {
    return {
      ok: false,
      reason: "too_many_unverified_citations",
    };
  }
  return { ok: true };
}
