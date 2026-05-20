/**
 * /onboarding-v2 — Onboarding editorial (handoff design SER-209).
 * Step 5 del frontend reskin: porta Onboarding (schermo 02 del template) come
 * client component Next.js. Branches per role (cittadino 4 step / avvocato 7 /
 * impresa 5).
 *
 * NOTA: questo commit ports solo l'UI. Lo state finale viene salvato in
 * localStorage (come nel template). Wire Supabase auth + signup in commit
 * successivo. Quando OK visivamente sostituiremo `/onboarding` esistente.
 *
 * Route NON in produzione: noindex/nofollow.
 */

import type { Metadata } from "next";
import { Onboarding } from "@/components/handoff/Onboarding";

export const metadata: Metadata = {
  title: "Registrazione — NormaAI",
  description: "Crei un account per usare NormaAI senza limiti.",
  robots: { index: false, follow: false },
};

export default function OnboardingV2Page() {
  return <Onboarding />;
}
