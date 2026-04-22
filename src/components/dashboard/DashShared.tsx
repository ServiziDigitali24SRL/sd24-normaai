"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const cls =
    tone === 'ok'     ? 'badge badge-ok'     :
    tone === 'warn'   ? 'badge badge-warn'   :
    tone === 'accent' ? 'badge badge-accent' :
                        'badge badge-ink';
  return <span className={cls}>{children}</span>;
}

// ─── WidgetCard ───────────────────────────────────────────────────────────────

export function WidgetCard({ title, icon, action, children, accent }: {
  title: string;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section style={{
      background: 'white',
      border: accent ? undefined : '1px solid var(--paper-line)',
      borderLeft: accent ? `3px solid ${accent}` : '1px solid var(--paper-line)',
      borderRight: '1px solid var(--paper-line)',
      borderTop: '1px solid var(--paper-line)',
      borderBottom: '1px solid var(--paper-line)',
      borderRadius: 10,
      padding: 20,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, paddingBottom: 12,
        borderBottom: '1px solid var(--paper-line)',
      }}>
        {icon && <span style={{ color: 'var(--ink-3)' }}><Icon name={icon} size={14} /></span>}
        <h3 style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)' }}>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

// ─── ComplianceScoreCircle ────────────────────────────────────────────────────

export function ComplianceScoreCircle({ score, size = 96, stroke = 8 }: {
  score: number; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--alloro)' : score >= 60 ? 'oklch(0.70 0.12 75)' : 'var(--vermiglio)';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--paper-line)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.34,1.56,.64,1)' }}
      />
    </svg>
  );
}

// ─── CountUp — animated number ────────────────────────────────────────────────

export function CountUp({ value, duration = 500, style }: {
  value: number; duration?: number; style?: React.CSSProperties;
}) {
  const [n, setN] = useState(value);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const from = n;
    const to = value;
    const start = performance.now();
    let rafId: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (to - from) * eased);
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span style={style}>{Math.round(n)}</span>;
}
