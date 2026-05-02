import PDFDocument from "pdfkit";
import fs from "node:fs";

interface Variant {
  id: number;
  name: string;
  tagline: string;          // sopra hero
  hero: string;             // titolo grande
  heroAccent: string;       // parte colorata vermiglio
  sub: string;              // sub-claim
  ctaPrimary: string;
  ctaSecondary: string;
  pillarTitle: string;
  pillars: Array<{ t: string; s: string }>;
  marketplaceTitle: string;
  marketplaceSub: string;
  pricingTitle: string;
  pricing: Array<{ tier: string; price: string; perks: string }>;
  faqQ: string;
  faqA: string;
  footer: string;
  voice: string;            // descrizione del tone (per copertina debug)
}

const variants: Variant[] = [
  {
    id: 1,
    name: "Diretta-Pratica",
    voice: "Pulito, anti-marketing. Diciamo cosa facciamo, punto.",
    tagline: "EDIZIONE 2026 · VOL. III",
    hero: "Risposte legali in italiano,",
    heroAccent: "in 30 secondi.",
    sub: "Otto agent AI cercano la tua risposta nel corpus normativo aggiornato. Ogni citazione è verificata. Niente fronzoli, niente paura del legalese.",
    ctaPrimary: "Fai una domanda →",
    ctaSecondary: "▷ Vedi un esempio reale",
    pillarTitle: "Come funziona",
    pillars: [
      { t: "Chiedi", s: "Scrivi la tua domanda di diritto italiano in chat o a voce. Esempi: licenziamento, multa, contratto." },
      { t: "Otto agent verificano", s: "Routing, retrieval, vigenza, citation validator. Otto controlli specialistici prima della risposta." },
      { t: "Risposta con fonti", s: "Articoli, decreti, sentenze citate. Non inventa: se non sa, lo dice." },
    ],
    marketplaceTitle: "Quando ti serve un avvocato vero",
    marketplaceSub: "9€ per un parere PDF firmato. L'avvocato giusto per la tua zona ti contatta entro 24 ore.",
    pricingTitle: "Prezzi",
    pricing: [
      { tier: "Privato", price: "Gratis", perks: "Chat illimitata. Voice mobile. 7 lingue per immigrati e turisti." },
      { tier: "Parere PDF", price: "9 €", perks: "Documento firmato, fonti complete, notifica avvocato locale." },
      { tier: "Avvocati", price: "91 €/lead", perks: "Solo lead matchati per zona e specializzazione. Zero abbonamento." },
    ],
    faqQ: "È davvero gratis?",
    faqA: "Sì. La chat e la voice mobile sono gratuite. Paghi 9€ solo se vuoi il parere PDF firmato e il contatto con un avvocato.",
    footer: "NormaAI · Servizi Digitali 24 S.R.L. · Reg. UE 2024/1689 compliant",
  },
  {
    id: 2,
    name: "Empatico-Vicino",
    voice: "Caldo, riconosce ansia. Promette aiuto progressivo, non vendita.",
    tagline: "AL TUO FIANCO · DIRITTO ITALIANO",
    hero: "Hai un problema legale?",
    heroAccent: "Non sei solo.",
    sub: "Multa, licenziamento, sfratto, separazione. NormaAI ti risponde subito, in italiano chiaro. E quando serve un avvocato vero, lo trovi qui.",
    ctaPrimary: "Inizia, gratis →",
    ctaSecondary: "Parla con noi a voce",
    pillarTitle: "Camminiamo con te",
    pillars: [
      { t: "Ti ascoltiamo", s: "Raccontaci il tuo caso a parole tue. Non serve sapere il codice civile per chiedere." },
      { t: "Ti spieghiamo", s: "Senza giuridichese. Ti diciamo cosa dice la legge italiana, in lingua di tutti i giorni." },
      { t: "Ti accompagniamo", s: "Se il caso è importante, l'avvocato giusto ti contatta. Solo se vuoi tu." },
    ],
    marketplaceTitle: "Quando hai bisogno di una mano in più",
    marketplaceSub: "Per 9€ ti scriviamo un parere PDF e lo mandiamo a un avvocato della tua città. Lui ti contatta entro 24 ore.",
    pricingTitle: "Trasparente sempre",
    pricing: [
      { tier: "Sempre con te", price: "Gratis", perks: "Chat e voce illimitate, in italiano e nelle lingue principali." },
      { tier: "Quando serve di più", price: "9 €", perks: "Parere scritto e contatto con un avvocato vicino a te." },
      { tier: "Avvocati", price: "91 €", perks: "Pagano solo i lead che gli interessano. Zero canoni." },
    ],
    faqQ: "Posso fidarmi delle risposte?",
    faqA: "Ogni risposta cita le leggi che usa. Se non è sicura, te lo dice. Niente promesse, niente fumo. E la responsabilità AI Act è dichiarata in ogni risposta.",
    footer: "NormaAI · al tuo fianco · Servizi Digitali 24 S.R.L.",
  },
  {
    id: 3,
    name: "Provocatorio-Confronto",
    voice: "Anti-establishment. Smaschera prezzi gonfiati, propone alternativa.",
    tagline: "ROVESCIAMO IL MODELLO",
    hero: "150 € a consulto.",
    heroAccent: "Davvero?",
    sub: "Il diritto italiano è complicato perché tenerti all'oscuro paga. NormaAI rovescia il modello: chat gratis, citazioni vere, parere PDF a 9 €.",
    ctaPrimary: "Provalo gratis →",
    ctaSecondary: "Vedi quanto risparmi",
    pillarTitle: "Cosa cambia",
    pillars: [
      { t: "Chat illimitata, gratis", s: "Niente abbonamenti, niente paywall a metà. Chiedi quello che vuoi, quante volte vuoi." },
      { t: "Citazioni verificate", s: "Ogni norma, ogni sentenza è linkata al testo ufficiale. Non ti devi fidare — controlli." },
      { t: "Avvocato a 9 €", s: "Quando vuoi un umano, paghi una volta. Niente acconti, niente sorprese." },
    ],
    marketplaceTitle: "L'avvocato giusto per il tuo caso",
    marketplaceSub: "Non un call center, non chiunque sia disponibile. Un avvocato della tua città, specializzato nella tua materia. 9 €.",
    pricingTitle: "Confronta",
    pricing: [
      { tier: "Studio tradizionale", price: "150-300 € primo consulto", perks: "Appuntamento entro 1-2 settimane, in studio, in giorno feriale." },
      { tier: "NormaAI", price: "Gratis + 9 € parere", perks: "Chat ora, parere in 24 ore, avvocato ti chiama lui." },
      { tier: "Differenza", price: "−96%", perks: "Stessa qualità giuridica. Tempo zero. Trasparenza totale." },
    ],
    faqQ: "Come fate a stare a 9 €?",
    faqA: "Otto agent AI fanno il lavoro di analisi e citazione. L'avvocato umano arriva sul caso pre-istruito. È il modello che lo rende sostenibile.",
    footer: "NormaAI · trasparenza al primo posto · Servizi Digitali 24 S.R.L.",
  },
  {
    id: 4,
    name: "Tech-Innovation",
    voice: "Forward-looking, B2B-oriented, AI Act/certificazioni come trust signal.",
    tagline: "EU AI ACT · ART. 50 NATIVE",
    hero: "Il primo motore legale italiano",
    heroAccent: "AI Act compliant.",
    sub: "Otto agent specialistici. 142.000 norme indicizzate. Zero allucinazioni — fact-checking automatico contro corpus Normattiva. Reg. UE 2024/1689 supportato nativamente.",
    ctaPrimary: "Esplora la demo →",
    ctaSecondary: "API per sviluppatori",
    pillarTitle: "Stack tecnico",
    pillars: [
      { t: "RAG hybrid 1024-dim", s: "Embedding bge-m3 multilingual + reranker bge-reranker-v2-m3. Recall 99,4% su benchmark legale italiano." },
      { t: "Multi-agent verification", s: "Norm Retriever, Vigenza Verifier, Citation Validator, Lead Quality. Pipeline ortogonale a errore." },
      { t: "Self-hosted on-EU", s: "Inferenza su GPU Hetzner Falkenstein. Dati mai fuori UE. SOC2-ready entro Q3 2026." },
    ],
    marketplaceTitle: "Marketplace lead per studi legali",
    marketplaceSub: "Lead pre-qualificati con vertical, città, score. Pagamento per acquisizione: 91 €. Zero abbonamenti, zero overhead.",
    pricingTitle: "API + Enterprise",
    pricing: [
      { tier: "Free", price: "100 query/mese", perks: "Token API, /v1/chat, /v1/citations/validate. Nessun limite verticale." },
      { tier: "Pro", price: "0,15 € / query", perks: "Pay-per-use. SLA 99,9%. Logging Langfuse. Batch endpoints." },
      { tier: "Enterprise", price: "Da 290 €/mese", perks: "Fine-tuning su corpus interno. SSO. Dominio dedicato. DPA + SCC." },
    ],
    faqQ: "Compliance AI Act?",
    faqA: "Reg. UE 2024/1689 art. 50: trasparenza dichiarata in ogni interazione. Footer su ogni parere PDF. Modello classificato 'limited risk'. Audit trail attivo per ogni risposta.",
    footer: "NormaAI · AI Act native · Servizi Digitali 24 S.R.L. · D-U-N-S 302416196",
  },
  {
    id: 5,
    name: "Editoriale-Autorevole",
    voice: "Cura, eleganza, voce editoriale Sofia. Vintage palette, gravitas.",
    tagline: "§ EDIZIONE 2026 · VOLUME III",
    hero: "Una risposta legale ben scritta,",
    heroAccent: "ogni volta.",
    sub: "Dalla Cassazione al Codice della Strada. 142.000 norme, otto agent, una sola lingua chiara. Gratis per leggere. Nove euro per il parere firmato.",
    ctaPrimary: "Apri la chat",
    ctaSecondary: "Sfoglia un parere d'esempio",
    pillarTitle: "L'idea",
    pillars: [
      { t: "Editoriale, non chatbot", s: "Risposte composte come parerei, non come messaggi: struttura, ritmo, citazioni inline. La forma è parte del rigore." },
      { t: "Otto specialisti", s: "Routing, recupero norma, vigenza, sentenza, validatore citazioni, redattore. Ogni passaggio è autonomo, ogni passaggio lascia traccia." },
      { t: "Lingua come materia", s: "Il diritto è linguaggio. NormaAI scrive in italiano contemporaneo, conserva la sintassi giuridica dove serve, la traduce dove non serve." },
    ],
    marketplaceTitle: "Il parere e l'avvocato",
    marketplaceSub: "Quando il caso lo richiede, NormaAI compila un parere in PDF e lo affida a un avvocato del tuo foro. Nove euro — l'editoriale e la presentazione del caso.",
    pricingTitle: "Edizione",
    pricing: [
      { tier: "Lettore", price: "Gratis", perks: "Chat illimitata. Voice mobile. Avatar in videochiamata. Tutte le lingue principali." },
      { tier: "Parere", price: "9 €", perks: "PDF firmato. Avvocato del foro contattato in 24 ore. Conservazione documento." },
      { tier: "Studio", price: "91 € / lead", perks: "Solo i casi che vuoi. Vertical, città, score. Nessun canone." },
    ],
    faqQ: "Chi scrive le risposte?",
    faqA: "Sofia è un sistema di intelligenza artificiale, lo dichiara in ogni interazione (Reg. UE 2024/1689 art. 50). Il corpus è curato dalla redazione NormaAI: ogni norma è tracciabile alla Gazzetta Ufficiale.",
    footer: "§ NormaAI · una pubblicazione di Servizi Digitali 24 S.R.L.",
  },
];

