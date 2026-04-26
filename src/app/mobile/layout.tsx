import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NormaAI — Agente Vocale",
  description: "Consulenza normativa istantanea tramite agente vocale AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--paper)",
      fontFamily: "var(--sans)",
      overscrollBehavior: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {children}
    </div>
  );
}
