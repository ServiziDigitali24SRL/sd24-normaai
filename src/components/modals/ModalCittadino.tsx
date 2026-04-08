"use client";

import { useState } from "react";
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

export default function ModalCittadino({ open, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const supabase = createClient();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Email e password sono obbligatorie.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o password non corretti.");
    else onClose();
    setLoading(false);
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Tutti i campi sono obbligatori.");
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
    const consentTimestamp = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
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
    if (error) {
      setError(error.message);
    } else if (data.user) {
      // Piano Privato è gratuito — nessun checkout Stripe
      onClose();
    }
    setLoading(false);
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
            &#10022; Sempre gratuito &middot; Nessun limite di query
          </div>
          <div className="mt-3 flex flex-col gap-[7px]">
            {feats.map((f) => (
              <div key={f} className="flex items-center gap-[7px] text-[12.5px] text-[#999]">
                <CheckIcon />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5">
          <Tabs tabs={["Accedi", "Registrati"]} active={tab} onSwitch={setTab} />
        </div>

        {error && (
          <div className="text-accent text-[12px] mb-2">{error}</div>
        )}

        {tab === 0 ? (
          <div>
            <FormLabel>Email</FormLabel>
            <FormInput type="email" placeholder="nome@email.it" value={email} onChange={setEmail} />
            <FormLabel>Password</FormLabel>
            <FormInput type="password" placeholder="••••••••" value={password} onChange={setPassword} />
            <BtnPrimary onClick={handleLogin}>
              {loading ? "Accesso..." : "Accedi"}
            </BtnPrimary>
            <BtnOutline onClick={() => setTab(1)}>
              Non hai un account? Registrati
            </BtnOutline>
          </div>
        ) : (
          <div>
            <FormLabel>Nome e Cognome</FormLabel>
            <FormInput placeholder="Mario Rossi" value={name} onChange={setName} />
            <FormLabel>Email</FormLabel>
            <FormInput type="email" placeholder="nome@email.it" value={email} onChange={setEmail} />
            <FormLabel>Password</FormLabel>
            <FormInput type="password" placeholder="Crea una password" value={password} onChange={setPassword} />

            {/* GDPR Consents */}
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                  className="mt-[2px] shrink-0 accent-[#E8340A]"
                />
                <span className="text-[11.5px] text-[#666] leading-[1.5]">
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
                <span className="text-[11.5px] text-[#666] leading-[1.5]">
                  Acconsento a ricevere comunicazioni email su novità, aggiornamenti normativi e offerte. (opzionale)
                </span>
              </label>
            </div>

            <BtnPrimary onClick={handleRegister}>
              {loading ? "Registrazione..." : "Crea account gratuito"}
            </BtnPrimary>
            <p className="text-[11px] text-[#444] text-center mt-[10px]">
              Gratis per sempre &mdash; nessuna carta richiesta
            </p>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
