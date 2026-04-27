"use client";

/**
 * MobileOnboarding — primo accesso mobile.
 *
 * Flusso:
 *  1. "intro"      → utente vede palla + tasto "Inizia"
 *  2. "connecting" → Vapi si connette
 *  3. "speaking"   → Norma si presenta, la palla cambia colore per ogni personalità
 *  4. "name-input" → Vapi smette → input testuale "Come ti chiami?"
 *  5. "done"       → nome salvato → onComplete(name) dopo 1.2s
 *
 * Il nome viene salvato in localStorage ("norma_user_name") e, se l'utente
 * è loggato, anche in Supabase profiles.full_name.
 */

import { useState, useRef, useEffect } from "react";
import { MobileOrb } from "./MobileOrb";
import type { OrbState } from "@/hooks/useMobileVoice";
import {
  type OrbPersonalityId,
  VAPI_ASSISTANT_IDS,
} from "@/lib/orb-personalities";

// ── Vapi public key (safe to expose) ────────────────────────────────────────
const VAPI_PK = "1fe0aa87-b7a0-4394-b877-d846fa06035d";

// ── Welcome script ───────────────────────────────────────────────────────────
// Norma si presenta e descrive le 5 personalità — la palla cambia colore
// in sincrono tramite setTimeout calibrati sul ritmo di lettura (~150 p/m).
const WELCOME_FIRST_MESSAGE =
  "Ciao, sono Norma! Posso aiutarti in qualsiasi momento della giornata " +
  "con qualsiasi domanda di legge. " +
  "Puoi scegliere la mia personalità: posso essere il tuo avvocato amico, preciso e caldo. " +
  "Oppure diretto, se vuoi solo la risposta. " +
  "Calmo e paziente, per chi ha bisogno di tempo. " +
  "Semplice e amichevole, per i più giovani. " +
  "O posso parlare la tua lingua, ovunque tu sia nel mondo. " +
  "Iniziamo subito — dimmi solo come ti chiami.";

// ── Color sequence (ritmo ~150 parole/minuto) ────────────────────────────────
// Ogni delay corrisponde approssimativamente alla parola-chiave nel testo.
const COLOR_SEQ: { delay: number; style: OrbPersonalityId }[] = [
  { delay: 4_200, style: "notte" },    // "diretto"
  { delay: 7_800, style: "natura" },   // "calmo"
  { delay: 10_800, style: "aurora" },  // "semplice"
  { delay: 14_000, style: "globo" },   // "lingua"
  { delay: 17_500, style: "classico" }, // fine — torna al default
];

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = "intro" | "connecting" | "speaking" | "name-input" | "done";

const ORB_STATES: Record<Phase, OrbState> = {
  intro: "idle",
  connecting: "thinking",
  speaking: "speaking",
  "name-input": "idle",
  done: "idle",
};

