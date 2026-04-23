"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import { Badge, WidgetCard, ComplianceScoreCircle, CountUp } from "./DashShared";
import FixedChatBar from "./FixedChatBar";

const DashboardCustom = dynamic(() => import("./DashboardCustom"), { ssr: false });

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââ Fixture data âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const MD_BRANCHES: Record<string, Branch[]> = {
  impresa: [
    { key: 'privacy',   label: 'Privacy & GDPR', score: 78, done: 25, total: 32, tone: 'ok',     color: 'var(--alloro)',        next: 'Registro dei trattamenti â art. 30' },
    { key: 'lavoro',    label: 'Lavoro & HR',    score: 92, done: 17, total: 18, tone: 'ok',     color: 'oklch(0.55 0.14 145)', next: 'CCNL Commercio â aggiornamento 2026' },
    { key: 'fiscale',   label: 'Fiscale',        score: 64, done: 15, total: 24, tone: 'warn',   color: 'oklch(0.72 0.12 75)',  next: 'Dichiarazione IVA Q1' },
    { key: 'sicurezza', label: 'Sicurezza',      score: 85, done: 18, total: 21, tone: 'ok',     color: 'oklch(0.60 0.13 155)', next: 'DVR â revisione annuale' },
    { key: 'd231',      label: 'Modello 231',    score: 42, done: 16, total: 38, tone: 'accent', color: 'var(--vermiglio)',     next: 'Modello org.vo â D.Lgs. 24/2023' },
  ],
  cittadino: [
    { key: 'casa',        label: 'Casa',        score: 60,  done: 3, total: 5,  tone: 'warn',   color: 'oklch(0.72 0.12 75)', next: 'Rinnovo contratto locazione' },
    { key: 'fisco',       label: '730 / Fisco', score: 25,  done: 1, total: 4,  tone: 'accent', color: 'var(--vermiglio)',    next: 'Presentazione 730 entro 30 Set' },
    { key: 'consumatore', label: 'Consumi',     score: 80,  done: 4, total: 5,  tone: 'ok',     color: 'var(--alloro)',       next: 'Recesso Vodafone' },
    { key: 'famiglia',    label: 'Famiglia',    score: 100, done: 2, total: 2,  tone: 'ok',     color: 'var(--alloro)',       next: 'â' },
    { key: 'veicoli',     label: 'Veicoli',     score: 50,  done: 1, total: 2,  tone: 'warn',   color: 'oklch(0.72 0.12 75)', next: 'Revisione auto â entro Lug' },
  ],
  prof: [
    { key: 'lead',      label: 'Marketplace Lead', score: 90, done: 9,  total: 10, tone: 'ok',     color: 'var(--vermiglio)',        next: '7 nuovi lead oggi' },
    { key: 'fascicoli', label: 'Fascicoli attivi', score: 72, done: 18, total: 25, tone: 'ok',     color: 'var(--alloro)',           next: 'Mem. difensiva â 28 Apr' },
    { key: 'clienti',   label: 'Clienti',          score: 88, done: 44, total: 50, tone: 'ok',     color: 'oklch(0.60 0.13 155)',    next: 'Rinnovo mandati' },
    { key: 'cfp',       label: 'Formazione CFP',   score: 40, done: 6,  total: 15, tone: 'accent', color: 'var(--vermiglio)',        next: 'Deontologia â 3 CFP' },
    { key: 'tariffe',   label: 'Parcelle',          score: 65, done: 13, total: 20, tone: 'warn',   color: 'oklch(0.72 0.12 75)',     next: 'Fattura n. 44 â scadenza' },
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
    { id: 'l1', text: 'Revisione profilo directory', due: 'â', priority: 'bassa', done: false },
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
  prof:     ['Bozza memoria difensiva', 'Atto di citazione â locazione', 'Parere D.Lgs. 231/2001', 'Email cliente follow-up'],
};

const MD_LEADS = [
  { id: 'L-2041', title: 'Separazione coniugale',         city: 'Roma',   budget: 'â¬2.500', tier: 'MEDIO' },
  { id: 'L-2042', title: 'Sfratto inquilino moroso',      city: 'Milano', budget: 'â¬1.800', tier: 'ALTO' },
  { id: 'L-2043', title: 'Revisione contratto fornitura', city: 'Torino', budget: 'â¬3.200', tier: 'ALTO' },
];

// âââ Toast ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
      <span style={{ color: 'var(--alloro)' }}>â</span> {toast}
    </div>
  );
}

