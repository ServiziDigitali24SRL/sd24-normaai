"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Icon from "./Icon";
import { Badge, WidgetCard, ComplianceScoreCircle, CountUp } from "./DashShared";
import { createClient } from "@/lib/supabase-browser";

// ─── Storage key ──────────────────────────────────────────────────────────────

const DC_STORAGE = 'norma.dashboard.v1.';

// ─── Live Supabase data ───────────────────────────────────────────────────────

interface LeadItem { id: string; title: string; city: string; type: string; price: string; urgency: string }

interface SupaData {
  score: number;
  queryUsate: number;
  queryIncluse: number;
  piano: string;
  walletCrediti: number;
  leadCount: number;
  leads: LeadItem[];
}

// ─── Widget catalog ───────────────────────────────────────────────────────────

interface WidgetMeta {
  id: string;
  title: string;
  icon: string;
  size?: string;
}

const DC_WIDGET_CATALOG: Record<string, WidgetMeta[]> = {
  core: [
    { id: 'score',    title: 'Compliance Score globale',  icon: 'graph', size: 'wide' },
    { id: 'tasks',    title: 'Task aperti',               icon: 'check' },
    { id: 'scadenze', title: 'Scadenze imminenti',        icon: 'clock' },
  ],
  optional: [
    { id: 'checklist', title: 'Checklist operativa',       icon: 'check' },
    { id: 'documenti', title: 'Documenti recenti',         icon: 'doc' },
    { id: 'normativa', title: 'Normativa — aggiornamenti', icon: 'book' },
    { id: 'template',  title: 'Template e modelli',        icon: 'download' },
    { id: 'stats',     title: 'Trend compliance',          icon: 'graph' },
    { id: 'calendar',  title: 'Calendario scadenze',       icon: 'clock' },
    { id: 'alerts',    title: 'Alert normativi',           icon: 'alert' },
  ],
  prof: [
    { id: 'leads',  title: 'Lead disponibili', icon: 'flame' },
    { id: 'wallet', title: 'Wallet crediti',   icon: 'wallet' },
  ],
  commercialista: [
    { id: 'fiscali', title: 'Scadenze fiscali', icon: 'clock' },
  ],
  impresa: [
    { id: 'rami', title: 'Rami compliance attivi', icon: 'graph' },
    { id: 'cert', title: 'Certificazioni',          icon: 'shield' },
  ],
};

const DC_CORE_IDS = ['score', 'tasks', 'scadenze'];

function dcWidgetsForRole(role: string, variant?: string): WidgetMeta[] {
  const cat = [...DC_WIDGET_CATALOG.core, ...DC_WIDGET_CATALOG.optional];
  if (role === 'prof') {
    if (variant === 'commercialista') cat.push(...DC_WIDGET_CATALOG.commercialista);
    else cat.push(...DC_WIDGET_CATALOG.prof);
  }
  if (role === 'impresa') cat.push(...DC_WIDGET_CATALOG.impresa);
  return cat;
}

// ─── Email tree ───────────────────────────────────────────────────────────────

interface EmailNode { key: string; label: string; children: string[] }

const DC_EMAIL_TREE: Record<string, EmailNode[]> = {
  impresa: [
    { key: 'privacy', label: 'Privacy & Data Protection', children: ['GDPR — Reg. UE 2016/679', 'Data breach', 'Cookie & tracking', 'Trasferimenti extra-UE'] },
    { key: 'lavoro',  label: 'Lavoro & HR',               children: ['Sicurezza sul lavoro', 'CCNL aggiornamenti', 'Licenziamenti', 'INPS/INAIL'] },
    { key: 'fiscale', label: 'Fiscale & Tributario',      children: ['IVA', 'Dichiarazioni', 'Transfer pricing'] },
    { key: 'd231',    label: 'Modello 231',               children: ['D.Lgs. 231/2001', 'Whistleblowing'] },
  ],
  prof: [
    { key: 'lead',      label: 'Marketplace Lead',  children: ['Lead nuovi giornalieri', 'Lead in scadenza', 'Lead alto valore'] },
    { key: 'normativa', label: 'Ricerca Normativa',  children: ['Nuove sentenze Cassazione', 'Circolari ministeriali', 'Gazzetta Ufficiale'] },
    { key: 'cfp',       label: 'Formazione CFP',     children: ['Nuovi corsi', 'Scadenze crediti'] },
  ],
  cittadino: [
    { key: 'casa',    label: 'Casa',    children: ['Affitti', 'Condominio', 'Bonus casa'] },
    { key: 'fisco',   label: 'Fisco',   children: ['730', 'IMU/TARI', 'Cartelle'] },
    { key: 'consumi', label: 'Consumi', children: ['Bollette', 'Telefonia', 'Banche'] },
  ],
};

