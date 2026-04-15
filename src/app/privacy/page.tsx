import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — NormaAI",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        <Link href="/" className="text-[12px] text-[#555] hover:text-[#1a1a1a] transition-colors mb-8 inline-block">
          ← Torna a NormaAI
        </Link>

        <h1 className="font-serif text-[36px] tracking-[-1px] mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-[#555] mb-10">
          Informativa sul trattamento dei dati personali ai sensi degli artt. 13-14 Regolamento UE 2016/679 (GDPR)<br />
          NormaAI | normaai.it | Versione 1.0 — 28 marzo 2026
        </p>

        <Section title="1. Titolare del trattamento">
          <p>
            <strong>Servizi Digitali 24 S.R.L.</strong>, con sede legale in Italia, email:{" "}
            <a href="mailto:privacy@normaai.it" className="text-accent hover:underline">privacy@normaai.it</a>.
            Il titolare è Francesco Tudini Kei in qualità di Amministratore Unico.
          </p>
        </Section>

        <Section title="2. Categorie di dati trattati">
          <table className="w-full text-[12.5px] border-collapse mt-3">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Categoria</Th><Th>Dati specifici</Th><Th>Finalità</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Dati identificativi", "Nome, cognome, email", "Registrazione, gestione account"]} />
              <Tr cells={["Dati professionali", "Ordine, n. iscrizione, specializzazione", "Verifica qualifica, directory"]} />
              <Tr cells={["Dati di utilizzo", "Query, storico, IP, browser", "Erogazione servizio, sicurezza"]} />
              <Tr cells={["Dati di pagamento", "Token carta (Stripe)", "Gestione abbonamenti"]} />
              <Tr cells={["Dati lead", "Contatti, natura della richiesta", "Matchmaking professionale (con consenso)"]} />
              <Tr cells={["Cookie tecnici", "Sessione, preferenze, autenticazione", "Funzionamento del servizio"]} />
              <Tr cells={["Cookie analitici", "Dati aggregati navigazione", "Miglioramento UX (con consenso)"]} />
            </tbody>
          </table>
        </Section>

        <Section title="3. Basi giuridiche del trattamento">
          <table className="w-full text-[12.5px] border-collapse mt-3">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Finalità</Th><Th>Base giuridica</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Erogazione del servizio", "Art. 6(1)(b) — esecuzione contratto"]} />
              <Tr cells={["Fatturazione e obblighi fiscali", "Art. 6(1)(c) — obbligo legale"]} />
              <Tr cells={["Miglioramento AI (query anonimizzate)", "Art. 6(1)(f) — legittimo interesse"]} />
              <Tr cells={["Marketing via email", "Art. 6(1)(a) — consenso (opt-in)"]} />
              <Tr cells={["Cookie analitici", "Art. 6(1)(a) — consenso (cookie banner)"]} />
              <Tr cells={["Lead marketplace", "Art. 6(1)(a) — consenso esplicito"]} />
            </tbody>
          </table>
        </Section>

        <Section title="4. Trasferimenti verso terzi">
          <p className="mb-3">I dati sono condivisi con i seguenti responsabili del trattamento (art. 28 GDPR):</p>
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Fornitore</Th><Th>Servizio</Th><Th>Garanzie</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Anthropic, Inc.", "Modello AI Claude", "SCC (Standard Contractual Clauses)"]} />
              <Tr cells={["OpenAI, Inc.", "Embeddings", "SCC"]} />
              <Tr cells={["Supabase, Inc.", "Database PostgreSQL", "SCC + Data Residency EU"]} />
              <Tr cells={["Stripe, Inc.", "Pagamenti", "SCC"]} />
              <Tr cells={["Hetzner Online GmbH", "VPS server", "UE — GDPR applicabile"]} />
              <Tr cells={["Brevo SAS", "Email transazionali", "UE — GDPR applicabile"]} />
            </tbody>
          </table>
        </Section>

        <Section title="5. Training AI e utilizzo delle query">
          <p>
            Le query inviate a NormaAI vengono elaborate dal modello Claude (Anthropic, Inc.) esclusivamente per
            generare la risposta richiesta.
          </p>
          <p className="mt-2">
            <strong>Le query NON vengono utilizzate per addestrare o migliorare i modelli AI di Anthropic o di altri provider.</strong>
          </p>
          <p className="mt-2">
            Il trattamento avviene in conformità a:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-[13px] text-[#999]">
            <li>Standard Contractual Clauses (SCC) Anthropic — disponibili su richiesta</li>
            <li>Privacy Policy Anthropic: anthropic.com/legal/privacy</li>
            <li>Data Processing Agreement Anthropic (art. 28 GDPR)</li>
          </ul>
          <p className="mt-3 text-[12px] text-[#777]">
            Attenzione: si raccomanda di non inserire nelle query dati personali di terzi (nomi, indirizzi,
            numeri di telefono) o dati sensibili (salute, religione, opinioni politiche, condanne penali).
            Per opt-out ulteriori: <a href="mailto:privacy@normaai.it" className="text-accent hover:underline">privacy@normaai.it</a>
          </p>
        </Section>

        <Section title="6. Periodo di conservazione">
          <table className="w-full text-[12.5px] border-collapse mt-3">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Categoria dati</Th><Th>Periodo</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Dati account attivo", "Per tutta la durata del contratto"]} />
              <Tr cells={["Dati account cancellato", "12 mesi post-cancellazione"]} />
              <Tr cells={["Query e conversazioni", "12 mesi (poi anonimizzate)"]} />
              <Tr cells={["Dati fatturazione", "10 anni (obbligo legale art. 2220 c.c.)"]} />
              <Tr cells={["Log accessi e sicurezza", "12 mesi"]} />
              <Tr cells={["Cookie analitici", "13 mesi max"]} />
            </tbody>
          </table>
        </Section>

        <Section title="6. Diritti degli interessati">
          <p>Ai sensi degli artt. 15-22 GDPR, ogni interessato ha diritto di:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-[13px] text-[#999]">
            <li>Accedere ai propri dati personali (art. 15)</li>
            <li>Rettificare dati inesatti (art. 16)</li>
            <li>Cancellare i propri dati — &ldquo;diritto all&apos;oblio&rdquo; (art. 17)</li>
            <li>Limitare il trattamento (art. 18)</li>
            <li>Portabilità dei dati (art. 20)</li>
            <li>Opporsi al trattamento (art. 21)</li>
            <li>Non essere sottoposto a decisioni automatizzate (art. 22)</li>
          </ul>
          <p className="mt-3">
            Per esercitare i tuoi diritti: <a href="mailto:privacy@normaai.it" className="text-accent hover:underline">privacy@normaai.it</a>.
            Risposta entro 30 giorni. Hai il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali:{" "}
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">garanteprivacy.it</a>.
          </p>
        </Section>

        <Section title="7. Cookie">
          <p>
            Il sito utilizza cookie tecnici necessari al funzionamento (base giuridica: art. 6(1)(b) GDPR) e
            cookie analitici soggetti a consenso. Il banner cookie permette di accettare o rifiutare i cookie non essenziali.
          </p>
        </Section>

        <Section title="8. Sicurezza">
          <p>
            I dati sono protetti con cifratura TLS in transito e AES-256 a riposo. Accesso ai dati limitato
            al personale autorizzato. Autenticazione a due fattori sugli account amministrativi.
          </p>
        </Section>

        <Section title="9. Modifiche alla presente informativa">
          <p>
            Eventuali modifiche saranno comunicate via email agli utenti registrati con almeno 14 giorni di preavviso.
            La versione aggiornata sarà sempre disponibile su questa pagina.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-[#E5E1D8] text-[11px] text-[#444]">
          Servizi Digitali 24 S.R.L. · P.IVA / C.F. 18422681009 · Sede: Roma, Italia · <a href="mailto:privacy@normaai.it" className="hover:text-[#1a1a1a] transition-colors">privacy@normaai.it</a>
          {" · "}<Link href="/termini" className="hover:text-[#1a1a1a] transition-colors">Termini di Servizio</Link>
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
