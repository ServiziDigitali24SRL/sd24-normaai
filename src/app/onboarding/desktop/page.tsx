"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/OnboardingStepper";
import { saveOnboarding, ORIGIN_OPTIONS, type Origin } from "@/lib/onboarding-state";

const TOTAL = 5;

export default function DesktopOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [job, setJob] = useState("");
  const [isLawyer, setIsLawyer] = useState<boolean | null>(null);

  function next() {
    if (step === 0 && !name.trim()) return;
    if (step === 1 && !origin) return;
    if (step === 2 && !job.trim()) return;
    if (step === 3 && isLawyer === null) return;

    saveOnboarding({
      platform: "desktop",
      step: step + 1,
      display_name: name,
      origin: origin ?? undefined,
      job_title: job,
      is_lawyer: isLawyer ?? undefined,
    });

    if (step < TOTAL - 1) setStep(step + 1);
    else finish();
  }

  function finish() {
    if (isLawyer) {
      router.push("/onboarding/avvocato");   // extra step
    } else {
      router.push("/login?next=/");
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--sans)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "white",
          padding: "40px 44px 32px",
          borderRadius: 8,
          border: "1px solid var(--paper-line, #E8E0D2)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <OnboardingStepper current={step} total={TOTAL} />

        {step === 0 && (
          <Step title="Benvenuto in NormaAI" subtitle="Iniziamo: come ti chiami?">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Il tuo nome" style={inputStyle} />
          </Step>
        )}

        {step === 1 && (
          <Step title="Da dove vieni?" subtitle="Adattiamo le risposte al tuo contesto.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {ORIGIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOrigin(opt.value)}
                  style={{
                    ...optionStyle,
                    borderColor: origin === opt.value ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)",
                    background: origin === opt.value ? "var(--vermiglio-tint, #FBE8E4)" : "white",
                    flexDirection: "column",
                    padding: "18px 12px",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                  <span style={{ marginTop: 8, fontSize: 13 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Che lavoro fai?" subtitle="Una riga libera, ci aiuta a profilare le risposte.">
            <input value={job} onChange={(e) => setJob(e.target.value)} autoFocus placeholder="es. Architetto, Studente, Imprenditore…" style={inputStyle} />
          </Step>
        )}

        {step === 3 && (
          <Step title="Sei un avvocato?" subtitle="Se sì, ti diamo accesso al marketplace lead.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setIsLawyer(false)}
                style={{
                  ...optionStyle,
                  borderColor: isLawyer === false ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)",
                  background: isLawyer === false ? "var(--vermiglio-tint, #FBE8E4)" : "white",
                  padding: "20px",
                }}
              >
                <span style={{ fontSize: 24 }}>👤</span>
                <span style={{ marginLeft: 12, fontSize: 14 }}>No, sono un utente</span>
              </button>
              <button
                onClick={() => setIsLawyer(true)}
                style={{
                  ...optionStyle,
                  borderColor: isLawyer === true ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)",
                  background: isLawyer === true ? "var(--vermiglio-tint, #FBE8E4)" : "white",
                  padding: "20px",
                }}
              >
                <span style={{ fontSize: 24 }}>⚖️</span>
                <span style={{ marginLeft: 12, fontSize: 14 }}>Sì, sono avvocato</span>
              </button>
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="Ultimo passo" subtitle="Crea il tuo account.">
            <p style={{ fontSize: 14, color: "var(--ink-3)", textAlign: "center", marginTop: 16 }}>
              Procedi alla registrazione per iniziare.
            </p>
          </Step>
        )}

        <button
          onClick={next}
          disabled={
            (step === 0 && !name.trim()) ||
            (step === 1 && !origin) ||
            (step === 2 && !job.trim()) ||
            (step === 3 && isLawyer === null)
          }
          style={{ ...primaryButtonStyle, marginTop: 28 }}
        >
          {step === TOTAL - 1 ? "Crea account" : "Continua"}
        </button>
      </div>
    </main>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink-1)", margin: "0 0 6px", fontWeight: 500, lineHeight: 1.25 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 24px", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {children}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  fontSize: 15,
  fontFamily: "var(--sans)",
  border: "1.5px solid var(--paper-line, #E8E0D2)",
  borderRadius: 6,
  background: "white",
  color: "var(--ink-1)",
  outline: "none",
  boxSizing: "border-box",
};

const optionStyle: React.CSSProperties = {
  border: "1.5px solid var(--paper-line, #E8E0D2)",
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  color: "var(--ink-1)",
  fontFamily: "var(--sans)",
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
