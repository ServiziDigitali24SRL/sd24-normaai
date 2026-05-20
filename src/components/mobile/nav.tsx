"use client";

/**
 * Mobile slide-in nav drawer — equivalent del 4-item AppNav desktop.
 * Items mappati su route mobile dedicate (eccetto /su-misura che riusa
 * la versione desktop esistente).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_RADIUS, MOBILE_SHADOW } from "./theme";

interface MobileNavItem {
  href: string;
  label: string;
  icon: string; // SF Symbols-style glyph
}

const ITEMS: MobileNavItem[] = [
  { href: "/mobile/home",         label: "Home",         icon: "◉" },
  { href: "/mobile/voice",        label: "Voce",         icon: "◎" },
  { href: "/mobile/chat",         label: "Chat",         icon: "✦" },
  { href: "/su-misura",           label: "Su Misura",    icon: "❋" },
  { href: "/mobile/impostazioni", label: "Impostazioni", icon: "⚙" },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

export function MobileNav({ open, onClose, userName, userEmail }: MobileNavProps) {
  const pathname = usePathname() ?? "/";

  // Body scroll lock when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms ease",
          zIndex: 90,
        }}
      />

      {/* Drawer */}
      <aside
        aria-label="Menu di navigazione"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(82vw, 320px)",
          background: MOBILE_COLORS.surface,
          boxShadow: MOBILE_SHADOW.modal,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          fontFamily: MOBILE_FONT.family,
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "calc(env(safe-area-inset-top, 0px) + 20px) 24px 16px",
            borderBottom: `1px solid ${MOBILE_COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/mobile/home"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              textDecoration: "none",
              color: MOBILE_COLORS.text,
            }}
          >
            <span
              style={{
                fontSize: 30,
                lineHeight: 1,
                color: MOBILE_COLORS.blue,
                fontWeight: 700,
              }}
            >
              §
            </span>
            <span style={{ fontSize: MOBILE_FONT.title3, fontWeight: 700, letterSpacing: "-0.015em" }}>NormaAI</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Chiudi menu"
            style={{
              width: 36,
              height: 36,
              borderRadius: MOBILE_RADIUS.sm,
              border: "none",
              background: MOBILE_COLORS.surfaceAlt,
              color: MOBILE_COLORS.text,
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ✕
          </button>
        </header>

        {/* Items */}
        <nav style={{ flex: 1, padding: "16px 12px", overflow: "auto" }}>
          {ITEMS.map((it) => {
            const isActive = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: MOBILE_RADIUS.md,
                  textDecoration: "none",
                  background: isActive ? MOBILE_COLORS.blueLight : "transparent",
                  color: isActive ? MOBILE_COLORS.blue : MOBILE_COLORS.text,
                  fontSize: MOBILE_FONT.bodyLg,
                  fontWeight: isActive ? 600 : 500,
                  marginBottom: 4,
                  transition: "background 120ms ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    width: 28,
                    textAlign: "center",
                    color: isActive ? MOBILE_COLORS.blue : MOBILE_COLORS.textMuted,
                  }}
                  aria-hidden
                >
                  {it.icon}
                </span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer — user identity */}
        {(userName || userEmail) && (
          <footer
            style={{
              padding: "16px 24px calc(env(safe-area-inset-bottom, 0px) + 20px)",
              borderTop: `1px solid ${MOBILE_COLORS.line}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: MOBILE_COLORS.blue,
                color: MOBILE_COLORS.textInverse,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: MOBILE_FONT.body,
                fontWeight: 700,
              }}
            >
              {userName?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: MOBILE_FONT.body, fontWeight: 600, color: MOBILE_COLORS.text, lineHeight: 1.2 }}>
                {userName || "Ospite"}
              </div>
              {userEmail && (
                <div
                  style={{
                    fontSize: MOBILE_FONT.caption,
                    color: MOBILE_COLORS.textSoft,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userEmail}
                </div>
              )}
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}

/**
 * Topbar — barra in alto con burger menu + logo + opzionali azioni.
 * Da usare insieme a MobileNav per gestire l'open state.
 */
interface MobileTopbarProps {
  onMenuClick?: () => void;
  title?: string;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function MobileTopbar({ onMenuClick, title, right, transparent }: MobileTopbarProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
        background: transparent ? "transparent" : MOBILE_COLORS.bg,
        borderBottom: transparent ? "none" : `1px solid ${MOBILE_COLORS.line}`,
        fontFamily: MOBILE_FONT.family,
      }}
    >
      <button
        onClick={onMenuClick}
        aria-label="Apri menu"
        style={{
          width: 40,
          height: 40,
          borderRadius: MOBILE_RADIUS.sm,
          border: "none",
          background: "transparent",
          color: MOBILE_COLORS.text,
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        ☰
      </button>
      {title ? (
        <span style={{ fontSize: MOBILE_FONT.bodyLg, fontWeight: 600, color: MOBILE_COLORS.text }}>{title}</span>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            color: MOBILE_COLORS.text,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1, color: MOBILE_COLORS.blue, fontWeight: 700 }}>§</span>
          <span style={{ fontSize: MOBILE_FONT.body, fontWeight: 700, letterSpacing: "-0.01em" }}>NormaAI</span>
        </span>
      )}
      <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{right}</div>
    </header>
  );
}
