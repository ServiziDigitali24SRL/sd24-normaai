"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  key: string;
  label: string;
  score: number;
  done: number;
  total: number;
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
  piano?: string;
  impresa?: Record<string, unknown> | null;
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

const BRANCHES: Record<string, Branch[]> = {
  impresa: [
    { key: 'privacy', label: 'Privacy & GDPR', score: 78, done: 25, total: 32, color: 'var(--alloro)', next: 'Registro dei trattamenti — art. 30' },
    { key: 'lavoro',  label: 'Lavoro & HR',    score: 92, done: 17, total: 18, color: 'oklch(0.55 0.14 145)', next: 'CCNL Commercio — aggiornamento 2026' },
    { key: 'fiscale', label: 'Fiscale',         score: 64, done: 15, total: 24, color: 'oklch(0.72 0.12 75)', next: 'Dichiarazione IVA Q1' },
    { key: 'd231',    label: 'Modello 231',     score: 42, done: 16, total: 38, color: 'var(--vermiglio)', next: 'Modello org.vo — D.Lgs. 24/2023' },
    { key: 'cyber',   label: 'Cyber & NIS2',   score: 55, done: 11, total: 20, color: 'oklch(0.60 0.13 155)', next: 'DVR — revisione annuale' },
  ],
};

const TASKS_BY_MACRO: Record<string, Task[]> = {
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
};

const DEADLINES_BY_MACRO: Record<string, Deadline[]> = {
  privacy: [{ date: '30 Apr', text: 'Rinnovo consensi marketing', urgent: true }, { date: '15 Mag', text: 'Audit annuale GDPR', urgent: false }],
  lavoro:  [{ date: '30 Apr', text: 'Versamento contributi INPS', urgent: true }],
  fiscale: [{ date: '30 Apr', text: 'Liquidazione IVA', urgent: true }, { date: '16 Mag', text: 'F24 mensile', urgent: false }],
};

const DEFAULT_CHECKLIST: CheckItem[] = [
  { text: 'Cookie policy pubblicata', done: true },
  { text: 'Banner cookie installato', done: true },
  { text: 'Registro consensi attivo', done: true },
  { text: 'Cookie tecnici mappati', done: false },
  { text: 'Cookie analytics configurati', done: false },
  { text: 'Cookie marketing audit', done: false },
  { text: 'Contratto DPA Google Analytics', done: false },
  { text: 'Verifica cookie terze parti', done: false },
];

const DEFAULT_DOCS: DocItem[] = [
  { name: 'contratto_aws_dpa.pdf', date: '21 Apr 2026', size: '156 KB', tags: ['#contratto', '#dpa'] },
  { name: 'privacy_shield_cert.pdf', date: '10 Mar 2026', size: '89 KB', tags: ['#privacy'] },
];

const CHAT_SUGGESTIONS: Record<string, string[]> = {
  impresa: ['Genera DPIA per nuovo CRM', 'Revisiona NDA fornitore', 'Checklist audit GDPR', 'Mail al DPO', 'Verifica Mod. 231 vs D.Lgs. 24/2023'],
  cittadino: ['Spiegami il 730 in breve', 'Come recedere da Vodafone', 'Calcola mia tariffa TARI'],
  prof: ['Bozza memoria difensiva', 'Atto di citazione — locazione', 'Parere D.Lgs. 231/2001'],
};

// ─── Small shared components ──────────────────────────────────────────────────

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const cls = tone === 'ok' ? 'badge badge-ok' : tone === 'warn' ? 'badge badge-warn' : tone === 'accent' ? 'badge badge-accent' : 'badge badge-ink';
  return <span className={cls}>{children}</span>;
}

function WidgetCard({ title, icon, action, children, accent }: {
  title: string; icon?: string; action?: React.ReactNode;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <section style={{
      background: 'white', border: '1px solid var(--paper-line)', borderRadius: 10, padding: 20,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--paper-line)' }}>
        {icon && <span style={{ color: 'var(--ink-3)' }}><Icon name={icon} size={14} /></span>}
        <h3 style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)' }}>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function ComplianceScoreCircle({ score, size = 96, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--alloro)' : score >= 60 ? 'oklch(0.70 0.12 75)' : 'var(--vermiglio)';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--paper-line)" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.34,1.56,.64,1)' }}
      />
    </svg>
  );
}

function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 200,
      background: 'var(--ink)', color: 'var(--paper)',
      padding: '12px 18px', borderRadius: 8, boxShadow: 'var(--shadow-3)',
      fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'mdToastIn 0.2s ease-out', maxWidth: 360,
    }}>
      <span style={{ color: 'var(--alloro)' }}>✓</span> {msg}
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────

