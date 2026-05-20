/**
 * Mobile design tokens — blue+orange iOS-style.
 * Standalone, completamente DIFFERENTE dal desktop paper/ink editorial.
 *
 * Decisione May 2026: il mobile è la surface primaria per voice + chat
 * freemium per cittadini. Niente Instrument Serif, niente § editorial.
 */

export const MOBILE_COLORS = {
  // Brand
  blue:        "#2563EB",  // Tailwind blue-600 — primary
  blueDark:    "#1D4ED8",  // blue-700 — hover/pressed
  blueLight:   "#DBEAFE",  // blue-100 — chip/badge bg
  orange:      "#EA580C",  // Tailwind orange-600 — accent CTA
  orangeDark:  "#C2410C",  // orange-700 — hover
  orangeLight: "#FED7AA",  // orange-200 — soft accent bg

  // Surface
  bg:          "#FAFAFA",  // app background
  surface:     "#FFFFFF",  // card/sheet
  surfaceAlt:  "#F4F4F5",  // input bg / disabled
  line:        "#E4E4E7",  // borders
  lineSoft:    "#F4F4F5",  // dashed/light dividers

  // Text
  text:        "#18181B",  // primary text — Zinc 900
  textMuted:   "#52525B",  // Zinc 600 — secondary
  textSoft:    "#A1A1AA",  // Zinc 400 — placeholder
  textInverse: "#FAFAFA",  // on dark bg

  // Status
  success:     "#16A34A",  // green-600
  danger:      "#DC2626",  // red-600
  warning:     "#F59E0B",  // amber-500

  // ORB — consistent con desktop (mantengono nomi+hex identici per coerenza brand)
  orb: {
    vermiglio: "#C64227",
    alloro:    "#5A7A3A",
    ambra:     "#D97706",
    blu:       "#2563EB",
  },
} as const;

export const MOBILE_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const MOBILE_SHADOW = {
  // Soft iOS-style shadows
  card:   "0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)",
  modal:  "0 20px 40px rgba(0, 0, 0, 0.18), 0 8px 16px rgba(0, 0, 0, 0.08)",
  orb:    "0 8px 24px rgba(37, 99, 235, 0.28), 0 2px 8px rgba(37, 99, 235, 0.18)",
} as const;

export const MOBILE_FONT = {
  family:
    'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
  // iOS-style sizes
  caption:  11,
  small:    13,
  body:     15,
  bodyLg:   17,
  title3:   20,
  title2:   24,
  title1:   28,
  display:  34,
  hero:     44,
} as const;

export const MOBILE_SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export type OrbColor = keyof typeof MOBILE_COLORS.orb;
export type OrbState = "idle" | "listening" | "thinking" | "speaking";
