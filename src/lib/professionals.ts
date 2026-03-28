export type ProfId =
  | "avvocato"
  | "commercialista"
  | "lavoro"
  | "tecnico"
  | "finanziario";

export interface Feature {
  name: string;
  detail: string;
  saving?: string | null;
}

export interface ProfData {
  name: string;
  icon: string;
  desc: string;
  opp: string;
  live: Feature[];
  dev: Feature[];
}

export const PROFS: Record<ProfId, ProfData> = {
  avvocato: {
    name: "Avvocato",
    icon: "\u2696\uFE0F",
    desc: "Ricerca giurisprudenziale, corpus Cassazione, TAR/CdS",
    opp: "9.5/10 opportunita",
    live: [
      {
        name: "Ricerca giurisprudenziale AI",
        detail:
          "271K+ sentenze Cassazione, TAR, CdS indicizzate",
        saving:
          "Risparmio 90%+ vs DeJure/One LEGALE (\u20AC2.000-5.000/anno)",
      },
      {
        name: "Chat su corpus normativo completo",
        detail:
          "Codici, GDPR, normativa UE \u2014 in linguaggio naturale",
        saving: null,
      },
      {
        name: "Lead clienti qualificati in arrivo",
        detail:
          "Privati e imprese che cercano un avvocato tramite NormaAI",
        saving:
          "\u20AC49 contatto privato \u00B7 \u20AC99 contatto impresa",
      },
      {
        name: "Profilo pubblico nella directory",
        detail:
          "Visibilita SEO e GEO \u2014 trovato da chi cerca online",
        saving: null,
      },
    ],
    dev: [
      {
        name: "Alert aggiornamenti normativi",
        detail:
          "Push su modifiche legislative nelle tue aree di competenza",
      },
      {
        name: "Compliance check contratti e atti",
        detail:
          "Verifica automatica della conformita alla normativa vigente",
      },
      {
        name: "Analisi predittiva casi",
        detail:
          "Orientamento giurisprudenziale \u2014 solo 1.2% degli avvocati lo usa oggi",
      },
    ],
  },
  commercialista: {
    name: "Commercialista",
    icon: "\uD83D\uDCCA",
    desc: "Circolari AdE, TUIR, IVA, scadenze fiscali",
    opp: "8.5/10 opportunita",
    live: [
      {
        name: "Circolari AdE in linguaggio naturale",
        detail:
          '"Che dice la circolare su X?" \u2014 risposta in 5 secondi',
        saving: "vs 20-30 minuti su IPSOA ogni volta",
      },
      {
        name: "Corpus TUIR + IVA + OIC aggiornato",
        detail:
          "Normativa fiscale sempre aggiornata, nessun costo extra",
        saving: null,
      },
      {
        name: "Lead clienti imprese qualificati",
        detail:
          "Imprese che cercano un commercialista tramite NormaAI",
        saving:
          "\u20AC49 contatto privato \u00B7 \u20AC99 contatto impresa",
      },
      {
        name: "Profilo pubblico nella directory",
        detail:
          "Visibilita SEO e GEO \u2014 trovato da chi cerca online",
        saving: null,
      },
    ],
    dev: [
      {
        name: "Alert scadenze fiscali personalizzati",
        detail:
          "Notifiche su novita per forfettari, SRL, professionisti",
      },
      {
        name: "Check compliance antiriciclaggio AI",
        detail:
          "D.Lgs. 231/2007 \u2014 verifica automatica per ogni cliente",
      },
      {
        name: "Norma \u2192 azione operativa",
        detail:
          "L'AI spiega cosa fare in pratica per ogni adempimento",
      },
    ],
  },
  lavoro: {
    name: "Consulente del Lavoro",
    icon: "\uD83D\uDC54",
    desc: "800+ CCNL, Jobs Act, D.Lgs 81/08 sicurezza",
    opp: "9.0/10 opportunita",
    live: [
      {
        name: "Ricerca AI su 800+ CCNL",
        detail:
          "9.827 documenti CNEL indicizzati \u2014 rinnovi, modifiche, accordi",
        saving: "vs leggere 80 pagine di rinnovo CCNL",
      },
      {
        name: "Corpus Jobs Act + D.Lgs 81/2008",
        detail:
          "Normativa lavoro e sicurezza completa e aggiornata",
        saving: null,
      },
      {
        name: "Lead aziende clienti qualificati",
        detail:
          "Imprese che cercano un CdL tramite NormaAI",
        saving:
          "\u20AC49 contatto privato \u00B7 \u20AC99 contatto impresa",
      },
      {
        name: "Profilo pubblico nella directory",
        detail:
          "Visibilita SEO e GEO \u2014 trovato da chi cerca online",
        saving: null,
      },
    ],
    dev: [
      {
        name: "Alert rinnovi CCNL per settore",
        detail:
          "Notifiche personalizzate sui CCNL dei tuoi clienti",
      },
      {
        name: "Compliance sicurezza cantiere AI",
        detail:
          "Obblighi D.Lgs 81 specifici per numero dipendenti e settore",
      },
      {
        name: "Scadenze a cascata per cliente",
        detail:
          "Formazione, visite mediche, rinnovi \u2014 per ogni azienda",
      },
    ],
  },
  tecnico: {
    name: "Geometra / Ingegnere",
    icon: "\uD83C\uDFD7\uFE0F",
    desc: "DPR 380, NTC 2018, Codice Appalti, bonus edilizi",
    opp: "8.0/10 opportunita",
    live: [
      {
        name: "Normativa edilizia AI multilivello",
        detail:
          "DPR 380 + leggi regionali + regolamenti comunali incrociati",
        saving:
          "Risposta in 10 sec vs ricerca manuale su 3 fonti diverse",
      },
      {
        name: "Corpus NTC 2018 + Codice Appalti",
        detail:
          "D.Lgs 36/2023 completo \u2014 gare, documenti, soglie",
        saving: null,
      },
      {
        name: "Lead pratiche edilizie qualificati",
        detail:
          "Privati e imprese che cercano un tecnico tramite NormaAI",
        saving:
          "\u20AC49 contatto privato \u00B7 \u20AC99 contatto impresa",
      },
      {
        name: "Profilo pubblico nella directory",
        detail:
          "Visibilita SEO e GEO \u2014 trovato da chi cerca online",
        saving: null,
      },
    ],
    dev: [
      {
        name: "Navigator Bonus Edilizi 2026",
        detail:
          "Superbonus, Ecobonus, Sismabonus \u2014 requisiti e scadenze aggiornate",
      },
      {
        name: "Alert modifiche TUE + Codice Appalti",
        detail:
          "Notifiche con impatto operativo su ogni modifica",
      },
      {
        name: "Compliance sicurezza cantiere AI",
        detail:
          "Obblighi per numero imprese, coordinatore, PSC/POS",
      },
    ],
  },
  finanziario: {
    name: "Consulente Finanziario",
    icon: "\uD83D\uDCC8",
    desc: "MiFID II, TUF, Consob, compliance investimenti \u2014 per CF autonomi e indipendenti",
    opp: "6.5/10 opportunita",
    live: [
      {
        name: "Corpus MiFID II + TUF + Consob",
        detail:
          "Normativa finanziaria aggiornata \u2014 adeguatezza, KID, product governance",
        saving: null,
      },
      {
        name: "Ricerca AI su comunicazioni Consob",
        detail:
          "Alert e delibere Consob in linguaggio naturale",
        saving: null,
      },
      {
        name: "Lead clienti investitori qualificati",
        detail:
          "Privati che cercano consulenza finanziaria tramite NormaAI",
        saving:
          "\u20AC49 contatto privato \u00B7 \u20AC99 contatto impresa",
      },
      {
        name: "Profilo pubblico nella directory",
        detail:
          "Visibilita SEO e GEO \u2014 trovato da chi cerca online",
        saving: null,
      },
    ],
    dev: [
      {
        name: "Compliance MiFID II AI",
        detail:
          '"Questo prodotto e adeguato per profilo di rischio X?" \u2014 check istantaneo',
      },
      {
        name: "Alert regolamentari Consob / SFDR",
        detail:
          "Nuove comunicazioni con spiegazione operativa",
      },
      {
        name: "Normativa fiscale investimenti AI",
        detail:
          "Capital gain, regime dichiarativo vs amministrato, novita",
      },
    ],
  },
};
