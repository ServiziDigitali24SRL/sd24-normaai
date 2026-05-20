/**
 * Handoff design system — atoms (SER-209).
 * Logo, NavItem, Stamp, Badge, SectionLabel, Placeholder.
 * Ported from norma-ai-test-template/project/components/Chrome.jsx.
 */

"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

type LogoSize = "sm" | "md" | "lg";

const LOGO_SIZES: Record<LogoSize, { f: number; gap: number }> = {
  sm: { f: 16, gap: 8 },
  md: { f: 20, gap: 10 },
  lg: { f: 28, gap: 12 },
};

export function Logo({ size = "md", mono = false }: { size?: LogoSize; mono?: boolean }) {
  const s = LOGO_SIZES[size];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: s.gap,
        fontFamily: "var(--serif)",
        fontSize: s.f,
        fontStyle: "italic",
        color: mono ? "var(--paper)" : "var(--ink)",
        letterSpacing: "-0.02em",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontSize: s.f * 1.3, lineHeight: 0.8, color: "var(--vermiglio)", fontStyle: "normal" }}>§</span>
        <span>Norma</span>
      </span>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontStyle: "normal",
          fontSize: s.f * 0.55,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: mono ? "var(--ink-5)" : "var(--ink-4)",
          paddingBottom: 2,
        }}
      >
        AI
      </span>
    </div>
  );
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  muted?: boolean;
  onClick?: () => void;
}

export function NavItem({ icon, label, active, badge, muted, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "9px 12px",
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--paper)" : muted ? "var(--ink-4)" : "var(--ink-2)",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        textAlign: "left",
        fontFamily: "var(--sans)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--paper-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: active ? 1 : 0.7,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 3,
            background: active ? "var(--paper-3)" : "var(--vermiglio-soft)",
            color: active ? "var(--ink)" : "var(--vermiglio-ink)",
            fontWeight: 500,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function Stamp({
  children,
  color = "var(--vermiglio-ink)",
  rotate = -1.5,
}: {
  children: ReactNode;
  color?: string;
  rotate?: number;
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "4px 8px",
        border: `1px solid ${color}`,
        borderRadius: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transform: `rotate(${rotate}deg)`,
        color,
      }}
    >
      {children}
    </span>
  );
}

type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "ink";

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: "var(--paper-2)", fg: "var(--ink-3)", bd: "var(--paper-line)" },
  accent: { bg: "var(--vermiglio-soft)", fg: "var(--vermiglio-ink)", bd: "transparent" },
  ok: { bg: "var(--alloro-soft)", fg: "var(--alloro)", bd: "transparent" },
  warn: { bg: "var(--ambra-soft)", fg: "oklch(0.48 0.14 75)", bd: "transparent" },
  ink: { bg: "var(--ink)", fg: "var(--paper)", bd: "var(--ink)" },
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const t = BADGE_TONES[tone];
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: 3,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-4)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--serif)",
          fontSize: 18,
          color: "var(--vermiglio)",
          fontStyle: "italic",
          letterSpacing: 0,
        }}
      >
        §
      </span>
      {children}
    </div>
  );
}

// Re-export Icon for ergonomics when importing atoms.
export { Icon };
