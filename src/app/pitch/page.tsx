/**
 * /pitch — Vetrina per incubatori e investitori.
 *
 * Pagina statica (immagini + testo), brand cream/serif legal-warm coerente
 * con la homepage. Contiene: descrizione del progetto, come è stato costruito,
 * preview statica dell'agente e del marketplace lead (Tinder), unit economics,
 * il pitch (video + PDF), link GitHub e pulsante WhatsApp flottante.
 *
 * Server component puro (le immagini sono SVG statici in /public/pitch).
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { WhatsAppFab } from '@/components/WhatsAppFab';
import { BPGateForm } from '@/components/BPGateForm';

export const metadata: Metadata = {
  title: 'NormaAI · Pitch per incubatori',
  description:
    'NormaAI — assistenza legale AI gratuita per tutti + marketplace "Tinder dei legali". Pitch, video e materiali per incubatori e investitori.',
};

const GITHUB_URL = 'https://github.com/ServiziDigitali24SRL/sd24-normaai';
const PDF_URL = '/pitch/NormaAI-Pitch.pdf';

const serif = { fontFamily: 'var(--font-instrument-serif), Georgia, serif' } as const;
const mono = { fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' } as const;
const VERM = 'oklch(0.58 0.18 35)';

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[11px] uppercase tracking-[0.25em]" style={{ ...mono, color: VERM }}>
      {children}
    </p>
  );
}

export default function PitchPage() {
  return (
    <div className="bg-[#F6F2EA] text-[#13110F]" style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[#D8CFBC] bg-[#F6F2EA]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="/" className="text-[22px] leading-none" style={serif} aria-label="NormaAI homepage">
            <span style={{ color: VERM }}>§ </span>
            <span className="italic">NormaAI</span>
          </a>
          <nav className="flex items-center gap-6 text-[13px] text-[#756C5E]">
            <a href="/come_ho_costruito_norma" className="hover:text-[#13110F]">Diario di costruzione</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#13110F]">GitHub</a>
            <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="rounded px-4 py-1.5 text-[12px] uppercase tracking-[0.18em] text-[#FBF8F1]" style={{ ...mono, background: 'oklch(0.42 0.20 35)' }}>
              Pitch PDF
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16">
        <Label>NormaAI · pitch per incubatori · 2026</Label>
        <h1 className="text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.05] tracking-[-0.01em]" style={{ ...serif, fontWeight: 400 }}>
          La legge italiana,
          <br />
          <em className="italic" style={{ color: VERM }}>accessibile a tutti.</em>
        </h1>
        <p className="mt-10 max-w-3xl text-[18px] leading-relaxed text-[#756C5E]">
          Il primo assistente legale vocale AI d&apos;Italia, più un marketplace
          &ldquo;Tinder dei legali&rdquo;. Costruito su un corpus di
          <strong className="text-[#13110F]"> oltre 1 milione di documenti normativi</strong> (8,8M chunk).
          Gratis per chi chiede, redditizio per chi assiste.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="https://normaai.it" target="_blank" rel="noopener noreferrer" className="rounded px-6 py-3 text-[13px] font-semibold text-[#FBF8F1]" style={{ background: 'oklch(0.42 0.20 35)' }}>
            Prova su normaai.it →
          </a>
          <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="rounded border border-[#D8CFBC] px-6 py-3 text-[13px] font-semibold hover:border-[#756C5E]">
            Scarica il pitch (PDF)
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded border border-[#D8CFBC] px-6 py-3 text-[13px] font-semibold hover:border-[#756C5E]">
            Codice su GitHub
          </a>
          <a href="#business-plan" className="rounded border border-[#D8CFBC] px-6 py-3 text-[13px] font-semibold hover:border-[#756C5E]">
            Ricevi il Business Plan
          </a>
        </div>
      </section>

      {/* ── Il progetto ── */}
      <section className="border-t border-[#D8CFBC]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Il progetto</Label>
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>Il problema</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Ogni anno milioni di cittadini, imprenditori e turisti hanno un problema legale ma non sanno
                <strong> a chi rivolgersi</strong> né <strong>quanto costerà</strong>. Dall&apos;altro lato, gli
                avvocati — soprattutto i giovani e gli apprendisti — faticano a trovare clienti qualificati.
                Domanda e offerta non si incontrano.
              </p>
            </div>
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>La soluzione</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Una piattaforma <strong>a due lati</strong>. Per il cittadino: un agente vocale AI risponde gratis,
                citando la legge; quando serve un avvocato umano paga <strong>9 €</strong> per finalizzare. Per
                l&apos;avvocato: sfoglia i casi come su Tinder e <strong>compra il lead a 99 €</strong> — venduto
                fino a 4 volte. Il cittadino riceve fino a 4 pareri e sceglie il suo avvocato.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Come l'ho costruito ── */}
      <section className="border-t border-[#D8CFBC] bg-[#FBF8F1]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Come l&apos;ho costruito</Label>
          <h2 className="max-w-3xl text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>
            Pipeline dati su GPU, motore RAG ibrido, agente vocale e marketplace —
            costruiti da una persona sola, con l&apos;AI come moltiplicatore.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1.038.456', 'documenti normativi sorgente'],
              ['8.842.327', 'chunk indicizzati'],
              ['Ricerca ibrida', 'pgvector + full-text · doppio embedding (BGE-M3)'],
              ['Corpus-as-code', 'versioning temporale · risposte point-in-time'],
            ].map(([big, small]) => (
              <div key={big} className="rounded border border-[#D8CFBC] bg-[#FDFBF7] p-5">
                <p className="text-[1.4rem]" style={{ ...serif, color: VERM }}>{big}</p>
                <p className="mt-1 text-[12px] text-[#6B5F55]">{small}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-[#3D3530]">
            Stack: Next.js 16 · Supabase + pgvector · Claude Sonnet 4.6 · Voice AI (Vapi) · Stripe.{' '}
            <a href="/come_ho_costruito_norma" className="underline" style={{ color: VERM }}>
              Apri il diario di costruzione live →
            </a>
          </p>
        </div>
      </section>

      {/* ── Preview agente + video ── */}
      <section className="border-t border-[#D8CFBC]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>L&apos;agente in azione</Label>
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>Parla. Lei risponde con la legge in mano.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Sofia, l&apos;agente vocale, risponde in italiano a chiunque, gratis, e
                <strong> cita sempre il riferimento normativo</strong>. Niente invenzioni.
              </p>
              <img src="/pitch/agent-preview.svg" alt="Anteprima dell'agente vocale Sofia con risposta e fonte citata" className="mt-6 w-full rounded border border-[#D8CFBC]" />
            </div>
            <div>
              <p className="mb-3 text-[12px] uppercase tracking-[0.2em] text-[#6B5F55]" style={mono}>Clip · Sofia</p>
              <video controls playsInline poster="" preload="metadata" className="w-full rounded border border-[#D8CFBC]">
                <source src="/sofia-greeting.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marketplace Tinder ── */}
      <section className="border-t border-[#D8CFBC] bg-[#FBF8F1]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Marketplace · il Tinder dei legali</Label>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <img src="/pitch/lead-tinder.svg" alt="Card lead anonimizzata in stile Tinder con prezzo 91 euro" className="w-full rounded border border-[#D8CFBC]" />
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>I casi, come su Tinder.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Gli avvocati sfogliano i casi: leggono il <strong>PDF anonimizzato</strong> del problema (il cliente
                ha già pagato 9 €) e, quando uno interessa, <strong>comprano il lead a 99 €</strong>. Lo stesso caso
                viene venduto fino a 4 volte. Il cittadino confronta i pareri e sceglie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Flusso + economics ── */}
      <section className="border-t border-[#D8CFBC]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Come funziona · unit economics</Label>
          <img src="/pitch/flow-light.svg" alt="Diagramma del flusso a due lati e unit economics" className="w-full rounded border border-[#D8CFBC]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['9 €', 'finalizzazione cittadino'],
              ['4 × 99 €', 'acquisto lead avvocati'],
              ['fino a 405 €', 'ricavo per lead · costo di servizio ≈ 0'],
            ].map(([big, small]) => (
              <div key={big} className="rounded border border-[#D8CFBC] bg-[#FBF8F1] p-5">
                <p className="text-[1.5rem]" style={{ ...serif, color: VERM }}>{big}</p>
                <p className="mt-1 text-[12px] text-[#6B5F55]">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pitch: video + PDF ── */}
      <section className="border-t border-[#D8CFBC] bg-[#FBF8F1]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Il pitch</Label>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="flex aspect-video items-center justify-center rounded border border-dashed border-[#C4B9AC] bg-[#FDFBF7] text-center">
              <div>
                <p className="text-[2.5rem]" style={{ color: VERM }}>▶</p>
                <p className="mt-2 text-[13px] text-[#6B5F55]" style={mono}>VIDEO PITCH · 3 MIN · IN ARRIVO</p>
              </div>
            </div>
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>Tre minuti per capire NormaAI.</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Un video di tre minuti racconta il progetto end-to-end. Nel frattempo, tutto è già nel pitch in PDF.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="rounded px-6 py-3 text-[13px] font-semibold text-[#FBF8F1]" style={{ background: 'oklch(0.42 0.20 35)' }}>
                  Scarica il pitch (PDF)
                </a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded border border-[#D8CFBC] px-6 py-3 text-[13px] font-semibold hover:border-[#756C5E]">
                  Vedi il codice su GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Business Plan gated ── */}
      <section id="business-plan" className="scroll-mt-16 border-t border-[#D8CFBC]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Business Plan</Label>
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>
                Il Business Plan completo, su richiesta.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Mercato, modello, unit economics, go-to-market, proiezioni a 18 mesi, uso dei fondi e team.
                Lascia i tuoi dati e lo ricevi subito.
              </p>
              <ul className="mt-5 space-y-2 text-[14px] text-[#6B5F55]">
                <li>📈 Proiezioni: obiettivo 2M € di ricavi in 18 mesi</li>
                <li>💰 Round: 100k € — uso dei fondi dettagliato</li>
                <li>🛡️ Vantaggio difendibile, rischi e mitigazioni</li>
              </ul>
            </div>
            <BPGateForm />
          </div>
        </div>
      </section>

      {/* ── Team & Ask ── */}
      <section className="border-t border-[#D8CFBC]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Label>Team &amp; ask</Label>
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-[1.75rem] leading-tight" style={{ ...serif, fontWeight: 400 }}>Francesco Kei Tudini</h2>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#6B5F55]" style={mono}>Founder · Servizi Digitali 24</p>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3D3530]">
                Ha ideato, progettato e costruito da solo l&apos;intero prodotto — pipeline dati, motore RAG,
                agente vocale e marketplace — con l&apos;AI come moltiplicatore tecnico. MVP completo, online,
                pre-lancio.
              </p>
            </div>
            <div className="rounded border border-[#D8CFBC] bg-[#FBF8F1] p-6">
              <h3 className="text-[1.25rem]" style={{ ...serif, fontWeight: 400 }}>Cosa cerco</h3>
              <ul className="mt-3 space-y-2 text-[14px] text-[#3D3530]">
                <li>💸 Un investitore / partner finanziario.</li>
                <li>👥 Team: Business/Sales, Marketing, Legal/Compliance, Engineering.</li>
              </ul>
              <a href={`https://wa.me/393793594491?text=${encodeURIComponent('Ciao Francesco, ti scrivo per NormaAI')}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded px-6 py-3 text-[13px] font-semibold" style={{ background: '#25D366', color: '#0A2818' }}>
                Parliamone su WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}
