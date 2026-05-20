"use client";

/**
 * /mobile/onboarding/profile — step 3: nome + cognome + CAP autolookup + citizenship.
 * API: GET /api/onboarding/lookup/cap?cap=... (dataset 4243 CAP).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell, MobileScreenHero, MobileBottomBar } from "@/components/mobile/shell";
import { MobileButton } from "@/components/mobile/buttons";
import { MobileInput, MobilePill } from "@/components/mobile/inputs";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "@/components/mobile/theme";
import { loadDraft, saveDraft, type OnboardingDraft } from "../draft";
import { Progress } from "../phone/page";

const CITIZENSHIP_OPTIONS: { value: OnboardingDraft["citizenship_type"]; label: string }[] = [
  { value: "italiano", label: "Italiano/a" },
  { value: "turista", label: "Turista" },
  { value: "straniero_residente", label: "Straniero residente" },
];

export default function MobileOnboardingProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [provincia, setProvincia] = useState("");
  const [regione, setRegione] = useState("");
  const [citizenship, setCitizenship] = useState<OnboardingDraft["citizenship_type"]>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lastLookupRef = useRef<string>("");

  useEffect(() => {
    const d = loadDraft();
    setFirstName(d.first_name);
    setLastName(d.last_name);
    setCap(d.cap);
    setCitta(d.citta);
    setProvincia(d.provincia);
    setRegione(d.regione);
    setCitizenship(d.citizenship_type);
  }, []);

  // Auto-lookup CAP
  useEffect(() => {
    const clean = cap.replace(/\D/g, "");
    if (clean.length !== 5 || clean === lastLookupRef.current) return;
    lastLookupRef.current = clean;
    setLookingUp(true);
    fetch(`/api/onboarding/lookup/cap?cap=${clean}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j))))
      .then((j: { citta: string; provincia: string; regione: string }) => {
        setCitta(j.citta);
        setProvincia(j.provincia);
        setRegione(j.regione);
      })
      .catch(() => {
        // Lookup fail: utente può compilare a mano sotto
      })
      .finally(() => setLookingUp(false));
  }, [cap]);

  const canNext =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    cap.length === 5 &&
    citta.trim().length > 0 &&
    citizenship !== null;

  const goNext = () => {
    saveDraft({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      cap,
      citta,
      provincia,
      regione,
      citizenship_type: citizenship,
    });
    router.push("/mobile/onboarding/prefs");
  };

  return (
    <MobileShell topbar topbarTransparent>
      <Progress step={3} of={4} />

      <MobileScreenHero
        title={
          <>
            <span style={{ color: MOBILE_COLORS.blue }}>Chi sei</span> e dove abiti
          </>
        }
        subtitle="Ci aiuta a indirizzarti norme locali e, se serve, avvocati della zona."
        align="left"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: MOBILE_SPACING.md }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MobileInput
            label="Nome"
            placeholder="Marco"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
          />
          <MobileInput
            label="Cognome"
            placeholder="Rossi"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <MobileInput
          label="CAP"
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="00187"
          value={cap}
          onChange={(e) => setCap(e.target.value.replace(/\D/g, ""))}
          hint={lookingUp ? "Sto cercando..." : "5 cifre"}
        />

        {cap.length === 5 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <MobileInput
              label={`Città${lookingUp ? " (lookup…)" : ""}`}
              placeholder="Roma"
              value={citta}
              onChange={(e) => setCitta(e.target.value)}
            />
            <MobileInput
              label="Prov."
              placeholder="RM"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
            />
          </div>
        )}
        {regione && (
          <div style={{ fontSize: MOBILE_FONT.caption, color: MOBILE_COLORS.textSoft, paddingLeft: 4 }}>
            Regione: <strong style={{ color: MOBILE_COLORS.textMuted }}>{regione}</strong>
          </div>
        )}

        {/* Citizenship */}
        <div style={{ marginTop: MOBILE_SPACING.sm }}>
          <div
            style={{
              fontSize: MOBILE_FONT.small,
              fontWeight: 500,
              color: MOBILE_COLORS.textMuted,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Sei in Italia come...
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CITIZENSHIP_OPTIONS.map((opt) => (
              <MobilePill
                key={opt.value ?? "none"}
                active={citizenship === opt.value}
                onClick={() => setCitizenship(opt.value)}
              >
                {opt.label}
              </MobilePill>
            ))}
          </div>
        </div>
      </div>

      <MobileBottomBar>
        <MobileButton variant="primary" size="lg" full disabled={!canNext} onClick={goNext}>
          Continua
        </MobileButton>
      </MobileBottomBar>
    </MobileShell>
  );
}
