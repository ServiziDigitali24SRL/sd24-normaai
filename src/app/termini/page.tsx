import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini e Condizioni — NormaAI",
  description: "Termini e condizioni d'uso della piattaforma NormaAI",
};

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        <Link href="/" className="text-[12px] text-[#555] hover:text-[#1a1a1a] transition-colors mb-8 inline-block">
          ← Torna a NormaAI
        </Link>

        <h1 className="font-serif text-[36px] tracking-[-1px] mb-2">Termini e Condizioni d&apos;Uso</h1>
        <p className="text-[13px] text-[#555] mb-10">
          NormaAI | normaai.it | Versione 1.0 — 28 marzo 2026
        </p>

        <Section title="Art. 1 — Definizioni">
          <table className="w-full text-[12.5px] border-collapse mt-2">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Termine</Th><Th>Definizione</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={['"Servizio"', 'La piattaforma NormaAI accessibile su normaai.it e tramite API']} />
              <Tr cells={['"Società"', 'Servizi Digitali 24 S.R.L.']} />
              <Tr cells={['"Utente"', 'Qualsiasi persona fisica o giuridica che accede al Servizio']} />
              <Tr cells={['"Professionista"', 'Utente con piano a pagamento che riceve lead e appare nella directory']} />
              <Tr cells={['"Lead"', 'Richiesta di contatto generata da un Utente e venduta a un Professionista']} />
              <Tr cells={['"Output AI"', 'Qualsiasi testo o informazione generata dal sistema AI del Servizio']} />
            </tbody>
          </table>
        </Section>

        <Section title="Art. 2 — Accettazione e ambito">
          <p>
            L&apos;accesso e l&apos;utilizzo del Servizio implicano la piena accettazione dei presenti Termini e della Privacy Policy.
            I presenti T&C si applicano a tutti i piani di accesso: gratuito (Privato), in abbonamento
            (Professionista, Impresa) e tramite API (Developer).
          </p>
        </Section>

        <Section title="Art. 3 — Natura del servizio e limitazioni">
          <p className="mb-2">
            <strong className="text-[#1a1a1a]">3.1 Servizio informativo.</strong> NormaAI fornisce esclusivamente informazioni di carattere
            generale su normativa italiana. Il Servizio <strong>NON costituisce consulenza professionale</strong> di alcun tipo.
          </p>
          <p>
            <strong className="text-[#1a1a1a]">3.2 Rischio AI.</strong> L&apos;utente riconosce che il sistema AI può generare risposte
            imprecise, incomplete o non aggiornate (&ldquo;allucinazioni&rdquo;). Il corpus normativo è aggiornato periodicamente
            ma non garantisce copertura in tempo reale. Il Servizio è classificato come sistema AI a rischio limitato
            ai sensi del Regolamento UE 2024/1689 (AI Act).
          </p>
        </Section>

        <Section title="Art. 4 — Piani di accesso e pagamento">
          <table className="w-full text-[12.5px] border-collapse mt-2">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Piano</Th><Th>Costo</Th><Th>Funzionalità</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Cittadino", "€9/mese", "Tasse, bollette, contratti personali, accesso guidato"]} />
              <Tr cells={["Impresa", "€29/mese", "Query compliance illimitate + referral + 5 verticali"]} />
              <Tr cells={["Professionista", "€29/mese + wallet lead", "Query illimitate + profilo directory + acquisto lead (€75/€150)"]} />
              <Tr cells={["Developer Free", "Gratuito", "100 query/mese via API"]} />
              <Tr cells={["Developer", "€49/mese", "5.000 query/mese via API"]} />
            </tbody>
          </table>
          <p className="mt-3">
            I prezzi si intendono IVA esclusa. I pagamenti sono gestiti tramite Stripe. L&apos;abbonamento si rinnova
            automaticamente salvo disdetta comunicata almeno 24 ore prima del rinnovo. Il rimborso è previsto
            entro 14 giorni dall&apos;acquisto (diritto di recesso ex D.Lgs. 206/2005 art. 52).
          </p>
        </Section>

        <Section title="Art. 5 — Lead marketplace">
          <p className="mb-2">
            <strong className="text-[#1a1a1a]">5.1 Generazione lead.</strong> Quando un Utente formula una query classificata come
            &ldquo;complessa&rdquo; dal sistema AI, NormaAI propone il contatto con un Professionista. Il consenso dell&apos;utente
            è richiesto prima della generazione del Lead.
          </p>
          <p className="mb-2">
            <strong className="text-[#1a1a1a]">5.2 Acquisto lead.</strong> I Professionisti abbonati possono acquistare Lead al prezzo
            di €75 (lead da privato) o €150 (lead da impresa), scalati dal wallet prepagato. L&apos;acquisto è definitivo e i crediti non scadono.
          </p>
          <p>
            <strong className="text-[#1a1a1a]">5.3 Divieto di aggiramento.</strong> È vietato accordarsi al di fuori della piattaforma
            nei 12 mesi successivi al primo contatto. In caso di violazione, la Società si riserva di fatturare
            una penale pari a 10 volte il valore del Lead originale.
          </p>
        </Section>

        <Section title="Art. 6 — Uso accettabile">
          <p>È vietato utilizzare il Servizio per:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-[#999]">
            <li>Formulare query contenenti dati personali di terzi senza consenso</li>
            <li>Tentare di estrarre o replicare il corpus normativo tramite scraping automatico</li>
            <li>Costruire prodotti concorrenti a NormaAI senza preventiva autorizzazione scritta</li>
            <li>Fornire informazioni false in sede di registrazione o profilo professionale</li>
            <li>Presentare gli Output AI come pareri professionali propri</li>
            <li>Aggirare sistemi di rate limiting o autenticazione</li>
          </ul>
        </Section>

        <Section title="Art. 7 — Responsabilità e limitazioni">
          <p className="mb-2">
            La Società non è responsabile per: (a) decisioni prese dagli Utenti basandosi sugli Output AI;
            (b) errori, omissioni o imprecisioni degli Output AI; (c) interruzioni del Servizio.
          </p>
          <p>
            La responsabilità massima aggregata della Società verso un singolo Utente è limitata all&apos;importo
            pagato nei 3 mesi precedenti l&apos;evento che ha generato il danno.
          </p>
        </Section>

        <Section title="Art. 8 — Proprietà intellettuale">
          <p>
            Il Corpus RAG è composto da documenti normativi di pubblico dominio. Gli Output AI sono di proprietà
            dell&apos;Utente che ha effettuato la query, con licenza d&apos;uso non esclusiva per uso personale o professionale.
            È vietata la redistribuzione commerciale degli Output AI senza autorizzazione scritta.
          </p>
        </Section>

        <Section title="Art. 9 — Legge applicabile e foro competente">
          <p>
            I presenti T&C sono regolati dalla legge italiana. Per le controversie con consumatori si applica
            il D.Lgs. 206/2005 (Codice del Consumo). Il foro competente è quello di residenza del consumatore.
            Per le controversie B2B, il foro esclusivamente competente è quello di Milano.
          </p>
        </Section>

        <Section title="Art. 10 — Modifiche ai termini">
          <p>
            La Società si riserva di modificare i presenti T&C con preavviso di 30 giorni via email.
            L&apos;uso continuato del Servizio dopo tale periodo implica l&apos;accettazione delle modifiche.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-[#E5E1D8] text-[11px] text-[#444]">
          Servizi Digitali 24 S.R.L. · <a href="mailto:legal@normaai.it" className="hover:text-[#1a1a1a] transition-colors">legal@normaai.it</a>
          {" · "}<Link href="/privacy" className="hover:text-[#1a1a1a] transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[16px] font-medium text-[#1a1a1a] mb-3 pb-2 border-b border-[#E5E1D8]">{title}</h2>
      <div className="text-[13px] text-[#999] leading-[1.7] space-y-2">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left py-2 pr-4 text-[#666] font-medium">{children}</th>;
}

function Tr({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-[#E5E1D8]">
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-4 text-[#888]">{c}</td>
      ))}
    </tr>
  );
}
