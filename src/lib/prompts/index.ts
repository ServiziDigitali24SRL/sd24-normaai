// ════════════════════════════════════════════════════════════════════════════
// NormaAI — Prompt Router (v7)
// 18 system prompts: 2 LEGALESE (chat, avatar) + 16 voice (4 IT + 12 multilingue)
// Score finale Claude Opus judge: 9 prompt ≥95, 9 prompt ≥94. Media 95.0/100.
// Generato dal benchmark loop SD24 (8 pass paid + 1 in-session Claude Opus).
// ════════════════════════════════════════════════════════════════════════════

import { CHAT_IT_PROMPT } from "./chat_it";
import { AVATAR_IT_PROMPT } from "./avatar_it";
import { VOICE_MEDIATORE_PROMPT } from "./voice/voice_mediatore";
import { VOICE_AGGRESSIVO_PROMPT } from "./voice/voice_aggressivo";
import { VOICE_CONSULENTE_ANZIANI_PROMPT } from "./voice/voice_consulente_anziani";
import { VOICE_IMMIGRATO_AR_PROMPT } from "./voice/voice_immigrato_ar";
import { VOICE_IMMIGRATO_BN_PROMPT } from "./voice/voice_immigrato_bn";
import { VOICE_IMMIGRATO_EN_PROMPT } from "./voice/voice_immigrato_en";
import { VOICE_IMMIGRATO_ES_PROMPT } from "./voice/voice_immigrato_es";
import { VOICE_IMMIGRATO_RO_PROMPT } from "./voice/voice_immigrato_ro";
import { VOICE_IMMIGRATO_UK_PROMPT } from "./voice/voice_immigrato_uk";
import { VOICE_IMMIGRATO_ZH_PROMPT } from "./voice/voice_immigrato_zh";
import { VOICE_TURISTA_DE_PROMPT } from "./voice/voice_turista_de";
import { VOICE_TURISTA_EN_PROMPT } from "./voice/voice_turista_en";
import { VOICE_TURISTA_ES_PROMPT } from "./voice/voice_turista_es";
import { VOICE_TURISTA_FR_PROMPT } from "./voice/voice_turista_fr";
import { VOICE_TURISTA_JA_PROMPT } from "./voice/voice_turista_ja";
import { VOICE_TURISTA_ZH_PROMPT } from "./voice/voice_turista_zh";

export type Channel = "chat" | "avatar" | "voice";
export type VoicePersona =
  | "mediatore"
  | "aggressivo"
  | "consulente_anziani"
  | "immigrato"
  | "turista";
export type Language =
  | "it"
  | "en"
  | "es"
  | "ar"
  | "ro"
  | "zh"
  | "uk"
  | "bn"
  | "de"
  | "fr"
  | "ja";

export interface PromptKey {
  channel: Channel;
  persona?: VoicePersona;
  language?: Language;
}

const VOICE_REGISTRY: Record<string, string> = {
  "mediatore:it": VOICE_MEDIATORE_PROMPT,
  "aggressivo:it": VOICE_AGGRESSIVO_PROMPT,
  "consulente_anziani:it": VOICE_CONSULENTE_ANZIANI_PROMPT,
  "immigrato:ar": VOICE_IMMIGRATO_AR_PROMPT,
  "immigrato:bn": VOICE_IMMIGRATO_BN_PROMPT,
  "immigrato:en": VOICE_IMMIGRATO_EN_PROMPT,
  "immigrato:es": VOICE_IMMIGRATO_ES_PROMPT,
  "immigrato:ro": VOICE_IMMIGRATO_RO_PROMPT,
  "immigrato:uk": VOICE_IMMIGRATO_UK_PROMPT,
  "immigrato:zh": VOICE_IMMIGRATO_ZH_PROMPT,
  "turista:de": VOICE_TURISTA_DE_PROMPT,
  "turista:en": VOICE_TURISTA_EN_PROMPT,
  "turista:es": VOICE_TURISTA_ES_PROMPT,
  "turista:fr": VOICE_TURISTA_FR_PROMPT,
  "turista:ja": VOICE_TURISTA_JA_PROMPT,
  "turista:zh": VOICE_TURISTA_ZH_PROMPT,
};

/**
 * Restituisce il system prompt giusto per (channel, persona, lingua).
 * - chat → CHAT_IT_PROMPT (italiano, "Tu", chat desktop)
 * - avatar → AVATAR_IT_PROMPT (italiano, "Lei", avatar video)
 * - voice → richiede persona + language
 *
 * Fallback: se la combinazione voice non esiste, ritorna immigrato:en.
 */
export function getSystemPrompt(key: PromptKey): string {
  if (key.channel === "chat") return CHAT_IT_PROMPT;
  if (key.channel === "avatar") return AVATAR_IT_PROMPT;

  if (key.channel === "voice") {
    const persona = key.persona ?? "immigrato";
    const language = key.language ?? "en";
    const k = `${persona}:${language}`;
    return VOICE_REGISTRY[k] ?? VOICE_REGISTRY["immigrato:en"];
  }

  return CHAT_IT_PROMPT;
}

/**
 * Lista delle combinazioni voice supportate.
 * Utile per generare gli assistant Vapi.
 */
export const SUPPORTED_VOICE_COMBINATIONS: Array<{
  persona: VoicePersona;
  language: Language;
}> = [
  { persona: "mediatore", language: "it" },
  { persona: "aggressivo", language: "it" },
  { persona: "consulente_anziani", language: "it" },
  { persona: "immigrato", language: "ar" },
  { persona: "immigrato", language: "bn" },
  { persona: "immigrato", language: "en" },
  { persona: "immigrato", language: "es" },
  { persona: "immigrato", language: "ro" },
  { persona: "immigrato", language: "uk" },
  { persona: "immigrato", language: "zh" },
  { persona: "turista", language: "de" },
  { persona: "turista", language: "en" },
  { persona: "turista", language: "es" },
  { persona: "turista", language: "fr" },
  { persona: "turista", language: "ja" },
  { persona: "turista", language: "zh" },
];

// Re-export individuali per chi vuole import diretti
export {
  CHAT_IT_PROMPT,
  AVATAR_IT_PROMPT,
  VOICE_MEDIATORE_PROMPT,
  VOICE_AGGRESSIVO_PROMPT,
  VOICE_CONSULENTE_ANZIANI_PROMPT,
  VOICE_IMMIGRATO_AR_PROMPT,
  VOICE_IMMIGRATO_BN_PROMPT,
  VOICE_IMMIGRATO_EN_PROMPT,
  VOICE_IMMIGRATO_ES_PROMPT,
  VOICE_IMMIGRATO_RO_PROMPT,
  VOICE_IMMIGRATO_UK_PROMPT,
  VOICE_IMMIGRATO_ZH_PROMPT,
  VOICE_TURISTA_DE_PROMPT,
  VOICE_TURISTA_EN_PROMPT,
  VOICE_TURISTA_ES_PROMPT,
  VOICE_TURISTA_FR_PROMPT,
  VOICE_TURISTA_JA_PROMPT,
  VOICE_TURISTA_ZH_PROMPT,
};
