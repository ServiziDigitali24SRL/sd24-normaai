"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import { Badge, WidgetCard, ComplianceScoreCircle, CountUp } from "./DashShared";
import FixedChatBar from "./FixedChatBar";
import ChatSlidePanel from "./ChatSlidePanel";

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

// ─── Subcategory Detail — 6 widget, layout 2 colonne ─────────────────────────

// Mock data per i nuovi widget
const NBA_BY_MACRO: Record<string, { icon: string; text: string; action: string }[]> = {
  casa: [
    { icon: '📋', text: 'Rinnovo contratto in scadenza il 31 Dic', action: 'Genera bozza di rinnovo' },
    { icon: '⚠️', text: 'Clausola rescissione potenzialmente nulla', action: 'Analizza clausola' },
    { icon: '📅', text: 'Registrazione contratto non completata', action: 'Guida alla registrazione' },
  ],
  fisco: [
    { icon: '📋', text: '730 da presentare entro il 30 Settembre', action: 'Prepara documentazione' },
    { icon: '💰', text: 'Possibile detrazione non sfruttata — bonus ristrutturazione', action: 'Verifica detrazioni' },
    { icon: '⚠️', text: 'Scadenza F24 il 16 Maggio', action: 'Calcola importo' },
  ],
  lavoro: [
    { icon: '📋', text: 'Lettera di contestazione ricevuta — risposta entro 5gg', action: 'Prepara risposta' },
    { icon: '⚠️', text: 'Ore straordinari non retribuiti negli ultimi 3 mesi', action: 'Calcola credito' },
    { icon: '📅', text: 'Scadenza periodo di prova il 15 Maggio', action: 'Verifica posizione' },
  ],
  privacy: [
    { icon: '🔒', text: 'Registro trattamenti non aggiornato da 6 mesi', action: 'Aggiorna registro' },
    { icon: '⚠️', text: 'Cookie banner non conforme EDPB 05/2020', action: 'Verifica conformità' },
    { icon: '📋', text: 'DPA con Google Analytics non firmato', action: 'Genera DPA' },
  ],
  default: [
    { icon: '📋', text: 'Documenti caricati analizzati — 2 criticità trovate', action: 'Vedi analisi' },
    { icon: '⚠️', text: 'Scadenza normativa entro 30 giorni', action: 'Verifica scadenza' },
    { icon: '💡', text: 'Aggiornamento normativo rilevante per questa area', action: 'Leggi aggiornamento' },
  ],
};

const CRONOLOGIA_BY_MACRO: Record<string, { text: string; date: string; isVoice: boolean }[]> = {
  casa: [
    { text: 'Quando scade il mio contratto di locazione 4+4?', date: '21 Apr', isVoice: false },
    { text: 'Come contestare un aumento di canone non concordato?', date: '18 Apr', isVoice: true },
    { text: 'Quali documenti servono per registrare il contratto?', date: '12 Apr', isVoice: false },
  ],
  fisco: [
    { text: 'Quali spese posso detrarre nel 730?', date: '20 Apr', isVoice: false },
    { text: 'Cos\'è il bonus 110% e come funziona per il condominio?', date: '15 Apr', isVoice: true },
  ],
  lavoro: [
    { text: 'Cosa fare in caso di licenziamento senza giusta causa?', date: '19 Apr', isVoice: false },
    { text: 'Come si calcola il TFR?', date: '16 Apr', isVoice: false },
    { text: 'Posso rifiutare il trasferimento in altra sede?', date: '10 Apr', isVoice: true },
  ],
  privacy: [
    { text: 'Come fare una DPIA per il nuovo CRM?', date: '22 Apr', isVoice: false },
    { text: 'Quando è obbligatorio nominare il DPO?', date: '19 Apr', isVoice: false },
  ],
  default: [
    { text: 'Quali sono le norme di riferimento per questa area?', date: '21 Apr', isVoice: false },
    { text: 'Come posso migliorare il mio score di compliance?', date: '18 Apr', isVoice: true },
  ],
};

// Sottocategorie con marketplace professionisti (avvocato/commercialista)
const SUBCATEGORY_HAS_MARKETPLACE: Record<string, boolean> = {
  casa: true, famiglia: true, lavoro: true, consumatore: true,
  fisco: true, salute: true, veicoli: true, pa: true,
  // impresa
  societario: true, d231: true, contratti: true, appalti: true,
  fiscale: true, aml: true, antitrust: true, crisi: true,
};

const PROF_BY_MACRO: Record<string, { initial: string; name: string; spec: string; city: string; rating: number; reviews: number }> = {
  casa:       { initial: 'M', name: 'M. R***', spec: 'Avvocato — Diritto immobiliare', city: 'Roma', rating: 4.8, reviews: 34 },
  famiglia:   { initial: 'L', name: 'L. B***', spec: 'Avvocato — Diritto di famiglia', city: 'Milano', rating: 4.6, reviews: 22 },
  lavoro:     { initial: 'G', name: 'G. F***', spec: 'Avvocato — Diritto del lavoro', city: 'Torino', rating: 4.9, reviews: 57 },
  fisco:      { initial: 'A', name: 'A. M***', spec: 'Commercialista', city: 'Roma', rating: 4.7, reviews: 41 },
  consumatore:{ initial: 'S', name: 'S. V***', spec: 'Avvocato — Diritto del consumatore', city: 'Milano', rating: 4.5, reviews: 18 },
  veicoli:    { initial: 'P', name: 'P. C***', spec: 'Avvocato — Ricorsi e sanzioni', city: 'Napoli', rating: 4.3, reviews: 29 },
  salute:     { initial: 'R', name: 'R. T***', spec: 'Avvocato — Malasanità e previdenza', city: 'Bologna', rating: 4.7, reviews: 16 },
  pa:         { initial: 'E', name: 'E. D***', spec: 'Avvocato — Diritto amministrativo', city: 'Roma', rating: 4.8, reviews: 38 },
  fiscale:    { initial: 'C', name: 'C. B***', spec: 'Commercialista — Fiscalità d\'impresa', city: 'Milano', rating: 4.9, reviews: 62 },
  contratti:  { initial: 'N', name: 'N. R***', spec: 'Avvocato — Contrattualistica', city: 'Roma', rating: 4.6, reviews: 25 },
  d231:       { initial: 'F', name: 'F. M***', spec: 'Avvocato — D.Lgs 231/2001', city: 'Milano', rating: 4.8, reviews: 19 },
  appalti:    { initial: 'V', name: 'V. S***', spec: 'Avvocato — Appalti pubblici', city: 'Roma', rating: 4.5, reviews: 14 },
};

type ProfiloState = 'empty' | 'pending' | 'active';

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < full ? '#D4A017' : (i === full && half ? '#D4A017' : 'var(--paper-line)') }}>
          {i < full ? '★' : (i === full && half ? '⯨' : '☆')}
        </span>
      ))}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 2 }}>
        {rating.toFixed(1)} · {count} rec.
      </span>
    </div>
  );
}

