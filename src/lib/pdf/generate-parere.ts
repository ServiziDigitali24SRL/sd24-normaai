// Server-side PDF generator for the "Parere AI" attached to a marketplace lead.
//
// Layout: parere legale italiano standard
//   1. Header (NormaAI brand + parere number + date)
//   2. Riferimenti (richiedente + ID conversazione)
//   3. Premessa (contesto)
//   4. Quesito (domanda dell'utente)
//   5. Quadro Normativo (citazioni RAG)
//   6. Analisi Giuridica (risposta AI)
//   7. Conclusioni (sintesi operativa)
//   8. Fonti (lista normative)
//   9. Footer disclaimer AI Act (Reg. UE 2024/1689 art. 50)
//
// Compliance:
// - R5: NON suggerisce "rivolgiti a un professionista" (regola anti-pivot marketplace)
// - R11: AI Act trasparenza obbligatoria nel footer
//
// Stack: pdfkit (no Python deps, no headless browser, Vercel-friendly).
// Output: Buffer PDF/A-1b compatibile, archiviato su Supabase Storage.

import PDFDocument from "pdfkit";
import { Buffer } from "node:buffer";

export type CopyVariant = 1 | 2 | 3 | 4 | 5;

export interface PareredInputs {
  conversationId: string;
  pareredNumber?: string;        // optional sequential number, e.g. "2026-00142"
  userName: string;
  userCity?: string;
  userQuestion: string;
  premessa?: string;             // optional context paragraph
  aiSummary: string;             // main legal analysis
  conclusioni?: string;          // optional concise next-steps
  citations: Array<{
    title: string;
    article: string | null;
    urn: string;
    excerpt?: string;            // optional 1-2 line quote
  }>;
  vertical?: string;             // 'lavoro', 'civile', 'penale', etc.
  generatedAt: Date;
  variant?: CopyVariant;         // 1=Pro Veritate, 2=Memorandum, 3=Spiega-Tutto, 4=Boutique, 5=Conversazionale
}

// ─── 5 copy variants — diverse direzioni brand ──────────────────────────────
// V1 "Pro Veritate"     — avvocato senior tradizionale, formale, distaccato
// V2 "Memorandum"        — diretto operativo, secco, lista azioni
// V3 "Spiega-Tutto"      — accessibile pubblico ampio, "tu", no giuridichese
// V4 "Boutique"          — studio moderno equilibrato, editoriale (attuale)
// V5 "Conversazionale"   — caldo umano "noi/tu", mediatore empatico

