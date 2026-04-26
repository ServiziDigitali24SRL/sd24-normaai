"use client";

import React from "react";
import type { OrbState } from "@/hooks/useMobileVoice";

export type OrbStyle = "classico" | "notte" | "natura" | "aurora";

interface MobileOrbProps {
  state: OrbState;
  onTap: () => void;
  size?: number;
  orbStyle?: OrbStyle;
}

const ORB_KEYFRAMES = `
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.04); }
  }
  @keyframes orb-listen-pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.09); }
  }
  @keyframes orb-rotate {
    to { transform: rotate(360deg); }
  }
  @keyframes orb-speak {
    0%, 100% { transform: scale(1); }
    25%       { transform: scale(1.06); }
    60%       { transform: scale(0.97); }
  }
  @keyframes orb-ring {
    0%   { transform: scale(0.9); opacity: 0.55; }
    100% { transform: scale(1.5);  opacity: 0; }
  }
  @keyframes orb-ring-fast {
    0%   { transform: scale(0.9); opacity: 0.6; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  @keyframes blob-morph-a {
    0%, 100% { border-radius: 58% 42% 55% 45% / 52% 48% 52% 48%; }
    33%       { border-radius: 45% 55% 42% 58% / 48% 55% 45% 52%; }
    66%       { border-radius: 52% 48% 58% 42% / 45% 52% 48% 55%; }
  }
  @keyframes blob-morph-b {
    0%, 100% { border-radius: 48% 52% 45% 55% / 55% 45% 52% 48%; }
    50%       { border-radius: 55% 45% 52% 48% / 48% 55% 45% 52%; }
  }
  @keyframes dots-bounce {
    0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
    40%           { opacity: 1;   transform: translateY(-3px); }
  }
`;

// ── Color identity per style (constant across all states) ─────────────────
// User feedback: the orb must KEEP THE CHOSEN COLOR through the whole call.
// Only the animation/intensity changes by state (breathe / pulse / rotate /
// speak-pulse + rings) — never the hue.
type ColorPalette = {
  inner: string;
  outer: string;
  glow: string;
  ringColor: string;
};

const PALETTES: Record<OrbStyle, ColorPalette> = {
  classico: {
    inner: "radial-gradient(circle at 30% 30%, #F6F2EA 0%, #E6DFCF 55%, #C9BFA8 100%)",
    outer: "radial-gradient(circle at 30% 30%, #EFE9DC 0%, #C9BFA8 70%)",
    glow: "rgba(212,74,42,0.18)",
    ringColor: "rgba(212,74,42,0.7)",
  },
  notte: {
    inner: "radial-gradient(circle at 30% 30%, #1E2340 0%, #131A30 55%, #0A0F20 100%)",
    outer: "radial-gradient(circle at 30% 30%, #1A2038 0%, #0C1025 70%)",
    glow: "rgba(80,120,220,0.28)",
    ringColor: "rgba(80,130,230,0.7)",
  },
  natura: {
    inner: "radial-gradient(circle at 30% 30%, #EAF2E8 0%, #C8DFC0 55%, #9BBF90 100%)",
    outer: "radial-gradient(circle at 30% 30%, #D8ECD0 0%, #96B88A 70%)",
    glow: "rgba(80,160,80,0.22)",
    ringColor: "rgba(60,170,80,0.7)",
  },
  aurora: {
    inner: "radial-gradient(circle at 30% 30%, #F0E8F8 0%, #D8C0F0 55%, #B890D8 100%)",
    outer: "radial-gradient(circle at 30% 30%, #E8D8F4 0%, #B888D0 70%)",
    glow: "rgba(160,80,200,0.22)",
    ringColor: "rgba(180,80,200,0.7)",
  },
};

// ── Animation per state (NO colors here, only motion) ─────────────────────
type StateAnim = { anim: string; ringAnim: string };
const STATE_ANIMS: Record<OrbState, StateAnim> = {
  idle: {
    anim: "orb-breathe 4.5s ease-in-out infinite, blob-morph-a 12s ease-in-out infinite",
    ringAnim: "none",
  },
  listening: {
    anim: "orb-listen-pulse 0.7s ease-in-out infinite, blob-morph-a 5s ease-in-out infinite",
    ringAnim: "orb-ring-fast 1.4s ease-out infinite",
  },
  thinking: {
    // Keep the morph + a slower rotate, but drop the conic-gradient swap so
    // the hue stays put. Rings off — rotation alone signals "thinking".
    anim: "orb-breathe 2.2s ease-in-out infinite, blob-morph-b 6s ease-in-out infinite",
    ringAnim: "none",
  },
  speaking: {
    anim: "orb-speak 1.2s ease-in-out infinite, blob-morph-a 6s ease-in-out infinite",
    ringAnim: "orb-ring 2.2s ease-out infinite",
  },
};

export function MobileOrb({ state, onTap, size = 200, orbStyle = "classico" }: MobileOrbProps) {
  // Color stays constant per chosen style — only motion varies by state.
  const palette = PALETTES[orbStyle];
  const motion = STATE_ANIMS[state];
  const c = { ...palette, ...motion };

  return (
    <>
      <style>{ORB_KEYFRAMES}</style>
      <button
        onClick={onTap}
        style={{
          width: size + 60,
          height: size + 60,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          outline: "none",
        }}
        aria-label={`Orb — stato: ${state}`}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
          transition: "background 0.6s ease",
        }} />

        {/* Expanding rings */}
        {c.ringAnim !== "none" && (
          <>
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${c.ringColor}`,
              animation: c.ringAnim,
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${c.ringColor}`,
              animation: c.ringAnim,
              animationDelay: "0.7s",
              pointerEvents: "none",
            }} />
          </>
        )}

        {/* Outer blob (morphing) */}
        <div style={{
          position: "absolute",
          width: size + 24,
          height: size + 24,
          background: c.outer,
          borderRadius: "58% 42% 55% 45% / 52% 48% 52% 48%",
          animation: c.anim,
          transition: "background 0.8s ease",
          opacity: 0.55,
          filter: "blur(8px)",
        }} />

        {/* Main orb */}
        <div style={{
          position: "relative",
          width: size,
          height: size,
          background: c.inner,
          borderRadius: state === "thinking"
            ? "50%"
            : "58% 42% 55% 45% / 52% 48% 52% 48%",
          animation: c.anim,
          transition: "background 0.8s ease, border-radius 0.8s ease",
          boxShadow: `
            inset -8px -8px 24px rgba(19,17,15,0.2),
            inset 8px 8px 32px rgba(255,255,255,0.35),
            0 10px 40px rgba(19,17,15,0.14)
          `,
        }}>
          {/* Glossy shine */}
          <div style={{
            position: "absolute",
            top: "12%",
            left: "18%",
            width: size * 0.33,
            height: size * 0.22,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.6), transparent 60%)",
            borderRadius: "50%",
            filter: "blur(4px)",
            pointerEvents: "none",
          }} />

          {/* Thinking orbit dot */}
          {state === "thinking" && (
            <div style={{
              position: "absolute",
              inset: 0,
              animation: "orb-rotate 2s linear infinite reverse",
            }}>
              <div style={{
                position: "absolute",
                top: size * 0.04,
                left: "50%",
                transform: "translateX(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "rgba(180,200,230,0.9)",
                boxShadow: "0 0 12px rgba(180,200,230,0.9)",
              }} />
            </div>
          )}
        </div>
      </button>
    </>
  );
}

// Listening dots indicator
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
