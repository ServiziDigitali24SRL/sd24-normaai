"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceSource {
  code: string;
  title: string;
  snippet: string;
}

export interface VoiceResult {
  question: string;
  answer: string;
  sources: VoiceSource[];
}

export interface UseMobileVoiceReturn {
  orbState: OrbState;
  transcript: string;
  lastResult: VoiceResult | null;
  isSupported: boolean;
  tapOrb: () => void;
  stopAll: () => void;
  queriesUsed: number;
  queryLimitHit: boolean;
}

const QUERY_KEY = "na_anon_count";
const QUERY_DATE_KEY = "na_anon_date";
const QUERY_LIMIT = 10;

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getAnonCount(): number {
  if (typeof window === "undefined") return 0;
  const date = localStorage.getItem(QUERY_DATE_KEY);
  const today = getTodayStr();
  if (date !== today) {
    localStorage.setItem(QUERY_DATE_KEY, today);
    localStorage.setItem(QUERY_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(QUERY_KEY) ?? "0", 10);
}

function incrementAnonCount(): number {
  const next = getAnonCount() + 1;
  localStorage.setItem(QUERY_KEY, String(next));
  return next;
}

export function useMobileVoice(): UseMobileVoiceReturn {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [queryLimitHit, setQueryLimitHit] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthRef = useRef<any>(null);
  const abortRef = useRef(false);

  // Init query count on mount (client only)
  useEffect(() => {
    const count = getAnonCount();
    setQueriesUsed(count);
    if (count >= QUERY_LIMIT) setQueryLimitHit(true);
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopAll = useCallback(() => {
    abortRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setOrbState("idle");
    setTranscript("");
  }, []);

  const sendToNormaAI = useCallback(async (question: string) => {
    if (abortRef.current) return;
    setOrbState("thinking");

    // Check anonymous limit
    const count = getAnonCount();
    if (count >= QUERY_LIMIT) {
      setQueryLimitHit(true);
      setOrbState("idle");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          vertical: null,
          userId: null,
          conversationHistory: [],
          turnNumber: 0,
        }),
      });

      if (res.status === 402) {
        // Hit server-side limit â show paywall
        setQueryLimitHit(true);
        setOrbState("idle");
        return;
      }

      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);

      // Increment query count
      const newCount = incrementAnonCount();
      setQueriesUsed(newCount);
      if (newCount >= QUERY_LIMIT) setQueryLimitHit(true);

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let finalSources: VoiceSource[] = [];

      while (true) {
        if (abortRef.current) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "sources") {
              finalSources = event.sources ?? [];
            } else if (event.type === "text") {
              finalText += event.text;
            } else if (event.type === "done" || event.type === "error") {
              break;
            }
          } catch {}
        }
      }

      if (abortRef.current) return;

      const result: VoiceResult = { question, answer: finalText, sources: finalSources };
      setLastResult(result);

      // Speak the answer
      if (finalText && window.speechSynthesis) {
        setOrbState("speaking");
        const utter = new SpeechSynthesisUtterance(finalText.slice(0, 600));
        utter.lang = "it-IT";
        utter.rate = 0.95;
        utter.pitch = 1.0;

        // Try to pick an Italian voice
        const voices = window.speechSynthesis.getVoices();
        const itVoice = voices.find((v) => v.lang.startsWith("it"));
        if (itVoice) utter.voice = itVoice;

        utter.onend = () => {
          if (!abortRef.current) setOrbState("idle");
        };
        utter.onerror = () => {
          if (!abortRef.current) setOrbState("idle");
        };
        synthRef.current = utter;
        window.speechSynthesis.speak(utter);
      } else {
        setOrbState("idle");
      }
    } catch {
      if (!abortRef.current) {
        setOrbState("idle");
      }
    }
  }, []);

  const tapOrb = useCallback(() => {
    // If already active â stop everything
    if (orbState !== "idle") {
      stopAll();
      return;
    }

    // Check limit before even starting
    if (queryLimitHit) {
      // Signal to parent to show gate
      window.dispatchEvent(new CustomEvent("norma-mobile-limit"));
      return;
    }

    if (!isSupported) {
      // Fallback: show text input prompt
      window.dispatchEvent(new CustomEvent("norma-mobile-text-input"));
      return;
    }

    abortRef.current = false;
    setLastResult(null);
    setTranscript("");

    // Start speech recognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRec();
    recognition.lang = "it-IT";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    setOrbState("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        recognitionRef.current = null;
        sendToNormaAI(text);
      }
    };

    recognition.onerror = () => {
      if (!abortRef.current) {
        setOrbState("idle");
        setTranscript("");
      }
    };

    recognition.onend = () => {
      if (!abortRef.current) {
        setOrbState("idle");
        setTranscript("");
      }
    };

    recognition.start();
  }, [orbState, queryLimitHit, isSupported, stopAll, sendToNormaAI]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    orbState,
    transcript,
    lastResult,
    isSupported,
    tapOrb,
    stopAll,
    queriesUsed,
    queryLimitHit,
  };
}
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceSource {
  code: string;
  title: string;
  snippet: string;
}

