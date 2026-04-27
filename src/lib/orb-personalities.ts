/**
 * NormaAI orb personalities — voice assistants config.
 *
 * Each "orb" is a distinct Vapi assistant with its own system prompt,
 * voice, and target audience. Created via Vapi REST API on 2026-04-27;
 * see /Users/user/Documents/PROGETTI/NORMAAI/MEMORY.md for the full
 * personality matrix and product rationale.
 *
 * To swap or rebuild an assistant:
 *   curl -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
 *        https://api.vapi.ai/assistant/{ID}
 *
 * VAPI_PRIVATE_KEY lives in .env.master (NOT in this repo).
 */

export type OrbPersonalityId =
  | "classico"      // 🟠 Avvocato amico — adulti generici
  | "notte"         // 🔵 Aggressivo — imprenditori
  | "natura"        // 🟢 Dolce, lento, ripete — anziani fragili
  | "aurora"        // 🟣 Linguaggio facile — giovani
  | "globo";        // 🌍 Multilingue auto-detect — immigrati/turisti

/** Languages supported by the multilingue (globo) orb. */
export type SupportedLang = "it" | "en" | "ar" | "ro" | "uk" | "es" | "zh" | "bn" | "ja";

export const SUPPORTED_LANGS: readonly SupportedLang[] = [
  "it", "en", "ar", "ro", "uk", "es", "zh", "bn", "ja",
] as const;

/** Vapi assistant IDs created in the agenticsimpermeo Vapi org. */
export const VAPI_ASSISTANT_IDS = {
  // Italian personalities
  classico: "e4cb1d2b-5afa-440c-94e7-51380cdc1f4a",
  notte:    "c74c2823-e5f5-4791-95bf-db29049f57ba",
  natura:   "2c27e0cf-71be-495f-b1bb-9dcaa86c4eca",
  aurora:   "2cf98320-35d3-445d-8b89-45f7314ecfdd",
  // Multilingue per-language assistants
  multi: {
    it: "e4cb1d2b-5afa-440c-94e7-51380cdc1f4a", // reuse Classico for IT
    en: "95d6b01a-04f8-428b-adb6-bc095d0637dc",
    ar: "1f6473f9-820e-40b3-8436-182230f5d0df",
    ro: "6da82021-66ba-4c3f-af1e-a6640c6a1e01",
    uk: "c55fbca7-86e8-4428-b345-139963686957",
    es: "31e6b470-b577-4260-afb7-d4672fd68f0f",
    zh: "391341a2-ff4d-4320-9dc3-7ce3e693929c",
    bn: "9f11e15e-2c6a-4820-a5a1-a4c22457731e",
    ja: "58d3e88f-363d-4155-842a-d73cf362ddef",
  } satisfies Record<SupportedLang, string>,
} as const;

export interface OrbPersonality {
  id: OrbPersonalityId;
  /** UI label in the picker. */
  label: string;
  /** One-line audience/character description shown in the picker. */
  description: string;
  /** Preview gradient for the picker swatch. */
  preview: string;
  /** Italian assistants always have a fixed ID. The "globo" orb resolves
   * its assistant at call-time based on detected/overridden language. */
  assistantId: string | null;
}

