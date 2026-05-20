"use client";

/**
 * /mobile/onboarding/email — step 2: email + magic link.
 * API: POST /api/auth/magiclink (Supabase Auth admin generateLink).
 * La verifica vera avviene quando l'utente clicca il link in mail —
 * qui proseguiamo senza aspettare (la verifica si completa in background).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell, MobileScreenHero, MobileBottomBar } from "@/components/mobile/shell";
import { MobileButton } from "@/components/mobile/buttons";
import { MobileInput } from "@/components/mobile/inputs";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "@/components/mobile/theme";
import { loadDraft, saveDraft } from "../draft";
import { Progress } from "../phone/page";

export default function MobileOnboardingEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d.email) setEmail(d.email);
    if (d.email_sent) setSent(true);
  }, []);

  const sendMagic = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/magiclink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "magic_send_failed");
      saveDraft({ email, email_sent: true });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore invio link");
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    saveDraft({ email });
    router.push("/mobile/onboarding/profile");
  };

  return (
    <MobileShell topbar topbarTransparent>
      <Progress step={2} of={4} />

      <MobileScreenHero
        title={
          <>
            La tua <span style={{ color: MOBILE_COLORS.blue }}>email</span>
          </>
        }
        subtitle="Niente password. Ti mandiamo un link magico — clicca da quella mail per confermare."
        align="left"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: MOBILE_SPACING.lg }}>
        <MobileInput
          label="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          placeholder="tu@esempio.it"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          autoFocus
        />

        {sent && (
          <div
            style={{
              padding: 14,
              background: MOBILE_COLORS.blueLight,
              borderRadius: 12,
              fontSize: MOBILE_FONT.small,
              color: MOBILE_COLORS.text,
              lineHeight: 1.5,
              border: `1px solid ${MOBILE_COLORS.blue}33`,
            }}
          >
            ✓ Link inviato a <strong>{email}</strong>. Apri la mail e clicca il link per confermare.
            <br />
            Nel frattempo continua l&apos;onboarding qui — la verifica si completa in background.
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: 12,
              background: "#FEF2F2",
              color: MOBILE_COLORS.danger,
              borderRadius: 10,
              fontSize: MOBILE_FONT.small,
              border: `1px solid ${MOBILE_COLORS.danger}33`,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <MobileBottomBar>
        {!sent ? (
          <MobileButton
            variant="primary"
            size="lg"
            full
            loading={busy}
            disabled={!email.includes("@") || busy}
            onClick={sendMagic}
          >
            Invia link magico
          </MobileButton>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MobileButton variant="primary" size="lg" full onClick={goNext}>
              Continua
            </MobileButton>
            <MobileButton variant="link" onClick={sendMagic} disabled={busy}>
              Reinvia il link
            </MobileButton>
          </div>
        )}
      </MobileBottomBar>
    </MobileShell>
  );
}
