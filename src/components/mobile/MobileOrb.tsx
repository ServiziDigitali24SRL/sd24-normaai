"use client";

import React from "react";
import type { OrbState } from "@/hooks/useMobileVoice";

export type OrbStyle = "classico" | "notte" | "natura" | "aurora" | "globo";

interface MobileOrbProps {
  state: OrbState;
  onTap: () => void;
  size?: number;
  orbStyle?: OrbStyle;
}

// ── Keyframes ────────────────────────────────────────────────────────────────
const ORB_KEYFRAMES = `
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1);     filter: brightness(1); }
    50%       { transform: scale(1.046); filter: brightness(1.07); }
  }
  @keyframes orb-glow-breathe {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.18); }
  }
  @keyframes orb-speak {
    0%   { transform: scale(1); }
    12%  { transform: scale(1.075); }
    28%  { transform: scale(1.02); }
    48%  { transform: scale(1.09); }
    68%  { transform: scale(0.975); }
    84%  { transform: scale(1.055); }
    100% { transform: scale(1); }
  }
  @keyframes orb-speak-glow {
    0%   { opacity: 0.45; transform: scale(1); }
    30%  { opacity: 1;    transform: scale(1.35); }
    65%  { opacity: 0.65; transform: scale(1.15); }
    100% { opacity: 0.45; transform: scale(1); }
  }
  @keyframes orb-listen {
    0%, 100% { transform: scale(1);    }
    35%      { transform: scale(1.065);}
    65%      { transform: scale(0.972);}
  }
  @keyframes orb-think {
    0%, 100% { transform: scale(1);    filter: brightness(1);    }
    50%      { transform: scale(1.028); filter: brightness(1.12); }
  }
  @keyframes orb-ring {
    0%   { transform: scale(1);   opacity: 0.75; }
    100% { transform: scale(1.78); opacity: 0; }
  }
  @keyframes orb-ring-b {
    0%   { transform: scale(1);   opacity: 0.5; }
    100% { transform: scale(2.0);  opacity: 0; }
  }
  @keyframes blob-a {
    0%, 100% { border-radius: 58% 42% 56% 44% / 52% 48% 53% 47%; }
    20%      { border-radius: 44% 56% 47% 53% / 57% 43% 59% 41%; }
    40%      { border-radius: 52% 48% 63% 37% / 40% 60% 44% 56%; }
    60%      { border-radius: 38% 62% 51% 49% / 56% 44% 54% 46%; }
    80%      { border-radius: 62% 38% 44% 56% / 46% 54% 48% 52%; }
  }
  @keyframes blob-b {
    0%, 100% { border-radius: 53% 47% 44% 56% / 51% 57% 43% 49%; }
    25%      { border-radius: 61% 39% 53% 47% / 44% 52% 59% 41%; }
    50%      { border-radius: 45% 55% 61% 39% / 57% 43% 46% 54%; }
    75%      { border-radius: 56% 44% 38% 62% / 48% 61% 39% 52%; }
  }
  @keyframes shimmer-sweep {
    0%   { transform: translateX(-150%) rotate(-15deg); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateX(250%) rotate(-15deg); opacity: 0; }
  }
  @keyframes think-dot {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes dots-bounce {
    0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
    40%           { opacity: 1;   transform: translateY(-3px); }
  }
`;

// ── Color palettes — true 3D sphere gradients ────────────────────────────────
type Palette = {
  sphere: string;   // main radial gradient (light→mid→dark, 3D feel)
  blob: string;     // outer blurry halo
  glow: string;     // ambient glow rgba
  ring: string;     // expanding ring color
  hi1: string;      // primary specular highlight
  hi2: string;      // micro specular dot
};

