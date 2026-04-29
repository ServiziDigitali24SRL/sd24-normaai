/**
 * SER-84: Corpus-as-Code DSL — Schema TypeScript
 *
 * Il corpus normativo è definito in file YAML/JSON versionati in git.
 * Ogni file descrive una norma con i suoi articoli e le relazioni con altre norme.
 * Lo script import.ts processa questi file e aggiorna il DB.
 *
 * Formato file: corpus/lavoro/dlgs-81-2008.yaml
 */

// ── Tipi relazione validi ─────────────────────────────────────────────────────
export type TipoRelazione =
  | "modifica"        // A modifica B (es. Decreto Dignità modifica D.Lgs. 81/2015)
  | "abroga"          // A abroga B
  | "integra"         // A integra B (aggiunge disposizioni)
  | "rinvia"          // A rinvia a B (riferimento)
  | "implementa"      // A implementa B (recepimento direttiva UE)
  | "deroga"          // A deroga a B
  | "interpreta"      // A interpretazione autentica di B
  | "estende"         // A estende applicazione di B
  | "sospende"        // A sospende temporaneamente B
  | "sostituisce";    // A sostituisce B (rifacimento normativa)

// ── Struttura articolo ────────────────────────────────────────────────────────
export interface Articolo {
  numero: string;          // es. "1", "2bis", "18"
  rubrica?: string;        // Titolo dell'articolo
  commi?: number;          // Numero di commi
  verticali?: string[];    // Aree tematiche (lavoro, privacy, ecc.)
  note?: string;
}

// ── Relazione normativa ───────────────────────────────────────────────────────
export interface Relazione {
  tipo: TipoRelazione;
  norma_a: string;         // URN o identificatore della norma target
  articolo_da?: string;    // Articolo sorgente (es. "art. 3")
  articolo_a?: string;     // Articolo target
  descrizione?: string;    // Spiegazione della relazione
  data?: string;           // Data della relazione (ISO 8601)
  bidirezionale?: boolean;
  confidence?: number;     // 0-1, default 0.9
}

// ── Norma (documento normativo) ───────────────────────────────────────────────
export interface Norma {
  // Identificatori
  urn: string;             // URN NormaInRete es. "urn:nir:stato:decreto.legislativo:2008-04-09;81"
  identificatore: string;  // Forma breve: "D.Lgs. 81/2008"
  titolo: string;
  alias?: string[];        // Nomi comuni: ["Testo Unico Sicurezza", "TUSL"]

  // Metadati temporali
  data_approvazione: string;       // ISO 8601
  data_vigenza: string;            // Inizio vigenza
  data_scadenza?: string;          // Fine vigenza (se abrogata)
  status: "vigente" | "abrogato" | "modificato" | "sospeso";

  // Contenuto
  fonte: string;           // "GU" (Gazzetta Ufficiale), "CELEX", ecc.
  verticali: string[];     // Aree tematiche
  articoli?: Articolo[];

  // Knowledge graph
  relazioni?: Relazione[];

  // Corpus
  chunk_count?: number;    // Numero di chunk nel corpus
  last_updated?: string;   // Ultimo aggiornamento corpus (ISO 8601)
  notes?: string;
}

// ── File DSL (un file per norma) ──────────────────────────────────────────────
export interface CorpusDslFile {
  version: "1.0";
  norma: Norma;
}

// ── Validatori ────────────────────────────────────────────────────────────────

const VALID_TIPI_RELAZIONE: TipoRelazione[] = [
  "modifica", "abroga", "integra", "rinvia", "implementa",
  "deroga", "interpreta", "estende", "sospende", "sostituisce"
];

export function validateNorma(norma: Norma): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!norma.urn) errors.push("urn obbligatorio");
  if (!norma.identificatore) errors.push("identificatore obbligatorio");
  if (!norma.titolo) errors.push("titolo obbligatorio");
  if (!norma.data_approvazione) errors.push("data_approvazione obbligatoria");
  if (!norma.data_vigenza) errors.push("data_vigenza obbligatoria");
  if (!["vigente", "abrogato", "modificato", "sospeso"].includes(norma.status)) {
    errors.push(`status non valido: ${norma.status}`);
  }
  if (!norma.verticali || norma.verticali.length === 0) errors.push("verticali non può essere vuoto");

  for (const rel of norma.relazioni ?? []) {
    if (!VALID_TIPI_RELAZIONE.includes(rel.tipo)) {
      errors.push(`tipo relazione non valido: ${rel.tipo}`);
    }
    if (!rel.norma_a) errors.push("relazione.norma_a obbligatorio");
    if (rel.confidence !== undefined && (rel.confidence < 0 || rel.confidence > 1)) {
      errors.push(`confidence deve essere 0-1, trovato: ${rel.confidence}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
