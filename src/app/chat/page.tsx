"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, NormaIcon, NormaBadge, SectionLabel, Stamp } from "@/components/ui/NormaUI";

// ── NavItem ───────────────────────────────────────────────────────────────────
const NavItem = ({ icon, label, active, badge, onClick }: {
  icon: string; label: string; active?: boolean; badge?: string; onClick?: () => void;
}) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', padding: '9px 12px',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--ink-2)',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    fontSize: 13.5, fontWeight: active ? 500 : 400,
    textAlign: 'left', fontFamily: 'var(--sans)',
    transition: 'all 0.15s ease'
  }}
  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.7 }}>
      <NormaIcon name={icon} size={15} />
    </span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && (
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 6px', borderRadius: 3,
        background: active ? 'var(--paper-3)' : 'var(--vermiglio-soft)',
        color: active ? 'var(--ink)' : 'var(--vermiglio-ink)', fontWeight: 500
      }}>{badge}</span>
    )}
  </button>
);

// ── CitationCard ──────────────────────────────────────────────────────────────
const CitationCard = ({ code, title, snippet }: { code: string; title: string; snippet: string }) => (
  <div style={{
    border: '1px solid var(--paper-line)', borderLeft: '3px solid var(--vermiglio)',
    background: 'var(--paper-tint)', borderRadius: 4, padding: '10px 14px',
    marginTop: 10, display: 'flex', gap: 14, alignItems: 'flex-start'
  }}>
    <span className="mono" style={{ fontSize: 11, color: 'var(--vermiglio-ink)', whiteSpace: 'nowrap', fontWeight: 500, paddingTop: 2 }}>{code}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, fontFamily: 'var(--serif)', fontStyle: 'italic', lineHeight: 1.5 }}>
        «&nbsp;{snippet}&nbsp;»
      </div>
    </div>
    <button style={{
      background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 3,
      padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--ink-3)',
      fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0
    }}>Apri</button>
  </div>
);

