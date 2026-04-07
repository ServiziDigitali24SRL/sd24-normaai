export type ArticleCategory =
  | "lavoro"
  | "condominio"
  | "contratti"
  | "fisco"
  | "multe"
  | "edilizia"
  | "privacy"
  | "famiglia";

export interface FAQ { q: string; a: string }
export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  categoryLabel: string;
  tldr: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: FAQ[];
  legge: string;
  image: { id: string; alt: string };
  datePublished: string;
  dateModified: string;
}

const CAT: Record<ArticleCategory, string> = {
  lavoro: "Diritto del Lavoro",
  condominio: "Condominio e Vicinato",
  contratti: "Contratti e Consumatori",
  fisco: "Fisco e Tasse",
  multe: "Multe e Sanzioni",
  edilizia: "Edilizia e Casa",
  privacy: "Privacy e Dati",
  famiglia: "Famiglia e Successioni",
};

// Unsplash photo IDs by category (license: free for use)
const IMAGES: Record<ArticleCategory, { id: string; alt: string }[]> = {
  lavoro: [
    { id: "1521737604893-d14cc237f11d", alt: "Ufficio moderno con scrivania" },
    { id: "1454165804606-c3d57bc86b40", alt: "Firma di un contratto di lavoro" },
    { id: "1507003211169-0a1dd7228f2d", alt: "Professionista al lavoro" },
    { id: "1560250097-0b93528c311a", alt: "Riunione aziendale" },
    { id: "1600880292203-757bb62b4baf", alt: "Lavoro in team" },
    { id: "1568992687947-868a62a9f521", alt: "Contratto lavoro" },
    { id: "1573496359142-b8d87734a5a2", alt: "Colloquio di lavoro" },
    { id: "1551836022-4c4c79ecde51", alt: "Consulenza professionale" },
    { id: "1520607162513-77705c0f0d4a", alt: "Scrivania con documenti" },
    { id: "1517245386807-bb43f82c33c4", alt: "Team professionale" },
    { id: "1522071820081-009f0129c71c", alt: "Videocall professionale" },
    { id: "1542744173-8e7e53415bb0", alt: "Analisi documenti" },
    { id: "1504384308090-c894fdcc538d", alt: "Laptop e documenti" },
    { id: "1553877522-43269d4ea984", alt: "Accordo commerciale" },
    { id: "1556745753-b2904692b3cd", alt: "Firma documenti" },
    { id: "1573497491765-dccce02b29df", alt: "Consulente del lavoro" },
    { id: "1556742049-0cfed4f6a45d", alt: "Professionale scrivania" },
    { id: "1515378791036-0648a814c963", alt: "Lavoro remoto" },
    { id: "1497366216548-37526070297c", alt: "Ufficio aperto" },
    { id: "1571771894821-ce9b6c11b08e", alt: "Team meeting" },
  ],
  condominio: [
    { id: "1486325212027-8081e485255e", alt: "Palazzo residenziale italiano" },
    { id: "1560448204-e02f11c3d0e2", alt: "Condominio moderno" },
    { id: "1582268611958-ebfd161ef9cf", alt: "Interno condominio" },
    { id: "1545324418-cc1a3fa10c00", alt: "Appartamento in edificio" },
    { id: "1503174971373-b1f69850bfd0", alt: "Palazzo storico" },
    { id: "1512917774080-9991f1c4c750", alt: "Casa moderna" },
  ],
  contratti: [
    { id: "1450101499163-c8848c66ca85", alt: "Firma contratto" },
    { id: "1589829085413-56de8ae18c73", alt: "Documenti legali" },
    { id: "1521791136064-7986c2920216", alt: "Accordo commerciale" },
    { id: "1554224155-8d04cb21cd6c", alt: "Penna su contratto" },
    { id: "1611532736597-de2d4265fba3", alt: "Contratto di acquisto" },
    { id: "1507003211169-0a1dd7228f2d", alt: "Consulenza legale" },
  ],
  fisco: [
    { id: "1554224155-6726b3ff858f", alt: "Calcolatrice e documenti fiscali" },
    { id: "1460925895917-afdab827c52f", alt: "Analisi finanziaria" },
    { id: "1526304640581-d334cdbbf45e", alt: "Dichiarazione redditi" },
    { id: "1579621970563-ebec7e9e2fda", alt: "Fisco italiano" },
    { id: "1567427017947-545c5f8cb53e", alt: "Commercialista lavoro" },
    { id: "1551836022-d5a69d48748e", alt: "Documenti fiscali" },
  ],
  multe: [
    { id: "1449824913935-59a10b8d2000", alt: "Traffico stradale italiano" },
    { id: "1485291571150-772bcfc10da5", alt: "Autovelox su strada" },
    { id: "1476445629872-f0c5d8d35dbc", alt: "Vigile urbano" },
    { id: "1558618666-fcd25c85cd64", alt: "Sanzione amministrativa" },
    { id: "1547447134-cd3de5b47b45", alt: "Verbale polizia" },
    { id: "1503376780353-7e6692767b70", alt: "ZTL centro città" },
  ],
  edilizia: [
    { id: "1504307651254-35680f356dfd", alt: "Cantiere edile" },
    { id: "1590725140246-20acddc1ec6d", alt: "Ristrutturazione casa" },
    { id: "1562813733-b31f71025d54", alt: "Progetto architettonico" },
    { id: "1503694978374-8a2fa686963a", alt: "Casa in costruzione" },
    { id: "1558618047-3c8c76ca7d13", alt: "Geometra con planimetria" },
    { id: "1560518883-ce09059eeffa", alt: "Appartamento ristrutturato" },
  ],
  privacy: [
    { id: "1516321318423-f06f85e504b3", alt: "Sicurezza digitale" },
    { id: "1558494949-ef010cbdcc31", alt: "Privacy e dati" },
    { id: "1573164713988-8665fc963095", alt: "Protezione dati personali" },
    { id: "1563986768609-322da13575f3", alt: "Cybersecurity" },
    { id: "1507003211169-0a1dd7228f2d", alt: "Consulenza GDPR" },
    { id: "1461749280684-dccba630e2f6", alt: "Codice informatico" },
  ],
  famiglia: [
    { id: "1511895426328-dc8714191011", alt: "Famiglia italiana" },
    { id: "1529156069898-49953e39b3ac", alt: "Eredità e successione" },
    { id: "1491013516836-7db643ee5058", alt: "Coppia firma documenti" },
    { id: "1600880292089-90a7e086ee0c", alt: "Casa di famiglia" },
    { id: "1581579438747-1dc8d17bbce4", alt: "Testamento e notaio" },
    { id: "1563013544-824ae1b704d3", alt: "Separazione coniugale" },
  ],
};

function img(cat: ArticleCategory, idx: number) {
  const list = IMAGES[cat];
  return list[idx % list.length];
}

