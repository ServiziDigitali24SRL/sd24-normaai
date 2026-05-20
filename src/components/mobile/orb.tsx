"use client";

/**
 * Mobile ORB — 4 colors × 4 states animation.
 *
 * States:
 * - idle:      slow pulse (3s)
 * - listening: fast pulse + outer ring expand
 * - thinking:  spinner ring rotation
 * - speaking:  audio-wave bars (animati)
 *
 * Colors: vermiglio | alloro | ambra | blu — coerenti col desktop.
 */

import { MOBILE_COLORS, type OrbColor, type OrbState } from "./theme";

interface MobileOrbProps {
  color?: OrbColor;
  state?: OrbState;
  size?: number;
  onClick?: () => void;
  label?: string;
}

export function MobileOrb({ color = "blu", state = "idle", size = 240, onClick, label }: MobileOrbProps) {
  const hex = MOBILE_COLORS.orb[color];

  return (
    <button
      onClick={onClick}
      aria-label={label || `Orb stato ${state}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        border: "none",
        background: "transparent",
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* outer ring — only on listening */}
      {state === "listening" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${hex}`,
            opacity: 0.4,
            animation: "orbRingExpand 1.6s ease-out infinite",
          }}
        />
      )}
      {state === "listening" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${hex}`,
            opacity: 0.4,
            animation: "orbRingExpand 1.6s ease-out infinite 0.8s",
          }}
        />
      )}

      {/* spinner ring — only on thinking */}
      {state === "thinking" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `3px solid ${hex}33`,
            borderTopColor: hex,
            animation: "orbSpin 1.2s linear infinite",
          }}
        />
      )}

      {/* main orb */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${hex}ff 0%, ${hex}cc 45%, ${hex}66 75%, ${hex}22 100%)`,
          boxShadow: `0 12px 40px ${hex}66, 0 4px 12px ${hex}44, inset 0 -12px 24px ${hex}88`,
          animation:
            state === "idle"
              ? "orbPulseSlow 3s ease-in-out infinite"
              : state === "listening"
              ? "orbPulseFast 0.9s ease-in-out infinite"
              : state === "speaking"
              ? "orbPulseSpeak 0.45s ease-in-out infinite alternate"
              : "none",
        }}
      />

      {/* speaking wave overlay */}
      {state === "speaking" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                width: 5,
                height: 30,
                borderRadius: 3,
                background: "rgba(255,255,255,0.85)",
                animation: `orbBar ${0.5 + i * 0.05}s ease-in-out infinite alternate ${i * 80}ms`,
                transformOrigin: "center",
              }}
            />
          ))}
        </span>
      )}

      {/* highlight glint */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "18%",
          left: "22%",
          width: "26%",
          height: "26%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.55), rgba(255,255,255,0))",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

/**
 * Keyframes utilizzati dall'ORB.
 * Vengono iniettate via <style jsx global> nel layout mobile (shell.tsx).
 */
export const ORB_KEYFRAMES = `
@keyframes orbPulseSlow {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}
@keyframes orbPulseFast {
  0%, 100% { transform: scale(0.97); }
  50%      { transform: scale(1.07); }
}
@keyframes orbPulseSpeak {
  0%   { transform: scale(0.99); }
  100% { transform: scale(1.03); }
}
@keyframes orbRingExpand {
  0%   { transform: scale(0.94); opacity: 0.5; }
  100% { transform: scale(1.18); opacity: 0; }
}
@keyframes orbSpin {
  to { transform: rotate(360deg); }
}
@keyframes orbBar {
  0%   { transform: scaleY(0.35); }
  100% { transform: scaleY(1); }
}
@keyframes mobileSpin {
  to { transform: rotate(360deg); }
}
@keyframes mobileSlideIn {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
@keyframes mobileFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;