export interface VoiceResult {
  question: string;
  answer: string;
  sources: VoiceSource[];
}

export interface UseMobileVoiceReturn {
  orbState: OrbState;
  transcript: string;
  lastResult: VoiceResult | null;
  isSupported: boolean;
  tapOrb: () => void;
  stopAll: () => void;
  queriesUsed: number;
  queryLimitHit: boolean;
}

const QUERY_KEY = "na_anon_count";
const QUERY_DATE_KEY = "na_anon_date";
const QUERY_LIMIT = 10;

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getAnonCount(): number {
  if (typeof window === "undefined") return 0;
  const date = localStorage.getItem(QUERY_DATE_KEY);
  const today = getTodayStr();
  if (date !== today) {
    localStorage.setItem(QUERY_DATE_KEY, today);
    localStorage.setItem(QUERY_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(QUERY_KEY) ?? "0", 10);
}

function incrementAnonCount(): number {
  const next = getAnonCount() + 1;
  localStorage.setItem(QUERY_KEY, String(next));
  return next;
}

export function useMobileVoice(): UseMobileVoiceReturn {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [queryLimitHit, setQueryLimitHit] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthRef = useRef<any>(null);
  const abortRef = useRef(false);

  // Init query count on mount (client only)
  useEffect(() => {
    const count = getAnonCount();
    setQueriesUsed(count);
    if (count >= QUERY_LIMIT) setQueryLimitHit(true);
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopAll = useCallback(() => {
    abortRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setOrbState("idle");
    setTranscript("");
  }, []);

  const sendToNormaAI = useCallback(async (question: string) => {
    if (abortRef.current) return;
    setOrbState("thinking");

    // Check anonymous limit
    const count = getAnonCount();
    if (count >= QUERY_LIMIT) {
      setQueryLimitHit(true);
      setOrbState("idle");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          vertical: null,
          userId: null,
          conversationHistory: [],
          turnNumber: 0,
        }),
      });

      if (res.status === 402) {
        // Hit server-side limit â show paywall
        setQueryLimitHit(true);
        setOrbState("idle");
        return;
      }

      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);

      // Increment query count
      const newCount = incrementAnonCount();
      setQueriesUsed(newCount);
      if (newCount >= QUERY_LIMIT) setQueryLimitHit(true);

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let finalSources: VoiceSource[] = [];

      while (true) {
        if (abortRef.current) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "sources") {
              finalSources = event.sources ?? [];
            } else if (event.type === "text") {
              finalText += event.text;
            } else if (event.type === "done" || event.type === "error") {
              break;
            }
          } catch {}
        }
      }

      if (abortRef.current) return;

      const result: VoiceResult = { question, answer: finalText, sources: finalSources };
      setLastResult(result);

      // Speak the answer
      if (finalText && window.speechSynthesis) {
        setOrbState("speaking");
        const utter = new SpeechSynthesisUtterance(finalText.slice(0, 600));
        utter.lang = "it-IT";
        utter.rate = 0.95;
        utter.pitch = 1.0;

        // Try to pick an Italian voice
        const voices = window.speechSynthesis.getVoices();
        const itVoice = voices.find((v) => v.lang.startsWith("it"));
        if (itVoice) utter.voice = itVoice;

        utter.onend = () => {
          if (!abortRef.current) setOrbState("idle");
        };
        utter.onerror = () => {
          if (!abortRef.current) setOrbState("idle");
        };
        synthRef.current = utter;
        window.speechSynthesis.speak(utter);
      } else {
        setOrbState("idle");
      }
    } catch {
      if (!abortRef.current) {
        setOrbState("idle");
      }
    }
  }, []);

  const tapOrb = useCallback(() => {
    // If already active â stop everything
    if (orbState !== "idle") {
      stopAll();
      return;
    }

    // Check limit before even starting
    if (queryLimitHit) {
      // Signal to parent to show gate
      window.dispatchEvent(new CustomEvent("norma-mobile-limit"));
      return;
    }

    if (!isSupported) {
      // Fallback: show text input prompt
      window.dispatchEvent(new CustomEvent("norma-mobile-text-input"));
      return;
    }

    abortRef.current = false;
    setLastResult(null);
    setTranscript("");

    // Start speech recognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRec();
    recognition.lang = "it-IT";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    setOrbState("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        recognitionRef.current = null;
        sendToNormaAI(text);
      }
    };

    recognition.onerror = () => {
      if (!abortRef.current) {
        setOrbState("idle");
        setTranscript("");
      }
    };

    recognition.onend = () => {
      if (!abortRef.current && orbState === "listening") {
        setOrbState("idle");
        setTranscript("");
      }
    };

    recognition.start();
  }, [orbState, queryLimitHit, isSupported, stopAll, sendToNormaAI]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    orbState,
    transcript,
    lastResult,
    isSupported,
    tapOrb,
    stopAll,
    queriesUsed,
    queryLimitHit,
  };
}