// ── ChatMessage ───────────────────────────────────────────────────────────────
const ChatMessage = ({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) => {
  if (role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
      <div style={{
        maxWidth: '72%', background: 'var(--ink)', color: 'var(--paper)',
        padding: '12px 16px', borderRadius: 10, fontSize: 14.5, lineHeight: 1.55
      }}>{children}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
      <div style={{
        width: 32, height: 32, flexShrink: 0, borderRadius: '50%',
        background: 'var(--paper-2)', border: '1px solid var(--paper-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--vermiglio)'
      }}>§</div>
      <div style={{ flex: 1, paddingTop: 4 }}>{children}</div>
    </div>
  );
};

// ── ChatSidebar ───────────────────────────────────────────────────────────────
const ChatSidebar = ({ onNav }: { onNav?: (key: string) => void }) => (
  <aside style={{
    width: 260, flexShrink: 0, background: 'var(--paper-tint)',
    borderRight: '1px solid var(--paper-line)',
    display: 'flex', flexDirection: 'column', height: '100%'
  }}>
    <div style={{ padding: '20px 20px 14px' }}><Logo /></div>
    <div style={{ padding: '0 14px' }}>
      <button onClick={() => onNav?.('new')} style={{
        width: '100%', padding: '10px 12px', background: 'var(--ink)', color: 'var(--paper)',
        border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)'
      }}>
        <NormaIcon name="plus" size={14} /> Nuova consultazione
      </button>
    </div>

    <div style={{ padding: '18px 14px 8px' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', paddingLeft: 12, marginBottom: 6 }}>Area personale</div>
      <NavItem icon="chat"    label="Chat legale"         active  onClick={() => onNav?.('chat')} />
      <NavItem icon="archive" label="Archivio documenti"  badge="12" onClick={() => onNav?.('archivio')} />
      <NavItem icon="doc"     label="Analisi PDF"                  onClick={() => onNav?.('pdf')} />
      <NavItem icon="clock"   label="Scadenze"            badge="3"  onClick={() => onNav?.('scadenze')} />
      <NavItem icon="users"   label="Trova professionista"         onClick={() => onNav?.('prof')} />
    </div>

    <div style={{ padding: '8px 14px' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', paddingLeft: 12, marginBottom: 6 }}>Conversazioni recenti</div>
      {[
        { t: 'Contratto locazione — cedolare secca', d: '2h fa' },
        { t: 'Licenziamento giusta causa', d: 'Ieri' },
        { t: 'TFR e trattamento di fine rapporto', d: '3 giorni' },
        { t: 'Art. 2043 c.c. responsabilità', d: '1 sett.' },
      ].map((c, i) => (
        <button key={i} style={{
          display: 'block', width: '100%', textAlign: 'left',
          padding: '8px 12px', background: 'transparent', border: 'none',
          borderRadius: 6, cursor: 'pointer'
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.t}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{c.d}</div>
        </button>
      ))}
    </div>

    <div style={{ flex: 1 }} />

    <div style={{ margin: 14, padding: 16, border: '1px solid var(--paper-line)', borderRadius: 8, background: 'white' }}>
      <Stamp>Piano Gratuito</Stamp>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '10px 0 12px', lineHeight: 1.45 }}>
        3 di 10 consultazioni mensili utilizzate
      </div>
      <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ width: '30%', height: '100%', background: 'var(--vermiglio)' }} />
      </div>
      <button onClick={() => onNav?.('upgrade')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        Passa a PRO <NormaIcon name="arrow" size={12} />
      </button>
    </div>

    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500 }}>MR</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Marco Rossi</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>CITTADINO</div>
      </div>
      <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-4)' }}>
        <NormaIcon name="settings" size={16} />
      </button>
    </div>
  </aside>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const handleNav = (key: string) => {
    if (key === 'upgrade') router.push('/onboarding');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--paper)' }}>
      <ChatSidebar onNav={handleNav} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid var(--paper-line)', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Consultazione · Diritto Civile</div>
            <div className="serif" style={{ fontSize: 20, marginTop: 2 }}>Contratto di locazione — cedolare secca</div>
          </div>
          <NormaBadge tone="ok"><NormaIcon name="check" size={11} /> Fonti verificate</NormaBadge>
          <button className="btn btn-ghost"><NormaIcon name="download" size={14} /> Esporta</button>
          <button className="btn btn-ghost"><NormaIcon name="paperclip" size={14} /> Allega</button>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '36px 48px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>

            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-5)', textTransform: 'uppercase' }}>
                — · — · — &nbsp; 20 aprile 2026, 14:32 &nbsp; — · — · —
              </div>
            </div>

            <ChatMessage role="user">
              Sto per affittare un appartamento a Milano. Il proprietario mi propone un contratto 4+4 con cedolare secca al 21%. Mi conviene rispetto al regime ordinario? Cosa rischio se l&apos;inquilino non paga?
            </ChatMessage>

            <ChatMessage role="assistant">
              <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
                <p style={{ margin: '0 0 14px' }}>
                  La <strong>cedolare secca al 21%</strong> è generalmente conveniente per un contratto 4+4 a uso abitativo, ma dipende dalla Sua aliquota IRPEF marginale. Vediamo i due scenari.
                </p>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '18px 0',
                  background: 'var(--paper-tint)', border: '1px solid var(--paper-line)',
                  borderRadius: 6, padding: 14
                }}>
                  <div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Cedolare secca</div>
                    <div className="serif" style={{ fontSize: 26, marginTop: 2 }}>21<span style={{ fontSize: 16 }}>%</span></div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Fissa, su canone lordo</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--paper-line)', paddingLeft: 14 }}>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>IRPEF ordinario</div>
                    <div className="serif" style={{ fontSize: 26, marginTop: 2 }}>23–43<span style={{ fontSize: 16 }}>%</span></div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Su 95% canone + addizionali</div>
                  </div>
                </div>

                <p style={{ margin: '14px 0' }}>
                  <strong>Sulla morosità</strong>, il regime di cedolare secca le impone di <em>rinunciare all&apos;aggiornamento ISTAT</em> del canone per tutta la durata (art. 3, co. 11, D.Lgs. 23/2011). In caso di mancato pagamento:
                </p>

                <ol style={{ margin: '0 0 14px 0', paddingLeft: 20, color: 'var(--ink-2)' }}>
                  <li style={{ margin: '6px 0' }}>Dopo <strong>20 giorni</strong> dalla scadenza, può avviare intimazione di sfratto per morosità</li>
                  <li style={{ margin: '6px 0' }}>La Legge 392/1978 consente la risoluzione dopo <strong>2 canoni non pagati</strong></li>
                  <li style={{ margin: '6px 0' }}>Il giudice può concedere un <em>termine di grazia</em> fino a 90 giorni</li>
                </ol>

                <SectionLabel>Riferimenti normativi</SectionLabel>

                <CitationCard
                  code="D.Lgs. 23/2011 · art. 3"
                  title="Cedolare secca sugli affitti"
                  snippet="Il canone di locazione relativo ai contratti aventi ad oggetto immobili ad uso abitativo…"
                />
                <CitationCard
                  code="L. 431/1998 · art. 2"
                  title="Contratti di locazione 4+4"
                  snippet="Le parti possono stipulare contratti di locazione di durata non inferiore a quattro anni…"
                />
                <CitationCard
                  code="L. 392/1978 · art. 5"
                  title="Inadempimento del conduttore"
                  snippet="Il mancato pagamento del canone decorsi venti giorni dalla scadenza costituisce motivo di risoluzione…"
                />

                <div style={{ marginTop: 24, padding: 14, border: '1px solid rgba(212,160,23,0.25)', background: 'rgba(212,160,23,0.10)', borderRadius: 6, display: 'flex', gap: 12 }}>
                  <NormaIcon name="alert" size={18} />
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    <strong>Nota importante.</strong> Per una valutazione completa del Suo caso specifico (reddito, composizione familiare, clausole del contratto) Le consigliamo una consulenza con un commercialista o avvocato civilista.
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--vermiglio-ink)', fontWeight: 500, padding: 0, cursor: 'pointer', marginLeft: 4, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                      Trova un professionista →
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {["Approfondisci le tasse", "Modello di contratto", "Cosa succede se vendo l'immobile?", "Genera checklist"].map(s => (
                    <button key={s} style={{
                      padding: '7px 12px', background: 'white', border: '1px solid var(--paper-line)',
                      borderRadius: 20, fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer',
                      fontFamily: 'var(--sans)'
                    }}>↳ {s}</button>
                  ))}
                </div>
              </div>
            </ChatMessage>
          </div>
        </div>

        {/* Composer */}
        <div style={{ padding: '0 48px 28px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{
              background: 'white', border: '1px solid var(--paper-line)',
              borderRadius: 12, padding: 14, boxShadow: 'var(--shadow-2)'
            }}>
              <textarea
                placeholder="Domanda di follow-up, allega un PDF, o cerca una norma…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', resize: 'none',
                  fontSize: 14.5, fontFamily: 'var(--sans)', color: 'var(--ink)',
                  minHeight: 40, background: 'transparent', lineHeight: 1.5
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                  <NormaIcon name="paperclip" size={13} /> Allega PDF
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                  <NormaIcon name="book" size={13} /> Materia
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                  <NormaIcon name="spark" size={13} /> Ricerca giurisprudenza
                </button>
                <div style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>7/10 consultazioni</span>
                <button className="btn btn-accent" style={{ padding: '8px 14px' }}>
                  <NormaIcon name="send" size={13} /> Invia
                </button>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'center', marginTop: 10, letterSpacing: '0.08em' }}>
              NormaAI non sostituisce la consulenza legale professionale · Fonti: Gazzetta Ufficiale, Normattiva, De Jure
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
