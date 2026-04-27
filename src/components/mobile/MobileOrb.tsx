"use client";

/**
 * MobileOrb — ported 1:1 from NormaAI_Mobile-handoff design file (prefs.jsx → Orb).
 * Colors are state-aware: idle / listening / thinking / speaking each have
 * their own inner gradient, outer blob, glow and ring/orbit colors.
 *
 * Personality → design style mapping:
 *   classico → classic  (carta & ambra)
 *   notte    → fire     (vermiglio intenso — diretto/aggressivo)
 *   natura   → forest   (verde alloro — dolce e calmo)
 *   aurora   → ocean    (blu fresco — giovani)
 *   globo    → minimal  (inchiostro neutro — universale)
 */

import React from "react";
import type { OrbState } from "@/hooks/useMobileVoice";

export type OrbStyle = "classico" | "notte" | "natura" | "aurora" | "globo";

interface MobileOrbProps {
  state: OrbState;
  onTap: () => void;
  size?: number;   // overall button container size (default 240)
  orbStyle?: OrbStyle;
}

// ── Keyframes — copied verbatim from design file ─────────────────────────────
const ORB_KEYFRAMES = `
  @keyframes orb-breathe      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  @keyframes orb-listen-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  @keyframes orb-rotate       { to{transform:rotate(360deg)} }
  @keyframes orb-speak        { 0%,100%{transform:scale(1)} 25%{transform:scale(1.05)} 60%{transform:scale(0.98)} }
  @keyframes orb-ring         { 0%{transform:scale(0.9);opacity:0.55} 100%{transform:scale(1.45);opacity:0} }
  @keyframes orb-ring-fast    { 0%{transform:scale(0.9);opacity:0.6}  100%{transform:scale(1.35);opacity:0} }
  @keyframes blob-morph-a {
    0%,100%{border-radius:58% 42% 55% 45% / 52% 48% 52% 48%}
    33%    {border-radius:45% 55% 42% 58% / 48% 55% 45% 52%}
    66%    {border-radius:52% 48% 58% 42% / 45% 52% 48% 55%}
  }
  @keyframes blob-morph-b {
    0%,100%{border-radius:48% 52% 45% 55% / 55% 45% 52% 48%}
    50%    {border-radius:55% 45% 52% 48% / 48% 55% 45% 52%}
  }
  @keyframes dots-bounce {
    0%,80%,100%{opacity:0.3;transform:translateY(0)}
    40%        {opacity:1;transform:translateY(-3px)}
  }
`;

// ── Per-state color palettes — ported from design file's PALLA_STYLES ────────
type StateColors = {
  inner: string;
  outer: string;
  glow:  string;
  ring?: string;
  orbit?: string;
};
type StylePalette = Record<OrbState, StateColors>;