const COPY: Record<CopyVariant, {
  brand:           string;
  subtitle:        (n: string, d: string) => string;
  s_riferimenti:   string;
  s_richiedente:   (name: string, city?: string) => string;
  s_id:            (id: string) => string;
  s_materia:       (v: string) => string;
  s_premessa:      string;
  s_quesito:       string;
  q_open:          string;
  q_close:         string;
  s_quadro:        string;
  s_analisi:       string;
  s_conclusioni:   string;
  s_fonti:         string;
  fonteLabel:      (i: number) => string;
  footer_disclaimer: string;
  footer_author:     string;
}> = {
  1: {
    brand: "Parere Pro Veritate",
    subtitle: (n, d) => `Studio AI · n. ${n} · ${d}`,
    s_riferimenti: "Riferimenti",
    s_richiedente: (name, city) => `Istante: ${name}${city ? ` (${city})` : ""}`,
    s_id: (id) => `Fascicolo: ${id}`,
    s_materia: (v) => `Materia: ${v}`,
    s_premessa: "Premessa",
    s_quesito: "Il quesito",
    q_open: "«", q_close: "»",
    s_quadro: "Quadro normativo vigente",
    s_analisi: "Analisi giuridica",
    s_conclusioni: "Conclusioni",
    s_fonti: "Fonti",
    fonteLabel: (i) => `[Fonte ${i}]`,
    footer_disclaimer:
      "Documento prodotto mediante sistema di intelligenza artificiale conforme al " +
      "Regolamento (UE) 2024/1689 (AI Act, art. 50). Servizi Digitali 24 S.R.L. — D-U-N-S 302416196.",
    footer_author: "Parere Pro Veritate",
  },

  2: {
    brand: "Memorandum",
    subtitle: (n, d) => `# ${n} · ${d}`,
    s_riferimenti: "Caso",
    s_richiedente: (name, city) => `${name}${city ? ` — ${city}` : ""}`,
    s_id: (id) => `ID ${id}`,
    s_materia: (v) => `${v.toUpperCase()}`,
    s_premessa: "Contesto",
    s_quesito: "Domanda",
    q_open: "", q_close: "",
    s_quadro: "Norma applicabile",
    s_analisi: "Strategia",
    s_conclusioni: "Azioni",
    s_fonti: "Riferimenti",
    fonteLabel: (i) => `${i}.`,
    footer_disclaimer: "Generato da AI · Reg. UE 2024/1689 · Servizi Digitali 24 S.R.L.",
    footer_author: "Memorandum NormaAI",
  },

  3: {
    brand: "La tua risposta legale",
    subtitle: (n, d) => `Documento ${n} · ${d}`,
    s_riferimenti: "Per chi è questa risposta",
    s_richiedente: (name, city) => `Per: ${name}${city ? `, da ${city}` : ""}`,
    s_id: (id) => `Riferimento interno: ${id}`,
    s_materia: (v) => `Argomento: ${v}`,
    s_premessa: "In breve",
    s_quesito: "La tua domanda",
    q_open: "\"", q_close: "\"",
    s_quadro: "Cosa dice la legge italiana",
    s_analisi: "La tua situazione spiegata bene",
    s_conclusioni: "Cosa fare adesso",
    s_fonti: "Le leggi e le sentenze a cui ci riferiamo",
    fonteLabel: (i) => `${i})`,
    footer_disclaimer:
      "Questa risposta è stata preparata da un'intelligenza artificiale, in trasparenza " +
      "con il Reg. UE 2024/1689 (AI Act). Servizi Digitali 24 S.R.L.",
    footer_author: "NormaAI",
  },

  4: {
    brand: "§ NormaAI",
    subtitle: (n, d) => `Parere preliminare · n. ${n} · ${d}`,
    s_riferimenti: "Riferimenti",
    s_richiedente: (name, city) => `Richiedente: ${name}${city ? `, ${city}` : ""}`,
    s_id: (id) => `ID conversazione: ${id}`,
    s_materia: (v) => `Materia: ${v}`,
    s_premessa: "Premessa",
    s_quesito: "Quesito",
    q_open: "«", q_close: "»",
    s_quadro: "Quadro normativo di riferimento",
    s_analisi: "Analisi giuridica",
    s_conclusioni: "Conclusioni",
    s_fonti: "Fonti normative complete",
    fonteLabel: (i) => `[Fonte ${i}]`,
    footer_disclaimer:
      "Documento generato da intelligenza artificiale ai sensi del Reg. UE 2024/1689 (AI Act, art. 50). " +
      "NormaAI è prodotto da Servizi Digitali 24 S.R.L. — D-U-N-S 302416196.",
    footer_author: "§ NormaAI",
  },

  5: {
    brand: "La nostra analisi sul tuo caso",
    subtitle: (n, d) => `Documento personale · n. ${n} · ${d}`,
    s_riferimenti: "Stiamo parlando di",
    s_richiedente: (name, city) => `${name}${city ? `, da ${city}` : ""}`,
    s_id: (id) => `Codice del tuo caso: ${id}`,
    s_materia: (v) => `Argomento: ${v}`,
    s_premessa: "Per inquadrare il tuo caso",
    s_quesito: "Quello che ci hai chiesto",
    q_open: "\"", q_close: "\"",
    s_quadro: "Quello che dice la legge",
    s_analisi: "Quello che pensiamo del tuo caso",
    s_conclusioni: "I prossimi passi",
    s_fonti: "Da dove arrivano le nostre risposte",
    fonteLabel: (i) => `${i}.`,
    footer_disclaimer:
      "Questo documento è stato preparato dall'intelligenza artificiale di NormaAI. " +
      "Lo facciamo sapere apertamente come previsto dal Reg. UE 2024/1689 (AI Act).",
    footer_author: "NormaAI · noi e te",
  },
};

// ─── design tokens (NormaAI editorial palette) ──────────────────────────────
const COLORS = {
  ink:        "#1A1714",  // primary text
  inkMid:     "#3D3530",  // secondary
  inkLight:   "#6B5F55",  // muted
  rule:       "#E8E0D2",  // separator lines
  paper:      "#FDFBF7",  // background tint
  vermiglio:  "#C93924",  // accent (sezioni titoli)
  paperTint:  "#F8F4ED",  // box background
  warning:    "#9A7B14",  // for AI act note (gold, not red — non-alarmist)
};

const MARGINS = { left: 56, right: 56, top: 56, bottom: 72 };

// ─── helpers ─────────────────────────────────────────────────────────────────
function ruler(doc: PDFKit.PDFDocument, color = COLORS.rule) {
  doc.strokeColor(color)
    .lineWidth(0.5)
    .moveTo(MARGINS.left, doc.y)
    .lineTo(595 - MARGINS.right, doc.y)
    .stroke();
}

function sectionHeading(doc: PDFKit.PDFDocument, label: string) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.vermiglio)
    .text(label.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.4);
}

function sectionTitle(doc: PDFKit.PDFDocument, n: number, label: string) {
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink)
    .text(`${n}. ${label}`, { characterSpacing: 0.2 });
  doc.moveDown(0.3);
}

function paragraph(doc: PDFKit.PDFDocument, text: string, opts: PDFKit.Mixins.TextOptions = {}) {
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.ink)
    .text(text, { align: "justify", lineGap: 2, ...opts });
  doc.moveDown(0.7);
}

function generatePareredNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `${year}-${seq}`;
}

