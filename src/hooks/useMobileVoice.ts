"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

// Vapi public key & assistant — safe to expose client-side
const VAPI_PUBLIC_KEY = "1fe0aa87-b7a0-4394-b877-d846fa06035d";
const VAPI_ASSISTANT_ID = "e4cb1d2b-5afa-440c-94e7-51380cdc1f4a";

// Watchdog: if we sit in "thinking" with no Vapi event for this long,
// something is broken (mic blocked silently, network, SDK hang). Reset
// to idle so the UI doesn't lie about being busy forever.
const THINKING_WATCHDOG_MS = 15_000;

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

export function useMobileVoice(): UseMobileVoiceReturn {
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

  // Lazy-init Vapi so we only import it client-side
  const getVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import("@vapi-ai/web");
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      console.log("[NormaAI] vapi:call-start");
      sawCallStartRef.current = true;
      if (!mountedRef.current) return;
      setCallActive(true);
      setOrbState("thinking");
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
            setLastQuestion(msg.transcript);
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
      if (!mountedRef.current) return;
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
      const msg = err?.errorMsg || err?.message || err?.error?.message || String(err);
      setVoiceError(`Errore voce: ${String(msg).slice(0, 140)}`);
    });

    return vapi;
  }, [disarmWatchdog]);

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
      await vapi.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error("[NormaAI] vapi.start threw", err);
      disarmWatchdog();
      if (mountedRef.current) {
        setOrbState("idle");
        setCallActive(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || String(err);
        setVoiceError(
          msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
            ? "Microfono bloccato. Vai in Impostazioni iOS › Safari › Microfono e abilita normaai.it."
            : `Impossibile avviare la voce: ${msg.slice(0, 140)}`
        );
      }
    }
  }, [callActive, orbState, getVapi, armWatchdog, disarmWatchdog]);

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
