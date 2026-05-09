'use client';

/**
 * SER-181 — Wrapper client per chrome non-critico.
 *
 * Lazy-load di CookieBanner / PlausibleAnalytics / SessionGuard via
 * next/dynamic({ ssr: false }) per ridurre il bundle del primo paint
 * sulle route pubbliche (homepage cream + /come_ho_costruito_norma).
 *
 * - CookieBanner: appare solo se non c'è consenso
 * - PlausibleAnalytics: già internamente afterInteractive + consent gated
 * - SessionGuard: importa @supabase/ssr (~50 kB), inutile finché non logged
 *
 * Tradeoff: 1-2 frame in più per detect logout su token expiry, accettabile
 * per il guadagno LCP/TBT su Lighthouse.
 */

import dynamic from 'next/dynamic';

const CookieBanner = dynamic(() => import('@/components/CookieBanner'), { ssr: false });
const PlausibleAnalytics = dynamic(() => import('@/components/PlausibleAnalytics'), { ssr: false });
const SessionGuard = dynamic(() => import('@/components/SessionGuard'), { ssr: false });

export function ClientChrome() {
  return (
    <>
      <SessionGuard />
      <CookieBanner />
      <PlausibleAnalytics />
    </>
  );
}
