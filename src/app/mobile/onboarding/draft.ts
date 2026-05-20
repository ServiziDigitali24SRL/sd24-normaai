/**
 * Mobile onboarding draft state — localStorage helper.
 * Persistente tra le 4 step page (phone → email → profile → prefs).
 * Cleared dopo finalize success.
 */

const KEY = "normaai:mobile-onboarding";

export interface OnboardingDraft {
  first_name: string;
  last_name: string;
  phone: string;
  phone_verified: boolean;
  email: string;
  email_sent: boolean;
  cap: string;
  citta: string;
  provincia: string;
  regione: string;
  citizenship_type: "italiano" | "turista" | "straniero_residente" | null;
  preferred_lang: "it" | "en";
  preferred_voice_lang: string;
  preferred_orb_color: "vermiglio" | "alloro" | "ambra" | "blu";
  completed?: boolean;
}

export const EMPTY_DRAFT: OnboardingDraft = {
  first_name: "",
  last_name: "",
  phone: "",
  phone_verified: false,
  email: "",
  email_sent: false,
  cap: "",
  citta: "",
  provincia: "",
  regione: "",
  citizenship_type: null,
  preferred_lang: "it",
  preferred_voice_lang: "it",
  preferred_orb_color: "blu",
};

export function loadDraft(): OnboardingDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return { ...EMPTY_DRAFT, ...parsed };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(patch: Partial<OnboardingDraft>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDraft();
    const next = { ...current, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
