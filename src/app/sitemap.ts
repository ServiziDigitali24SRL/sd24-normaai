import type { MetadataRoute } from "next";

const baseUrl = "https://normaai.eu";

const VERTICALI = ["avvocato", "commercialista", "ingegnere", "lavoro", "finanziario"] as const;

const TOPIC_PER_VERTICALE: Record<string, string[]> = {
  avvocato: [
    "responsabilita-civile", "risarcimento-danni", "divorzio-separazione",
    "contratti-locazione", "successioni-eredita", "tutela-consumatori",
    "diritto-penale-base", "licenziamento-illegittimo", "diffamazione",
    "esproprio-indennizzo", "usucapione", "patrocinio-spese",
    "stalking-tutele", "violenza-domestica", "adozione-affido",
    "protezione-dati-gdpr", "diritto-autore", "marchi-brevetti",
    "visto-permesso-soggiorno", "cittadinanza-italiana",
  ],
  commercialista: [
    "dichiarazione-redditi", "iva-regime-forfettario", "srl-costituzione",
    "bilancio-annuale", "fusione-scissione", "transfer-pricing",
    "criptovalute-fisco", "superbonus-110", "ravvedimento-operoso",
    "concordato-preventivo", "perdita-fiscale", "crediti-imposta-ricerca",
    "fattura-elettronica", "partita-iva-apertura", "regime-minimi",
    "accertamento-fiscale", "redditometro", "antiriciclaggio-studio",
    "startup-innovativa", "holding-familiare",
  ],
  ingegnere: [
    "permesso-costruire", "cila-scia-differenza", "norme-antincendio",
    "sicurezza-cantiere-dlgs-81", "certificazione-energetica", "collaudo-statico",
    "abusi-edilizi-sanatoria", "appalti-pubblici-codice-36-2023", "responsabilita-progettista",
    "testo-unico-edilizia-380", "vincolo-paesaggistico", "distanze-fabbricati",
    "ape-attestato-prestazione", "cap10-norme-tecniche-costruzioni", "sismica-zona-sismica",
    "demolizione-ricostruzione", "cambio-destinazione-uso", "agibilita-certificato",
    "bim-appalti-pubblici", "ecobonus-detrazione",
  ],
  lavoro: [
    "licenziamento-individuale", "contratto-a-termine", "part-time-regole",
    "infortuni-sul-lavoro", "maternita-paternita", "mobbing-tutele",
    "naspi-requisiti", "lavoro-autonomo-partita-iva", "ccnl-commercio",
    "straordinari-limite", "demansionamento", "whistleblowing",
    "smart-working-regole", "tirocinio-stage", "apprendistato",
    "cig-cassa-integrazione", "sanzioni-disciplinari", "trasferta-trasfertismo",
    "dimissioni-volontarie", "contratto-somministrazione",
  ],
  finanziario: [
    "mutuo-tasso-fisso-variabile", "leasing-finanziario", "fideiussione-garanzie",
    "usura-bancaria", "anatocismo", "pignoramento-conto-corrente",
    "fallimento-procedura", "sovraindebitamento", "derivati-responsabilita",
    "antiriciclaggio-obblighi", "mifid2-tutela-investitori", "crowdfunding-normativa",
    "factoring", "cartolarizzazione", "mediazione-creditizia",
    "recupero-crediti", "cessione-quinto", "polizza-vita-fisco",
    "criptoasset-normativa-ue", "open-banking-psd2",
  ],
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const verticaliPages: MetadataRoute.Sitemap = VERTICALI.map((v) => ({
    url: `${baseUrl}/guide/${v}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const topicPages: MetadataRoute.Sitemap = VERTICALI.flatMap((v) =>
    (TOPIC_PER_VERTICALE[v] ?? []).map((topic) => ({
      url: `${baseUrl}/guide/${v}/${topic}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [...staticPages, ...verticaliPages, ...topicPages];
}
