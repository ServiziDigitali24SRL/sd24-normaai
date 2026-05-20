"use client";

/**
 * /mobile/home — home page mobile, voice-primary.
 * ORB grande al centro (state idle), tap → /mobile/voice.
 * Card "Chat" secondario in basso → /mobile/chat.
 * Quota chip in top.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile/shell";
import { MobileOrb } from "@/components/mobile/orb";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING, type OrbColor } from "@/components/mobile/theme";
import { loadDraft } from "../onboarding/draft";

interface QuotaResponse {
  used: number;
  limit: number;
  remaining: number;
}

export default function MobileHomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [orbColor, setOrbColor] = useState<OrbColor>("blu");
  const [quota, setQuota] = useState<QuotaResponse | null>(null);

  useEffect(() => {
    const d = loadDraft();
    setUserName(d.first_name);
    setOrbColor(d.preferred_orb_color);

    fetch("/api/quota/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: QuotaResponse | null) => {
        if (j) setQuota(j);
      })
      .catch(() => {
        /* anon o errore — non bloccante */
      });
  }, []);

  return (
    <MobileShell
      topbar
      topbarRight={
        quota && (
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: MOBILE_COLORS.blueLight,
              color: MOBILE_COLORS.blue,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: MOBILE_FONT.family,
              whiteSpace: "nowrap",
            }}
          >
            {quota.used}/{quota.limit}
          </span>
        )
      }
      userName={userName || undefined}
    >
      {/* Greeting */}
      <div style={{ paddingTop: MOBILE_SPACING.lg, paddingBottom: MOBILE_SPACING.md }}>
        <div style={{ fontSize: MOBILE_FONT.small, color: MOBILE_COLORS.textMuted, fontWeight: 500 }}>
          {greeting()}
        </div>
        <h1
          style={{
            margin: "2px 0 0",
            fontSize: MOBILE_FONT.title1,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: MOBILE_COLORS.text,
          }}
        >
          {userName ? `${userName},` : "Ciao,"} cosa ti serve?
        </h1>
      </div>

      {/* ORB centrale */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: MOBILE_SPACING.lg,
        }}
      >
        <MobileOrb
          color={orbColor}
          state="idle"
          size={260}
          onClick={() => router.push("/mobile/voice")}
          label="Parla con Sofia (voice)"
        />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: MOBILE_FONT.title3,
              fontWeight: 600,
              color: MOBILE_COLORS.text,
              letterSpacing: "-0.01em",
            }}
          >
            Tocca l&apos;Orb per parlare
          </div>
          <div style={{ marginTop: 4, fontSize: MOBILE_FONT.small, color: MOBILE_COLORS.textMuted }}>
            Sofia risponde in italiano con fonti normative
          </div>
        </div>
      </div>

      {/* Chat secondario */}
      <div style={{ padding: `${MOBILE_SPACING.lg}px 0 calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_SPACING.lg}px)` }}>
        <Link
          href="/mobile/chat"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            background: MOBILE_COLORS.surface,
            border: `1px solid ${MOBILE_COLORS.line}`,
            borderRadius: 16,
            textDecoration: "none",
            color: MOBILE_COLORS.text,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: MOBILE_COLORS.orange,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
            aria-hidden
          >
            ✦
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: MOBILE_FONT.bodyLg, fontWeight: 600, lineHeight: 1.2 }}>Chat scritta</div>
            <div style={{ fontSize: MOBILE_FONT.small, color: MOBILE_COLORS.textMuted, marginTop: 2 }}>
              Per chi preferisce scrivere
            </div>
          </div>
          <span style={{ fontSize: 18, color: MOBILE_COLORS.textSoft }} aria-hidden>
            ›
          </span>
        </Link>
      </div>
    </MobileShell>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buonanotte";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}
