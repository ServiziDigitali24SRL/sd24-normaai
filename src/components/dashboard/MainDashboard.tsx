"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import { Badge, WidgetCard, ComplianceScoreCircle, CountUp } from "./DashShared";

const DashboardCustom = dynamic(() => import("./DashboardCustom"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  key: string;
  label: string;
  score: number;
  done: number;
  total: number;
  tone: string;
  color: string;
  next: string;
}

interface Task {
  id: string;
  text: string;
  due: string;
  priority: string;
  done: boolean;
}

interface Deadline {
  date: string;
  text: string;
  urgent: boolean;
}

interface CheckItem {
  text: string;
  done: boolean;
}

interface DocItem {
  name: string;
  date: string;
  size: string;
  tags?: string[];
}

interface LiveTask {
  id: string;
  text: string;
  when: string;
  isNew: boolean;
}

interface Selection {
  macro: string;
  macroLabel: string;
  item: string | null;
}

interface MainDashboardProps {
  role: string;
  user?: Record<string, unknown> | null;
  selection?: Selection | null;
  onBack?: () => void;
  onNav?: (dest: string) => void;
  onPickMacro?: (macroKey: string, macroLabel: string) => void;
  piano?: string;
  impresa?: Record<string, unknown> | null;
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

const MD_BRANCHES: Record<string, Branch[]> = {
  impresa: [
    { key: 'privacy',   label: 'Privacy & GDPR', score: 78, done: 25, total: 32, tone: 'ok',     color: 'var(--alloro)',        next: 'Registro dei trattamenti — art. 30' },
    { key: 'lavoro',    label: 'Lavoro & HR',    score: 92, done: 17, total: 18, tone: 'ok',     color: 'oklch(0.55 0.14 145)', next: 'CCNL Commercio — aggiornamento 2026' },
    { key: 'fiscale',   label: 'Fiscale',        score: 64, done: 15, total: 24, tone: 'warn',   color: 'oklch(0.72 0.12 75)',  next: 'Dichiarazione IVA Q1' },
    { key: 'sicurezza', label: 'Sicurezza',      score: 85, done: 18, total: 21, tone: 'ok',     color: 'oklch(0.60 0.13 155)', next: 'DVR — revisione annuale' },
    { key: 'd231',      label: 'Modello 231',    score: 42, done: 16, total: 38, tone: 'accent', color: 'var(--vermiglio)',     next: 'Modello org.vo — D.Lgs. 24/2023' },
  ],
  cittadino: [
    { key: 'casa',        label: 'Casa',        score: 60,  done: 3, total: 5,  tone: 'warn',   color: 'oklch(0.72 0.12 75)', next: 'Rinnovo contratto locazione' },
    { key: 'fisco',       label: '730 / Fisco', score: 25,  done: 1, total: 4,  tone: 'accent', color: 'var(--vermiglio)',    next: 'Presentazione 730 entro 30 Set' },
    { key: 'consumatore', label: 'Consumi',     score: 80,  done: 4, total: 5,  tone: 'ok',     color: 'var(--alloro)',       next: 'Recesso Vodafone' },
    { key: 'famiglia',    label: 'Famiglia',    score: 100, done: 2, total: 2,  tone: 'ok',     color: 'var(--alloro)',       next: '—' },
    { key: 'veicoli',     label: 'Veicoli',     score: 50,  done: 1, total: 2,  tone: 'warn',   color: 'oklch(0.72 0.12 75)', next: 'Revisione auto — entro Lug' },
  ],
  prof: [
    { key: 'lead',      label: 'Marketplace Lead', score: 90, done: 9,  total: 10, tone: 'ok',     color: 'var(--vermiglio)',        next: '7 nuovi lead oggi' },
    { key: 'fascicoli', label: 'Fascicoli attivi', score: 72, done: 18, total: 25, tone: 'ok',     color: 'var(--alloro)',           next: 'Mem. difensiva — 28 Apr' },
    { key: 'clienti',   label: 'Clienti',          score: 88, done: 44, total: 50, tone: 'ok',     color: 'oklch(0.60 0.13 155)',    next: 'Rinnovo mandati' },
    { key: 'cfp',       label: 'Formazione CFP',   score: 40, done: 6,  total: 15, tone: 'accent', color: 'var(--vermiglio)',        next: 'Deontologia — 3 CFP' },
    { key: 'tariffe',   label: 'Parcelle',          score: 65, done: 13, total: 20, tone: 'warn',   color: 'oklch(0.72 0.12 75)',     next: 'Fattura n. 44 — scadenza' },
  ],
};

const MD_TASKS_BY_MACRO: Record<string, Task[]> = {
  privacy: [
    { id: 't1', text: 'Registro trattamenti art. 30', due: '30 Apr', priority: 'alta', done: false },
    { id: 't2', text: 'DPIA nuovo CRM', due: '15 Mag', priority: 'alta', done: false },
    { id: 't3', text: 'Cookie banner aggiornamento', due: '10 Mag', priority: 'media', done: false },
    { id: 't4', text: 'Contratto DPA fornitore cloud', due: '20 Mag', priority: 'media', done: false },
  ],
  lavoro: [
    { id: 't5', text: 'Rinnovo CCNL Commercio', due: '30 Apr', priority: 'alta', done: false },
    { id: 't6', text: 'Aggiornamento mansionari', due: '15 Giu', priority: 'bassa', done: false },
  ],
  fiscale: [
    { id: 't7', text: 'Dichiarazione IVA Q1', due: '30 Apr', priority: 'alta', done: false },
    { id: 't8', text: 'Registro corrispettivi', due: '15 Mag', priority: 'media', done: false },
  ],
  casa: [
    { id: 'c1', text: 'Rinnovo contratto locazione', due: '30 Giu', priority: 'media', done: false },
    { id: 'c2', text: 'Verbale assemblea condominio', due: '12 Mag', priority: 'bassa', done: false },
  ],
  fisco: [
    { id: 'f1', text: 'Raccogliere CU 2025', due: '30 Giu', priority: 'alta', done: false },
    { id: 'f2', text: 'Presentazione 730', due: '30 Set', priority: 'alta', done: false },
  ],
  fascicoli: [
    { id: 'p1', text: 'Mem. difensiva Rossi c/ INPS', due: '28 Apr', priority: 'alta', done: false },
    { id: 'p2', text: 'Atto citazione Bianchi', due: '15 Mag', priority: 'media', done: false },
  ],
  lead: [
    { id: 'l1', text: 'Revisione profilo directory', due: '—', priority: 'bassa', done: false },
    { id: 'l2', text: 'Follow-up L-2041', due: '3 Mag', priority: 'alta', done: false },
  ],
};

const MD_DEADLINES_BY_MACRO: Record<string, Deadline[]> = {
  privacy:   [{ date: '30 Apr', text: 'Rinnovo consensi marketing', urgent: true }, { date: '15 Mag', text: 'Audit annuale GDPR', urgent: false }],
  lavoro:    [{ date: '30 Apr', text: 'Versamento contributi INPS', urgent: true }],
  fiscale:   [{ date: '30 Apr', text: 'Liquidazione IVA', urgent: true }, { date: '16 Mag', text: 'F24 mensile', urgent: false }],
  casa:      [{ date: '30 Giu', text: 'Registrazione contratto', urgent: false }],
  fisco:     [{ date: '30 Set', text: 'Presentazione 730/Redditi', urgent: false }],
  fascicoli: [{ date: '28 Apr', text: 'Udienza Rossi c/ INPS', urgent: true }],
};

const MD_CHECKLIST_DEFAULT: CheckItem[] = [
  { text: 'Cookie policy pubblicata', done: true },
  { text: 'Banner cookie installato', done: true },
  { text: 'Registro consensi attivo', done: true },
  { text: 'Cookie tecnici mappati', done: false },
  { text: 'Cookie analytics configurati', done: false },
  { text: 'Cookie marketing audit', done: false },
  { text: 'Contratto DPA Google Analytics', done: false },
  { text: 'Verifica cookie terze parti', done: false },
];

const MD_DOCS: DocItem[] = [
  { name: 'contratto_aws_dpa.pdf',    date: '21 Apr 2026', size: '156 KB', tags: ['#contratto', '#dpa', '#aws'] },
  { name: 'privacy_shield_cert.pdf',  date: '10 Mar 2026', size: '89 KB',  tags: ['#privacy', '#cert'] },
  { name: 'scc_google_analytics.pdf', date: '5 Gen 2026',  size: '201 KB', tags: ['#scc', '#analytics'] },
];

const MD_NORMATIVA = [
  { label: 'Reg. UE 2016/679 art. 6' },
  { label: 'Dir. ePrivacy 2002/58/CE' },
  { label: 'Provv. Garante 10 giugno 2021' },
  { label: 'Linee guida EDPB 05/2020' },
];

const MD_TEMPLATES = [
  { name: 'Cookie Policy',     ext: 'DOCX' },
  { name: 'Informativa breve', ext: 'TXT' },
  { name: 'Registro consensi', ext: 'XLSX' },
];

const MD_CHAT_SUGGESTIONS: Record<string, string[]> = {
  impresa:  ['Genera DPIA per nuovo CRM', 'Revisiona NDA fornitore', 'Checklist audit GDPR', 'Mail al DPO', 'Verifica Mod. 231 vs D.Lgs. 24/2023'],
  cittadino:['Spiegami il 730 in breve', 'Come recedere da Vodafone', 'Calcola mia tariffa TARI', 'Verbale assemblea condominio'],
  prof:     ['Bozza memoria difensiva', 'Atto di citazione — locazione', 'Parere D.Lgs. 231/2001', 'Email cliente follow-up'],
};

const MD_LEADS = [
  { id: 'L-2041', title: 'Separazione coniugale',         city: 'Roma',   budget: '€2.500', tier: 'MEDIO' },
  { id: 'L-2042', title: 'Sfratto inquilino moroso',      city: 'Milano', budget: '€1.800', tier: 'ALTO' },
  { id: 'L-2043', title: 'Revisione contratto fornitura', city: 'Torino', budget: '€3.200', tier: 'ALTO' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function MDToast({ toast }: { toast: string | null }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 200,
      background: 'var(--ink)', color: 'var(--paper)',
      padding: '12px 18px', borderRadius: 8, boxShadow: 'var(--shadow-3)',
      fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mdToastIn 0.2s ease-out', maxWidth: 360,
    }}>
      <span style={{ color: 'var(--alloro)' }}>✓</span> {toast}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function MDConfetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 80 });
  const colors = ['var(--vermiglio)', 'var(--alloro)', 'var(--ambra)', 'var(--ink)', 'oklch(0.55 0.14 145)'];
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300, overflow: 'hidden' }}>
      {particles.map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: Math.random() * 100 + '%',
          top: -20,
          width: 8 + Math.random() * 6,
          height: 8 + Math.random() * 6,
          background: colors[i % colors.length],
          borderRadius: Math.random() > 0.5 ? '50%' : 1,
          animation: `mdConfettiFall ${2 + Math.random() * 1.5}s ease-in forwards`,
          animationDelay: (Math.random() * 0.5) + 's',
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────

function DashboardHome({ role, user, score, branches, onPickMacro, onOpenChat, pushToast }: {
  role: string;
  user?: Record<string, unknown> | null;
  score: number;
  branches: Branch[];
  onPickMacro: (key: string, label: string) => void;
  onOpenChat: (ctx?: string) => void;
  pushToast: (m: string) => void;
}) {
  const suggestions = MD_CHAT_SUGGESTIONS[role] || MD_CHAT_SUGGESTIONS.impresa;
  const imp = user?.imp as Record<string, unknown> | undefined;
  const avv = user?.avv as Record<string, unknown> | undefined;
  const profile = user?.profile as Record<string, unknown> | undefined;

  const heroLabel = role === 'impresa'
    ? `Dashboard Impresa · ${((imp?.dimensione as string) || 'MEDIA').toUpperCase()} · ${(imp?.dipendenti as string) || '48'} dipendenti`
    : role === 'prof'
    ? `Dashboard Professionista · ${(avv?.role as string) || 'Avvocato'} · Foro di ${(avv?.foro as string) || 'Roma'}`
    : `Dashboard Cittadino · ${(profile?.citta as string) || 'Milano'}`;

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Breadcrumb / label */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 18 }}>
        {heroLabel}
      </div>

      {/* HERO SCORE */}
      <section style={{
        background: 'white', border: '1px solid var(--paper-line)', borderRadius: 12,
        padding: '32px 36px', marginBottom: 28,
        display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10 }}>
            Compliance Score Globale
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <CountUp value={score} duration={800} style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(64px, 9vw, 96px)', lineHeight: 0.9, fontWeight: 400, letterSpacing: '-0.03em' }} />
            <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink-4)' }}>/100</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--alloro)' }}>
              <Icon name="arrowUp" size={11} /> +4 dal mese scorso
            </span>
            <Badge tone={score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'accent'}>
              Rischio {score >= 80 ? 'basso' : score >= 60 ? 'medio-basso' : 'alto'}
            </Badge>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Ultimo audit · 14 Mar 2026
            </span>
          </div>
        </div>
        <ComplianceScoreCircle score={score} size={140} stroke={12} />
      </section>

      {/* SEGMENTED PROGRESS BAR */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10 }}>
          Rami di conformità
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--paper-line)', background: 'var(--paper-2)' }}>
          {branches.map(b => (
            <div key={b.key} title={`${b.label} — ${b.score}%`} style={{
              flex: 1,
              background: `linear-gradient(90deg, ${b.color} ${b.score}%, transparent ${b.score}%)`,
              borderRight: '1px solid rgba(255,255,255,0.6)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 6 }}>
          {branches.map(b => (
            <div key={b.key} style={{ flex: 1, fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
              {b.label.toUpperCase()} {b.score}%
            </div>
          ))}
        </div>
      </div>

      {/* BRANCH CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${branches.length}, 1fr)`, gap: 14, marginBottom: 32 }}>
        {branches.map(b => (
          <button key={b.key} onClick={() => onPickMacro(b.key, b.label)} style={{
            textAlign: 'left', cursor: 'pointer',
            background: 'white', border: '1px solid var(--paper-line)', borderRadius: 10,
            padding: 18, fontFamily: 'var(--sans)',
            transition: 'all 0.18s ease', borderTop: `3px solid ${b.color}`,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{b.label}</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 28, letterSpacing: '-0.02em' }}>{b.score}<span style={{ fontSize: 14, color: 'var(--ink-4)' }}>%</span></span>
            </div>
            <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: b.score + '%', height: '100%', background: b.color, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 8 }}>
              {b.done}/{b.total} voci
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--paper-line)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Prossima</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.4 }}>{b.next}</div>
            </div>
          </button>
        ))}
      </div>

      {/* CHAT COMPLIANCE */}
      <section style={{ background: 'var(--paper-tint)', border: '1px solid var(--paper-line)', borderRadius: 12, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--vermiglio)', fontStyle: 'italic' }}>§</span>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.02em' }}>Chat Compliance</h2>
        </div>
        <p style={{ margin: '0 0 18px', color: 'var(--ink-3)', fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
          L&apos;AI che conosce la Sua azienda, il Suo settore e la normativa in vigore.
        </p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { onOpenChat(s); pushToast('Chat aperta con prompt pre-compilato'); }} style={{
              flex: '0 0 auto', padding: '10px 14px', background: 'white',
              border: '1px solid var(--paper-line)', borderRadius: 999,
              fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink-2)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-2)'; (e.currentTarget as HTMLElement).style.background = 'var(--paper-tint)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--paper-line)'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
            >{s}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => onOpenChat()}>
          <Icon name="chat" size={13} /> Apri Chat Compliance
        </button>
      </section>
    </div>
  );
}

// ─── Macro Overview ───────────────────────────────────────────────────────────

function MacroOverview({ role, macroKey, macroLabel, onBack, onOpenChat, tasks, onToggleTask, deadlines, pushToast }: {
  role: string; macroKey: string; macroLabel: string;
  onBack: () => void; onOpenChat: (ctx?: string) => void;
  tasks: Task[]; onToggleTask: (id: string) => void;
  deadlines: Deadline[]; pushToast: (m: string) => void;
}) {
  const branch = (MD_BRANCHES[role] || []).find(b => b.key === macroKey) || { score: 70, color: 'var(--ink-3)' };
  const branchScore = 'score' in branch ? (branch as Branch).score : 70;
  const branchColor = branch.color;

  return (
    <div style={{ padding: '24px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
        color: 'var(--ink-4)', textTransform: 'uppercase', padding: 0, marginBottom: 14,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span>Dashboard</span> <span style={{ color: 'var(--ink-5)' }}>›</span> <span style={{ color: 'var(--ink-2)' }}>{macroLabel}</span>
      </button>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4.2vw, 44px)', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {macroLabel} <em style={{ color: 'var(--ink-4)' }}>— {branchScore}%</em>
          </h1>
          <div style={{ height: 8, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden', maxWidth: 520 }}>
            <div style={{ width: branchScore + '%', height: '100%', background: branchColor, transition: 'width 0.8s ease' }} />
          </div>
        </div>
        <ComplianceScoreCircle score={branchScore} size={96} stroke={8} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <WidgetCard title={`Task aperti (${tasks.filter(t => !t.done).length})`} icon="check" accent="var(--ink)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tasks.slice(0, 8).map(t => (
              <div key={t.id}
                onClick={() => { onToggleTask(t.id); pushToast(t.done ? 'Task riaperto' : '✓ Task completato · Score +2%'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid var(--paper-line)', opacity: t.done ? 0.55 : 1, transition: 'opacity 0.2s' }}
              >
                <span style={{
                  width: 16, height: 16, border: `1.5px solid ${t.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
                  borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: t.done ? 'var(--alloro)' : 'transparent', flexShrink: 0, transition: 'all 0.15s ease',
                }}>
                  {t.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3 3 7-7"/></svg>}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: t.done ? 'var(--ink-4)' : 'var(--ink-1)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                {t.due !== '—' && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{t.due}</span>}
                {t.priority === 'alta' && !t.done && <Badge tone="accent">ALTA</Badge>}
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title={`Scadenze prossime 30gg (${deadlines.length})`} icon="clock">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {deadlines.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < deadlines.length - 1 ? '1px solid var(--paper-line)' : 'none', position: 'relative', paddingLeft: 18 }}>
                <span style={{ position: 'absolute', left: 4, top: 18, width: 8, height: 8, borderRadius: '50%', background: d.urgent ? 'var(--vermiglio)' : 'var(--ink-4)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{d.text}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em', marginTop: 2 }}>{d.date}</div>
                </div>
                {d.urgent && <Badge tone="accent">URGENTE</Badge>}
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <button onClick={() => onOpenChat()} className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 14 }}>
        <Icon name="chat" size={14} /> Apri Chat Compliance su {macroLabel}
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>→</span>
      </button>
    </div>
  );
}

// ─── Subcategory Detail ───────────────────────────────────────────────────────

function SubcategoryDetail({ macroLabel, itemLabel, checklist, onToggleCheck, onBack, onOpenChat, onUpload, pushToast, documents }: {
  macroLabel: string; itemLabel: string;
  checklist: CheckItem[]; onToggleCheck: (i: number) => void;
  onBack: () => void; onOpenChat: (ctx?: string) => void;
  onUpload: () => void; pushToast: (m: string) => void;
  documents: DocItem[];
}) {
  const doneCount = checklist.filter(c => c.done).length;

  return (
    <div style={{ padding: '24px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
        color: 'var(--ink-4)', textTransform: 'uppercase', padding: 0, marginBottom: 14,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span>{macroLabel}</span> <span style={{ color: 'var(--ink-5)' }}>›</span> <span style={{ color: 'var(--ink-2)' }}>{itemLabel}</span>
      </button>

      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(26px, 4vw, 40px)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, minWidth: 0 }}>{itemLabel}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{doneCount}/{checklist.length} COMPLETATE</span>
          <div style={{ width: 80, height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: checklist.length ? (doneCount / checklist.length) * 100 + '%' : '0%', height: '100%', background: 'var(--alloro)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <WidgetCard title={`Documenti caricati (${documents.length})`} icon="doc"
          action={<button onClick={onUpload} style={{ background: 'transparent', border: 'none', color: 'var(--vermiglio-ink)', fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>+ Carica</button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {documents.map((d, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < documents.length - 1 ? '1px solid var(--paper-line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 40, borderRadius: 3, border: '1px solid var(--paper-line)', background: 'var(--paper-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--ink-4)' }}>PDF</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 2 }}>{d.date} · {d.size}</div>
                  {d.tags && <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                    {d.tags.map(t => <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--paper-2)', padding: '1px 5px', borderRadius: 2 }}>{t}</span>)}
                  </div>}
                </div>
                <button style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '4px 10px', fontSize: 10.5, fontFamily: 'var(--sans)', color: 'var(--ink-3)', cursor: 'pointer' }}>Apri</button>
              </div>
            ))}
          </div>
          <button onClick={onUpload} style={{ width: '100%', marginTop: 12, padding: 10, border: '1px dashed var(--paper-line)', borderRadius: 6, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="paperclip" size={12} /> Carica nuovo documento
          </button>
        </WidgetCard>

        <WidgetCard title="Scadenze estratte automaticamente (2)" icon="clock" accent="var(--vermiglio)">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { date: '31 Dic 2026', text: 'Rinnovo DPA AWS', src: 'contratto_aws_dpa.pdf' },
              { date: '15 Giu 2026', text: 'Verifica SCC Google', src: 'scc_google_analytics.pdf' },
            ].map((d, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < 1 ? '1px solid var(--paper-line)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{d.text}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--vermiglio-ink)', letterSpacing: '0.08em' }}>{d.date}</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginTop: 4, fontStyle: 'italic' }}>estratto da {d.src}</div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <WidgetCard title="Normativa di riferimento" icon="book">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MD_NORMATIVA.map((n, i) => (
              <a key={i} href="#" onClick={(e) => { e.preventDefault(); pushToast('Apertura rif. normativo'); }} style={{
                padding: '9px 0', borderBottom: i < MD_NORMATIVA.length - 1 ? '1px solid var(--paper-line)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, color: 'var(--ink-2)', textDecoration: 'none',
              }}>
                <span style={{ color: 'var(--vermiglio)' }}>→</span> {n.label}
              </a>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Template e modelli" icon="download">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MD_TEMPLATES.map((t, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < MD_TEMPLATES.length - 1 ? '1px solid var(--paper-line)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{t.name}</span>
                <button onClick={() => pushToast(`Scaricato ${t.name}.${t.ext}`)} style={{ background: 'var(--paper-2)', border: 'none', padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--ink-2)' }}>
                  {t.ext} ↓
                </button>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      <WidgetCard title={`Checklist operativa (${doneCount}/${checklist.length} completate)`} icon="check" accent="var(--alloro)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {checklist.map((c, i) => (
            <div key={i} onClick={() => onToggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', opacity: c.done ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${c.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
                background: c.done ? 'var(--alloro)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>
                {c.done && <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3 3 7-7"/></svg>}
              </span>
              <span style={{ fontSize: 13, color: c.done ? 'var(--ink-4)' : 'var(--ink-1)', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
            </div>
          ))}
        </div>
      </WidgetCard>

      <button onClick={() => onOpenChat()} className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 14, marginTop: 18 }}>
        <Icon name="chat" size={14} /> Chiedi all&apos;AI su {itemLabel}
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>→</span>
      </button>
    </div>
  );
}

// ─── Chat Compliance Expanded ─────────────────────────────────────────────────

function ChatComplianceExpanded({ role: _role, context, onClose, score, pushToast }: {
  role: string; context: string;
  onClose: () => void; score: number; pushToast: (m: string) => void;
}) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: context ? `Sono pronta ad assisterla su "${context}". Come posso essere utile?` : 'Buongiorno. In cosa posso esserle utile oggi?' },
  ]);
  const [input, setInput] = useState('');
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setTimeout(() => {
      setMessages(m => [...m, { role: 'ai', text: `Ho analizzato "${q}". In base al Suo profilo e al contesto, Le suggerisco di procedere per punti. Genero un task operativo.` }]);
      const newTask: LiveTask = { id: 'nt-' + Date.now(), text: q.slice(0, 40), when: 'adesso', isNew: true };
      setLiveTasks(t => [newTask, ...t]);
      pushToast(`✓ Task aggiunto: ${newTask.text}`);
      setTimeout(() => setLiveTasks(t => t.map(x => x.id === newTask.id ? { ...x, isNew: false } : x)), 5000);
    }, 900);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--paper)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: widgetOpen ? '1px solid var(--paper-line)' : 'none' }}>
        <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: '4px 8px', borderRadius: 4, fontFamily: 'var(--sans)' }}>← Torna alla dashboard</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chat Compliance</div>
            {context && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, fontFamily: 'var(--sans)' }}>Contesto: {context}</div>}
          </div>
          <button onClick={() => setWidgetOpen(w => !w)} style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--sans)' }}>
            {widgetOpen ? '☰ Nascondi' : '☰ Mostra'} pannello
          </button>
        </header>

        <div ref={scrollerRef} style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 24, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: m.role === 'user' ? 'var(--ink)' : 'var(--paper-tint)',
                  color: m.role === 'user' ? 'var(--paper)' : 'var(--ink-2)',
                  border: m.role === 'ai' ? '1px solid var(--paper-line)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 14, fontStyle: 'italic',
                }}>{m.role === 'user' ? 'M' : '§'}</div>
                <div style={{
                  maxWidth: 540,
                  background: m.role === 'user' ? 'var(--ink)' : 'white',
                  color: m.role === 'user' ? 'var(--paper)' : 'var(--ink-1)',
                  border: m.role === 'ai' ? '1px solid var(--paper-line)' : 'none',
                  padding: '12px 16px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.55, fontFamily: 'var(--sans)',
                }}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--paper-line)', padding: 20, background: 'white' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <button onClick={() => pushToast('Apri selezione file')} style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 8, padding: 10, cursor: 'pointer', color: 'var(--ink-3)' }}>
              <Icon name="paperclip" size={14} />
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Chieda qualcosa…" rows={1}
              style={{ flex: 1, resize: 'none', padding: '12px 16px', border: '1px solid var(--paper-line)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--sans)', background: 'var(--paper-tint)', outline: 'none' }}
            />
            <button onClick={send} className="btn btn-primary" disabled={!input.trim()}>
              <Icon name="send" size={12} /> Invia
            </button>
          </div>
        </div>
      </div>

      {widgetOpen && (
        <aside style={{ width: 320, flexShrink: 0, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--paper-tint)' }}>
          <WidgetCard title="Score real-time" icon="graph">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ComplianceScoreCircle score={score} size={68} stroke={6} />
              <div>
                <CountUp value={score} style={{ fontFamily: 'var(--serif)', fontSize: 36, letterSpacing: '-0.02em' }} />
                <span style={{ color: 'var(--ink-4)', fontSize: 14 }}> /100</span>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Aggiornato live</div>
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title={`Task generati (${liveTasks.length})`} icon="plus">
            {liveTasks.length === 0 ? (
              <p style={{ color: 'var(--ink-4)', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Nessun task generato ancora. Scriva una richiesta all&apos;AI.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {liveTasks.map(t => (
                  <div key={t.id} style={{ padding: '10px 12px', background: 'white', border: '1px solid var(--paper-line)', borderRadius: 6, animation: 'mdSlideIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.text}</span>
                      {t.isNew && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', background: 'var(--vermiglio)', color: 'white', borderRadius: 3, animation: 'mdPulse 1s ease-in-out 2' }}>NUOVO</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginTop: 4, letterSpacing: '0.08em' }}>Generato {t.when}</div>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>

          <WidgetCard title="Scadenze suggerite" icon="clock">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MD_DEADLINES_BY_MACRO.privacy.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i === 0 ? '1px solid var(--paper-line)' : 'none' }}>
                  <span style={{ fontSize: 12 }}>{d.text}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: d.urgent ? 'var(--vermiglio-ink)' : 'var(--ink-4)' }}>{d.date}</span>
                </div>
              ))}
            </div>
          </WidgetCard>

          <WidgetCard title="Documenti referenziati" icon="doc">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {MD_DOCS.slice(0, 2).map((d, i) => (
                <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-2)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="doc" size={11} /> {d.name}
                </div>
              ))}
            </div>
          </WidgetCard>
        </aside>
      )}
    </div>
  );
}

// ─── Upload Doc Modal ─────────────────────────────────────────────────────────

function UploadDocModal({ onClose, onConfirm, pushToast }: { onClose: () => void; onConfirm: (name: string) => void; pushToast: (m: string) => void }) {
  const [phase, setPhase] = useState<'select' | 'analyzing' | 'result'>('select');
  const [fileName] = useState('contratto_aws_dpa.pdf');

  const start = () => {
    setPhase('analyzing');
    setTimeout(() => setPhase('result'), 1400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(19,17,15,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 40 }}>
      <div style={{ background: 'var(--paper)', borderRadius: 14, width: 'min(560px, 100%)', padding: 36, boxShadow: 'var(--shadow-3)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <Icon name="close" size={16} />
        </button>
        {phase === 'select' && (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8 }}>Carica documento</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: '0 0 14px', letterSpacing: '-0.02em' }}>L&apos;AI analizza e classifica automaticamente.</h2>
            <div style={{ padding: 32, border: '2px dashed var(--paper-line)', borderRadius: 10, textAlign: 'center', background: 'white', marginTop: 16 }}>
              <Icon name="paperclip" size={24} />
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>Trascini un file qui o</div>
              <button onClick={start} className="btn btn-primary" style={{ marginTop: 12 }}>Selezioni un file</button>
            </div>
          </>
        )}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 20px', border: '3px solid var(--paper-line)', borderTopColor: 'var(--vermiglio)', borderRadius: '50%', animation: 'mdSpin 0.8s linear infinite' }} />
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '0 0 8px' }}>Analizzo documento…</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--sans)' }}>{fileName}</p>
            <div style={{ height: 3, background: 'var(--paper-line)', borderRadius: 2, marginTop: 18, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: 'var(--vermiglio)', animation: 'mdProgress 1.4s ease-in-out' }} />
            </div>
          </div>
        )}
        {phase === 'result' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, color: 'var(--alloro)' }}>
              <Icon name="check" size={16} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Documento analizzato</div>
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '8px 0 16px', letterSpacing: '-0.02em' }}>{fileName}</h2>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 12.5, fontFamily: 'var(--sans)' }}>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Tipo</dt>
              <dd style={{ margin: 0 }}>Data Processing Agreement</dd>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Parti</dt>
              <dd style={{ margin: 0 }}>Acme SRL ↔ AWS</dd>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Scadenza</dt>
              <dd style={{ margin: 0 }}><strong>31 Dic 2026</strong></dd>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Categoria</dt>
              <dd style={{ margin: 0 }}>Privacy & GDPR › Trasferimenti extra-UE</dd>
            </dl>
            <div style={{ marginTop: 18, padding: 14, background: 'var(--paper-tint)', borderRadius: 8, border: '1px solid var(--paper-line)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Task generato</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--sans)' }}>☐ Rinnovo DPA AWS — 30 Nov 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Modifica</button>
              <button onClick={() => { onConfirm(fileName); pushToast('📄 Documento classificato in Privacy & GDPR'); }} className="btn btn-primary" style={{ flex: 1 }}>Conferma</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ role, user, onNav, collapsed, onToggle }: {
  role: string;
  user?: Record<string, unknown> | null;
  onNav?: (dest: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const imp = user?.imp as Record<string, unknown> | undefined;
  const planLabel =
    role === 'impresa' ? ((imp?.dimensione as string) || 'media').toUpperCase()
    : role === 'prof'  ? 'Piano Avvocato'
    : 'Piano Gratuito';

  if (collapsed) {
    return (
      <aside style={{ width: 44, flexShrink: 0, borderLeft: '1px solid var(--paper-line)', background: 'var(--paper-tint)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 14 }}>
        <button onClick={onToggle} title="Espandi pannello" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 6 }}>
          <Icon name="arrow" size={14} />
        </button>
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>
          {planLabel}
        </div>
      </aside>
    );
  }

  return (
    <aside style={{ width: 260, flexShrink: 0, borderLeft: '1px solid var(--paper-line)', background: 'var(--paper-tint)', padding: 18, overflow: 'auto', position: 'relative' }}>
      <button onClick={onToggle} title="Comprimi pannello" style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, zIndex: 2 }}>
        <Icon name="close" size={12} />
      </button>
      <WidgetCard title="Abbonamento">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Piano attuale</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '-0.02em', marginBottom: 10 }}>{planLabel}</div>
        {role === 'impresa' && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>10–49 dipendenti · €79/mese</div>}
        <button onClick={() => onNav?.('upgrade')} className="btn btn-accent" style={{ width: '100%', marginTop: 14 }}>
          <Icon name="bolt" size={12} /> Upgrade piano
        </button>
      </WidgetCard>

      {role === 'prof' && (
        <div style={{ marginTop: 14 }}>
          <WidgetCard title="Lead marketplace" icon="flame" accent="var(--vermiglio)">
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Nuovi oggi</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 32, margin: '4px 0 10px' }}>7</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MD_LEADS.slice(0, 2).map(l => (
                <div key={l.id} style={{ padding: 10, background: 'white', borderRadius: 6, border: '1px solid var(--paper-line)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, fontFamily: 'var(--sans)' }}>{l.title}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{l.city.toUpperCase()} · {l.budget} · {l.tier}</div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '5px 8px', fontSize: 11 }}>Acquista</button>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>
      )}

      {role === 'cittadino' && (
        <div style={{ marginTop: 14 }}>
          <WidgetCard title="Hai bisogno di aiuto?" icon="users" accent="var(--alloro)">
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 10px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>Per casi complessi, un professionista verificato può assisterLa.</p>
            <button onClick={() => onNav?.('prof')} className="btn btn-ghost" style={{ width: '100%', fontSize: 11.5 }}>Trova professionista</button>
          </WidgetCard>
        </div>
      )}
    </aside>
  );
}

// ─── Main Dashboard (container) ───────────────────────────────────────────────

export default function MainDashboard({ role, user, selection, onBack, onNav, onPickMacro, piano: _piano, impresa: _impresa }: MainDashboardProps) {
  const [score, setScore] = useState(76);
  const [toast, setToast] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [chatCtx, setChatCtx] = useState<string | null>(null);
  const [rightCollapsed, setRightCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1200);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tasks, setTasks] = useState(MD_TASKS_BY_MACRO);
  const [checklist, setChecklist] = useState(MD_CHECKLIST_DEFAULT);
  const [documents, setDocuments] = useState(MD_DOCS);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 1100) setRightCollapsed(true); };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pushToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const openChat = (ctx?: string) => setChatCtx(ctx || selection?.item || selection?.macro || 'generale');
  const closeChat = () => setChatCtx(null);

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = next[k].map(t => t.id === id ? { ...t, done: !t.done } : t);
      }
      return next;
    });
    setScore(s => Math.min(100, s + 2));
  };

  const toggleCheck = (i: number) => {
    setChecklist(prev => {
      const next = prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c);
      const all = next.every(c => c.done);
      if (all) {
        setConfetti(true);
        pushToast('🎉 Checklist completata al 100%!');
        setTimeout(() => setConfetti(false), 3000);
      } else {
        pushToast('✓ Task completato · Score +2%');
      }
      return next;
    });
    setScore(s => Math.min(100, s + 2));
  };

  const confirmUpload = (name: string) => {
    setDocuments(d => [{ name, date: '21 Apr 2026', size: '156 KB', tags: ['#nuovo'] }, ...d]);
    setUploadOpen(false);
    setScore(s => Math.min(100, s + 3));
  };

  const branches = MD_BRANCHES[role] || MD_BRANCHES.impresa;

  if (chatCtx) {
    return (
      <>
        <ChatComplianceExpanded role={role} context={chatCtx} onClose={closeChat} score={score} pushToast={pushToast} />
        <MDToast toast={toast} />
      </>
    );
  }

  let content: React.ReactNode;
  if (selection && selection.macro === '__dashboard__') {
    content = <DashboardCustom role={role} user={user} onOpenChat={openChat} pushToast={pushToast} />;
  } else if (!selection || !selection.macro) {
    content = (
      <DashboardHome
        role={role} user={user} score={score} branches={branches}
        onPickMacro={(key, label) => onPickMacro?.(key, label)}
        onOpenChat={openChat} pushToast={pushToast}
      />
    );
  } else if (!selection.item) {
    content = (
      <MacroOverview
        role={role}
        macroKey={selection.macro}
        macroLabel={selection.macroLabel}
        onBack={onBack || (() => {})}
        onOpenChat={openChat}
        tasks={tasks[selection.macro] || tasks.privacy || []}
        onToggleTask={toggleTask}
        deadlines={MD_DEADLINES_BY_MACRO[selection.macro] || MD_DEADLINES_BY_MACRO.privacy || []}
        pushToast={pushToast}
      />
    );
  } else {
    content = (
      <SubcategoryDetail
        macroLabel={selection.macroLabel}
        itemLabel={selection.item}
        checklist={checklist}
        onToggleCheck={toggleCheck}
        onBack={onBack || (() => {})}
        onOpenChat={openChat}
        onUpload={() => setUploadOpen(true)}
        pushToast={pushToast}
        documents={documents}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{content}</main>
        <RightPanel role={role} user={user} onNav={onNav} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(c => !c)} />
      </div>
      {uploadOpen && <UploadDocModal onClose={() => setUploadOpen(false)} onConfirm={confirmUpload} pushToast={pushToast} />}
      <MDToast toast={toast} />
      <MDConfetti active={confetti} />
    </>
  );
}
