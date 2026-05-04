import PDFDocument from "pdfkit";
import fs from "node:fs";

interface Screen {
  name: string;
  title: string;
  sub: string;
  bullets: string[];        // 4-8 microcopy strings
}

interface FullVariant {
  id: number;
  name: string;
  voice: string;
  tagline: string;
  hero: string;
  heroAccent: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  screens: {
    landing: Screen;
    chat: Screen;
    voice: Screen;
    avatar: Screen;
    lawyer: Screen;
    onboarding: Screen;
    api: Screen;
    whitelabel: Screen;
  };
  footer: string;
}

const variants: FullVariant[] = [
  // ════════════════════════════════════════════════════════════════════════
  // V1 — DIRETTA-PRATICA
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 1, name: "Diretta-Pratica",
    voice: "Pulito, anti-marketing. Diciamo cosa facciamo, punto.",
    tagline: "EDIZIONE 2026",
    hero: "Risposte legali in italiano,",
    heroAccent: "in 30 secondi.",
    heroSub: "Otto agent AI cercano la tua risposta nel corpus normativo aggiornato. Citazioni verificate. Niente fronzoli.",
    ctaPrimary: "Fai una domanda →",
    ctaSecondary: "▷ Vedi un esempio",
    screens: {
      landing: {
        name: "Landing", title: "La pagina principale",
        sub: "Mostriamo cosa siamo, come lavoriamo, cosa costa.",
        bullets: [
          "Hero · Risposte legali in italiano, in 30 secondi.",
          "Stat row · 142.000 norme · 8 agent · 99,4% citazioni verificate.",
          "Pillar 1 · Chiedi (chat o voce)",
          "Pillar 2 · Otto agent verificano",
          "Pillar 3 · Risposta con fonti reali",
          "CTA primaria · Fai una domanda",
          "CTA secondaria · Vedi un esempio reale",
        ],
      },
      chat: {
        name: "Chat desktop", title: "Chat",
        sub: "Empty state e flusso conversazione.",
        bullets: [
          "Empty state · Inizia con una domanda. Esempi: licenziamento, multa, contratto.",
          "Placeholder input · Scrivi qui la tua domanda.",
          "Tooltip allega · Aggiungi un PDF (multa, contratto, sentenza).",
          "Tooltip voce · Detta a voce.",
          "Sidebar agent · Stiamo verificando con 8 agent.",
          "CTA flottante · Vuoi un parere firmato? · 9 €",
        ],
      },
      voice: {
        name: "Voice mobile", title: "Voce",
        sub: "Orb + microcopy.",
        bullets: [
          "Pre-tap · Tocca per parlare.",
          "Recording · Ti ascolto.",
          "Thinking · Sto pensando.",
          "Speaking · Ti rispondo ora.",
          "Lingua picker · Italiano · 10 lingue.",
          "Esempio mostrato · Multa per eccesso di velocità: ricorso possibile.",
        ],
      },
      avatar: {
        name: "Avatar video", title: "Videochiamata",
        sub: "Carla / Marco · avatar AI.",
        bullets: [
          "Hero · Una videochiamata legale, quando vuoi.",
          "Avvio · Avvia la chiamata.",
          "Microcopy · Carla è un avatar AI. Lo dichiariamo per legge.",
          "Privacy · Niente è registrato. Niente esce dall'UE.",
          "Costo · Gratis per i primi 3 minuti.",
          "CTA · Inizia con Carla · oppure · Inizia con Marco.",
        ],
      },
      lawyer: {
        name: "Lawyer Dashboard", title: "Pannello avvocato",
        sub: "Lead disponibili · acquistati · KPI.",
        bullets: [
          "KPI · Lead questo mese · Tasso di conversione · Fatturato.",
          "Tab 1 · Lead disponibili nella tua zona.",
          "Tab 2 · Lead già acquistati.",
          "Tab 3 · Profilo + zona + specializzazioni.",
          "Card lead · Sblocca contatti · 91 €.",
          "Empty state · Nessun lead questa settimana. Riceverai una notifica.",
        ],
      },
      onboarding: {
        name: "Onboarding", title: "Registrazione",
        sub: "3 step mobile · 5 step desktop.",
        bullets: [
          "Step 1 · Come ti chiami?",
          "Step 2 · Sei italiano, straniero, turista?",
          "Step 3 · Sei un avvocato?",
          "Avvocato · Albo · P.IVA · Studio · Specializzazioni (max 3).",
          "Impresa · Ragione sociale · P.IVA · Numero dipendenti.",
          "CTA finale · Iniziamo.",
        ],
      },
      api: {
        name: "API B2B", title: "API per sviluppatori",
        sub: "Endpoint, esempi, prezzi.",
        bullets: [
          "Hero · Le nostre risposte legali, nella tua app.",
          "Endpoint · POST /v1/chat · POST /v1/citations/validate.",
          "Esempio code · cURL, JavaScript, Python.",
          "Free tier · 100 query/mese.",
          "Pro · 0,15 € / query.",
          "CTA · Genera la tua API key.",
        ],
      },
      whitelabel: {
        name: "White-label", title: "White-label",
        sub: "Per editori, banche, P.A., studi grandi.",
        bullets: [
          "Hero · Il motore NormaAI sul tuo dominio.",
          "Use case · Editori legali (Giuffrè, IPSOA).",
          "Use case · Banche (compliance interna).",
          "Use case · P.A. (assistenza cittadini).",
          "Use case · Studi legali grandi (knowledge management).",
          "Form · Ragione sociale · Email · Volume query/mese · Budget annuo.",
          "CTA · Parliamone.",
        ],
      },
    },
    footer: "NormaAI · Servizi Digitali 24 S.R.L. · Reg. UE 2024/1689 compliant",
  },

  // ════════════════════════════════════════════════════════════════════════
  // V2 — EMPATICO-VICINO
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 2, name: "Empatico-Vicino",
    voice: "Caldo, riconosce ansia. Promette aiuto progressivo, non vendita.",
    tagline: "AL TUO FIANCO",
    hero: "Hai un problema legale?",
    heroAccent: "Non sei solo.",
    heroSub: "Multa, licenziamento, sfratto, separazione. Ti ascoltiamo, ti spieghiamo, ti accompagniamo. Quando serve un avvocato vero, lo trovi qui.",
    ctaPrimary: "Inizia, gratis →",
    ctaSecondary: "Parla con noi a voce",
    screens: {
      landing: {
        name: "Landing", title: "La pagina principale",
        sub: "Riconosciamo l'ansia legale. Promettiamo accompagnamento.",
        bullets: [
          "Hero · Hai un problema legale? Non sei solo.",
          "Sub · Ti ascoltiamo, ti spieghiamo, ti accompagniamo.",
          "Pillar 1 · Ti ascoltiamo · racconta col tuo linguaggio.",
          "Pillar 2 · Ti spieghiamo · senza giuridichese.",
          "Pillar 3 · Ti accompagniamo · solo se vuoi.",
          "CTA · Inizia, gratis · Parla con noi a voce.",
          "Closing · Da oltre due anni accanto a chi ha bisogno.",
        ],
      },
      chat: {
        name: "Chat desktop", title: "Chat",
        sub: "Empty state empatico, microcopy che non giudica.",
        bullets: [
          "Empty state · Raccontaci cosa è successo. Anche poche parole bastano.",
          "Placeholder input · Scrivi qui senza preoccuparti delle parole giuste.",
          "Allega · Hai un documento? Possiamo leggerlo insieme.",
          "Voce · Preferisci parlare? Premi qui.",
          "Sidebar agent · Stiamo controllando le leggi che servono al tuo caso.",
          "CTA flottante · Quando ti serve una mano in più · 9 €.",
        ],
      },
      voice: {
        name: "Voice mobile", title: "Voce",
        sub: "Caldo, paziente.",
        bullets: [
          "Pre-tap · Quando vuoi, ti ascolto.",
          "Recording · Sto ascoltando con calma.",
          "Thinking · Mi prendo un attimo per pensarci.",
          "Speaking · Ti rispondo.",
          "Lingua picker · La tua lingua, il tuo modo.",
          "Esempio mostrato · Mi hanno fatto una multa, posso fare ricorso?",
        ],
      },
      avatar: {
        name: "Avatar video", title: "Videochiamata",
        sub: "Una persona ti ascolta in volto.",
        bullets: [
          "Hero · Una videochiamata, come da un vecchio amico avvocato.",
          "Microcopy · Carla è un avatar AI. Te lo diciamo per essere onesti.",
          "Privacy · Niente registrazioni. Tutto resta tra noi.",
          "Tone · Buongiorno. Sono Carla. Mi racconti come è andata.",
          "Costo · Gratis per i primi tre minuti, poi sei tu a decidere.",
          "CTA · Cominciamo · con Carla o con Marco.",
        ],
      },
      lawyer: {
        name: "Lawyer Dashboard", title: "Spazio avvocato",
        sub: "Per chi accoglie i casi che mandiamo.",
        bullets: [
          "Header · Bentornata Avv. [Nome].",
          "KPI · Casi ricevuti · Casi accettati · Soddisfazione clienti.",
          "Tab 1 · Casi che potresti seguire questa settimana.",
          "Tab 2 · Casi già con te.",
          "Card lead · Vuoi accogliere questo caso? · 91 €.",
          "Empty state · Nessun caso ancora. Tienici aggiornati sui tuoi giorni di disponibilità.",
        ],
      },
      onboarding: {
        name: "Onboarding", title: "Iniziamo a conoscerci",
        sub: "Tre passi · senza fretta.",
        bullets: [
          "Step 1 · Ciao, come ti chiami?",
          "Step 2 · Da dove ci scrivi? Italia, estero, in vacanza?",
          "Step 3 · Lavori nel diritto?",
          "Avvocato · Iscrizione albo · Studio · Cosa ti piace seguire?",
          "Closing step · Ci siamo. Puoi iniziare quando vuoi.",
          "Skip option · Voglio iniziare subito, dopo ti dirò chi sono.",
        ],
      },
      api: {
        name: "API B2B", title: "API",
        sub: "Per sviluppatori che ci credono.",
        bullets: [
          "Hero · Costruisci la tua app legale sopra il nostro motore.",
          "Sub · Stessa qualità della nostra chat. La tua interfaccia.",
          "Esempio · cURL, JavaScript, Python — partire è facile.",
          "Free · 100 query al mese, per provare con calma.",
          "Pro · 0,15 € a query, senza canoni nascosti.",
          "CTA · Generiamo la tua chiave?",
        ],
      },
      whitelabel: {
        name: "White-label", title: "Versione tua",
        sub: "Per editori, banche, enti pubblici, grandi studi.",
        bullets: [
          "Hero · Il nostro motore, il tuo brand.",
          "Storia · Lo facciamo già con [partner editoriali].",
          "Use case · Editori legali · risposte ai lettori.",
          "Use case · Banche · supporto interno compliance.",
          "Use case · Comuni · cittadini sportellati.",
          "Form · Raccontaci il vostro progetto.",
          "CTA · Sentiamoci, in chiamata o di persona.",
        ],
      },
    },
    footer: "NormaAI · al tuo fianco · Servizi Digitali 24 S.R.L.",
  },

  // ════════════════════════════════════════════════════════════════════════
  // V3 — PROVOCATORIO-CONFRONTO
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 3, name: "Provocatorio-Confronto",
    voice: "Anti-establishment. Smaschera prezzi gonfiati, propone alternativa.",
    tagline: "ROVESCIAMO IL MODELLO",
    hero: "150 € a consulto.",
    heroAccent: "Davvero?",
    heroSub: "Il diritto italiano è complicato perché tenerti all'oscuro paga. Rovesciamo il modello: chat gratis, citazioni vere, parere PDF a 9 €.",
    ctaPrimary: "Provalo gratis →",
    ctaSecondary: "Vedi quanto risparmi",
    screens: {
      landing: {
        name: "Landing", title: "La pagina principale",
        sub: "Confronto frontale con lo status quo.",
        bullets: [
          "Hero · 150 € a consulto. Davvero?",
          "Comparison · Studio tradizionale 150-300 € · NormaAI gratis + 9 €.",
          "Stat · −96% rispetto al primo consulto da uno studio.",
          "Pillar 1 · Chat gratis · niente paywall.",
          "Pillar 2 · Citazioni linkate al testo ufficiale · controlli tu.",
          "Pillar 3 · Avvocato a 9 €, niente acconti.",
          "Closing · Non vendiamo il diritto. Lo restituiamo.",
        ],
      },
      chat: {
        name: "Chat desktop", title: "Chat",
        sub: "Niente paywall, niente trucchi.",
        bullets: [
          "Empty state · Chiedi quello che ti pare. Tutte le volte che vuoi. Gratis.",
          "Placeholder · Una domanda che ti hanno detto di pagare per chiedere.",
          "Sidebar agent · 8 agent, fact-check incluso.",
          "Microcopy · Non c'è un quota mensile. Non c'è una pagina premium.",
          "CTA flottante · Se vuoi un parere PDF firmato, sono 9 €. Tutto qui.",
          "Tooltip allega · Carica anche cose che non capisci, te le leggiamo.",
        ],
      },
      voice: {
        name: "Voice mobile", title: "Voce",
        sub: "Anche in autobus, anche al supermercato.",
        bullets: [
          "Pre-tap · Tocca. Senza paywall.",
          "Recording · Ascolto.",
          "Thinking · Verifico le fonti vere.",
          "Speaking · Risposta con citazioni linkabili dopo.",
          "Lingua · 10 lingue, perché in Italia non si parla solo italiano.",
          "Microcopy esempio · La multa autovelox è valida solo se il verbale ha l'omologazione.",
        ],
      },
      avatar: {
        name: "Avatar video", title: "Videochiamata",
        sub: "Quanto costa un'ora dal tuo avvocato? Da noi, 0 €.",
        bullets: [
          "Hero · Un avvocato AI in videochiamata. Gratis.",
          "Sub · Lo facciamo perché possiamo. La tecnologia abbassa i costi, lo passiamo a te.",
          "Microcopy · Sì, è AI. Te lo diciamo come prevede la legge UE 2024/1689.",
          "Privacy · I dati restano in UE. Niente venduto a terzi.",
          "Costo · Tre minuti gratis. Poi gratis ancora.",
          "CTA · Inizia. Niente carta di credito.",
        ],
      },
      lawyer: {
        name: "Lawyer Dashboard", title: "Pannello avvocato",
        sub: "Lavoro vero, prezzi onesti.",
        bullets: [
          "Hero pannello · Solo i lead che ti interessano. Niente canoni.",
          "KPI · Acquisiti · Conversione · ROI.",
          "Pricing tab · 91 € per lead. Punto.",
          "Tab 1 · Lead della tua zona, della tua materia.",
          "Tab 2 · Lead acquisiti.",
          "Comparison · Marketing tradizionale 200-500 € a contatto. Noi 91 €, qualificato.",
          "Empty state · Nessun lead per ora. Quando arriva, ti scrive lui.",
        ],
      },
      onboarding: {
        name: "Onboarding", title: "Cinque domande, niente di più",
        sub: "Niente verifica via email. Niente conferme superflue.",
        bullets: [
          "Step 1 · Nome.",
          "Step 2 · Italia o estero?",
          "Step 3 · Avvocato? Sì o no.",
          "Avvocato · Solo i dati che servono per matchare i lead. Niente di più.",
          "Privacy nota · Nessun dato venduto. Mai.",
          "CTA · Hai 30 secondi? Iniziamo.",
        ],
      },
      api: {
        name: "API B2B", title: "API senza canoni",
        sub: "Pay-per-query reale. Niente fee minime.",
        bullets: [
          "Hero · API legale italiana. 0,15 € a query. Niente abbonamenti.",
          "Sub · Free 100 query/mese. Non scadono. Si rinnovano. Punto.",
          "Comparison · Provider USA equivalenti: 49 $/mese minimo.",
          "Esempio · cURL · 4 righe.",
          "SLA · 99,9% senza tier 'business'. Tutti pagano lo stesso.",
          "CTA · Chiave in 30 secondi.",
        ],
      },
      whitelabel: {
        name: "White-label", title: "Self-hosted o SaaS",
        sub: "Anche on-premise. Anche air-gapped.",
        bullets: [
          "Hero · Il tuo motore legale, sotto il tuo dominio.",
          "Use case · Banche · niente vendor lock-in con USA.",
          "Use case · P.A. · dati on-premise.",
          "Use case · Studi grandi · knowledge interno indicizzato.",
          "Pricing · Trasparente. Da 290 €/mese, niente costi nascosti.",
          "Differenza · Niente call discovery di 60 minuti. Listino visibile.",
          "CTA · Vediamo i numeri insieme.",
        ],
      },
    },
    footer: "NormaAI · trasparenza al primo posto · Servizi Digitali 24 S.R.L.",
  },

  // ════════════════════════════════════════════════════════════════════════
  // V4 — TECH-INNOVATION
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 4, name: "Tech-Innovation",
    voice: "Forward-looking, B2B-oriented, AI Act/certificazioni come trust signal.",
    tagline: "EU AI ACT · ART. 50 NATIVE",
    hero: "Il primo motore legale italiano",
    heroAccent: "AI Act compliant.",
    heroSub: "Otto agent specialistici. 142.000 norme indicizzate. Zero allucinazioni. Reg. UE 2024/1689 supportato nativamente.",
    ctaPrimary: "Esplora la demo →",
    ctaSecondary: "API per sviluppatori",
    screens: {
      landing: {
        name: "Landing", title: "La pagina principale",
        sub: "Stack tecnico in vetrina.",
        bullets: [
          "Hero · Il primo motore legale italiano AI Act compliant.",
          "Stat · 99,4% recall · 142.000 norme · 8 agent · 0% allucinazione su benchmark.",
          "Stack · bge-m3 multilingual · HNSW · GPU on-EU · Langfuse trace.",
          "Pillar 1 · RAG hybrid 1024-dim.",
          "Pillar 2 · Multi-agent verification.",
          "Pillar 3 · Self-hosted on-EU · SOC2-ready.",
          "Trust signals · Reg. UE 2024/1689 · D-U-N-S 302416196 · Stripe verified.",
        ],
      },
      chat: {
        name: "Chat desktop", title: "Chat",
        sub: "Live agent telemetry.",
        bullets: [
          "Empty state · Stress-test our pipeline. Try a complex multi-norm query.",
          "Sidebar agent · State machine attiva · Routing → Norm Retriever → Vigenza → Citation Validator → Response Composer.",
          "Live trace · Latency p50 · 380ms · p99 · 1.2s.",
          "Span detail · Hover any agent for input/output JSON.",
          "Citation widget · Click any [Fonte X] for raw chunk + similarity score.",
          "Microcopy · Auditable AI · ogni risposta ha trace ID per audit.",
        ],
      },
      voice: {
        name: "Voice mobile", title: "Voice",
        sub: "Sub-300ms first-token. Edge inference.",
        bullets: [
          "Pre-tap · Voice agent · Voxtral STT + Groq LLM + ElevenLabs TTS.",
          "Stat · Sub-300ms first audio · gapless streaming.",
          "Lingua · 10 lingue · Voxtral multilingual · auto-detect.",
          "Privacy · Edge audio · niente storage.",
          "WebRTC · barge-in supportato · interruption handling.",
          "Microcopy · Real-time mode beta · early access for partners.",
        ],
      },
      avatar: {
        name: "Avatar video", title: "Avatar real-time",
        sub: "Lip-sync end-to-end < 800ms.",
        bullets: [
          "Hero · Real-time avatar legale, latenza sub-secondo.",
          "Stack · Audio2Face self-hosted · WebRTC streaming.",
          "Privacy · Volti generati, non clonati. UE-only.",
          "Trust · Disclaimer AI Act art. 50 nel firstMessage e nel parere PDF.",
          "Avatar · Carla (civile) · Marco (penale).",
          "API · /v1/avatar-stream · WebRTC SDP exchange · documented.",
        ],
      },
      lawyer: {
        name: "Lawyer Dashboard", title: "Marketplace pro",
        sub: "Lead scoring + ML matching.",
        bullets: [
          "Hero · Lead pre-qualificati con score 0-100.",
          "KPI · Conversion rate · cost-per-acquisition · LTV.",
          "Tab 1 · Lead matchati per vertical, città, score.",
          "Tab 2 · Acquired leads · outcome tracking.",
          "ML insight · I tuoi lead 'lavoro/Roma' convertono al 38% → suggerisci di espandere a Lazio.",
          "Pricing · 91 € a lead · zero abbonamenti.",
          "API · /v1/lawyer/leads · webhook su nuovo lead.",
        ],
      },
      onboarding: {
        name: "Onboarding", title: "Onboarding programmatico",
        sub: "Pochi step, validation real-time.",
        bullets: [
          "Step 1 · Identità · OAuth Google/Microsoft o email + magic link.",
          "Step 2 · Profilo · derivato da OAuth dove possibile.",
          "Step 3 · Verifica avvocato · check albo automatico via API.",
          "Step 4 · Specializzazioni · taxonomia validata.",
          "Step 5 · Webhook URL · per ricevere lead programmaticamente.",
          "API alternative · POST /v1/onboarding · self-service.",
        ],
      },
      api: {
        name: "API B2B", title: "API completa",
        sub: "OpenAPI 3.1 · SDK TypeScript / Python.",
        bullets: [
          "Endpoints · /v1/chat · /v1/citations/validate · /v1/leads · /v1/avatar-stream.",
          "Auth · Bearer token · JWT signed.",
          "Rate limit · 60 req/min default · custom su request.",
          "Tier Free · 100 query/mese · auto-rinnovo.",
          "Tier Pro · 0,15 € / query · pay-per-use.",
          "Tier Enterprise · da 290 €/mese · SSO · DPA · SOC2-ready.",
          "Docs · openapi.normaai.it · live docs · curl + JS + Python.",
        ],
      },
      whitelabel: {
        name: "White-label", title: "Enterprise",
        sub: "Self-hosted o SaaS · DPA · SLA.",
        bullets: [
          "Hero · NormaAI Engine · deploy sul tuo dominio.",
          "Architectures · SaaS · Single-tenant · Self-hosted Kubernetes.",
          "Compliance · DPA pre-firmato · ISO27001-ready · Schrems II resolved.",
          "Customization · Fine-tuning su corpus interno · brand voice in prompt.",
          "Integration · SSO SAML · webhook · audit logs S3-compatible.",
          "Form · Volume query/mese · Concorrenza compliance · Stack attuale.",
          "CTA · Discovery call · 30 min · NDA pre-call.",
        ],
      },
    },
    footer: "NormaAI · AI Act native · Servizi Digitali 24 S.R.L. · D-U-N-S 302416196",
  },

  // ════════════════════════════════════════════════════════════════════════
  // V5 — EDITORIALE-AUTOREVOLE (attuale)
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 5, name: "Editoriale-Autorevole",
    voice: "Cura, eleganza, voce editoriale Sofia. Vintage palette, gravitas.",
    tagline: "§ EDIZIONE 2026 · VOLUME III",
    hero: "Una risposta legale ben scritta,",
    heroAccent: "ogni volta.",
    heroSub: "Dalla Cassazione al Codice della Strada. 142.000 norme, otto agent, una sola lingua chiara. Gratis per leggere. Nove euro per il parere firmato.",
    ctaPrimary: "Apri la chat",
    ctaSecondary: "Sfoglia un parere d'esempio",
    screens: {
      landing: {
        name: "Landing", title: "La pagina principale",
        sub: "Manifesto + tre pilastri editoriali.",
        bullets: [
          "Hero · Una risposta legale ben scritta, ogni volta.",
          "Manifesto · Il diritto è linguaggio. Lo curiamo.",
          "Pillar 1 · Editoriale, non chatbot · risposte composte come pareri.",
          "Pillar 2 · Otto specialisti AI, ognuno con un ruolo.",
          "Pillar 3 · Lingua come materia · italiano contemporaneo.",
          "Stat · 142.000 norme · 8 agent · 99,4% citazioni verificate.",
          "Closing · Una pubblicazione di Servizi Digitali 24.",
        ],
      },
      chat: {
        name: "Chat desktop", title: "Chat",
        sub: "Tipografia editoriale, ritmo curato.",
        bullets: [
          "Empty state · Cominci la conversazione. Le risponderemo come si scrive un parere.",
          "Placeholder · Mi racconti il caso, anche con poche righe.",
          "Sidebar agent · I nostri redattori AI · ognuno controlla un aspetto.",
          "Citazioni · Inline, con riferimento esteso a piè di paragrafo.",
          "CTA flottante · Per il parere firmato in PDF · nove euro.",
          "Microcopy · Sofia è AI. Lo si dichiara, come si fa con gli articoli redatti da AI.",
        ],
      },
      voice: {
        name: "Voice mobile", title: "Voce",
        sub: "Cinque personalità · dieci lingue.",
        bullets: [
          "Pre-tap · Quando vuole, mi parli.",
          "Persona picker · Mediatore · Aggressivo · Consulente · Globale.",
          "Recording · La sto ascoltando.",
          "Thinking · Un attimo, sto cercando le fonti.",
          "Speaking · Le rispondo.",
          "Lingue · 10 — italiano, inglese, arabo, romeno, ucraino, spagnolo, cinese, bengalese, giapponese, tedesco, francese.",
          "Microcopy · Come tutti i nostri canali, anche la voce è un'AI dichiarata.",
        ],
      },
      avatar: {
        name: "Avatar video", title: "Videochiamata",
        sub: "Carla, Marco · avvocati AI.",
        bullets: [
          "Hero · Carla e Marco · gli avvocati AI di NormaAI.",
          "Sub · In videochiamata. Pause naturali. Ritmo umano.",
          "Microcopy ingresso · Buongiorno. Sono Carla, avvocato AI specializzata in diritto civile. Mi dica.",
          "Privacy · Nessuna registrazione. Server UE.",
          "Trasparenza · Avatar generato in real-time da Audio2Face. Dichiarato.",
          "CTA · Inizia · scegli Carla o Marco a seconda della materia.",
        ],
      },
      lawyer: {
        name: "Lawyer Dashboard", title: "Studio · pannello",
        sub: "Tono pari ad un'agenzia editoriale.",
        bullets: [
          "Header · Buongiorno Avv. [Cognome].",
          "Sezione · Casi disponibili nella vostra zona.",
          "Sezione · Casi acquisiti.",
          "Sezione · Profilo · zona · materie.",
          "Card lead · Prendere in carico — nove euro · ehm, novantuno euro.",
          "Microcopy · Ogni lead arriva con un parere preliminare AI.",
          "Empty state · Nessun caso in coda. Vi scriveremo.",
        ],
      },
      onboarding: {
        name: "Onboarding", title: "Iscrizione",
        sub: "Struttura editoriale: cinque domande.",
        bullets: [
          "Step 1 · Il vostro nome.",
          "Step 2 · Da dove ci scrivete.",
          "Step 3 · Per chi · cittadino, impresa, avvocato.",
          "Step 4 · Solo per avvocati · Albo · Studio · Specializzazioni.",
          "Step 5 · Una nota libera · come fareste in una lettera.",
          "Closing · Benvenuti.",
        ],
      },
      api: {
        name: "API B2B", title: "API",
        sub: "Per editori e sviluppatori, la nostra redazione AI a disposizione.",
        bullets: [
          "Hero · La redazione NormaAI, accessibile via API.",
          "Sub · Le risposte che mostriamo in chat, le potete generare nel vostro prodotto.",
          "Endpoint · /v1/chat · /v1/citations/validate.",
          "Free · 100 query mensili.",
          "Pro · 0,15 € a query, pay-per-use.",
          "Enterprise · per editori legali · da 290 €/mese.",
          "Docs · openapi.normaai.it · esempi curati.",
        ],
      },
      whitelabel: {
        name: "White-label", title: "White-label",
        sub: "Per pubblicazioni, banche, P.A.",
        bullets: [
          "Hero · Il motore NormaAI, vestito del vostro brand.",
          "Use case · Editori legali · ad esempio, una rubrica AI accanto al vostro lettore.",
          "Use case · Banche · supporto compliance interno.",
          "Use case · P.A. · risposte ai cittadini con tono istituzionale.",
          "Use case · Grandi studi · knowledge management con interfaccia avvocato.",
          "Form · La vostra ragione sociale · contatto · volume di query stimato.",
          "CTA · Programmiamo un incontro.",
        ],
      },
    },
    footer: "§ NormaAI · una pubblicazione di Servizi Digitali 24 S.R.L.",
  },
];

