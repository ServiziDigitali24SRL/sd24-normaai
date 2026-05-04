"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/OnboardingStepper";
import { saveOnboarding, ORIGIN_OPTIONS, type Origin } from "@/lib/onboarding-state";

const TOTAL = 3;

export default function MobileOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function next() {
    if (step === 0 && !name.trim()) return;
    if (step === 1 && !origin) return;
    if (step < TOTAL - 1) {
      saveOnboarding({ platform: "mobile", step: step + 1, display_name: name, origin: origin ?? undefined });
      setStep(step + 1);
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    saveOnboarding({ platform: "mobile", step: TOTAL, display_name: name, origin: origin ?? undefined });
    // Redirect to auth (Supabase). Auth picks up onboarding state on signup.
    router.push("/login?next=/mobile");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        display: "flex",
        flexDirection: "column",
        padding: "32px 24px 48px",
        fontFamily: "var(--sans)",
      }}
    >
      <OnboardingStepper current={step} total={TOTAL} />

      {step === 0 && (
        <Step
          title="Come ti chiami?"
          subtitle="Useremo il tuo nome per personalizzare le risposte di Sofia."
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Il tuo nome"
            autoFocus
            style={inputStyle}
          />
        </Step>
      )}

      {step === 1 && (
        <Step
          title={`Piacere ${name.trim() || "te"}, da dove vieni?`}
          subtitle="Adattiamo le risposte al tuo contesto."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ORIGIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrigin(opt.value)}
                style={{
                  ...optionStyle,
                  borderColor: origin === opt.value ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)",
                  background: origin === opt.value ? "var(--vermiglio-tint, #FBE8E4)" : "white",
                }}
              >
                <span style={{ fontSize: 20, marginRight: 12 }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step
          title="Ultimo passo"
          subtitle="Crea il tuo account per salvare le conversazioni."
        >
          <p style={{ fontSize: 14, color: "var(--ink-3)", textAlign: "center", marginTop: 16 }}>
            Procedi alla registrazione…
          </p>
        </Step>
      )}

      <div style={{ marginTop: "auto", paddingTop: 32 }}>
        <button
          onClick={next}
          disabled={
            (step === 0 && !name.trim()) ||
            (step === 1 && !origin) ||
            submitting
          }
          style={primaryButtonStyle}
        >
          {step === TOTAL - 1 ? "Crea account" : "Continua"}
        </button>
      </div>
    </main>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", maxWidth: 480, margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)", margin: "0 0 8px", fontWeight: 500, lineHeight: 1.2 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 28px", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 16,
  fontFamily: "var(--sans)",
  border: "1.5px solid var(--paper-line, #E8E0D2)",
  borderRadius: 6,
  background: "white",
  color: "var(--ink-1)",
  outline: "none",
};

const optionStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  fontSize: 15,
  fontFamily: "var(--sans)",
  border: "1.5px solid var(--paper-line, #E8E0D2)",
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  color: "var(--ink-1)",
  transition: "all 0.15s",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  background: "var(--vermiglio, #C93924)",
  color: "white",
  border: "none",
  borderRadius: 6,
  fontSize: 15,
  fontFamily: "var(--sans)",
  fontWeight: 600,
  cursor: "pointer",
};
