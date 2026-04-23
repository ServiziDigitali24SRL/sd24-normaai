"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DualSidebar from "@/components/dashboard/DualSidebar";
import MainDashboard from "@/components/dashboard/MainDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = '01' | '02' | '03' | '04' | '05' | '06' | '07';
interface Sel { macro: string; macroLabel: string; item: string | null }

// ─── Primitives ───────────────────────────────────────────────────────────────
const T = {
  ink:  '#13110F', ink2: '#2A2621', ink3: '#4A433A', ink4: '#756C5E', ink5: '#A89F90',
  paper: '#F6F2EA', paperT: '#FBF8F1', paper2: '#EFE9DD', paper3: '#E6DFD0', paperL: '#D8CFBC',
  v: '#D44A2A', vs: 'rgba(212,74,42,0.12)', vi: '#A83420',
  alloro: '#4A9B6E', alloroS: 'rgba(74,155,110,0.12)',
  ambraS: 'rgba(212,160,23,0.15)',
  sh2: '0 4px 16px -4px rgba(19,17,15,0.10)',
  sh3: '0 16px 40px -8px rgba(19,17,15,0.14)',
  serif: "'Instrument Serif','DM Serif Display',Georgia,serif",
  sans: "'Inter Tight','Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'JetBrains Mono','IBM Plex Mono',monospace",
};

// ─── Icon ─────────────────────────────────────────────────────────────────────
const PATHS: Record<string, React.ReactNode> = {
  chat:     <><path d="M4 6h16v10H8l-4 4V6z"/></>,
  archive:  <><rect x="3" y="5" width="18" height="4"/><path d="M5 9v10h14V9"/><path d="M10 13h4"/></>,
  clock:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  users:    <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2"/><path d="M21 19c0-2.2-1.8-4-4-4"/></>,
  check:    <><path d="M4 12l5 5L20 6"/></>,
  plus:     <><path d="M12 5v14M5 12h14"/></>,
  arrow:    <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowDown:<><path d="M12 5v14M5 13l7 7 7-7"/></>,
  send:     <><path d="M3 12l18-8-8 18-2-8-8-2z"/></>,
  paperclip:<><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></>,
  download: <><path d="M12 3v14M5 12l7 7 7-7M4 21h16"/></>,
  book:     <><path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v14a2 2 0 1 1 2-2h8z"/></>,
  alert:    <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></>,
  mail:     <><rect x="3" y="5" width="18" height="14"/><path d="M3 7l9 6 9-6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
  lock:     <><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  shield:   <><path d="M12 3l8 3v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z"/></>,
  scale:    <><path d="M12 3v18M5 21h14M7 7h10M6 7l-3 8a4 4 0 0 0 8 0l-3-8M18 7l-3 8a4 4 0 0 0 8 0l-3-8"/></>,
  star:     <><path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5 6.5-.5z"/></>,
  building: <><rect x="4" y="3" width="16" height="18"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></>,
  briefcase:<><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></>,
  bolt:     <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
  close:    <><path d="M6 6l12 12M18 6L6 18"/></>,
  doc:      <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6M9 8h2"/></>,
  spark:    <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  wallet:   <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M17 15h1"/></>,
  org:      <><rect x="9" y="3" width="6" height="4"/><rect x="3" y="17" width="6" height="4"/><rect x="15" y="17" width="6" height="4"/><path d="M12 7v4M6 17v-2h12v2"/></>,
  flame:    <><path d="M12 22a7 7 0 0 1-7-7c0-4 4-6 4-10 2 2 3 3 4 6 1-3 4-3 5-1 1 1.5 1 3 1 5a7 7 0 0 1-7 7z"/></>,
  pin:      <><path d="M12 2l3 7h6l-5 4 2 7-6-4-6 4 2-7-5-4h6z"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  filter:   <><path d="M3 5h18l-7 9v5l-4 2v-7z"/></>,
  euro:     <><path d="M18 5a7 7 0 1 0 0 14M3 9h12M3 14h12"/></>,
  graph:    <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></>,
  grad:     <><path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></>,
  pen:      <><path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
  cloud:    <><path d="M7 18a5 5 0 1 1 .3-10A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z"/></>,
  drive:    <><path d="M8 3h8l6 10-4 7H6L2 13z"/><path d="M8 3L2 13M16 3l6 10M6 20l4-7M14 13h8M10 13L6 20"/></>,
};
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{PATHS[name] ?? null}</svg>;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const fs = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: T.serif, fontSize: fs, fontStyle: 'italic', color: T.ink, letterSpacing: '-0.02em' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: fs * 1.3, lineHeight: 0.8, color: T.v, fontStyle: 'normal' }}>§</span>
        <span>Norma</span>
      </span>
      <span style={{ fontFamily: T.mono, fontStyle: 'normal', fontSize: fs * 0.55, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink4, paddingBottom: 2 }}>AI</span>
    </div>
  );
}

function Stamp({ children, color = T.vi, rotate = -1.5 }: { children: React.ReactNode; color?: string; rotate?: number }) {
  return (
    <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', border: `1px solid ${color}`, borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 6, transform: `rotate(${rotate}deg)`, color }}>
      {children}
    </span>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'ink';
function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const styles: Record<BadgeTone, React.CSSProperties> = {
    neutral: { background: T.paper2, color: T.ink3, border: `1px solid ${T.paperL}` },
    accent:  { background: T.vs, color: T.vi, border: '1px solid transparent' },
    ok:      { background: T.alloroS, color: T.alloro, border: '1px solid transparent' },
    warn:    { background: T.ambraS, color: '#8B6800', border: '1px solid transparent' },
    ink:     { background: T.ink, color: T.paper, border: `1px solid ${T.ink}` },
  };
  return <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3, display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500, whiteSpace: 'nowrap', ...styles[tone] }}>{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink4 }}>
      <span style={{ fontFamily: T.serif, fontSize: 18, color: T.v, fontStyle: 'italic', letterSpacing: 0 }}>§</span>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 12px', background: active ? T.ink : 'transparent', color: active ? T.paper : T.ink2, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13.5, fontWeight: active ? 500 : 400, textAlign: 'left', fontFamily: T.sans, transition: 'all 0.15s ease' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.paper2; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontFamily: T.mono, fontSize: 10, padding: '2px 6px', borderRadius: 3, background: active ? T.paper3 : T.vs, color: active ? T.ink : T.vi, fontWeight: 500 }}>{badge}</span>}
    </button>
  );
}