const COLORS = {
  ink: "#1A1714",
  inkMid: "#3D3530",
  inkLight: "#6B5F55",
  rule: "#E8E0D2",
  vermiglio: "#C93924",
  warning: "#9A7B14",
};

async function buildFullPdf(v: FullVariant): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 60, left: 56, right: 56 },
    info: {
      Title: `NormaAI · Site Copy COMPLETO V${v.id} — ${v.name}`,
      Author: "NormaAI Brand",
      Subject: `${v.voice}`,
    },
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ─── PAGE 1: HERO + Variant info ───────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.vermiglio)
    .text(`VARIANTE ${v.id}/5 · ${v.name.toUpperCase()}`, { characterSpacing: 2 });
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.inkLight)
    .text(`Voce: ${v.voice}`);
  doc.moveDown(0.5);
  doc.strokeColor(COLORS.vermiglio).lineWidth(0.8)
    .moveTo(56, doc.y).lineTo(539, doc.y).stroke();
  doc.moveDown(1.5);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.ink).text("§ Norma AI");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkLight)
    .text(v.tagline, { characterSpacing: 1.8 });
  doc.moveDown(1);

  doc.font("Times-Bold").fontSize(36).fillColor(COLORS.ink).text(v.hero, { lineGap: 4 });
  doc.font("Times-Italic").fontSize(36).fillColor(COLORS.vermiglio).text(v.heroAccent, { lineGap: 4 });
  doc.moveDown(0.6);
  doc.font("Times-Italic").fontSize(13).fillColor(COLORS.inkMid)
    .text(v.heroSub, { width: 480, lineGap: 3 });
  doc.moveDown(1.2);

  const ctaY = doc.y;
  doc.rect(56, ctaY, 175, 36).fillColor(COLORS.vermiglio).fill();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
    .text(v.ctaPrimary, 56, ctaY + 13, { width: 175, align: "center" });
  doc.fillColor(COLORS.ink).font("Helvetica").fontSize(11)
    .text(v.ctaSecondary, 250, ctaY + 13);
  doc.y = ctaY + 50;

  // ─── PAGES 2+: 8 SCREENS, 2 per page ───────────────────────────────────────
  const screens = [
    v.screens.landing, v.screens.chat,
    v.screens.voice, v.screens.avatar,
    v.screens.lawyer, v.screens.onboarding,
    v.screens.api, v.screens.whitelabel,
  ];

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    if (i % 2 === 0) doc.addPage();
    else doc.moveDown(1.5);

    // Screen header
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.vermiglio)
      .text(`SCHERMATA ${i + 1}/8 · ${s.name.toUpperCase()}`, { characterSpacing: 1.5 });
    doc.moveDown(0.3);
    doc.font("Times-Bold").fontSize(20).fillColor(COLORS.ink).text(s.title);
    doc.font("Times-Italic").fontSize(11).fillColor(COLORS.inkMid)
      .text(s.sub, { width: 480 });
    doc.moveDown(0.8);

    // Bullets
    s.bullets.forEach((b) => {
      const dotY = doc.y + 4;
      doc.circle(60, dotY, 1.5).fillColor(COLORS.vermiglio).fill();
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink)
        .text(b, 70, doc.y, { width: 470, lineGap: 2 });
      doc.moveDown(0.3);
    });

    // Light rule between two screens on same page
    if (i % 2 === 0 && i < screens.length - 1) {
      doc.moveDown(0.8);
      doc.strokeColor(COLORS.rule).lineWidth(0.4)
        .moveTo(56, doc.y).lineTo(539, doc.y).stroke();
    }
  }

  // ─── FOOTER (every page) ───────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(range.start + p);
    const bottomY = 842 - 56;
    doc.strokeColor(COLORS.rule).lineWidth(0.3)
      .moveTo(56, bottomY - 22).lineTo(539, bottomY - 22).stroke();
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.warning)
      .text(v.footer, 56, bottomY - 16, { width: 487, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.inkLight)
      .text(`${p + 1}/${range.count}`, 56, bottomY - 4, { width: 487, align: "right" });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.inkLight)
      .text(`V${v.id} · ${v.name}`, 56, bottomY - 4, { align: "left" });
  }

  doc.end();
  return done;
}

(async () => {
  const outDir = "/Users/user/Documents/PROGETTI/NORMAAI/SITE-COPY-FULL-VARIANTS";
  fs.mkdirSync(outDir, { recursive: true });
  for (const v of variants) {
    const buf = await buildFullPdf(v);
    const path = `${outDir}/site-copy-FULL-v${v.id}-${v.name.toLowerCase().replace(/[^a-z]/g, "-")}.pdf`;
    fs.writeFileSync(path, buf);
    console.log(`✅ V${v.id} ${v.name} → ${(buf.length / 1024).toFixed(1)} KB`);
  }
})().catch(e => { console.error(e); process.exit(1); });
