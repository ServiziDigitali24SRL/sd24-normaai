import { generateParerePdf, type CopyVariant } from "../src/lib/pdf/generate-parere";
import fs from "node:fs";

// Sample data: stesso caso ma con tone diverso per AI summary in ognuna delle 5 varianti
const baseQuestion = "Mi hanno licenziato dopo 5 anni di lavoro come impiegato amministrativo. La motivazione è 'riorganizzazione aziendale' ma nello stesso ruolo hanno assunto un nuovo dipendente la settimana dopo. Posso impugnare il licenziamento? Quanto tempo ho?";

const variants: Record<CopyVariant, {
  premessa: string;
  aiSummary: string;
  conclusioni: string;
}> = {
  // V1 — Pro Veritate (tradizionale)
  1: {
    premessa: "Esaminata la fattispecie sottoposta dal richiedente, occorre vagliare la legittimità del licenziamento intimato per giustificato motivo oggettivo, alla luce della disciplina di cui alla L. 604/1966 e successive integrazioni, nonché degli orientamenti giurisprudenziali consolidati.",
    aiSummary: "Il giustificato motivo oggettivo, ai sensi dell'art. 3 della L. 604/1966, presuppone l'effettiva soppressione del posto di lavoro e l'impossibilità di repêchage del lavoratore. La nuova assunzione nel medesimo ruolo entro sei mesi dal recesso costituisce, secondo la consolidata giurisprudenza di legittimità (Cass. Civ. Sez. Lav. 17040/2024), grave indizio della pretestuosità del motivo addotto. Incombe sul datore di lavoro l'onere probatorio circa l'effettività della riorganizzazione e l'impossibilità di adibire il dipendente ad altre mansioni, anche inferiori. L'art. 6 della L. 604/1966 stabilisce il termine perentorio di sessanta giorni per l'impugnazione, decorrente dalla effettiva conoscenza del recesso.",
    conclusioni: "Si raccomanda l'impugnazione mediante raccomandata A/R o PEC entro il termine perentorio di sessanta giorni, con successivo deposito del ricorso giudiziale entro centottanta giorni. Documentazione probatoria essenziale: comparazione organigramma ante e post recesso, contratto del nuovo assunto.",
  },

  // V2 — Memorandum (diretto operativo)
  2: {
    premessa: "Lavoratore licenziato per riorganizzazione. Sostituito subito. Termine attivo.",
    aiSummary: "1. Termine impugnazione: 60 giorni (L. 604/1966 art. 6) — decorrenza: ricezione comunicazione.\n2. Termine deposito ricorso: 180 giorni (L. 92/2012 art. 1 c. 38).\n3. Onere prova datore: effettività riorganizzazione + impossibilità repêchage.\n4. Indizio pretestuosità: nuova assunzione stessa mansione entro 6 mesi (Cass. 17040/2024).\n5. Tutela: reintegro o indennità (art. 18 St. Lav. per assunti pre-2015 / D.Lgs. 23/2015 per post).",
    conclusioni: "Azione 1: raccomandata A/R o PEC entro 60 gg, oggetto 'impugnazione licenziamento'.\nAzione 2: deposito ricorso giudice del lavoro entro 180 gg.\nAzione 3: raccolta prove — contratto nuovo assunto, organigramma, mansionario.\nAzione 4: valutare contestuale denuncia ITL per pratiche elusive.",
  },

  // V3 — Spiega-Tutto (accessibile)
  3: {
    premessa: "Ti spiego in parole semplici come stanno le cose. Hai una situazione che la legge italiana protegge bene, ma c'è un orologio che corre — devi muoverti.",
    aiSummary: "Hai 60 giorni dal momento in cui ti hanno licenziato per dire ufficialmente che non sei d'accordo. Sessanta giorni, non un giorno di più. Devi farlo per iscritto — una raccomandata o una PEC. Se non lo fai entro questo tempo, perdi il diritto di contestare.\n\nPerché potresti vincere: in Italia, il datore di lavoro che dice 'non ti serve più, riorganizziamo' deve dimostrare due cose. Primo, che il tuo posto è davvero stato eliminato. Secondo, che non poteva metterti in un altro ruolo. Se subito dopo aver licenziato te assume un'altra persona per fare il tuo lavoro, è un grosso campanello d'allarme. La Cassazione lo ha detto chiaro nella sentenza 17040 del 2024.\n\nDopo i 60 giorni di raccomandata, hai altri 180 giorni per andare dal giudice del lavoro. Se vinci, puoi tornare al lavoro o farti pagare un'indennità.",
    conclusioni: "Cosa devi fare adesso, in ordine:\n• Manda subito una raccomandata o PEC al tuo ex datore (massimo 60 giorni dal licenziamento) dicendo che impugni il licenziamento.\n• Conserva la prova: ricevuta raccomandata, screenshot PEC.\n• Raccogli prove: nome del nuovo assunto, sua mansione, suo contratto se riesci.\n• Hai 180 giorni dopo per andare in tribunale.",
  },

  // V4 — Boutique (editoriale, equilibrato — attuale)
  4: {
    premessa: "La presente analisi prende in considerazione la disciplina italiana del licenziamento per giustificato motivo oggettivo, con particolare riferimento ai casi di soppressione del posto per riorganizzazione aziendale, nei quali la sostituzione del lavoratore in tempi ravvicinati pone profili di legittimità.",
    aiSummary: "Il licenziamento per giustificato motivo oggettivo richiede l'effettiva soppressione del posto e l'impossibilità di ricollocazione (cd. repêchage). L'art. 6 della L. 604/1966 fissa il termine perentorio di 60 giorni per l'impugnazione, decorrente dall'effettiva conoscenza del recesso. La nuova assunzione nel medesimo ruolo entro 6 mesi costituisce indizio grave di pretestuosità: la giurisprudenza Cass. Civ. 17040/2024 richiede che il datore provi l'effettività della riorganizzazione e l'impossibilità di adibire il dipendente ad altre mansioni. In caso di accoglimento, le tutele variano in base alla data di assunzione (art. 18 St. Lav. per pre-2015, D.Lgs. 23/2015 per post) e includono reintegro o indennità risarcitoria.",
    conclusioni: "Termine di 60 giorni per impugnare con raccomandata A/R o PEC. Successivi 180 giorni per il deposito del ricorso giudiziale. Documentare la nuova assunzione (data, mansione, contratto se accessibile) e l'organigramma post-riorganizzazione.",
  },

  // V5 — Conversazionale (caldo umano)
  5: {
    premessa: "Mario, abbiamo guardato il tuo caso con attenzione. Ti raccontiamo cosa abbiamo visto, partendo dal contesto: quando un'azienda dice 'ti licenzio per riorganizzazione' e poi assume qualcun altro nello stesso ruolo, qualcosa non torna. La legge italiana è dalla tua parte, ma c'è un tempo da rispettare.",
    aiSummary: "Ecco quello che pensiamo: il tuo licenziamento ha tutta l'aria di essere fragile dal punto di vista legale. Ti spieghiamo perché.\n\nIn Italia, quando un datore licenzia per 'riorganizzazione' deve provare due cose: che il tuo posto è davvero scomparso, e che non poteva metterti da nessun'altra parte. Se hai assistito a un'assunzione subito dopo, nello stesso ruolo, la legge guarda con sospetto al tuo licenziamento. La Cassazione (sentenza 17040 del 2024) lo dice chiaramente: la nuova assunzione entro pochi mesi è un grande campanello d'allarme.\n\nC'è però un tempo da rispettare: hai 60 giorni dal licenziamento per dire formalmente che non sei d'accordo. È il primo passo, fondamentale. Dopo quei 60 giorni, hai altri 180 giorni per andare davanti al giudice del lavoro. Se hai ragione, puoi tornare al tuo posto o ricevere un'indennità.",
    conclusioni: "Quello che ti consigliamo di fare nei prossimi giorni:\n• Manda una raccomandata A/R o PEC al tuo ex datore, dicendo chiaramente che impugni il licenziamento. Tieni la ricevuta — è la tua prova.\n• Raccogli quanto puoi sul nuovo assunto: nome, mansione, data di inizio. Anche solo via LinkedIn o tramite ex colleghi.\n• Tienici aggiornati. Se vuoi confrontarti con un avvocato vero, c'è il pulsante in basso a destra.",
  },
};

