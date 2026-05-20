"use client";

/**
 * Mobile shell — wrapper layout per ogni screen mobile.
 * - Inietta keyframes globali (ORB + spinner + slide-in)
 * - Gestisce safe area iOS (env(safe-area-inset-*))
 * - Opzionale topbar + slide-in nav (open state controllato qui)
 */

import { useState, type ReactNode } from "react";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "./theme";
import { ORB_KEYFRAMES } from "./orb";
import { MobileNav, MobileTopbar } from "./nav";

interface MobileShellProps {
  children: ReactNode;
  topbar?: boolean;
  topbarTitle?: string;
  topbarTransparent?: boolean;
  topbarRight?: ReactNode;
  /** override navigazione */
  userName?: string;
  userEmail?: string;
  /** padding orizzontale del contenuto */
  contentPadding?: number;
  /** background custom (default bg) */
  background?: string;
}

export function MobileShell({
  children,
  topbar = true,
  topbarTitle,
  topbarTransparent,
  topbarRight,
  userName,
  userEmail,
  contentPadding = MOBILE_SPACING.lg,
  background,
}: MobileShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        ${ORB_KEYFRAMES}
        html, body { background: ${background || MOBILE_COLORS.bg}; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <main
        style={{
          minHeight: "100dvh",
          background: background || MOBILE_COLORS.bg,
          fontFamily: MOBILE_FONT.family,
          color: MOBILE_COLORS.text,
          overscrollBehavior: "none",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {topbar && (
          <MobileTopbar
            onMenuClick={() => setNavOpen(true)}
            title={topbarTitle}
            transparent={topbarTransparent}
            right={topbarRight}
          />
        )}

        <div style={{ flex: 1, padding: `0 ${contentPadding}px`, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </main>

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        userName={userName}
        userEmail={userEmail}
      />
    </>
  );
}

/**
 * MobileScreenHero — header full-bleed con titolo + sub.
 * Usato in welcome / onboarding step.
 */
export function MobileScreenHero({
  title,
  subtitle,
  align = "center",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div style={{ paddingTop: MOBILE_SPACING.xl, paddingBottom: MOBILE_SPACING.lg, textAlign: align }}>
      <h1
        style={{
          fontSize: MOBILE_FONT.display,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: MOBILE_COLORS.text,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: `${MOBILE_SPACING.sm}px 0 0`,
            fontSize: MOBILE_FONT.bodyLg,
            color: MOBILE_COLORS.textMuted,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Sticky bottom action bar — per CTA Continua su onboarding step.
 */
export function MobileBottomBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        padding: `${MOBILE_SPACING.md}px 0 calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_SPACING.md}px)`,
        background: `linear-gradient(to top, ${MOBILE_COLORS.bg} 60%, transparent 100%)`,
        marginTop: "auto",
      }}
    >
      {children}
    </div>
  );
}
