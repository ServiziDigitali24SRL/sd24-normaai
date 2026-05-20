"use client";

/**
 * Mobile buttons — iOS-style.
 * - Primary: solid blue
 * - Accent:  solid orange (per CTA secondarie come "Rivolgiti a un legale")
 * - Ghost:   white card con bordo
 * - Link:    text-only blue
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_RADIUS, MOBILE_SHADOW } from "./theme";

type Variant = "primary" | "accent" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function MobileButton({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  iconLeft,
  iconRight,
  disabled,
  children,
  style,
  ...rest
}: MobileButtonProps) {
  const sz =
    size === "sm" ? { padY: 8, padX: 14, font: MOBILE_FONT.small, height: 36 } :
    size === "lg" ? { padY: 16, padX: 22, font: MOBILE_FONT.bodyLg, height: 56 } :
                    { padY: 12, padX: 18, font: MOBILE_FONT.body, height: 48 };

  const styleVariant =
    variant === "primary" ? {
      background: MOBILE_COLORS.blue,
      color: MOBILE_COLORS.textInverse,
      border: "none",
      boxShadow: MOBILE_SHADOW.card,
    } :
    variant === "accent" ? {
      background: MOBILE_COLORS.orange,
      color: MOBILE_COLORS.textInverse,
      border: "none",
      boxShadow: MOBILE_SHADOW.card,
    } :
    variant === "ghost" ? {
      background: MOBILE_COLORS.surface,
      color: MOBILE_COLORS.text,
      border: `1px solid ${MOBILE_COLORS.line}`,
    } :
    /* link */ {
      background: "transparent",
      color: MOBILE_COLORS.blue,
      border: "none",
      padding: 0,
      height: "auto",
      boxShadow: "none",
    };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: variant === "link" ? "auto" : sz.height,
        padding: variant === "link" ? 0 : `${sz.padY}px ${sz.padX}px`,
        borderRadius: variant === "link" ? 0 : MOBILE_RADIUS.md,
        fontFamily: MOBILE_FONT.family,
        fontSize: sz.font,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.55 : 1,
        width: full ? "100%" : "auto",
        transition: "transform 80ms ease, opacity 120ms ease",
        WebkitTapHighlightColor: "transparent",
        ...styleVariant,
        ...style,
      }}
      onPointerDown={(e) => {
        if (variant !== "link" && !disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
        }
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        display: "inline-block",
        animation: "mobileSpin 0.7s linear infinite",
      }}
    />
  );
}

// Keyframes globali per spinner — montati una volta sola in shell.tsx
