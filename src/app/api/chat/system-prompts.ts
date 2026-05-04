// ════════════════════════════════════════════════════════════════════════════
// NormaAI System Prompts — compatibility shim for legacy 3-channel API
// (chat / voice / avatar / api).
//
// La nuova architettura risiede in `src/lib/prompts/` (18 prompt v7, score
// medio 95.0/100 — Claude Opus judged). Questo file re-esporta i prompt
// principali per non rompere chi consuma SOFIA_*_PROMPT o
// getSystemPrompt(channel).
//
// Per il routing voice persona+lingua usare:
//   import { getSystemPrompt as getPromptV7, type PromptKey } from "@/lib/prompts";
//   const prompt = getPromptV7({ channel: "voice", persona: "mediatore", language: "it" });
// ════════════════════════════════════════════════════════════════════════════

import {
  CHAT_IT_PROMPT,
  AVATAR_IT_PROMPT,
  VOICE_MEDIATORE_PROMPT,
  getSystemPrompt as getSystemPromptV7,
  SUPPORTED_VOICE_COMBINATIONS,
  type Channel as ChannelV7,
  type VoicePersona,
  type Language,
  type PromptKey,
} from "@/lib/prompts";

// ─── Legacy exports (3-channel single-Sofia) ─────────────────────────────────
// SOFIA_VOICE_PROMPT default: voice mediatore IT (più simile alla "voce
// generica" del precedente prompt — privilegia accordi stragiudiziali).
// Per usare le altre 15 combinazioni voice (aggressivo, immigrato/turista in
// 7 e 6 lingue) usa direttamente getSystemPromptV7({ channel, persona, language }).
export const SOFIA_CHAT_PROMPT = CHAT_IT_PROMPT;
export const SOFIA_AVATAR_PROMPT = AVATAR_IT_PROMPT;
export const SOFIA_VOICE_PROMPT = VOICE_MEDIATORE_PROMPT;
export const SOFIA_API_PROMPT = CHAT_IT_PROMPT;

// ─── Tipi e helper legacy ───────────────────────────────────────────────────
export type SofiaChannel = "chat" | "voice" | "avatar" | "api";

export function getSystemPrompt(channel: SofiaChannel): string {
  switch (channel) {
    case "chat":
      return SOFIA_CHAT_PROMPT;
    case "voice":
      return SOFIA_VOICE_PROMPT;
    case "avatar":
      return SOFIA_AVATAR_PROMPT;
    case "api":
      return SOFIA_API_PROMPT;
  }
}

/** Inject RAG context (retrieved corpus chunks) into the prompt. */
export function buildPromptWithContext(
  channel: SofiaChannel,
  ragContext: string | null,
): string {
  const base = getSystemPrompt(channel);
  if (!ragContext) return base;
  return `${base}

CONTESTO NORMATIVO (Norm Retriever ha trovato i seguenti chunk pertinenti):
${ragContext}

Usa SOLO le fonti elencate sopra per rispondere. Se la risposta non è nel contesto, applica R3 [NON SO].`;
}

// ─── New v7 router (re-export per chi vuole usare la nuova API) ─────────────
export {
  getSystemPromptV7,
  SUPPORTED_VOICE_COMBINATIONS,
  type ChannelV7,
  type VoicePersona,
  type Language,
  type PromptKey,
};
