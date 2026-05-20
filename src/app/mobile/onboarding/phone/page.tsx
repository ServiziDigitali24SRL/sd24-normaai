"use client";

/**
 * /mobile/onboarding/phone — step 1: cellulare + SMS OTP.
 * API: POST /api/auth/otp/send → POST /api/auth/otp/verify.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell, MobileScreenHero, MobileBottomBar } from "@/components/mobile/shell";
import { MobileButton } from "@/components/mobile/buttons";
import { MobileInput, MobileCodeInput } from "@/components/mobile/inputs";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "@/components/mobile/theme";
import { loadDraft, saveDraft, type OnboardingDraft } from "../draft";

export default function MobileOnboardingPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d.phone) setPhone(d.phone);
    if (d.phone_verified) setSent(true);
  }, []);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "signup" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "send_failed");
      saveDraft({ phone: j.phone || phone });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore invio SMS");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (codeValue: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: codeValue }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          j?.error === "invalid_code"
            ? `Codice errato. ${j.attempts_remaining ?? 0} tentativi rimasti.`
            : j?.message || j?.error || "verify_failed"
        );
      }
      saveDraft({ phone_verified: true } as Partial<OnboardingDraft>);
      router.push("/mobile/onboarding/email");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore verifica");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell topbar topbarTransparent>
      <Progress step={1} of={4} />

      <MobileScreenHero
        title={
          <>
            Il tuo <span style={{ color: MOBILE_COLORS.blue }}>cellulare</span>
          </>
        }
        subtitle="Ti mandiamo un codice via SMS per la verifica."
        align="left"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: MOBILE_SPACING.lg }}>
        <MobileInput
          label="Numero di cellulare"
          type="tel"
          inputMode="tel"
          placeholder="+39 333 1234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={sent}
          hint={sent ? "Codice inviato. Cambia numero se serve." : "Formato internazionale con +39"}
          autoFocus={!sent}
        />

        {sent && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: MOBILE_FONT.small,
                color: MOBILE_COLORS.textMuted,
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              Codice ricevuto (6 cifre)
            </label>
            <MobileCodeInput
              value={code}
              onChange={setCode}
              onComplete={verifyOtp}
              autoFocus
            />
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
            disabled={!phone.trim() || busy}
            onClick={sendOtp}
          >
            Invia codice SMS
          </MobileButton>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MobileButton
              variant="primary"
              size="lg"
              full
              loading={busy}
              disabled={code.length !== 6 || busy}
              onClick={() => verifyOtp(code)}
            >
              Verifica codice
            </MobileButton>
            <MobileButton
              variant="link"
              onClick={() => {
                setSent(false);
                setCode("");
                setError(null);
              }}
            >
              Cambia numero
            </MobileButton>
          </div>
        )}
      </MobileBottomBar>
    </MobileShell>
  );
}

export function Progress({ step, of }: { step: number; of: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {Array.from({ length: of }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i + 1 <= step ? MOBILE_COLORS.blue : MOBILE_COLORS.line,
            transition: "background 200ms ease",
          }}
        />
      ))}
    </div>
  );
}
