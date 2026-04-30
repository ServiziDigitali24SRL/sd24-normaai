// Lightweight onboarding state — persisted in localStorage so refresh doesn't
// lose progress. Two flows: mobile (3 step) and desktop (5 step). The lawyer
// extra step (P.IVA, foro, città, specializzazioni) only fires when
// is_lawyer=true on desktop.

export type Origin = "italiano" | "straniero" | "turista";

export interface OnboardingState {
  platform: "mobile" | "desktop";
  step: number;
  display_name?: string;
  origin?: Origin;
  job_title?: string;
  is_lawyer?: boolean;
  // Lawyer extra (desktop only when is_lawyer)
  p_iva?: string;
  foro?: string;
  city?: string;
  specializzazioni?: string[];
}

const STORAGE_KEY = "normaai:onboarding";

export function loadOnboarding(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(s: Partial<OnboardingState>): OnboardingState {
  if (typeof window === "undefined") return s as OnboardingState;
  const prev = loadOnboarding() ?? { platform: "desktop", step: 0 };
  const next = { ...prev, ...s };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export const ORIGIN_OPTIONS: { value: Origin; label: string; emoji: string }[] = [
  { value: "italiano",  label: "Italiano",            emoji: "🇮🇹" },
  { value: "straniero", label: "Straniero in Italia", emoji: "🌍" },
  { value: "turista",   label: "Turista",             emoji: "🧳" },
];
