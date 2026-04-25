"use client";

import React from "react";
import type { OrbState } from "@/hooks/useMobileVoice";

interface MobileOrbProps {
  state: OrbState;
  onTap: () => void;
  size?: number;
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

const STATE_CONFIG = {
  idle: {
    inner: "radial-gradient(circle at 30% 30%, #F6F2EA 0%, #E6DFCF 55%, #C9BFA8 100%)",
    outer: "radial-gradient(circle at 30% 30%, #EFE9DC 0%, #C9BFA8 70%)",
    glow:  "rgba(212,74,42,0.12)",
    anim:  "orb-breathe 4.5s ease-in-out infinite, blob-morph-a 12s ease-in-out infinite",
    ringAnim: "none",
  },
  listening: {
    inner: "radial-gradient(circle at 30% 30%, #E8A87C 0%, #D44A2A 50%, #A83420 100%)",
    outer: "radial-gradient(circle at 30% 30%, #E09060 0%, #B83A20 70%)",
    glow:  "rgba(212,74,42,0.5)",
    anim:  "orb-listen-pulse 0.7s ease-in-out infinite, blob-morph-a 5s ease-in-out infinite",
    ringAnim: "orb-ring-fast 1.4s ease-out infinite",
  },
  thinking: {
    inner: "conic-gradient(from 0deg, #4A7099, #6052A0, #3A6070, #4A7099)",
    outer: "radial-gradient(circle at 30% 30%, #4A6080 0%, #2A3050 70%)",
    glow:  "rgba(70,80,150,0.4)",
    anim:  "orb-rotate 4s linear infinite, blob-morph-b 8s ease-in-out infinite",
    ringAnim: "none",
  },
  speaking: {
    inner: "radial-gradient(circle at 35% 35%, #E8C86A 0%, #D4A017 40%, #D44A2A 100%)",
    outer: "radial-gradient(circle at 30% 30%, #D8B050 0%, #B44020 70%)",
    glow:  "rgba(212,160,23,0.55)",
    anim:  "orb-speak 1.2s ease-in-out infinite, blob-morph-a 6s ease-in-out infinite",
    ringAnim: "orb-ring 2.2s ease-out infinite",
  },
} as const;

export function MobileOrb({ state, onTap, size = 200 }: MobileOrbProps) {
  const c = STATE_CONFIG[state];
  const ringColor = state === "speaking"
    ? "rgba(212,160,23,0.8)"
    : "rgba(212,74,42,0.7)";

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
        aria-label={`Orb â stato: ${state}`}
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
              border: `1.5px solid ${ringColor}`,
              animation: c.ringAnim,
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${ringColor.replace("0.7", "0.5").replace("0.8", "0.6")}`,
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
