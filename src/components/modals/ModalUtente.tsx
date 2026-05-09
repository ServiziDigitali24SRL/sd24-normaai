"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  FormLabel,
  FormInput,
  BtnPrimary,
  BtnOutline,
  Tabs,
  CheckIcon,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ModalUtente({ open, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Email e password sono obbligatorie.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        if (authErr.message.includes("Email not confirmed")) {
          setError("Email non ancora confermata. Controlla la tua casella.");
        } else if (authErr.message.toLowerCase().includes("rate")) {
          setError("Troppi tentativi. Riprova tra qualche minuto.");
        } else {
          setError("Email o password non corretti.");
        }
      } else {
        onClose();
        router.refresh();
        router.push("/utente/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Inserisci la tua email per ricevere il link di reset.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) setError("Errore nell'invio dell'email. Riprova.");
      else setResetSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!name.trim()) {
      setError("Inserisci il tuo nome.");
      return;
    }
    if (!email.trim()) {
      setError("Inserisci la tua email.");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      setError("Inserisci un'email valida.");
      return;
    }
    if (!password.trim()) {
      setError("Inserisci una password.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (!consentPrivacy) {
      setError("Devi accettare Privacy Policy e Termini per procedere.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const consentTimestamp = new Date().toISOString();
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: "privato",
            consent_privacy_policy: true,
            consent_terms: true,
            consent_marketing: consentMarketing,
            consent_timestamp: consentTimestamp,
          },
        },
      });
      if (err) {
        if (err.message.toLowerCase().includes("rate")) {
          setError("Troppi tentativi. Riprova tra qualche minuto.");
        } else {
          setError(err.message);
        }
      } else if (data.user) {
        // Piano Privato è gratuito — nessun checkout Stripe
        onClose();
        router.refresh();
        router.push("/utente/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  const feats = [
    "Multe e sanzioni",
    "Contratti e accordi",
    "Condominio e vicinato",
    "Diffide, contenziosi e cause",
    "Altro + domande libere",
    "Archivio conversazioni",
  ];

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Accedi come Cittadino</ModalTitle>
        <ModalSub>Gratis per sempre &mdash; nessuna carta richiesta</ModalSub>

        {/* Plan card */}
        <div className="bg-card border border-card-border rounded-xl p-[18px] mt-[14px]">
          <div className="font-serif text-[30px] text-[#1a1a1a]">
            Gratis
          </div>
          <div className="text-[11.5px] text-gold mt-[3px]">
            &#10022; Sempre gratuito &middot; 10 consultazioni al giorno
          </div>
          <div className="mt-3 flex flex-col gap-[7px]">
            {feats.map((f) => (
              <div key={f} className="flex items-center gap-[7px] text-[12.5px] text-[#9A9690]">
                <CheckIcon />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5">
          <Tabs tabs={["Accedi", "Registrati"]} active={tab} onSwitch={(t) => { setTab(t); setError(""); }} />
        </div>

        {error && (
          <div className="text-accent text-[12px] mb-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">{error}</div>
        )}

        {tab === 0 ? (
          <div>
            <FormLabel htmlFor="cittadino-login-email">Email</FormLabel>
            <FormInput id="cittadino-login-email" name="email" type="email" placeholder="nome@email.it" value={email} onChange={setEmail} />
            <FormLabel htmlFor="cittadino-login-password">Password</FormLabel>
            <FormInput id="cittadino-login-password" name="password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
            {resetSent ? (
              <div className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-3">
                Email inviata! Controlla la tua casella e segui il link per reimpostare la password.
              </div>
            ) : (
              <button
                onClick={handleForgotPassword}
                className="text-[11.5px] text-accent hover:underline mt-1 mb-1 block"
                type="button"
                disabled={loading}
              >
                Hai dimenticato la password?
              </button>
            )}
            <BtnPrimary onClick={handleLogin} disabled={loading}>
              {loading ? "Accesso..." : "Accedi"}
            </BtnPrimary>
            <BtnOutline onClick={() => setTab(1)}>
              Non hai un account? Registrati
            </BtnOutline>
          </div>
        ) : (
          <div>
            <FormLabel htmlFor="cittadino-reg-name">Nome e Cognome</FormLabel>
            <FormInput id="cittadino-reg-name" name="name" placeholder="Mario Rossi" value={name} onChange={setName} />
            <FormLabel htmlFor="cittadino-reg-email">Email</FormLabel>
            <FormInput id="cittadino-reg-email" name="email" type="email" placeholder="nome@email.it" value={email} onChange={setEmail} />
            <FormLabel htmlFor="cittadino-reg-password">Password</FormLabel>
            <FormInput id="cittadino-reg-password" name="password" type="password" placeholder="Crea una password" value={password} onChange={setPassword} />

            {/* GDPR Consents */}
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                  className="mt-[2px] shrink-0 accent-[#E8340A]"
                />
                <span className="text-[11.5px] text-[#6B6763] leading-[1.5]">
                  * Ho letto e accetto la{" "}
                  <a href="/privacy" target="_blank" className="text-accent hover:underline">Privacy Policy</a>
                  {" "}e i{" "}
                  <a href="/termini" target="_blank" className="text-accent hover:underline">Termini di Servizio</a>.
                  Acconsento al trattamento dei miei dati personali. (obbligatorio)
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentMarketing}
                  onChange={(e) => setConsentMarketing(e.target.checked)}
                  className="mt-[2px] shrink-0 accent-[#E8340A]"
                />
                <span className="text-[11.5px] text-[#6B6763] leading-[1.5]">
                  Acconsento a ricevere comunicazioni email su novità, aggiornamenti normativi e offerte. (opzionale)
                </span>
              </label>
            </div>

            <BtnPrimary onClick={handleRegister} disabled={loading}>
              {loading ? "Registrazione..." : "Crea account gratuito"}
            </BtnPrimary>
            <p className="text-[11px] text-[#7A766F] text-center mt-[10px]">
              Gratis per sempre &mdash; nessuna carta richiesta
            </p>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