const PALLA_STYLES: Record<OrbStyle, StylePalette> = {
  // ── CLASSICO → classic (carta & ambra) ──────────────────────────────────
  classico: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, #F6F2EA 0%, #E6DFCF 55%, #C9BFA8 100%)",
      outer: "radial-gradient(circle at 30% 30%, #EFE9DC 0%, #C9BFA8 70%)",
      glow:  "oklch(0.58 0.18 35 / 0.12)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.82 0.14 45) 0%, oklch(0.65 0.19 35) 50%, oklch(0.48 0.18 30) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.7 0.18 40) 0%, oklch(0.5 0.17 30) 70%)",
      glow:  "oklch(0.58 0.2 35 / 0.5)",
      ring:  "oklch(0.58 0.19 35 / 0.7)",
    },
    thinking: {
      inner: "conic-gradient(from 0deg, oklch(0.6 0.08 230), oklch(0.52 0.12 280), oklch(0.45 0.08 200), oklch(0.6 0.08 230))",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.55 0.1 240) 0%, oklch(0.35 0.1 240) 70%)",
      glow:  "oklch(0.5 0.1 240 / 0.4)",
      orbit: "oklch(0.85 0.1 230)",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, oklch(0.85 0.15 85) 0%, oklch(0.7 0.17 65) 40%, oklch(0.58 0.18 35) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.75 0.17 60) 0%, oklch(0.55 0.18 35) 70%)",
      glow:  "oklch(0.7 0.17 65 / 0.55)",
      ring:  "oklch(0.7 0.17 65 / 0.8)",
    },
  },

  // ── NOTTE → fire (vermiglio intenso — diretto/aggressivo) ───────────────
  notte: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.86 0.14 55) 0%, oklch(0.68 0.19 40) 55%, oklch(0.48 0.19 28) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.72 0.2 45) 0%, oklch(0.48 0.19 28) 70%)",
      glow:  "oklch(0.62 0.2 35 / 0.35)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.9 0.14 70) 0%, oklch(0.72 0.2 45) 45%, oklch(0.5 0.22 28) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.78 0.21 50) 0%, oklch(0.5 0.22 28) 70%)",
      glow:  "oklch(0.62 0.22 35 / 0.65)",
      ring:  "oklch(0.6 0.22 30 / 0.85)",
    },
    thinking: {
      inner: "conic-gradient(from 0deg, oklch(0.88 0.14 70), oklch(0.65 0.2 40), oklch(0.45 0.2 25), oklch(0.88 0.14 70))",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.7 0.2 50) 0%, oklch(0.4 0.2 30) 70%)",
      glow:  "oklch(0.58 0.2 35 / 0.55)",
      orbit: "oklch(0.92 0.14 80)",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, oklch(0.92 0.15 85) 0%, oklch(0.75 0.2 55) 40%, oklch(0.55 0.22 30) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.8 0.2 55) 0%, oklch(0.5 0.22 30) 70%)",
      glow:  "oklch(0.75 0.2 60 / 0.7)",
      ring:  "oklch(0.7 0.2 50 / 0.85)",
    },
  },

  // ── NATURA → forest (verde alloro — dolce e calmo) ──────────────────────
  natura: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.82 0.08 140) 0%, oklch(0.6 0.11 145) 55%, oklch(0.38 0.1 150) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.68 0.1 145) 0%, oklch(0.4 0.1 150) 70%)",
      glow:  "oklch(0.5 0.1 145 / 0.3)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.86 0.1 135) 0%, oklch(0.62 0.14 145) 45%, oklch(0.4 0.12 155) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.7 0.12 140) 0%, oklch(0.42 0.12 155) 70%)",
      glow:  "oklch(0.55 0.13 145 / 0.55)",
      ring:  "oklch(0.52 0.13 145 / 0.85)",
    },
    thinking: {
      inner: "conic-gradient(from 0deg, oklch(0.72 0.08 135), oklch(0.5 0.12 155), oklch(0.4 0.1 130), oklch(0.72 0.08 135))",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.55 0.1 140) 0%, oklch(0.34 0.1 150) 70%)",
      glow:  "oklch(0.48 0.1 145 / 0.5)",
      orbit: "oklch(0.9 0.09 130)",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, oklch(0.9 0.1 130) 0%, oklch(0.7 0.14 140) 40%, oklch(0.48 0.12 150) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.75 0.13 140) 0%, oklch(0.48 0.12 150) 70%)",
      glow:  "oklch(0.62 0.13 140 / 0.6)",
      ring:  "oklch(0.55 0.13 140 / 0.8)",
    },
  },

  // ── AURORA → ocean (blu profondo — giovani/fresco) ──────────────────────
  aurora: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, oklch(0.86 0.08 220) 0%, oklch(0.62 0.13 230) 55%, oklch(0.38 0.13 235) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.68 0.13 225) 0%, oklch(0.4 0.13 235) 70%)",
      glow:  "oklch(0.55 0.13 230 / 0.3)",
    },
    listening: {
      inner: "conic-gradient(from 0deg, oklch(0.82 0.11 210), oklch(0.58 0.16 235), oklch(0.42 0.16 250), oklch(0.82 0.11 210))",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.65 0.15 225) 0%, oklch(0.38 0.15 240) 70%)",
      glow:  "oklch(0.55 0.16 230 / 0.6)",
      ring:  "oklch(0.55 0.16 230 / 0.85)",
    },
    thinking: {
      inner: "conic-gradient(from 0deg, oklch(0.7 0.1 200), oklch(0.5 0.14 260), oklch(0.4 0.1 220), oklch(0.7 0.1 200))",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.58 0.13 230) 0%, oklch(0.35 0.13 240) 70%)",
      glow:  "oklch(0.5 0.13 235 / 0.5)",
      orbit: "oklch(0.88 0.1 215)",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, oklch(0.88 0.1 210) 0%, oklch(0.65 0.15 225) 40%, oklch(0.45 0.15 240) 100%)",
      outer: "radial-gradient(circle at 30% 30%, oklch(0.72 0.14 220) 0%, oklch(0.45 0.15 240) 70%)",
      glow:  "oklch(0.62 0.15 225 / 0.6)",
      ring:  "oklch(0.62 0.15 225 / 0.8)",
    },
  },

  // ── GLOBO → minimal (inchiostro grigio — universale/neutro) ─────────────
  globo: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, #3E3A35 0%, #272420 55%, #13110F 100%)",
      outer: "radial-gradient(circle at 30% 30%, #2E2A25 0%, #13110F 70%)",
      glow:  "rgba(19,17,15,0.35)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, #5A5048 0%, #2E2A25 50%, #13110F 100%)",
      outer: "radial-gradient(circle at 30% 30%, #423C35 0%, #1C1915 70%)",
      glow:  "rgba(19,17,15,0.55)",
      ring:  "rgba(246,242,234,0.6)",
    },
    thinking: {
      inner: "conic-gradient(from 0deg, #4E4840, #2A2622, #15130F, #4E4840)",
      outer: "radial-gradient(circle at 30% 30%, #35302B 0%, #15130F 70%)",
      glow:  "rgba(19,17,15,0.5)",
      orbit: "#F6F2EA",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, #6A5F55 0%, #3A342C 40%, #13110F 100%)",
      outer: "radial-gradient(circle at 30% 30%, #4A4239 0%, #1A1814 70%)",
      glow:  "rgba(19,17,15,0.55)",
      ring:  "rgba(246,242,234,0.55)",
    },
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function MobileOrb({ state, onTap, size = 240, orbStyle = "classico" }: MobileOrbProps) {
  const palette = PALLA_STYLES[orbStyle];
  const c = palette[state] ?? palette.idle;

  const scale     = size / 240;
  const innerSize = Math.round(176 * scale);
  const outerSize = Math.round(200 * scale);
  const shineW    = Math.round(60 * scale);
  const shineH    = Math.round(40 * scale);
  const orbitDot  = Math.round(8 * scale);

  const anim = {
    idle:      "orb-breathe 4.5s ease-in-out infinite, blob-morph-a 12s ease-in-out infinite",
    listening: "orb-listen-pulse 0.7s ease-in-out infinite, blob-morph-a 5s ease-in-out infinite",
    thinking:  "orb-rotate 4s linear infinite, blob-morph-b 8s ease-in-out infinite",
    speaking:  "orb-speak 1.2s ease-in-out infinite, blob-morph-a 6s ease-in-out infinite",
  }[state];

  const ringAnim = state === "listening"
    ? "orb-ring-fast 1.4s ease-out infinite"
    : state === "speaking"
      ? "orb-ring 2.2s ease-out infinite"
      : "none";

  return (
    <>
      <style>{ORB_KEYFRAMES}</style>
      <button
        onClick={onTap}
        style={{
          width: size, height: size,
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none",
          cursor: onTap ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent",
          outline: "none",
          flexShrink: 0,
          transition: "transform .12s",
        }}
        aria-label={`Norma — ${state}`}
      >
        {/* Glow halo */}
        <div style={{
          position: "absolute",
          inset: -30 * scale,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
          filter: `blur(${20 * scale}px)`,
          pointerEvents: "none",
          transition: "background .6s ease",
        }} />

        {/* Animated expanding rings */}
        {ringAnim !== "none" && (
          <>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: `1.5px solid ${c.ring ?? "oklch(0.58 0.19 35 / 0.7)"}`,
              animation: ringAnim, pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: `1.5px solid ${c.ring ?? "oklch(0.58 0.19 35 / 0.5)"}`,
              animation: ringAnim, animationDelay: "0.7s",
              opacity: 0.7, pointerEvents: "none",
            }} />
          </>
        )}

        {/* Outer blob */}
        <div style={{
          position: "absolute",
          width: outerSize, height: outerSize,
          background: c.outer,
          borderRadius: "58% 42% 55% 45% / 52% 48% 52% 48%",
          animation: anim,
          transition: "background .8s ease",
          opacity: 0.55,
          filter: `blur(${8 * scale}px)`,
          pointerEvents: "none",
        }} />

        {/* Main orb */}
        <div style={{
          position: "relative",
          width: innerSize, height: innerSize,
          background: c.inner,
          borderRadius: state === "thinking" ? "50%" : "58% 42% 55% 45% / 52% 48% 52% 48%",
          animation: anim,
          transition: "background .8s ease, border-radius .8s ease",
          boxShadow: [
            `inset -${8 * scale}px -${8 * scale}px ${24 * scale}px rgba(19,17,15,0.2)`,
            `inset  ${8 * scale}px  ${8 * scale}px ${32 * scale}px rgba(255,255,255,0.35)`,
            `0 ${10 * scale}px ${40 * scale}px rgba(19,17,15,0.14)`,
          ].join(", "),
          flexShrink: 0,
        }}>
          {/* Specular shine */}
          <div style={{
            position: "absolute",
            top: "12%", left: "18%",
            width: shineW, height: shineH,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 60%)",
            borderRadius: "50%",
            filter: `blur(${4 * scale}px)`,
            pointerEvents: "none",
          }} />

          {/* Thinking orbit dot */}
          {state === "thinking" && (
            <div style={{
              position: "absolute", inset: 0,
              animation: "orb-rotate 2s linear infinite reverse",
              pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute",
                top: orbitDot, left: "50%",
                transform: "translateX(-50%)",
                width: orbitDot, height: orbitDot,
                borderRadius: "50%",
                background: c.orbit ?? "oklch(0.85 0.1 230)",
                boxShadow: `0 0 ${12 * scale}px ${c.orbit ?? "oklch(0.85 0.1 230)"}`,
              }} />
            </div>
          )}
        </div>
      </button>
    </>
  );
}

