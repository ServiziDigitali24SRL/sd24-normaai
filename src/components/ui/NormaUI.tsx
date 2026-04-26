"use client";

import React from "react";

// ── Logo ──────────────────────────────────────────────────────────────────────
export const Logo = ({ size = 'md', mono = false }: { size?: 'sm' | 'md' | 'lg'; mono?: boolean }) => {
  const sizes = { sm: { f: 16, gap: 8 }, md: { f: 20, gap: 10 }, lg: { f: 28, gap: 12 } };
  const s = sizes[size];
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: s.gap, fontFamily: 'var(--serif)', fontSize: s.f, fontStyle: 'italic', color: mono ? 'var(--paper)' : 'var(--ink)', letterSpacing: '-0.02em' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: s.f * 1.3, lineHeight: 0.8, color: 'var(--vermiglio)', fontStyle: 'normal' }}>§</span>
        <span>Norma</span>
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: s.f * 0.55, letterSpacing: '0.14em', textTransform: 'uppercase', color: mono ? 'var(--ink-5)' : 'var(--ink-4)', paddingBottom: 2 }}>AI</span>
    </div>
  );
};

// ── Icon ──────────────────────────────────────────────────────────────────────
export const NormaIcon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const s = size;
  const common: React.SVGProps<SVGSVGElement> = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths: Record<string, React.ReactNode> = {
    chat:      <><path d="M4 6h16v10H8l-4 4V6z"/></>,
    archive:   <><rect x="3" y="5" width="18" height="4"/><path d="M5 9v10h14V9"/><path d="M10 13h4"/></>,
    pdf:       <><path d="M14 3H6v18h12V7l-4-4z"/><path d="M14 3v4h4"/><path d="M9 13h2v4H9zM13 13h2v2h-2zM17 13h-2"/></>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users:     <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2"/><path d="M21 19c0-2.2-1.8-4-4-4"/></>,
    plug:      <><path d="M9 2v6M15 2v6M8 8h8v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V8zM12 16v6"/></>,
    pen:       <><path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
    star:      <><path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5 6.5-.5z"/></>,
    building:  <><rect x="4" y="3" width="16" height="18"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></>,
    scale:     <><path d="M12 3v18M5 21h14M7 7h10M6 7l-3 8a4 4 0 0 0 8 0l-3-8M18 7l-3 8a4 4 0 0 0 8 0l-3-8"/></>,
    wallet:    <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M17 15h1"/></>,
    check:     <><path d="M4 12l5 5L20 6"/></>,
    plus:      <><path d="M12 5v14M5 12h14"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
    send:      <><path d="M3 12l18-8-8 18-2-8-8-2z"/></>,
    paperclip: <><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></>,
    arrow:     <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    arrowDown: <><path d="M12 5v14M5 13l7 7 7-7"/></>,
    arrowUp:   <><path d="M12 19V5M5 11l7-7 7 7"/></>,
    download:  <><path d="M12 3v14M5 12l7 7 7-7M4 21h16"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
    book:      <><path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/></>,
    alert:     <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></>,
    mail:      <><rect x="3" y="5" width="18" height="14"/><path d="M3 7l9 6 9-6"/></>,
    drive:     <><path d="M8 3h8l6 10-4 7H6L2 13z"/><path d="M8 3L2 13M16 3l6 10M6 20l4-7M14 13h8M10 13L6 20"/></>,
    cloud:     <><path d="M7 18a5 5 0 1 1 .3-10A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z"/></>,
    folder:    <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></>,
    bolt:      <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    lock:      <><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    shield:    <><path d="M12 3l8 3v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z"/></>,
    euro:      <><path d="M18 5a7 7 0 1 0 0 14M3 9h12M3 14h12"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></>,
    graph:     <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></>,
    flame:     <><path d="M12 22a7 7 0 0 1-7-7c0-4 4-6 4-10 2 2 3 3 4 6 1-3 4-3 5-1 1 1.5 1 3 1 5a7 7 0 0 1-7 7z"/></>,
    grad:      <><path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></>,
    close:     <><path d="M6 6l12 12M18 6L6 18"/></>,
    filter:    <><path d="M3 5h18l-7 9v5l-4 2v-7z"/></>,
    pin:       <><path d="M12 2l3 7h6l-5 4 2 7-6-4-6 4 2-7-5-4h6z"/></>,
    org:       <><rect x="9" y="3" width="6" height="4"/><rect x="3" y="17" width="6" height="4"/><rect x="15" y="17" width="6" height="4"/><path d="M12 7v4M6 17v-2h12v2"/></>,
    doc:       <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6M9 8h2"/></>,
    spark:     <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  };
  return <svg {...common}>{paths[name] ?? null}</svg>;
};

