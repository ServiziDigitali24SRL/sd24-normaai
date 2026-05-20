"use client";

// NormaAI — AppNav: sidebar verticale 4-item per la navigazione principale
// del prodotto, separata dalla DualSidebar tematica (che lista i temi legali).
//
// Items (scope May 2026):
//   • Chat        → /dashboard          (default, MainDashboard)
//   • Voice       → /voice              (orb 4-state ↔ /api/voice/sofia)
//   • Su Misura   → /su-misura          (static landing + lead capture B2B)
//   • Impostazioni → /impostazioni      (lingua sito/voice/orb/account)
//
// Item "API" RIMOSSO (era nel prototipo precedente). Lo ripristineremo solo
// se in futuro apriamo l'access API a clienti enterprise verticali.

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  glyph: string;          // simbolo editorial coerente con § branding
  description: string;
}

const ITEMS: NavItem[] = [
  { href: "/dashboard",   label: "Chat",         glyph: "§",  description: "Sofia AI · paper/ink editorial" },
  { href: "/voice",       label: "Voice",        glyph: "◉",  description: "Sofia voce · 4-state orb" },
  { href: "/su-misura",   label: "Su Misura",    glyph: "❋",  description: "Soluzioni per aziende" },
  { href: "/impostazioni", label: "Impostazioni", glyph: "⚙",  description: "Lingua, voce, profilo" },
];

export default function AppNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav style={navShell} aria-label="Navigazione principale">
      <Link href="/" style={brandLink}>
        <span style={brandGlyph}>§</span>
        <span style={brandText}>NormaAI</span>
      </Link>

      <ul style={list}>
        {ITEMS.map(it => {
          // Attivo se è prefix match (es. /voice e /voice/test sono entrambi su Voice)
          const isActive = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                style={{ ...itemBase, ...(isActive ? itemActive : null) }}
                title={it.description}
                aria-current={isActive ? "page" : undefined}
              >
                <span style={glyphCell} aria-hidden>{it.glyph}</span>
                <span style={labelCell}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div style={footer}>
        <div style={{ fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 9.5, letterSpacing: "0.08em", opacity: 0.5, textTransform: "uppercase" }}>
          v1 · scope marketplace
        </div>
      </div>
    </nav>
  );
}

// ─── styles (paper/ink editorial) ──────────────────────────────────────────
const navShell: React.CSSProperties = {
  width: 200, flexShrink: 0,
  height: "100vh", position: "sticky", top: 0,
  background: "var(--paper, #F6F2EA)",
  borderRight: "1px solid var(--paper-line, #e8e6e0)",
  display: "flex", flexDirection: "column",
  padding: "22px 14px",
  fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)",
  color: "var(--ink, #13110F)",
};
const brandLink: React.CSSProperties = {
  display: "flex", alignItems: "baseline", gap: 8,
  textDecoration: "none", color: "inherit",
  marginBottom: 28, paddingLeft: 6,
};
const brandGlyph: React.CSSProperties = {
  fontFamily: "var(--serif, 'Instrument Serif', serif)",
  fontSize: 28, lineHeight: 1, color: "var(--vermiglio, #c64227)",
  fontStyle: "italic",
};
const brandText: React.CSSProperties = {
  fontFamily: "var(--serif, 'Instrument Serif', serif)",
  fontSize: 19, letterSpacing: "-0.01em",
};
const list: React.CSSProperties = {
  listStyle: "none", margin: 0, padding: 0,
  display: "flex", flexDirection: "column", gap: 2, flex: 1,
};
const itemBase: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "9px 10px", borderRadius: 5,
  textDecoration: "none", color: "var(--ink-2, #2b2724)",
  fontSize: 13.5,
  transition: "background 120ms ease",
};
const itemActive: React.CSSProperties = {
  background: "white",
  border: "1px solid var(--paper-line, #e8e6e0)",
  color: "var(--ink, #13110F)",
  fontWeight: 500,
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
};
const glyphCell: React.CSSProperties = {
  fontFamily: "var(--serif, 'Instrument Serif', serif)",
  fontSize: 16, width: 16, textAlign: "center",
  color: "var(--ink-3, #4a4540)",
  fontStyle: "italic",
};
const labelCell: React.CSSProperties = {
  letterSpacing: "0.01em",
};
const footer: React.CSSProperties = {
  marginTop: 10, paddingTop: 14,
  borderTop: "1px dashed var(--paper-line, #e8e6e0)",
};