const PALETTES: Record<OrbStyle, Palette> = {
  // ☀️ Warm amber-gold  — "Avvocato amico"
  classico: {
    sphere: "radial-gradient(circle at 33% 28%, #FFFDE8 0%, #F7CA50 22%, #D98A1A 58%, #7C4210 100%)",
    blob:   "radial-gradient(circle at 40% 40%, #F7CA50 0%, #C47018 55%, #7C4210 100%)",
    glow:   "rgba(222, 148, 30, 0.55)",
    ring:   "rgba(222, 148, 30, 0.72)",
    hi1:    "rgba(255, 252, 220, 0.88)",
    hi2:    "rgba(255, 255, 255, 0.96)",
  },
  // 🌌 Midnight cosmos  — "Diretto"
  notte: {
    sphere: "radial-gradient(circle at 33% 28%, #AAC8F0 0%, #2858B8 22%, #0D2270 58%, #040B22 100%)",
    blob:   "radial-gradient(circle at 40% 40%, #2858B8 0%, #0A1A68 55%, #040B22 100%)",
    glow:   "rgba(48, 105, 225, 0.55)",
    ring:   "rgba(90, 150, 245, 0.72)",
    hi1:    "rgba(185, 215, 255, 0.82)",
    hi2:    "rgba(220, 238, 255, 0.96)",
  },
  // 🌿 Living forest    — "Calmo e paziente"
  natura: {
    sphere: "radial-gradient(circle at 33% 28%, #CCEECC 0%, #3CAE62 22%, #186838 58%, #072A16 100%)",
    blob:   "radial-gradient(circle at 40% 40%, #3CAE62 0%, #186838 55%, #072A16 100%)",
    glow:   "rgba(38, 165, 85, 0.55)",
    ring:   "rgba(62, 185, 98, 0.72)",
    hi1:    "rgba(200, 242, 212, 0.82)",
    hi2:    "rgba(230, 255, 238, 0.96)",
  },
  // 🌸 Aurora violet    — "Linguaggio semplice"
  aurora: {
    sphere: "radial-gradient(circle at 33% 28%, #FAE8FF 0%, #C455EC 22%, #7218B0 58%, #320870 100%)",
    blob:   "radial-gradient(circle at 40% 40%, #C455EC 0%, #7218B0 55%, #320870 100%)",
    glow:   "rgba(182, 52, 228, 0.55)",
    ring:   "rgba(202, 88, 245, 0.72)",
    hi1:    "rgba(252, 225, 255, 0.86)",
    hi2:    "rgba(255, 245, 255, 0.97)",
  },
  // 🌍 Ocean earth      — "Multilingue"
  globo: {
    sphere: "radial-gradient(circle at 33% 28%, #B0DCFA 0%, #2A88DE 22%, #0C52B0 58%, #041E40 100%)",
    blob:   "radial-gradient(circle at 40% 40%, #2A88DE 0%, #0C52B0 55%, #041E40 100%)",
    glow:   "rgba(38, 125, 225, 0.55)",
    ring:   "rgba(82, 162, 245, 0.72)",
    hi1:    "rgba(185, 225, 255, 0.82)",
    hi2:    "rgba(220, 242, 255, 0.96)",
  },
};

// ── Per-state animation config ───────────────────────────────────────────────
type StateCfg = {
  orb:      string;
  blob:     string;
  glow:     string;
  rings:    boolean;
  ring1:    string;
  ring2:    string;
  shimmer:  boolean;
  thinkDot: boolean;
};

const STATES: Record<OrbState, StateCfg> = {
  idle: {
    orb:      "orb-breathe 4.8s ease-in-out infinite, blob-a 15s ease-in-out infinite",
    blob:     "orb-breathe 4.8s ease-in-out infinite, blob-b 15s ease-in-out infinite",
    glow:     "orb-glow-breathe 4.8s ease-in-out infinite",
    rings:    false,
    ring1:    "none",
    ring2:    "none",
    shimmer:  false,
    thinkDot: false,
  },
  listening: {
    orb:      "orb-listen 0.88s ease-in-out infinite, blob-a 5s ease-in-out infinite",
    blob:     "orb-listen 0.88s ease-in-out infinite, blob-b 5s ease-in-out infinite",
    glow:     "orb-glow-breathe 0.88s ease-in-out infinite",
    rings:    true,
    ring1:    "orb-ring 1.85s ease-out infinite",
    ring2:    "orb-ring-b 1.85s ease-out infinite 0.65s",
    shimmer:  false,
    thinkDot: false,
  },
  thinking: {
    orb:      "orb-think 2.4s ease-in-out infinite, blob-b 8s ease-in-out infinite",
    blob:     "orb-think 2.4s ease-in-out infinite, blob-a 8s ease-in-out infinite",
    glow:     "orb-glow-breathe 2.4s ease-in-out infinite",
    rings:    false,
    ring1:    "none",
    ring2:    "none",
    shimmer:  true,
    thinkDot: true,
  },
  speaking: {
    orb:      "orb-speak 1.45s ease-in-out infinite, blob-a 4.2s ease-in-out infinite",
    blob:     "orb-speak 1.45s ease-in-out infinite 0.22s, blob-b 4.2s ease-in-out infinite",
    glow:     "orb-speak-glow 1.45s ease-in-out infinite",
    rings:    true,
    ring1:    "orb-ring 2.5s ease-out infinite",
    ring2:    "orb-ring-b 2.5s ease-out infinite 0.95s",
    shimmer:  false,
    thinkDot: false,
  },
};