// âââ Confetti âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââ Dashboard Home âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
    ? `Dashboard Impresa Â· ${((imp?.dimensione as string) || 'MEDIA').toUpperCase()} Â· ${(imp?.dipendenti as string) || '48'} dipendenti`
    : role === 'prof'
    ? `Dashboard Professionista Â· ${(avv?.role as string) || 'Avvocato'} Â· Foro di ${(avv?.foro as string) || 'Roma'}`
    : `Dashboard Cittadino Â· ${(profile?.citta as string) || 'Milano'}`;

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
              Ultimo audit Â· 14 Mar 2026
            </span>
          </div>
        </div>
        <ComplianceScoreCircle score={score} size={140} stroke={12} />
      </section>

      {/* SEGMENTED PROGRESS BAR */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10 }}>
          Rami di conformitÃ 
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--paper-line)', background: 'var(--paper-2)' }}>
          {branches.map(b => (
            <div key={b.key} title={`${b.label} â ${b.score}%`} style={{
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
          <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--vermiglio)', fontStyle: 'italic' }}>Â§</span>
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

// âââ Macro Overview âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
        <span>Dashboard</span> <span style={{ color: 'var(--ink-5)' }}>âº</span> <span style={{ color: 'var(--ink-2)' }}>{macroLabel}</span>
      </button>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4.2vw, 44px)', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {macroLabel} <em style={{ color: 'var(--ink-4)' }}>â {branchScore}%</em>
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
                onClick={() => { onToggleTask(t.id); pushToast(t.done ? 'Task riaperto' : 'â Task completato Â· Score +2%'); }}
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
                {t.due !== 'â' && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{t.due}</span>}
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
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>â</span>
      </button>
    </div>
  );
}

// âââ Subcategory Detail â 6 widget, layout 2 colonne âââââââââââââââââââââââââ

// Mock data per i nuovi widget
const NBA_BY_MACRO: Record<string, { icon: string; text: string; action: string }[]> = {
  casa: [
    { icon: 'ð', text: 'Rinnovo contratto in scadenza il 31 Dic', action: 'Genera bozza di rinnovo' },
    { icon: 'â ï¸', text: 'Clausola rescissione potenzialmente nulla', action: 'Analizza clausola' },
    { icon: 'ð', text: 'Registrazione contratto non completata', action: 'Guida alla registrazione' },
  ],
  fisco: [
    { icon: 'ð', text: '730 da presentare entro il 30 Settembre', action: 'Prepara documentazione' },
    { icon: 'ð°', text: 'Possibile detrazione non sfruttata â bonus ristrutturazione', action: 'Verifica detrazioni' },
    { icon: 'â ï¸', text: 'Scadenza F24 il 16 Maggio', action: 'Calcola importo' },
  ],
  lavoro: [
    { icon: 'ð', text: 'Lettera di contestazione ricevuta â risposta entro 5gg', action: 'Prepara risposta' },
    { icon: 'â ï¸', text: 'Ore straordinari non retribuiti negli ultimi 3 mesi', action: 'Calcola credito' },
    { icon: 'ð', text: 'Scadenza periodo di prova il 15 Maggio', action: 'Verifica posizione' },
  ],
  privacy: [
    { icon: 'ð', text: 'Registro trattamenti non aggiornato da 6 mesi', action: 'Aggiorna registro' },
    { icon: 'â ï¸', text: 'Cookie banner non conforme EDPB 05/2020', action: 'Verifica conformitÃ ' },
    { icon: 'ð', text: 'DPA con Google Analytics non firmato', action: 'Genera DPA' },
  ],
  default: [
    { icon: 'ð', text: 'Documenti caricati analizzati â 2 criticitÃ  trovate', action: 'Vedi analisi' },
    { icon: 'â ï¸', text: 'Scadenza normativa entro 30 giorni', action: 'Verifica scadenza' },
    { icon: 'ð¡', text: 'Aggiornamento normativo rilevante per questa area', action: 'Leggi aggiornamento' },
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
    { text: 'Cos\'Ã¨ il bonus 110% e come funziona per il condominio?', date: '15 Apr', isVoice: true },
  ],
  lavoro: [
    { text: 'Cosa fare in caso di licenziamento senza giusta causa?', date: '19 Apr', isVoice: false },
    { text: 'Come si calcola il TFR?', date: '16 Apr', isVoice: false },
    { text: 'Posso rifiutare il trasferimento in altra sede?', date: '10 Apr', isVoice: true },
  ],
  privacy: [
    { text: 'Come fare una DPIA per il nuovo CRM?', date: '22 Apr', isVoice: false },
    { text: 'Quando Ã¨ obbligatorio nominare il DPO?', date: '19 Apr', isVoice: false },
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
  casa:       { initial: 'M', name: 'M. R***', spec: 'Avvocato â Diritto immobiliare', city: 'Roma', rating: 4.8, reviews: 34 },
  famiglia:   { initial: 'L', name: 'L. B***', spec: 'Avvocato â Diritto di famiglia', city: 'Milano', rating: 4.6, reviews: 22 },
  lavoro:     { initial: 'G', name: 'G. F***', spec: 'Avvocato â Diritto del lavoro', city: 'Torino', rating: 4.9, reviews: 57 },
  fisco:      { initial: 'A', name: 'A. M***', spec: 'Commercialista', city: 'Roma', rating: 4.7, reviews: 41 },
  consumatore:{ initial: 'S', name: 'S. V***', spec: 'Avvocato â Diritto del consumatore', city: 'Milano', rating: 4.5, reviews: 18 },
  veicoli:    { initial: 'P', name: 'P. C***', spec: 'Avvocato â Ricorsi e sanzioni', city: 'Napoli', rating: 4.3, reviews: 29 },
  salute:     { initial: 'R', name: 'R. T***', spec: 'Avvocato â MalasanitÃ  e previdenza', city: 'Bologna', rating: 4.7, reviews: 16 },
  pa:         { initial: 'E', name: 'E. D***', spec: 'Avvocato â Diritto amministrativo', city: 'Roma', rating: 4.8, reviews: 38 },
  fiscale:    { initial: 'C', name: 'C. B***', spec: 'Commercialista â FiscalitÃ  d\'impresa', city: 'Milano', rating: 4.9, reviews: 62 },
  contratti:  { initial: 'N', name: 'N. R***', spec: 'Avvocato â Contrattualistica', city: 'Roma', rating: 4.6, reviews: 25 },
  d231:       { initial: 'F', name: 'F. M***', spec: 'Avvocato â D.Lgs 231/2001', city: 'Milano', rating: 4.8, reviews: 19 },
  appalti:    { initial: 'V', name: 'V. S***', spec: 'Avvocato â Appalti pubblici', city: 'Roma', rating: 4.5, reviews: 14 },
};

type ProfiloState = 'empty' | 'pending' | 'active';

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < full ? '#D4A017' : (i === full && half ? '#D4A017' : 'var(--paper-line)') }}>
          {i < full ? 'â' : (i === full && half ? 'â¯¨' : 'â')}
        </span>
      ))}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 2 }}>
        {rating.toFixed(1)} Â· {count} rec.
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

  // Analisi AI â appare dopo il primo documento
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
        <span style={{ color: 'var(--ink-5)' }}>âº</span>
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

      {/* ââ GRID 2 COLONNE ââ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

        {/* âââ COLONNA SINISTRA âââ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* W1 â Documenti + Analisi AI */}
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
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 2 }}>{d.date} Â· {d.size}</div>
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

            {/* Analisi AI â appare automaticamente dopo il primo documento */}
            {hasAnalysis && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--paper-tint)', borderRadius: 8, border: '1px solid var(--paper-line)', borderLeft: '3px solid var(--vermiglio)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--vermiglio)', fontStyle: 'italic' }}>Â§</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                    Analisi AI Â· {lastDoc.name}
                  </span>
                </div>
                {[
                  { label: 'Clausole critiche', color: 'var(--vermiglio)', items: ['Art. 4 â Rescissione: termine 30gg non conforme L. 431/98', 'Art. 7 â Aggiornamento ISTAT: clausola vessatoria ex art. 1341 c.c.'] },
                  { label: 'Rischi rilevati', color: '#D4A017', items: ['Mancata registrazione entro 30gg â sanzione â¬200-2.000', 'Deposito cauzionale superiore al limite legale (3 mensilitÃ )'] },
                  { label: 'ConformitÃ  normativa', color: 'var(--alloro)', items: ['Durata 4+4 anni: conforme L. 431/1998 art. 2', 'Canone concordato: verifica Accordo Territoriale applicabile'] },
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

          {/* W3 â Cronologia contestuale */}
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
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{c.isVoice ? 'ð¤' : 'ð¬'}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.text}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', flexShrink: 0 }}>{c.date}</span>
                    <span style={{ color: 'var(--ink-4)', fontSize: 12, flexShrink: 0 }}>â</span>
                  </button>
                ))}
              </div>
            )}
          </WidgetCard>

          {/* W4 â Next Best Action */}
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
                      â {a.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>
        </div>

        {/* âââ COLONNA DESTRA âââ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* W2 â Score sottocategoria + Checklist integrata */}
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
                    <span style={{ color: 'var(--vermiglio)', fontSize: 10, flexShrink: 0 }}>â{Math.round(100 / checklist.length)}pt</span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Checklist integrata */}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
              Checklist ({doneCount}/{checklist.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {checklist.map((c, i) => (
                <div
                  key={i}
                  onClick={() => onToggleCheck(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', opacity: c.done ? 0.55 : 1, transition: 'opacity 0.2s', borderBottom: i < checklist.length - 1 ? '1px solid var(--paper-line)' : 'none' }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${c.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
                    background: c.done ? 'var(--alloro)' : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    {c.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3 3 7-7"/></svg>}
                  </span>
                  <span style={{ fontSize: 12, color: c.done ? 'var(--ink-4)' : 'var(--ink-1)', textDecoration: c.done ? 'line-through' : 'none', lineHeight: 1.3 }}>
                    {c.text}
                  </span>
                </div>
              ))}
            </div>
          </WidgetCard>

          {/* W5 â Professionista (4 stati) */}
          {hasMarketplace && (
            <WidgetCard title="Professionista" icon="users" accent="var(--alloro)">
              {profiloState === 'active' ? (
                /* Stato 3: Professionista collegato */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--alloro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 16, color: 'white', flexShrink: 0 }}>
                      {profData?.initial || 'M'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--sans)' }}>Marco Rossi</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{profData?.spec}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 10, padding: '8px 10px', background: 'var(--paper-tint)', borderRadius: 6, fontFamily: 'var(--sans)' }}>
                    Ultimo aggiornamento fascicolo: <strong>oggi</strong>
                  </div>
                  <button
                    onClick={() => pushToast('Workspace condiviso aperto')}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    <Icon name="chat" size={11} /> Apri workspace condiviso
                  </button>
                  <button
                    onClick={() => setProfiloState('empty')}
                    style={{ width: '100%', marginTop: 6, padding: '7px 12px', border: '1px solid var(--paper-line)', borderRadius: 6, background: 'transparent', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer' }}
                  >
                    Consulta professionista esterno â
                  </button>
                </div>
              ) : profiloState === 'pending' ? (
                /* Stato 2: Richiesta inviata */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-3)', flexShrink: 0 }}>
                      {profData?.initial || 'M'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'var(--sans)' }}>{profData?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{profData?.spec} Â· {profData?.city}</div>
                    </div>
                  </div>
                  <div style={{ padding: '9px 12px', background: 'oklch(0.97 0.03 95)', border: '1px solid oklch(0.90 0.06 95)', borderRadius: 6, fontSize: 12, color: '#8B6800', fontFamily: 'var(--sans)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>â³</span> Richiesta inviata Â· Risposta entro 72 ore
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '0 0 8px', fontFamily: 'var(--sans)' }}>
                    Se non risponde entro 72h riceverai rimborso automatico.
                  </p>
                  <button
                    onClick={() => { setProfiloState('active'); pushToast('Professionista collegato al fascicolo!'); }}
                    style={{ width: '100%', padding: '7px', border: '1px solid var(--paper-line)', borderRadius: 6, background: 'transparent', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer' }}
                  >
                    Simula risposta accettata (demo) â
                  </button>
                </div>
              ) : (
                /* Stato 1: Vuoto â mostra marketplace */
                profData ? (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                      Professionista suggerito per <em>{itemLabel}</em>:
                    </p>
                    <div style={{ padding: '12px 14px', background: 'white', border: '1px solid var(--paper-line)', borderRadius: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-3)', flexShrink: 0, filter: 'blur(2px)' }}>
                          {profData.initial}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--sans)' }}>{profData.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{profData.spec}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{profData.city}</div>
                        </div>
                      </div>
                      {profData.reviews > 0 && <StarRating rating={profData.rating} count={profData.reviews} />}
                    </div>
                    <button
                      onClick={() => {
                        setProfiloState('pending');
                        pushToast('Richiesta inviata a ' + profData.name + ' Â· â¬9 addebitati');
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: 12 }}
                    >
                      Invia richiesta â â¬9
                    </button>
                    <p style={{ fontSize: 10.5, color: 'var(--ink-4)', margin: '6px 0 0', textAlign: 'center', fontFamily: 'var(--sans)', fontStyle: 'italic' }}>
                      Nome e contatti sbloccati dopo la risposta del professionista
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic', fontFamily: 'var(--sans)' }}>
                    Nessun professionista disponibile in questa area al momento.
                  </p>
                )
              )}
            </WidgetCard>
          )}

          {/* W6 â Normativa PDF + Template PRO */}
          <WidgetCard title="Normativa & Template" icon="book">
            {/* Normativa come PDF */}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
              Normativa di riferimento
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
              {MD_NORMATIVA.map((n, i) => (
                <button
                  key={i}
                  onClick={() => pushToast('Download PDF: ' + n.label)}
                  style={{
                    padding: '8px 0', borderBottom: i < MD_NORMATIVA.length - 1 ? '1px solid var(--paper-line)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--vermiglio)' }}>Â§</span> {n.label}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--paper-2)', padding: '2px 5px', borderRadius: 2, flexShrink: 0 }}>PDF â</span>
                </button>
              ))}
            </div>

            {/* Template â solo PRO */}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
              Template e modelli
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {MD_TEMPLATES.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 4px', borderBottom: i < MD_TEMPLATES.length - 1 ? '1px solid var(--paper-line)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    opacity: isPro ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--ink-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isPro && <span title="Solo PRO" style={{ fontSize: 11 }}>ð</span>}
                    {t.name}
                  </span>
                  {isPro ? (
                    <button
                      onClick={() => pushToast(`Scaricato ${t.name}.${t.ext}`)}
                      style={{ background: 'var(--paper-2)', border: 'none', padding: '3px 9px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', cursor: 'pointer', color: 'var(--ink-2)' }}
                    >
                      {t.ext} â
                    </button>
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--paper-2)', padding: '2px 6px', borderRadius: 3 }}>PRO</span>
                  )}
                </div>
              ))}
            </div>
            {!isPro && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'oklch(0.97 0.03 95)', borderRadius: 6, fontSize: 11, color: '#8B6800', fontFamily: 'var(--sans)', textAlign: 'center' }}>
                Passa a PRO per scaricare i template â
              </div>
            )}
          </WidgetCard>

        </div>{/* fine colonna destra */}
      </div>{/* fine grid */}
    </div>
  );
}

