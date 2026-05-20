/**
 * Mobile root layout — viewport iOS-optimized, isolato dal design paper/ink
 * desktop. Tutto il rendering effettivo (background, font, safe area) avviene
 * nelle page tramite MobileShell — qui solo metadata + viewport.
 */

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NormaAI — Mobile",
  description: "Consulenza normativa AI mobile-first. Voice + chat freemium.",
  robots: { index: false, follow: false }, // mobile UA-redirected, non SEO-target
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