// ─── Tab 01: Chat ─────────────────────────────────────────────────────────────
function CitationCard({ code, title, snippet }: { code: string; title: string; snippet: string }) {
  return (
    <div style={{ border: `1px solid ${T.paperL}`, borderLeft: `3px solid ${T.v}`, background: T.paperT, borderRadius: 4, padding: '10px 14px', marginTop: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.vi, whiteSpace: 'nowrap', fontWeight: 500, paddingTop: 2 }}>{code}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 3, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.5 }}>« {snippet} »</div>
      </div>
      <button style={{ background: 'transparent', border: `1px solid ${T.paperL}`, borderRadius: 3, padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Apri</button>
    </div>
  );
}

function ChatMsg({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  if (role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
      <div style={{ maxWidth: '72%', background: T.ink, color: T.paper, padding: '12px 16px', borderRadius: 10, fontSize: 14.5, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
      <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: T.paper2, border: `1px solid ${T.paperL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.serif, fontSize: 18, fontStyle: 'italic', color: T.v }}>§</div>
      <div style={{ flex: 1, paddingTop: 4 }}>{children}</div>
    </div>
  );
}

function ChatScreen() {
  return (
    <div style={{ display: 'flex', height: '100%', background: T.paper }}>
      {/* Sidebar */}
      <aside style={{ width: 260, flexShrink: 0, background: T.paperT, borderRight: `1px solid ${T.paperL}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 20px 14px' }}><Logo /></div>
        <div style={{ padding: '0 14px' }}>
          <button style={{ width: '100%', padding: '10px 12px', background: T.ink, color: T.paper, border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
            <Icon name="plus" size={14} /> Nuova consultazione
          </button>
        </div>
        <div style={{ padding: '18px 14px 8px' }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: T.ink4, paddingLeft: 12, marginBottom: 6 }}>Area personale</div>
          <NavItem icon={<Icon name="chat" />} label="Chat legale" active />
          <NavItem icon={<Icon name="archive" />} label="Archivio documenti" badge="12" />
          <NavItem icon={<Icon name="doc" />} label="Analisi PDF" />
          <NavItem icon={<Icon name="clock" />} label="Scadenze" badge="3" />
          <NavItem icon={<Icon name="users" />} label="Trova professionista" />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ margin: 14, padding: 16, border: `1px solid ${T.paperL}`, borderRadius: 8, background: 'white' }}>
          <Stamp>Piano Gratuito</Stamp>
          <div style={{ fontSize: 13, color: T.ink2, margin: '10px 0 12px', lineHeight: 1.45 }}>3 di 10 consultazioni mensili utilizzate</div>
          <div style={{ height: 4, background: T.paper2, borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ width: '30%', height: '100%', background: T.v }} />
          </div>
          <button style={{ width: '100%', padding: '9px 12px', background: T.v, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Passa a PRO <Icon name="arrow" size={12} />
          </button>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.paperL}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.ink, color: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500 }}>MR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Marco Rossi</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.ink4 }}>CITTADINO</div>
          </div>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.ink4 }}><Icon name="settings" size={16} /></button>
        </div>
      </aside>

      {/* Main — empty state */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 48px' }}>
          <Logo size="lg" />
          <p style={{ fontFamily: T.serif, fontSize: 22, color: T.ink2, margin: '20px 0 8px', letterSpacing: '-0.01em', textAlign: 'center' }}>
            La norma è uguale per tutti.
          </p>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.ink4, margin: '0 0 36px', textAlign: 'center' }}>
            Chiedimi qualcosa sulla normativa italiana.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
            {['Contratto locazione 4+4', 'Licenziamento per giusta causa', 'GDPR e trattamento dati', 'TFR e liquidazione'].map(s => (
              <button key={s} style={{ padding: '9px 16px', background: 'white', border: `1px solid ${T.paperL}`, borderRadius: 20, fontSize: 13, color: T.ink2, cursor: 'pointer', fontFamily: T.sans }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 48px 28px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{ background: 'white', border: `1px solid ${T.paperL}`, borderRadius: 12, padding: 14, boxShadow: T.sh2 }}>
              <textarea placeholder="Domanda di follow-up, allega un PDF, o cerca una norma…" style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14.5, fontFamily: T.sans, color: T.ink, minHeight: 40, background: 'transparent', lineHeight: 1.5 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {([['paperclip','Allega PDF'],['book','Materia'],['spark','Ricerca giurisprudenza']] as [string,string][]).map(([ic,lb]) => (
                  <button key={lb} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'transparent', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: T.ink2, fontFamily: T.sans }}>
                    <Icon name={ic} size={13} /> {lb}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.ink4 }}>10/10 consultazioni</span>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.v, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
                  <Icon name="send" size={13} /> Invia
                </button>
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.ink4, textAlign: 'center', marginTop: 10, letterSpacing: '0.08em' }}>
              NormaAI non sostituisce la consulenza legale professionale · Fonti: Gazzetta Ufficiale, Normattiva, De Jure
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Tab 02: Onboarding ───────────────────────────────────────────────────────
type OnbRole = 'cittadino' | 'cittadino-pro' | 'avvocato' | 'professionista' | 'impresa' | null;
function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<OnbRole>(null);
  const [profile, setProfile] = useState({ nome: '', email: '', cellulare: '', cap: '', citta: '', regione: '', situazione: '', problemi: [] as string[] });
  const [goal, setGoal] = useState<string | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isAvv = role === 'avvocato';
  const isImp = role === 'impresa';
  const totalSteps = isAvv ? 7 : isImp ? 5 : 4;

  const capMap: Record<string, { citta: string; regione: string }> = {
    '20121': { citta: 'Milano', regione: 'Lombardia' },
    '00187': { citta: 'Roma', regione: 'Lazio' },
    '10121': { citta: 'Torino', regione: 'Piemonte' },
    '80121': { citta: 'Napoli', regione: 'Campania' },
  };

  const problemi = ['Condominio', 'Lavoro', 'Tasse', 'Affitto', 'Separazione/divorzio', 'Eredità', 'Incidente', 'Contratti', 'Banca', 'PA/Comune/Multa', 'Nessuno'];
  const toggleProblema = (p: string) => {
    setProfile(prev => {
      if (p === 'Nessuno') return { ...prev, problemi: prev.problemi.includes('Nessuno') ? [] : ['Nessuno'] };
      const f = prev.problemi.filter(x => x !== 'Nessuno');
      return { ...prev, problemi: f.includes(p) ? f.filter(x => x !== p) : [...f, p] };
    });
  };

  const handleCap = (cap: string) => {
    const m = capMap[cap];
    setProfile(p => ({ ...p, cap, citta: m?.citta ?? p.citta, regione: m?.regione ?? p.regione }));
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else { try { localStorage.setItem('norma.user', JSON.stringify({ role, registered: true })); } catch {} onComplete(); }
  };
  const handleSkip = () => { if (step < totalSteps) setStep(step + 1); else onComplete(); };

  const tiers = [
    { id: 'cittadino', tag: 'Per iniziare', name: 'Cittadino', price: 'Gratis', priceSub: '10 consult./mese', icon: 'users', features: ['10 consultazioni/mese', 'Riferimenti normativi', 'Archivio base'] },
    { id: 'cittadino-pro', tag: 'Più popolare', name: 'Cittadino PRO', price: '€9', priceSub: '/mese', highlight: true, icon: 'star', features: ['Consultazioni illimitate', 'Analisi PDF & contratti', 'Firma digitale'] },
    { id: 'avvocato', tag: 'Foro · Albo', name: 'Avvocato', price: '€29', priceSub: '/mese', icon: 'scale', features: ['Marketplace lead €75/€150', 'Profilo directory pubblico', 'Redazione atti AI'] },
    { id: 'professionista', tag: 'Commercialisti & altri', name: 'Professionista', price: '€29', priceSub: '/mese', icon: 'briefcase', features: ['Profilo pubblico', 'Parcelle & progetti', 'Business plan AI'] },
    { id: 'impresa', tag: 'Da 5 a 500+ dip.', name: 'Impresa', price: '€29–€499', priceSub: '/mese', icon: 'building', features: ['Chat compliance', 'Checklist GDPR/231', 'Analisi contratti', 'Team & seat'] },
  ] as const;

  const OLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.ink3, textTransform: 'uppercase', fontWeight: 500 }}>{children}</label>
  );
  const OField = ({ label, val, onChange, placeholder, type = 'text', disabled, autoFilled }: { label: string; val: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; autoFilled?: boolean }) => (
    <div>
      <OLabel>{label}</OLabel>
      <div style={{ position: 'relative', marginTop: 8 }}>
        <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ width: '100%', padding: '13px 16px', border: `1px solid ${val ? T.ink : T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: disabled ? T.paper2 : 'white', outline: 'none', color: disabled ? T.ink3 : T.ink, paddingRight: autoFilled ? 40 : 16 }} />
        {autoFilled && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: T.alloro }}><Icon name="check" size={14} /></span>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100%', height: '100%', overflow: 'auto', background: T.paper, position: 'relative' }}>
      {/* Skip button (testing) */}
      <button onClick={handleSkip} style={{ position: 'fixed', top: 60, right: 16, zIndex: 50, padding: '6px 12px', background: '#FDE047', border: '1px solid #EAB308', borderRadius: 4, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#422006', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>SKIP →</button>

      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.paperL}`, position: 'sticky', top: 0, background: T.paper, zIndex: 10 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', color: T.ink4, textTransform: 'uppercase' }}>PASSO {step} DI {totalSteps}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ width: 28, height: 2, background: i + 1 <= step ? T.v : T.paperL, transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 40px 80px' }}>

        {/* Step 1: Role selection */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: T.ink, color: T.paper, borderRadius: 10, marginBottom: 32 }}>
              <div style={{ fontFamily: T.serif, fontSize: 24, fontStyle: 'italic', color: T.v, lineHeight: 1 }}>§</div>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>
                <strong>Ha usato le 10 consultazioni gratuite.</strong> <span style={{ color: T.ink5 }}>Per continuare, crei un account — servono 2 minuti.</span>
              </div>
              <Stamp color={T.v}>Limite raggiunto</Stamp>
            </div>
            <SectionLabel>Piani</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 52, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Chi è Lei, <em style={{ color: T.v }}>per NormaAI?</em>
            </h1>
            <p style={{ fontSize: 16, color: T.ink3, margin: '0 0 36px', maxWidth: 600 }}>Scelga il piano più adatto. Potrà cambiarlo in ogni momento.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {tiers.map(t => {
                const active = role === t.id;
                return (
                  <div key={t.id} onClick={() => setRole(t.id as OnbRole)} style={{ background: active ? 'white' : T.paperT, border: active ? `2px solid ${T.ink}` : `1px solid ${T.paperL}`, margin: active ? 0 : 1, borderRadius: 10, padding: '20px 18px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', transform: active ? 'translateY(-4px)' : 'none', boxShadow: active ? T.sh3 : 'none' }}>
                    {'highlight' in t && t.highlight && <div style={{ position: 'absolute', top: -10, right: 14 }}><Stamp color={T.v} rotate={2}>Consigliato</Stamp></div>}
                    <div style={{ color: active ? T.v : T.ink3, marginBottom: 8 }}><Icon name={t.icon} size={22} /></div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: active ? T.vi : T.ink4 }}>{t.tag}</div>
                    <div style={{ fontFamily: T.serif, fontSize: 24, marginTop: 6, letterSpacing: '-0.02em' }}>{t.name}</div>
                    <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontFamily: T.serif, fontSize: t.price.length > 4 ? 22 : 32, lineHeight: 1 }}>{t.price}</span>
                      <span style={{ fontSize: 12, color: T.ink4 }}>{t.priceSub}</span>
                    </div>
                    <hr style={{ height: 1, background: T.paperL, border: 0, margin: '14px 0' }} />
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                      {t.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: T.ink2, padding: '3px 0', lineHeight: 1.4 }}>
                          <span style={{ color: T.v, flexShrink: 0, paddingTop: 2 }}><Icon name="check" size={11} /></span>{f}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 16, padding: 8, textAlign: 'center', border: active ? `1px solid ${T.ink}` : `1px dashed ${T.paperL}`, background: active ? T.ink : 'transparent', color: active ? T.paper : T.ink4, borderRadius: 6, fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {active ? '✓ Selezionato' : 'Seleziona'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Profile (cittadino) */}
        {!isAvv && !isImp && step === 2 && (
          <div>
            <SectionLabel>I Suoi dati</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Si presenti, <em style={{ color: T.v }}>in breve.</em></h1>
            <p style={{ fontSize: 15, color: T.ink3, margin: '0 0 36px', maxWidth: 600 }}>Queste informazioni restano private.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <OField label="Nome e Cognome" val={profile.nome} onChange={v => setProfile({ ...profile, nome: v })} placeholder="Marco Rossi" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <OField label="Email" val={profile.email} onChange={v => setProfile({ ...profile, email: v })} placeholder="marco@email.it" type="email" />
                  <OField label="Cellulare" val={profile.cellulare} onChange={v => setProfile({ ...profile, cellulare: v })} placeholder="+39 333 1234567" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 14 }}>
                  <OField label="CAP" val={profile.cap} onChange={handleCap} placeholder="20121" />
                  <OField label="Città" val={profile.citta} onChange={() => {}} placeholder="Auto" disabled autoFilled={!!profile.citta} />
                  <OField label="Regione" val={profile.regione} onChange={() => {}} placeholder="Auto" disabled autoFilled={!!profile.regione} />
                </div>
                <div>
                  <OLabel>La Sua situazione</OLabel>
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <select value={profile.situazione} onChange={e => setProfile({ ...profile, situazione: e.target.value })} style={{ width: '100%', padding: '13px 16px', border: `1px solid ${profile.situazione ? T.ink : T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: 'white', outline: 'none', color: profile.situazione ? T.ink : T.ink4, appearance: 'none', paddingRight: 36 }}>
                      <option value="">Scelga dalla lista…</option>
                      {['Dipendente', 'Libero professionista', 'Imprenditore', 'Pensionato', 'Studente', 'Disoccupato'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.ink4 }}><Icon name="arrowDown" size={14} /></div>
                  </div>
                </div>
              </div>
              <div>
                <OLabel>Negli ultimi 10 anni ha avuto problemi con:</OLabel>
                <p style={{ fontSize: 12, color: T.ink4, margin: '4px 0 14px' }}>Selezione multipla.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {problemi.map(p => {
                    const selected = profile.problemi.includes(p);
                    return (
                      <button key={p} type="button" onClick={() => toggleProblema(p)} style={{ padding: '9px 14px', borderRadius: 20, border: selected ? `1px solid ${T.ink}` : `1px solid ${T.paperL}`, background: selected ? T.ink : 'white', color: selected ? T.paper : T.ink2, fontSize: 13, cursor: 'pointer', fontFamily: T.sans, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {selected && <Icon name="check" size={12} />}{p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Goal */}
        {!isAvv && !isImp && step === 3 && (
          <div>
            <SectionLabel>Obiettivo</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Cosa vuole fare <em style={{ color: T.v }}>con NormaAI?</em></h1>
            <p style={{ fontSize: 15, color: T.ink3, margin: '0 0 36px', maxWidth: 600 }}>Una sola scelta.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, maxWidth: 900 }}>
              {[
                { id: 'diritti', title: 'Capire i miei diritti', desc: 'Voglio sapere cosa posso fare, legalmente, in una situazione.', icon: 'book' },
                { id: 'risolvere', title: 'Risolvere un problema ora', desc: 'Ho un problema concreto e mi serve aiuto subito.', icon: 'bolt' },
                { id: 'aggiornato', title: 'Tenermi aggiornato', desc: 'Voglio seguire scadenze e novità normative che mi riguardano.', icon: 'clock' },
                { id: 'professionista', title: 'Trovare un professionista', desc: 'Mi serve un avvocato o commercialista di fiducia.', icon: 'users' },
              ].map(g => {
                const active = goal === g.id;
                return (
                  <label key={g.id} onClick={() => setGoal(g.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: 22, border: active ? `2px solid ${T.ink}` : `1px solid ${T.paperL}`, margin: active ? 0 : 1, background: active ? T.paperT : 'white', borderRadius: 10, cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: active ? `6px solid ${T.v}` : `1px solid ${T.paperL}`, background: active ? T.paper : 'white', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ color: active ? T.v : T.ink3 }}><Icon name={g.icon} size={18} /></span>
                        <span style={{ fontFamily: T.serif, fontSize: 22, letterSpacing: '-0.01em' }}>{g.title}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.5, marginLeft: 28 }}>{g.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4 / OTP */}
        {((!isAvv && !isImp && step === 4) || (isAvv && step === 7) || (isImp && step === 5)) && (
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.paperT, border: `1px solid ${T.paperL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: T.v }}>
              <Icon name="mail" size={32} />
            </div>
            <SectionLabel>Verifica email</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 38, margin: '14px 0 10px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Abbiamo inviato un codice<br/><em style={{ color: T.v }}>alla Sua email</em>
            </h1>
            <p style={{ fontSize: 14.5, color: T.ink3, margin: '0 0 36px' }}>Inserisca le 6 cifre ricevute. Il codice scade in 10 minuti.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {otp.map((d, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => { const digit = e.target.value.replace(/\D/g, '').slice(-1); const next = [...otp]; next[i] = digit; setOtp(next); if (digit && i < 5) otpRefs.current[i + 1]?.focus(); }}
                  onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                  style={{ width: 54, height: 64, textAlign: 'center', fontFamily: T.serif, fontSize: 30, border: `1px solid ${d ? T.ink : T.paperL}`, borderRadius: 6, background: 'white', outline: 'none', color: T.ink }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Impresa step 2: dimensione */}
        {isImp && step === 2 && (
          <div>
            <SectionLabel>Dimensione azienda</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Quanto è <em style={{ color: T.v }}>grande la Sua azienda?</em></h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 1100, marginTop: 32 }}>
              {[
                { id: 'micro', label: 'MICRO', range: '1–9 dipendenti', price: '€29', features: ['Chat compliance base', 'Checklist GDPR essenziale', '1 seat incluso'] },
                { id: 'piccola', label: 'PICCOLA', range: '10–49 dipendenti', price: '€79', features: ['GDPR + Sicurezza lavoro', 'Analisi contratti AI', '5 seat inclusi'] },
                { id: 'media', label: 'MEDIA', range: '50–249 dipendenti', price: '€199', features: ['GDPR + 231 + DPO', 'Audit checklist complete', '15 seat inclusi'] },
              ].map(s => (
                <div key={s.id} style={{ padding: 24, border: `1px solid ${T.paperL}`, borderRadius: 10, background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', color: T.vi, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: T.serif, fontSize: 26, lineHeight: 1.1, marginBottom: 10 }}>{s.range}</div>
                  <div style={{ fontFamily: T.serif, fontSize: 38, lineHeight: 1, marginBottom: 4 }}>{s.price}<span style={{ fontFamily: T.sans, fontSize: 13, color: T.ink4 }}>/mese</span></div>
                  <hr style={{ height: 1, background: T.paperL, border: 0, margin: '12px 0' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {s.features.map((f, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: T.ink2, padding: '3px 0' }}><span style={{ color: T.v }}><Icon name="check" size={11} /></span>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avvocato step 2 */}
        {isAvv && step === 2 && (
          <div>
            <SectionLabel>Profilo professionale</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Il Suo <em style={{ color: T.v }}>profilo professionale.</em></h1>
            <p style={{ fontSize: 15, color: T.ink3, margin: '0 0 36px', maxWidth: 640 }}>Verificheremo l'iscrizione all'albo prima di pubblicare il Suo profilo nella directory.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <OField label="Nome e Cognome" val="" onChange={() => {}} placeholder="Avv. Giulia Mancini" />
                <OField label="Email professionale" val="" onChange={() => {}} placeholder="giulia@studiomancini.it" type="email" />
                <OField label="Cellulare" val="" onChange={() => {}} placeholder="+39 333 1234567" />
                <OField label="P.IVA" val="" onChange={() => {}} placeholder="12345678901" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <OField label="N. iscrizione albo" val="" onChange={() => {}} placeholder="A12345" />
                <OField label="Anni iscrizione" val="" onChange={() => {}} placeholder="12" />
                <div>
                  <OLabel>Numero avvocati nello studio</OLabel>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {['Solo io', '2-5', '6-20', '20+'].map(s => (
                      <button key={s} style={{ flex: 1, padding: '10px 16px', borderRadius: 6, border: `1px solid ${T.paperL}`, background: 'white', color: T.ink2, fontSize: 13, cursor: 'pointer', fontFamily: T.sans }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Steps 3-6 for avvocato (simplified) */}
        {isAvv && step >= 3 && step <= 6 && (
          <div>
            <SectionLabel>{['', '', 'Specializzazioni', 'Tools attuali', 'Obiettivi', 'Profilo directory'][step]}</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              {step === 3 && <>Le Sue <em style={{ color: T.v }}>aree di pratica.</em></>}
              {step === 4 && <>Cosa usa già <em style={{ color: T.v }}>nel Suo studio?</em></>}
              {step === 5 && <>Cosa vuole fare <em style={{ color: T.v }}>con NormaAI?</em></>}
              {step === 6 && <>Il Suo <em style={{ color: T.v }}>profilo pubblico.</em></>}
            </h1>
            {step === 3 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 32 }}>
                {['Civile', 'Penale', 'Tributario', 'Lavoro', 'Amministrativo', 'Famiglia', '231/Penale d\'impresa', 'GDPR', 'Commerciale', 'Societario'].map(s => (
                  <button key={s} style={{ padding: '12px 20px', borderRadius: 24, border: `1px solid ${T.paperL}`, background: 'white', color: T.ink2, fontSize: 14, cursor: 'pointer', fontFamily: T.sans }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Impresa steps 3-4 (simplified) */}
        {isImp && step >= 3 && step <= 4 && (
          <div>
            <SectionLabel>{step === 3 ? 'Dati aziendali' : 'Referente compliance'}</SectionLabel>
            <h1 style={{ fontFamily: T.serif, fontSize: 46, margin: '16px 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              {step === 3 ? <>I dati <em style={{ color: T.v }}>della Sua azienda.</em></> : <>Chi gestirà <em style={{ color: T.v }}>la compliance?</em></>}
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <OField label={step === 3 ? 'Ragione sociale' : 'Nome e Cognome'} val="" onChange={() => {}} placeholder={step === 3 ? 'Acme SRL' : 'Es. Laura Bianchi'} />
                <OField label={step === 3 ? 'P.IVA' : 'Email'} val="" onChange={() => {}} placeholder={step === 3 ? '12345678901' : 'laura@acme.it'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <OField label={step === 3 ? 'Email aziendale' : 'Ruolo'} val="" onChange={() => {}} placeholder={step === 3 ? 'info@acme.it' : 'Es. Responsabile Legal'} />
                <OField label={step === 3 ? 'Numero dipendenti' : 'È il DPO?'} val="" onChange={() => {}} placeholder={step === 3 ? 'Es. 25' : ''} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, paddingTop: 28, borderTop: `1px solid ${T.paperL}` }}>
          <button onClick={() => step > 1 && setStep(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'transparent', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 14, cursor: step === 1 ? 'not-allowed' : 'pointer', color: T.ink2, fontFamily: T.sans, opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}>
            ← Indietro
          </button>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase' }}>
            {step === 1 ? 'Scelga il ruolo' : step === totalSteps ? 'Verifica email' : `Passo ${step}`}
          </div>
          <button onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 22px', background: role || step > 1 ? T.v : T.paper2, color: role || step > 1 ? 'white' : T.ink4, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans, opacity: role || step > 1 ? 1 : 0.5 }}>
            {step === totalSteps ? 'Conferma e accedi' : 'Continua'} <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 06: API ──────────────────────────────────────────────────────────────
function ApiScreen() {
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('');
  const [usage, setUsage] = useState('');

  return (
    <div style={{ height: '100%', overflow: 'auto', background: T.paper }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', height: '100%', minHeight: '100%' }}>
        {/* Left editorial */}
        <div style={{ padding: 44, background: T.ink, color: T.paper, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, left: -60, fontSize: 400, fontFamily: T.serif, color: T.v, opacity: 0.14, lineHeight: 1, fontStyle: 'italic', pointerEvents: 'none' }}>{'{}'}</div>
          <div style={{ position: 'relative' }}>
            <Stamp color={T.v}>API · Pay per use</Stamp>
            <h2 style={{ fontFamily: T.serif, fontSize: 44, margin: '20px 0 14px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Integra la normativa italiana <em style={{ color: T.v }}>nella tua applicazione.</em>
            </h2>
            <p style={{ fontSize: 14.5, color: T.ink5, lineHeight: 1.55, margin: '0 0 28px' }}>
              Nessun piano mensile. Paghi <strong style={{ color: T.paper }}>€0,15</strong> a query.
            </p>
            <hr style={{ border: 0, height: 1, background: 'rgba(246,242,234,0.15)', margin: '28px 0 20px' }} />
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.ink5, textTransform: 'uppercase', marginBottom: 14 }}>Cosa include</div>
            {[
              'Risposta generata da Claude Sonnet 4.6',
              'Fonti normative citate e linkate',
              '5 verticali: Lavoro · Civile · Tributario · Tecnico · Finanziario',
              'Parametro user_role per adattare il tono',
              'Rate limit 60 req/min',
              'Wallet ricaricabile · min €10',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', fontSize: 13.5, lineHeight: 1.4 }}>
                <span style={{ color: T.v, paddingTop: 3, flexShrink: 0 }}><Icon name="check" size={13} /></span>{f}
              </div>
            ))}
            <hr style={{ border: 0, height: 1, background: 'rgba(246,242,234,0.15)', margin: '28px 0 20px' }} />
            <div style={{ background: 'rgba(246,242,234,0.06)', border: '1px solid rgba(246,242,234,0.12)', borderRadius: 8, padding: 14, fontFamily: T.mono, fontSize: 11.5, lineHeight: 1.6, color: T.ink5 }}>
              <div style={{ color: 'rgba(230,125,80,0.85)' }}>POST /v1/ask</div>
              <div>{'{'}</div>
              <div style={{ paddingLeft: 12 }}>"query": "Contratto locazione…",</div>
              <div style={{ paddingLeft: 12 }}>"verticale": "civile",</div>
              <div style={{ paddingLeft: 12 }}>"user_role": "cittadino"</div>
              <div>{'}'}</div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ padding: 44, background: T.paperT, overflowY: 'auto' }}>
          <SectionLabel>Ottieni accesso API</SectionLabel>
          <div style={{ marginTop: 18, padding: '20px 22px', background: 'white', border: `1px solid ${T.paperL}`, borderRadius: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.ink4, textTransform: 'uppercase', marginBottom: 4 }}>Saldo wallet</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ fontFamily: T.serif, fontSize: 42, letterSpacing: '-0.02em', lineHeight: 1 }}>€500,<span style={{ color: T.ink4 }}>00</span></div>
              <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.ink4, letterSpacing: '0.08em' }}>≈ 3.333 query</div>
            </div>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', background: T.v, color: 'white', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', marginTop: 14, fontFamily: T.sans, fontWeight: 500 }}>
              <Icon name="plus" size={13} /> Ricarica wallet
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 18px' }}>
            <hr style={{ flex: 1, height: 1, background: T.paperL, border: 0 }} />
            <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', color: T.ink4, textTransform: 'uppercase' }}>Nuova API key</span>
            <hr style={{ flex: 1, height: 1, background: T.paperL, border: 0 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Email', val: email, set: setEmail, placeholder: 'dev@azienda.it', type: 'email' },
              { label: 'Nome progetto', val: project, set: setProject, placeholder: 'Es. Portale HR interno' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase' }}>{f.label}</label>
                <input type={f.type ?? 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '12px 14px', border: `1px solid ${f.val ? T.ink : T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: 'white', outline: 'none', color: T.ink, marginTop: 8, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase' }}>Come userà l'API?</label>
              <textarea value={usage} onChange={e => setUsage(e.target.value)} placeholder="Descriva brevemente il caso d'uso…"
                style={{ width: '100%', padding: '12px 14px', border: `1px solid ${usage ? T.ink : T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: 'white', outline: 'none', color: T.ink, marginTop: 8, boxSizing: 'border-box', minHeight: 84, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 18px', background: T.ink, color: T.paper, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
              Richiedi API key <Icon name="arrow" size={13} />
            </button>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', color: T.ink4, textTransform: 'uppercase' }}>
            €0,15 per query · senza canone mensile
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 07: Enterprise / Su Misura ───────────────────────────────────────────
function EnterpriseScreen() {
  const [form, setForm] = useState({ nome: '', org: '', tipo: 'Studio legale', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const plans = [
    { id: 'easy', name: 'Easy', setup: 1497, yearly: 497, seats: '3 seat', docs: '100.000 documenti', support: 'Email support', extras: ['Fine-tuning base sulla Vostra documentazione', 'Chat privata su dominio dedicato', 'SSO Google / Microsoft'], tag: 'Per iniziare' },
    { id: 'standard', name: 'Standard', setup: 2997, yearly: 1497, seats: '15 seat', docs: '1.000.000 documenti', support: 'Supporto prioritario', extras: ['Tutto di Easy, più:', 'Integrazione SharePoint / Drive aziendale', 'Audit log & retention policy', 'Analisi semantica cross-doc'], tag: 'Più richiesto', highlight: true },
    { id: 'pro', name: 'Pro', setup: 4997, yearly: 2497, seats: 'Seat illimitati', docs: 'Documenti illimitati', support: 'SLA 99.9% · Onboarding dedicato', extras: ['Tutto di Standard, più:', 'Deployment on-premise o VPC privato', 'Customer Success Manager dedicato', 'Custom connectors & API'], tag: 'Per grandi organizzazioni' },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto', background: T.paper }}>
      <header style={{ padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.paperL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo />
          <span style={{ width: 1, height: 22, background: T.paperL }} />
          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.ink3 }}>Enterprise</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: T.ink2, fontFamily: T.sans }}>Torna al SaaS</button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.ink, color: T.paper, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
            Richiedi demo <Icon name="arrow" size={13} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px 80px' }}>
        {/* Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 60, alignItems: 'center', marginBottom: 80 }}>
          <div>
            <Stamp color={T.v}>Prodotto separato · non-SaaS</Stamp>
            <h1 style={{ fontFamily: T.serif, fontSize: 64, margin: '24px 0 20px', lineHeight: 1.02, letterSpacing: '-0.025em' }}>
              Porta <em style={{ color: T.v }}>l'intelligenza normativa</em><br/>nella Sua organizzazione.
            </h1>
            <p style={{ fontSize: 17, color: T.ink3, lineHeight: 1.55, margin: '0 0 28px', maxWidth: 560 }}>
              I Vostri documenti interni <strong style={{ color: T.ink }}>+ </strong>la normativa italiana. <strong style={{ color: T.ink }}>Setup in 48 ore.</strong>
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 22px', background: T.v, color: 'white', border: 'none', borderRadius: 6, fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
                Richiedi demo <Icon name="arrow" size={14} />
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 22px', background: 'transparent', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 14.5, cursor: 'pointer', color: T.ink2, fontFamily: T.sans }}>
                Vedi i piani
              </button>
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 40 }}>
              {[['Setup', '48 ore'], ['API key', 'La Vostra'], ['Hosting', 'Cloud UE · on-prem'], ['Conformità', 'GDPR · ISO 27001']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Architecture diagram */}
          <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
            <div style={{ position: 'absolute', inset: 0, background: T.ink, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -100, right: -100, fontSize: 500, fontFamily: T.serif, color: T.v, opacity: 0.2, lineHeight: 1, fontStyle: 'italic', pointerEvents: 'none' }}>§</div>
            </div>
            <div style={{ position: 'relative', height: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 14, color: T.paper }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em', color: T.ink5, textTransform: 'uppercase' }}>Architettura</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ padding: 12, border: '1px solid rgba(246,242,234,0.18)', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.ink5, letterSpacing: '0.08em' }}>INPUT · VOSTRI DATI</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {['Contratti', 'Policy', 'Atti', 'Precedenti'].map(x => <span key={x} style={{ padding: '3px 8px', border: '1px solid rgba(246,242,234,0.2)', borderRadius: 3, fontSize: 11 }}>{x}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 20, color: T.ink5 }}>↓</div>
                <div style={{ padding: 14, background: T.v, color: 'white', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', opacity: 0.85 }}>MOTORE NORMAAI</div>
                  <div style={{ fontFamily: T.serif, fontSize: 20, marginTop: 4, fontStyle: 'italic' }}>Vostra knowledge base + Normativa IT</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 20, color: T.ink5 }}>↓</div>
                <div style={{ padding: 12, border: '1px solid rgba(246,242,234,0.18)', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.ink5, letterSpacing: '0.08em' }}>OUTPUT · INTERFACCE</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {['Chat privata', 'API REST', 'Slack / Teams', 'SSO'].map(x => <span key={x} style={{ padding: '3px 8px', border: '1px solid rgba(246,242,234,0.2)', borderRadius: 3, fontSize: 11 }}>{x}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <SectionLabel>Piani Enterprise</SectionLabel>
            <h2 style={{ fontFamily: T.serif, fontSize: 44, margin: '14px 0 10px', letterSpacing: '-0.02em', lineHeight: 1.08 }}>Investimento una tantum + canone annuale.</h2>
            <p style={{ fontSize: 15, color: T.ink3, margin: 0 }}>Nessun lock-in sui dati. Token a parte — API key Vostra.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {plans.map(p => (
              <div key={p.id} style={{ background: p.highlight ? T.ink : 'white', color: p.highlight ? T.paper : T.ink, border: `1px solid ${p.highlight ? T.v : T.paperL}`, borderRadius: 12, padding: '28px 26px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {p.highlight && <div style={{ position: 'absolute', top: -10, right: 20 }}><Stamp color={T.v} rotate={2}>Più richiesto</Stamp></div>}
                <div style={{ fontFamily: T.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: p.highlight ? T.ink5 : T.ink4 }}>{p.tag}</div>
                <h3 style={{ fontFamily: T.serif, fontSize: 38, margin: '8px 0 20px', letterSpacing: '-0.02em' }}>{p.name}</h3>
                <div style={{ padding: '16px 0', borderTop: `1px solid ${p.highlight ? 'rgba(246,242,234,0.15)' : T.paperL}`, borderBottom: `1px solid ${p.highlight ? 'rgba(246,242,234,0.15)' : T.paperL}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: T.serif, fontSize: 38, lineHeight: 1, letterSpacing: '-0.02em' }}>€{p.setup.toLocaleString('it-IT')}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: p.highlight ? T.ink5 : T.ink4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SETUP UNA TANTUM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: T.serif, fontSize: 22, lineHeight: 1 }}>+ €{p.yearly.toLocaleString('it-IT')}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: p.highlight ? T.ink5 : T.ink4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>/ ANNO</span>
                  </div>
                </div>
                <div style={{ padding: '18px 0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['Seat', p.seats], ['Archivio', p.docs], ['Supporto', p.support]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', color: p.highlight ? T.ink5 : T.ink4, textTransform: 'uppercase' }}>{k}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <hr style={{ border: 0, height: 1, background: p.highlight ? 'rgba(246,242,234,0.15)' : T.paperL, margin: '4px 0 14px' }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {p.extras.map((e, i) => <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '5px 0', lineHeight: 1.4, color: p.highlight ? T.paper : T.ink2 }}><span style={{ color: T.v, flexShrink: 0, paddingTop: 2 }}><Icon name="check" size={13} /></span>{e}</li>)}
                </ul>
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, padding: '13px 16px', background: p.highlight ? T.v : T.ink, color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
                  Richiedi demo <Icon name="arrow" size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Demo form */}
        <section>
          <div style={{ background: T.ink, color: T.paper, borderRadius: 16, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1.2fr' }}>
            <div style={{ padding: 48, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: -60, left: -40, fontSize: 320, fontFamily: T.serif, color: T.v, opacity: 0.18, lineHeight: 1, fontStyle: 'italic', pointerEvents: 'none' }}>§</div>
              <div style={{ position: 'relative' }}>
                <Stamp color={T.v}>Demo · 30 minuti</Stamp>
                <h2 style={{ fontFamily: T.serif, fontSize: 44, margin: '22px 0 16px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                  Vediamo <em style={{ color: T.v }}>NormaAI Enterprise</em><br/>sui Vostri documenti.
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
                  {[['Risposta entro 1 giorno lavorativo', 'clock'], ['NDA firmato prima dell\'onboarding', 'lock'], ['Nessun vincolo — demo gratuita', 'check']].map(([t, ic]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5 }}>
                      <span style={{ color: T.v }}><Icon name={ic} size={16} /></span>{t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); }} style={{ padding: 48, background: T.paper, color: T.ink }}>
              {submitted ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.alloroS, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.alloro, marginBottom: 20 }}>
                    <Icon name="check" size={32} />
                  </div>
                  <h3 style={{ fontFamily: T.serif, fontSize: 28, margin: '0 0 10px' }}>Grazie, {form.nome || 'a presto'}.</h3>
                  <p style={{ fontSize: 14, color: T.ink3, margin: 0, maxWidth: 320 }}>La ricontattiamo entro 1 giorno lavorativo.</p>
                </div>
              ) : (
                <>
                  <SectionLabel>Richiesta demo</SectionLabel>
                  <h3 style={{ fontFamily: T.serif, fontSize: 26, margin: '12px 0 24px', letterSpacing: '-0.01em' }}>Parliamone.</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {([['Nome e cognome', form.nome, (v: string) => setForm({ ...form, nome: v }), 'Marco Rossi'], ['Organizzazione', form.org, (v: string) => setForm({ ...form, org: v }), 'Studio Mancini · Acme SRL']] as Array<[string, string, (v: string) => void, string]>).map(([l, v, s, p]) => (
                      <label key={l as string} style={{ display: 'block' }}>
                        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                        <input value={v as string} onChange={e => (s as (v: string) => void)(e.target.value)} placeholder={p as string}
                          style={{ width: '100%', padding: '11px 14px', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: 'white', outline: 'none', color: T.ink }} />
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase' }}>Tipo di organizzazione</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {['Studio legale', 'Azienda', 'Sindacato / Ente', 'Altro'].map(t => (
                        <button type="button" key={t} onClick={() => setForm({ ...form, tipo: t })} style={{ padding: '8px 14px', borderRadius: 20, border: form.tipo === t ? `1px solid ${T.ink}` : `1px solid ${T.paperL}`, background: form.tipo === t ? T.ink : 'white', color: form.tipo === t ? T.paper : T.ink2, fontSize: 12.5, cursor: 'pointer', fontFamily: T.sans }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', color: T.ink4, textTransform: 'uppercase', marginBottom: 6 }}>Email professionale</div>
                      <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="marco@studio.it"
                        style={{ width: '100%', padding: '11px 14px', border: `1px solid ${T.paperL}`, borderRadius: 6, fontSize: 14, fontFamily: T.sans, background: 'white', outline: 'none', color: T.ink }} />
                    </label>
                  </div>
                  <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, padding: '14px 20px', background: T.v, color: 'white', border: 'none', borderRadius: 6, fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
                    Invia richiesta <Icon name="arrow" size={14} />
                  </button>
                </>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Dashboard wrapper (for tabs 03-05) ───────────────────────────────────────
function DashboardTab({ role, demoUser }: { role: 'cittadino' | 'prof' | 'impresa'; demoUser: { name: string; initials: string; subtitle: string } }) {
  const [selection, setSelection] = useState<Sel | null>(null);
  const router = useRouter();

  const handleNav = (payload: string | { macro: { key: string; label: string }; item: string | null }) => {
    if (typeof payload === 'string') {
      if (payload === 'upgrade') router.push('/upgrade');
      return;
    }
    if (payload.macro.key === '__dashboard__') { setSelection({ macro: '__dashboard__', macroLabel: 'Dashboard', item: null }); return; }
    setSelection({ macro: payload.macro.key, macroLabel: payload.macro.label, item: payload.item });
  };

  const piano = role === 'impresa' ? 'impresa_media' : role === 'prof' ? 'professionista' : 'gratis';

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--paper)', overflow: 'hidden' }}>
      <DualSidebar
        role={role}
        variant={role === 'prof' ? 'avvocato' : undefined}
        user={demoUser}
        locked={false}
        active={selection ? { macro: selection.macro, item: selection.item } : null}
        onNav={handleNav}
      />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MainDashboard
          role={role}
          selection={selection}
          onBack={() => {
            if (selection?.item) setSelection({ ...selection, item: null });
            else setSelection(null);
          }}
          onNav={(dest: string) => { if (dest === 'upgrade') router.push('/upgrade'); }}
          onPickMacro={(key, label) => setSelection({ macro: key, macroLabel: label, item: null })}
          piano={piano}
        />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const [tab, setTab] = useState<TabId>('01');

  const tabs: { id: TabId; label: string; locked?: boolean }[] = [
    { id: '01', label: 'Chat' },
    { id: '02', label: 'Onboarding' },
    { id: '03', label: 'Dash · Cittadino', locked: true },
    { id: '04', label: 'Dash · Professionista', locked: true },
    { id: '05', label: 'Dash · Impresa', locked: true },
    { id: '06', label: 'API', locked: true },
    { id: '07', label: 'Su Misura', locked: true },
  ];

  const LockIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="1"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#13110F' }}>
      {/* ── Tab bar ── */}
      <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 12px', background: '#13110F', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', background: active ? 'rgba(246,242,234,0.08)' : 'transparent',
              border: `1px solid ${active ? 'rgba(212,74,42,0.5)' : 'transparent'}`,
              borderRadius: 6, cursor: 'pointer', fontFamily: T.sans, fontSize: 13,
              color: active ? '#F6F2EA' : '#756C5E',
              whiteSpace: 'nowrap', transition: 'all 0.15s ease',
              outline: active ? `1px solid rgba(212,74,42,0.3)` : 'none',
              outlineOffset: -1,
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#A89F90'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#756C5E'; }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: active ? T.v : '#5a5248', fontWeight: 500 }}>{t.id}</span>
              <span>{t.label}</span>
              {t.locked && <span style={{ color: '#5a5248', opacity: 0.7 }}><LockIcon /></span>}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', background: T.paper }}>
        {tab === '01' && <ChatScreen />}
        {tab === '02' && <OnboardingScreen onComplete={() => setTab('03')} />}
        {tab === '03' && <DashboardTab role="cittadino" demoUser={{ name: 'Marco Rossi', initials: 'MR', subtitle: 'CITTADINO · PIANO GRATUITO' }} />}
        {tab === '04' && <DashboardTab role="prof" demoUser={{ name: 'Avv. Giulia Mancini', initials: 'GM', subtitle: 'AVVOCATO · FORO DI ROMA' }} />}
        {tab === '05' && <DashboardTab role="impresa" demoUser={{ name: 'Acme SRL', initials: 'AC', subtitle: 'IMPRESA · MEDIA' }} />}
        {tab === '06' && <ApiScreen />}
        {tab === '07' && <EnterpriseScreen />}
      </div>
    </div>
  );
}
