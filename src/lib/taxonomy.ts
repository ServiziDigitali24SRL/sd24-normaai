// Taxonomy data for all roles — macro (sidebar col1) → items (sidebar col2)

export interface TaxonomyMacro {
  key: string;
  icon: string;
  label: string;
  badge?: string;
  items: string[];
}

export const CITTADINO_TAXONOMY: TaxonomyMacro[] = [
  { key: 'casa', icon: 'building', label: 'Casa & Abitazione', items: ['Locazione / Affitto', 'Sfratto', 'Condominio', 'Regolamento condominiale', 'Spese condominiali', 'Mutuo casa', 'Compravendita immobili', 'Successione immobiliare', 'Usucapione', 'Servitù'] },
  { key: 'famiglia', icon: 'users', label: 'Famiglia & Persone', items: ['Matrimonio / Unione civile', 'Separazione', 'Divorzio', 'Affidamento figli', 'Assegno di mantenimento', 'Testamento', 'Eredità / Successione', 'Donazione', 'Amministrazione di sostegno', 'Tutela / Curatela', 'Adozione'] },
  { key: 'lavoro', icon: 'briefcase', label: 'Lavoro', items: ['Contratto di lavoro', 'Licenziamento', 'Dimissioni', 'Stipendio / Retribuzione', 'Ferie / Permessi', 'TFR', 'Malattia', 'Maternità / Paternità', 'Infortunio sul lavoro', 'Mobbing', 'Discriminazione', 'Partita IVA freelance'] },
  { key: 'consumatore', icon: 'wallet', label: 'Consumatore', items: ['Acquisti online', 'Garanzia prodotti', 'Recesso 14 giorni', 'Telefonia', 'Bollette (luce/gas/acqua)', 'Banche / Conti correnti', 'Carte di credito', 'Prestiti / Finanziamenti', 'Viaggi / Voli cancellati'] },
  { key: 'fisco', icon: 'euro', label: 'Fisco & Tasse', items: ['730', 'Modello Redditi', 'IMU', 'TARI', 'Detrazioni', 'Bonus ristrutturazione', 'Cartelle esattoriali', 'ISEE', 'F24'] },
  { key: 'salute', icon: 'shield', label: 'Salute', items: ['Malasanità', 'Consenso informato', 'Invalidità civile', 'Legge 104', 'Pensione di invalidità', 'Privacy dati sanitari', 'Testamento biologico'] },
  { key: 'veicoli', icon: 'bolt', label: 'Veicoli & Circolazione', items: ['Multe', 'Ricorso Giudice di Pace', 'Incidenti stradali', 'Assicurazione RC auto', 'Risarcimento danni', 'Patente sospesa / ritirata', 'Punti patente', 'Passaggio di proprietà'] },
  { key: 'privacy', icon: 'lock', label: 'Privacy & Digitale', items: ['GDPR personale', 'Cancellazione dati', 'Diffamazione online', 'Cyberbullismo', 'Furto identità', 'Phishing'] },
  { key: 'pa', icon: 'shield', label: 'Rapporti con la PA', items: ['Permessi edilizi', 'Ricorso TAR', 'SPID', 'Cittadinanza', 'Immigrazione', 'Richiesta accesso atti'] },
];

