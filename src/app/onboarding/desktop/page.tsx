"use client";

// /onboarding/desktop — popup paper/ink editorial 6-step
//
// Step 1. Nome + Cognome
// Step 2. Cellulare → SMS OTP (Twilio)
// Step 3. Email → magic link (Supabase Auth)
// Step 4. CAP autocomplete → città/provincia/regione
// Step 5. Tipo cittadino + lingua sito + lingua voice + colore ORB + checkbox avvocato
// Step 6. (condizionale se avvocato) P.IVA + Foro + Iscrizione albo → /api/lawyer/verify
//
// API usate (tutte già pronte):
//   POST /api/auth/otp/send   {phone}
//   POST /api/auth/otp/verify {phone, code}
//   POST /api/auth/magiclink  {email}
//   GET  /api/onboarding/lookup/cap?cap=...
//   POST /api/onboarding/finalize {first_name,last_name,phone,email,cap,...}
//   POST /api/lawyer/verify   {piva, foro, iscrizione_num}
//
// La pagina è visualmente un modal (overlay dim + card centrata). Su success
// finale redirect a /dashboard (o ?next= dal querystring).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StepId = "name" | "phone" | "email" | "cap" | "prefs" | "lawyer" | "done";

interface OnboardingData {
  first_name: string;
  last_name: string;
  phone: string;
  phone_verified: boolean;
  email: string;
  email_sent: boolean;
  cap: string;
  citta: string;
  provincia: string;
  regione: string;
  citizenship_type: "italiano" | "turista" | "straniero_residente" | null;
  preferred_lang: "it" | "en";
  preferred_voice_lang: string;
  preferred_orb_color: "vermiglio" | "alloro" | "ambra" | "blu";
  is_lawyer: boolean;
  // Lawyer extra
  p_iva: string;
  foro: string;
  iscrizione_num: string;
}

const EMPTY: OnboardingData = {
  first_name: "", last_name: "",
  phone: "", phone_verified: false,
  email: "", email_sent: false,
  cap: "", citta: "", provincia: "", regione: "",
  citizenship_type: null,
  preferred_lang: "it",
  preferred_voice_lang: "it",
  preferred_orb_color: "vermiglio",
  is_lawyer: false,
  p_iva: "", foro: "", iscrizione_num: "",
};

const ORB_COLORS = [
  { v: "vermiglio", label: "Vermiglio", hex: "#c64227" },
  { v: "alloro",    label: "Alloro",    hex: "#5a7a3a" },
  { v: "ambra",     label: "Ambra",     hex: "#d97706" },
  { v: "blu",       label: "Blu",       hex: "#2563EB" },
] as const;

