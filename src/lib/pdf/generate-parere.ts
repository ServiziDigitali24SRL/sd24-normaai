// Server-side PDF generator for the "parere AI" attached to a lead.
//
// Fase 1: minimal HTML → PDF rendering. Uses pdfkit for runtime portability
// (no headless browser, no native deps beyond Node). Output is uploaded to
// Supabase Storage `parere-pdfs` bucket and the URL written back into
// conversations.parere_pdf_url + leads.pdf_url.
//
// Fase 2: rich layout with citations table, anti-hallucination badge, etc.

import PDFDocument from "pdfkit";
import { Buffer } from "node:buffer";

export interface PareredInputs {
  conversationId: string;
  userName: string;
  userQuestion: string;
  aiSummary: string;          // condensed answer text
  citations: Array<{ title: string; article: string | null; urn: string }>;
  highRisk: boolean;
  generatedAt: Date;
}

export async function generateParerePdf(input: PareredInputs): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 56,
    info: {
      Title: `Parere AI — Conversazione ${input.conversationId.slice(0, 8)}`,
      Author: "NormaAI",
      Subject: "Parere preliminare AI",
      Keywords: "norma, ai, parere, italia",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header
  doc.fillColor("#1A1714").font("Helvetica-Bold").fontSize(24).text("NormaAI", { align: "left" });
  doc.font("Helvetica").fontSize(10).fillColor("#6B5F55")
    .text(`Parere preliminare AI · generato il ${input.generatedAt.toLocaleDateString("it-IT")}`);
  doc.moveDown(0.5);
  doc.strokeColor("#E8E0D2").lineWidth(0.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1);

  // Conversation ID + user
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#3D3530").text("Riferimenti");
  doc.font("Helvetica").fontSize(10).fillColor("#3D3530")
    .text(`Richiedente: ${input.userName}`)
    .text(`ID conversazione: ${input.conversationId}`)
    .moveDown(1);

  // High risk badge
  if (input.highRisk) {
    doc.fillColor("#B43B25").font("Helvetica-Bold").fontSize(10)
      .text("⚠ Materia ad alto rischio — la consulenza umana è raccomandata.");
    doc.moveDown(0.8).fillColor("#1A1714");
  }

  // Question
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#1A1714").text("Quesito").moveDown(0.3);
  doc.font("Helvetica-Oblique").fontSize(11).fillColor("#3D3530")
    .text(input.userQuestion, { align: "justify" }).moveDown(1);

  // AI Summary
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#1A1714").text("Parere AI").moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor("#1A1714")
    .text(input.aiSummary, { align: "justify" }).moveDown(1);

  // Citations
  if (input.citations.length > 0) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#1A1714").text("Fonti normative").moveDown(0.3);
    input.citations.forEach((c, i) => {
      doc.font("Helvetica").fontSize(10).fillColor("#3D3530")
        .text(`[${i + 1}] ${c.title}${c.article ? `, ${c.article}` : ""}`)
        .font("Helvetica-Oblique").fontSize(9).fillColor("#6B5F55")
        .text(`     ${c.urn}`)
        .moveDown(0.3);
    });
    doc.moveDown(0.5);
  }

  // Footer disclaimer
  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#9A8E83")
    .text(
      "Questo documento è un parere preliminare generato da intelligenza artificiale " +
      "sulla base del corpus normativo italiano disponibile. Non sostituisce la " +
      "consulenza legale di un avvocato qualificato. NormaAI è prodotto da Servizi " +
      "Digitali 24 S.R.L. (D-U-N-S 302416196).",
      { align: "justify" },
    );

  doc.end();
  return done;
}