export const ORB_PERSONALITIES: readonly OrbPersonality[] = [
  {
    id: "classico",
    label: "Classico",
    description: "Avvocato amico — preciso e caldo",
    preview: "radial-gradient(circle at 30% 30%, #F6F2EA 0%, #E6DFCF 55%, #C9BFA8 100%)",
    assistantId: VAPI_ASSISTANT_IDS.classico,
  },
  {
    id: "notte",
    label: "Notte",
    description: "Diretto, va al punto — per imprenditori",
    preview: "radial-gradient(circle at 30% 30%, oklch(0.86 0.14 55) 0%, oklch(0.68 0.19 40) 55%, oklch(0.48 0.19 28) 100%)",
    assistantId: VAPI_ASSISTANT_IDS.notte,
  },
  {
    id: "natura",
    label: "Natura",
    description: "Dolce e calmo, ripete il punto chiave — per anziani",
    preview: "radial-gradient(circle at 30% 30%, oklch(0.82 0.08 140) 0%, oklch(0.6 0.11 145) 55%, oklch(0.38 0.1 150) 100%)",
    assistantId: VAPI_ASSISTANT_IDS.natura,
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Linguaggio semplice, dà del tu — per giovani",
    preview: "radial-gradient(circle at 30% 30%, oklch(0.86 0.08 220) 0%, oklch(0.62 0.13 230) 55%, oklch(0.38 0.13 235) 100%)",
    assistantId: VAPI_ASSISTANT_IDS.aurora,
  },
  {
    id: "globo",
    label: "Globo",
    description: "Parla la tua lingua — italiano, EN, العربية, română, українська, español, 中文, বাংলা, 日本語",
    preview: "radial-gradient(circle at 30% 30%, #3E3A35 0%, #272420 55%, #13110F 100%)",
    assistantId: null, // resolved at call-time via resolveGloboAssistant()
  },
] as const;

const LANG_LABELS: Record<SupportedLang, { native: string; english: string; flag: string }> = {
  it: { native: "Italiano",  english: "Italian",   flag: "🇮🇹" },
  en: { native: "English",   english: "English",   flag: "🇬🇧" },
  ar: { native: "العربية",    english: "Arabic",    flag: "🇲🇦" },
  ro: { native: "Română",    english: "Romanian",  flag: "🇷🇴" },
  uk: { native: "Українська", english: "Ukrainian", flag: "🇺🇦" },
  es: { native: "Español",   english: "Spanish",   flag: "🇪🇸" },
  zh: { native: "中文",       english: "Chinese",   flag: "🇨🇳" },
  bn: { native: "বাংলা",      english: "Bengali",   flag: "🇧🇩" },
  ja: { native: "日本語",     english: "Japanese",  flag: "🇯🇵" },
};

export function langLabel(code: SupportedLang) {
  return LANG_LABELS[code];
}

export const ALL_LANGS = SUPPORTED_LANGS;

/** localStorage key for user's manual language override (overrides browser). */
export const LANG_OVERRIDE_KEY = "norma_lang_override";
/** localStorage key for picked orb personality. */
export const ORB_PERSONALITY_KEY = "norma_orb_personality";

/**
 * Detect the user's preferred language for the Globo orb.
 *
 * Priority:
 *   1. Manual override saved in localStorage (set from the menu).
 *   2. Ranked browser preferences (navigator.languages).
 *   3. Italian (default fallback).
 *
 * Always returns a SupportedLang — no nulls. Safe to call SSR (returns "it").
 */
export function detectLanguage(): SupportedLang {
  if (typeof window === "undefined") return "it";

  try {
    const override = window.localStorage.getItem(LANG_OVERRIDE_KEY);
    if (override && (SUPPORTED_LANGS as readonly string[]).includes(override)) {
      return override as SupportedLang;
    }
  } catch { /* localStorage may be blocked in private mode */ }

  const navLangs: readonly string[] =
    (navigator.languages && navigator.languages.length > 0)
      ? navigator.languages
      : [navigator.language || "it"];

  for (const raw of navLangs) {
    const code = raw.toLowerCase().split(/[-_]/)[0];
    if ((SUPPORTED_LANGS as readonly string[]).includes(code)) {
      return code as SupportedLang;
    }
  }

  return "it";
}

/**
 * Resolve which Vapi assistant ID to call for a given personality.
 * For Globo, applies language detection.
 */
export function resolveAssistantId(personality: OrbPersonalityId): string {
  if (personality === "globo") {
    const lang = detectLanguage();
    return VAPI_ASSISTANT_IDS.multi[lang];
  }
  return VAPI_ASSISTANT_IDS[personality];
}

export function getPersonality(id: OrbPersonalityId): OrbPersonality {
  return ORB_PERSONALITIES.find((p) => p.id === id) ?? ORB_PERSONALITIES[0];
}