// âââ Chat Compliance Expanded âââââââââââââââââââââââââââââââââââââââââââââââââ

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
      pushToast(`â Task aggiunto: ${newTask.text}`);
      setTimeout(() => setLiveTasks(t => t.map(x => x.id === newTask.id ? { ...x, isNew: false } : x)), 5000);
    }, 900);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--paper)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: widgetOpen ? '1px solid var(--paper-line)' : 'none' }}>
        <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: '4px 8px', borderRadius: 4, fontFamily: 'var(--sans)' }}>â Torna alla dashboard</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chat Compliance</div>
            {context && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, fontFamily: 'var(--sans)' }}>Contesto: {context}</div>}
          </div>
          <button onClick={() => setWidgetOpen(w => !w)} style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--sans)' }}>
            {widgetOpen ? 'â° Nascondi' : 'â° Mostra'} pannello
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
                }}>{m.role === 'user' ? 'M' : 'Â§'}|/div>
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
              placeholder="Chieda qualcosaâ¦" rows={1}
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

// âââ Upload Doc Modal âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '0 0 8px' }}>Analizzo documentoâ¦</h3>
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
              <dd style={{ margin: 0 }}>Acme SRL â AWS</dd>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Scadenza</dt>
              <dd style={{ margin: 0 }}><strong>31 Dic 2026</strong></dd>
              <dt style={{ fontFamily: 'var(--mono)', color: 'var(--ink-4)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>Categoria</dt>
              <dd style={{ margin: 0 }}>Privacy & GDPR âº Trasferimenti extra-UE</dd>
            </dl>
            <div style={{ marginTop: 18, padding: 14, background: 'var(--paper-tint)', borderRadius: 8, border: '1px solid var(--paper-line)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Task generato</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--sans)' }}>â Rinnovo DPA AWS â 30 Nov 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Modifica</button>
              <button onClick={() => { onConfirm(fileName); pushToast('ð Documento classificato in Privacy & GDPR'); }} className="btn btn-primary" style={{ flex: 1 }}>Conferma</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// âââ Right Panel ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
        {role === 'impresa' && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>10â49 dipendenti Â· â¬79/mese</div>}
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
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{l.city.toUpperCase()} Â· {l.budget} Â· {l.tier}</div>
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
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 10px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>Per casi complessi, un professionista verificato puÃ² assisterLa.</p>
            <button onClick={() => onNav?.('prof')} className="btn btn-ghost" style={{ width: '100%', fontSize: 11.5 }}>Trova professionista</button>
          </WidgetCard>
        </div>
      )}
    </aside>
  );
}

