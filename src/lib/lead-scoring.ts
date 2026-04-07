// Lead scoring algorithm — assegna score 0-100 a ogni query cittadino
// Determina tier (hot/warm/cold) e prezzo del lead nel marketplace

export interface LeadScoringInput {
  question: string;        // testo della domanda
  vertical: string;        // avvocato, commercialista, ecc.
  city?: string;           // città dell'utente
  hasAttachment: boolean;  // ha allegato un documento?
  sessionLength: number;   // quante domande ha fatto in sessione
}

export interface LeadScoringOutput {
  score: number;
  tier: "hot" | "warm" | "cold";
  estimated_price_cents: number;
  reason: string;
}

export function scoreLeadQuality(input: LeadScoringInput): LeadScoringOutput {
  let score = 0;

  // Urgenza (segnali linguistici) +30 punti
  const urgencyKeywords = [
    "urgente", "subito", "domani", "scadenza", "termine",
    "licenziato", "pignoramento", "sfratto", "ingiunzione",
    "avviso di accertamento", "cartella esattoriale", "diffida",
    "precetto", "decreto ingiuntivo", "ricorso", "appello",
  ];
  if (urgencyKeywords.some(k => input.question.toLowerCase().includes(k))) score += 30;

  // Specificità geografica +15 punti
  if (input.city && input.city.length > 2) score += 15;

  // Ha allegato documenti (caso reale, non informativa) +20 punti
  if (input.hasAttachment) score += 20;

  // Lunghezza/complessità della domanda +15 punti
  if (input.question.length > 200) score += 15;
  else if (input.question.length > 100) score += 8;

  // Verticale ad alto valore +10 punti
  const highValueVerticals = ["avvocato", "commercialista", "consulente-lavoro", "Avvocato", "Commercialista", "Consulente del Lavoro"];
  if (highValueVerticals.includes(input.vertical)) score += 10;

  // Sessione multi-turn (utente coinvolto) +10 punti
  if (input.sessionLength >= 3) score += 10;

  // Tier e prezzo
  let tier: "hot" | "warm" | "cold";
  let estimated_price_cents: number;
  let reason: string;

  if (score >= 65) {
    tier = "hot";
    estimated_price_cents = 9900; // €99
    reason = "Caso complesso con urgenza e specificità geografica";
  } else if (score >= 35) {
    tier = "warm";
    estimated_price_cents = 4900; // €49
    reason = "Caso con bisogno concreto";
  } else {
    tier = "cold";
    estimated_price_cents = 2900; // €29
    reason = "Richiesta informativa";
  }

  return { score, tier, estimated_price_cents, reason };
}
