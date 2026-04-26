"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

// Vapi public key & assistant — safe to expose client-side
const VAPI_PUBLIC_KEY = "1fe0aa87-b7a0-4394-b877-d846fa06035d";
const VAPI_ASSISTANT_ID = "e4cb1d2b-5afa-440c-94e7-51380cdc1f4a";

export interface UseMobileVoiceReturn {
  orbState: OrbState;
  userTranscript: string;   // what the user is saying (live)
  assistantText: string;    // what Norma is saying (live)
  callActive: boolean;
  tapOrb: () => void;
  lastQuestion: string;     // last completed user question (for Pro CTA)
}

export function useMobileVoice(): UseMobileVoiceReturn {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop any active call on unmount
      try { vapiRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  // Lazy-init Vapi so we only import it client-side
  const getVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import("@vapi-ai/web");
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    // ── call lifecycle ────────────────────────────────────────────────
    vapi.on("call-start", () => {
      if (!mountedRef.current) return;
      setCallActive(true);
      setOrbState("thinking"); // connecting / waiting for first assistant speech
    });

    vapi.on("call-end", () => {
      if (!mountedRef.current) return;
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
    });

    // ── assistant speaking ────────────────────────────────────────────
    vapi.on("speech-start", () => {
      if (!mountedRef.current) return;
      setOrbState("speaking");
      setUserTranscript(""); // clear user transcript while assistant speaks
    });

    vapi.on("speech-end", () => {
      if (!mountedRef.current) return;
      // Assistant finished → user's turn
      setOrbState("listening");
      setAssistantText("");
    });

    // ── transcripts ───────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("message", (msg: any) => {
      if (!mountedRef.current) return;

      if (msg.type === "transcript") {
        if (msg.role === "user") {
          setUserTranscript(msg.transcript ?? "");
          if (msg.transcriptType === "final" && msg.transcript) {
            setLastQuestion(msg.transcript);
            setOrbState("thinking"); // sent to LLM
          } else if (msg.transcriptType === "partial") {
            setOrbState("listening");
          }
        } else if (msg.role === "assistant") {
          // Show live assistant text while speaking
          if (msg.transcriptType === "partial" || msg.transcriptType === "final") {
            setAssistantText(msg.transcript ?? "");
          }
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("error", (err: any) => {
      console.error("[NormaAI Vapi]", err);
      if (!mountedRef.current) return;
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
    });

    return vapi;
  }, []);

  const tapOrb = useCallback(async () => {
    // If call is active → stop it
    if (callActive || orbState !== "idle") {
      try { vapiRef.current?.stop(); } catch { /* noop */ }
      setCallActive(false);
      setOrbState("idle");
      setUserTranscript("");
      setAssistantText("");
      return;
    }

    // iOS Safari: unlock audio context SYNCHRONOUSLY within user gesture.
    // Vapi's buildAudioPlayer calls audio.play() from an async WebRTC handler
    // which iOS blocks. Playing a silent buffer here unlocks the audio session.
    try {
      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        // Keep ctx alive briefly so the unlock persists for the async join
        setTimeout(() => ctx.close(), 2000);
      }
    } catch { /* noop — unlock best-effort */ }

    // iOS Safari: request mic permission EXPLICITLY within the user gesture
    // before Vapi's WebRTC getUserMedia call — otherwise iOS blocks it silently
    // causing error-assistant-did-not-receive-customer-audio on every call.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // release — Vapi re-acquires
    } catch (err) {
      console.warn("[NormaAI] Mic permission denied", err);
      if (mountedRef.current) setOrbState("idle");
      return;
    }

    // Start new call — optimistic UI
    setOrbState("thinking");
    try {
      const vapi = await getVapi();
      await vapi.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error("[NormaAI] Vapi start error", err);
      if (mountedRef.current) {
        setOrbState("idle");
        setCallActive(false);
      }
    }
  }, [callActive, orbState, getVapi]);

  return {
    orbState,
    userTranscript,
    assistantText,
    callActive,
    tapOrb,
    lastQuestion,
  };
}