export const IMPRESA_TAXONOMY: TaxonomyMacro[] = [
  { key: 'privacy', icon: 'lock', label: 'Privacy & Data Protection', items: ['GDPR — Reg. UE 2016/679', 'DPIA', 'Data breach', 'Trasferimenti extra-UE', 'Cookie & tracking', 'Videosorveglianza', 'E-privacy', 'Data retention policy', 'AI Act', 'NIS2'] },
  { key: 'lavoro', icon: 'briefcase', label: 'Lavoro & HR', badge: '5', items: ['CCNL applicato', 'Contratti individuali', 'Assunzioni', 'Licenziamenti', 'Sicurezza sul lavoro', 'INPS/INAIL', 'Smart working', 'Pari opportunità', 'Whistleblowing', 'Trasparenza retributiva', 'Statuto Lavoratori', 'Immigrazione/permessi', 'Infortuni & malattie professionali', 'Provvedimenti disciplinari'] },
  { key: 'fiscale', icon: 'euro', label: 'Fiscale & Tributario', items: ['IVA', 'Fatturazione elettronica', 'IRES/IRAP', 'Ritenute', 'Dichiarativi', 'Dogane', 'Transfer pricing', 'Tax compliance', 'Fiscalità internazionale', "Crediti d'imposta", 'Contenzioso tributario', 'Pillar Two'] },
  { key: 'societario', icon: 'building', label: 'Societario', items: ['Bilancio', 'Assemblee', 'CdA', 'Collegio sindacale / Revisori', 'Registro Imprese', 'Titolare effettivo', 'Quote & soci', 'Operazioni straordinarie', 'Liquidazione & crisi', 'Startup/PMI innovative'] },
  { key: 'd231', icon: 'shield', label: 'D.Lgs 231/2001', items: ['Modello Organizzativo (MOG)', 'OdV', 'Mappatura rischi-reato', 'Codice Etico', 'Procedure preventive', 'Flussi informativi all\'OdV', 'Formazione 231', 'Whistleblowing integrato', 'Audit 231'] },
  { key: 'ambiente', icon: 'bolt', label: 'Ambiente (HSE)', items: ['D.Lgs 152/2006 (TU Ambiente)', 'Rifiuti', 'Emissioni in atmosfera', 'Scarichi idrici', 'ETS', 'REACH / CLP', 'Imballaggi & CONAI', 'Bonifiche siti contaminati', 'CSRD / Reporting sostenibilità', 'Tassonomia UE', 'Due diligence sostenibilità', 'Deforestazione'] },
  { key: 'aml', icon: 'shield', label: 'Antiriciclaggio (AML)', items: ['D.Lgs 231/2007', 'Adeguata verifica clientela (KYC/CDD)', 'Segnalazioni operazioni sospette (SOS)', 'Conservazione dati e documenti', 'Formazione AML', 'Titolare effettivo clienti + propri', 'Sanzioni internazionali'] },
  { key: 'cyber', icon: 'plug', label: 'Sicurezza Digitale & Cyber', items: ['NIS2', 'DORA', 'Cyber Resilience Act', 'Agenzia Cybersicurezza Nazionale', 'Perimetro sicurezza cibernetica', 'Business continuity & disaster recovery'] },
  { key: 'contratti', icon: 'doc', label: 'Contrattualistica', items: ['Contratti fornitura', 'Contratti clienti', 'NDA', 'Contratti distribuzione/agenzia', 'Contratti licenza software/IP', 'Locazioni', 'Leasing & factoring', 'Joint venture & consorzi', 'Appalti privati', 'Clausole penali, risoluzione'] },
  { key: 'ip', icon: 'star', label: 'Proprietà Intellettuale (IP)', items: ['Marchi', 'Brevetti', 'Design', "Diritto d'autore", 'Segreti commerciali', 'Domini', 'Licenze open source'] },
  { key: 'consumatore', icon: 'wallet', label: 'Consumatore & Commerciale', items: ['Codice Consumo', 'E-commerce', 'Pubblicità ingannevole', 'Pratiche commerciali scorrette', 'Recensioni online', 'Prezzi & promozioni'] },
  { key: 'antitrust', icon: 'scale', label: 'Antitrust & Concorrenza', items: ['L. 287/1990 + Reg. UE', 'Concentrazioni', 'FDI Screening', 'Subsidy Regulation', 'Concorrenza sleale', 'Dawn raid preparedness'] },
  { key: 'appalti', icon: 'briefcase', label: 'Appalti Pubblici', items: ['Codice Appalti', 'SOA', 'White list prefettizia', 'DURC fiscale & contributivo', 'Antimafia', 'Subappalto', 'Legalità rating AGCM'] },
  { key: 'settoriali', icon: 'graph', label: 'Settoriali', items: ['Food/HACCP', 'Farmaceutico', 'Dispositivi medici', 'Finanziario', 'Assicurativo', 'Energia', 'Telco', 'Trasporti/Autotrasporto', 'Gioco', 'Edilizia', 'Turismo', 'Crypto/MiCA'] },
  { key: 'esg', icon: 'star', label: 'ESG & Sostenibilità', items: ['CSRD', 'ESRS', 'Due Diligence catena valore', 'SFDR', 'Tassonomia', 'Diritti umani', 'Bilancio di genere'] },
  { key: 'internazionale', icon: 'users', label: 'Internazionale', items: ['Export control', 'Sanzioni', 'FCPA / UK Bribery Act', 'Privacy extra-UE', 'Withholding tax internazionali', 'Stabile organizzazione rischi', 'Lavoratori distaccati', 'Transfer pricing intercompany'] },
  { key: 'crisi', icon: 'bolt', label: 'Gestione Crisi & Litigation', items: ['Litigation portfolio', 'Accantonamenti bilancio', 'Arbitrati', 'Mediazione obbligatoria', 'Negoziazione assistita', "Crisi d'impresa", 'Escussione garanzie'] },
  { key: 'assicurazioni', icon: 'shield', label: 'Assicurazioni Aziendali', items: ['D&O', 'RC prodotti', 'RC professionale', 'Cyber insurance', 'Property & BI', 'Credit insurance'] },
  { key: 'governance', icon: 'org', label: 'Governance & Etica', items: ['Codice di Condotta / Etico', 'Policy interne', 'Lobbying / rapporti PA', 'Remunerazione amministratori', 'Related party transactions'] },
  { key: 'documentale', icon: 'archive', label: 'Gestione Documentale', items: ['Conservazione digitale', 'Registro delle imprese', 'Libri sociali', 'Archivio fiscale'] },
];

