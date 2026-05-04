"use client";

import Link from "next/link";

// Placeholder. Real mobile UI (orb voice + transcript) is rebuilt from the
// claude.ai/design template, not from the legacy MobileOrb / MobileTabBar.

export default function MobileLandingPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--sans)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, color: "var(--ink-1, #1A1714)", margin: "0 0 12px", fontWeight: 500 }}>
        NormaAI
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3, #6B5F55)", margin: "0 0 32px", maxWidth: 320 }}>
        Mobile UI in arrivo nel template di design.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        <Link href="/onboarding/mobile" style={{ padding: "14px", background: "var(--vermiglio, #C93924)", color: "white", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Inizia
        </Link>
      </div>
    </main>
  );
}