function SubcategoryDetail({ macroKey, macroLabel, itemLabel, checklist, onToggleCheck, onBack, onOpenChat, onUpload, pushToast, documents, isPro }: {
  macroKey: string; macroLabel: string; itemLabel: string;
  checklist: CheckItem[]; onToggleCheck: (i: number) => void;
  onBack: () => void; onOpenChat: (ctx?: string) => void;
  onUpload: () => void; pushToast: (m: string) => void;
  documents: DocItem[]; isPro?: boolean;
}) {
  const doneCount = checklist.filter(c => c.done).length;
  const subScore = Math.round(55 + (doneCount / Math.max(checklist.length, 1)) * 45);
  const hasMarketplace = SUBCATEGORY_HAS_MARKETPLACE[macroKey] ?? false;
  const profData = PROF_BY_MACRO[macroKey];
  const nbaActions = NBA_BY_MACRO[macroKey] || NBA_BY_MACRO.default;
  const cronologia = CRONOLOGIA_BY_MACRO[macroKey] || CRONOLOGIA_BY_MACRO.default;
  const [profiloState, setProfiloState] = useState<ProfiloState>('empty');

  // Analisi AI — appare dopo il primo documento
  const hasAnalysis = documents.length > 0;
  const lastDoc = documents[0];

  return (
    <div style={{ padding: '20px 24px 16px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
        color: 'var(--ink-4)', textTransform: 'uppercase', padding: 0, marginBottom: 12,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span>{macroLabel}</span>
        <span style={{ color: 'var(--ink-5)' }}>›</span>
        <span style={{ color: 'var(--ink-2)' }}>{itemLabel}</span>
      </button>

      {/* Title + progress */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(24px, 3.5vw, 36px)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, minWidth: 0 }}>
          {itemLabel}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            {doneCount}/{checklist.length} COMPLETATE
          </span>
          <div style={{ width: 80, height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: checklist.length ? (doneCount / checklist.length) * 100 + '%' : '0%', height: '100%', background: 'var(--alloro)', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </header>

      {/* ── GRID 2 COLONNE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

        {/* ═══ COLONNA SINISTRA ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* W1 — Documenti + Analisi AI */}
          <WidgetCard
            title={`Documenti caricati (${documents.length})`}
            icon="doc"
            action={
              <button onClick={onUpload} style={{ background: 'transparent', border: 'none', color: 'var(--vermiglio-ink)', fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
                + Carica
              </button>
            }
          >
            {/* Lista documenti */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {documents.map((d, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 38, borderRadius: 3, border: '1px solid var(--paper-line)', background: 'var(--paper-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ink-4)' }}>PDF</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 2 }}>{d.date} · {d.size}</div>
                    {d.tags && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {d.tags.map(t => (
                          <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--ink-4)', background: 'var(--paper-2)', padding: '1px 5px', borderRadius: 2 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '4px 9px', fontSize: 10.5, fontFamily: 'var(--sans)', color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0 }}>Apri</button>
                </div>
              ))}
            </div>

            {/* Analisi AI — appare automaticamente dopo il primo documento */}
            {hasAnalysis && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--paper-tint)', borderRadius: 8, border: '1px solid var(--paper-line)', borderLeft: '3px solid var(--vermiglio)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--vermiglio)', fontStyle: 'italic' }}>§</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                    Analisi AI · {lastDoc.name}
                  </span>
                </div>
                {[
                  { label: 'Clausole critiche', color: 'var(--vermiglio)', items: ['Art. 4 — Rescissione: termine 30gg non conforme L. 431/98', 'Art. 7 — Aggiornamento ISTAT: clausola vessatoria ex art. 1341 c.c.'] },
                  { label: 'Rischi rilevati', color: '#D4A017', items: ['Mancata registrazione entro 30gg → sanzione €200-2.000', 'Deposito cauzionale superiore al limite legale (3 mensilità)'] },
                  { label: 'Conformità normativa', color: 'var(--alloro)', items: ['Durata 4+4 anni: conforme L. 431/1998 art. 2', 'Canone concordato: verifica Accordo Territoriale applicabile'] },
                ].map((section, si) => (
                  <div key={si} style={{ marginBottom: si < 2 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: section.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 }}>{section.label}</span>
                    </div>
                    {section.items.map((item, ii) => (
                      <div key={ii} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4, paddingLeft: 12, marginBottom: 3, borderLeft: `1.5px solid ${section.color}33` }}>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
                <button
                  onClick={() => onOpenChat(`Analisi approfondita di ${lastDoc.name}`)}
                  style={{ marginTop: 12, width: '100%', padding: '8px 12px', border: '1px solid var(--paper-line)', borderRadius: 6, background: 'white', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Icon name="chat" size={11} /> Approfondisci con Sofia AI
                </button>
              </div>
            )}

            {/* Bottone carica */}
            <button onClick={onUpload} style={{ width: '100%', marginTop: 10, padding: 9, border: '1px dashed var(--paper-line)', borderRadius: 6, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="paperclip" size={11} /> Carica nuovo documento
            </button>
          </WidgetCard>

          {/* W3 — Cronologia contestuale */}
          <WidgetCard title={`Cronologia su ${itemLabel} (${cronologia.length})`} icon="clock">
            {cronologia.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
                Nessuna conversazione ancora su questa sottocategoria.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {cronologia.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenChat(c.text)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '9px 0', borderBottom: i < cronologia.length - 1 ? '1px solid var(--paper-line)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  >
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{c.isVoice ? '🎤' : '💬'}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.text}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', flexShrink: 0 }}>{c.date}</span>
                    <span style={{ color: 'var(--ink-4)', fontSize: 12, flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
            )}
          </WidgetCard>

          {/* W4 — Next Best Action */}
          <WidgetCard title="Azioni suggerite" icon="bolt" accent="var(--ambra)">
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
              Sofia AI ha analizzato i tuoi documenti e suggerisce:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nbaActions.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: '11px 14px', background: 'white',
                    border: '1px solid var(--paper-line)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.4, marginBottom: 4 }}>{a.text}</div>
                    <button
                      onClick={() => { onOpenChat(a.action); pushToast('Sofia AI: prompt pre-compilato'); }}
                      style={{ background: 'transparent', border: 'none', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--vermiglio-ink)', letterSpacing: '0.1em', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
                    >
                      → {a.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>

        {/* ═══ COLONNA DESTRA ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* W2 — Score sottocategoria + Checklist integrata */}
          <WidgetCard title={`Score ${itemLabel}`} icon="graph" accent={subScore >= 80 ? 'var(--alloro)' : subScore >= 60 ? 'var(--ambra)' : 'var(--vermiglio)'}>
            {/* Score circle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <ComplianceScoreCircle score={subScore} size={72} stroke={7} />
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {subScore}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--sans)' }}>/100</div>
                <Badge tone={subScore >= 80 ? 'ok' : subScore >= 60 ? 'warn' : 'accent'} style={{ marginTop: 4 }}>
                  {subScore >= 80 ? 'Conforme' : subScore >= 60 ? 'In miglioramento' : 'Attenzione'}
                </Badge>
              </div>
            </div>

            {/* Voci che abbassano score */}
            {doneCount < checklist.length && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Cosa abbassa il punteggio
                </div>
                {checklist.filter(c => !c.done).slice(0, 3).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--paper-line)' }}>
                    <span style={{ color: 'var(--vermiglio)', fontSize: 10, flexShrink: 0 }}>−{Math.round(100 / checklist.length)}pt</span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Checklist integrata */}
           ]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K]\��X�[�Έ	��L�[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�
�_O���X��\�
�ۙP��[�K���X��\��[��JB��]���]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�H_O����X��\��X\

�JHO�
�]���^O^�_B�ې�X��^�
HO�ە���P�X��J_B��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�LY[�Έ	�
	��\��܎�	��[�\���X�]N�˙ۙH��MH�K�[��][ێ�	��X�]H�����ܙ\����N�H�X��\��[��HH�	�\��Y�\�K\\\�[[�JI��	ۛۙI�_B����[��[O^��Y�M�ZY��M��ܙ\��Y]\Έ��^��[�Έ��ܙ\��K�\��Y	�˙ۙH�	ݘ\�KX[ܛ�I��	ݘ\�KZ[��M
I�X��X��ܛ�[��˙ۙH�	ݘ\�KX[ܛ�I��	��[��\�[�	��\�^N�	�[�[�KY�^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\����[��][ێ�	�[�M\�X\�I��_O���˙ۙH	��ݙ��YH�L�ZY�H�L��Y]Л�H�M�M���[H��ۙH�����OH��]H�����U�YH���H�����S[�X�\H���[���]H�L���
�MȋϏ�ݙϟB���[����[��[O^���۝�^�N�L���܎�˙ۙH�	ݘ\�KZ[��M
I��	ݘ\�KZ[��LJI�^X�ܘ][ێ�˙ۙH�	�[�K]��Y�	��	ۛۙI�[�RZY��K��_O���˝^B���[����]���
J_B��]�����Y�]�\�����ʈ�H8�%�ٙ\��[ۚ\�H

�]JH
��B��\�X\��]X�H	��
��Y�]�\�]OH��ٙ\��[ۚ\�H�X�ۏH�\�\�ȈX��[�H��\�KX[ܛ�H�����ٚ[��]HOOH	�X�]�I��
�ʈ�]�Έ�ٙ\��[ۚ\�H��Y�]�
�]���]��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�LX\��[����N�L_O��]��[O^���Y�
ZY��
�ܙ\��Y]\Έ	�L	I��X��ܛ�[��	ݘ\�KX[ܛ�I�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�M���܎�	��]I��^��[�Έ_O����ّ]O˚[�]X[	�I�B��]���]���]��[O^���۝�^�N�L��۝�ZY��
���܎�	ݘ\�KZ[��LJI��۝�[Z[N�	ݘ\�K\�[��I�_O�X\�������O�]���]��[O^���۝�^�N�LK��܎�	ݘ\�KZ[��L�I��۝�[Z[N�	ݘ\�K\�[��I�_O���ّ]O˜�X�O�]����]����]���]��[O^���۝�^�N�LK�K��܎�	ݘ\�KZ[��L�I�[�RZY��K�KX\��[����N�LY[�Έ	�L	��X��ܛ�[��	ݘ\�K\\\�][�
I��ܙ\��Y]\Έ
��۝�[Z[N�	ݘ\�K\�[��I�_O��[[[�Y��[ܛ�[Y[���\��X��Έ��ۙϛ���O���ۙς��]����]ۂ�ې�X��^�
HO�\��\�
	��ܚ��X�H�ۙ]�\��\\���_B��\�Ә[YOH�����\�[X\�H���[O^���Y�	�L	I��۝�^�N�L�_B���X�ۈ�[YOH��]��^�O^�L_Hψ\�H�ܚ��X�H�ۙ]�\�؝]ۏ���]ۂ�ې�X��^�
HO��]�ٚ[��]J	�[\I�_B��[O^���Y�	�L	I�X\��[���
�Y[�Έ	��L�	��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\Έ
��X��ܛ�[��	��[��\�[�	��۝�[Z[N�	ݘ\�K\�[��I��۝�^�N�LK��܎�	ݘ\�KZ[��L�I��\��܎�	��[�\��_B����ۜ�[H�ٙ\��[ۚ\�H\�\���8����؝]ۏ���]���
H��ٚ[��]HOOH	�[�[����
�ʈ�]����X�Y\�H[��X]H
�]���]��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�LX\��[����N�L_O��]��[O^���Y�͋ZY��͋�ܙ\��Y]\Έ	�L	I��X��ܛ�[��	ݘ\�K\\\�L�I�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�MK��܎�	ݘ\�KZ[��L�I��^��[�Έ_O����ّ]O˚[�]X[	�I�B��]���]���]��[O^���۝�^�N�L��K��܎�	ݘ\�KZ[��LJI��۝�[Z[N�	ݘ\�K\�[��I�_O���ّ]O˛�[Y_O�]���]��[O^���۝�^�N�LK��܎�	ݘ\�KZ[��L�I��۝�[Z[N�	ݘ\�K\�[��I�_O���ّ]O˜�X�H0����ّ]O˘�]_O�]����]����]���]��[O^��Y[�Έ	�\L�	��X��ܛ�[��	����
�M���MJI��ܙ\��	�\��Y���
�L�
�MJI��ܙ\��Y]\Έ
��۝�^�N�L���܎�	����	��۝�[Z[N�	ݘ\�K\�[��I�X\��[����N�L\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�
�_O���[�������[���X�Y\�H[��X]H0���\���H[���
̈ܙB��]����[O^���۝�^�N�LK��܎�	ݘ\�KZ[��M
I�X\��[��	�	��۝�[Z[N�	ݘ\�K\�[��I�_O���H�ۈ�\�ۙH[���
̚�X�]�\�ZH�[X�ܜ��]]�X]X�˂�����]ۂ�ې�X��^�
HO���]�ٚ[��]J	�X�]�I�N�\��\�
	��ٙ\��[ۚ\�H��Y�]�[�\��X���I�N�_B��[O^���Y�	�L	I�Y[�Έ	��	��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\Έ
��X��ܛ�[��	��[��\�[�	��۝�[Z[N�	ݘ\�K\�[��I��۝�^�N�LK��܎�	ݘ\�KZ[��L�I��\��܎�	��[�\��_B����[][H�\���HX��]]H
[[�H8����؝]ۏ���]���
H�
�ʈ�]�N��[��8�%[���HX\��]X�H
��ّ]H�
�]����[O^���۝�^�N�L���܎�	ݘ\�KZ[��L�I�X\��[��	�L�	�[�RZY��K�K�۝�[Z[N�	ݘ\�K\�[��I�_O���ٙ\��[ۚ\�H�Y��\�]�\�[O��][SX�[O�[O������]��[O^��Y[�Έ	�L�M	��X��ܛ�[��	��]I��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\ΈX\��[����N�L_O��]��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�LX\��[����N�
�_O��]��[O^���Y�͋ZY��͋�ܙ\��Y]\Έ	�L	I��X��ܛ�[��	ݘ\�K\\\�L�I�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�M���܎�	ݘ\�KZ[��L�I��^��[�Έ�[\��	؛\��
I�_O����ّ]K�[�]X[B��]���]���]��[O^���۝�^�N�L��۝�ZY��
���܎�	ݘ\�KZ[��LJI��۝�[Z[N�	ݘ\�K\�[��I�_O���ّ]K��[Y_O�]���]��[O^���۝�^�N�LK��܎�	ݘ\�KZ[��L�I��۝�[Z[N�	ݘ\�K\�[��I�_O���ّ]K��X�O�]���]��[O^���۝�^�N�LK��܎�	ݘ\�KZ[��M
I��۝�[Z[N�	ݘ\�K[[ۛ�I�_O���ّ]K��]_O�]����]����]�����ّ]K��]�Y]���	���\��][���][��^��ّ]K��][��H��[�^��ّ]K��]�Y]��HϟB��]����]ۂ�ې�X��^�
HO��]�ٚ[��]J	�[�[���N\��\�
	ԚX�Y\�H[��X]HH	�
��ّ]K��[YH
�	�0��8��HYX�]]I�N_B��\�Ә[YOH�����\�[X\�H���[O^���Y�	�L	I��۝�^�N�L�_B���[��XH�X�Y\�H8�%8��B�؝]ۏ���[O^���۝�^�N�L�K��܎�	ݘ\�KZ[��M
I�X\��[��	͜	�^[Yێ�	��[�\���۝�[Z[N�	ݘ\�K\�[��I��۝�[N�	�][X��_O����YHH�۝]H؛���]H��H�\���H[�ٙ\��[ۚ\�B�����]���
H�
��[O^���۝�^�N�L���܎�	ݘ\�KZ[��M
I�X\��[���۝�[N�	�][X���۝�[Z[N�	ݘ\�K\�[��I�_O���\��[��ٙ\��[ۚ\�H\�ۚX�[H[�]Y\�H\�XH[[�Y[�˂����
B�
_B���Y�]�\���
_B���ʈ͈8�%�ܛX]]�H�
�[\]H��
��B��Y�]�\�]OH��ܛX]]�H	�[\]H�X�ۏH����ȏ���ʈ�ܛX]]�H��YH�
��B�]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K]\��X�[�Έ	��L�[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�
�_O���ܛX]]�HH�Y�\�[Y[��]���]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[��X\��[����N�M_O���QӓԓPUU�K�X\

�JHO�
��]ۂ��^O^�_B�ې�X��^�
HO�\��\�
	��ۛ�Y��	�
���X�[
_B��[O^�Y[�Έ	�	��ܙ\����N�HQӓԓPUU�K�[��HH�	�\��Y�\�K\\\�[[�JI��	ۛۙI��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��X�KX�]�Y[���\���X��ܛ�[��	��[��\�[�	��ܙ\��	ۛۙI��\��܎�	��[�\��^[Yێ�	�Y�	���[��][ێ�	��X�]H�M\���_B�ۓ[�\�Q[�\�^�HO�
K��\��[�\��]\�S[[Y[�
K��[K��X�]HH	����B�ۓ[�\�SX]�O^�HO�
K��\��[�\��]\�S[[Y[�
K��[K��X�]HH	�I�B����[��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�
��۝�^�N�L���܎�	ݘ\�KZ[��L�I�_O���[��[O^����܎�	ݘ\�K]�\�ZY�[�I�_O�����[��ۋ�X�[B���[����[��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K��܎�	ݘ\�KZ[��M
I��X��ܛ�[��	ݘ\�K\\\�L�I�Y[�Έ	̜
\	��ܙ\��Y]\Έ��^��[�Έ_O��8�����[���؝]ۏ��
J_B��]�����ʈ[\]H8�%�����
��B�]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K]\��X�[�Έ	��L�[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�
�_O��[\]HH[�[B��]���]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�H_O���Q�STUT˛X\

JHO�
�]���^O^�_B��[O^�Y[�Έ	�
	��ܙ\����N�HQ�STUT˛[��HH�	�\��Y�\�K\\\�[[�JI��	ۛۙI��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��X�KX�]�Y[����X�]N�\����H����_B����[��[O^���۝�^�N�L��K��܎�	ݘ\�KZ[��LJI�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�
�_O���Z\���	���[�]OH�����Ȉ�[O^���۝�^�N�LH_O�'�$���[��B����[Y_B���[����\����
��]ۂ�ې�X��^�
HO�\��\�
��\�X�]�	���[Y_K���^X
_B��[O^���X��ܛ�[��	ݘ\�K\\\�L�I��ܙ\��	ۛۙI�Y[�Έ	��\	��ܙ\��Y]\Έ��۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K�K]\��X�[�Έ	��
�[I��\��܎�	��[�\����܎�	ݘ\�KZ[��L�I�_B�����^H8��؝]ۏ��
H�
��[��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K��܎�	ݘ\�KZ[��M
I��X��ܛ�[��	ݘ\�K\\\�L�I�Y[�Έ	̜
�	��ܙ\��Y]\Έ�_O�����[���
_B��]���
J_B��]����Z\���	��
�]��[O^��X\��[���LY[�Έ	�L	��X��ܛ�[��	����
�M���MJI��ܙ\��Y]\Έ
��۝�^�N�LK��܎�	����	��۝�[Z[N�	ݘ\�K\�[��I�^[Yێ�	��[�\��_O��\��HH��\���\�X�\�HH[\]H8�����]���
_B���Y�]�\�����]���ʈ�[�H��ۛ�H\��H
��B��]���ʈ�[�HܚY
��B��]���
NB����8� 8� 8� �]��\X[��H^[�Y8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� ���[��[ۈ�]��\X[��Q^[�Y
���N�ܛ�K�۝^ې���K��ܙK\��\�N���N���[����۝^���[��ې���N�

HO���Y���ܙN��[X�\��\��\��
N���[��HO���YJH�ۜ��Y\��Y�\��]Y\��Y�\�HH\�T�]J���N�	�ZI�^��۝^��ۛ��۝HY\��\�\�H�H���۝^H����YH����\��\�H][O��	Н[ۙ�[ܛ�ˈ[����H����\��\�H][H���O��K�JN�ۜ��[�]�][�]HH\�T�]J	��N�ۜ���Y�]�[��]�Y�]�[�HH\�T�]J�YJN�ۜ��]�U\����]]�U\���HH\�T�]O]�U\���O��JN�ۜ��ܛ�\��Y�H\�T�Y�S]�[[Y[���[
N�\�QY��X�


HO�Y�
�ܛ�\��Y���\��[�
H�ܛ�\��Y���\��[���ܛ��H�ܛ�\��Y���\��[���ܛ�ZY�K�Y\��Y�\�JN��ۜ��[�H

HO�Y�
Z[�]��[J
JH�]\���ۜ�HH[�]��[J
N�][�]
	��N�]Y\��Y�\�HO�ˋ��K���N�	�\�\��^�HWJN�][Y[�]


HO��]Y\��Y�\�HO�ˋ��K���N�	�ZI�^��[�[^��]���_H��[��\�H[�[��ٚ[�H[�۝\��H�Y��\�\���H���Y\�H\�[�K��[�\��[�\���\�]]�˘WJN�ۜ��]�\�Έ]�U\��H�Y�	۝I�
�]K����
K^�K��X�J

K�[��	�Y\����\ә]Έ�YHN�]]�U\���O�ۙ]�\�����JN\��\�
8�$�\��Y��][�Έ	ۙ]�\�˝^X
N�][Y[�]


HO��]]�U\���O��X\
O��YOOH�]�\�˚Y�����\ә]Έ�[�HH�
JK
L
NKL
NN��]\��
�]��[O^��\�^N�	ٛ^	�ZY��	�L	I��X��ܛ�[��	ݘ\�K\\\�I�_O��]��[O^���^�K\�^N�	ٛ^	��^\�X�[ێ�	���[[��Z[��Y��ܙ\��Y���Y�]�[��	�\��Y�\�K\\\�[[�JI��	ۛۙI�_O��XY\��[O^��Y[�Έ	�M�̜	��ܙ\����N�	�\��Y�\�K\\\�[[�JI�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�M_O���]ۈې�X��^�ې���_H�[O^���X��ܛ�[��	��[��\�[�	��ܙ\��	ۛۙI��\��܎�	��[�\����܎�	ݘ\�KZ[��L�I��۝�^�N�L�Y[�Έ	�	��ܙ\��Y]\Έ
�۝�[Z[N�	ݘ\�K\�[��I�_O���ܛ�H[H\���\�؝]ۏ��]��[O^���^�K^[Yێ�	��[�\��_O��]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L��܎�	ݘ\�KZ[��M
I�]\��X�[�Έ	��M[I�^�[�ٛܛN�	�\\��\�I�_O��]��\X[��O�]�����۝^	��]��[O^���۝�^�N�L��۝�ZY��
LX\��[�����۝�[Z[N�	ݘ\�K\�[��I�_O��۝\�Έ��۝^O�]��B��]����]ۈې�X��^�
HO��]�Y�]�[��O�]�_H�[O^���X��ܛ�[��	��[��\�[�	��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\Έ
Y[�Έ	͜L	��\��܎�	��[�\���۝�^�N�LK�۝�[Z[N�	ݘ\�K\�[��I�_O����Y�]�[��	��,�\��ۙI��	��,[���I�H[��[؝]ۏ���XY\����]��Y�^��ܛ�\��Y�H�[O^���^�Kݙ\���Έ	�]]��Y[�Έ	�̜
	�_O��]��[O^��X^�Y�
͌X\��[��	�]]��_O���Y\��Y�\˛X\

KJHO�
�]��^O^�_H�[O^��\�^N�	ٛ^	��\�MX\��[����N���^\�X�[ێ�K���HOOH	�\�\���	ܛ��\�]�\��I��	ܛ���_O��]��[O^��Y��ZY����ܙ\��Y]\Έ	�L	I��^��[�Έ��X��ܛ�[��K���HOOH	�\�\���	ݘ\�KZ[��I��	ݘ\�K\\\�][�
I����܎�K���HOOH	�\�\���	ݘ\�K\\\�I��	ݘ\�KZ[��L�I���ܙ\��K���HOOH	�ZI��	�\��Y�\�K\\\�[[�JI��	ۛۙI��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\����۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�M�۝�[N�	�][X���_O��K���HOOH	�\�\���	�I��	���O�]���]��[O^�X^�Y�
M��X��ܛ�[��K���HOOH	�\�\���	ݘ\�KZ[��I��	��]I����܎�K���HOOH	�\�\���	ݘ\�K\\\�I��	ݘ\�KZ[��LJI���ܙ\��K���HOOH	�ZI��	�\��Y�\�K\\\�[[�JI��	ۛۙI��Y[�Έ	�L�M�	��ܙ\��Y]\ΈL�۝�^�N�LˍK[�RZY��K�MK�۝�[Z[N�	ݘ\�K\�[��I��_O��K�^O�]����]���
J_B��]����]����]��[O^���ܙ\���	�\��Y�\�K\\\�[[�JI�Y[�Έ��X��ܛ�[��	��]I�_O��]��[O^��X^�Y�
͌X\��[��	�]]��\�^N�	ٛ^	��\�L[Yے][\Έ	ٛ^Y[�	�_O���]ۈې�X��^�
HO�\��\�
	�\�H�[^�[ۙH�[I�_H�[O^���X��ܛ�[��	��[��\�[�	��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\ΈY[�ΈL�\��܎�	��[�\����܎�	ݘ\�KZ[��L�I�_O��X�ۈ�[YOH�\\��\��^�O^�MHς�؝]ۏ��^\�XH�[YO^�[�]Hې�[��O^�HO��][�]
K�\��]��[YJ_B�ے�^Q�ۏ^�HO��Y�
K��^HOOH	�[�\��	��YK��Y��^JH�K��]�[�Y�][

N��[�

N�H_B�X�Z�\�H��YYH]X[���x�)������^�_B��[O^���^�K�\�^�N�	ۛۙI�Y[�Έ	�L�M�	��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\Έ�۝�^�N�LˍK�۝�[Z[N�	ݘ\�K\�[��I��X��ܛ�[��	ݘ\�K\\\�][�
I��][�N�	ۛۙI�_B�ς��]ۈې�X��^��[�H�\�Ә[YOH�����\�[X\�H�\�X�Y^�Z[�]��[J
_O��X�ۈ�[YOH��[���^�O^�L�Hψ[��XB�؝]ۏ���]����]����]������Y�]�[�	��
�\�YH�[O^���Y�̌�^��[�Έݙ\���Έ	�]]��Y[�Έ�\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�M��X��ܛ�[��	ݘ\�K\\\�][�
I�_O���Y�]�\�]OH���ܙH�X[][YH�X�ۏH�ܘ\���]��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�M_O����\X[��T��ܙP�\��H��ܙO^���ܙ_H�^�O^͎H����O^͟Hς�]�����[�\�[YO^���ܙ_H�[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�͋]\��X�[�Έ	�L��[I�_Hς��[��[O^����܎�	ݘ\�KZ[��M
I��۝�^�N�M_O��L��[���]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K��܎�	ݘ\�KZ[��M
I�]\��X�[�Έ	��Y[I�^�[�ٛܛN�	�\\��\�I�X\��[����_O�Y��[ܛ�]�]�O�]����]����]�����Y�]�\�����Y�]�\�]O^�\���[�\�]H
	�]�U\��˛[��JXHX�ۏH�\ȏ���]�U\��˛[��OOH�
��[O^����܎�	ݘ\�KZ[��M
I��۝�^�N�L��۝�[N�	�][X��X\��[��_O��\��[�\���[�\�]�[��ܘK��ܚ]�H[�H�X�Y\�H[	�\���RK����
H�
�]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�_O���]�U\��˛X\
O�
�]��^O^��YH�[O^��Y[�Έ	�LL�	��X��ܛ�[��	��]I��ܙ\��	�\��Y�\�K\\\�[[�JI��ܙ\��Y]\Έ
�[�[X][ێ�	�Y�YR[����X\�K[�]	�_O��]��[O^��\�^N�	ٛ^	��\�Y�P�۝[��	��X�KX�]�Y[��[Yے][\Έ	ؘ\�[[�I��\�_O���[��[O^���۝�^�N�L��K�۝�ZY��
L_O���^O��[�����\ә]�	���[��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�KY[�Έ	̜
�	��X��ܛ�[��	ݘ\�K]�\�ZY�[�I���܎�	��]I��ܙ\��Y]\Έ�[�[X][ێ�	�Y[�H\�X\�KZ[�[�]��_O��SՓ���[��B��]���]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K�K��܎�	ݘ\�KZ[��M
I�X\��[���
]\��X�[�Έ	��[I�_O��[�\�]����[�O�]����]���
J_B��]���
_B���Y�]�\�����Y�]�\�]OH���Y[��H�Y��\�]H�X�ۏH����ȏ��]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�
�_O���Q�PQS�T�ЖW�PPԓ˜�]�X�K�X\

JHO�
�]��^O^�_H�[O^��\�^N�	ٛ^	��\�Y�P�۝[��	��X�KX�]�Y[��Y[�Έ	͜	��ܙ\����N�HOOH�	�\��Y�\�K\\\�[[�JI��	ۛۙI�_O���[��[O^���۝�^�N�L�_O���^O��[����[��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L��܎��\��[��	ݘ\�K]�\�ZY�[�Z[��I��	ݘ\�KZ[��M
I�_O���]_O��[����]���
J_B��]�����Y�]�\�����Y�]�\�]OH���[Y[�H�Y�\�[��X]H�X�ۏH��ȏ��]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�
_O���Q���˜�X�J�K�X\

JHO�
�]��^O^�_H�[O^���۝�^�N�LK�K��܎�	ݘ\�KZ[��L�I�Y[�Έ	͜	�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�
�_O��X�ۈ�[YOH��Ȉ�^�O^�L_Hψ���[Y_B��]���
J_B��]�����Y�]�\����\�YO��
_B��]���
NB����8� 8� 8� \�Y��[�[8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� ���[��[ۈ\�Y��[�[
�ې���Kې�ۙ�\�K\��\�N��ې���N�

HO���Y�ې�ۙ�\�N�
�[YN���[��HO���Y�\��\��
N���[��HO���YJH�ۜ��\�K�]\�WHH\�T�]O	��[X�	�	�[�[^�[���	ܙ\�[	ϊ	��[X�	�N�ۜ�ٚ[S�[YWHH\�T�]J	��۝�]��]���K���N��ۜ��\�H

HO��]\�J	�[�[^�[���N�][Y[�]


HO��]\�J	ܙ\�[	�KM
NN��]\��
�]��[O^����][ێ�	ٚ^Y	�[��]��X��ܛ�[��	ܙؘJNKM�MK�MJI��X�����[\��	؛\�
�
I�\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�Y�P�۝[��	��[�\���[�^�MLY[�Έ
_O��]��[O^���X��ܛ�[��	ݘ\�K\\\�I��ܙ\��Y]\ΈM�Y�	�Z[�
M�L	JI�Y[�Έ͋���Y�Έ	ݘ\�K\�Y��L�I���][ێ�	ܙ[]]�I�_O���]ۈې�X��^�ې���_H�[O^����][ێ�	�X���]I���M�Y��M�X��ܛ�[��	��[��\�[�	��ܙ\��	ۛۙI��\��܎�	��[�\����܎�	ݘ\�KZ[��L�I�_O��X�ۈ�[YOH����H��^�O^�M�Hς�؝]ۏ���\�HOOH	��[X�	�	��
���]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L�K]\��X�[�Έ	��M[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�_O��\�X�H��[Y[���]�����[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N��X\��[��	�M	�]\��X�[�Έ	�L��[I�_O�	�\���RH[�[^��HH�\��Y�X�H]]�X]X�[Y[�K�����]��[O^��Y[�Έ̋�ܙ\��	̜\�Y�\�K\\\�[[�JI��ܙ\��Y]\ΈL^[Yێ�	��[�\���X��ܛ�[��	��]I�X\��[���M�_O��X�ۈ�[YOH�\\��\��^�O^̍Hς�]��[O^���۝�^�N�L���܎�	ݘ\�KZ[��L�I�X\��[���_O��\��[�H[��[H]ZH��]����]ۈې�X��^��\�H�\�Ә[YOH�����\�[X\�H��[O^��X\��[���L�_O��[^�[ۚH[��[O؝]ۏ���]���ς�
_B��\�HOOH	�[�[^�[���	��
�]��[O^��^[Yێ�	��[�\��Y[�Έ�_O��]��[O^���Y�
ZY��
X\��[��	�]]��	��ܙ\��	����Y�\�K\\\�[[�JI��ܙ\����܎�	ݘ\�K]�\�ZY�[�I��ܙ\��Y]\Έ	�L	I�[�[X][ێ�	�Y�[���[�X\�[��[�]I�_Hς���[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N��X\��[��	�	�_O�[�[^�����[Y[���)��ς��[O^����܎�	ݘ\�KZ[��L�I��۝�^�N�L��۝�[Z[N�	ݘ\�K\�[��I�_O�ٚ[S�[Y_O���]��[O^��ZY����X��ܛ�[��	ݘ\�K\\\�[[�JI��ܙ\��Y]\Έ�X\��[���Nݙ\���Έ	�Y[��_O��]��[O^��ZY��	�L	I��Y�	͌	I��X��ܛ�[��	ݘ\�K]�\�ZY�[�I�[�[X][ێ�	�Y��ܙ\��K��X\�KZ[�[�]	�_Hς��]����]���
_B��\�HOOH	ܙ\�[	�	��
���]��[O^��\�^N�	ٛ^	�[Yے][\Έ	��[�\���\�LX\��[����N�
���܎�	ݘ\�KX[ܛ�I�_O��X�ۈ�[YOH��X�Ȉ�^�O^�M�Hς�]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L�K]\��X�[�Έ	��M[I�^�[�ٛܛN�	�\\��\�I��۝�ZY��
�_O���[Y[��[�[^��]��]����]�����[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N��X\��[��	�M�	�]\��X�[�Έ	�L��[I�_O�ٚ[S�[Y_O�����[O^��X\��[��\�^N�	�ܚY	�ܚY[\]P��[[�Έ	�MY�������\��۝�^�N�L��K�۝�[Z[N�	ݘ\�K\�[��I�_O���[O^���۝�[Z[N�	ݘ\�K[[ۛ�I���܎�	ݘ\�KZ[��M
I��۝�^�N�L�K]\��X�[�Έ	��Y[I�^�[�ٛܛN�	�\\��\�I�[Y۔�[��	��[�\��_O�\�����[O^��X\��[��_O�]H���\��[��YܙY[Y[�����[O^���۝�[Z[N�	ݘ\�K[[ۛ�I���܎�	ݘ\�KZ[��M
I��۝�^�N�L�K]\��X�[�Έ	��Y[I�^�[�ٛܛN�	�\\��\�I�[Y۔�[��	��[�\��_O�\�O����[O^��X\��[��_O�X�YHԓ8��U������[O^���۝�[Z[N�	ݘ\�K[[ۛ�I���܎�	ݘ\�KZ[��M
I��۝�^�N�L�K]\��X�[�Έ	��Y[I�^�[�ٛܛN�	�\\��\�I�[Y۔�[��	��[�\��_O���Y[��O����[O^��X\��[��_O���ۙό�HX�������ۙϏ����[O^���۝�[Z[N�	ݘ\�K[[ۛ�I���܎�	ݘ\�KZ[��M
I��۝�^�N�L�K]\��X�[�Έ	��Y[I�^�[�ٛܛN�	�\\��\�I�[Y۔�[��	��[�\��_O��]Y�ܚXO����[O^��X\��[��_O��]�X�H	���8�.��\ٙ\�[Y[�H^�KUQO������]��[O^��X\��[���NY[�ΈM�X��ܛ�[��	ݘ\�K\\\�][�
I��ܙ\��Y]\Έ�ܙ\��	�\��Y�\�K\\\�[[�JI�_O��]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L]\��X�[�Έ	��L�[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�
�_O�\���[�\�]��]���]��[O^���۝�^�N�L��۝�[Z[N�	ݘ\�K\�[��I�_O��$�[��ݛ�HU��8�%��݈����]����]���]��[O^��\�^N�	ٛ^	��\�LX\��[�����_O���]ۈې�X��^�ې���_H�\�Ә[YOH�����Y�����[O^���^�H_O�[�Y�X�O؝]ۏ���]ۈې�X��^�
HO��ې�ۙ�\�J�[S�[YJN�\��\�
	�'����[Y[���\��Y�X�]�[��]�X�H	����N�_H�\�Ә[YOH�����\�[X\�H��[O^���^�H_O��ۙ�\�XO؝]ۏ���]���ς�
_B��]����]���
NB����8� 8� 8� �Y�[�[8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� ���[��[ۈ�Y�[�[
���K\�\�ۓ�]���\�Yە���HN���N���[��\�\�Έ�X�ܙ��[��[�ۛ�ۏ��[ۓ�]�Έ
\����[��HO���Y��\�Y����X[�ە���N�

HO���YJH�ۜ�[\H\�\�˚[\\��X�ܙ��[��[�ۛ�ۏ�[�Y�[�Y�ۜ�[�X�[B���HOOH	�[\�\�I��

[\˙[Y[��[ۙH\���[��H	�YYXI�K��\\��\�J
B����HOOH	��ى��	�X[��]����]��	�X[��ܘ]Z]���Y�
��\�Y
H�]\��
�\�YH�[O^���Y�

�^��[�Έ�ܙ\�Y��	�\��Y�\�K\\\�[[�JI��X��ܛ�[��	ݘ\�K\\\�][�
I�\�^N�	ٛ^	��^\�X�[ێ�	���[[��[Yے][\Έ	��[�\��Y[����M��\�M_O���]ۈې�X��^�ە���_H]OH�\�[�H[��[Ȉ�[O^���X��ܛ�[��	��[��\�[�	��ܙ\��	ۛۙI��\��܎�	��[�\����܎�	ݘ\�KZ[��L�I�Y[�Έ
�_O��X�ۈ�[YOH�\���Ȉ�^�O^�MHς�؝]ۏ��]��[O^��ܚ][��[�N�	ݙ\�X�[\�	��[�ٛܛN�	ܛ�]JNY�I��۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L]\��X�[�Έ	��M[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�_O���[�X�[B��]����\�YO��
NB���]\��
�\�YH�[O^���Y����^��[�Έ�ܙ\�Y��	�\��Y�\�K\\\�[[�JI��X��ܛ�[��	ݘ\�K\\\�][�
I�Y[�ΈNݙ\���Έ	�]]����][ێ�	ܙ[]]�I�_O���]ۈې�X��^�ە���_H]OH���\�[ZH[��[Ȉ�[O^����][ێ�	�X���]I���L�Y��L�X��ܛ�[��	��[��\�[�	��ܙ\��	ۛۙI��\��܎�	��[�\����܎�	ݘ\�KZ[��M
I�Y[�Έ
�[�^��_O��X�ۈ�[YOH����H��^�O^�L�Hς�؝]ۏ���Y�]�\�]OH�X��ۘ[Y[�ȏ��]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L]\��X�[�Έ	��M[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�X\��[����N�
�_O�X[��]X[O�]���]��[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N��]\��X�[�Έ	�L��[I�X\��[����N�L_O��[�X�[O�]���ܛ�HOOH	�[\�\�I�	��]��[O^���۝�^�N�LK�K��܎�	ݘ\�KZ[��L�I��۝�[Z[N�	ݘ\�K\�[��I�_O�L8�$�H\[�[�H0��8��
�K�Y\�O�]��B��]ۈې�X��^�
HO�ۓ�]�ˊ	�\ܘYI�_H�\�Ә[YOH�����XX��[���[O^���Y�	�L	I�X\��[���M_O��X�ۈ�[YOH�����^�O^�L�Hψ\ܘYHX[�؝]ۏ����Y�]�\����ܛ�HOOH	��ى�	��
�]��[O^��X\��[���M_O���Y�]�\�]OH�XYX\��]X�H�X�ۏH��[YH�X��[�H��\�K]�\�ZY�[�H���]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�L]\��X�[�Έ	��L�[I���܎�	ݘ\�KZ[��M
I�^�[�ٛܛN�	�\\��\�I�_O��[ݚH���O�]���]��[O^���۝�[Z[N�	ݘ\�K\�\�Y�I��۝�^�N�̋X\��[��	�L	�_O���]���]��[O^��\�^N�	ٛ^	��^\�X�[ێ�	���[[���\�L_O���Q�PQ˜�X�J�K�X\
O�
�]��^O^��YH�[O^��Y[�ΈL�X��ܛ�[��	��]I��ܙ\��Y]\Έ
��ܙ\��	�\��Y�\�K\\\�[[�JI�_O��]��[O^���۝�^�N�L��۝�ZY��
LX\��[����N�
�۝�[Z[N�	ݘ\�K\�[��I�_O���]_O�]���]��[O^���۝�[Z[N�	ݘ\�K[[ۛ�I��۝�^�N�K�K��܎�	ݘ\�KZ[��M
I�]\��X�[�Έ	��[I�_O����]K��\\��\�J
_H0�����Y�]H0����Y\�O�]����]ۈ�\�Ә[YOH�����\�[X\�H��[O^���Y�	�L	I�X\��[���Y[�Έ	�\	��۝�^�N�LH_O�X�]Z\�O؝]ۏ���]���
J_B��]�����Y�]�\����]���
_B��ܛ�HOOH	��]Y[���	��
�]��[O^��X\��[���M_O���Y�]�\�]OH�ZH�\��ۛ�HZ]]�ȈX�ۏH�\�\�ȈX��[�H��\�KX[ܛ�H����[O^���۝�^�N�L���܎�	ݘ\�KZ[��L�I�X\��[��	�L	�[�RZY��K�K�۝�[Z[N�	ݘ\�K\�[��I�_O�\��\�H��\\��K[��ٙ\��[ۚ\�H�\�Y�X�]�p�\��\�\�K�����]ۈې�X��^�
HO�ۓ�]�ˊ	��ى�_H�\�Ә[YOH�����Y�����[O^���Y�	�L	I��۝�^�N�LK�H_O��ݘH�ٙ\��[ۚ\�O؝]ۏ����Y�]�\����]���
_B��\�YO��
NB����8� 8� 8� XZ[�\���\�
�۝Z[�\�H8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� 8� ��^ܝY�][�[��[ۈXZ[�\���\�
���K\�\��[X�[ۋې�X��ۓ�]�۔X��XXܛ�X[�Έ�X[��[\�\�N��[\�\�HN�XZ[�\���\����H�ۜ����ܙK�]��ܙWHH\�T�]J
͊N�ۜ���\��]�\�HH\�T�]O��[���[��[
N�ۜ���ۙ�]K�]�ۙ�]WHH\�T�]J�[�JN�ۜ���]��]�]�HH\�T�]O��[���[��[
N�ۜ���]�[��]�]�[�HH\�T�]J�[�JN�ۜ���][�]\���]�][�]\��HH\�T�]J	��N�ۜ�ܚY���\�Y�]�Y���\�YHH\�T�]J

HO�\[و�[���OOH	�[�Y�[�Y	�	���[��˚[��\��YL�
N�ۜ��\�Y�[��]\�Y�[�HH\�T�]J�[�JN�ۜ��\����]\���HH\�T�]JQ�T���ЖW�PPԓ�N�ۜ���X��\��]�X��\�HH\�T�]JQ��P��T��Q�US
N�ۜ����[Y[���]��[Y[��HH\�T�]JQ����N�ۜ��\�[Y\�H\�T�Y��]\��\O\[و�][Y[�]��[��[
N�\�QY��X�


HO��ۜ�۔�\�^�HH

HO��Y�
�[��˚[��\��YLL
H�]�Y���\�Y
�YJN�N�[��˘Y]�[�\�[�\�	ܙ\�^�I�۔�\�^�JN۔�\�^�J
N�]\��

HO��[��˜�[[ݙQ]�[�\�[�\�	ܙ\�^�I�۔�\�^�JNK�JN��ۜ�\��\�H
\�Έ��[��HO��]�\�
\��NY�
�\�[Y\���\��[�
H�X\�[Y[�]
�\�[Y\���\��[�
N�\�[Y\���\��[�H�][Y[�]


HO��]�\�
�[
K�
NN��ۜ��[��]H
\��ܐ�Έ��[��HO��ۜ��۝^�[YHH�[X�[ۏ˛XXܛ�X�[	���[X�[ۏ˚][B��	��[X�[ۋ�XXܛ�X�[H�	��[X�[ۋ�][_X���[X�[ۏ˛XXܛ�X�[�[�]�]�
�۝^�[YJN�]�][�]\��\��ܐ�	��N�]�]�[��YJNN�ۜ����P�]H

HO���]�]�[��[�JN��]�][�]\��	��N�N��ۜ����U\��H
Y���[��HO��]\����]�O��ۜ��^H�����]�N�܈
�ۜ��وؚ�X���^\��^
JH�^��HH�^��K�X\
O��YOOHY�����ۙN�]�ۙHH�
NB��]\���^JN�]��ܙJ�O�X]�Z[�L�
��JNN��ۜ����P�X��H
N��[X�\�HO��]�X��\�
�]�O��ۜ��^H�]��X\

�Y
HO�YOOHH������ۙN�X˙ۙHH��N�ۜ�[H�^�]�\�J�O�˙ۙJNY�
[
H�]�ۙ�]J�YJN\��\�
	�'�H�X��\���\]]H[L	HI�N�][Y[�]


HO��]�ۙ�]J�[�JK�
NH[�H\��\�
	��$�\����\]]�0����ܙH
̉I�NB��]\���^JN�]��ܙJ�O�X]�Z[�L�
��JNN��ۜ��ۙ�\�U\�YH
�[YN���[��HO��]��[Y[��O����[YK]N�	̌H\������^�N�	�MM�Љ�Y�Έ��۝[ݛ��HK���JN�]\�Y�[��[�JN�]��ܙJ�O�X]�Z[�L�
��JNN��ۜ���[��\�HQД�S��T�ܛ�WHQД�S��T˚[\�\�N�]�۝[���XX���XX���NY�
�[X�[ۈ	���[X�[ۋ�XXܛ�OOH	���\���\����H�۝[�H\���\��\��H��O^ܛ�_H\�\�^�\�\�Hۓ�[��]^��[��]H\��\�^�\��\�HώH[�HY�
\�[X�[ۈ\�[X�[ۋ�XXܛ�H�۝[�H
�\���\��YB���O^ܛ�_H\�\�^�\�\�H��ܙO^���ܙ_H��[��\�^؜�[��\�B�۔X��XXܛ�^��^KX�[
HO�۔X��XXܛ�ˊ�^KX�[
_B�ۓ�[��]^��[��]H\��\�^�\��\�B�ς�
NH[�HY�
\�[X�[ۋ�][JH�۝[�H
�XXܛ�ݙ\��Y]��O^ܛ�_B�XXܛ��^O^��[X�[ۋ�XXܛ�B�XXܛ�X�[^��[X�[ۋ�XXܛ�X�[B�ې�X��^�ې�X��


HO��J_B�ۓ�[��]^��[��]B�\���^�\�����[X�[ۋ�XXܛ�H\��˜�]�X�H�_B�ە���U\��^����U\��B�XY[�\�^�Q�PQS�T�ЖW�PPԓ���[X�[ۋ�XXܛ�HQ�PQS�T�ЖW�PPԓ˜�]�X�H�_B�\��\�^�\��\�B�ς�
NH[�H�۝[�H
��X��]Y�ܞQ]Z[�XXܛ��^O^��[X�[ۋ�XXܛ�B�XXܛ�X�[^��[X�[ۋ�XXܛ�X�[B�][SX�[^��[X�[ۋ�][_B��X��\�^��X��\�B�ە���P�X��^����P�X��B�ې�X��^�ې�X��


HO��J_B�ۓ�[��]^��[��]B�ە\�Y^�
HO��]\�Y�[��YJ_B�\��\�^�\��\�B���[Y[��^���[Y[��B�\���^٘[�_B�ς�
NB�����۝\��\�H�]�\������]Y�ܚXH�XXܛ���[
�YJB��ۜ��]�\��۝^H�[X�[ۏ˚][H�[X�[ۏ˛XXܛ�	��[X�[ۏ˛XXܛ�X�[I��[X�[ۏ˚][H�	��	�
��[X�[ۋ�][H�	��X���[��]\��
���]��[O^��\�^N�	ٛ^	�ZY��	�L	I�ݙ\���Έ	�Y[��_O���ʈ��ۛ�H�[��[H8�%�ܛ�X�[H
��]�\��\��H[��ۙ�
��B�]��[O^���^�K\�^N�	ٛ^	��^\�X�[ێ�	���[[��Z[��Y�ݙ\���Έ	�Y[��_O��XZ[��[O^���^�Kݙ\���Έ	�]]��Z[��Y�_O���۝[�O�XZ[����^Y�]�\���۝^^��]�\��۝^B�۔�[�^�^
HO��[��]
^
_B�ۓ�[��]^��[��]B�ς��]����Y�[�[��O^ܛ�_H\�\�^�\�\�Hۓ�]�^���]�H��\�Y^ܚY���\�YHە���O^�
HO��]�Y���\�Y
�O�X�_Hς��]����\�Y�[�	��\�Y��[�[ې���O^�
HO��]\�Y�[��[�J_Hې�ۙ�\�O^��ۙ�\�U\�YH\��\�^�\��\�HϟB�Q�\��\�^��\�Hς�Q�ۙ�]HX�]�O^��ۙ�]_Hς��]�YT[�[��[�^��]�[�B��۝^^��]�B�[�]X[Y\��Y�O^��][�]\��B�\�\�Y^�\[و\�\�˚YOOH	���[����\�\��Y�[�Y�[�YB�ې���O^����P�]B�ς�ς�
NB