// ── Stamp ─────────────────────────────────────────────────────────────────────
export const Stamp = ({ children, color = 'var(--vermiglio-ink)', rotate = -1.5 }: { children: React.ReactNode; color?: string; rotate?: number }) => (
  <span className="mono" style={{
    fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '4px 8px', border: `1px solid ${color}`, borderRadius: 2,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transform: `rotate(${rotate}deg)`, color
  }}>{children}</span>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'ink';
export const NormaBadge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) => {
  const tones: Record<BadgeTone, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: 'var(--paper-2)',      fg: 'var(--ink-3)',      bd: 'var(--paper-line)' },
    accent:  { bg: 'var(--vermiglio-soft)', fg: 'var(--vermiglio-ink)', bd: 'transparent' },
    ok:      { bg: 'rgba(74,155,110,0.12)', fg: '#2D7A50',          bd: 'transparent' },
    warn:    { bg: 'rgba(212,160,23,0.12)', fg: 'oklch(0.48 0.14 75)', bd: 'transparent' },
    ink:     { bg: 'var(--ink)',           fg: 'var(--paper)',      bd: 'var(--ink)' },
  };
  const t = tones[tone];
  return (
    <span className="mono" style={{
      fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 7px', borderRadius: 3,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>{children}</span>
  );
};

// ── SectionLabel ──────────────────────────────────────────────────────────────
export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
    <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--vermiglio)', fontStyle: 'italic', letterSpacing: 0 }}>§</span>
    {children}
  </div>
);

// ── OField / OLabel (Onboarding form fields) ──────────────────────────────────
export const OLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mono" style={{ display: 'block', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 500 }}>{children}</label>
);

interface OFieldProps {
  label: string;
  val: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  autoFilled?: boolean;
  maxLength?: number;
}

export const OField = ({ label, val, onChange, placeholder, type = 'text', required, disabled, autoFilled, maxLength }: OFieldProps) => (
  <div>
    <OLabel>{label}{required && <span style={{ color: 'var(--vermiglio)', marginLeft: 4 }}>*</span>}</OLabel>
    <div style={{ position: 'relative', marginTop: 8 }}>
      <input
        type={type} value={val} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled} maxLength={maxLength}
        style={{
          width: '100%', padding: '13px 16px',
          border: `1px solid ${val ? 'var(--ink)' : 'var(--paper-line)'}`,
          borderRadius: 6, fontSize: 14, fontFamily: 'var(--sans)',
          background: disabled ? 'var(--paper-2)' : 'white', outline: 'none',
          color: disabled ? 'var(--ink-3)' : 'var(--ink)',
          paddingRight: autoFilled ? 40 : 16
        }}
      />
      {autoFilled && (
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--alloro)' }}>
          <NormaIcon name="check" size={14} />
        </span>
      )}
    </div>
  </div>
);

// ── Enterprise Field ──────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  val: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

export const Field = ({ label, val, onChange, placeholder, type = 'text', required }: FieldProps) => (
  <label style={{ display: 'block' }}>
    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6 }}>
      {label}{required && <span style={{ color: 'var(--vermiglio)', marginLeft: 4 }}>*</span>}
    </div>
    <input
      type={type} value={val} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      style={{
        width: '100%', padding: '11px 14px', border: '1px solid var(--paper-line)',
        borderRadius: 6, fontSize: 14, fontFamily: 'var(--sans)', background: 'white',
        outline: 'none', color: 'var(--ink)'
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
      onBlur={e => (e.target.style.borderColor = 'var(--paper-line)')}
    />
  </label>
);

// ── DashHeader ────────────────────────────────────────────────────────────────
export const DashHeader = ({ name, subtitle, right }: { name?: string; subtitle?: string; right?: React.ReactNode }) => (
  <header style={{ display: 'flex', alignItems: 'center', padding: '14px 32px', borderBottom: '1px solid var(--paper-line)', gap: 20, background: 'var(--paper)', flexShrink: 0 }}>
    <div style={{ flex: 1 }}>
      {name && <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--sans)', color: 'var(--ink-1)' }}>{name}</div>}
      {subtitle && <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>
  </header>
);