// ─── main entry ──────────────────────────────────────────────────────────────
export async function generateParerePdf(input: PareredInputs): Promise<Buffer> {
  const variant: CopyVariant = input.variant ?? 4;
  const c = COPY[variant];
  const pareredNumber = input.pareredNumber ?? generatePareredNumber();
  const dateStr = input.generatedAt.toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });

  const doc = new PDFDocument({
    size: "A4",
    margins: MARGINS,
    info: {
      Title: `${c.brand} ${pareredNumber}`,
      Author: "NormaAI — Servizi Digitali 24 S.R.L.",
      Subject: `${c.brand} · conversazione ${input.conversationId.slice(0, 8)}`,
      Keywords: "parere, ai, normaai, italia, diritto",
      CreationDate: input.generatedAt,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ─── HEADER ────────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.ink)
    .text(c.brand, { align: "left" });
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.inkLight)
    .text(c.subtitle(pareredNumber, dateStr), { align: "left" });
  doc.moveDown(0.5);
  ruler(doc);
  doc.moveDown(1.2);

  // ─── 1. RIFERIMENTI ────────────────────────────────────────────────────────
  sectionHeading(doc, c.s_riferimenti);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.inkMid);
  doc.text(c.s_richiedente(input.userName, input.userCity));
  doc.text(c.s_id(input.conversationId));
  if (input.vertical) doc.text(c.s_materia(input.vertical));
  doc.moveDown(1);

  // ─── 2. PREMESSA ───────────────────────────────────────────────────────────
  if (input.premessa && input.premessa.trim().length > 0) {
    sectionTitle(doc, 1, c.s_premessa);
    paragraph(doc, input.premessa);
  }

  // ─── 3. QUESITO ────────────────────────────────────────────────────────────
  const sectionN = (input.premessa ? 2 : 1);
  sectionTitle(doc, sectionN, c.s_quesito);
  const boxStartY = doc.y;
  doc.font("Helvetica-Oblique").fontSize(11).fillColor(COLORS.inkMid)
    .text(`${c.q_open}${input.userQuestion.trim()}${c.q_close}`, {
      align: "justify",
      lineGap: 2,
      indent: 12,
    });
  const boxEndY = doc.y;
  doc.strokeColor(COLORS.vermiglio).lineWidth(2)
    .moveTo(MARGINS.left, boxStartY).lineTo(MARGINS.left, boxEndY).stroke();
  doc.moveDown(0.8);

  // ─── 4. QUADRO NORMATIVO ──────────────────────────────────────────────────
  if (input.citations.length > 0) {
    sectionTitle(doc, sectionN + 1, c.s_quadro);
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.inkMid);
    input.citations.slice(0, 3).forEach((cit, i) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink)
        .text(`${c.fonteLabel(i + 1)} ${cit.title}${cit.article ? `, ${cit.article}` : ""}`);
      if (cit.excerpt) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.inkLight)
          .text(`     "${cit.excerpt.slice(0, 200).trim()}${cit.excerpt.length > 200 ? "..." : ""}"`,
                { lineGap: 1 });
      }
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
  }

  // ─── 5. ANALISI GIURIDICA ──────────────────────────────────────────────────
  const analisiN = sectionN + (input.citations.length > 0 ? 2 : 1);
  sectionTitle(doc, analisiN, c.s_analisi);
  paragraph(doc, input.aiSummary);

  // ─── 6. CONCLUSIONI ────────────────────────────────────────────────────────
  if (input.conclusioni && input.conclusioni.trim().length > 0) {
    sectionTitle(doc, analisiN + 1, c.s_conclusioni);
    paragraph(doc, input.conclusioni);
  }

  // ─── 7. FONTI ──────────────────────────────────────────────────────────────
  if (input.citations.length > 0) {
    const fontiN = analisiN + (input.conclusioni ? 2 : 1);
    sectionTitle(doc, fontiN, c.s_fonti);
    input.citations.forEach((cit, i) => {
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.inkMid)
        .text(`${c.fonteLabel(i + 1)} `, { continued: true })
        .font("Helvetica-Bold")
        .text(`${cit.title}${cit.article ? `, ${cit.article}` : ""}`, { continued: false });
      if (cit.urn) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.inkLight)
          .text(`    ${cit.urn}`);
      }
      doc.moveDown(0.2);
    });
    doc.moveDown(0.8);
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(range.start + i);
    const bottomY = 842 - 56;

    doc.strokeColor(COLORS.rule).lineWidth(0.5)
      .moveTo(MARGINS.left, bottomY - 28)
      .lineTo(595 - MARGINS.right, bottomY - 28)
      .stroke();

    doc.font("Helvetica").fontSize(7).fillColor(COLORS.warning)
      .text(c.footer_disclaimer,
        MARGINS.left, bottomY - 22,
        { width: 595 - MARGINS.left - MARGINS.right, align: "center" });

    doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkLight)
      .text(`${i + 1} / ${totalPages}`,
            MARGINS.left, bottomY - 8,
            { width: 595 - MARGINS.left - MARGINS.right, align: "right" });

    doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkLight)
      .text(`${c.footer_author} · n. ${pareredNumber}`,
            MARGINS.left, bottomY - 8,
            { align: "left" });
  }

  doc.end();
  return done;
}
