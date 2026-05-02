"use client";

// AvatarShell — shared chrome for AvatarLive (WebRTC) and AvatarStream (async).
//
// Eliminates ~120 lines of duplicated picker / container / spinner / error UI
// previously copy-pasted between the two avatar implementations. Each backend
// just renders its specific <video> child; everything else flows through here.

import type { ReactNode } from "react";

export type AvatarKey = "sofia" | "marco";
export type AvatarPhase =
  | "idle"
  | "connecting"
  | "generating"
  | "ready"
  | "speaking"
  | "error";

export interface AvatarShellProps {
  avatar: AvatarKey;
  phase: AvatarPhase;
  onAvatarChange?: (a: AvatarKey) => void;
  showSelector?: boolean;
  /** Optional waiting label (e.g. elapsed seconds, "connessione"). */
  waitingLabel?: string;
  /** Error message shown in the error overlay. */
  error?: string | null;
  /** Backend-specific media element (e.g. <video>) rendered when ready. */
  children: ReactNode;
}

const PICKER_DISABLED_PHASES: AvatarPhase[] = ["connecting", "generating"];

export function AvatarShell({
  avatar,
  phase,
  onAvatarChange,
  showSelector = true,
  waitingLabel,
  error,
  children,
}: AvatarShellProps) {
  const pickerDisabled =
    !onAvatarChange || PICKER_DISABLED_PHASES.includes(phase);

  const pickerBtn = (key: AvatarKey, label: string) => (
    <button
      key={key}
      onClick={() => onAvatarChange?.(key)}
      disabled={pickerDisabled}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: "1px solid var(--paper-line, #E8E0D2)",
        background: avatar === key ? "var(--vermiglio, #C93924)" : "white",
        color: avatar === key ? "white" : "var(--ink-2)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        cursor: pickerDisabled ? "default" : "pointer",
        opacity: !onAvatarChange ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );

  const isWaiting = phase === "connecting" || phase === "generating";
  const displayName = avatar === "marco" ? "Marco" : "Sofia";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
      }}
    >
      {showSelector && (
        <div style={{ display: "flex", gap: 8 }}>
          {pickerBtn("sofia", "Sofia")}
          {pickerBtn("marco", "Marco")}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "9 / 16",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--paper-tint, #F8F4ED)",
          position: "relative",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {children}

        {isWaiting && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--ink-3)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "2px solid var(--paper-line, #E8E0D2)",
                borderTopColor: "var(--vermiglio, #C93924)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>
              {displayName} · {waitingLabel ?? "connessione"}
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {phase === "error" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "var(--red-error, #B43B25)",
              fontSize: 13,
            }}
          >
            Avatar non disponibile{error ? `: ${error.slice(0, 80)}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