function DashboardHome({ role, score, branches, onOpenChat, pushToast }: {
  role: string; score: number; branches: Branch[];
  onOpenChat: (ctx?: string) => void; pushToast: (m: string) => void;
}) {
  const suggestions = CHAT_SUGGESTIONS[role] || CHAT_SUGGESTIONS.impresa;

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 18 }}>
        Dashboard Impresa — Compliance Score
      </div>

      {/* Hero score */}
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
            <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(64px, 9vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.03em' }}>{score}</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink-4)' }}>/100</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--alloro)' }}>
              <Icon name="arrowUp" size={11} /> +4 dal mese scorso
            </span>
            <Badge tone={score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'accent'}>
              Rischio {score >= 80 ? 'basso' : score >= 60 ? 'medio-basso' : 'alto'}
            </Badge>
          </div>
        </div>
        <ComplianceScoreCircle score={score} size={140} stroke={12} />
      </section>

      {/* Branch cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(branches.length, 5)}, 1fr)`, gap: 14, marginBottom: 32 }}>
        {branches.map(b => (
          <button key={b.key} onClick={() => pushToast(`Aperto ${b.label}`)} style={{
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

      {/* Chat compliance */}
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
            <button key={i} onClick={() => onOpenChat(s)} style={{
              flex: '0 0 auto', padding: '10px 14px', background: 'white',
              border: '1px solid var(--paper-line)', borderRadius: 999,
              fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink-2)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--paper-line)'; }}
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