// âââ Main Dashboard (container) âââââââââââââââââââââââââââââââââââââââââââââââ

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
        pushToast('ð Checklist completata al 100%!');
        setTimeout(() => setConfetti(false), 3000);
      } else {
        pushToast('â Task completato Â· Score +2%');
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
        macroKey={selection.macro}
        macroLabel={selection.macroLabel}
        itemLabel={selection.item}
        checklist={checklist}
        onToggleCheck={toggleCheck}
        onBack={onBack || (() => {})}
        onOpenChat={openChat}
        onUpload={() => setUploadOpen(true)}
        pushToast={pushToast}
        documents={documents}
        isPro={false}
      />
    );
  }

  // Contesto per la chat bar: sottocategoria > macro > null (home)
  const chatBarContext = selection?.item || selection?.macro
    ? `${selection?.macroLabel}${selection?.item ? ' / ' + selection.item : ''}`
    : null;

  return (
    <>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Colonna centrale â scrollabile + chat bar fissa in fondo */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{content}</main>
          <FixedChatBar
            context={chatBarContext}
            onSend={(text) => openChat(text)}
            onOpenChat={openChat}
          />
        </div>
        <RightPanel role={role} user={user} onNav={onNav} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(c => !c)} />
      </div>
      {uploadOpen && <UploadDocModal onClose={() => setUploadOpen(false)} onConfirm={confirmUpload} pushToast={pushToast} />}
      <MDToast toast={toast} />
      <MDConfetti active={confetti} />
    </>
  );
}
