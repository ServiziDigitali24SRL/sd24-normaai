"use client";

interface DashHeaderProps {
  name?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function DashHeader({ name, subtitle, right }: DashHeaderProps) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 32px',
      borderBottom: '1px solid var(--paper-line)',
      gap: 20,
      background: 'var(--paper)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        {name && (
          <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--sans)', color: 'var(--ink-1)' }}>
            {name}
          </div>
        )}
        {subtitle && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.12em', color: 'var(--ink-4)',
            textTransform: 'uppercase', marginTop: 2,
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {right}
      </div>
    </header>
  );
}
