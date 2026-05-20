"use client";

/**
 * /mobile/voice — ORB fullscreen 4-state, tap to talk.
 * State machine: idle → listening → thinking → speaking → idle.
 *
 * NOTA: il wiring effettivo a /api/voice/sofia (ElevenLabs Conv Agent) richiede
 * getUserMedia + MediaRecorder + audio playback. In questo commit la UI +
 * state machine sono complete, la transizione è simulata da un setTimeout
 * placeholder. Hook reale al backend voice in commit successivo.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileOrb } from "@/components/mobile/orb";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING, type OrbColor, type OrbState } from "@/components/mobile/theme";
import { loadDraft } from "../onboarding/draft";
import { useEffect } from "react";

const STATE_LABEL: Record<OrbState, { title: string; sub: string }> = {
  idle:      { title: "Tocca per parlare",  sub: "Sofia ti ascolta" },
  listening: { title: "Ti ascolto…",        sub: "Parla naturalmente, poi tocca per inviare" },
  thinking:  { title: "Sto pensando…",      sub: "Cerco nelle norme italiane" },
  speaking:  { title: "Sofia risponde…",    sub: "Tocca per interrompere" },
};

export default function MobileVoicePage() {
  const router = useRouter();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [orbColor, setOrbColor] = useState<OrbColor>("blu");
  const [transcript, setTranscript] = useState<string>("");

  useEffect(() => {
    const d = loadDraft();
    setOrbColor(d.preferred_orb_color);
  }, []);

  // PLACEHOLDER state machine. Il wiring reale richiede:
  // 1. getUserMedia({audio:true}) on listening
  // 2. MediaRecorder → blob → POST /api/voice/sofia
  // 3. Receive audio response → Audio.play()
  const handleOrbTap = () => {
    if (orbState === "idle") {
      setOrbState("listening");
      setTranscript("");
    } else if (orbState === "listening") {
      setOrbState("thinking");
      setTimeout(() => {
        setOrbState("speaking");
        setTranscript("[Placeholder] Una risposta normativa apparirà qui quando il backend voice è connesso.");
        setTimeout(() => setOrbState("idle"), 3500);
      }, 1500);
    } else {
      setOrbState("idle");
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: `radial-gradient(ellipse at top, ${MOBILE_COLORS.blueLight}88 0%, ${MOBILE_COLORS.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        fontFamily: MOBILE_FONT.family,
        color: MOBILE_COLORS.text,
        padding: `calc(env(safe-area-inset-top, 0px) + 12px) ${MOBILE_SPACING.lg}px calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_SPACING.lg}px)`,
      }}
    >
      {/* Top: close */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.push("/mobile/home")}
          aria-label="Chiudi voice"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            background: MOBILE_COLORS.surface,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: MOBILE_COLORS.text,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          ✕
        </button>
        <span style={{ fontSize: MOBILE_FONT.small, color: MOBILE_COLORS.textMuted, fontWeight: 600 }}>Sofia</span>
        <div style={{ width: 40 }} />
      </header>

      {/* ORB fullscreen */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: MOBILE_SPACING.xl,
        }}
      >
        <MobileOrb
          color={orbColor}
          state={orbState}
          size={280}
          onClick={handleOrbTap}
          label={`Stato voice: ${orbState}`}
        />

        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <div
            style={{
              fontSize: MOBILE_FONT.title2,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: MOBILE_COLORS.text,
            }}
          >
            {STATE_LABEL[orbState].title}
          </div>
          <div style={{ marginTop: 6, fontSize: MOBILE_FONT.body, color: MOBILE_COLORS.textMuted, lineHeight: 1.45 }}>
            {STATE_LABEL[orbState].sub}
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div
          style={{
            padding: 16,
            background: MOBILE_COLORS.surface,
            border: `1px solid ${MOBILE_COLORS.line}`,
            borderRadius: 16,
            fontSize: MOBILE_FONT.body,
            color: MOBILE_COLORS.text,
            lineHeight: 1.5,
            marginTop: MOBILE_SPACING.md,
            maxHeight: 180,
            overflow: "auto",
          }}
        >
          {transcript}
        </div>
      )}
    </main>
  );
}
