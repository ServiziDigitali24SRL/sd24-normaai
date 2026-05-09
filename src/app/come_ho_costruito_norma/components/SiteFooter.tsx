/**
 * Re-export del SiteFooter condiviso (`src/components/SiteFooter.tsx`).
 * Mantenuto qui solo per retro-compatibilità degli import locali.
 * Il diario passa l'orario dello snapshot live; le altre route possono
 * omettere il prop e il badge non viene mostrato.
 */

import { mockSnapshot } from '../_lib/mock';
import { SiteFooter as SharedSiteFooter } from '@/components/SiteFooter';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export function SiteFooter() {
  return <SharedSiteFooter lastUpdateLabel={fmtTime(mockSnapshot.ts)} />;
}
