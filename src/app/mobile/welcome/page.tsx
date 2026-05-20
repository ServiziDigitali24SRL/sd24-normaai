"use client";

/**
 * /mobile/welcome — landing page mobile.
 * § logo blu grande, payoff, CTA "Inizia" → /mobile/onboarding/phone.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileButton } from "@/components/mobile/buttons";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "@/components/mobile/theme";

export default function MobileWelcomePage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(180deg, ${MOBILE_COLORS.bg} 0%, ${MOBILE_COLORS.blueLight} 100%)`,
        display: "flex",
        flexDirection: "column",
        padding: `calc(env(safe-area-inset-top, 0px) + ${MOBILE_SPACING.xl}px) ${MOBILE_SPACING.lg}px calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_SPACING.xl}px)`,
        fontFamily: MOBILE_FONT.family,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
        <span style={{ fontSize: 56, lineHeight: 1, color: MOBILE_COLORS.blue, fontWeight: 700 }}>§</span>
        <span style={{ fontSize: MOBILE_FONT.title2, fontWeight: 700, color: MOBILE_COLORS.text, letterSpacing: "-0.02em" }}>
          NormaAI
        </span>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h1
          style={{
            fontSize: MOBILE_FONT.hero,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: MOBILE_COLORS.text,
          }}
        >
          La legge,<br />
          <span style={{ color: MOBILE_COLORS.blue }}>spiegata</span>{" "}
          <span style={{ color: MOBILE_COLORS.orange }}>a voce.</span>
        </h1>
        <p
          style={{
            marginTop: MOBILE_SPACING.md,
            fontSize: MOBILE_FONT.bodyLg,
            color: MOBILE_COLORS.textMuted,
            lineHeight: 1.45,
            maxWidth: 320,
          }}
        >
          Chiedi a Sofia di norme italiane. Risposte con fonti, in italiano corretto,
          24/7. Le prime 10 sono gratis.
        </p>

        {/* Features 3 pill */}
        <div
          style={{
            marginTop: MOBILE_SPACING.xl,
            display: "flex",
            flexDirection: "column",
            gap: MOBILE_SPACING.sm,
          }}
        >
          {[
            { icon: "◉", text: "Voice Sofia in 11 lingue" },
            { icon: "✦", text: "Chat con fonti normative" },
            { icon: "❋", text: "Avvocato verificato all'occorrenza" },
          ].map((f) => (
            <div
              key={f.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: MOBILE_COLORS.surface,
                border: `1px solid ${MOBILE_COLORS.line}`,
                borderRadius: 14,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: MOBILE_COLORS.blueLight,
                  color: MOBILE_COLORS.blue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
                aria-hidden
              >
                {f.icon}
              </span>
              <span style={{ fontSize: MOBILE_FONT.body, color: MOBILE_COLORS.text, fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <MobileButton
          variant="primary"
          size="lg"
          full
          onClick={() => router.push("/mobile/onboarding/phone")}
        >
          Inizia gratis
        </MobileButton>
        <Link
          href="/?desktop=1"
          style={{
            textAlign: "center",
            fontSize: MOBILE_FONT.small,
            color: MOBILE_COLORS.textMuted,
            textDecoration: "none",
            padding: "12px 0",
          }}
        >
          Visualizza versione desktop →
        </Link>
      </div>
    </main>
  );
}