// ── Component ────────────────────────────────────────────────────────────────
export function MobileOrb({ state, onTap, size = 200, orbStyle = "classico" }: MobileOrbProps) {
  const p   = PALETTES[orbStyle];
  const cfg = STATES[state];
  const s   = size;

  return (
    <>
      <style>{ORB_KEYFRAMES}</style>
      <button
        onClick={onTap}
        style={{
          width:  s + 80,
          height: s + 80,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          outline: "none",
          flexShrink: 0,
        }}
        aria-label={`Norma — ${state}`}
      >
        {/* ── Deep ambient glow ── */}
        <div style={{
          position: "absolute",
          inset: -32,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${p.glow} 0%, transparent 68%)`,
          animation: cfg.glow,
          filter: "blur(26px)",
          pointerEvents: "none",
          transition: "background 1.1s ease",
        }} />

        {/* ── Outer blurry blob ── */}
        <div style={{
          position: "absolute",
          width:  s + 48,
          height: s + 48,
          background: p.blob,
          borderRadius: "58% 42% 56% 44% / 52% 48% 53% 47%",
          animation: cfg.blob,
          opacity: 0.38,
          filter: "blur(20px)",
          transition: "background 1.1s ease",
          pointerEvents: "none",
        }} />

        {/* ── Expanding rings ── */}
        {cfg.rings && (
          <>
            <div style={{
              position: "absolute",
              width: s, height: s,
              borderRadius: "50%",
              border: `2px solid ${p.ring}`,
              animation: cfg.ring1,
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              width: s, height: s,
              borderRadius: "50%",
              border: `1.5px solid ${p.ring}`,
              animation: cfg.ring2,
              pointerEvents: "none",
            }} />
          </>
        )}

        {/* ── Main sphere ── */}
        <div style={{
          position: "relative",
          width:  s,
          height: s,
          background: p.sphere,
          borderRadius: "58% 42% 56% 44% / 52% 48% 53% 47%",
          animation: cfg.orb,
          transition: "background 1.1s ease, border-radius 0.8s ease",
          boxShadow: [
            `inset -${s * 0.065}px -${s * 0.065}px ${s * 0.18}px rgba(0,0,0,0.38)`,
            `inset  ${s * 0.065}px  ${s * 0.065}px ${s * 0.22}px rgba(255,255,255,0.18)`,
            `0 ${s * 0.09}px ${s * 0.32}px rgba(0,0,0,0.28)`,
          ].join(", "),
          overflow: "hidden",
          flexShrink: 0,
        }}>

          {/* Primary specular highlight */}
          <div style={{
            position: "absolute",
            top:  "9%",
            left: "15%",
            width:  s * 0.40,
            height: s * 0.26,
            background: `radial-gradient(ellipse, ${p.hi1} 0%, transparent 72%)`,
            borderRadius: "50%",
            filter: "blur(7px)",
            pointerEvents: "none",
          }} />

          {/* Micro specular dot */}
          <div style={{
            position: "absolute",
            top:  "16%",
            left: "22%",
            width:  s * 0.12,
            height: s * 0.07,
            background: p.hi2,
            borderRadius: "50%",
            filter: "blur(3.5px)",
            pointerEvents: "none",
          }} />

          {/* Bottom rim light */}
          <div style={{
            position: "absolute",
            bottom: "6%",
            right:  "10%",
            width:  s * 0.28,
            height: s * 0.12,
            background: "rgba(255,255,255,0.08)",
            borderRadius: "50%",
            filter: "blur(8px)",
            pointerEvents: "none",
          }} />

          {/* Thinking shimmer sweep */}
          {cfg.shimmer && (
            <div style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: "inherit",
              pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "55%",
                height: "100%",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                animation: "shimmer-sweep 2.2s ease-in-out infinite",
              }} />
            </div>
          )}

          {/* Thinking orbit dot */}
          {cfg.thinkDot && (
            <div style={{
              position: "absolute",
              inset: 0,
              animation: "think-dot 2.8s linear infinite",
              pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute",
                top: s * 0.06,
                left: "50%",
                transform: "translateX(-50%)",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: p.hi2,
                boxShadow: `0 0 10px ${p.glow}, 0 0 20px ${p.glow}`,
              }} />
            </div>
          )}
        </div>
      </button>
    </>
  );
}

// ── Listening dots ────────────────────────────────────────────────────────────
export function ListeningDots() {
  return (
    <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <span key={i} style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "var(--vermiglio)",
          display: "inline-block",
          animation: `dots-bounce 1s ${delay}s infinite ease`,
        }} />
      ))}
    </span>
  );
}