export const ARTICLES: Article[] = [
  // ── LAVORO (20) ──────────────────────────────────────────────────────────────
  {
    slug: "contestare-licenziamento",
    title: "Come contestare un licenziamento senza giusta causa",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Hai 60 giorni dall'impugnazione stragiudiziale e 180 giorni per il ricorso al tribunale. La tutela dipende dalle dimensioni dell'azienda.",
    intro: "Il licenziamento senza giusta causa o giustificato motivo è illegittimo. La legge italiana prevede procedure precise per contestarlo e ottenere reintegra o indennizzo.",
    sections: [
      {
        heading: "Cos'è il licenziamento senza giusta causa",
        body: "Il datore di lavoro può licenziare solo per giusta causa (art. 2119 c.c.) — un fatto grave che rompe il rapporto fiduciario — o per giustificato motivo soggettivo (comportamento del lavoratore) o oggettivo (ragioni economiche). Un licenziamento privo di questi presupposti è illegittimo.",
      },
      {
        heading: "Entro quando contestare: i termini fondamentali",
        body: "• **60 giorni** dalla comunicazione del licenziamento per l'impugnazione stragiudiziale (raccomandata A/R o PEC al datore di lavoro).\n• **180 giorni** dall'impugnazione per depositare il ricorso al Tribunale del Lavoro (rito Fornero, ex Legge 92/2012).\nAttenzione: il mancato rispetto anche di uno solo dei due termini rende inefficace l'impugnazione.",
      },
      {
        heading: "Cosa spetta in caso di vittoria",
        body: "**Aziende con più di 15 dipendenti (art. 18 Statuto dei Lavoratori):**\n• Reintegra nel posto di lavoro + risarcimento (da 5 a 12 mensilità) per licenziamento discriminatorio o nullo\n• Indennizzo da 12 a 24 mensilità per vizi formali o mancata giusta causa\n\n**Aziende fino a 15 dipendenti (D.Lgs. 23/2015 — Tutele Crescenti):**\n• Indennizzo da 3 a 6 mensilità (contratto post-7 marzo 2015)\n• Reintegra solo per licenziamento discriminatorio o nullo",
      },
      {
        heading: "Come procedere: i passi pratici",
        body: "1. Conserva la lettera di licenziamento (deve essere scritta, art. 2 L. 604/1966)\n2. Invia raccomandata A/R o PEC di impugnazione entro 60 giorni\n3. Rivolgiti a un sindacato (gratuito) o a un avvocato giuslavorista\n4. Tenta la conciliazione in sede sindacale (facoltativa ma consigliata)\n5. Deposita il ricorso al Tribunale del Lavoro entro 180 giorni dall'impugnazione",
      },
    ],
    faqs: [
      { q: "Il licenziamento orale è valido?", a: "No. Il licenziamento deve essere comunicato per iscritto a pena di inefficacia (art. 2 L. 604/1966). Se è stato comunicato oralmente, è impugnabile immediatamente." },
      { q: "Posso fare ricorso anche se ho firmato la lettera di licenziamento?", a: "Sì. La firma sulla lettera di ricevuta non equivale ad accettazione del licenziamento. Puoi comunque impugnarlo entro 60 giorni." },
      { q: "Cosa succede durante il periodo di impugnazione?", a: "Il rapporto di lavoro è sospeso. Se vinci, hai diritto alle retribuzioni perse dal giorno del licenziamento fino alla sentenza (con la possibilità del giudice di ridurre il periodo)." },
      { q: "Posso licenziare un lavoratore durante la malattia?", a: "No, il licenziamento durante la malattia è nullo, salvo scadenza del periodo di comporto previsto dal CCNL." },
    ],
    legge: "L. 604/1966, art. 18 Statuto dei Lavoratori (L. 300/1970), D.Lgs. 23/2015",
    image: img("lavoro", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "busta-paga-controllo",
    title: "Busta paga: cosa controllare ogni mese",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Controlla sempre: ore lavorate, scatti di anzianità, trattenute INPS (9.19%), IRPEF corretta e TFR accantonato. Errori non contestati entro 5 anni si prescrivono.",
    intro: "La busta paga contiene informazioni cruciali sul tuo rapporto di lavoro. Sapere cosa leggere ti protegge da errori — spesso non volontari — che si accumulano nel tempo.",
    sections: [
      { heading: "Le voci fondamentali da verificare", body: "**Retribuzione base:** Deve corrispondere a quanto previsto dal CCNL applicabile e dal contratto individuale. Verifica che corrisponda alla tua qualifica.\n**Ore lavorate e straordinari:** Gli straordinari devono essere remunerati con la maggiorazione prevista dal CCNL (di solito 15-30% nelle prime ore, 30-50% nelle successive).\n**Scatti di anzianità:** Maturano automaticamente ogni 2 anni (importi variabili per CCNL). Molti lavoratori non li ricevono per errore." },
      { heading: "Le trattenute obbligatorie", body: "**INPS:** Il lavoratore paga il 9,19% della retribuzione lorda (9,49% per impiegati con anzianità > 15 anni).\n**IRPEF:** Calcolata su reddito lordo annuo. Per il 2026: 23% fino a €28.000, 35% da €28.000 a €50.000, 43% oltre €50.000. Verifica che le detrazioni da lavoro dipendente vengano applicate.\n**Addizionale regionale e comunale:** Variano da comune a comune. Controllare che siano corrette." },
      { heading: "TFR: come controllarlo", body: "Il TFR matura ogni mese alla quota di 1/13,5 della retribuzione annua (art. 2120 c.c.). La busta paga deve riportare il TFR maturato nel mese. Verifica anche se il tuo TFR va al fondo pensione o rimane in azienda." },
      { heading: "Errori più frequenti in busta paga", body: "• Mancata applicazione degli scatti di anzianità\n• Straordinari non pagati o pagati con percentuale errata\n• Detrazioni IRPEF non aggiornate (es. dopo variazione familiare)\n• Mancata corresponsione dei ratei di 13ª o 14ª\n• TFR calcolato su base sbagliata\n• CCNL sbagliato applicato" },
    ],
    faqs: [
      { q: "Entro quando posso contestare un errore in busta paga?", a: "Il credito si prescrive in 5 anni dalla maturazione (art. 2948 c.c.). Meglio contestare prima, con raccomandata scritta al datore di lavoro." },
      { q: "Il datore può ridurre unilateralmente lo stipendio?", a: "No. La riduzione unilaterale dello stipendio è illegittima. È possibile solo con accordo scritto e comunque mai sotto il minimo del CCNL." },
      { q: "Cosa fare se trovo un errore?", a: "Contesta per iscritto (email/PEC) indicando la voce errata e chiedendo la regolarizzazione entro 30 giorni. Se non risponde, rivolgiti al sindacato o alla DTL (Direzione Territoriale del Lavoro)." },
    ],
    legge: "Art. 2120 c.c. (TFR), D.P.R. 917/1986 (IRPEF), D.Lgs. 314/1997",
    image: img("lavoro", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "ferie-non-godute",
    title: "Ferie non godute: hai diritto al pagamento?",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Sì, le ferie non godute devono essere pagate alla cessazione del rapporto. Il datore non può imporre la perdita senza averti permesso di usufruirne.",
    intro: "Le ferie sono un diritto irrinunciabile (art. 36 Cost.). Il datore di lavoro non può imporre la decadenza senza aver prima messo il lavoratore in condizione di goderne.",
    sections: [
      { heading: "Quante ferie spettano per legge", body: "Il D.Lgs. 66/2003 garantisce almeno 4 settimane di ferie annue, di cui almeno 2 settimane consecutive. Il CCNL può prevedere un periodo maggiore. Le ferie si maturano anche durante malattia, maternità e altri periodi coperti da contribuzione figurativa." },
      { heading: "Quando scatta l'obbligo di pagamento", body: "Alla cessazione del rapporto di lavoro — per qualsiasi causa (dimissioni, licenziamento, pensione, morte) — le ferie maturate e non godute devono essere indennizzate. Il calcolo si fa sulla retribuzione giornaliera al momento della cessazione, moltiplicata per i giorni di ferie non fruiti." },
      { heading: "La Corte di Giustizia UE sul punto", body: "Con sentenza C-684/16 (2018), la Corte di Giustizia UE ha chiarito che il datore di lavoro non può far perdere le ferie al lavoratore se non dimostra di averlo invitato a goderne e informato delle conseguenze della mancata fruizione. In Italia, la Cassazione ha recepito questo orientamento (Cass. n. 13613/2021)." },
      { heading: "Come calcolare l'indennità ferie", body: "Indennità = (Retribuzione mensile lorda × 12) ÷ 52 settimane ÷ 5 giorni lavorativi × giorni di ferie non godute.\n\nEsempio: €2.000/mese lordi, 10 giorni di ferie non godute:\n(2.000 × 12) ÷ 52 ÷ 5 × 10 = **€923,07 lordi**" },
    ],
    faqs: [
      { q: "Il datore può imporre di consumare ferie accumulate?", a: "Sì, il datore può pianificare i periodi di ferie (art. 2109 c.c.) con congruo preavviso. Ma non può far perdere le ferie già maturate senza averti dato la possibilità di goderne." },
      { q: "Cosa fare se non mi pagano le ferie alla fine del rapporto?", a: "Invia raccomandata A/R con diffida a pagare entro 15 giorni. Se non ricevi riscontro, puoi presentare ricorso al Tribunale del Lavoro o rivolgerti all'Ispettorato del Lavoro." },
      { q: "Le ferie si prescrivono?", a: "Dal 2018, la Corte di Giustizia UE ha limitato la prescrizione delle ferie: decorre solo se il datore ha invitato attivamente il lavoratore a goderne. In caso contrario, la prescrizione è sospesa." },
    ],
    legge: "Art. 36 Cost., D.Lgs. 66/2003, art. 2109 c.c., CGUE C-684/16",
    image: img("lavoro", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "dimissioni-come-darle",
    title: "Come dare le dimissioni: procedura corretta 2026",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Dal 2016 le dimissioni vanno inviate telematicamente tramite il portale del Ministero del Lavoro o tramite patronato/CAF. Le dimissioni in bianco firmate non sono valide.",
    intro: "Dal 2016 (D.Lgs. 151/2015, art. 26) le dimissioni volontarie devono essere presentate con procedura telematica obbligatoria. Le dimissioni cartacee sono invalide salvo alcune eccezioni.",
    sections: [
      { heading: "La procedura telematica obbligatoria", body: "Per rassegnare le dimissioni devi:\n1. Accedere al portale **cliclavoro.gov.it** con SPID o CIE\n2. Compilare il modulo di dimissioni online\n3. Inviarlo telematicamente al Ministero del Lavoro\n\nIn alternativa, puoi rivolgerti a un **CAF, patronato, sindacato o consulente del lavoro** che invieranno per tuo conto (gratis o a basso costo)." },
      { heading: "Il preavviso", body: "Il CCNL applicabile stabilisce la durata del preavviso in base alla tua categoria e anzianità aziendale. Se non lo rispetti, il datore può trattenere l'**indennità sostitutiva del preavviso** (pari allo stipendio del periodo non lavorato). Durante il preavviso continui a lavorare normalmente e a maturare TFR." },
      { heading: "Dimissioni per giusta causa", body: "Puoi dimetterti senza preavviso per giusta causa (art. 2119 c.c.) se il datore ha commesso gravi inadempimenti: mancato pagamento dello stipendio, mobbing accertato, mutamento peggiorativo delle mansioni. In questo caso hai diritto all'**indennità di disoccupazione (NASpI)**." },
      { heading: "Diritto alla NASpI dopo le dimissioni", body: "Le dimissioni volontarie ordinarie non danno diritto alla NASpI. Le eccezioni sono:\n• Dimissioni per giusta causa\n• Dimissioni durante la maternità/paternità (nei primi 3 anni del figlio)\n• Risoluzione consensuale raggiunta in sede protetta (DL 40/2021)" },
    ],
    faqs: [
      { q: "Posso revocare le dimissioni?", a: "Sì, hai 7 giorni di tempo dalla trasmissione telematica per revocarle tramite lo stesso portale cliclavoro.gov.it." },
      { q: "Cosa sono le dimissioni in bianco?", a: "Sono dimissioni firmate dal lavoratore senza data, tenute dal datore per usarle quando vuole. Sono vietate e nulle. Chi le utilizza rischia sanzioni da €5.000 a €30.000." },
      { q: "Devo comunicare le dimissioni anche al datore per iscritto?", a: "La procedura telematica è sufficiente. Il sistema genera automaticamente la comunicazione al datore. Tuttavia, molti consulenti consigliano di inviare anche una comunicazione scritta per chiarezza." },
    ],
    legge: "Art. 2119 c.c., D.Lgs. 151/2015 art. 26, D.M. 15 dicembre 2015",
    image: img("lavoro", 3), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "mobbing-come-riconoscerlo",
    title: "Mobbing sul lavoro: come riconoscerlo e cosa fare",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Il mobbing è la sistematica persecuzione lavorativa. Per essere riconosciuto serve: reiterazione nel tempo, intento persecutorio e danno alla salute. La tutela è civile e penale.",
    intro: "Il mobbing non è tutelato da una legge specifica in Italia, ma è sanzionato attraverso le norme del Codice Civile (art. 2087), del Codice Penale e del Codice del Consumo. La giurisprudenza ha costruito nel tempo criteri precisi.",
    sections: [
      { heading: "Cos'è il mobbing: i criteri giuridici", body: "La Cassazione (sent. n. 3533/2003 e successive) ha fissato gli elementi essenziali:\n• **Reiterazione** nel tempo (almeno 6 mesi secondo alcune pronunce)\n• **Intento persecutorio** del datore o del superiore\n• **Danno alla salute** (fisico o psicologico, certificato medicamente)\n• **Nesso causale** tra condotte e danno\n\nNon basta un singolo episodio, anche grave, per configurare il mobbing." },
      { heading: "Differenza tra mobbing verticale e orizzontale", body: "**Mobbing verticale:** condotto dal superiore gerarchico (il più comune). Include dequalificazione, isolamento, umiliazioni pubbliche, carichi di lavoro impossibili.\n**Mobbing orizzontale:** condotto dai colleghi, con il silenzio o la complicità del datore. Richiede di provare che il datore era a conoscenza e non è intervenuto (violazione art. 2087 c.c.)." },
      { heading: "Come documentare il mobbing", body: "1. Tieni un **diario dettagliato** con date, orari, testimoni e contenuto di ogni episodio\n2. Conserva **email, messaggi, comunicazioni scritte** che documentino le condotte\n3. Vai dal **medico di base** e richiedi certificati che colleghino lo stato di salute alle condizioni lavorative\n4. Se possibile, raccogli **testimonianze scritte** di colleghi\n5. Presenta **esposto all'Ispettorato del Lavoro** per l'apertura di un'istruttoria ufficiale" },
      { heading: "Le tutele legali disponibili", body: "**Risarcimento civile (art. 2087 c.c.):** Il datore risponde dei danni alla salute per non aver tutelato l'integrità psicofisica del lavoratore.\n**Dimissioni per giusta causa:** Puoi dimetterti senza preavviso e accedere alla NASpI.\n**Penale:** In casi gravi si configurano molestie (art. 660 c.p.), lesioni (art. 590 c.p.), stalking lavorativo (art. 612-bis c.p.)." },
    ],
    faqs: [
      { q: "Lo stress lavorativo è mobbing?", a: "No. Lo stress da lavoro correlato, anche intenso, non è automaticamente mobbing. Serve l'intento persecutorio sistematico. Può però dar luogo a una diversa tutela per violazione dell'art. 2087 c.c." },
      { q: "Quanto tempo ho per fare causa?", a: "Il termine di prescrizione per il risarcimento da mobbing è 5 anni dalla cessazione del rapporto di lavoro o dalla fine delle condotte mobbizzanti." },
      { q: "Posso assentarmi per malattia durante il mobbing?", a: "Sì. Il medico può certificare lo stato di malattia legato a disturbi psicologici da lavoro. L'assenza per malattia è tutelata e non può essere usata come ulteriore motivo di persecuzione." },
    ],
    legge: "Art. 2087 c.c., art. 612-bis c.p., Cass. n. 3533/2003",
    image: img("lavoro", 4), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "trovare-ccnl",
    title: "CCNL: come trovare il contratto che si applica a te",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Il CCNL applicabile è indicato nella lettera di assunzione e in busta paga. Se manca, si applica quello del settore prevalente dell'azienda. Il portale CNEL raccoglie tutti i CCNL vigenti.",
    intro: "Il Contratto Collettivo Nazionale di Lavoro stabilisce minimi retributivi, ferie, orari e tutele specifiche per settore. Conoscerlo è fondamentale per sapere cosa ti spetta.",
    sections: [
      { heading: "Come individuare il tuo CCNL", body: "Il CCNL applicabile deve essere indicato:\n• Nella **lettera di assunzione** (obbligatoria ex D.Lgs. 152/1997)\n• In **busta paga** (nel riquadro dati generali)\n• Nel **registro presenze** aziendale\n\nSe non è indicato, verifica il settore di attività dell'azienda (codice ATECO nella tua busta paga) e cerca il CCNL corrispondente." },
      { heading: "Dove trovare il testo dei CCNL", body: "• **Portale CNEL** (cnel.it) — raccolta completa e aggiornata di tutti i CCNL\n• **Sito del Ministero del Lavoro** — sezione contratti collettivi\n• **Sindacati** — CGIL, CISL, UIL hanno i testi completi\n• **NormaAI** — puoi chiederci direttamente le clausole che ti interessano" },
      { heading: "I CCNL più diffusi in Italia", body: "• **Commercio e Terziario** (CCNL Confcommercio) — 3,2 milioni di lavoratori\n• **Metalmeccanici** (CCNL FEDERMECCANICA) — 1,6 milioni\n• **Edilizia** (CCNL ANCE) — 900.000 lavoratori\n• **Trasporti e Logistica** — 700.000 lavoratori\n• **Turismo e Ristorazione** — 600.000 lavoratori\n• **Bancario** (ABI) — 300.000 lavoratori" },
    ],
    faqs: [
      { q: "Il datore può applicare un CCNL diverso da quello di settore?", a: "Sì, ma non può scendere sotto i minimi garantiti dal CCNL di settore per quanto riguarda retribuzione e tutele fondamentali. L'applicazione di un CCNL pirata (sottoscritto da sindacati non rappresentativi) è sempre contestabile." },
      { q: "Cosa fare se il datore non applica il CCNL corretto?", a: "Puoi richiedere all'Ispettorato del Lavoro (ispettorato.gov.it) un'ispezione. Hai anche diritto ad azioni giudiziali per recuperare le differenze retributive." },
    ],
    legge: "D.Lgs. 152/1997, art. 2099 c.c., art. 36 Cost.",
    image: img("lavoro", 5), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── CONDOMINIO (15) ──────────────────────────────────────────────────────────
  {
    slug: "rumori-condominio",
    title: "Rumori in condominio: cosa dice la legge",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "I rumori devono essere tollerabili e non superare la normale tollerabilità (art. 844 c.c.). Il limite acustico per uso abitativo è 35 dB di notte e 40 dB di giorno per immissioni continue.",
    intro: "I rumori in condominio sono regolati dall'art. 844 del Codice Civile e dal D.P.C.M. 5 dicembre 1997 sui limiti acustici. La tutela è sia civile che penale.",
    sections: [
      { heading: "Il criterio della normale tollerabilità", body: "L'art. 844 c.c. stabilisce che il proprietario non può impedire le immissioni di rumore che non superino la normale tollerabilità. Il giudice valuta caso per caso considerando: condizione dei luoghi, abitudini locali, precedenza nell'insediamento, tipo di attività." },
      { heading: "I limiti di legge per i rumori notturni", body: "Il D.P.C.M. 5/12/1997 stabilisce per le abitazioni:\n• **Diurno (6-22):** immissione massima 40 dB(A), livello differenziale 5 dB(A)\n• **Notturno (22-6):** immissione massima 35 dB(A), livello differenziale 3 dB(A)\n\nPer i lavori edili e artigianali, alcuni comuni prevedono orari specifici." },
      { heading: "Come contestare i rumori: la procedura", body: "1. **Comunicazione scritta** al vicino (raccomandata o email PEC) con descrizione del disturbo\n2. **Segnalazione all'amministratore** se il rumore è da parti comuni\n3. **Esposto alla Polizia Municipale** o Carabinieri per il sopralluogo e rilevazione acustica\n4. **Perizia fonometrica** privata (utile in giudizio)\n5. **Ricorso al Giudice di Pace** per immissioni ex art. 844 c.c. (competenza fino a €30.000)\n6. **Procedimento penale** ex art. 659 c.p. per disturbo al riposo delle persone" },
    ],
    faqs: [
      { q: "I lavori di ristrutturazione di giorno sono ammessi?", a: "Sì, generalmente dalle 8 alle 13 e dalle 15 alle 19 nei giorni feriali. Gli orari precisi variano per regolamento comunale. Di notte e nei giorni festivi i lavori rumorosi sono vietati." },
      { q: "I cani che abbaiano sono un problema legale?", a: "Sì. L'abbaiare continuo di cani può integrare la fattispecie di disturbo alla quiete pubblica (art. 659 c.p.) e dare diritto a risarcimento del danno. Il proprietario del cane è responsabile." },
      { q: "Posso installare rilevatori di decibel in casa mia?", a: "Sì, ma le misurazioni fai-da-te hanno valore probatorio limitato. Per azioni legali conviene affidarsi a una perizia di un tecnico acustico certificato." },
    ],
    legge: "Art. 844 c.c., art. 659 c.p., D.P.C.M. 5/12/1997",
    image: img("condominio", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "spese-condominiali",
    title: "Spese condominiali: quando puoi rifiutarti di pagare",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "Non puoi rifiutarti unilateralmente di pagare le spese deliberate dall'assemblea, ma puoi contestarle impugnando la delibera entro 30 giorni o eccependo la nullità in qualsiasi momento.",
    intro: "Le spese condominiali sono obbligatorie per tutti i condomini, ma esistono casi in cui non sei tenuto a pagare o puoi sospendere il pagamento in attesa di chiarimenti.",
    sections: [
      { heading: "Quando le spese sono legittime", body: "Le spese condominiali sono legittime se deliberate dall'assemblea (art. 1135 c.c.) con le maggioranze richieste:\n• **Spese ordinarie:** maggioranza dei presenti che rappresenti almeno metà del valore dell'edificio (500 millesimi)\n• **Innovazioni:** maggioranza che rappresenti almeno 500 millesimi e la maggioranza dei condomini\n• **Innovazioni gravose:** 4/5 dei condomini e 4/5 del valore dell'edificio" },
      { heading: "Spese che puoi contestare o non pagare", body: "• **Delibera invalida:** se assunta senza il quorum richiesto, puoi impugnarla entro 30 giorni (art. 1137 c.c.) — ma intanto devi pagare\n• **Delibera nulla:** vizio assoluto (es. tocca diritti individuali), impugnabile in qualsiasi momento\n• **Spese già pagate:** documentate da ricevute — eccepibili in qualsiasi momento\n• **Spese di esclusiva pertinenza altrui:** es. ascensore se abiti al piano terra in base al regolamento\n• **Spese non deliberate:** l'amministratore non può spendere senza delibera assembleare per importi sopra soglia" },
      { heading: "Cosa succede se non paghi", body: "L'amministratore, dopo diffida scritta, può ottenere un **decreto ingiuntivo provvisoriamente esecutivo** (art. 63 disp. att. c.c.) anche senza sentire il debitore. In caso di mancato pagamento per oltre 6 mesi, il condomino moroso perde il diritto di voto nell'assemblea e l'amministratore può segnalare la morosità agli altri condomini." },
    ],
    faqs: [
      { q: "L'inquilino deve pagare le spese condominiali?", a: "L'inquilino paga le spese ordinarie (manutenzione, pulizie, illuminazione parti comuni) secondo il contratto di locazione. Le spese straordinarie (rifacimento tetto, facciata) sono a carico del proprietario." },
      { q: "Posso non pagare se l'amministratore non presenta il rendiconto?", a: "No, non puoi sospendere il pagamento unilateralmente. Puoi convocare un'assemblea straordinaria raccogliendo un numero sufficiente di firme (almeno 1/6 del valore dell'edificio) per ottenere il rendiconto." },
      { q: "Come vengono ripartite le spese tra i condomini?", a: "In base ai millesimi di proprietà (tabella millesimale), salvo diversa indicazione del regolamento. Per scale e ascensori si usano tabelle separate che tengono conto del piano." },
    ],
    legge: "Artt. 1117-1138 c.c., art. 63 disp. att. c.c.",
    image: img("condominio", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "ricorso-delibera",
    title: "Come fare ricorso contro una delibera assembleare",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "Le delibere annullabili si impugnano entro 30 giorni davanti al Tribunale. Le delibere nulle sono impugnabili in qualsiasi momento. In entrambi i casi, la delibera rimane esecutiva fino alla sentenza.",
    intro: "L'art. 1137 del Codice Civile distingue tra delibere nulle (vizio assoluto) e annullabili (vizio relativo). La distinzione è fondamentale per i termini e le modalità di impugnazione.",
    sections: [
      { heading: "Delibere nulle e delibere annullabili: la differenza", body: "**Delibere nulle** — impugnabili senza limiti di tempo:\n• Delibere che privano il condomino di diritti inviolabili (es. uso esclusivo di parti comuni)\n• Delibere contrarie a norme imperative di legge\n• Delibere su materie estranee alla competenza assembleare\n\n**Delibere annullabili** — impugnabili entro 30 giorni:\n• Delibere contrarie al regolamento condominiale\n• Delibere adottate senza il quorum richiesto\n• Delibere viziate per conflitto di interessi dell'amministratore" },
      { heading: "Il termine di 30 giorni: da quando decorre", body: "I 30 giorni decorrono:\n• **Per i condomini presenti:** dalla data dell'assemblea\n• **Per i condomini assenti:** dalla data di comunicazione del verbale (raccomandata A/R o PEC)" },
      { heading: "Come impugnare: la procedura", body: "1. **Incarica un avvocato** (la causa si svolge davanti al Tribunale)\n2. **Notifica il ricorso** al condominio entro i termini (tramite l'amministratore)\n3. **Deposita il ricorso** in cancelleria entro i successivi 30 giorni\n4. **Non sospendere il pagamento** delle spese nel frattempo — altrimenti ti esponi al decreto ingiuntivo" },
    ],
    faqs: [
      { q: "Posso chiedere la sospensione immediata della delibera?", a: "Sì, puoi chiedere al giudice un provvedimento cautelare di sospensione (art. 700 c.p.c.) se dimostri il fumus boni juris (probabilità di avere ragione) e il periculum in mora (danno imminente se la delibera viene eseguita)." },
      { q: "L'impugnazione di un solo condomino vale per tutti?", a: "No, ogni condomino deve impugnare per proprio conto. Ma se la delibera è nulla, l'accertamento della nullità produce effetti per tutti." },
      { q: "Cosa succede se vinco il ricorso?", a: "Il tribunale annulla la delibera con effetto retroattivo. Le spese eventualmente già pagate in esecuzione della delibera annullata possono essere recuperate." },
    ],
    legge: "Art. 1137 c.c., Cass. SS.UU. n. 9839/2021",
    image: img("condominio", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "infiltrazioni-condominio",
    title: "Infiltrazioni dal piano di sopra: chi paga?",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "Il vicino del piano superiore risponde se l'infiltrazione deriva dal suo immobile (art. 2051 c.c.). Se viene da parti comuni (tetto, tubazioni), paga il condominio.",
    intro: "Le infiltrazioni sono una delle cause più frequenti di contenzioso condominiale. Individuare la fonte è essenziale per determinare chi è responsabile e chi deve pagare i danni.",
    sections: [
      { heading: "Come determinare la fonte dell'infiltrazione", body: "La fonte determina la responsabilità:\n• **Infiltrazione dalla terrazza soprastante** → responsabilità del proprietario del piano superiore (art. 2051 c.c., custodia del bene)\n• **Infiltrazione dal tetto o dalle parti comuni** → responsabilità del condominio\n• **Infiltrazione da tubazioni condominiali** → responsabilità del condominio\n• **Infiltrazione da tubazioni interne all'appartamento superiore** → responsabilità del vicino\n\nPer determinare la fonte può essere necessaria una perizia tecnica." },
      { heading: "La procedura per ottenere il risarcimento", body: "1. **Documenta i danni** con foto e video datati\n2. **Informazione per iscritto** al vicino o all'amministratore\n3. **Accertamento tecnico preventivo (ATP)** ex art. 696 c.p.c. — puoi chiedere al tribunale la nomina di un CTU prima del giudizio per accertare la causa\n4. **Diffida a riparare** entro termine congruo (30-60 giorni)\n5. **Azione risarcitoria** in caso di mancato intervento" },
    ],
    faqs: [
      { q: "Posso far riparare io e poi chiedere rimborso?", a: "In casi urgenti, sì (art. 1134 c.c. — urgenza). Devi documentare tutto, conservare le fatture e poi richiedere rimborso al responsabile. Ma per danni strutturali conviene sempre avere l'accordo scritto preventivo." },
      { q: "Il condominio è sempre responsabile del tetto?", a: "Sì, il tetto è parte comune (art. 1117 c.c.) e il condominio ne risponde. Se l'assemblea ha deliberato la manutenzione ma l'amministratore non ha provveduto, risponde anche l'amministratore personalmente." },
    ],
    legge: "Art. 2051 c.c., art. 1117 c.c., art. 696 c.p.c.",
    image: img("condominio", 3), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── CONTRATTI (12) ───────────────────────────────────────────────────────────
  {
    slug: "diritto-recesso",
    title: "Diritto di recesso: 14 giorni per ripensarci",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "Hai 14 giorni per recedere da qualsiasi contratto a distanza (online, telefono) senza dover dare spiegazioni e senza penali, per qualunque prodotto o servizio.",
    intro: "Il diritto di recesso per i contratti a distanza è garantito dal D.Lgs. 206/2005 (Codice del Consumo), in attuazione della Direttiva UE 2011/83/UE. È un diritto irrinunciabile.",
    sections: [
      { heading: "A cosa si applica il diritto di recesso", body: "Il recesso si applica a tutti i contratti conclusi:\n• Online (e-commerce)\n• Per telefono o televideo\n• A domicilio del consumatore\n• In fiera o stand\n\nNon si applica a: contratti per beni su misura, beni deperibili, prodotti digitali scaricati con consenso immediato, servizi completamente eseguiti, alloggi/trasporti per date specifiche." },
      { heading: "Come esercitare il recesso", body: "**Termine:** 14 giorni dalla ricezione del bene o dalla conclusione del contratto per i servizi.\n\n**Come:** con qualsiasi mezzo che provi la comunicazione (email, PEC, raccomandata). Puoi usare il modulo standard previsto dal Codice del Consumo (allegato al D.Lgs. 206/2005) o una comunicazione libera che esprima chiaramente la volontà di recedere.\n\n**Restituzione del bene:** entro 14 giorni dalla comunicazione del recesso." },
      { heading: "Cosa hai diritto a recuperare", body: "Il venditore deve rimborsarti entro 14 giorni dalla ricezione della comunicazione di recesso:\n• Il prezzo del bene o servizio\n• Le spese di spedizione originali (solo quelle standard — non le spese extra per consegna rapida)\n\nLe spese di restituzione del bene sono a tuo carico, salvo che il venditore non le abbia accettate o non ti abbia informato diversamente." },
    ],
    faqs: [
      { q: "Cosa succede se il venditore non mi ha informato del diritto di recesso?", a: "Il termine di recesso si estende a 12 mesi dalla scadenza del periodo originale di 14 giorni (art. 53 Codice del Consumo). Praticamente hai un anno per recedere." },
      { q: "Posso recedere da un abbonamento già iniziato?", a: "Sì, entro 14 giorni dalla sottoscrizione, anche se hai già usato il servizio. Il venditore può trattenere solo il proporzionale per il servizio già fruito." },
      { q: "Il diritto di recesso vale anche per acquisti in negozio?", a: "No. Il diritto di recesso riguarda solo i contratti a distanza e quelli negoziati fuori dai locali commerciali. Per gli acquisti in negozio, il reso è una politica commerciale volontaria del venditore." },
    ],
    legge: "D.Lgs. 206/2005 artt. 52-58, Direttiva UE 2011/83/UE",
    image: img("contratti", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "clausole-vessatorie",
    title: "Clausole vessatorie: quando il contratto non vale",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "Le clausole vessatorie nei contratti con consumatori sono nulle (art. 33-36 Codice del Consumo) anche se le hai firmate. La nullità è parziale: il resto del contratto resta valido.",
    intro: "Le clausole vessatorie sono quelle che creano uno squilibrio significativo tra i diritti del professionista e quelli del consumatore. La legge le considera nulle di diritto.",
    sections: [
      { heading: "Cos'è una clausola vessatoria", body: "L'art. 33 del Codice del Consumo definisce come vessatoria ogni clausola che, nonostante la buona fede, determina un significativo squilibrio dei diritti e obblighi a danno del consumatore." },
      { heading: "Clausole sempre nulle (lista nera)", body: "L'art. 36 Codice del Consumo stabilisce alcune clausole sempre nulle:\n• Esclusione o limitazione della responsabilità del professionista per danni alla persona\n• Esclusione dei diritti del consumatore in caso di inadempimento totale\n• Clausole che prevedono il rinnovo automatico del contratto senza possibilità di uscita\n• Clausole che consentono al professionista di modificare unilateralmente il contratto\n• Clausole che spostano la competenza giurisdizionale fuori dal domicilio del consumatore" },
      { heading: "Clausole presumibilmente vessatorie (lista grigia)", body: "L'art. 33 Codice del Consumo elenca clausole che si presumono vessatorie salvo prova contraria:\n• Esclusione di limitazione delle azioni del consumatore\n• Facoltà del professionista di recedere senza giusta causa\n• Penali sproporzionate per inadempimento del consumatore\n• Proroga automatica del contratto senza adeguato preavviso" },
      { heading: "Come far valere la nullità", body: "Puoi invocare la nullità della clausola:\n1. **Stragiudizialmente:** comunicazione scritta al professionista indicando la clausola nulla e le tue pretese\n2. **Associazioni di consumatori:** alcune hanno potere di azione collettiva\n3. **Giudizialmente:** ricorso al Giudice di Pace (fino a €30.000) o Tribunale, con rimborso delle spese se vinci" },
    ],
    faqs: [
      { q: "Se ho firmato una clausola, non posso più contestarla?", a: "Sbagliato. La firma non sana la nullità di una clausola vessatoria. Puoi impugnarla in qualsiasi momento durante il rapporto contrattuale." },
      { q: "Le clausole vessatorie si applicano anche tra imprese?", a: "No. La disciplina sulle clausole vessatorie protegge solo i consumatori persone fisiche. Tra imprese valgono le norme codicistiche sull'abuso di dipendenza economica (L. 192/1998)." },
    ],
    legge: "Artt. 33-36 D.Lgs. 206/2005, Direttiva UE 93/13/CEE",
    image: img("contratti", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "come-scrivere-diffida",
    title: "Come scrivere una diffida valida",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "Una diffida valida contiene: identificazione delle parti, descrizione precisa dell'inadempimento, richiesta specifica con importo o comportamento dovuto, termine di adempimento (di solito 15-30 giorni) e avviso di azioni legali.",
    intro: "La diffida è un atto stragiudiziale con cui intimi alla controparte di adempiere entro un termine. È il primo passo prima di agire legalmente e spesso risolve la controversia senza bisogno di un giudice.",
    sections: [
      { heading: "Struttura di una diffida efficace", body: "**Intestazione:** mittente, destinatario, data\n\n**Premesse:** descrizione precisa del contratto, degli obblighi assunti dalla controparte e dell'inadempimento (con date e riferimenti documentali)\n\n**Diffida:** richiesta esplicita di adempiere entro [termine]\n\n**Conseguenze:** avviso che allo scadere del termine si procederà con [azione legale specificata]\n\n**Firma:** del mittente o del suo avvocato" },
      { heading: "Come inviare la diffida", body: "Per avere valore probatorio pieno:\n• **Raccomandata A/R:** hai la ricevuta di ritorno firmata dal destinatario\n• **PEC (Posta Elettronica Certificata):** ha valore legale equivalente a raccomandata; la ricevuta di consegna è prova dell'invio e della ricezione\n• **Consegna a mano con firma di ricevuta:** valida ma scomoda\n\nEvita email ordinarie o WhatsApp: hanno valore probatorio limitato e dipende dalla valutazione del giudice." },
      { heading: "Gli effetti giuridici della diffida", body: "La diffida produce importanti effetti legali:\n• **Costituzione in mora** (art. 1219 c.c.): da questo momento il debitore risponde anche per causa fortuita\n• **Decorrenza degli interessi moratori**\n• **Interruzione della prescrizione** del diritto (art. 2943 c.c.)" },
    ],
    faqs: [
      { q: "Ho bisogno di un avvocato per scrivere una diffida?", a: "No, puoi scriverla tu stesso. Tuttavia, una diffida firmata da un avvocato ha maggiore efficacia psicologica e garantisce la corretta formulazione delle pretese legali." },
      { q: "Cosa metto come termine nella diffida?", a: "Di solito 15 giorni per i privati, 30 giorni per le imprese. Per urgenze puoi abbreviare. Termini troppo brevi (24-48 ore) possono essere considerati non congrui e quindi non validi ai fini della mora." },
      { q: "Se la diffida non produce effetti, cosa faccio?", a: "Dopo la scadenza del termine puoi: ricorrere al Giudice di Pace (fino a €30.000), al Tribunale, oppure attivare una procedura di mediazione obbligatoria se prevista per la materia." },
    ],
    legge: "Art. 1219 c.c. (mora), art. 2943 c.c. (prescrizione), D.Lgs. 82/2005 (PEC)",
    image: img("contratti", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── FISCO (12) ───────────────────────────────────────────────────────────────
  {
    slug: "partita-iva-forfait",
    title: "Partita IVA a forfait: chi può aprirla nel 2026",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "Il regime forfetario è accessibile a chi ha ricavi annui fino a €85.000, non ha dipendenti con costo superiore a €20.000 e non possiede partecipazioni in SRL. La tassazione è al 15% (5% per i primi 5 anni).",
    intro: "Il regime forfetario (L. 190/2014) è il regime fiscale agevolato per autonomi e freelance con ricavi contenuti. È diventato l'opzione principale per la maggior parte dei nuovi professionisti.",
    sections: [
      { heading: "I requisiti 2026 per accedere al forfetario", body: "Per accedere al regime forfetario nel 2026 devi rispettare tutti questi requisiti:\n• **Ricavi annui ≤ €85.000** (soglia valida dal 2023)\n• **Spese per lavoro dipendente ≤ €20.000** lordi\n• **Nessuna partecipazione in SRL** con attività economica identica o analoga\n• **No società di persone** con controllo o collegamento\n• **Redditi da lavoro dipendente ≤ €30.000** nell'anno precedente (salvo cessa il rapporto)\n• Nessun utilizzo di regimi speciali IVA (agricoltura, editoria, ecc.)" },
      { heading: "Come funziona la tassazione", body: "La tassazione è sostitutiva di IRPEF, addizionali e IRAP:\n• **15%** sui redditi determinati in modo forfetario\n• **5%** nei primi 5 anni di attività (per nuove aperture, se non si è esercitata attività nei 3 anni precedenti)\n\nIl reddito tassabile = Ricavi × Coefficiente di redditività (varia per categoria da 40% a 86%).\n\nEsempio: avvocato, ricavi €50.000, coefficiente 78% → reddito imponibile €39.000 → imposta 15% = **€5.850**" },
      { heading: "Apertura e gestione: cosa fare", body: "**Apertura:** Modello AA9/12 all'Agenzia delle Entrate entro 30 giorni dall'inizio attività. Online tramite portale AE o presso uno sportello.\n\n**Fattura:** Esente IVA. Deve riportare la dicitura: *Operazione effettuata ai sensi dell'art. 1, commi 54-89, Legge n. 190/2014 — regime forfetario*.\n\n**Contributi INPS:** Gestione Separata (26,23% per il 2026) o Cassa professionale se iscritta.\n\n**Dichiarazione:** Modello Redditi PF, quadro LM." },
    ],
    faqs: [
      { q: "Posso avere la partita IVA forfetaria e un lavoro dipendente part-time?", a: "Sì, se il reddito da lavoro dipendente non supera €30.000 nell'anno precedente. Se supera quella soglia, perdi il regime forfetario per l'anno successivo." },
      { q: "Cosa succede se supero €85.000 di ricavi?", a: "Esci dal forfetario nell'anno successivo. Se superi €100.000 in un anno, esci immediatamente da quell'anno stesso e devi applicare l'IVA sulle fatture emesse dopo il superamento." },
      { q: "Devo emettere fattura elettronica?", a: "Dal 1° gennaio 2024, sì — anche i forfetari devono usare la fatturazione elettronica tramite il Sistema di Interscambio (SdI)." },
    ],
    legge: "L. 190/2014 artt. 1-89, L. 197/2022 (modifica soglia €85.000)",
    image: img("fisco", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "730-precompilato",
    title: "730 precompilato: come verificarlo prima di accettare",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "Il 730 precompilato può contenere errori. Verifica sempre: detrazioni sanitarie, interessi mutuo, assicurazioni vita, contributi previdenziali e redditi da locazione. Accettandolo senza modifiche, le verifiche su quelle voci sono bloccate.",
    intro: "Dal 2015 l'Agenzia delle Entrate mette a disposizione il modello 730 precompilato. Accettarlo senza modifiche blocca i controlli su specifiche voci, ma non garantisce che tutto sia corretto.",
    sections: [
      { heading: "Cosa trovi nel 730 precompilato", body: "Il precompilato include i dati comunicati da:\n• Datori di lavoro (redditi e ritenute)\n• INPS (pensioni e ammortizzatori)\n• Banche (interessi su mutuo)\n• Assicurazioni (premi vita e infortuni)\n• Farmacie e strutture sanitarie (spese mediche)\n• Enti previdenziali (contributi)\n• Comuni (IMU)\n• CAF e patronati (rimborsi anni precedenti)" },
      { heading: "Le voci da controllare con attenzione", body: "**Spese sanitarie:** Verifica che ci siano tutte le spese pagate con carta o fattura. Le spese pagate in contanti non sono nel precompilato. Controlla anche i familiari a carico.\n\n**Mutuo prima casa:** Controlla l'importo degli interessi passivi — le banche a volte comunicano cifre diverse da quelle in estratto conto.\n\n**Affitti:** Se sei proprietario, verifica che i canoni siano corretti e il regime fiscale (cedolare secca o IRPEF) sia quello che hai scelto.\n\n**Oneri detraibili:** Spese universitarie, contributi volontari, erogazioni liberali — inserisci quelle mancanti prima di inviare." },
      { heading: "Accettare, modificare o presentare direttamente", body: "**Accettare senza modifiche:** Blocca i controlli formali (ma non il controllo sulla dichiarazione in sé). È la scelta più comoda ma va fatta solo se hai verificato ogni voce.\n\n**Modificare prima di accettare:** Puoi aggiungere detrazioni mancanti, correggere errori. In questo caso i controlli non sono bloccati.\n\n**Presentare tramite CAF o professionista:** Conveniente se la situazione è complessa (più redditi, immobili, detrazioni particolari). Il CAF risponde per gli errori commessi nella compilazione." },
    ],
    faqs: [
      { q: "Entro quando va presentato il 730?", a: "Il termine di presentazione è fissato al 30 settembre dell'anno successivo a quello di imposta (es. 730/2026 per i redditi 2025 entro il 30 settembre 2026). Per il tramite di CAF, si può presentare anche dopo il 30 aprile." },
      { q: "Cosa faccio se ho già accettato il precompilato ma ho trovato un errore?", a: "Puoi presentare una dichiarazione integrativa entro il 31 dicembre del 4° anno successivo. Se l'errore ti è favorevole, puoi correggere entro 8 anni." },
    ],
    legge: "D.Lgs. 175/2014, D.P.R. 322/1998 (dichiarazione)",
    image: img("fisco", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── MULTE (12) ───────────────────────────────────────────────────────────────
  {
    slug: "ricorso-multa",
    title: "Come fare ricorso a una multa: guida pratica",
    category: "multe", categoryLabel: CAT.multe,
    tldr: "Hai 30 giorni per il ricorso al Prefetto (gratuito) o 30 giorni per il ricorso al Giudice di Pace (€43 di contributo unificato). Puoi scegliere solo uno dei due. Il pagamento entro 5 giorni dalla notifica dà diritto allo sconto del 30%.",
    intro: "Ogni multa stradale può essere contestata. Esistono due canali: il ricorso al Prefetto (amministrativo, gratuito) e il ricorso al Giudice di Pace (giurisdizionale, con costi). Vediamo come funzionano.",
    sections: [
      { heading: "I due canali di ricorso e le differenze", body: "**Ricorso al Prefetto:**\n• Entro 30 giorni dalla notifica della multa\n• Gratuito, non serve avvocato\n• Si deposita alla Prefettura del luogo dell'infrazione\n• Sospende il pagamento durante l'esame\n• Se respinto, la sanzione viene aumentata del 50%\n\n**Ricorso al Giudice di Pace:**\n• Entro 30 giorni dalla notifica (stesso termine)\n• Contributo unificato €43\n• Puoi procedere anche senza avvocato per sanzioni fino a €1.100\n• Sospende il pagamento durante il processo\n• Se perdi, paghi le spese processuali" },
      { heading: "I motivi di ricorso più efficaci", body: "• **Notifica irregolare:** contenuto incompleto, destinatario sbagliato, termini non rispettati\n• **Multa prescritta:** le contravvenzioni del CdS si prescrivono in 5 anni\n• **Vizi formali del verbale:** mancanza di elementi essenziali (data, luogo, norma violata)\n• **Autovelox non omologato:** verifica se l'apparecchiatura è omologata e tarata (aggiornamento annuale obbligatorio)\n• **Segnaletica mancante o illeggibile:** es. limite di velocità non segnalato\n• **Impossibilità oggettiva:** prova documentale che il veicolo non era lì (es. furto)" },
      { heading: "Come calcolare i termini di prescrizione", body: "La multa si prescrive in **5 anni** dal giorno in cui è stata commessa l'infrazione (art. 173 c.p.). Ma attenzione: la notifica dell'atto interrompe la prescrizione, e il nuovo termine di 5 anni riparte.\n\nIl termine per **notificare la multa** è:\n• 90 giorni dall'accertamento per violazioni rilevate direttamente\n• 90 giorni dalla comunicazione del proprietario per autovelox e telecamere\n• 360 giorni se la comunicazione va all'estero" },
    ],
    faqs: [
      { q: "Posso fare ricorso anche se ho già pagato?", a: "Teoricamente no: il pagamento equivale ad accettazione della sanzione. È tuttavia possibile chiedere la restituzione in caso di pagamento per errore o vizio dell'atto notificato (azione di ripetizione dell'indebito)." },
      { q: "Cosa scrivo nel ricorso?", a: "Indica: estremi del verbale, motivo del ricorso (specifico e circostanziato), documenti allegati, richiesta di annullamento. Per i motivi tecnici (autovelox, segnaletica) allega documentazione fotografica o richiesta di accesso agli atti." },
      { q: "Posso pagare a rate una multa?", a: "Sì. Per sanzioni superiori a €200, puoi chiedere la dilazione di pagamento all'ente che ha emesso la multa (comune o prefettura). Di solito in massimo 12 rate mensili." },
    ],
    legge: "Artt. 200-203 Codice della Strada, L. 689/1981, D.Lgs. 150/2011",
    image: img("multe", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "multa-ztl",
    title: "ZTL: come contestare una multa per telecamera",
    category: "multe", categoryLabel: CAT.multe,
    tldr: "La multa ZTL si contesta entro 30 giorni dalla notifica. I motivi più efficaci: segnaletica assente o illeggibile, telecamera non omologata, notifica irregolare, veicolo ceduto prima dell'infrazione.",
    intro: "Le multe per accesso in ZTL rilevate da telecamere sono frequentissime nelle città italiane. Spesso presentano vizi contestabili, soprattutto in merito alla segnaletica e all'omologazione dei dispositivi.",
    sections: [
      { heading: "Perché la segnaletica è il punto chiave", body: "Il Codice della Strada (art. 7) richiede che le ZTL siano segnalate in modo adeguato prima dell'accesso. La segnaletica deve essere:\n• Visibile e non ostruita\n• Correttamente installata (altezza, posizione)\n• Con gli orari di vigenza chiaramente indicati\n• Con l'indicazione delle deroghe (residenti, mezzi di soccorso, ecc.)\n\nSe la segnaletica era assente o illeggibile, hai un ottimo motivo di ricorso." },
      { heading: "Come verificare la telecamera", body: "Le telecamere per ZTL devono essere:\n• **Omologate** dal Ministero delle Infrastrutture\n• **Tarate** e verificate periodicamente\n• **Segnalate** con apposito cartello\n\nTramite accesso agli atti (L. 241/1990), puoi richiedere al Comune:\n• Il decreto di omologazione dell'apparecchiatura\n• Il verbale di taratura\n• Le foto dell'accesso che hanno generato la multa" },
      { heading: "Procedura di ricorso passo per passo", body: "1. Conserva il verbale e fotografa la segnaletica presente sulla strada\n2. Fai una richiesta di accesso agli atti al comune entro i termini\n3. Analizza: la segnaletica era corretta? La telecamera era omologata?\n4. Se trovi vizi, presenta ricorso al Prefetto (30 giorni) o al Giudice di Pace (30 giorni)\n5. Allega le prove documentali" },
    ],
    faqs: [
      { q: "Ho ceduto il veicolo: devo pagare la multa?", a: "No, se la cessazione del veicolo risulta dal PRA prima dell'infrazione. Presenta al Comune copia del passaggio di proprietà. Se invece hai ceduto il veicolo dopo l'infrazione, sei tu il responsabile al momento del fatto." },
      { q: "Posso chiedere la foto che ha generato la multa?", a: "Sì, tramite accesso agli atti. Il Comune è obbligato a fornirla. La foto serve per verificare la targa, il posizionamento del veicolo e la corretta identificazione." },
      { q: "Scade la multa ZTL se non viene notificata in tempo?", a: "La notifica deve avvenire entro 90 giorni dall'accertamento (rilevazione telecamera). Se la notifica arriva dopo, la multa è prescritta e può essere impugnata per decadenza." },
    ],
    legge: "Art. 7 e 201 CdS, L. 241/1990 (accesso atti), D.Lgs. 150/2011",
    image: img("multe", 5), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── EDILIZIA (10) ────────────────────────────────────────────────────────────
  {
    slug: "cila-scia-permesso",
    title: "CILA, SCIA o permesso di costruire: quando serve cosa",
    category: "edilizia", categoryLabel: CAT.edilizia,
    tldr: "CILA per piccoli interventi (cucina, bagno, tramezze), SCIA per opere di maggiore entità (ampliamenti, mutamento di destinazione), Permesso di Costruire per nuove costruzioni e ristrutturazioni pesanti.",
    intro: "Il D.P.R. 380/2001 (Testo Unico Edilizia) e il D.L. 76/2020 hanno semplificato la classificazione degli interventi edilizi. Scegliere il titolo sbagliato espone a sanzioni.",
    sections: [
      { heading: "Attività edilizia libera (senza titolo)", body: "Non serve alcun titolo abilitativo per:\n• Manutenzione ordinaria\n• Opere di arredo esterno (pergolati rimovibili, tende)\n• Pavimentazioni di aree pertinenziali (entro il 30% dell'area)\n• Realizzazione di rampe per disabili\n• Opere temporanee per ricerca nel sottosuolo\n• Movimenti di terra nel rispetto delle prescrizioni di settore" },
      { heading: "CILA: Comunicazione Inizio Lavori Asseverata", body: "Si usa per:\n• Manutenzione straordinaria che non riguarda parti strutturali\n• Rifacimento di impianti tecnologici\n• Interventi sulle finiture interne\n• Modifica delle partizioni interne non strutturali\n\n**Come si presenta:** al Comune, firmata da un tecnico abilitato, prima dell'inizio lavori. Nessuna attesa: si inizia subito dopo la presentazione.\n\n**Sanzione per omissione:** €1.000 (ridotta a €333 se presentata a lavori iniziati ma non terminati)." },
      { heading: "SCIA: Segnalazione Certificata di Inizio Attività", body: "Si usa per:\n• Manutenzione straordinaria di parti strutturali\n• Restauro e risanamento conservativo\n• Ristrutturazione edilizia non pesante\n• Ampliamenti entro il 20% del volume esistente\n• Mutamento di destinazione d'uso\n\n**Come si presenta:** al Comune. I lavori possono iniziare subito ma il Comune ha 30 giorni per verificare e bloccarli se irregolari.\n\n**Sanzione per omissione:** da €516 a €10.329." },
      { heading: "Permesso di Costruire", body: "Serve per:\n• Nuova costruzione\n• Ristrutturazione pesante (con ampliamento >20% o modifica della volumetria)\n• Interventi di urbanizzazione primaria e secondaria\n• Frazionamento di unità immobiliari\n\n**Come si ottiene:** istanza al SUAP/Comune, istruttoria entro 60 giorni, silenzio-diniego dopo 30 giorni dalla comunicazione dei motivi ostativi.\n\n**Sanzione per omissione:** demolizione + risarcimento." },
    ],
    faqs: [
      { q: "Cosa rischio se faccio lavori senza titolo?", a: "Dipende dall'entità: per interventi CILA sanzione pecuniaria, per SCIA sanzione + possibile rimessa in pristino, per lavori che richiedevano Permesso di Costruire: ordine di demolizione e rimessa in pristino, sanzione penale (art. 44 D.P.R. 380/2001)." },
      { q: "Posso sanare lavori già fatti senza titolo?", a: "Sì, tramite sanatoria (art. 36 D.P.R. 380/2001) se i lavori erano conformi agli strumenti urbanistici vigenti sia al momento dell'intervento sia al momento della domanda. Altrimenti solo il condono edilizio (se aperto)." },
    ],
    legge: "D.P.R. 380/2001, D.L. 76/2020, D.L. 77/2021",
    image: img("edilizia", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "affitto-nero",
    title: "Affitto in nero: rischi per proprietario e inquilino",
    category: "edilizia", categoryLabel: CAT.edilizia,
    tldr: "Il proprietario rischia sanzioni fiscali pesanti. L'inquilino può registrare il contratto unilateralmente e godere delle tutele locatizie. Dal 2014 l'inquilino può denunciare il contratto in nero.",
    intro: "L'affitto in nero — contratto di locazione non registrato — è illegale e comporta rischi seri per entrambe le parti, con sanzioni diverse in base al ruolo.",
    sections: [
      { heading: "I rischi per il proprietario", body: "Il proprietario che non registra il contratto rischia:\n• **Sanzione fiscale:** dal 120% al 240% dell'imposta dovuta (IRPEF o cedolare secca)\n• **Sanzione per omessa registrazione:** dal 60% al 120% delle imposte\n• **Impossibilità di sfrattare** regolarmente l'inquilino\n• **Perdita della cedolare secca** per gli anni di evasione\n• **Accertamento retroattivo** dell'Agenzia delle Entrate fino a 5 anni precedenti" },
      { heading: "La tutela dell'inquilino dal 2014", body: "Il D.L. 47/2014 ha introdotto per l'inquilino la possibilità di:\n1. **Registrare il contratto unilateralmente** all'Agenzia delle Entrate — pagando le imposte di registro\n2. **Comunicare la registrazione al proprietario** con raccomandata\n3. Da quel momento, il contratto di fatto diventa un contratto a canone concordato con durata 4+4 anni e canone ridotto\n\nQuesto strumento rende l'inquilino in nero molto tutelato." },
    ],
    faqs: [
      { q: "Il contratto non registrato è valido?", a: "Il contratto è nullo ai fini fiscali ma il rapporto di locazione di fatto sussiste. L'inquilino ha comunque diritto alla registrazione e alle tutele. La Cassazione (SS.UU. n. 18213/2015) ha stabilito che la sanzione va al proprietario, non alla nullità del contratto." },
      { q: "Come denunciare un affitto in nero?", a: "All'Agenzia delle Entrate, anche in forma anonima (ma meglio con nome per accedere alla riduzione del canone). Puoi anche registrare il contratto unilateralmente." },
    ],
    legge: "L. 431/1998, D.L. 47/2014, Cass. SS.UU. n. 18213/2015",
    image: img("edilizia", 5), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── PRIVACY (8) ──────────────────────────────────────────────────────────────
  {
    slug: "gdpr-diritti-interessato",
    title: "GDPR: i tuoi 8 diritti sui dati personali",
    category: "privacy", categoryLabel: CAT.privacy,
    tldr: "Hai 8 diritti GDPR: accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, non profilazione automatica, revoca consenso. Il titolare ha 30 giorni per rispondere.",
    intro: "Il Regolamento UE 2016/679 (GDPR) garantisce diritti concreti su come aziende e enti trattano i tuoi dati. Ecco come esercitarli.",
    sections: [
      { heading: "I 8 diritti GDPR e come esercitarli", body: "**1. Accesso (art. 15):** Puoi chiedere una copia di tutti i dati che l'azienda ha su di te.\n\n**2. Rettifica (art. 16):** Puoi correggere dati inesatti o completare dati incompleti.\n\n**3. Cancellazione (art. 17):** Il 'diritto all'oblio' — puoi chiedere la cancellazione se i dati non sono più necessari, hai revocato il consenso, o l'azienda li ha trattati illegittimamente.\n\n**4. Limitazione (art. 18):** Puoi limitare il trattamento durante una contestazione.\n\n**5. Portabilità (art. 20):** Puoi ricevere i tuoi dati in formato strutturato e trasferirli a un altro titolare.\n\n**6. Opposizione (art. 21):** Puoi opporti al trattamento per finalità di marketing diretto.\n\n**7. Non profilazione automatica (art. 22):** Puoi opporti a decisioni prese da soli sistemi automatici.\n\n**8. Revoca consenso (art. 7):** Puoi revocare il consenso in qualsiasi momento." },
      { heading: "Come esercitare i diritti", body: "Invia una richiesta scritta (email è sufficiente) al titolare del trattamento (di solito privacy@azienda.it). Indica:\n• Il tuo nome e cognome\n• I dati di contatto\n• Il diritto che vuoi esercitare\n• Eventuale copia di documento identità\n\nIl titolare ha **30 giorni** per rispondere (prorogabili a 90 in casi complessi)." },
    ],
    faqs: [
      { q: "Cosa faccio se l'azienda non risponde?", a: "Puoi presentare reclamo al Garante per la Protezione dei Dati Personali (garanteprivacy.it). Il reclamo è gratuito. Il Garante può ordinare al titolare di adempiere e comminare sanzioni fino al 4% del fatturato globale." },
      { q: "Il diritto di cancellazione è assoluto?", a: "No. Non si applica quando i dati servono per adempiere obblighi legali, per difendere un diritto in giudizio, per l'esercizio della libertà di espressione o per finalità di ricerca scientifica." },
    ],
    legge: "Reg. UE 2016/679 (GDPR) artt. 15-22, D.Lgs. 196/2003",
    image: img("privacy", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── FAMIGLIA (10) ────────────────────────────────────────────────────────────
  {
    slug: "separazione-divorzio-differenza",
    title: "Separazione e divorzio: le differenze in Italia",
    category: "famiglia", categoryLabel: CAT.famiglia,
    tldr: "La separazione sospende gli obblighi coniugali ma non scioglie il matrimonio. Il divorzio scioglie il matrimonio e permette di risposarsi. Dopo la L. 55/2015 si può divorziare dopo 6 mesi (consensuale) o 12 mesi (giudiziale) dalla separazione.",
    intro: "La separazione e il divorzio sono procedimenti distinti con effetti diversi sul matrimonio e sui coniugi. Capire la differenza è essenziale per pianificare il proprio percorso.",
    sections: [
      { heading: "La separazione: cosa cambia", body: "La separazione (artt. 150-158 c.c.) sospende i principali effetti del matrimonio:\n• Cessa l'obbligo di coabitazione\n• Cessa la presunzione di paternità per i figli nati dopo 300 giorni dalla separazione\n• Inizia il periodo per il divorzio\n• Si apre la questione dell'assegno di mantenimento e dell'affidamento dei figli\n\nIl matrimonio però rimane formalmente in essere: non puoi risposarsi." },
      { heading: "Il divorzio: lo scioglimento definitivo", body: "Il divorzio (L. 898/1970) scioglie definitivamente il matrimonio:\n• Entrambi i coniugi possono risposarsi\n• L'ex coniuge perde i diritti successori\n• Si chiude definitivamente la questione del regime patrimoniale\n\n**Tempi dopo la L. 55/2015:**\n• Separazione consensuale → divorzio dopo **6 mesi**\n• Separazione giudiziale → divorzio dopo **12 mesi**" },
      { heading: "Consensuale vs giudiziale", body: "**Consensuale:** I coniugi si accordano su tutti i termini (affidamento figli, mantenimento, casa coniugale). È più rapida, meno costosa e meno traumatica. Si può fare anche davanti al Sindaco (senza figli minorenni) o in convenzione avanti ai difensori.\n\n**Giudiziale:** Si va in tribunale perché non c'è accordo. Il giudice decide su ogni aspetto controverso. Più lunga (mesi o anni), più costosa, più conflittuale." },
    ],
    faqs: [
      { q: "Chi paga il mantenimento?", a: "Il coniuge economicamente più forte può essere condannato a versare un assegno di mantenimento all'altro se questi non ha redditi adeguati a mantenere il tenore di vita matrimoniale. Dopo il divorzio, l'assegno è riconosciuto solo se il richiedente non ha redditi sufficienti a una vita dignitosa (Cass. SS.UU. n. 18287/2018)." },
      { q: "La casa coniugale a chi va?", a: "Il giudice assegna la casa coniugale al genitore con cui abitano i figli minorenni o maggiorenni non autosufficienti, indipendentemente dalla proprietà dell'immobile." },
      { q: "Cosa succede ai risparmi in caso di separazione?", a: "Dipende dal regime patrimoniale scelto. In comunione dei beni: tutto il patrimonio acquisito durante il matrimonio si divide al 50%. In separazione dei beni: ciascuno mantiene i propri beni." },
    ],
    legge: "Artt. 150-158 c.c., L. 898/1970, L. 55/2015 (divorzio breve)",
    image: img("famiglia", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "eredita-rinuncia-accettazione",
    title: "Rinunciare o accettare un'eredità: come decidere",
    category: "famiglia", categoryLabel: CAT.famiglia,
    tldr: "Hai 10 anni per accettare o rinunciare. Se accetti con beneficio d'inventario, i debiti del defunto non superano il valore dei beni ereditati. La rinuncia va fatta davanti a un notaio o cancelliere del tribunale.",
    intro: "Quando arriva un'eredità, non sempre è conveniente accettarla — specie se ci sono debiti. La legge dà tempo per decidere e strumenti per proteggersi.",
    sections: [
      { heading: "Le opzioni davanti all'erede", body: "**Accettazione pura e semplice:** Erediti tutto — beni E debiti. Se i debiti superano i beni, li paghi con il tuo patrimonio personale.\n\n**Accettazione con beneficio d'inventario (art. 484 c.c.):** Separi il patrimonio ereditato dal tuo. Paghi i debiti del defunto SOLO fino al valore dei beni ereditati. Consigliata quasi sempre.\n\n**Rinuncia:** Non erediti nulla — né beni né debiti. Come se non fossi mai erede." },
      { heading: "I termini per decidere", body: "• **Chiamati in possesso dei beni:** 3 mesi per fare l'inventario + 40 giorni per decidere, oppure chiedere proroga al giudice\n• **Chiamati non in possesso dei beni:** 10 anni per accettare o rinunciare\n\nAttenzione: ci sono atti che costituiscono **accettazione tacita** — vendere, ipotecare, donare beni ereditari prima di accettare formalmente." },
      { heading: "Come si fa la rinuncia", body: "La rinuncia deve essere:\n1. **Scritta** (atto pubblico o scrittura privata autenticata)\n2. Davanti a **notaio** o al **cancelliere del Tribunale** del luogo dove si è aperta la successione\n3. **Registrata** nel Registro delle successioni\n\nLa rinuncia è revocabile finché un altro coerede non ha accettato o finché non è trascorso il termine prescrizionale." },
    ],
    faqs: [
      { q: "Posso rinunciare all'eredità per evitare di pagare i debiti?", a: "Sì. La rinuncia è retroattiva — si considera mai chiamato all'eredità. Ma se hai già compiuto atti che configurano accettazione tacita (es. venduto un bene dell'eredità), non puoi più rinunciare." },
      { q: "Se rinuncio, l'eredità va ai miei figli?", a: "Sì, per rappresentazione (art. 467 c.c.) — i tuoi figli subentrano al tuo posto. Anche loro possono poi rinunciare se vogliono." },
    ],
    legge: "Artt. 459-564 c.c., D.Lgs. 346/1990 (imposta successione)",
    image: img("famiglia", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "maternita-paternita-lavoro",
    title: "Congedo di maternità e paternità: diritti e durata",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "La madre ha diritto a 5 mesi di congedo obbligatorio all'80% dello stipendio. Il padre ha 10 giorni obbligatori al 100%. Entrambi possono usufruire del congedo parentale facoltativo fino a 6 anni del figlio.",
    intro: "Il congedo di maternità e paternità è un diritto garantito dal D.Lgs. 151/2001. I genitori lavoratori dipendenti hanno tutele precise che molti non conoscono.",
    sections: [
      { heading: "Congedo di maternità obbligatorio", body: "La lavoratrice madre ha diritto a **5 mesi** di astensione obbligatoria dal lavoro:\n• 2 mesi prima del parto + 3 dopo (distribuzione standard)\n• Oppure 1 mese prima + 4 dopo (opzione flessibile con certificato medico)\n\n**Indennità:** 80% della retribuzione media giornaliera, pagata dall'INPS. Il datore anticipa e l'INPS rimborsa." },
      { heading: "Congedo di paternità obbligatorio", body: "Il padre lavoratore dipendente ha diritto a **10 giorni** obbligatori (aggiornato 2024), da usare entro i 5 mesi dalla nascita.\n\n**Indennità:** 100% della retribuzione.\n\nAttenzione: sono giorni aggiuntivi rispetto a quelli della madre — entrambi i genitori possono fruirne contemporaneamente." },
      { heading: "Congedo parentale facoltativo", body: "Dopo il congedo obbligatorio, ciascun genitore può astenersi dal lavoro fino a **6 mesi** (limite complessivo 10 mesi tra entrambi i genitori) entro i **12 anni** del figlio.\n\n**Indennità 2024:** 80% per il primo mese, 60% per il secondo (se fruito entro 6 anni), 30% per i restanti mesi." },
    ],
    faqs: [
      { q: "Posso essere licenziata durante la maternità?", a: "No. Il licenziamento durante la gravidanza e fino a un anno dalla nascita del figlio è nullo (art. 54 D.Lgs. 151/2001), salvo colpa grave o cessazione dell'attività aziendale." },
      { q: "Ho diritto alla maternità anche in caso di adozione?", a: "Sì. Per adozione e affidamento si applicano le stesse tutele, con il congedo che decorre dall'ingresso del minore in famiglia." },
    ],
    legge: "D.Lgs. 151/2001, L. 234/2021 (congedo paternità 10 gg), D.Lgs. 105/2022",
    image: img("lavoro", 4), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "straordinari-diritti-lavoratore",
    title: "Straordinari: quando sono obbligatori e come vengono pagati",
    category: "lavoro", categoryLabel: CAT.lavoro,
    tldr: "Il lavoratore può essere obbligato allo straordinario solo entro i limiti del CCNL (di norma 2 ore/giorno, 8 ore/settimana). La maggiorazione minima è del 15% per le prime ore. Il superamento dei 250 ore annue è vietato.",
    intro: "Gli straordinari sono ore lavorate oltre l'orario normale (40 ore settimanali per la legge, meno per molti CCNL). Hanno regole precise su obbligatorietà e compenso.",
    sections: [
      { heading: "Quando puoi rifiutare lo straordinario", body: "Il rifiuto è legittimo se:\n• Le ore richieste superano i limiti del CCNL\n• Non è stata data comunicazione preventiva (salvo urgenze)\n• Hai giustificati motivi (es. cura dei figli, impegni familiari documentati)\n• L'azienda ha già superato il tetto annuo di 250 ore (D.Lgs. 66/2003)" },
      { heading: "Come viene retribuito", body: "**Maggiorazioni minime (D.Lgs. 66/2003 + CCNL):**\n• Straordinario diurno: +15% (prime ore), +20% (ore successive)\n• Straordinario notturno: +30%\n• Straordinario festivo: +35-50%\n\nI CCNL spesso prevedono percentuali più alte. Verifica il tuo CCNL." },
    ],
    faqs: [
      { q: "Il datore può sostituire il pagamento con riposi compensativi?", a: "Solo se previsto dal CCNL e con accordo del lavoratore. Non può imporre la sostituzione unilateralmente." },
      { q: "Cosa fare se gli straordinari non vengono pagati?", a: "Contesta per iscritto entro 5 anni (termine di prescrizione). Poi rivolgiti al sindacato o all'Ispettorato del Lavoro." },
    ],
    legge: "D.Lgs. 66/2003, art. 5 (straordinario), CCNL di categoria",
    image: img("lavoro", 5), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── CONDOMINIO extra ──────────────────────────────────────────────────────
  {
    slug: "amministratore-condominio-poteri",
    title: "Poteri e doveri dell'amministratore di condominio",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "L'amministratore dura in carica 1 anno rinnovabile. Deve tenere il registro condominiale, rendere il conto annuale e convocate l'assemblea almeno una volta l'anno. Può essere revocato in qualsiasi momento dall'assemblea.",
    intro: "L'amministratore è il rappresentante legale del condominio. Ha poteri specifici — ma anche limiti precisi che molti condomini non conoscono.",
    sections: [
      { heading: "Cosa può fare senza chiedere all'assemblea", body: "L'amministratore può agire autonomamente per:\n• Eseguire le delibere assembleari\n• Gestire le spese ordinarie rientranti nel bilancio approvato\n• Urgenze: riparazioni urgenti per evitare danni (es. rottura tubatura)" },
      { heading: "Cosa richiede l'approvazione assembleare", body: "Per spese straordinarie superiori al fondo di riserva, innovazioni, modifiche al regolamento, liti giudiziarie di valore superiore a €1.000 serve delibera assembleare. L'amministratore che agisce senza può essere ritenuto personalmente responsabile." },
      { heading: "Come revocarlo", body: "L'assemblea può revocare l'amministratore:\n• Con delibera a maggioranza semplice in prima convocazione\n• In qualsiasi momento, senza dover motivare\n\nIl tribunale può revocarlo d'urgenza su ricorso di un condomino se ci sono gravi irregolarità (es. mancato rendiconto)." },
    ],
    faqs: [
      { q: "L'amministratore è obbligato ad avere un'assicurazione?", a: "Dal 2013 (L. 220/2012) è obbligatorio stipulare una polizza RC professionale. Puoi richiederne copia." },
      { q: "Entro quando deve presentare il rendiconto?", a: "Entro 180 giorni dalla chiusura dell'esercizio. Il mancato rendiconto è grave irregolarità che giustifica la revoca." },
    ],
    legge: "Artt. 1129-1131 c.c., L. 220/2012 (riforma condominio)",
    image: img("condominio", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "animali-in-condominio",
    title: "Animali domestici in condominio: cosa dice la legge",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "Dal 2013 il regolamento condominiale non può vietare gli animali domestici negli appartamenti privati. Può però regolarne l'uso degli spazi comuni. Le norme sull'abbaiare e i rumori molesti restano applicabili.",
    intro: "La L. 220/2012 ha chiarito definitivamente che nessun regolamento condominiale può vietare ai proprietari di tenere animali domestici nel proprio appartamento.",
    sections: [
      { heading: "Il divieto nel regolamento è nullo", body: "L'art. 1138 c.c. (modificato dalla L. 220/2012) stabilisce che le norme del regolamento non possono vietare di possedere o detenere animali domestici. Qualsiasi clausola del genere è nulla e non va rispettata." },
      { heading: "Cosa può ancora regolamentare il condominio", body: "Il condominio può disciplinare:\n• Uso dell'ascensore (es. obbligo di trasportare l'animale in braccio o in gabbia)\n• Accesso alle aree verdi comuni (orari, guinzaglio obbligatorio)\n• Pulizia delle aree comuni dopo i bisogni dell'animale\n• Divieto di lasciare animali incustoditi nelle parti comuni" },
      { heading: "Rumori e disturbo della quiete", body: "Anche con animale legalmente detenuto, il proprietario risponde dei disturbi alla quiete (art. 844 c.c. e art. 659 c.p.). Se il cane abbaia continuamente disturbare i vicini puoi:\n1. Inviare diffida scritta al proprietario\n2. Segnalare all'amministratore\n3. Rivolgerti al Comune (Polizia Municipale)\n4. Ricorrere al giudice per risarcimento del danno" },
    ],
    faqs: [
      { q: "Possono vietare il cane nelle aree condominiali?", a: "Possono regolamentarne l'accesso (guinzaglio, orari) ma non vietarlo completamente se l'area è di transito necessario per accedere all'appartamento." },
      { q: "Chi pulisce se il mio cane sporca l'androne?", a: "Il proprietario dell'animale. In caso contrario può essere sanzionato dal Comune e tenuto a risarcire le spese di pulizia straordinaria." },
    ],
    legge: "Art. 1138 c.c. (mod. L. 220/2012), art. 844 c.c., art. 659 c.p.",
    image: img("condominio", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "parcheggio-condominio",
    title: "Posti auto in condominio: diritti e conflitti",
    category: "condominio", categoryLabel: CAT.condominio,
    tldr: "I parcheggi condominiali sono beni comuni salvo diversa previsione del regolamento o del titolo di acquisto. Il loro uso va regolamentato dall'assemblea. Chi occupa stabilmente il posto altrui commette illecito.",
    intro: "Le controversie sui posti auto sono tra le più frequenti in condominio. La legge distingue tra aree di proprietà esclusiva e aree comuni soggette a turnazione.",
    sections: [
      { heading: "Parcheggio comune: come si gestisce", body: "Se l'area è di proprietà condominiale (indicato nei titoli di acquisto), l'assemblea può:\n• Assegnare posti fissi a rotazione\n• Deliberare l'uso libero (primo arrivato)\n• Mettere i posti a rotazione annuale\n\nNessun condomino può appropriarsi stabilmente di un posto senza delibera." },
      { heading: "Quando il posto è di proprietà esclusiva", body: "Se nell'atto di acquisto o nel regolamento risulta un posto auto di proprietà esclusiva, solo quel proprietario può usarlo. La Cassazione ha confermato che anche in assenza di catasto separato, il titolo contrattuale è sufficiente." },
      { heading: "Come fare se qualcuno occupa il mio posto", body: "1. Diffida scritta al vicino\n2. Richiesta all'amministratore di intervento\n3. Se non basta: azione possessoria (art. 1168 c.c.) o azione di reintegra nel possesso avanti al giudice di pace (valore della causa di norma < €5.000)" },
    ],
    faqs: [
      { q: "Posso mettere un fermo-ruota o una catena per proteggere il mio posto?", a: "Solo se il posto è di tua esclusiva proprietà. In aree comuni qualsiasi atto di impedimento unilaterale può essere rimosso dall'amministratore e configurare illecito." },
      { q: "L'assemblea può obbligarmi a pagare i box auto anche se non li uso?", a: "Sì, se sono parti comuni le spese si ripartiscono tra i condomini in proporzione ai millesimi, indipendentemente dall'uso effettivo." },
    ],
    legge: "Art. 1117 c.c. (parti comuni), L. 765/1967 (parcheggi obbligatori)",
    image: img("condominio", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── CONTRATTI extra ──────────────────────────────────────────────────────
  {
    slug: "garanzia-prodotti",
    title: "Garanzia legale su prodotti difettosi: i tuoi diritti",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "La garanzia legale dura 2 anni dall'acquisto (non dalla consegna) per qualsiasi prodotto nuovo. Il venditore deve riparare, sostituire, ridurre il prezzo o rimborsare. Non può limitarla a 6 mesi.",
    intro: "La garanzia legale è un diritto inderogabile garantito dal Codice del Consumo (D.Lgs. 206/2005). Qualsiasi clausola che la riduca al di sotto dei 2 anni è nulla.",
    sections: [
      { heading: "Cosa copre la garanzia legale", body: "Copre qualsiasi **difetto di conformità** esistente al momento della consegna:\n• Il prodotto non funziona come pubblicizzato\n• Ha difetti materiali o di fabbricazione\n• Non corrisponde alla descrizione/campione mostrato\n• Non è adatto all'uso previsto\n\nNon copre danni da uso improprio o usura normale." },
      { heading: "Come far valere la garanzia", body: "1. Denuncia il difetto al venditore entro **2 mesi** dalla scoperta\n2. Chiedi (in ordine): riparazione o sostituzione gratuita\n3. Se riparazione/sostituzione impossibile o troppo onerosa: riduzione del prezzo o restituzione del prezzo\n\nLa riparazione deve avvenire entro **30 giorni**. Oltre, puoi scegliere la sostituzione." },
      { heading: "Garanzia commerciale vs legale", body: "La garanzia commerciale (del produttore) si aggiunge a quella legale, non la sostituisce. Se il produttore offre solo 1 anno, il venditore risponde comunque per 2 anni dalla consegna. La garanzia legale è gratuita e obbligatoria." },
    ],
    faqs: [
      { q: "Cosa fare se il venditore si rifiuta?", a: "Invia una diffida scritta (raccomandata A/R o PEC). Se non risponde entro 15 giorni, puoi rivolgerti allo sportello del consumatore della Camera di Commercio o al giudice di pace (causa < €5.000 gratuita con avvocato facoltativo)." },
      { q: "Vale anche per i prodotti usati?", a: "Sì, ma la garanzia può essere ridotta contrattualmente a 1 anno per prodotti di seconda mano." },
    ],
    legge: "Artt. 128-135 D.Lgs. 206/2005 (Codice del Consumo), Dir. UE 2019/771",
    image: img("contratti", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "contratto-affitto-diritti-inquilino",
    title: "Affitto: i diritti dell'inquilino che devi conoscere",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "L'inquilino ha diritto a un contratto scritto e registrato, all'abitabilità dell'immobile, alla restituzione del deposito cauzionale entro 30 giorni dal rilascio e al preavviso minimo di 6 mesi per lo sfratto da parte del proprietario.",
    intro: "Il contratto di locazione abitativa è regolato dalla L. 431/1998. Gli inquilini hanno tutele forti che spesso non conoscono.",
    sections: [
      { heading: "Il contratto deve essere scritto e registrato", body: "Qualsiasi locazione abitativa superiore a 30 giorni deve essere:\n• In forma scritta (pena la nullità)\n• Registrata all'Agenzia delle Entrate entro 30 giorni\n\nSe il proprietario non registra, l'inquilino può registrarlo autonomamente e scalare i costi dall'affitto." },
      { heading: "Durata minima e recesso", body: "**Contratto 4+4:** durata minima 4 anni, rinnovo automatico per altri 4. Il proprietario può disdire alla prima scadenza solo per motivi tassativi (es. uso proprio, ristrutturazione totale).\n\n**Recesso dell'inquilino:** con 6 mesi di preavviso in qualsiasi momento, o prima per gravi motivi." },
      { heading: "Il deposito cauzionale", body: "Massimo 3 mensilità. Deve essere restituito entro 30 giorni dal rilascio dell'immobile, dedotto solo per danni effettivi (non normale usura) documentati con perizia. Il mancato rimborso entro i termini dà diritto agli interessi legali." },
    ],
    faqs: [
      { q: "Il proprietario può entrare in casa senza preavviso?", a: "No. Deve dare preavviso ragionevole (di norma 24-48 ore) salvo urgenze. L'accesso non autorizzato configura violazione di domicilio (art. 614 c.p.)." },
      { q: "Chi paga le riparazioni?", a: "Il proprietario paga le riparazioni straordinarie (es. sostituzione caldaia, rifacimento tetto). L'inquilino paga la manutenzione ordinaria (es. sostituzione guarnizioni, riparazioni di piccola entità)." },
    ],
    legge: "L. 431/1998, artt. 1571-1614 c.c.",
    image: img("contratti", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "acquisto-online-rimborso",
    title: "Acquisti online: come ottenere il rimborso",
    category: "contratti", categoryLabel: CAT.contratti,
    tldr: "Hai 14 giorni di tempo per esercitare il diritto di recesso senza dover fornire alcuna motivazione. Il venditore ha 14 giorni per rimborsarti dalla ricezione del recesso o dalla restituzione del prodotto.",
    intro: "Gli acquisti online godono di tutele speciali rispetto ai negozi fisici, grazie al Codice del Consumo e alla Direttiva UE sui diritti dei consumatori.",
    sections: [
      { heading: "I 14 giorni di ripensamento", body: "Per qualsiasi acquisto online (e-commerce, marketplace, app) hai diritto a recedere entro **14 giorni** dalla consegna del prodotto — senza dover dare spiegazioni. Basta una comunicazione scritta (email al venditore).\n\nEccezioni: prodotti personalizzati, beni deperibili, file digitali scaricati, prenotazioni con date fisse." },
      { heading: "Come esercitare il recesso", body: "1. Invia email/PEC al venditore entro 14 giorni dalla consegna\n2. Indica il numero ordine e che vuoi recedere\n3. Restituisci il prodotto (spese di restituzione a tuo carico salvo diversa indicazione del venditore)\n4. Il venditore rimborsa entro **14 giorni** dalla ricezione del recesso o del prodotto restituito" },
      { heading: "Se il venditore non rimborsa", body: "Segnala alla piattaforma (Amazon, eBay, ecc.) e al MISE (Ministero delle Imprese). Per importi < €5.000 puoi rivolgerti al giudice di pace. Per controversie transfrontaliere usa la piattaforma ODR dell'UE." },
    ],
    faqs: [
      { q: "Vale anche per acquisti su marketplace privati (Vinted, Facebook Marketplace)?", a: "No. Il diritto di recesso si applica solo ai venditori professionali (imprese). Le vendite tra privati non beneficiano di questa tutela." },
      { q: "Il venditore può addebitarmi spese di restituzione?", a: "Solo se indicato chiaramente nelle condizioni di vendita prima dell'acquisto. Se non era indicato, le spese di restituzione sono a carico del venditore." },
    ],
    legge: "Artt. 52-58 D.Lgs. 206/2005, Dir. UE 2011/83/UE",
    image: img("contratti", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── FISCO extra ──────────────────────────────────────────────────────────
  {
    slug: "detrazioni-fiscali",
    title: "Detrazioni fiscali 2026: la lista completa",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "Le principali detrazioni IRPEF 2026 includono: interessi mutuo (19% su max €4.000), spese mediche (19% sulla quota eccedente €129,11), ristrutturazione (50% su max €96.000), figli a carico (assegno unico), istruzione (19%).",
    intro: "Le detrazioni riducono direttamente l'IRPEF dovuta. Ecco quelle più usate dai contribuenti italiani nel 2026.",
    sections: [
      { heading: "Spese mediche e sanitarie", body: "Detrazione del 19% sulla parte eccedente €129,11. Includono: visite specialistiche, farmaci con ricetta, occhiali/lenti (max €1.000), dentista, fisioterapia, ricoveri.\n\nAttenzione: dal 2020 i pagamenti devono essere tracciabili (niente contanti) per avere la detrazione." },
      { heading: "Mutuo prima casa", body: "Detrazione del 19% sugli interessi passivi pagati, su un massimo di €4.000/anno. Limitata alla prima casa e solo per contratti fino al 31/12/2021 per chi ha ISEE > €120.000 (soglia 2024-2026)." },
      { heading: "Ristrutturazione edilizia", body: "Detrazione del 50% (Superbonus non più disponibile in via ordinaria) su spese fino a €96.000 per unità abitativa, da ripartire in 10 anni. Vale per interventi di manutenzione straordinaria, restauro, ristrutturazione." },
      { heading: "Istruzione e formazione", body: "19% su: rette università (max pari a quella degli atenei statali), asili nido (max €632/figlio), corsi di laurea e master." },
    ],
    faqs: [
      { q: "Posso detrarre le spese mediche sostenute per i genitori?", a: "Sì, se i genitori sono fiscalmente a carico (reddito annuo non superiore a €2.840,51 lordi, o €4.000 se under 24). Le spese vanno indicate nel tuo 730." },
      { q: "Cosa succede se non ho pagato con carta o bonifico?", a: "Le spese mediche pagate in contanti non sono detraibili dal 2020. Eccezioni: farmaci in farmacia (detraibili anche in contanti), ticket SSN." },
    ],
    legge: "Art. 15 TUIR (D.P.R. 917/1986), L. 160/2019, Circolare AE 7/E/2021",
    image: img("fisco", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "bonus-ristrutturazione",
    title: "Bonus ristrutturazione 2026: come funziona",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "Il bonus ristrutturazione è al 50% per il 2026 (prorogato dalla Legge di Bilancio 2025) su spese fino a €96.000 per unità, in 10 rate annuali. Serve CILA o titolo abilitativo secondo il tipo di intervento.",
    intro: "La detrazione per ristrutturazione edilizia è uno degli incentivi fiscali più usati in Italia. Ecco come funziona nel 2026.",
    sections: [
      { heading: "Quali lavori sono ammessi", body: "• Manutenzione straordinaria su singole unità abitative\n• Restauro e risanamento conservativo\n• Ristrutturazione edilizia\n• Rifacimento bagni, cucine, impianti\n• Installazione di sistemi anti-intrusione, antifurto\n• Abbattimento barriere architettoniche\n• Acquisto di box auto pertinenziale (nuova costruzione)" },
      { heading: "Come ottenere la detrazione", body: "1. Eseguire i pagamenti con **bonifico parlante** (causale specifica per il bonus fiscale)\n2. Conservare fatture e ricevute\n3. Inviare comunicazione a ENEA entro 90 giorni dalla fine lavori (per interventi che migliorano efficienza energetica)\n4. Indicare le spese nel 730 o Modello Redditi" },
      { heading: "Cessione del credito e sconto in fattura", body: "Dal 2024 le nuove opzioni di cessione del credito e sconto in fattura sono fortemente limitate. Restano ammesse solo per specifiche categorie (es. IACP, terzo settore, zone sismiche 1-2). Il privato, in via ordinaria, può solo portare la detrazione in dichiarazione." },
    ],
    faqs: [
      { q: "Vale anche per lavori su seconde case?", a: "Sì, ma con alcune limitazioni per gli immobili detenuti come investimento. L'aliquota è comunque 50%." },
      { q: "Posso trasferire la detrazione se vendo casa?", a: "Di norma la detrazione va al nuovo proprietario, salvo accordo contrario indicato nell'atto di compravendita." },
    ],
    legge: "Art. 16-bis TUIR, L. 213/2023 (Legge Bilancio 2024), L. 207/2024 (Legge Bilancio 2025)",
    image: img("fisco", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "accertamento-fiscale-come-rispondere",
    title: "Accertamento fiscale: cosa fare quando arriva",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "Hai 60 giorni per rispondere all'invito al contraddittorio preventivo. L'accertamento con adesione permette di ridurre sanzioni a 1/3. Il ricorso in Commissione Tributaria va presentato entro 60 giorni dalla notifica.",
    intro: "Ricevere un avviso di accertamento dall'Agenzia delle Entrate non significa automaticamente dover pagare tutto. Esistono strumenti difensivi precisi.",
    sections: [
      { heading: "I tipi di accertamento più comuni", body: "• **Accertamento analitico-induttivo:** l'AE verifica i singoli componenti di reddito\n• **Redditometro:** confronto tra reddito dichiarato e spese sostenute\n• **Studi di settore / ISA:** scostamento dai ricavi attesi\n• **Controllo formale 36-ter:** verifica degli oneri deducibili/detraibili dichiarati" },
      { heading: "Accertamento con adesione", body: "Prima di fare ricorso, puoi chiedere l'**accertamento con adesione** (art. 6 D.Lgs. 218/1997):\n• Sospende i termini di ricorso di 90 giorni\n• Se raggiungi l'accordo: sanzioni ridotte a 1/3 del minimo\n• Pagamento entro 20 giorni, eventualmente rateizzabile\n\nÈ la strada più conveniente se l'accertamento è parzialmente fondato." },
      { heading: "Il ricorso tributario", body: "Se non si raggiunge accordo, il ricorso va presentato alla **Corte di Giustizia Tributaria** (ex Commissione Tributaria) entro **60 giorni** dalla notifica.\n\n• Importi fino a €3.000: procedura semplificata (reclamo-mediazione obbligatorio)\n• Importi > €3.000: ricorso ordinario, assistenza tecnica obbligatoria (commercialista o avvocato)" },
    ],
    faqs: [
      { q: "Posso chiedere la rateizzazione del debito tributario?", a: "Sì. Se paghi entro i termini ridotti (30 giorni), puoi rateizzare in massimo 8 rate trimestrali (o 16 per importi > €50.000) con interessi del 3% annuo." },
      { q: "Come funziona la prescrizione degli accertamenti?", a: "L'AE deve notificare l'accertamento entro il 31 dicembre del 5° anno successivo a quello di presentazione della dichiarazione (7° anno se la dichiarazione è omessa)." },
    ],
    legge: "D.P.R. 600/1973, D.Lgs. 218/1997, D.Lgs. 546/1992",
    image: img("fisco", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "isee-come-calcolarlo",
    title: "ISEE 2026: come calcolarlo e a cosa serve",
    category: "fisco", categoryLabel: CAT.fisco,
    tldr: "L'ISEE si ottiene presentando la DSU (Dichiarazione Sostitutiva Unica) all'INPS o a un CAF. È gratuito e vale 12 mesi. Considera redditi, patrimonio mobiliare e immobiliare del nucleo familiare.",
    intro: "L'ISEE è lo strumento principale per accedere alle prestazioni sociali agevolate in Italia: asilo nido, bonus energia, rette universitarie ridotte, mense scolastiche.",
    sections: [
      { heading: "Come presentare la DSU", body: "Puoi presentare la DSU:\n• **Online** sul portale INPS con SPID/CIE (DSU precompilata con dati già disponibili all'Agenzia delle Entrate)\n• **Presso un CAF** (gratuito)\n\nLa DSU è valida per l'anno solare — va ripresentata ogni anno." },
      { heading: "Cosa viene incluso nel calcolo", body: "**Reddito:** Reddito complessivo IRPEF di tutti i componenti del nucleo (con alcune deduzioni per figli, disabili, affitti pagati).\n\n**Patrimonio immobiliare:** Valore catastale degli immobili di proprietà (esclusa prima casa fino a €52.500, o €7.000 per ogni figlio oltre il secondo).\n\n**Patrimonio mobiliare:** Conti correnti, depositi, titoli al 31/12 dell'anno precedente." },
      { heading: "ISEE corrente", body: "Se la situazione economica è peggiorata rispetto all'anno di riferimento (es. perdita del lavoro), puoi richiedere l'**ISEE corrente** che considera gli ultimi 2 mesi di reddito. Utile per accedere prima alle agevolazioni in caso di eventi avversi recenti." },
    ],
    faqs: [
      { q: "Devo includere nella DSU i soldi sul conto corrente?", a: "Sì. Il saldo medio del conto corrente degli ultimi 12 mesi viene inserito nel patrimonio mobiliare. Vale anche per conti correnti di tutti i componenti del nucleo familiare." },
      { q: "Cosa succede se presento una DSU falsa?", a: "È reato (false dichiarazioni). L'INPS effettua controlli incrociati con l'AE. Le prestazioni percepite indebitamente vanno restituite con sanzioni." },
    ],
    legge: "D.P.C.M. 159/2013, D.Lgs. 147/2017",
    image: img("fisco", 3), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── MULTE extra ──────────────────────────────────────────────────────────
  {
    slug: "verbale-senza-firma",
    title: "Verbale senza firma: è valido?",
    category: "multe", categoryLabel: CAT.multe,
    tldr: "La mancata firma del verbale da parte dell'agente accertatore NON lo rende invalido. Ma alcune omissioni (dati dell'agente, data, luogo, norme violate) possono essere motivo di ricorso.",
    intro: "Molti credono che un verbale non firmato dall'agente sia automaticamente nullo. Non è così: la legge non richiede la firma a pena di nullità per la maggior parte delle sanzioni amministrative.",
    sections: [
      { heading: "Cosa dice il codice della strada", body: "Il D.Lgs. 285/1992 (Codice della Strada) e la L. 689/1981 prevedono che il verbale debba contenere: data, ora, luogo, la norma violata, la targa del veicolo e il soggetto accertatore. La firma non è espressamente richiesta a pena di nullità." },
      { heading: "Quando il verbale è impugnabile", body: "Motivi di ricorso fondati:\n• Mancanza della contestazione immediata senza motivazione (art. 200 CdS)\n• Verbale notificato oltre 90 giorni dall'accertamento (per violazioni senza contestazione immediata)\n• Descrizione della violazione errata o incompleta\n• Autovelox non omologato o non regolarmente verificato\n• Notifica a soggetto errato" },
      { heading: "Come ricorrere", body: "Due strade:\n1. **Prefetto** (gratuito, 60 giorni dalla notifica): organo amministrativo, decide in 120 giorni\n2. **Giudice di Pace** (a pagamento modesto, 30 giorni dalla notifica): più efficace per contestare i fatti\n\nSospendere il pagamento durante il ricorso è possibile chiedendo la sospensione dell'efficacia esecutiva." },
    ],
    faqs: [
      { q: "Posso contestare una multa pagata in misura ridotta?", a: "No. Il pagamento entro 5 giorni (riduzione del 30%) o entro 60 giorni equivale ad accettazione della sanzione. Dopo aver pagato non puoi più fare ricorso." },
      { q: "Come faccio a verificare se l'autovelox era omologato?", a: "Puoi fare accesso agli atti (L. 241/1990) presso il Comune/Ente che ha emesso la multa. Hai diritto a vedere il decreto di omologazione e il verbale di verifica periodica dello strumento." },
    ],
    legge: "D.Lgs. 285/1992 (CdS), L. 689/1981, D.Lgs. 150/2011",
    image: img("multe", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "riduzione-multa-velocita",
    title: "Multa per eccesso di velocità: riduzione del 30%",
    category: "multe", categoryLabel: CAT.multe,
    tldr: "Pagando entro 5 giorni dalla contestazione immediata (o dalla notifica per infrazioni a distanza), hai diritto a una riduzione del 30% sulla sanzione minima. Oltre i 60 giorni senza pagamento scatta la cartella esattoriale con interessi.",
    intro: "Le sanzioni per eccesso di velocità variano molto in base allo scarto rispetto al limite. Conoscere le fasce aiuta a capire quanto si rischia e come ridurre la sanzione.",
    sections: [
      { heading: "Le fasce di sanzione", body: "**Fino a 10 km/h oltre il limite:**\n€41 (minimo) – riduzione a €29 pagando entro 5 giorni\n\n**Da 10 a 40 km/h:**\n€173–€694 + 3 punti patente\n\n**Da 40 a 60 km/h:**\n€543–€2.170 + 6 punti + sospensione 1-3 mesi\n\n**Oltre 60 km/h:**\n€845–€3.382 + 10 punti + sospensione 6-12 mesi (revoca al secondo episodio in 2 anni)" },
      { heading: "Il pagamento ridotto", body: "Puoi pagare con riduzione del 30% solo per le multe contestate **immediatamente** (art. 202 CdS). Per quelle notificate a distanza (autovelox) la riduzione entro 5 giorni non si applica — il termine normale è 60 giorni." },
      { heading: "La decurtazione dei punti", body: "I punti vengono decurtati sempre, anche se paghi subito. Per recuperarli serve frequentare un corso di guida difensiva (1 punto/corso, max 6 punti/anno) o semplicemente non prendere infrazioni per 2 anni (recupero automatico di 2 punti/anno)." },
    ],
    faqs: [
      { q: "Il Tutor (sistema di velocità media) funziona diversamente?", a: "Sì. Il Tutor rileva la velocità media tra due punti. Se superi la velocità media, la multa è unica. Non ci sono problemi di doppia contestazione per lo stesso tratto." },
      { q: "Posso delegare qualcuno a pagare la multa per me?", a: "Sì, la multa può essere pagata da chiunque. Il fatto che l'abbia pagata un altro non riduce la tua responsabilità sulla decurtazione dei punti." },
    ],
    legge: "Artt. 142, 202 D.Lgs. 285/1992 (CdS)",
    image: img("multe", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "multa-parcheggio-invalidi",
    title: "Multa per sosta in posto riservato ai disabili: cosa sapere",
    category: "multe", categoryLabel: CAT.multe,
    tldr: "La multa per sosta abusiva in spazio riservato ai disabili è tra le più salate del CdS: da €168 a €672, con rimozione del veicolo. Non è riducibile del 30% ed è immediatamente esecutiva.",
    intro: "L'occupazione abusiva dei parcheggi riservati ai disabili è sanzionata severamente. Ecco cosa rischi e come evitare la multa.",
    sections: [
      { heading: "La sanzione prevista", body: "Art. 188 CdS: chiunque sosti negli spazi riservati ai disabili senza il contrassegno è soggetto a:\n• Sanzione da **€168 a €672**\n• Rimozione forzata del veicolo\n• Nessuna riduzione del 30% (sanzione non riducibile)" },
      { heading: "Il contrassegno invalidi: chi può usarlo", body: "Il contrassegno europeo per disabili (blu) autorizza la sosta nei posti riservati e anche in zona ZTL. È personale: vale solo se il titolare è a bordo o se il veicolo è usato per trasportarlo. Non si può prestare." },
      { heading: "Come contestare la multa", body: "La contestazione è possibile se:\n• Il segnale stradale era assente o non visibile\n• Il contrassegno era esposto ma non visibile per un vizio della segnaletica\n• Errore di identificazione del veicolo\n\nRicorso al Prefetto entro 60 giorni o al Giudice di Pace entro 30 giorni." },
    ],
    faqs: [
      { q: "Posso usare il contrassegno dei miei genitori disabili?", a: "Solo se stai trasportando il titolare del contrassegno. L'uso autonomo (senza il titolare a bordo) è illecito e può portare alla revoca del contrassegno." },
      { q: "La rimozione è sempre prevista?", a: "Sì, l'art. 188 CdS la prevede come obbligatoria. Le spese di rimozione e custodia sono a carico del trasgressore." },
    ],
    legge: "Art. 188 D.Lgs. 285/1992 (CdS), D.P.R. 503/1996",
    image: img("multe", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── EDILIZIA extra ────────────────────────────────────────────────────────
  {
    slug: "abuso-edilizio-sanatoria",
    title: "Abuso edilizio: sanatoria e condono 2026",
    category: "edilizia", categoryLabel: CAT.edilizia,
    tldr: "La sanatoria ordinaria (accertamento di conformità) è sempre possibile se l'opera è conforme alla normativa vigente. Il condono edilizio straordinario richiede legge specifica. Le opere in zone vincolate non sono sanabili.",
    intro: "Un abuso edilizio è qualsiasi opera realizzata senza il titolo abilitativo richiesto o in difformità. Esistono strumenti per regolarizzarla, ma con limiti precisi.",
    sections: [
      { heading: "Tipi di abuso edilizio", body: "• **Abuso formale:** opera realizzata senza permesso ma conforme alla normativa → sanabile\n• **Abuso sostanziale:** opera difforme dalla normativa urbanistica → non sanabile in via ordinaria\n• **Abuso in zona vincolata:** (paesaggio, costa, sismica) → generalmente non sanabile\n• **Variante in corso d'opera:** difformità parziale → sanabile con variante" },
      { heading: "L'accertamento di conformità", body: "Chi ha realizzato un abuso formale può presentare domanda di **accertamento di conformità** (art. 36 DPR 380/2001) al Comune. Il Comune verifica che l'opera sia conforme:\n• alla normativa urbanistica vigente\n• al PRG/Piano Regolatore\n\nSe conforme, viene rilasciato il titolo in sanatoria con pagamento di una doppia contribuzione." },
      { heading: "Conseguenze dell'abuso non sanato", body: "• **Ordine di demolizione** da parte del Comune\n• **Acquisizione gratuita** al patrimonio comunale se non si demolisce entro 90 giorni\n• **Sanzione penale** (art. 44 DPR 380/2001): fino a 2 anni di reclusione per abusi in zone vincolate\n• **Ipoteca** sull'immobile\n• **Impossibilità di vendere** (atto notarile nullo se non si dichiara la conformità urbanistica)" },
    ],
    faqs: [
      { q: "Posso vendere un immobile con un abuso edilizio?", a: "La vendita è possibile solo se l'abuso è sanabile e viene regolarizzato prima del rogito, oppure se viene indicato esplicitamente nell'atto. L'omissione rende l'atto nullo." },
      { q: "Cosa si intende per 'condono edilizio'?", a: "Il condono è una sanatoria straordinaria prevista da legge specifica che permette di regolarizzare abusi che normalmente non sarebbero sanabili. L'ultimo condono nazionale è del 2003 (L. 326/2003). Non ci sono condoni nazionali aperti nel 2026." },
    ],
    legge: "Artt. 36-44 D.P.R. 380/2001 (TUE), L. 326/2003",
    image: img("edilizia", 0), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "sfratto-come-difendersi",
    title: "Sfratto: tempi, procedure e come difendersi",
    category: "edilizia", categoryLabel: CAT.edilizia,
    tldr: "Lo sfratto richiede sempre un procedimento giudiziario. I tempi medi sono 12-24 mesi nelle grandi città. L'inquilino può opporsi entro la prima udienza. Categorie protette (anziani over 70, gravi patologie) hanno sospensione automatica.",
    intro: "Lo sfratto è il procedimento legale con cui il proprietario ottiene il rilascio dell'immobile. Non può mai essere eseguito senza sentenza o ordinanza del giudice.",
    sections: [
      { heading: "Le cause di sfratto", body: "• **Morosità:** mancato pagamento di almeno 1 mensilità (per contratti commerciali) o 2 mensilità (abitativi per molti CCNL)\n• **Scadenza del contratto** e diniego di rinnovo legittimo\n• **Gravi violazioni** del contratto (subconduzione non autorizzata, danni all'immobile)\n• **Uso diverso** da quello contrattuale" },
      { heading: "La procedura", body: "1. Intimazione di sfratto + citazione in udienza (atto notificato dall'ufficiale giudiziario)\n2. Prima udienza: il giudice può emettere ordinanza di rilascio (se l'inquilino non compare o non si oppone)\n3. Se opposizione: causa ordinaria (12-24 mesi)\n4. Esecuzione forzata dello sfratto con ufficiale giudiziario e forze dell'ordine" },
      { heading: "Come difendersi", body: "L'inquilino può:\n• **Opporsi** nella prima udienza (comparire e contestare i fatti)\n• **Pagare il morosità** prima dell'udienza (purga della mora: il giudice può concedere un termine)\n• **Chiedere la sospensione** se appartiene a categorie protette (over 70, gravi patologie)\n• Richiedere **proroga** al giudice per trovare soluzione abitativa alternativa" },
    ],
    faqs: [
      { q: "Il proprietario può cambiare la serratura senza sfratto?", a: "No. Lo sfratto di fatto (cambio serratura, interruzione utenze) è reato: violenza privata (art. 610 c.p.) e turbativa del possesso. Il proprietario deve sempre rivolgersi al giudice." },
      { q: "Ho diritto a un alloggio alternativo se vengo sfrattato?", a: "Non automaticamente. Puoi rivolgerti ai servizi sociali del Comune che possono inserire la famiglia in graduatoria per edilizia pubblica, ma i tempi sono lunghi." },
    ],
    legge: "Artt. 657-669 c.p.c., L. 431/1998, L. 9/2007 (sospensione sfratti)",
    image: img("edilizia", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── PRIVACY extra ────────────────────────────────────────────────────────
  {
    slug: "dati-personali-azienda",
    title: "Dati personali dei dipendenti: cosa può fare il datore di lavoro",
    category: "privacy", categoryLabel: CAT.privacy,
    tldr: "Il datore può trattare solo i dati strettamente necessari al rapporto di lavoro. Non può leggere le email private, installare keylogger o monitorare la navigazione senza informativa e accordo sindacale. La videosorveglianza richiede accordo sindacale o autorizzazione dell'INL.",
    intro: "Il GDPR e lo Statuto dei Lavoratori pongono limiti precisi a ciò che il datore di lavoro può fare con i dati dei dipendenti.",
    sections: [
      { heading: "Cosa può monitorare il datore", body: "Con le dovute garanzie (informativa + accordo sindacale/INL):\n• Videosorveglianza per sicurezza e tutela del patrimonio\n• Controllo degli accessi fisici\n• Monitoraggio dei dispositivi aziendali (non quelli privati)\n• Email aziendali (con policy aziendale chiara)" },
      { heading: "Cosa è vietato", body: "• Installare software di controllo nascosti (keylogger, screenshot automatici)\n• Leggere email personali del dipendente\n• Tracciare la posizione GPS senza informativa\n• Raccogliere dati biometrici senza specifico accordo\n• Richiedere informazioni su gravidanza, stato di salute, orientamento sessuale, religione nelle selezioni" },
      { heading: "L'informativa sul trattamento dei dati", body: "Il datore deve consegnare al dipendente (art. 13 GDPR) un'informativa che descriva:\n• Quali dati raccoglie\n• Per quali finalità\n• Per quanto tempo\n• Se li condivide con terzi\n• I diritti dell'interessato\n\nSenza informativa, il trattamento è illecito e il dipendente può presentare reclamo al Garante." },
    ],
    faqs: [
      { q: "Il datore può leggere le mie email aziendali?", a: "Può monitorare l'uso del sistema informatico aziendale se c'è una policy aziendale comunicata preventivamente. Dopo la cessazione del rapporto, l'accesso alle email del dipendente è fortemente limitato (Garante, provv. 2016)." },
      { q: "Come mi tutelo se sospetto di essere monitorato illegalmente?", a: "Presenta reclamo al Garante Privacy (garante.it — procedura online gratuita). Puoi anche citare il datore per danni in sede civile." },
    ],
    legge: "Reg. UE 2016/679 (GDPR), art. 4 L. 300/1970 (Statuto Lavoratori), D.Lgs. 196/2003",
    image: img("privacy", 1), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "cookie-gdpr-sito-web",
    title: "Cookie e GDPR: obblighi per chi gestisce un sito web",
    category: "privacy", categoryLabel: CAT.privacy,
    tldr: "Se il tuo sito usa cookie di profilazione (Google Analytics 4, Meta Pixel, remarketing), devi ottenere il consenso esplicito prima dell'installazione. Il banner deve avere un pulsante 'Rifiuta' ugualmente visibile al pulsante 'Accetta'.",
    intro: "Le Linee Guida del Garante Privacy (2021) e le sentenze europee hanno reso molto più rigidi i requisiti per i cookie banner. Ecco cosa devi fare se hai un sito.",
    sections: [
      { heading: "Cookie tecnici vs cookie di profilazione", body: "**Cookie tecnici:** necessari per il funzionamento del sito (sessione, carrello, login). Non richiedono consenso.\n\n**Cookie analitici:** misurano l'uso del sito (Google Analytics, Matomo). Richiedono consenso se il dato è inviato a terze parti con finalità pubblicitarie.\n\n**Cookie di profilazione:** profilazione per pubblicità mirata (Meta Pixel, Google Ads remarketing). Richiedono **sempre** consenso esplicito preventivo." },
      { heading: "Requisiti del cookie banner", body: "Il Garante (provvedimento 10/6/2021) richiede:\n• Rifiuto con un click (non nascosto in impostazioni)\n• Nessun cookie di profilazione prima del consenso (no dark pattern)\n• Possibilità di revocare il consenso facilmente\n• Cookie wall vietati (non si può bloccare l'accesso al sito in assenza di consenso)\n• Rinnovo del consenso ogni 6-12 mesi" },
      { heading: "Le sanzioni", body: "Il Garante può comminare sanzioni fino al 4% del fatturato globale annuo (GDPR) o fino a €20 milioni. Per i siti italiani di piccole dimensioni le sanzioni ordinatorie partono da €15.000-50.000. Le ispezioni avvengono su segnalazione o d'ufficio." },
    ],
    faqs: [
      { q: "Google Analytics è legale in Italia?", a: "Google Analytics 4 è nella zona grigia: l'AE ha sanzionato alcune aziende italiane per il trasferimento di dati negli USA senza adeguate garanzie. La soluzione più sicura è attivare l'anonimizzazione IP e configurare GA4 senza funzioni pubblicitarie, oppure usare una soluzione alternativa europea (Matomo self-hosted)." },
      { q: "Anche un piccolo blog ha questi obblighi?", a: "Sì, se raccoglie dati di utenti europei. La dimensione dell'operatore non riduce gli obblighi GDPR, ma il Garante tende a intervenire prima sui grandi siti." },
    ],
    legge: "Reg. UE 2016/679 (GDPR), D.Lgs. 196/2003, Provv. Garante 10/6/2021",
    image: img("privacy", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  // ── FAMIGLIA extra ────────────────────────────────────────────────────────
  {
    slug: "affido-condiviso-figli",
    title: "Affidamento condiviso dei figli: come funziona",
    category: "famiglia", categoryLabel: CAT.famiglia,
    tldr: "L'affido condiviso è la regola generale in Italia dal 2006: entrambi i genitori esercitano la responsabilità genitoriale. Il giudice dispone il collocamento prevalente presso uno dei genitori e stabilisce i tempi di visita dell'altro.",
    intro: "La L. 54/2006 ha introdotto l'affidamento condiviso come regola, non eccezione. Significa che entrambi i genitori partecipano alle decisioni importanti sulla vita dei figli.",
    sections: [
      { heading: "Affido condiviso vs esclusivo", body: "**Affido condiviso (regola):** Entrambi i genitori esercitano la responsabilità genitoriale per le decisioni importanti (scuola, salute, residenza). I figli vivono prevalentemente con un genitore ma frequentano regolarmente l'altro.\n\n**Affido esclusivo (eccezione):** Solo quando il giudice accerta che un genitore è inidoneo (es. violenza, abuso, dipendenze gravi, totale disinteresse)." },
      { heading: "Il collocamento prevalente", body: "Con l'affido condiviso, il giudice decide presso quale genitore il figlio abita prevalentemente. L'altro genitore ha diritto di visita regolamentato (es. fine settimana alternati, metà vacanze).\n\nIl collocamento può cambiare nel tempo su accordo dei genitori o su provvedimento del giudice." },
      { heading: "Il mantenimento dei figli", body: "Ciascun genitore provvede direttamente alle spese quando il figlio è con lui. In aggiunta, il genitore con minor reddito può ricevere un assegno di mantenimento dall'altro per le spese ordinarie.\n\nLe spese straordinarie (mediche, scolastiche, sport) si dividono al 50% salvo diverso accordo." },
    ],
    faqs: [
      { q: "Il figlio può scegliere con chi stare?", a: "I figli over 12 vengono sentiti dal giudice. La loro preferenza è tenuta in conto ma non è vincolante. Dai 16 anni in su il peso della preferenza aumenta significativamente." },
      { q: "Cosa fare se l'altro genitore non rispetta i tempi di visita?", a: "Puoi ricorrere al giudice per l'attuazione del provvedimento (art. 614-bis c.p.c.) e chiedere una sanzione pecuniaria per ogni violazione. In casi gravi, il comportamento ostruzionistico può portare alla modifica dell'affido." },
    ],
    legge: "L. 54/2006, artt. 337-ter c.c., D.Lgs. 154/2013",
    image: img("famiglia", 2), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "testamento-come-farlo",
    title: "Come fare un testamento valido in Italia",
    category: "famiglia", categoryLabel: CAT.famiglia,
    tldr: "Il testamento olografo deve essere scritto a mano, datato e firmato dal testatore — nessun computer o testimone. Il testamento pubblico si fa davanti al notaio con due testimoni. Entrambi sono validi.",
    intro: "Il testamento permette di decidere la destinazione del proprio patrimonio dopo la morte. In Italia esistono due forme principali: olografo (fai-da-te) e pubblico (dal notaio).",
    sections: [
      { heading: "Testamento olografo: come farlo", body: "Requisiti tassativi (art. 602 c.c.):\n1. **Scritto a mano** per intero dal testatore (vietato usare computer, stampante, registrazione)\n2. **Datato** (giorno, mese, anno — anche approssimativo)\n3. **Firmato** alla fine\n\nNon servono testimoni né il notaio. Può essere conservato dal testatore, depositato da un notaio o consegnato a persona di fiducia." },
      { heading: "I limiti della quota disponibile", body: "La legge italiana protegge gli **eredi legittimari** (coniuge, figli, genitori in assenza di figli) con una quota di eredità che non puoi toccare con il testamento:\n• 1 figlio: 1/2 dell'asse ereditario riservata\n• 2+ figli: 2/3 riservata\n• Solo coniuge: 1/2 riservata\n\nSe il testamento viola queste quote, gli eredi legittimari possono proporre **azione di riduzione** entro 10 anni dall'apertura della successione." },
      { heading: "Cosa mettere nel testamento", body: "• Chi riceve cosa (immobili, conti, oggetti specifici)\n• Esecutore testamentario (chi si occupa di dare esecuzione alle volontà)\n• Eventuali legati (donazioni specifiche a persone non eredi)\n• Disposizioni su funerali, organi\n• Riconoscimento di debiti o crediti" },
    ],
    faqs: [
      { q: "Posso modificare il testamento?", a: "Sì, in qualsiasi momento. Il testamento più recente revoca quello precedente. Puoi anche revocare solo alcune disposizioni con un nuovo testamento o atto notarile." },
      { q: "Cosa succede se muoio senza testamento?", a: "Si applica la successione legittima: l'eredità va a coniuge, figli, genitori secondo quote fissate dal codice civile (artt. 565-586 c.c.). I conviventi di fatto non ereditano (solo diritti limitati dopo L. 76/2016)." },
    ],
    legge: "Artt. 587-712 c.c. (successioni testamentarie)",
    image: img("famiglia", 3), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
  {
    slug: "convivenza-di-fatto-diritti",
    title: "Convivenza di fatto: diritti e tutele dal 2016",
    category: "famiglia", categoryLabel: CAT.famiglia,
    tldr: "La L. 76/2016 (Cirinnà) riconosce i conviventi di fatto iscritti all'anagrafe. Hanno diritto di visita in ospedale, successione nella locazione, e possono stipulare un contratto di convivenza con diritti patrimoniali. Non ereditano automaticamente.",
    intro: "La legge Cirinnà ha introdotto per la prima volta in Italia una regolamentazione organica della convivenza di fatto, riconoscendo diritti prima negati.",
    sections: [
      { heading: "Come si costituisce la convivenza registrata", body: "Non serve un atto formale: la convivenza di fatto si prova con la **dichiarazione anagrafica** (residenza comune). Basta che entrambi i conviventi abbiano la stessa residenza e dichiarino la convivenza all'anagrafe del Comune." },
      { heading: "I diritti riconosciuti", body: "• **Visita ospedaliera**: diritto di accesso nelle strutture sanitarie come familiare\n• **Successione nella locazione**: alla morte del convivente titolare del contratto\n• **Decisioni sanitarie**: può essere designato come rappresentante per decisioni in caso di incapacità\n• **Cura dei figli comuni**: stessa responsabilità genitoriale dei coniugi\n• **Eredità**: solo se espressamente previsto nel testamento (no successione legittima automatica)" },
      { heading: "Il contratto di convivenza", body: "I conviventi possono stipulare davanti a un notaio o avvocato un **contratto di convivenza** che regola:\n• Regime patrimoniale (comunione dei beni, separazione)\n• Contribuzione alle spese comuni\n• Utilizzo della casa comune\n\nIl contratto è registrato all'anagrafe e opponibile ai terzi." },
    ],
    faqs: [
      { q: "Se il mio convivente muore, ho diritto alla sua pensione?", a: "No. La pensione di reversibilità spetta solo al coniuge (anche separato) e ai figli. Il convivente di fatto non ha diritto alla reversibilità, indipendentemente dalla durata della convivenza." },
      { q: "Posso essere nominato beneficiario dell'assicurazione sulla vita del convivente?", a: "Sì. Il convivente può essere nominato beneficiario di polizze assicurative, fondi pensione e conto deposito. Questo è lo strumento principale per proteggerlo patrimonialmente." },
    ],
    legge: "L. 76/2016 (Cirinnà), art. 1 commi 36-67",
    image: img("famiglia", 4), datePublished: "2026-03-28", dateModified: "2026-03-28",
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getCategoryLabel(cat: ArticleCategory): string {
  return CAT[cat];
}

export function getArticlesByCategory(cat: ArticleCategory): Article[] {
  return ARTICLES.filter((a) => a.category === cat);
}

export const ALL_CATEGORIES = Object.entries(CAT) as [ArticleCategory, string][];