const variantNames: Record<CopyVariant, string> = {
  1: "v1-pro-veritate",
  2: "v2-memorandum",
  3: "v3-spiega-tutto",
  4: "v4-boutique",
  5: "v5-conversazionale",
};

const citations = [
  { title: "L. 604/1966", article: "art. 6", urn: "urn:nir:stato:legge:1966-07-15;604", excerpt: "Il licenziamento deve essere impugnato a pena di decadenza entro sessanta giorni dalla ricezione della sua comunicazione, con qualsiasi atto scritto idoneo a rendere nota la volontà del lavoratore..." },
  { title: "L. 92/2012 (Riforma Fornero)", article: "art. 1 c. 38", urn: "urn:nir:stato:legge:2012-06-28;92", excerpt: "L'impugnazione è inefficace se non è seguita, entro il successivo termine di centottanta giorni, dal deposito del ricorso..." },
  { title: "Cass. Civ. Sez. Lav. 17040/2024", article: null, urn: "urn:cass:civ:lav:17040:2024", excerpt: "Il termine di 60 giorni per l'impugnazione del licenziamento decorre dalla effettiva conoscenza dello stesso da parte del lavoratore." },
];

const outputDir = "/Users/user/Documents/PROGETTI/NORMAAI/PARERE-VARIANTS-PREVIEW";
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  for (const v of [1, 2, 3, 4, 5] as CopyVariant[]) {
    const data = variants[v];
    const buf = await generateParerePdf({
      conversationId: "abc12345-test-1234-5678-9abcdef01234",
      pareredNumber: `2026-${String(40 + v).padStart(5, "0")}`,
      userName: "Mario Rossi",
      userCity: "Roma",
      userQuestion: baseQuestion,
      premessa: data.premessa,
      aiSummary: data.aiSummary,
      conclusioni: data.conclusioni,
      citations,
      vertical: "lavoro",
      generatedAt: new Date(),
      variant: v,
    });
    const path = `${outputDir}/parere-${variantNames[v]}.pdf`;
    fs.writeFileSync(path, buf);
    console.log(`✅ V${v} (${variantNames[v]}): ${(buf.length/1024).toFixed(1)} KB → ${path}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
