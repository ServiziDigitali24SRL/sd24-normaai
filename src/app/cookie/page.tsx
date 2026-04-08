import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — NormaAI",
  description: "Informativa sull'utilizzo di cookie e tecnologie di tracciamento su NormaAI",
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-cream">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        <Link href="/" className="text-[12px] text-[#555] hover:text-cream transition-colors mb-8 inline-block">
          ← Torna a NormaAI
        </Link>

        <h1 className="font-serif text-[36px] tracking-[-1px] mb-2">Cookie Policy</h1>
        <p className="text-[13px] text-[#555] mb-10">
          NormaAI · normaai.it · Versione 1.0 — 8 aprile 2026
          <br />
          Titolare: Servizi Digitali 24 S.R.L. · <a href="mailto:privacy@normaai.it" className="text-accent hover:underline">privacy@normaai.it</a>
        </p>

        <Section title="1. Cosa sono i cookie">
          <p>
            I cookie sono piccoli file di testo memorizzati dal browser sul dispositivo dell&apos;utente quando visita un sito web.
            Permettono al sito di ricordare le preferenze e migliorare l&apos;esperienza di navigazione.
          </p>
          <p className="mt-2">NormaAI utilizza tre categorie di cookie:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Tecnici</strong> — necessari al funzionamento (autenticazione, sessione, sicurezza). Non richiedono consenso.</li>
            <li><strong>Analitici</strong> — miglioramento UX tramite analisi comportamento. Richiedono consenso.</li>
            <li><strong>Marketing</strong> — pubblicità personalizzata. Al momento NON utilizzati da NormaAI.</li>
          </ul>
        </Section>

        <Section title="2. Cookie Tecnici (Essenziali — art. 6(1)(b) GDPR)">
          <p className="mb-3">
            Questi cookie sono <strong>necessari</strong> al funzionamento del servizio e <strong>non richiedono consenso</strong>.
            Non è possibile disattivarli senza compromettere il funzionamento del sito.
          </p>
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Cookie</Th><Th>Durata</Th><Th>Finalità</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["supabase-auth-token", "1 anno", "Autenticazione utente (Supabase)"]} />
              <Tr cells={["cookie-consent", "365 giorni", "Salva le preferenze cookie dell'utente"]} />
              <Tr cells={["theme-preference", "1 anno", "Modalità scuro/chiaro"]} />
              <Tr cells={["__Host-next-auth.csrf-token", "Sessione", "Protezione CSRF (Next.js)"]} />
            </tbody>
          </table>
        </Section>

        <Section title="3. Cookie Analitici (art. 6(1)(a) GDPR — consenso)">
          <p className="mb-3">
            Con il tuo consenso esplicito, utilizziamo cookie per analizzare il comportamento degli utenti
            e migliorare le prestazioni dell&apos;app. I dati sono anonimi e non vengono condivisi con terze parti.
          </p>
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#222]">
                <Th>Provider</Th><Th>Durata</Th><Th>Scopo</Th><Th>Server</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={["Vercel Analytics", "Max 13 mesi", "Insights prestazioni, pagine visitate", "EU (Hetzner Frankfurt)"]} />
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-[#666]">
            Nessun dato personale identificativo viene condiviso con Vercel per fini analitici.
            I dati rimangono all&apos;interno dell&apos;Unione Europea.
          </p>
        </Section>

        <Section title="4. Cookie Marketing">
          <p>
            NormaAI <strong>non utilizza</strong> attualmente cookie di marketing o pubblicità profilata.
            Qualora in futuro venissero introdotti, l&apos;utente verrà informato e sarà richiesto consenso esplicito
            tramite il banner cookie.
          </p>
        </Section>

        <Section title="5. Gestire il Consenso">
          <p className="mb-2">
            Puoi modificare le tue preferenze cookie in qualsiasi momento tramite il banner in basso alla pagina
            (cancella il cookie <code className="text-[11px] bg-[#1a1a1a] px-1 rounded">cookie-consent</code> dal browser per riaprirlo).
          </p>
          <p className="mb-2">Puoi anche gestire i cookie dal menu del tuo browser:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
            <li><strong>Firefox:</strong> Preferenze → Privacy e sicurezza → Cookie e dati dei siti</li>
            <li><strong>Safari:</strong> Preferenze → Privacy → Gestisci dati siti web</li>
            <li><strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni del sito → Cookie e dati del sito</li>
          </ul>
        </Section>

        <Section title="6. Durata e Conservazione">
          <p>
            I cookie analitici vengono conservati per un massimo di <strong>13 mesi</strong> dalla data di raccolta,
            in conformità alle Linee Guida del Garante per la Protezione dei Dati Personali (Provvedimento 8 maggio 2014).
            I cookie tecnici di sessione vengono eliminati alla chiusura del browser.
          </p>
        </Section>

        <Section title="7. Contatti e Reclami">
          <p>
            Per domande sui cookie o per esercitare i tuoi diritti GDPR (art. 15-22):<br />
            <a href="mailto:privacy@normaai.it" className="text-accent hover:underline">privacy@normaai.it</a>
            {" "}— risposta entro 30 giorni (art. 12(3) GDPR)
          </p>
          <p className="mt-2">
            Hai il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali:{" "}
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              garanteprivacy.it
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-[#1a1a1a] text-[11px] text-[#444] flex gap-4 flex-wrap">
          <span>Servizi Digitali 24 S.R.L.</span>
          <Link href="/privacy" className="hover:text-cream transition-colors">Privacy Policy</Link>
          <Link href="/termini" className="hover:text-cream transition-colors">Termini di Servizio</Link>
          <Link href="/" className="hover:text-cream transition-colors">NormaAI</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[16px] font-medium text-cream mb-3 pb-2 border-b border-[#1a1a1a]">{title}</h2>
      <div className="text-[13px] text-[#999] leading-[1.7] space-y-2">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left py-2 pr-4 text-[#666] font-medium">{children}</th>;
}

function Tr({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-[#1a1a1a]">
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-4 text-[#888]">{c}</td>
      ))}
    </tr>
  );
}