// ─── Role-aware fixture data ──────────────────────────────────────────────────

interface Task { id: string; text: string; due: string; priority: string; done: boolean }
interface DeadlineItem { date: string; text: string; urgent: boolean }

const DC_TASKS_BY_ROLE: Record<string, Task[]> = {
  impresa: [
    { id: 't1', text: 'Registro trattamenti art. 30', due: '30 Apr', priority: 'alta',  done: false },
    { id: 't2', text: 'DPIA nuovo CRM',               due: '15 Mag', priority: 'alta',  done: false },
    { id: 't3', text: 'Cookie banner aggiornamento',  due: '10 Mag', priority: 'media', done: false },
    { id: 't4', text: 'Contratto DPA fornitore cloud', due: '20 Mag', priority: 'media', done: false },
  ],
  cittadino: [
    { id: 'c1', text: 'Presentazione 730',            due: '30 Set', priority: 'alta',  done: false },
    { id: 'c2', text: 'Rinnovo contratto locazione',  due: '30 Giu', priority: 'media', done: false },
    { id: 'c3', text: 'Bolletta gas — reclamo',       due: '15 Mag', priority: 'media', done: false },
    { id: 'c4', text: 'Verbale assemblea condominio', due: '12 Mag', priority: 'bassa', done: false },
  ],
  prof: [
    { id: 'p1', text: 'Mem. difensiva Rossi c/ INPS', due: '28 Apr', priority: 'alta',  done: false },
    { id: 'p2', text: 'Revisione profilo directory',  due: '—',      priority: 'bassa', done: false },
    { id: 'p3', text: 'Follow-up lead L-2041',        due: '3 Mag',  priority: 'alta',  done: false },
    { id: 'p4', text: 'Atto citazione Bianchi',       due: '15 Mag', priority: 'media', done: false },
  ],
};
DC_TASKS_BY_ROLE.avvocato        = DC_TASKS_BY_ROLE.prof;
DC_TASKS_BY_ROLE.commercialista  = [
  { id: 'k1', text: 'Dichiarazione IVA Q1',      due: '30 Apr', priority: 'alta',  done: false },
  { id: 'k2', text: 'F24 mensile aprile',         due: '16 Mag', priority: 'alta',  done: false },
  { id: 'k3', text: 'Registro corrispettivi',     due: '15 Mag', priority: 'media', done: false },
  { id: 'k4', text: 'Revisione bilancio cliente', due: '30 Mag', priority: 'media', done: false },
];
DC_TASKS_BY_ROLE.professionista  = DC_TASKS_BY_ROLE.prof;

const DC_SCADENZE_BY_ROLE: Record<string, DeadlineItem[]> = {
  impresa: [
    { date: '30 Apr', text: 'Rinnovo consensi marketing', urgent: true },
    { date: '15 Mag', text: 'Audit annuale GDPR',         urgent: false },
    { date: '22 Mag', text: 'Scadenza CCNL Commercio',    urgent: false },
  ],
  cittadino: [
    { date: '30 Set', text: 'Presentazione 730/Redditi',  urgent: false },
    { date: '16 Giu', text: 'IMU prima rata',             urgent: false },
    { date: '30 Giu', text: 'Registrazione contratto',    urgent: false },
  ],
  prof: [
    { date: '28 Apr', text: 'Udienza Rossi c/ INPS',      urgent: true },
    { date: '3 Mag',  text: 'Follow-up lead L-2041',      urgent: false },
    { date: '30 Giu', text: 'Rinnovo iscrizione albo',    urgent: false },
  ],
  commercialista: [
    { date: '30 Apr', text: 'Liquidazione IVA',           urgent: true },
    { date: '16 Mag', text: 'F24 mensile',                urgent: false },
    { date: '30 Set', text: 'Dichiarazione 730 clienti',  urgent: false },
  ],
};
DC_SCADENZE_BY_ROLE.avvocato       = DC_SCADENZE_BY_ROLE.prof;
DC_SCADENZE_BY_ROLE.professionista = DC_SCADENZE_BY_ROLE.prof;

// ─── Widget renderers ─────────────────────────────────────────────────────────