const VOICE_LANGS = [
  { v: "it", label: "Italiano" }, { v: "en", label: "English" }, { v: "es", label: "Español" },
  { v: "ar", label: "العربية" }, { v: "ro", label: "Română" }, { v: "zh", label: "中文" },
  { v: "uk", label: "Українська" }, { v: "bn", label: "বাংলা" }, { v: "de", label: "Deutsch" },
  { v: "fr", label: "Français" }, { v: "ja", label: "日本語" },
];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [step, setStep] = useState<StepId>("name");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistenza locale tra refresh (resilient — non distruggiamo dati su F5)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("normaai:onboarding-v2");
      if (raw) {
        const parsed = JSON.parse(raw) as OnboardingData;
        setData(d => ({ ...d, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("normaai:onboarding-v2", JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  const update = (patch: Partial<OnboardingData>) => setData(d => ({ ...d, ...patch }));

  // Lo step "lawyer" è condizionale: se is_lawyer === false saltiamo a "done".
  const goNext = () => {
    setError(null);
    if (step === "name") setStep("phone");
    else if (step === "phone") setStep("email");
    else if (step === "email") setStep("cap");
    else if (step === "cap") setStep("prefs");
    else if (step === "prefs") setStep(data.is_lawyer ? "lawyer" : "done");
    else if (step === "lawyer") setStep("done");
  };

  const goPrev = () => {
    setError(null);
    if (step === "phone") setStep("name");
    else if (step === "email") setStep("phone");
    else if (step === "cap") setStep("email");
    else if (step === "prefs") setStep("cap");
    else if (step === "lawyer") setStep("prefs");
    else if (step === "done") setStep(data.is_lawyer ? "lawyer" : "prefs");
  };

  // Finalize: POST /api/onboarding/finalize → crea Supabase user + profile.
  const finalize = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email,
          cap: data.cap,
          citta: data.citta,
          regione: data.regione,
          citizenship_type: data.citizenship_type,
          preferred_lang: data.preferred_lang,
          preferred_voice_lang: data.preferred_voice_lang,
          preferred_orb_color: data.preferred_orb_color,
          is_lawyer: data.is_lawyer,
          p_iva: data.is_lawyer ? data.p_iva : undefined,
          foro: data.is_lawyer ? data.foro : undefined,
          iscrizione_num: data.is_lawyer ? data.iscrizione_num : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "finalize_failed");
      }
      try { localStorage.removeItem("normaai:onboarding-v2"); } catch { /* ignore */ }
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
      setBusy(false);
    }
  };

  const totalSteps = data.is_lawyer ? 6 : 5;
  const stepNum = step === "name" ? 1 : step === "phone" ? 2 : step === "email" ? 3 : step === "cap" ? 4 : step === "prefs" ? 5 : step === "lawyer" ? 6 : 6;

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <header style={hdr}>
          <span style={brand}>
            <span style={{ color: "var(--vermiglio, #c64227)", fontStyle: "italic", fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 24 }}>§</span>
            <span style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 17, marginLeft: 6, letterSpacing: "-0.01em" }}>NormaAI</span>
          </span>
          <div style={progress}>
            <span style={progressLabel}>Step {stepNum} / {totalSteps}</span>
            <div style={progressBar}>
              <div style={{ ...progressFill, width: `${(stepNum / totalSteps) * 100}%` }} />
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={body}>
          {step === "name" && (
            <StepCard title="Come ti chiami?" subtitle="Iniziamo dalle cose semplici.">
              <Row>
                <Field label="Nome">
                  <input autoFocus value={data.first_name} onChange={e => update({ first_name: e.target.value })} style={inp} />
                </Field>
                <Field label="Cognome">
                  <input value={data.last_name} onChange={e => update({ last_name: e.target.value })} style={inp} />
                </Field>
              </Row>
              <NextBtn disabled={!data.first_name.trim() || !data.last_name.trim()} onClick={goNext} />
            </StepCard>
          )}

          {step === "phone" && (
            <PhoneStep data={data} update={update} onNext={goNext} onBack={goPrev} setError={setError} />
          )}

          {step === "email" && (
            <EmailStep data={data} update={update} onNext={goNext} onBack={goPrev} setError={setError} />
          )}

          {step === "cap" && (
            <CapStep data={data} update={update} onNext={goNext} onBack={goPrev} setError={setError} />
          )}

          {step === "prefs" && (
            <PrefsStep data={data} update={update} onNext={goNext} onBack={goPrev} />
          )}

          {step === "lawyer" && (
            <LawyerStep data={data} update={update} onNext={goNext} onBack={goPrev} setError={setError} />
          )}

          {step === "done" && (
            <StepCard title="Tutto pronto." subtitle="Confermi e creiamo il tuo account.">
              <Summary data={data} />
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={goPrev} style={btnGhost}>Indietro</button>
                <button onClick={finalize} disabled={busy} style={{ ...btnPrimary, flex: 1, opacity: busy ? 0.6 : 1 }}>
                  {busy ? "Creo l'account…" : "Conferma e accedi"}
                </button>
              </div>
            </StepCard>
          )}

          {error && <div style={errBox}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Step components ─────────────────────────────────────────────────────────
function PhoneStep({ data, update, onNext, onBack, setError }: {
  data: OnboardingData; update: (p: Partial<OnboardingData>) => void;
  onNext: () => void; onBack: () => void; setError: (s: string | null) => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async () => {
    setSending(true); setError(null);
    try {
      const r = await fetch("/api/auth/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, purpose: "signup" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "send_failed");
      }
      const j = await r.json();
      update({ phone: j.phone });
      setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore invio SMS"); }
    finally { setSending(false); }
  };

  const verifyOtp = async () => {
    setVerifying(true); setError(null);
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, code }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error === "invalid_code" ? `Codice errato. ${j.attempts_remaining ?? 0} tentativi rimasti.`
                      : j?.message || j?.error || "verify_failed");
      }
      update({ phone_verified: true });
      onNext();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore verifica"); }
    finally { setVerifying(false); }
  };

  return (
    <StepCard title="Il tuo cellulare" subtitle="Per la verifica di sicurezza. Ti invieremo un codice via SMS.">
      <Field label="Cellulare (formato +39…)">
        <input
          autoFocus placeholder="+39 333 1234567"
          value={data.phone} onChange={e => update({ phone: e.target.value })}
          disabled={sent}
          style={{ ...inp, opacity: sent ? 0.6 : 1 }}
        />
      </Field>
      {!sent ? (
        <div style={btnRow}>
          <button onClick={onBack} style={btnGhost}>Indietro</button>
          <button onClick={sendOtp} disabled={!data.phone.trim() || sending} style={{ ...btnPrimary, flex: 1, opacity: sending ? 0.6 : 1 }}>
            {sending ? "Invio SMS…" : "Invia il codice"}
          </button>
        </div>
      ) : (
        <>
          <Field label="Codice ricevuto via SMS (6 cifre)">
            <input
              autoFocus inputMode="numeric" maxLength={6} placeholder="123456"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              style={{ ...inp, letterSpacing: "0.25em", textAlign: "center", fontSize: 18, fontWeight: 500 }}
            />
          </Field>
          <div style={btnRow}>
            <button onClick={() => { setSent(false); setCode(""); }} style={btnGhost}>Cambia numero</button>
            <button onClick={verifyOtp} disabled={code.length !== 6 || verifying} style={{ ...btnPrimary, flex: 1, opacity: verifying ? 0.6 : 1 }}>
              {verifying ? "Verifico…" : "Verifica"}
            </button>
          </div>
          <p style={muted}>Non hai ricevuto l&apos;SMS? <button onClick={sendOtp} style={linkBtn}>Reinvia</button></p>
        </>
      )}
    </StepCard>
  );
}