// ── OrbMini — static preview for settings carousel ───────────────────────────
// Matches the design file's OrbMini component exactly.
interface OrbMiniProps {
  orbStyle: OrbStyle;
  size?: number;
  active?: boolean;
}
export function OrbMini({ orbStyle, size = 100, active = false }: OrbMiniProps) {
  const c = PALLA_STYLES[orbStyle].idle;
  const s = size;
  return (
    <div style={{
      width: s, height: s,
      position: "relative", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", inset: -8,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
        filter: "blur(10px)",
        pointerEvents: "none",
      }} />
      {/* Sphere */}
      <div style={{
        width: s * 0.88, height: s * 0.88,
        background: c.inner,
        borderRadius: "58% 42% 55% 45% / 52% 48% 52% 48%",
        boxShadow: [
          "inset -2px -2px 6px rgba(19,17,15,0.2)",
          "inset 2px 2px 8px rgba(255,255,255,0.35)",
          "0 2px 8px rgba(19,17,15,0.12)",
          active ? "0 0 0 3.5px var(--ink)" : "",
        ].filter(Boolean).join(", "),
        position: "relative",
        transition: "box-shadow 0.2s",
        overflow: "hidden",
      }}>
        {/* Shine */}
        <div style={{
          position: "absolute",
          top: "12%", left: "18%",
          width: "32%", height: "22%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 60%)",
          borderRadius: "50%",
          filter: "blur(3px)",
          pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

// ── Listening dots indicator ──────────────────────────────────────────────────
export function ListeningDots() {
  return (
    <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: "50%",
          background: "var(--vermiglio)",
          display: "inline-block",
          animation: `dots-bounce 1s ${delay}s infinite ease`,
        }} />
      ))}
    </span>
  );
}

// Export idle colors for preview use (orb-personalities.ts preview field)
export { PALLA_STYLES };
