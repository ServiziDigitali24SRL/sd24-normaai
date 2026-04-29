"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  type OrbPersonalityId,
  resolveAssistantId,
} from "@/lib/orb-personalities";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

// Vapi public key — safe to expose client-side
const VAPI_PUBLIC_KEY = "1fe0aa87-b7a0-4394-b877-d846fa06035d";

// Watchdog: only protects the *connection* phase (tap → call-start). Once
// the call connects we disarm — long thinking/listening pauses are normal.
// Cold Vapi SDK + WebRTC negotiation on 4G can legitimately take ~10-15s,
// so 20s is a safe ceiling without producing false alarms.
const THINKING_WATCHDOG_MS = 20_000;

// Convert any Vapi error shape into a short Italian user-facing string.
// We intentionally never show raw JSON to the user — Vapi error objects are
// deeply nested and change shape across SDK versions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function friendlyVapiError(err: any): string {
  if (err == null) return "Errore sconosciuto. Tocca per riprovare.";

  // Collect candidate strings from known Vapi error shapes
  const candidates: string[] = [
    err?.errorMsg,
    err?.message,
    err?.error?.message,
    err?.error?.errorMsg,
    // SDK 2.5 wraps: event.error.error.message / event.error.error.error
    err?.error?.error?.message,
    err?.error?.error?.error,
    err?.errorReason,
    err?.endedReason,
    err?.cause?.message,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  const raw = candidates[0]?.toLowerCase() ?? "";

  if (raw.includes("permission") || raw.includes("denied") || raw.includes("notallowed")) {
    return "Microfono bloccato. Vai in Impostazioni › Safari › Microfono e abilita normaai.it.";
  }
  if (raw.includes("couldn't get assistant") || raw.includes("assistant")) {
    return "Servizio voce non disponibile. Tocca per riprovare.";
  }
  if (raw.includes("network") || raw.includes("offline")) {
    return "Connessione assente. Controlla la rete e riprova.";
  }
  // Show raw error so we can diagnose what's actually failing
  const rawMsg = candidates[0] ?? JSON.stringify(err).slice(0, 200);
  return `Errore voce: ${rawMsg}`;
}

export interface UseMobileVoiceReturn {
  orbState: OrbState;
  userTranscript: string;
  assistantText: string;
  callActive: boolean;
  tapOrb: () => void;
  lastQuestion: string;
  voiceError: string | null;     // human-readable error to surface in UI
  clearVoiceError: () => void;
}