const DCWScore = ({ score, queryUsate, queryIncluse, piano }: { score: number; queryUsate?: number; queryIncluse?: number; piano?: string }) => {
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const hasRealData = queryIncluse !== undefined && queryIncluse > 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <CountUp value={score} style={{ fontFamily: 'var(--serif)', fontSize: 64, lineHeight: 0.9, letterSpacing: '-0.03em' } as React.CSSProperties} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink-4)' }}>/100</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {hasRealData ? (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
              {queryUsate}/{queryIncluse} query usate
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--alloro)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="arrowUp" size={10} /> +4 dal mese scorso
            </span>
          )}
          <Badge tone={score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'accent'}>
            {piano ? piano.replace('_', ' ').toUpperCase() : (score >= 80 ? 'RISCHIO BASSO' : score >= 60 ? 'RISCHIO MEDIO' : 'RISCHIO ALTO')}
          </Badge>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>
          {hasRealData ? `Aggiornato · ${today}` : 'Ultimo audit · 14 Mar 2026'}
        </div>
      </div>
      <ComplianceScoreCircle score={score} size={110} stroke={10} />
    </div>
  );
};

const DCWTasks = ({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: string) => void }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {tasks.slice(0, 5).map(t => (
      <div key={t.id} onClick={() => onToggle(t.id)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px',
        borderBottom: '1px solid var(--paper-line)', cursor: 'pointer',
        opacity: t.done ? 0.55 : 1,
      }}>
        <span style={{
          width: 16, height: 16,
          border: `1.5px solid ${t.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
          borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: t.done ? 'var(--alloro)' : 'transparent', flexShrink: 0,
        }}>
          {t.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3 3 7-7"/></svg>}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{t.due}</span>
        {t.priority === 'alta' && !t.done && <Badge tone="accent">ALTA</Badge>}
      </div>
    ))}
  </div>
);

const DCWScadenze = ({ scadenze }: { scadenze?: DeadlineItem[] }) => {
  const items = scadenze ?? DC_SCADENZE_BY_ROLE.impresa;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < items.length - 1 ? '1px solid var(--paper-line)' : 'none' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.urgent ? 'var(--vermiglio)' : 'var(--ink-4)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>{d.text}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.1em', marginTop: 2 }}>{d.date}</div>
          </div>
          {d.urgent && <Badge tone="accent">URGENTE</Badge>}
        </div>
      ))}
    </div>
  );
};

const DCWChecklist = () => {
  const [items, setItems] = useState([
    { text: 'Cookie policy pubblicata', done: true },
    { text: 'Banner installato', done: true },
    { text: 'Registro consensi attivo', done: true },
    { text: 'DPIA nuovo CRM', done: false },
    { text: 'Contratto DPA cloud', done: false },
  ]);
  const done = items.filter(i => i.done).length;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{done}/{items.length}</span>
        <div style={{ flex: 1, height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: (done / items.length) * 100 + '%', height: '100%', background: 'var(--alloro)', transition: 'width 0.6s ease' }} />
        </div>
      </div>
      {items.map((c, i) => (
        <div key={i} onClick={() => setItems(a => a.map((x, j) => j === i ? { ...x, done: !x.done } : x))} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 12.5,
          opacity: c.done ? 0.6 : 1,
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${c.done ? 'var(--alloro)' : 'var(--ink-4)'}`,
            background: c.done ? 'var(--alloro)' : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {c.done && <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 8l3 3 7-7"/></svg>}
          </span>
          <span style={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
        </div>
      ))}
    </>
  );
};

const DCWDocumenti = () => (
  <div>
    {[
      { name: 'contratto_aws_dpa.pdf', date: '21 Apr', size: '156 KB', ext: 'PDF' },
      { name: 'ccnl_commercio.docx',   date: '15 Apr', size: '89 KB',  ext: 'DOCX' },
      { name: 'dvr_acme_2026.pdf',     date: '10 Apr', size: '2.1 MB', ext: 'PDF' },
    ].map((d, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--paper-line)' : 'none' }}>
        <div style={{ width: 28, height: 34, border: '1px solid var(--paper-line)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-tint)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ink-4)' }}>{d.ext}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>{d.date} · {d.size}</div>
        </div>
      </div>
    ))}
    <button style={{ width: '100%', marginTop: 10, padding: 8, border: '1px dashed var(--paper-line)', borderRadius: 6, background: 'transparent', color: 'var(--ink-3)', fontSize: 11.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Icon name="paperclip" size={11} /> Trascina file o clicca
    </button>
  </div>
);

const DCWNormativa = () => (
  <div>
    {[
      { title: 'D.Lgs. 24/2023 — Whistleblowing',    date: '18 Apr', neu: true },
      { title: 'Cass. n. 12394/2026 — Licenz.',       date: '15 Apr', neu: true },
      { title: "Circ. AdE 8/E — Credito d'imposta",   date: '10 Apr', neu: false },
      { title: 'EDPB 05/2020 — SCC update',           date: '5 Apr',  neu: false },
    ].map((n, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--paper-line)' : 'none' }}>
        <span style={{ color: 'var(--vermiglio)' }}>→</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{n.title}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)' }}>{n.date}</div>
        </div>
        {n.neu && <Badge tone="warn">NUOVO</Badge>}
      </div>
    ))}
  </div>
);

