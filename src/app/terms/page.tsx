import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini di Servizio — NormaAI",
  description: "Termini e condizioni di utilizzo della piattaforma NormaAI",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        <Link href="/" className="text-[12px] text-[#555] hover:text-[#1a1a1a] transition-colors mb-8 inline-block">
          ← Torna a NormaAI
        </Link>

        <h1 className="font-serif text-[36px] tracking-[-1px] mb-2">Termini di Servizio</h1>
        <p className="text-[13px] text-[#555] mb-10">
          Condizioni generali di utilizzo della piattaforma NormaAI<br />
          NormaAI | normaai.it | Versione 1.0 — 10 maggio 2026
        </p>

        <Section title="1. Fornitore del servizio">
          <p>
            La piattaforma NormaAI (di seguito, &quot;il Servizio&quot;) è erogata da{" "}
            <strong>Servizi Digitali 24 S.R.L.</strong> (P.IVA / C.F. 18422681009), con sede legale in Roma, Italia.
            Contatti: <a href="mailto:legal@normaai.it" className="text-accent hover:underline">legal@normaai.it</a>.
            Rappresentante legale: Francesco Tudini Kei, Amministratore Unico.
          </p>
        </Section>

        <Section title="2. Oggetto e accettazione">
          <p>
            I presenti Termini disciplinano l&apos;accesso e l&apos;utilizzo di NormaAI, servizio software-as-a-service di
            assistenza giuridica basata su intelligenza artificiale, comprensivo di chat AI, agenti vocali, avatar
            conversazionali, API B2B e marketplace di professionisti.
          </p>
          <p>
            La registrazione e/o l&apos;utilizzo del Servizio implicano accettazione integrale e incondizionata dei presenti
            Termini. In caso di disaccordo, l&apos;utente è tenuto a non utilizzare il Servizio.
          </p>
        </Section>

        <Section title="3. Definizioni">
          <p>
            <strong>Utente:</strong> persona fisica o giuridica che accede al Servizio.<br />
            <strong>Professionista:</strong> Utente con qualifica legale verificata (avvocato, commercialista, consulente, ecc.).<br />
            <strong>Contenuti:</strong> testi, dati, file, query e output generati o caricati tramite il Servizio.<br />
            <strong>Output AI:</strong> risposte e contenuti prodotti dai modelli di intelligenza artificiale.
          </p>
        </Section>

        <Section title="4. Account e registrazione">
          <p>
            L&apos;utente è responsabile della veridicità dei dati forniti in fase di registrazione, della custodia delle
            credenziali di accesso e di ogni attività svolta tramite il proprio account. È vietato condividere
            l&apos;account con terzi o creare account multipli per eludere limiti di piano.
          </p>
        </Section>

        <Section title="5. Piani e pagamenti">
          <p>
            Il Servizio è offerto in piani gratuiti e a pagamento. I piani a pagamento sono fatturati su base
            mensile o annuale tramite Stripe. Il rinnovo è automatico salvo disdetta entro la fine del periodo in corso.
            I prezzi sono indicati al netto di IVA ove applicabile. Il diritto di recesso ai sensi del Codice del
            Consumo si applica nei limiti previsti dalla legge.
          </p>
        </Section>

        <Section title="6. Natura informativa degli output AI">
          <p>
            Gli output generati da NormaAI hanno <strong>finalità informativa e di supporto</strong> e <strong>non
            costituiscono consulenza legale, fiscale o professionale</strong>. Le risposte possono contenere errori,
            omissioni o riferimenti normativi non aggiornati. L&apos;Utente è tenuto a verificare ogni informazione
            con un professionista qualificato prima di assumere decisioni giuridicamente rilevanti.
          </p>
          <p>
            Il marketplace di NormaAI consente di entrare in contatto con Professionisti indipendenti: il rapporto
            professionale si instaura direttamente tra Utente e Professionista, e Servizi Digitali 24 S.R.L. non è parte
            di tale rapporto.
          </p>
        </Section>

        <Section title="7. Uso ammesso e divieti">
          <p>L&apos;Utente si impegna a non:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>utilizzare il Servizio per finalità illecite, fraudolente o lesive di diritti altrui;</li>
            <li>caricare contenuti diffamatori, contrari all&apos;ordine pubblico o al buon costume;</li>
            <li>tentare di aggirare le misure di sicurezza, effettuare reverse engineering o scraping massivo;</li>
            <li>rivendere, sublicenziare o ridistribuire il Servizio o i suoi output senza autorizzazione scritta;</li>
            <li>utilizzare gli output AI per addestrare modelli concorrenti.</li>
          </ul>
        </Section>

        <Section title="8. Proprietà intellettuale">
          <p>
            Software, marchi, design, contenuti editoriali e basi dati di NormaAI sono di proprietà di Servizi Digitali 24
            S.R.L. o dei rispettivi licenziatari. L&apos;Utente conserva la titolarità dei propri Contenuti e concede a
            NormaAI una licenza non esclusiva, gratuita e limitata al funzionamento del Servizio. Gli output AI possono
            essere utilizzati liberamente dall&apos;Utente nei limiti dei presenti Termini.
          </p>
        </Section>

        <Section title="9. Limitazione di responsabilità">
          <p>
            Nei limiti consentiti dalla legge, Servizi Digitali 24 S.R.L. non risponde di danni indiretti,
            consequenziali, perdite di profitto, di dati o di opportunità derivanti dall&apos;uso del Servizio.
            La responsabilità complessiva è in ogni caso limitata all&apos;importo effettivamente corrisposto
            dall&apos;Utente nei dodici mesi precedenti l&apos;evento.
          </p>
        </Section>

        <Section title="10. Sospensione e cessazione">
          <p>
            NormaAI può sospendere o chiudere account che violino i presenti Termini, previa comunicazione ove
            tecnicamente possibile. L&apos;Utente può recedere in qualsiasi momento dal proprio pannello.
            Alla cessazione, i dati sono conservati o cancellati secondo quanto previsto dall&apos;Informativa Privacy.
          </p>
        </Section>

        <Section title="11. Modifiche ai Termini">
          <p>
            NormaAI si riserva di modificare i presenti Termini per motivi tecnici, normativi o di evoluzione del
            Servizio. Le modifiche sostanziali sono comunicate via email o tramite la piattaforma con almeno 15 giorni
            di preavviso. La prosecuzione dell&apos;uso dopo l&apos;entrata in vigore costituisce accettazione.
          </p>
        </Section>

        <Section title="12. Legge applicabile e foro competente">
          <p>
            I presenti Termini sono regolati dalla legge italiana. Per ogni controversia è competente in via esclusiva
            il <strong>Foro di Roma</strong>, salvo il foro inderogabile del consumatore ai sensi del Codice del Consumo.
          </p>
        </Section>

        <Section title="13. Contatti">
          <p>
            Per qualsiasi richiesta relativa ai presenti Termini:{" "}
            <a href="mailto:legal@normaai.it" className="text-accent hover:underline">legal@normaai.it</a>.
            Per questioni privacy: <a href="/privacy" className="text-accent hover:underline">Informativa Privacy</a>.
          </p>
        </Section>
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