function MacroOverview({ macroKey, macroLabel, onBack, onOpenChat, tasks, onToggleTask, deadlines, pushToast }: {
  macroKey: string; macroLabel: string;
  onBack: () => void; onOpenChat: (ctx?: string) => void;
  tasks: Task[]; onToggleTask: (id: string) => void;
  deadlines: Deadline[]; pushToast: (m: string) => void;
}) {
  const allBranches = BRANCHES.impresa;
  const branch = allBranches.find(b => b.key === macroKey) || { score: 70, color: 'var(--ink-3)' };

  return (
    <div style={{ padding: '24px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
        color: 'var(--ink-4)', textTransform: 'uppercase', padding: 0, marginBottom: 14,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        Dashboard <span style={{ color: 'var(--ink-5)' }}>›</span> <span style={{ color: 'var(--ink-2)' }}>{macroLabel}</span>
      </button>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4.2vw, 44px)', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {macroLabel} <em style={{ color: 'var(--ink-4)' }}>— {'score' in branch ? branch.score : 70}%</em>
          </h1>
          <div style={{ height: 8, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden', maxWidth: 520 }}>
            <div style={{ width: ('score' in branch ? branch.score : 70) + '%', height: '100%', background: branch.color, transition: 'width 0.8s ease' }} />
          </div>
        </div>
        <ComplianceScoreCircle score={'score' in branch ? branch.score : 70} size={96} stroke={8} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
        <WidgetCard title={`Task aperti (${tasks.filter(t => !t.done).length})`} icon="check" accent="var(--ink)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tasks.slice(0, 8).map(t => (
              <div key={t.id} onClick={() => { onToggleTask(t.id); pushToast(t.done ? 'Task riaperto' : '✓ Task completato · Score +2%'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid var(--paper-line)', opacity: t.done ? 0.55 : 1 }}>
                <span style={{
                  width: 16, height: 16, border: `1.5px solid ${t.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
                  borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: t.done ? 'var(--alloro)' : 'transparent', flexShrink: 0,
                }}>
                  {t.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3 3 7-7"/></svg>}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: t.done ? 'var(--ink-4)' : 'var(--ink-1)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                {t.due !== '—' && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{t.due}</span>}
                {t.priority === 'alta' && !t.done && <Badge tone="accent">ALTA</Badge>}
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title={`Scadenze prossime 30gg (${deadlines.length})`} icon="clock">
          <div>
            {deadlines.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < deadlines.length - 1 ? '1px solid var(--paper-line)' : 'none', position: 'relative', paddingLeft: 18 }}>
                <span style={{ position: 'absolute', left: 4, top: 18, width: 8, height: 8, borderRadius: '50%', background: d.urgent ? 'var(--vermiglio)' : 'var(--ink-4)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{d.text}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{d.date}</div>
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
        {macroLabel} <span style={{ color: 'var(--ink-5)' }}>›</span> <span style={{ color: 'var(--ink-2)' }}>{itemLabel}</span>
      </button>

      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(26px, 4vw, 40px)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{itemLabel}</h1>
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
          {documents.map((d, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < documents.length - 1 ? '1px solid var(--paper-line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 40, borderRadius: 3, border: '1px solid var(--paper-line)', background: 'var(--paper-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--ink-4)' }}>PDF</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2 }}>{d.date} · {d.size}</div>
                {d.tags && <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                  {d.tags.map(t => <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--paper-2)', padding: '1px 5px', borderRadius: 2 }}>{t}</span>)}
                </div>}
              </div>
              <button style={{ background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '4px 10px', fontSize: 10.5, fontFamily: 'var(--sans)', color: 'var(--ink-3)', cursor: 'pointer' }}>Apri</button>
            </div>
          ))}
          <button onClick={onUpload} style={{ width: '100%', marginTop: 12, padding: 10, border: '1px dashed var(--paper-line)', borderRadius: 6, background: 'transparent', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="paperclip" size={12} /> Carica nuovo documento
          </button>
        </WidgetCard>

        <WidgetCard title="Scadenze estratte automaticamente" icon="clock" accent="var(--vermiglio)">
          {[
            { date: '31 Dic 2026', text: 'Rinnovo DPA AWS', src: 'contratto_aws_dpa.pdf' },
            { date: '15 Giu 2026', text: 'Verifica SCC Google', src: 'scc_google_analytics.pdf' },
          ].map((d, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i === 0 ? '1px solid var(--paper-line)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{d.text}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--vermiglio-ink)' }}>{d.date}</span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginTop: 4, fontStyle: 'italic' }}>estratto da {d.src}</div>
            </div>
          ))}
        </WidgetCard>
      </div>

      <WidgetCard title={`Checklist operativa (${doneCount}/${checklist.length} completate)`} icon="check" accent="var(--alloro)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {checklist.map((c, i) => (
            <div key={i} onClick={() => onToggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', opacity: c.done ? 0.6 : 1 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${c.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
                background: c.done ? 'var(--alloro)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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

function ChatComplianceExpanded({ context, onClose, score, pushToast }: {
  context: string; onClose: () => void;
  score: number; pushToast: (m: string) => void;
}) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: context ? `Sono pronta ad assisterla su "${context}". Come posso essere utile?` : 'Buongiorno. In cosa posso esserle utile oggi?' },
  ]);
  const [input, setInput] = useState('');
  const [widgetOpen, setWidgetOpen] = useState(true);
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
      pushToast(`✓ Risposta ricevuta`);
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
            {widgetOpen ? 'Nascondi' : 'Mostra'} pannello
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
                }}>{m.role === 'user' ? 'U' : '§'}</div>
                <div style={{
                  maxWidth: 540, background: m.role === 'user' ? 'var(--ink)' : 'white',
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
        <aside style={{ width: 280, flexShrink: 0, overflow: 'auto', padding: 20, background: 'var(--paper-tint)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <WidgetCard title="Score real-time" icon="graph">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ComplianceScoreCircle score={score} size={68} stroke={6} />
              <div>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 36, letterSpacing: '-0.02em' }}>{score}</span>
                <span style={{ color: 'var(--ink-4)', fontSize: 14 }}> /100</span>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Aggiornato live</div>
              </div>
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
            </dl>
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

// ─── Main Dashboard (container) ───────────────────────────────────────────────

export default function MainDashboard({ role, user: _user, selection, onBack, onNav, piano }: MainDashboardProps) {
  const [score, setScore] = useState(76);
  const [toast, setToast] = useState<string | null>(null);
  const [chatCtx, setChatCtx] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tasks, setTasks] = useState(TASKS_BY_MACRO);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [documents, setDocuments] = useState(DEFAULT_DOCS);

  const pushToast = (msg: string) => {
    setToast(msg);
    clearTimeout((pushToast as unknown as { _t?: ReturnType<typeof setTimeout> })._t);
    (pushToast as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setToast(null), 3000);
  };

  const openChat = (ctx?: string) => setChatCtx(ctx || (selection?.item) || selection?.macro || 'generale');
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
    setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));
    setScore(s => Math.min(100, s + 2));
    pushToast('✓ Task completato · Score +2%');
  };

  const confirmUpload = (name: string) => {
    setDocuments(d => [{ name, date: '21 Apr 2026', size: '156 KB', tags: ['#nuovo'] }, ...d]);
    setUploadOpen(false);
    setScore(s => Math.min(100, s + 3));
  };

  const branches = BRANCHES[role] || BRANCHES.impresa;

  if (chatCtx) {
    return (
      <>
        <ChatComplianceExpanded context={chatCtx} onClose={closeChat} score={score} pushToast={pushToast} />
        <Toast msg={toast} />
      </>
    );
  }

  let content: React.ReactNode;

  if (!selection || !selection.macro || selection.macro === '__dashboard__') {
    content = <DashboardHome role={role} score={score} branches={branches} onOpenChat={openChat} pushToast={pushToast} />;
  } else if (!selection.item) {
    const macroTasks = tasks[selection.macro] || tasks.privacy || [];
    const macroDeadlines = DEADLINES_BY_MACRO[selection.macro] || DEADLINES_BY_MACRO.privacy || [];
    content = (
      <MacroOverview
        macroKey={selection.macro}
        macroLabel={selection.macroLabel}
        onBack={onBack || (() => {})}
        onOpenChat={openChat}
        tasks={macroTasks}
        onToggleTask={toggleTask}
        deadlines={macroDeadlines}
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
        {/* Upgrade CTA strip for micro plan */}
        {piano === 'impresa_micro' && (
          <aside style={{ width: 220, flexShrink: 0, borderLeft: '1px solid var(--paper-line)', background: 'var(--paper-tint)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Piano attuale</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '-0.02em' }}>MICRO</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>€29/mese · query illimitate</div>
            <button onClick={() => onNav?.('upgrade')} className="btn btn-accent" style={{ width: '100%' }}>
              <Icon name="bolt" size={12} /> Upgrade piano
            </button>
          </aside>
        )}
      </div>
      {uploadOpen && <UploadDocModal onClose={() => setUploadOpen(false)} onConfirm={confirmUpload} pushToast={pushToast} />}
      <Toast msg={toast} />
    </>
  );
}