function EmailStep({ data, update, onNext, onBack, setError }: {
  data: OnboardingData; update: (p: Partial<OnboardingData>) => void;
  onNext: () => void; onBack: () => void; setError: (s: string | null) => void;
}) {
  const [sending, setSending] = useState(false);

  const sendMagic = async () => {
    setSending(true); setError(null);
    try {
      const r = await fetch("/api/auth/magiclink", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, purpose: "signup" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "magic_send_failed");
      }
      update({ email_sent: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Errore invio magic link"); }
    finally { setSending(false); }
  };

  return (
    <StepCard title="La tua email" subtitle="Ti inviamo un link magico — clicca dalla mail per confermarla. Non chiediamo password.">
      <Field label="Email">
        <input
          autoFocus type="email" placeholder="tu@esempio.it"
          value={data.email} onChange={e => update({ email: e.target.value.toLowerCase() })}
          style={inp}
        />
      </Field>

      {data.email_sent && (
        <div style={{ marginTop: 4, padding: 12, background: "#fafaf8", border: "1px dashed var(--paper-line, #d6d3cd)", borderRadius: 6, fontSize: 12.5, lineHeight: 1.55 }}>
          ✓ Link inviato a <strong>{data.email}</strong>. Apri la mail e clicca il link per verificarla.
          Nel frattempo puoi continuare l&apos;onboarding qui — la verifica email si completa in background.
        </div>
      )}

      <div style={btnRow}>
        <button onClick={onBack} style={btnGhost}>Indietro</button>
        {!data.email_sent ? (
          <button onClick={sendMagic} disabled={!data.email.includes("@") || sending} style={{ ...btnPrimary, flex: 1, opacity: sending ? 0.6 : 1 }}>
            {sending ? "Invio link…" : "Invia il link magico"}
          </button>
        ) : (
          <button onClick={onNext} style={{ ...btnPrimary, flex: 1 }}>Continua</button>
        )}
      </div>
    </StepCard>
  );
}

function CapStep({ data, update, onNext, onBack, setError }: {
  data: OnboardingData; update: (p: Partial<OnboardingData>) => void;
  onNext: () => void; onBack: () => void; setError: (s: string | null) => void;
}) {
  const [lookingUp, setLookingUp] = useState(false);
  const lastLookupRef = useRef<string>("");

  // Auto-lookup quando CAP arriva a 5 cifre
  useEffect(() => {
    const clean = data.cap.replace(/\D/g, "");
    if (clean.length !== 5 || clean === lastLookupRef.current) return;
    lastLookupRef.current = clean;
    setLookingUp(true); setError(null);
    fetch(`/api/onboarding/lookup/cap?cap=${clean}`)
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)))
      .then(j => update({ citta: j.citta, provincia: j.provincia, regione: j.regione }))
      .catch(() => {
        // Lookup fail → l'utente compila a mano sotto. Non bloccante.
        update({ citta: "", provincia: "", regione: "" });
      })
      .finally(() => setLookingUp(false));
  }, [data.cap, setError, update]);

  const canNext = data.cap.trim().length === 5 && data.citta.trim().length > 0;

  return (
    <StepCard title="Dove abiti?" subtitle="Ci aiuta a indirizzarti normative locali e, se chiedi un parere, avvocati della zona.">
      <Row>
        <Field label="CAP">
          <input
            autoFocus inputMode="numeric" maxLength={5} placeholder="00187"
            value={data.cap} onChange={e => update({ cap: e.target.value.replace(/\D/g, "") })}
            style={inp}
          />
        </Field>
        <Field label={lookingUp ? "Città (lookup…)" : "Città"}>
          <input value={data.citta} onChange={e => update({ citta: e.target.value })} style={inp} />
        </Field>
      </Row>
      <Row>
        <Field label="Provincia (sigla)">
          <input value={data.provincia} onChange={e => update({ provincia: e.target.value.toUpperCase().slice(0, 2) })} style={inp} />
        </Field>
        <Field label="Regione">
          <input value={data.regione} onChange={e => update({ regione: e.target.value })} style={inp} />
        </Field>
      </Row>
      <div style={btnRow}>
        <button onClick={onBack} style={btnGhost}>Indietro</button>
        <button onClick={onNext} disabled={!canNext} style={{ ...btnPrimary, flex: 1 }}>Continua</button>
      </div>
    </StepCard>
  );
}

