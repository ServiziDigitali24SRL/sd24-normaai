/**
 * Homepage NormaAI — landing cream/serif legal-warm.
 *
 * Server component puro per LCP ottimale. La precedente landing con tabs
 * + onboarding + dashboard preview è in `_legacy/landing-tabs.tsx` per
 * riferimento; verrà smontata progressivamente man mano che le route
 * dedicate (`/voce`, `/avatar`, `/reel`, `/avvocato/*`) prendono il loro
 * spazio.
 *
 * Cosa contiene:
 * - LandingHero: top bar minimale + hero "La normativa italiana, finalmente
 *   parlante." + 3 CTA cards (le 3 superfici Voce/Avatar/Reel) + sezione
 *   editoriale "Tre modi di parlare con Sofia"
 * - SiteFooter: footer dark condiviso (riusato dal diario)
 */

import { LandingHero } from '@/components/LandingHero';
import { SiteFooter } from '@/components/SiteFooter';

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <SiteFooter />
    </>
  );
}