export const PROF_AVVOCATO_TAXONOMY: TaxonomyMacro[] = [
  { key: 'lead', icon: 'flame', label: 'Marketplace Lead', badge: '7', items: ['Lead disponibili', 'Miei lead acquistati', 'Wallet crediti', 'Ricarica wallet', 'Filtri (specializzazione/zona/urgenza)', 'Storico acquisti', 'Statistiche conversion', 'Preferenze lead'] },
  { key: 'profilo', icon: 'star', label: 'Profilo Pubblico', items: ['Profilo directory', 'Specializzazioni', 'Foto e bio', 'Verifica albo', 'Social (LinkedIn, ecc.)', 'Recensioni', 'Statistiche profilo'] },
  { key: 'ricerca', icon: 'book', label: 'Ricerca Normativa (AI)', items: ['Chat legale AI', 'Giurisprudenza (Cass, TAR, Corte Cost.)', 'Normativa UE', 'Normativa italiana', 'Codici (Civile, Penale, Procedura)', 'Dottrina', 'Interpelli AdE', 'Prompt salvati'] },
  { key: 'scadenze', icon: 'clock', label: 'Scadenze Normative', items: ['Nuove leggi', 'Aggiornamenti codici', 'Circolari Cassazione', 'Alert per specializzazione', 'Calendar personale'] },
  { key: 'parcelle', icon: 'euro', label: 'Parcelle', items: ['Elenco parcelle', 'Stato pagamento', 'Emissione parcella', 'Export PDF', 'Tariffario indicativo', 'Storico'] },
  { key: 'connettori', icon: 'plug', label: 'Connettori (read-only)', items: ['Google Drive', 'OneDrive', 'Dropbox', '— NormaAI legge, NON memorizza'] },
  { key: 'amministrazione', icon: 'wallet', label: 'Amministrazione Studio', items: ['Abbonamento NormaAI', 'Fatture NormaAI', 'Dati studio', 'P.IVA / Dati fiscali', 'Cambia piano'] },
];

export const PROF_COMMERCIALISTA_TAXONOMY: TaxonomyMacro[] = [
  { key: 'ricerca', icon: 'book', label: 'Ricerca Normativa (AI)', items: ['Chat legale AI', 'Normativa fiscale', 'Normativa societaria', 'Circolari AdE', 'Interpelli AdE', 'Risoluzioni', 'Prassi amministrativa', 'Prompt salvati'] },
  { key: 'scadenze', icon: 'clock', label: 'Scadenze Normative', items: ['Scadenze fiscali (IVA/IRES ecc.)', 'Scadenze bilanci', 'Scadenze lavoro', 'Nuove circolari', 'Alert per categoria cliente', 'Calendar personale'] },
  { key: 'connettori', icon: 'plug', label: 'Connettori (read-only)', items: ['Google Drive', 'OneDrive', 'Dropbox', '— NormaAI legge, NON memorizza'] },
  { key: 'profilo', icon: 'star', label: 'Profilo Pubblico', items: ['Profilo directory', 'Specializzazioni', 'Foto e bio', 'Verifica albo', 'Recensioni'] },
  { key: 'parcelle', icon: 'euro', label: 'Parcelle', items: ['Elenco parcelle', 'Stato pagamento', 'Emissione parcella', 'Export PDF', 'Storico'] },
  { key: 'amministrazione', icon: 'wallet', label: 'Amministrazione Studio', items: ['Abbonamento NormaAI', 'Fatture NormaAI', 'Dati studio', 'P.IVA / Dati fiscali', 'Cambia piano'] },
];

export const PROF_ALTRO_TAXONOMY: TaxonomyMacro[] = [
  { key: 'ricerca', icon: 'book', label: 'Ricerca Normativa (AI)', items: ['Chat legale AI', 'Normativa di settore', 'Giurisprudenza', 'Dottrina', 'Circolari', 'Prompt salvati'] },
  { key: 'scadenze', icon: 'clock', label: 'Scadenze Normative', items: ['Nuove leggi', 'Aggiornamenti di settore', 'Alert per categoria', 'Calendar personale'] },
  { key: 'connettori', icon: 'plug', label: 'Connettori (read-only)', items: ['Google Drive', 'OneDrive', 'Dropbox', '— NormaAI legge, NON memorizza'] },
  { key: 'amministrazione', icon: 'wallet', label: 'Amministrazione Studio', items: ['Abbonamento NormaAI', 'Fatture NormaAI', 'Dati professionista', 'P.IVA / Dati fiscali', 'Cambia piano'] },
];

export type TaxonomyRole = 'cittadino' | 'impresa' | 'prof';
export type ProfVariant = 'avvocato' | 'commercialista' | 'altro';

export function getTaxonomy(role: TaxonomyRole, variant?: ProfVariant): TaxonomyMacro[] {
  if (role === 'cittadino') return CITTADINO_TAXONOMY;
  if (role === 'impresa') return IMPRESA_TAXONOMY;
  if (variant === 'commercialista') return PROF_COMMERCIALISTA_TAXONOMY;
  if (variant === 'altro') return PROF_ALTRO_TAXONOMY;
  return PROF_AVVOCATO_TAXONOMY;
}