const COLORS = {
  ink: "#1A1714",
  inkMid: "#3D3530",
  inkLight: "#6B5F55",
  inkSoft: "#9A8E83",
  rule: "#E8E0D2",
  paper: "#FDFBF7",
  vermiglio: "#C93924",
  paperTint: "#F8F4ED",
  warning: "#9A7B14",
};

async function buildPdf(v: Variant): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 72, left: 56, right: 56 },
    info: {
      Title: `NormaAI · Site Copy V${v.id} — ${v.name}`,
      Author: "NormaAI Brand",
      Subject: `Direzione brand ${v.id}/5: ${v.voice}`,
      Keywords: "normaai, copy, brand, italiano",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ─── COVER LABEL (debug for Francesco) ───
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.vermiglio)
    .text(`VARIANTE ${v.id}/5 · ${v.name.toUpperCase()}`, { characterSpacing: 2 });
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.inkLight)
    .text(`Voce: ${v.voice}`);
  doc.moveDown(0.5);
  doc.strokeColor(COLORS.vermiglio).lineWidth(0.8)
    .moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1.5);

  // ─── HEADER NormaAI brand ───
  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.ink).text("§ Norma AI");
  doc.moveDown(0.4);

  // ─── TAGLINE ───
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkLight)
    .text(v.tagline, { characterSpacing: 1.8 });
  doc.moveDown(1);

  // ─── HERO ───
  doc.font("Times-Bold").fontSize(38).fillColor(COLORS.ink)
    .text(v.hero, { lineGap: 4 });
  doc.font("Times-Italic").fontSize(38).fillColor(COLORS.vermiglio)
    .text(v.heroAccent, { lineGap: 4 });
  doc.moveDown(0.6);

  // ─── SUB ───
  doc.font("Times-Italic").fontSize(13).fillColor(COLORS.inkMid)
    .text(v.sub, { align: "left", lineGap: 3, width: 480 });
  doc.moveDown(1.2);

  // ─── CTAs ───
  const ctaY = doc.y;
  doc.rect(56, ctaY, 175, 36).fillColor(COLORS.vermiglio).fill();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
    .text(v.ctaPrimary, 56, ctaY + 13, { width: 175, align: "center" });
  doc.fillColor(COLORS.ink).font("Helvetica").fontSize(11)
    .text(v.ctaSecondary, 250, ctaY + 13);
  doc.moveDown(2.5);

  // ─── STAT ROW ───
  const statsY = doc.y;
  const stats = [
    { n: "142.000+", l: "norme indicizzate" },
    { n: "8", l: "agent specialistici" },
    { n: "2.847", l: "studi legali" },
    { n: "99,4 %", l: "citazioni verificate" },
  ];
  stats.forEach((s, i) => {
    const x = 56 + i * 122;
    doc.font("Times-Bold").fontSize(20).fillColor(COLORS.ink).text(s.n, x, statsY);
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkLight)
      .text(s.l.toUpperCase(), x, statsY + 26, { characterSpacing: 1 });
  });
  doc.y = statsY + 52;
  doc.moveDown(0.8);
  doc.strokeColor(COLORS.rule).lineWidth(0.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1.5);

  // ─── PILLARS ───
  doc.font("Times-Bold").fontSize(22).fillColor(COLORS.ink).text(v.pillarTitle);
  doc.moveDown(0.5);
  v.pillars.forEach((p) => {
    doc.font("Times-Bold").fontSize(14).fillColor(COLORS.ink).text(p.t);
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.inkMid)
      .text(p.s, { width: 480, lineGap: 2 });
    doc.moveDown(0.5);
  });
  doc.moveDown(0.8);

  // ─── MARKETPLACE ───
  doc.strokeColor(COLORS.rule).lineWidth(0.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1);
  doc.font("Times-Bold").fontSize(18).fillColor(COLORS.ink).text(v.marketplaceTitle);
  doc.moveDown(0.3);
  doc.font("Times-Italic").fontSize(11).fillColor(COLORS.inkMid)
    .text(v.marketplaceSub, { width: 480, lineGap: 2 });
  doc.moveDown(1.2);

  // ─── PRICING ───
  doc.font("Times-Bold").fontSize(14).fillColor(COLORS.ink).text(v.pricingTitle);
  doc.moveDown(0.5);
  v.pricing.forEach((p) => {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text(p.tier, 56, y);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.vermiglio)
      .text(p.price, 200, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.inkMid)
      .text(p.perks, 320, y, { width: 220, lineGap: 1 });
    doc.y = Math.max(doc.y, y + 24);
    doc.moveDown(0.2);
  });
  doc.moveDown(1);

  // ─── FAQ ───
  doc.strokeColor(COLORS.rule).lineWidth(0.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1);
  doc.font("Times-Bold").fontSize(13).fillColor(COLORS.ink).text(`Q. ${v.faqQ}`);
  doc.moveDown(0.3);
  doc.font("Times-Italic").fontSize(11).fillColor(COLORS.inkMid)
    .text(`A. ${v.faqA}`, { width: 480, lineGap: 2 });
  doc.moveDown(1.5);

  // ─── FOOTER ───
  doc.strokeColor(COLORS.rule).lineWidth(0.3).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(7).fillColor(COLORS.warning)
    .text(v.footer, { align: "center" });

  doc.end();
  return done;
}

(async () => {
  const outDir = "/Users/user/Documents/PROGETTI/NORMAAI/SITE-COPY-VARIANTS";
  fs.mkdirSync(outDir, { recursive: true });
  for (const v of variants) {
    const buf = await buildPdf(v);
    const path = `${outDir}/site-copy-v${v.id}-${v.name.toLowerCase().replace(/[^a-z]/g, "-")}.pdf`;
    fs.writeFileSync(path, buf);
    console.log(`✅ V${v.id} ${v.name} → ${(buf.length / 1024).toFixed(1)} KB`);
  }
})().catch(e => { console.error(e); process.exit(1); });