function PrefsStep({ data, update, onNext, onBack }: {
  data: OnboardingData; update: (p: Partial<OnboardingData>) => void;
  onNext: () => void; onBack: () => void;
}) {
  const canNext = data.citizenship_type !== null;

  return (
    <StepCard title="Le tue preferenze" subtitle="Personalizzi adesso, modifichi quando vuoi da Impostazioni.">
      <Field label="Sei in Italia come...">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { v: "italiano", label: "Italiano/a" },
            { v: "turista", label: "Turista" },
            { v: "straniero_residente", label: "Straniero residente" },
          ].map(opt => (
            <button
              key={opt.v} type="button"
              onClick={() => update({ citizenship_type: opt.v as OnboardingData["citizenship_type"] })}
              style={{
                ...pillBtn,
                ...(data.citizenship_type === opt.v ? pillBtnActive : null),
              }}
            >{opt.label}</button>
          ))}
        </div>
      </Field>

      <Row>
        <Field label="Lingua del sito">
          <select value={data.preferred_lang} onChange={e => update({ preferred_lang: e.target.value as "it" | "en" })} style={inp}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Lingua per la voce (Sofia)">
          <select value={data.preferred_voice_lang} onChange={e => update({ preferred_voice_lang: e.target.value })} style={inp}>
            {VOICE_LANGS.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
          </select>
        </Field>
      </Row>

      <Field label="Colore della tua ORB (Sofia voice)">
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {ORB_COLORS.map(c => {
            const active = data.preferred_orb_color === c.v;
            return (
              <button
                key={c.v} type="button"
                onClick={() => update({ preferred_orb_color: c.v as OnboardingData["preferred_orb_color"] })}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "10px 14px", border: active ? "1.5px solid var(--ink, #13110F)" : "1px solid var(--paper-line, #d6d3cd)",
                  borderRadius: 8, background: active ? "white" : "transparent", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: `radial-gradient(circle at 30% 30%, ${c.hex} 0%, ${c.hex}aa 60%, ${c.hex}33 100%)`,
                  boxShadow: `0 0 10px ${c.hex}55`,
                }} />
                <span style={{ fontSize: 10.5, color: "var(--ink-2, #2b2724)" }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="">
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", background: "#fafaf8", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 6 }}>
          <input
            type="checkbox" checked={data.is_lawyer}
            onChange={e => update({ is_lawyer: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13.5 }}>Sono un avvocato</span>
          <span style={{ fontSize: 11.5, opacity: 0.6, marginLeft: "auto" }}>(serve verifica iscrizione)</span>
        </label>
      </Field>

      <div style={btnRow}>
        <button onClick={onBack} style={btnGhost}>Indietro</button>
        <button onClick={onNext} disabled={!canNext} style={{ ...btnPrimary, flex: 1 }}>Continua</button>
      </div>
    </StepCard>
  );
}

function LawyerStep({ data, update, onNext, onBack, setError }: {
  data: OnboardingData; update: (p: Partial<OnboardingData>) => void;
  onNext: () => void; onBack: () => void; setError: (s: string | null) => void;
}) {
  const [verifying, setVerifying] = useState(false);

  const triggerVerify = async () => {
    // Verifica reale parte solo dopo finalize (quando l'utente esiste). Qui
    // facciamo solo validazione locale dei campi obbligatori.
    const pivaClean = data.p_iva.replace(/\D/g, "");
    if (pivaClean.length !== 11) {
      setError("P.IVA non valida (11 cifre).");
      return;
    }
    if (!data.foro.trim()) {
      setError("Indica il foro di iscrizione.");
      return;
    }
    setVerifying(true);
    onNext(); // Vai a "done" — la verifica reale parte server-side in /api/onboarding/finalize
    setVerifying(false);
  };

  return (
    <StepCard title="Iscrizione all'albo" subtitle="Compila per essere abilitato/a all'acquisto di lead nel marketplace.">
      <Field label="P.IVA dello studio (11 cifre)">
        <input
          autoFocus inputMode="numeric" maxLength={11} placeholder="01234567890"
          value={data.p_iva} onChange={e => update({ p_iva: e.target.value.replace(/\D/g, "") })}
          style={inp}
        />
      </Field>
      <Row>
        <Field label="Foro di iscrizione">
          <input placeholder="es. Milano" value={data.foro} onChange={e => update({ foro: e.target.value })} style={inp} />
        </Field>
        <Field label="Numero di iscrizione (opzionale)">
          <input placeholder="es. A12345" value={data.iscrizione_num} onChange={e => update({ iscrizione_num: e.target.value })} style={inp} />
        </Field>
      </Row>

      <div style={{ marginTop: 4, padding: 12, background: "#fafaf8", border: "1px dashed var(--paper-line, #d6d3cd)", borderRadius: 6, fontSize: 12.5, lineHeight: 1.55 }}>
        <strong>Come funziona la verifica:</strong> al momento dell&apos;onboarding ti diamo accesso al marketplace per consultare i lead. Per <em>ricaricare il wallet e acquistare lead</em> sarà necessaria una verifica completa dell&apos;iscrizione tramite registro ufficiale (entro 24h dalla prima ricarica).
      </div>

      <div style={btnRow}>
        <button onClick={onBack} style={btnGhost}>Indietro</button>
        <button onClick={triggerVerify} disabled={verifying} style={{ ...btnPrimary, flex: 1, opacity: verifying ? 0.6 : 1 }}>
          {verifying ? "Verifico…" : "Continua"}
        </button>
      </div>
    </StepCard>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Summary({ data }: { data: OnboardingData }) {
  const orbHex = useMemo(() => ORB_COLORS.find(c => c.v === data.preferred_orb_color)?.hex ?? "#c64227", [data.preferred_orb_color]);
  return (
    <div style={{ background: "#fafaf8", border: "1px solid var(--paper-line, #e8e6e0)", borderRadius: 8, padding: 16, fontSize: 13.5 }}>
      <SummaryLine k="Nome" v={`${data.first_name} ${data.last_name}`} />
      <SummaryLine k="Cellulare" v={`${data.phone} ${data.phone_verified ? "✓" : ""}`} />
      <SummaryLine k="Email" v={data.email} />
      <SummaryLine k="Residenza" v={`${data.citta || "—"} (${data.provincia}) · ${data.cap}`} />
      <SummaryLine k="Tipo" v={data.citizenship_type ?? "—"} />
      <SummaryLine k="Lingue" v={`Sito ${data.preferred_lang.toUpperCase()} · Voce ${data.preferred_voice_lang.toUpperCase()}`} />
      <SummaryLine k="ORB" v={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: orbHex, boxShadow: `0 0 6px ${orbHex}66` }} />
        {data.preferred_orb_color}
      </span>} />
      {data.is_lawyer && (
        <SummaryLine k="Avvocato" v={`P.IVA ${data.p_iva} · Foro ${data.foro}`} />
      )}
    </div>
  );
}
function SummaryLine({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "5px 0", borderBottom: "1px dashed #eae6df", fontSize: 12.5 }}>
      <span style={{ width: 92, fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-4, #6b665f)", paddingTop: 2 }}>{k}</span>
      <span style={{ flex: 1 }}>{v}</span>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 28, margin: 0, marginBottom: 4, letterSpacing: "-0.01em" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13.5, opacity: 0.7, marginTop: 4, marginBottom: 22 }}>{subtitle}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}
function NextBtn({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <div style={btnRow}>
      <button onClick={onClick} disabled={disabled} style={{ ...btnPrimary, flex: 1, opacity: disabled ? 0.5 : 1 }}>Continua</button>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <span style={{ fontSize: 11, opacity: 0.65, fontFamily: "var(--mono, ui-monospace, monospace)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>}
      {children}
    </label>
  );
}

export default function OnboardingDesktop() {
  return (
    <Suspense fallback={<div style={overlay}><div style={modal}>Caricamento…</div></div>}>
      <Inner />
    </Suspense>
  );
}

// ─── Styles (paper/ink editorial popup) ─────────────────────────────────────
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(19, 17, 15, 0.55)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  display: "flex", justifyContent: "center", alignItems: "flex-start",
  paddingTop: "8vh", paddingLeft: 20, paddingRight: 20, paddingBottom: 20,
  zIndex: 1000,
  fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)",
  color: "var(--ink, #13110F)",
};
const modal: React.CSSProperties = {
  width: "100%", maxWidth: 620, maxHeight: "84vh",
  background: "var(--paper, #F6F2EA)",
  border: "1px solid var(--paper-line, #e8e6e0)",
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
  overflow: "auto",
};
const hdr: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "18px 28px", borderBottom: "1px solid var(--paper-line, #e8e6e0)",
};
const brand: React.CSSProperties = { display: "flex", alignItems: "baseline" };
const progress: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 140 };
const progressLabel: React.CSSProperties = { fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.55 };
const progressBar: React.CSSProperties = { width: 140, height: 3, background: "var(--paper-line, #e8e6e0)", borderRadius: 2, overflow: "hidden" };
const progressFill: React.CSSProperties = { height: "100%", background: "var(--vermiglio, #c64227)", transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)" };
const body: React.CSSProperties = { padding: "28px 32px 32px" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { background: "var(--ink, #13110F)", color: "var(--paper, #F6F2EA)", border: "none", borderRadius: 6, padding: "11px 22px", fontSize: 14, fontFamily: "inherit", fontWeight: 500, cursor: "pointer", letterSpacing: "0.005em" };
const btnGhost: React.CSSProperties = { background: "transparent", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 6, padding: "11px 18px", fontSize: 13.5, fontFamily: "inherit", color: "var(--ink-2, #2b2724)", cursor: "pointer" };
const btnRow: React.CSSProperties = { display: "flex", gap: 10, marginTop: 14 };
const pillBtn: React.CSSProperties = { padding: "8px 14px", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 999, background: "white", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "var(--ink-2, #2b2724)" };
const pillBtnActive: React.CSSProperties = { background: "var(--ink, #13110F)", color: "var(--paper, #F6F2EA)", borderColor: "var(--ink, #13110F)" };
const errBox: React.CSSProperties = { marginTop: 16, padding: 11, background: "#fdf2f2", color: "#9b1c1c", borderRadius: 6, fontSize: 12.5 };
const muted: React.CSSProperties = { fontSize: 12, color: "var(--ink-4, #6b665f)", marginTop: 8 };
const linkBtn: React.CSSProperties = { background: "transparent", border: "none", color: "var(--vermiglio, #c64227)", textDecoration: "underline", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12 };