const DCWTemplate = () => (
  <div>
    {[
      { name: 'Cookie Policy',     ext: 'DOCX', count: 24 },
      { name: 'Registro consensi', ext: 'XLSX', count: 18 },
      { name: 'Informativa breve', ext: 'TXT',  count: 12 },
    ].map((t, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--paper-line)' : 'none', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5 }}>{t.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>Scaricato {t.count} volte</div>
        </div>
        <button style={{ background: 'var(--paper-2)', border: 'none', padding: '4px 9px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer' }}>{t.ext} ↓</button>
      </div>
    ))}
  </div>
);

const DCWStats = () => {
  const points = [60, 64, 68, 72, 70, 74, 76];
  const w = 100 / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * w} ${100 - p}`).join(' ');
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 100 }}>
        <defs>
          <linearGradient id="dc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--alloro)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--alloro)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#dc-grad)" />
        <path d={path} stroke="var(--alloro)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
        <span>OTT</span><span>NOV</span><span>DIC</span><span>GEN</span><span>FEB</span><span>MAR</span><span>APR</span>
      </div>
    </>
  );
};

const DCWCalendar = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const loads: Record<number, number> = { 3: 2, 10: 5, 15: 3, 22: 7, 28: 1, 30: 4 };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
        <span>‹</span><span>Aprile 2026</span><span>›</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {days.map(d => {
          const load = loads[d] || 0;
          const bg = load === 0 ? 'var(--paper-2)' : load < 3 ? 'rgba(74,155,110,0.15)' : load < 6 ? 'rgba(212,160,23,0.15)' : 'rgba(212,74,42,0.15)';
          return (
            <div key={d} style={{ aspectRatio: '1', background: bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--ink-2)', cursor: load ? 'pointer' : 'default' }}>{d}</div>
          );
        })}
      </div>
    </>
  );
};

const DCWAlerts = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[
      { text: 'Nuova sentenza Cass. 12394/2026 — licenziamento illegittimo', time: '2h fa', urgent: true },
      { text: 'Aggiornamento CCNL Commercio pubblicato in G.U.',             time: '1g fa', urgent: false },
      { text: 'Provvedimento Garante — cookie wall',                         time: '3g fa', urgent: false },
    ].map((a, i) => (
      <div key={i} style={{ padding: 10, background: a.urgent ? 'rgba(212,74,42,0.08)' : 'var(--paper-tint)', borderRadius: 6, borderLeft: `2px solid ${a.urgent ? 'var(--vermiglio)' : 'var(--ink-4)'}`, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{a.text}</span>
          <span style={{ color: 'var(--ink-4)', cursor: 'pointer', fontSize: 12 }}>✕</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 3 }}>{a.time}</div>
      </div>
    ))}
  </div>
);

const LEADS_FIXTURE: LeadItem[] = [
  { id: 'f1', title: 'Separazione coniugale', city: 'Roma',   type: 'PRIVATO', price: '€75',  urgency: 'MEDIA' },
  { id: 'f2', title: 'Consulenza GDPR',       city: 'Milano', type: 'IMPRESA', price: '€150', urgency: 'ALTA'  },
  { id: 'f3', title: 'Sfratto moroso',         city: 'Torino', type: 'PRIVATO', price: '€75',  urgency: 'ALTA'  },
];

const DCWLeads = ({ leads, leadCount }: { leads?: LeadItem[]; leadCount?: number }) => {
  const displayLeads = (leads && leads.length > 0) ? leads : LEADS_FIXTURE;
  const count = leadCount ?? 7;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {count > 0 ? `${count} disponibili` : 'Nessun lead oggi'}
      </div>
      {displayLeads.map((l, i) => (
        <div key={l.id ?? i} style={{ padding: 10, background: 'white', border: '1px solid var(--paper-line)', borderRadius: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{l.title}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {l.city.toUpperCase()} · {l.type} · {l.urgency}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '5px 8px', fontSize: 11 }}>Acquista {l.price}</button>
        </div>
      ))}
    </div>
  );
};

const DCWWallet = ({ walletBalance }: { walletBalance?: number }) => {
  const euros = walletBalance ?? 0;
  const whole = Math.floor(euros);
  const cents = String(Math.round((euros % 1) * 100)).padStart(2, '0');
  const isReal = walletBalance !== undefined;
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Saldo</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 38, letterSpacing: '-0.02em', lineHeight: 1 }}>
        €{isReal ? whole : 500}<span style={{ fontSize: 18, color: 'var(--ink-4)' }}>,{isReal ? cents : '00'}</span>
      </div>
      {!isReal && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--paper-tint)', borderRadius: 6, fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Lead acquistato</span>
            <span style={{ color: 'var(--vermiglio-ink)' }}>−€75</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>21 Apr 2026</div>
        </div>
      )}
      {isReal && euros === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>Ricarica per acquistare lead</div>
      )}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>+ Ricarica</button>
    </div>
  );
};

const DCWFiscali = () => (
  <div>
    {[
      { date: '30 Apr', text: 'Liquidazione IVA Q1', badge: 'IVA',  urg: 'red' as const },
      { date: '16 Mag', text: 'F24 mensile',         badge: 'F24',  urg: 'ambra' as const },
      { date: '31 Mag', text: 'Invio dich. INPS',    badge: 'INPS', urg: 'ambra' as const },
      { date: '30 Giu', text: 'Modello Redditi',     badge: 'DICH', urg: null },
    ].map((s, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--paper-line)' : 'none' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: s.urg === 'red' ? 'var(--vermiglio-ink)' : s.urg === 'ambra' ? 'oklch(0.5 0.14 75)' : 'var(--ink-3)', width: 52 }}>{s.date}</span>
        <span style={{ flex: 1, fontSize: 12 }}>{s.text}</span>
        <Badge>{s.badge}</Badge>
      </div>
    ))}
  </div>
);

const DCWRami = () => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>12/24 ATTIVI</span>
    </div>
    {[
      { name: 'Privacy & GDPR', score: 78, color: 'var(--alloro)' },
      { name: 'Lavoro & HR',    score: 92, color: 'oklch(0.55 0.14 145)' },
      { name: 'Fiscale',        score: 64, color: 'oklch(0.72 0.12 75)' },
      { name: 'Sicurezza',      score: 85, color: 'var(--alloro)' },
      { name: 'Modello 231',    score: 42, color: 'var(--vermiglio)' },
    ].map((r, i) => (
      <div key={i} style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
          <span>{r.name}</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 10 }}>{r.score}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: r.score + '%', height: '100%', background: r.color }} />
        </div>
      </div>
    ))}
  </div>
);

const DCWCert = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    {[
      { name: 'ISO 9001',  days: 89,  tone: 'warn'   as const },
      { name: 'ISO 27001', days: 220, tone: 'ok'     as const },
      { name: 'ISO 45001', days: 45,  tone: 'accent' as const },
      { name: 'SA8000',    days: 310, tone: 'ok'     as const },
    ].map((c, i) => (
      <div key={i} style={{ padding: 10, background: 'var(--paper-tint)', borderRadius: 6, border: '1px solid var(--paper-line)' }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2 }}>Scade tra {c.days}g</div>
        <div style={{ marginTop: 6 }}>
          <Badge tone={c.tone}>{c.tone === 'accent' ? 'URGENTE' : c.tone === 'warn' ? 'SCADE' : 'OK'}</Badge>
        </div>
      </div>
    ))}
  </div>
);

// ─── Renderer map ─────────────────────────────────────────────────────────────

type RendererProps = {
  score?: number;
  tasks?: Task[];
  onToggle?: (id: string) => void;
  scadenze?: DeadlineItem[];
  queryUsate?: number;
  queryIncluse?: number;
  piano?: string;
  leads?: LeadItem[];
  leadCount?: number;
  walletBalance?: number;
};

const DC_RENDERERS: Record<string, React.ComponentType<RendererProps>> = {
  score:     DCWScore as React.ComponentType<RendererProps>,
  tasks:     DCWTasks as React.ComponentType<RendererProps>,
  scadenze:  DCWScadenze as React.ComponentType<RendererProps>,
  checklist: DCWChecklist as React.ComponentType<RendererProps>,
  documenti: DCWDocumenti as React.ComponentType<RendererProps>,
  normativa: DCWNormativa as React.ComponentType<RendererProps>,
  template:  DCWTemplate as React.ComponentType<RendererProps>,
  stats:     DCWStats as React.ComponentType<RendererProps>,
  calendar:  DCWCalendar as React.ComponentType<RendererProps>,
  alerts:    DCWAlerts as React.ComponentType<RendererProps>,
  leads:     DCWLeads as React.ComponentType<RendererProps>,
  wallet:    DCWWallet as React.ComponentType<RendererProps>,
  fiscali:   DCWFiscali as React.ComponentType<RendererProps>,
  rami:      DCWRami as React.ComponentType<RendererProps>,
  cert:      DCWCert as React.ComponentType<RendererProps>,
};

// ─── Add Widget Modal ─────────────────────────────────────────────────────────

function AddWidgetModal({ catalog, active, onClose, onAdd }: {
  catalog: WidgetMeta[];
  active: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const groups = [
    { label: 'Sempre attivi', items: catalog.filter(c => DC_CORE_IDS.includes(c.id)), disabled: true },
    { label: 'Attivabili',    items: catalog.filter(c => !DC_CORE_IDS.includes(c.id)), disabled: false },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(19,17,15,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 40 }}>
      <div style={{ background: 'var(--paper)', borderRadius: 14, width: 'min(520px,100%)', maxHeight: '85vh', overflow: 'auto', padding: 28, boxShadow: 'var(--shadow-3)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <Icon name="close" size={16} />
        </button>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Personalizza dashboard</div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Aggiungi widget</h2>

        {groups.map(g => (
          <div key={g.label} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8 }}>{g.label}</div>
            {g.items.map(w => {
              const isActive = active.includes(w.id);
              const checked = g.disabled ? true : (isActive || sel.includes(w.id));
              const disabled = g.disabled || isActive;
              return (
                <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--paper-line)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => !disabled && toggle(w.id)} style={{ accentColor: 'var(--vermiglio)' }} />
                  <Icon name={w.icon} size={13} />
                  <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--sans)' }}>{w.title}</span>
                  {isActive && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>ATTIVO</span>}
                </label>
              );
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Annulla</button>
          <button onClick={() => { onAdd(sel); onClose(); }} className="btn btn-primary" style={{ flex: 1 }} disabled={sel.length === 0}>
            Aggiungi {sel.length > 0 ? `(${sel.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Panel ──────────────────────────────────────────────────────────────

interface EmailPrefs { subs: Record<string, string[]>; freq: string }

function EmailPanel({ role, prefs, onChange, pushToast }: {
  role: string;
  prefs: EmailPrefs;
  onChange: (p: EmailPrefs) => void;
  pushToast?: (m: string) => void;
}) {
  const tree = DC_EMAIL_TREE[role === 'prof' ? 'prof' : role === 'impresa' ? 'impresa' : 'cittadino'] || DC_EMAIL_TREE.impresa;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const checkRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    tree.forEach(node => {
      const el = checkRefs.current[node.key];
      if (!el) return;
      const subs = prefs.subs[node.key] || [];
      el.indeterminate = subs.length > 0 && subs.length < node.children.length;
    });
  }, [prefs, tree]);

  const toggleChild = (parent: string, child: string) => {
    const current = prefs.subs[parent] || [];
    const next = current.includes(child) ? current.filter(x => x !== child) : [...current, child];
    onChange({ ...prefs, subs: { ...prefs.subs, [parent]: next } });
  };

  const toggleParent = (parent: string, children: string[]) => {
    const current = prefs.subs[parent] || [];
    const all = current.length === children.length;
    onChange({ ...prefs, subs: { ...prefs.subs, [parent]: all ? [] : [...children] } });
  };

  return (
    <section style={{ marginTop: 24, background: 'white', border: '1px solid var(--paper-line)', borderRadius: 10, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Icon name="mail" size={16} />
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '-0.02em' }}>Notifiche email</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--sans)', margin: '0 0 18px', maxWidth: 560, lineHeight: 1.5 }}>
        Riceva alert email solo per le categorie selezionate.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8 }}>Categorie monitorate</div>
          {tree.map(node => {
            const subs = prefs.subs[node.key] || [];
            const all = subs.length === node.children.length;
            const isExp = expanded[node.key] !== false;
            return (
              <div key={node.key} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span onClick={() => setExpanded(e => ({ ...e, [node.key]: !isExp }))} style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', width: 10 }}>
                    {isExp ? '▼' : '▶'}
                  </span>
                  <input
                    type="checkbox"
                    checked={all}
                    ref={el => { checkRefs.current[node.key] = el; }}
                    onChange={() => toggleParent(node.key, node.children)}
                    style={{ accentColor: 'var(--vermiglio)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)' }}>{node.label}</span>
                </div>
                {isExp && (
                  <div style={{ marginLeft: 32, marginTop: 4 }}>
                    {node.children.map(c => (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
                        <input type="checkbox" checked={(subs).includes(c)} onChange={() => toggleChild(node.key, c)} style={{ accentColor: 'var(--vermiglio)' }} />
                        {c}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8 }}>Frequenza invio</div>
          {[
            { v: 'realtime', l: 'Real-time (immediatamente)' },
            { v: 'daily',    l: 'Giornaliera (ogni giorno ore 9:00)' },
            { v: 'weekly',   l: 'Settimanale (lunedì ore 9:00)' },
            { v: 'urgent',   l: 'Solo urgenti' },
          ].map(o => (
            <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)' }}>
              <input type="radio" name="dcfreq" checked={prefs.freq === o.v} onChange={() => onChange({ ...prefs, freq: o.v })} style={{ accentColor: 'var(--vermiglio)' }} />
              {o.l}
            </label>
          ))}
          <button onClick={() => pushToast?.('✓ Preferenze email salvate. Email di conferma inviata.')} className="btn btn-primary" style={{ marginTop: 16 }}>
            Salva preferenze email
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── DashboardCustom — main component ────────────────────────────────────────

interface DashboardCustomProps {
  role: string;
  variant?: string;
  user?: Record<string, unknown> | null;
  onOpenChat?: (ctx?: string) => void;
  pushToast?: (m: string) => void;
}

interface DCConfig {
  widgets: string[];
  email: EmailPrefs;
}

export default function DashboardCustom({ role, variant, onOpenChat: _onOpenChat, pushToast }: DashboardCustomProps) {
  const storageKey = DC_STORAGE + role + (variant ? '-' + variant : '');
  const catalog = useMemo(() => dcWidgetsForRole(role, variant), [role, variant]);

  const [config, setConfig] = useState<DCConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved) return saved;
      } catch {}
    }
    const defaultIds =
      role === 'prof'    ? ['score', 'tasks', 'scadenze', 'leads', 'wallet', 'normativa'] :
      role === 'impresa' ? ['score', 'tasks', 'scadenze', 'rami', 'normativa', 'cert']    :
                           ['score', 'tasks', 'scadenze', 'documenti', 'normativa'];
    return { widgets: defaultIds, email: { subs: {}, freq: 'daily' } };
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(config)); } catch {}
  }, [config, storageKey]);

  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [supaData, setSupaData] = useState<SupaData | null>(null);

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;

      const { data: sub } = await client
        .from('subscriptions')
        .select('piano, query_incluse, query_usate_mese')
        .eq('user_id', user.id)
        .maybeSingle();

      const queryUsate = sub?.query_usate_mese ?? 0;
      const queryIncluse = sub?.query_incluse ?? 1;
      const score = Math.min(100, 50 + Math.round((queryUsate / Math.max(queryIncluse, 1)) * 50));
      const walletCrediti = (user.user_metadata?.wallet_crediti as number) ?? 0;

      let leadCount = 0;
      let leads: LeadItem[] = [];
      if (role === 'prof' && variant !== 'commercialista') {
        try {
          const res = await fetch('/api/leads/preview?verticale=avvocato&limit=3');
          const json = await res.json() as { leads?: { id: string; summary_preview?: string; vertical?: string; city?: string | null; lead_tier?: string; price_cents?: number }[]; count?: number };
          leadCount = json.count ?? 0;
          leads = (json.leads ?? []).slice(0, 3).map(l => ({
            id: l.id,
            title: l.summary_preview || l.vertical || 'Consulenza legale',
            city: l.city ?? '—',
            type: l.lead_tier === 'hot' ? 'URGENTE' : 'PRIVATO',
            price: '€' + Math.round((l.price_cents ?? 4900) / 100),
            urgency: l.lead_tier === 'hot' ? 'ALTA' : 'MEDIA',
          }));
        } catch {}
      }

      setSupaData({ score, queryUsate, queryIncluse, piano: sub?.piano ?? '', walletCrediti, leadCount, leads });
    });
  }, [role, variant]);

  const score = supaData?.score ?? 76;
  const roleKey = role === 'avvocato' || role === 'commercialista' || role === 'professionista' ? role : (role === 'prof' ? 'prof' : role === 'impresa' ? 'impresa' : 'cittadino');
  const [tasks, setTasks] = useState<Task[]>(() => DC_TASKS_BY_ROLE[roleKey] ?? DC_TASKS_BY_ROLE.impresa);
  const scadenze = DC_SCADENZE_BY_ROLE[roleKey] ?? DC_SCADENZE_BY_ROLE.impresa;

  const toggleTask = (id: string) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));

  const removeWidget = (id: string) => {
    if (DC_CORE_IDS.includes(id)) return;
    setConfig(c => ({ ...c, widgets: c.widgets.filter(w => w !== id) }));
    pushToast?.('Widget rimosso. Aggiungi di nuovo da ⚙️');
  };

  const addWidgets = (ids: string[]) => {
    setConfig(c => ({ ...c, widgets: [...c.widgets, ...ids] }));
    pushToast?.(`✓ ${ids.length} widget aggiunti`);
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setConfig(c => {
      const arr = [...c.widgets];
      const from = arr.indexOf(dragId);
      const to = arr.indexOf(overId);
      if (from < 0 || to < 0) return c;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      return { ...c, widgets: arr };
    });
  };
  const onDragEnd = () => { setDragId(null); pushToast?.('✓ Posizione salvata'); };

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>Dashboard personalizzata</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 40px)', margin: '10px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Benvenuto <em style={{ color: 'var(--ink-4)' }}>— oggi</em>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {editMode ? (
            <>
              <button onClick={() => setAddOpen(true)} className="btn btn-ghost"><Icon name="plus" size={13} /> Aggiungi widget</button>
              <button onClick={() => { setEditMode(false); pushToast?.('✓ Dashboard salvata'); }} className="btn btn-primary"><Icon name="check" size={13} /> Fine</button>
            </>
          ) : (
            <>
              <button onClick={() => setAddOpen(true)} className="btn btn-ghost"><Icon name="plus" size={13} /> Aggiungi widget</button>
              <button onClick={() => setEditMode(true)} className="btn btn-ghost"><Icon name="settings" size={13} /> Personalizza</button>
            </>
          )}
        </div>
      </div>

      {/* Widget grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {config.widgets.map(id => {
          const meta = catalog.find(c => c.id === id);
          if (!meta) return null;
          const R = DC_RENDERERS[id];
          const isCore = DC_CORE_IDS.includes(id);
          const isWide = meta.size === 'wide';
          return (
            <div
              key={id}
              draggable={editMode}
              onDragStart={() => onDragStart(id)}
              onDragOver={(e) => onDragOver(e, id)}
              onDragEnd={onDragEnd}
              style={{
                background: 'white',
                border: editMode ? '1px dashed var(--ink-4)' : '1px solid var(--paper-line)',
                borderRadius: 10, padding: 18, position: 'relative',
                gridColumn: isWide ? 'span 2' : 'auto',
                opacity: dragId === id ? 0.4 : 1,
                transition: 'opacity 0.2s, border 0.2s',
                animation: 'mdSlideIn 0.3s ease-out',
                cursor: editMode ? 'grab' : 'default',
              }}
            >
              <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--paper-line)' }}>
                {editMode && <span style={{ color: 'var(--ink-4)', cursor: 'grab', fontSize: 14, letterSpacing: '-1px' }}>⋮⋮</span>}
                <Icon name={meta.icon} size={13} />
                <h3 style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)' }}>{meta.title}</h3>
                {editMode && !isCore && (
                  <button onClick={() => removeWidget(id)} title="Rimuovi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2 }}>
                    <Icon name="close" size={13} />
                  </button>
                )}
              </header>
              {R && <R
                score={score}
                tasks={tasks}
                onToggle={toggleTask}
                scadenze={scadenze}
                queryUsate={supaData?.queryUsate}
                queryIncluse={supaData?.queryIncluse}
                piano={supaData?.piano}
                leads={supaData?.leads}
                leadCount={supaData?.leadCount}
                walletBalance={supaData?.walletCrediti}
              />}
            </div>
          );
        })}
      </div>

      {/* Email panel — only in edit mode */}
      {editMode && (
        <EmailPanel
          role={role}
          prefs={config.email}
          onChange={(email) => setConfig(c => ({ ...c, email }))}
          pushToast={pushToast}
        />
      )}

      {addOpen && (
        <AddWidgetModal
          catalog={catalog}
          active={config.widgets}
          onClose={() => setAddOpen(false)}
          onAdd={addWidgets}
        />
      )}
    </div>
  );
}
