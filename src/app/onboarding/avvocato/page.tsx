"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-state";

const SPECIALIZZAZIONI = [
  "Civile", "Penale", "Lavoro", "Tributario", "Famiglia",
  "Immobiliare", "Commerciale", "Amministrativo", "Successioni",
] as const;

export default function LawyerOnboardingPage() {
  const router = useRouter();
  const [pIva, setPIva] = useState("");
  const [foro, setForo] = useState("");
  const [city, setCity] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);

  function toggleSpec(s: string) {
    setSpecs((prev) => {
      if (prev.includes(s)) return prev.filter(x => x !== s);
      if (prev.length >= 3) return prev;
      return [...prev, s];
    });
  }

  function submit() {
    if (!pIva.match(/^\d{11}$/)) return alert("P.IVA non valida (11 cifre).");
    if (!foro.trim() || !city.trim() || specs.length === 0) return;
    saveOnboarding({ p_iva: pIva, foro, city, specializzazioni: specs });
    router.push("/login?next=/avvocato/dashboard");
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
      <div style={{ width: "100%", maxWidth: 600, background: "white", padding: "40px 44px", borderRadius: 8, border: "1px solid var(--paper-line, #E8E0D2)" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink-1)", margin: "0 0 6px", fontWeight: 500 }}>
          Profilo avvocato
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 28px" }}>
          Servono questi dati per validare la tua iscrizione e assegnarti i lead pertinenti.
        </p>

        <Field label="Partita IVA" hint="11 cifre">
          <input value={pIva} onChange={(e) => setPIva(e.target.value)} placeholder="01234567890" style={inputStyle} />
        </Field>

        <Field label="Foro di appartenenza" hint="Es. Roma, Milano, Napoli">
          <input value={foro} onChange={(e) => setForo(e.target.value)} placeholder="Foro di Roma" style={inputStyle} />
        </Field>

        <Field label="Città" hint="Dove ricevi mandato">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Roma" style={inputStyle} />
        </Field>

        <Field label={`Specializzazioni (${specs.length}/3)`} hint="Massimo 3 — i lead vengono filtrati su queste materie">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SPECIALIZZAZIONI.map((s) => {
              const active = specs.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSpec(s)}
                  style={{
                    padding: "8px 14px",
                    border: `1.5px solid ${active ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)"}`,
                    background: active ? "var(--vermiglio-tint, #FBE8E4)" : "white",
                    color: "var(--ink-1)",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Field>

        <button
          onClick={submit}
          disabled={!pIva || !foro || !city || specs.length === 0}
          style={{
            width: "100%",
            padding: "14px",
            background: "var(--vermiglio, #C93924)",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Crea account avvocato
        </button>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-1)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "var(--sans)",
  border: "1.5px solid var(--paper-line, #E8E0D2)",
  borderRadius: 6,
  outline: "none",
  boxSizing: "border-box",
};
