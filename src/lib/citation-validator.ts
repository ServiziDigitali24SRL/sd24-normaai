// SER-79: Validation regex citazioni norme contro pattern noti
// Rileva citazioni normative malformate o potenzialmente inventate

/**
 * Pattern legali italiani validi.
 * Non verifica l'esistenza nel corpus (troppo costoso), ma la correttezza sintattica.
 */
const VALID_CITATION_PATTERNS = [
  // Leggi: L. 300/1970, L. n. 300/1970
  /\bL\.?\s*(?:n\.?\s*)?\d{1,4}\/\d{4}\b/,
  // D.Lgs.: D.Lgs. 81/2008, D.Lgs. n. 81/2008
  /\bD\.?\s*Lgs\.?\s*(?:n\.?\s*)?\d{1,4}\/\d{4}\b/i,
  // D.P.R.: DPR 380/2001
  /\bD\.?P\.?R\.?\s*(?:n\.?\s*)?\d{1,4}\/\d{4}\b/i,
  // D.M.: D.M. 14/01/2008
  /\bD\.?M\.?\s*\d{1,2}\/\d{1,2}\/\d{4}\b/i,
  // Codice Civile/Penale: art. 2043 c.c., art. 575 c.p.
  /\bart\.?\s*\d{1,4}(?:\s*(?:co\.|comma|bis|ter|quater|quinquies)[\s\d]*)?\s*c\.[cp]\./i,
  // c.p.c., c.p.p.
  /\bart\.?\s*\d{1,4}(?:\s*(?:co\.|comma|bis|ter)[\s\d]*)?\s*c\.p\.[cp]\./i,
  // Regolamenti UE: Reg. UE 2016/679, Reg. CE 1215/2012
  /\bReg\.?\s*(?:UE|CE|CEE)\s*\d{4}\/\d{1,4}\b/i,
  // Direttive UE: Dir. 2019/1937/UE
  /\bDir\.?\s*\d{4}\/\d{1,4}\/(?:UE|CE)\b/i,
  // Cassazione: Cass. n. 12345/2024, Cass. sez. lav. n. 123/2024
  /\bCass\.?\s*(?:sez\.?\s*\w+\.?\s*)?(?:S\.?U\.?\s*)?n\.?\s*\d{1,6}\/\d{4}\b/i,
  // Corte Costituzionale: Corte Cost. n. 234/2022, Corte Cost. sent. n. 234/2022
  /\bCorte\s*Cost\.?\s*(?:sent\.?\s*)?n\.?\s*\d{1,4}\/\d{4}\b/i,
  // TAR/Consiglio di Stato
  /\bT\.?A\.?R\.?\s*\w+(?:\s+\w+)?\s*(?:sez\.?\s*\w+\.?\s*)?n\.?\s*\d{1,6}\/\d{4}\b/i,
  /\bCons\.?\s*Stato\s*(?:sez\.?\s*\w+\.?\s*)?n\.?\s*\d{1,6}\/\d{4}\b/i,
  // TUIR, TUB, TUF
  /\bT(?:UIR|UB|UF)\s*art\.?\s*\d{1,4}\b/i,
];

/**
 * Pattern sospetti — numeri che sembrano citazioni ma non lo sono
 */
const SUSPICIOUS_PATTERNS = [
  // Anno fuori range (futuro)
  /\/\d{4}\b/g,
];

export interface CitationValidationResult {
  valid: boolean;
  suspiciousCitations: string[];
  warningMessage?: string;
}

/**
 * Valida le citazioni normative in una risposta AI.
 * Non blocca la risposta, ma aggiunge un warning se trova citazioni sospette.
 */
export function validateCitations(text: string): CitationValidationResult {
  const currentYear = new Date().getFullYear();

  // Estrai tutti i pattern che sembrano citazioni numeriche anno/numero
  const yearMatches = [...text.matchAll(/\/(\d{4})\b/g)];
  const suspiciousCitations: string[] = [];

  for (const match of yearMatches) {
    const year = parseInt(match[1]);
    // Anno futuro = citazione impossibile
    if (year > currentYear) {
      // Trova il contesto (30 chars prima e dopo)
      const start = Math.max(0, (match.index ?? 0) - 30);
      const end = Math.min(text.length, (match.index ?? 0) + 40);
      suspiciousCitations.push(text.slice(start, end).trim());
    }
    // Anno prima del 1948 (Repubblica) per leggi nazionali — warning
    if (year < 1948 && year > 1900) {
      const start = Math.max(0, (match.index ?? 0) - 30);
      const end = Math.min(text.length, (match.index ?? 0) + 40);
      suspiciousCitations.push(text.slice(start, end).trim());
    }
  }

  if (suspiciousCitations.length > 0) {
    return {
      valid: false,
      suspiciousCitations,
      warningMessage: "⚠️ La risposta potrebbe contenere citazioni normative da verificare.",
    };
  }

  return { valid: true, suspiciousCitations: [] };
}

/**
 * Conta le citazioni normative valide trovate nel testo.
 * Utile per calcolare il confidence score.
 */
export function countValidCitations(text: string): number {
  let count = 0;
  for (const pattern of VALID_CITATION_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gi"));
    if (matches) count += matches.length;
  }
  return count;
}