interface Props {
  onComplete: (name: string) => void;
  onSkip: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function MobileOnboarding({ onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [orbStyle, setOrbStyle] = useState<OrbPersonalityId>("classico");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const vapiRef = useRef<{ stop: () => void } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speechDone = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      try { vapiRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  // Avvia la sequenza di cambio colore.
  const startColors = () => {
    COLOR_SEQ.forEach(({ delay, style }) => {
      const t = setTimeout(() => {
        if (mounted.current) setOrbStyle(style);
      }, delay);
      timers.current.push(t);
    });
  };

  // Tap sull'orb: parte la chiamata Vapi.
  const handleOrbTap = async () => {
    if (phase !== "intro") return;
    setPhase("connecting");
    setError(null);
    speechDone.current = false;

    try {
      // Importazione dinamica — evita SSR e riduce bundle iniziale
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { default: Vapi } = await import("@vapi-ai/web") as any;
      const vapi = new Vapi(VAPI_PK);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        if (!mounted.current) return;
        setPhase("speaking");
        startColors();
      });

      // Norma ha finito di parlare → stop call, mostra input nome
      vapi.on("speech-end", () => {
        if (!mounted.current || speechDone.current) return;
        speechDone.current = true;
        timers.current.forEach(clearTimeout);
        try { vapi.stop(); } catch { /* noop */ }
        setOrbStyle("classico");
        setPhase("name-input");
      });

      vapi.on("error", () => {
        if (!mounted.current) return;
        setPhase("intro");
        setError("Connessione non riuscita. Riprova o tocca Salta.");
      });

      // Avvia con il messaggio di benvenuto come firstMessage override.
      // NOTA: firstMessage va dentro assistantOverrides, non top-level.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (vapi as any).start(VAPI_ASSISTANT_IDS.classico, {
        assistantOverrides: {
          firstMessage: WELCOME_FIRST_MESSAGE,
        },
      });
    } catch {
      if (mounted.current) {
        setPhase("intro");
        setError(
          "Microfono non disponibile. Tocca Salta e abilita il microfono nelle impostazioni iOS."
        );
      }
    }
  };

  // Conferma nome.
  const submitName = () => {
    const n = name.trim();
    if (!n) return;
    setPhase("done");
    setTimeout(() => {
      if (mounted.current) onComplete(n);
    }, 1200);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "var(--paper)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 28px",
    }}>

      {/* Salta — sempre visibile */}
      <button
        onClick={onSkip}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 44px) + 14px)", right: 20,
          border: "none", background: "transparent", cursor: "pointer",
          fontFamily: "var(--sans)", fontSize: 14,
          color: "var(--ink-3)", padding: "8px 12px",
        }}
      >
        Salta
      </button>

      {/* Orb */}
      <MobileOrb
        state={ORB_STATES[phase]}
        onTap={handleOrbTap}
        size={180}
        orbStyle={orbStyle}
      />

      {/* Copy per fase */}
      <div style={{ marginTop: 32, textAlign: "center", width: "100%" }}>

        {phase === "intro" && (
          <>
            <div className="serif" style={{ fontSize: 26, marginBottom: 10 }}>
              Ciao, sono Norma
            </div>
            <p style={{
              fontSize: 15, color: "var(--ink-3)", lineHeight: 1.65,
              marginBottom: 24, fontFamily: "var(--sans)",
            }}>
              La tua assistente legale vocale.
            </p>
            <button
              onClick={handleOrbTap}
              style={{
                width: "100%", padding: "15px",
                borderRadius: 12, border: "none",
                background: "var(--vermiglio)",
                color: "white",
                fontFamily: "var(--sans)", fontSize: 16, fontWeight: 600,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                marginBottom: 12,
              }}
            >
              Parla con Norma →
            </button>
            <div className="mono" style={{
              fontSize: 9, letterSpacing: "0.14em",
              color: "var(--ink-4)", textTransform: "uppercase",
            }}>
              abilita microfono quando richiesto
            </div>
          </>
        )}

        {phase === "connecting" && (
          <p className="mono" style={{
            fontSize: 10, letterSpacing: "0.14em",
            color: "var(--ink-3)", textTransform: "uppercase",
          }}>
            Connessione…
          </p>
        )}

        {phase === "speaking" && (
          <p className="mono" style={{
            fontSize: 10, letterSpacing: "0.14em",
            color: "var(--ink-3)", textTransform: "uppercase",
          }}>
            Norma si presenta…
          </p>
        )}

        {phase === "name-input" && (
          <div style={{ width: "100%" }}>
            <div className="serif" style={{ fontSize: 24, marginBottom: 18 }}>
              Come ti chiami?
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
              placeholder="Il tuo nome"
              style={{
                width: "100%", padding: "14px 16px",
                background: "var(--paper-2)",
                border: "1px solid var(--paper-line)",
                borderRadius: 10, outline: "none",
                fontFamily: "var(--sans)", fontSize: 17, color: "var(--ink)",
                boxSizing: "border-box", marginBottom: 12,
                WebkitAppearance: "none",
              }}
            />
            <button
              onClick={submitName}
              disabled={!name.trim()}
              style={{
                width: "100%", padding: "15px",
                borderRadius: 10, border: "none",
                background: name.trim() ? "var(--vermiglio)" : "var(--paper-3)",
                color: name.trim() ? "white" : "var(--ink-4)",
                fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600,
                cursor: name.trim() ? "pointer" : "default",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Iniziamo →
            </button>
          </div>
        )}

        {phase === "done" && (
          <>
            <div className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
              Piacere, {name}!
            </div>
            <p style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>
              Sono qui ogni volta che hai bisogno.
            </p>
          </>
        )}
      </div>

      {/* Errore */}
      {error && (
        <div style={{
          marginTop: 20, padding: "10px 14px",
          background: "rgba(212,74,42,0.08)",
          border: "1px solid rgba(212,74,42,0.25)",
          borderRadius: 8, fontSize: 13,
          color: "var(--vermiglio-ink)",
          fontFamily: "var(--sans)", textAlign: "center", lineHeight: 1.45,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
