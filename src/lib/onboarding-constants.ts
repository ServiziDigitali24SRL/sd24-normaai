// /lib/onboarding-constants.ts
// Costanti per onboarding NormaAI - opzioni predefinite per ruolo

export const USER_ROLES = {
  CITTADINO: 'cittadino',
  PROFESSIONISTA: 'professionista',
  IMPRESA: 'impresa'
} as const;

export const COMPANY_SIZES = {
  MICRO: 'micro',     // 1-9 dipendenti
  PICCOLA: 'piccola', // 10-49 dipendenti
  MEDIA: 'media',     // 50-249 dipendenti
  GRANDE: 'grande'    // 250+ dipendenti
} as const;

export const COMPANY_SECTORS = {
  MANIFATTURIERO: 'manifatturiero',
  SERVIZI: 'servizi',
  RETAIL: 'retail',
  TECH: 'tech',
  EDILIZIA: 'edilizia',
  SANITARIO: 'sanitario',
  ALTRO: 'altro'
} as const;

export const ORDINI_PROFESSIONALI = [
  { id: 'avvocati', label: 'Avvocati' },
  { id: 'commercialisti', label: 'Commercialisti e Esperti Contabili' },
  { id: 'ingegneri', label: 'Ingegneri' },
  { id: 'architetti', label: 'Architetti' },
  { id: 'notai', label: 'Notai' },
  { id: 'medici', label: 'Medici' },
  { id: 'consulenti_lavoro', label: 'Consulenti del Lavoro' },
  { id: 'geometri', label: 'Geometri' },
  { id: 'periti', label: 'Periti Industriali' },
  { id: 'altro', label: 'Altro' }
];

// Aree interesse per CITTADINO
export const CITTADINO_AREE = [
  { id: 'casa_immobiliare', label: 'Casa e immobiliare', desc: 'Contratti affitto, compravendita, condominio' },
  { id: 'lavoro_diritti', label: 'Lavoro e diritti', desc: 'Contratto, licenziamento, ferie, malattia' },
  { id: 'famiglia_successioni', label: 'Famiglia e successioni', desc: 'Matrimonio, divorzio, eredità, tutela minori' },
  { id: 'fisco_tasse', label: 'Fisco e tasse', desc: '730, IMU, TARI, agevolazioni' },
  { id: 'consumatori', label: 'Consumatori', desc: 'Garanzie, reclami, rimborsi' },
  { id: 'sanita_previdenza', label: 'Sanità e previdenza', desc: 'ASL, INPS, invalidità' }
];

export const CITTADINO_OBIETTIVI = [
  'Capire i miei diritti',
  'Risolvere un problema specifico',
  'Tenermi informato sulle novità'
];

// Aree pratica per PROFESSIONISTA
export const PROFESSIONISTA_AREE = [
  { id: 'diritto_civile', label: 'Diritto Civile', desc: 'Contratti, responsabilità, proprietà' },
  { id: 'diritto_penale', label: 'Diritto Penale', desc: 'Procedura, reati, difesa' },
  { id: 'diritto_tributario', label: 'Diritto Tributario', desc: 'Imposte, contenzioso, compliance' },
  { id: 'diritto_lavoro', label: 'Diritto del Lavoro', desc: 'Rapporti, sindacale, previdenza' },
  { id: 'diritto_amministrativo', label: 'Diritto Amministrativo', desc: 'PA, appalti, autorizzazioni' },
  { id: 'gdpr_privacy', label: 'GDPR e Privacy', desc: 'Protezione dati, sanzioni' },
  { id: 'diritto_commerciale', label: 'Diritto Commerciale e Societario', desc: '' },
  { id: 'diritto_famiglia', label: 'Diritto di Famiglia', desc: 'Separazioni, adozioni' },
  { id: 'diritto_penale_impresa', label: "Diritto Penale d'Impresa", desc: '231, anticorruzione' }
];

export const PROFESSIONISTA_OBIETTIVI = [
  'Ricerca approfondita per casi',
  'Alert automatici su novità normative',
  'Trovare clienti tramite marketplace',
  'Aggiornamento professionale continuo'
];

// Aree compliance per IMPRESA (per dimensione)
export const IMPRESA_AREE: Record<string, { id: string; label: string; desc: string }[]> = {
  micro: [
    { id: 'gdpr', label: 'GDPR e Privacy', desc: 'Trattamento dati clienti e dipendenti' },
    { id: 'lavoro', label: 'Diritto del Lavoro', desc: 'Contratti, obblighi datore di lavoro' },
    { id: 'fisco', label: 'Fisco e Tributi', desc: 'IVA, IRPEF, scadenze fiscali' },
  ],
  piccola: [
    { id: 'gdpr', label: 'GDPR e Privacy', desc: 'Compliance dati' },
    { id: 'lavoro', label: 'Diritto del Lavoro', desc: 'Contratti collettivi, sicurezza' },
    { id: 'fisco', label: 'Fisco e Tributi', desc: 'IRES, IVA, bilancio' },
    { id: 'appalti', label: 'Appalti e Contratti', desc: 'Gare, appalti pubblici' },
    { id: 'sicurezza', label: 'Sicurezza sul Lavoro', desc: 'D.Lgs 81/2008' },
  ],
  media: [
    { id: 'gdpr', label: 'GDPR e Privacy', desc: 'DPO, data breach, audit' },
    { id: 'lavoro', label: 'Diritto del Lavoro', desc: 'CCNL, RSU, controversie' },
    { id: 'fisco', label: 'Fisco e Tributi', desc: 'Transfer pricing, consolidato' },
    { id: 'appalti', label: 'Appalti e Contratti', desc: 'Codice appalti, SOA' },
    { id: 'sicurezza', label: 'Sicurezza sul Lavoro', desc: 'DVR, RSPP, audit' },
    { id: '231', label: 'D.Lgs 231/2001', desc: 'Responsabilità amministrativa imprese' },
  ],
  grande: [
    { id: 'gdpr', label: 'GDPR e Privacy', desc: 'DPO, DPIA, trasferimenti internazionali' },
    { id: 'lavoro', label: 'Diritto del Lavoro', desc: 'CCNL, ristrutturazioni, piani industriali' },
    { id: 'fisco', label: 'Fisco e Tributi', desc: 'Ruling, consolidato, CFC' },
    { id: 'appalti', label: 'Appalti e Contratti', desc: 'Grandi appalti, PPP' },
    { id: 'sicurezza', label: 'Sicurezza sul Lavoro', desc: 'Sistemi gestione OHSAS' },
    { id: '231', label: 'D.Lgs 231/2001', desc: 'Modelli organizzativi, OdV' },
    { id: 'antitrust', label: 'Antitrust e Concorrenza', desc: 'M&A, abusi posizione dominante' },
  ]
};

export const IMPRESA_OBIETTIVI = [
  'Monitorare la compliance aziendale',
  'Gestire rischi normativi',
  'Formare il team legale interno',
  'Supporto a consulenti esterni'
];