export function useMobileVoice(personality: OrbPersonalityId = "classico"): UseMobileVoiceReturn {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sawCallStartRef = useRef(false);

  const clearVoiceError = useCallback(() => setVoiceError(null), []);

  const armWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    sawCallStartRef.current = false;
    watchdogRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      console.warn("[NormaAI] Vapi watchdog fired — no events in 15s");
      try { vapiRef.current?.stop(); } catch { /* noop */ }
      setOrbState("idle");
      setCallActive(false);
      setVoiceError(
        sawCallStartRef.current
          ? "Norma non riesce a sentirti. Controlla che Safari abbia accesso al microfono (Impostazioni › Safari › Microfono)."
          : "Connessione vocale non riuscita. Riprova; se persiste, ricarica la pagina."
      );
    }, THINKING_WATCHDOG_MS);
  }, []);

  const disarmWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disarmWatchdog();
      try { vapiRef.current?.stop(); } catch { /* noop */ }
    };
  }, [disarmWatchdog]);
  // (the pre-warm useEffect lives after getVapi is declared, see below)

  // Lazy-init Vapi so we only import it client-side
  const getVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import("@vapi-ai/web");
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      console.log("[NormaAI] vapi:call-start");
      // Connection succeeded — disarm watchdog. Subsequent long pauses
      // (LLM thinking, user not speaking) are normal call states, not bugs.
      disarmWatchdog();
      sawCallStartRef.current = true;
      if (!mountedRef.current) return;
      setCallActive(true);
      setOrbState("thinking");
      // Reset last question so stale transcripts from previous calls don't show
      setLastQuestion("");
    });

    vapi.on("call-end", () => {
      console.log("[NormaAI] vapi:call-end");
      disarmWatchdog();
      if (!mountedRef.current) return;
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
    });

    vapi.on("speech-start", () => {
      console.log("[NormaAI] vapi:speech-start");
      disarmWatchdog();
      if (!mountedRef.current) return;
      setOrbState("speaking");
      setUserTranscript("");
    });

    vapi.on("speech-end", () => {
      console.log("[NormaAI] vapi:speech-end");
      if (!mountedRef.current) return;
      setOrbState("listening");
      setAssistantText("");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("message", (msg: any) => {
      if (!mountedRef.current) return;
      if (msg.type === "transcript") {
        if (msg.role === "user") {
          setUserTranscript(msg.transcript ?? "");
          if (msg.transcriptType === "final" && msg.transcript) {
            // Guard: ignore very short transcripts — these are usually Vapi
            // echoing the assistant's own greeting (e.g. "Ti dica,") back as
            // user speech due to mobile VAD / echo-cancellation quirks.
            if (msg.transcript.trim().length > 12) {
              setLastQuestion(msg.transcript);
            }
            setOrbState("thinking");
          } else if (msg.transcriptType === "partial") {
            setOrbState("listening");
          }
        } else if (msg.role === "assistant") {
          if (msg.transcriptType === "partial" || msg.transcriptType === "final") {
            setAssistantText(msg.transcript ?? "");
          }
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("error", (err: any) => {
      console.error("[NormaAI] vapi:error", err);
      disarmWatchdog();

      // CRITICAL: reset the Vapi instance so the next tap creates a fresh one.
      // After any error the SDK may leave Daily.co/WebRTC in dirty state.
      // Keeping vapiRef alive means subsequent start() calls reuse broken state
      // and always fail with the same Bad Request / connection error.
      try { vapiRef.current?.stop(); } catch { /* noop */ }
      vapiRef.current = null;

      if (!mountedRef.current) return;
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
      setVoiceError(friendlyVapiError(err));
    });

    return vapi;
  }, [disarmWatchdog]);

  // PERF: pre-warm the Vapi SDK immediately at mount (not on idle).
  // Dynamic import + Vapi init + event wiring = 500ms-1s cold start.
  // Firing immediately (vs requestIdleCallback which can wait 1-2s) cuts
  // that latency window and means the first tap hits vapi.start() instantly.
  useEffect(() => {
    void getVapi();
  }, [getVapi]);

  const tapOrb = useCallback(async () => {
    // If call active → stop it
    if (callActive || orbState !== "idle") {
      disarmWatchdog();
      try { vapiRef.current?.stop(); } catch { /* noop */ }
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
      return;
    }

    setVoiceError(null);

    // Trust the Vapi SDK to call getUserMedia itself. Pre-flight getUserMedia
    // calls (and AudioContext unlock tricks) were CAUSING the iOS mic capture
    // to return empty streams on the second acquisition. The SDK runs
    // getUserMedia inside the same task chain that started from this click
    // handler — iOS Safari accepts that as user-gesture.

    setOrbState("thinking");
    armWatchdog();
    try {
      const vapi = await getVapi();
      // Resolve the right assistant for the chosen personality. For "globo"
      // (multilingue) this also runs language detection from navigator.languages
      // or the user's manual override in localStorage.
      const assistantId = resolveAssistantId(personality);
      console.log("[NormaAI] starting call", { personality, assistantId });
      // assistantOverrides applied at call-time for minimum latency:
      // - startSpeakingPlan.waitSeconds 0.2s: short delay after Norma stops
      //   so VAD doesn't clip the user's first word (was 0.4s, halved)
      // - backgroundSound off: skips background audio mixing → saves ~100ms
      await vapi.start(assistantId, {
        assistantOverrides: {
          startSpeakingPlan: { waitSeconds: 0.2 },
          backgroundSound: "off",
        },
      });
    } catch (err) {
      console.error("[NormaAI] vapi.start threw", err);
      disarmWatchdog();
      // Reset instance so next tap starts clean
      try { vapiRef.current?.stop(); } catch { /* noop */ }
      vapiRef.current = null;
      if (mountedRef.current) {
        setOrbState("idle");
        setCallActive(false);
        setVoiceError(friendlyVapiError(err));
      }
    }
  }, [callActive, orbState, getVapi, armWatchdog, disarmWatchdog, personality]);

  return {
    orbState,
    userTranscript,
    assistantText,
    callActive,
    tapOrb,
    lastQuestion,
    voiceError,
    clearVoiceError,
  };
}
