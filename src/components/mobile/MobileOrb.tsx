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
  onTap?: () => void;
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
      glow:  "rgba(180,130,80,0.12)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, #F0D4A0 0%, #D4956A 50%, #A85A38 100%)",
      outer: "radial-gradient(circle at 30% 30%, #D4A060 0%, #A05030 70%)",
      glow:  "rgba(180,100,50,0.5)",
      ring:  "rgba(180,100,50,0.7)",
    },
    // thinking = idle colors + orbit dot. NO conic-gradient (oklch in conic broken on Safari iOS)
    thinking: {
      inner: "radial-gradient(circle at 30% 30%, #F6F2EA 0%, #E6DFCF 55%, #C9BFA8 100%)",
      outer: "radial-gradient(circle at 30% 30%, #EFE9DC 0%, #C9BFA8 70%)",
      glow:  "rgba(180,130,80,0.28)",
      orbit: "#D4956A",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, #F5E090 0%, #E0A850 40%, #C06030 100%)",
      outer: "radial-gradient(circle at 30% 30%, #D4A060 0%, #A05030 70%)",
      glow:  "rgba(200,140,60,0.55)",
      ring:  "rgba(200,140,60,0.8)",
    },
  },

  // ── NOTTE → fire (vermiglio intenso — diretto/aggressivo) ───────────────
  notte: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, #F0B870 0%, #C06030 55%, #803020 100%)",
      outer: "radial-gradient(circle at 30% 30%, #C07040 0%, #803020 70%)",
      glow:  "rgba(200,80,40,0.35)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, #F8D080 0%, #D07040 45%, #902820 100%)",
      outer: "radial-gradient(circle at 30% 30%, #D08040 0%, #902820 70%)",
      glow:  "rgba(210,80,30,0.65)",
      ring:  "rgba(200,70,30,0.85)",
    },
    // thinking = idle colors + orbit dot
    thinking: {
      inner: "radial-gradient(circle at 30% 30%, #F0B870 0%, #C06030 55%, #803020 100%)",
      outer: "radial-gradient(circle at 30% 30%, #C07040 0%, #803020 70%)",
      glow:  "rgba(200,80,40,0.55)",
      orbit: "#F8D080",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, #F8E090 0%, #E08040 40%, #A03020 100%)",
      outer: "radial-gradient(circle at 30% 30%, #D08040 0%, #902820 70%)",
      glow:  "rgba(220,120,40,0.7)",
      ring:  "rgba(200,100,40,0.85)",
    },
  },

  // ── NATURA → forest (verde alloro — dolce e calmo) ──────────────────────
  natura: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, #A8C880 0%, #608050 55%, #304030 100%)",
      outer: "radial-gradient(circle at 30% 30%, #709060 0%, #385040 70%)",
      glow:  "rgba(80,130,70,0.3)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, #C0D890 0%, #709060 45%, #385040 100%)",
      outer: "radial-gradient(circle at 30% 30%, #80A870 0%, #3A5040 70%)",
      glow:  "rgba(90,145,80,0.55)",
      ring:  "rgba(80,135,70,0.85)",
    },
    // thinking = idle colors + orbit dot
    thinking: {
      inner: "radial-gradient(circle at 30% 30%, #A8C880 0%, #608050 55%, #304030 100%)",
      outer: "radial-gradient(circle at 30% 30%, #709060 0%, #385040 70%)",
      glow:  "rgba(80,130,70,0.45)",
      orbit: "#C0E890",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, #D0E8A0 0%, #80A860 40%, #405040 100%)",
      outer: "radial-gradient(circle at 30% 30%, #90B870 0%, #405040 70%)",
      glow:  "rgba(100,160,80,0.6)",
      ring:  "rgba(90,140,70,0.8)",
    },
  },

  // ── AURORA → ocean (blu profondo — giovani/fresco) ──────────────────────
  aurora: {
    idle: {
      inner: "radial-gradient(circle at 30% 30%, #B0C8E8 0%, #6080B8 55%, #304080 100%)",
      outer: "radial-gradient(circle at 30% 30%, #7090C0 0%, #304080 70%)",
      glow:  "rgba(70,110,200,0.3)",
    },
    listening: {
      inner: "radial-gradient(circle at 30% 30%, #C8D8F0 0%, #7090C8 45%, #3050A0 100%)",
      outer: "radial-gradient(circle at 30% 30%, #80A0D0 0%, #304090 70%)",
      glow:  "rgba(80,120,210,0.6)",
      ring:  "rgba(80,120,210,0.85)",
    },
    // thinking = idle colors + orbit dot
    thinking: {
      inner: "radial-gradient(circle at 30% 30%, #B0C8E8 0%, #6080B8 55%, #304080 100%)",
      outer: "radial-gradient(circle at 30% 30%, #7090C0 0%, #304080 70%)",
      glow:  "rgba(70,110,200,0.45)",
      orbit: "#C8E8FF",
    },
    speaking: {
      inner: "radial-gradient(circle at 35% 35%, #D0E8FF 0%, #80A8D8 40%, #3860A8 100%)",
      outer: "radial-gradient(circle at 30% 30%, #90B8D8 0%, #385090 70%)",
      glow:  "rgba(90,140,220,0.6)",
      ring:  "rgba(90,140,220,0.8)",
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
    // thinking = idle colors + orbit dot
    thinking: {
      inner: "radial-gradient(circle at 30% 30%, #3E3A35 0%, #272420 55%, #13110F 100%)",
      outer: "radial-gradient(circle at 30% 30%, #2E2A25 0%, #13110F 70%)",
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
    // thinking: faster breathe (2.5s) + blob-morph-b — same color as idle, orbit dot rotates
    thinking:  "orb-breathe 2.5s ease-in-out infinite, blob-morph-b 6s ease-in-out infinite",
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
          borderRadius: "58% 42% 55% 45% / 52% 48% 52% 48%",
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
                background: c.orbit ?? "#D4A060",
                boxShadow: `0 0 ${12 * scale}px ${c.orbit ?? "#D4A060"}`,
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
