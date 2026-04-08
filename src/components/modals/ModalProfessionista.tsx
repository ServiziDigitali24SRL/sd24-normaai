"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, {
  ModalClose,
  FormLabel,
  FormInput,
  BtnPrimary,
  BtnOutline,
  Tabs,
} from "../ModalOverlay";
import { PROFS, type ProfId } from "@/lib/professionals";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROF_LIST: { id: ProfId; span2?: boolean }[] = [
  { id: "avvocato" },
  { id: "commercialista" },
  { id: "lavoro" },
  { id: "tecnico" },
  { id: "finanziario", span2: true },
];

export default function ModalProfessionista({ open, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<ProfId | null>(null);
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ordine, setOrdine] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentLeadMarketplace, setConsentLeadMarketplace] = useState(false);
  const supabase = createClient();

  function reset() {
    setStep(1);
    setSelected(null);
    setTab(0);
    setEmail("");
    setPassword("");
    setName("");
    setOrdine("");
    setError("");
    setConsentPrivacy(false);
    setConsentMarketing(false);
    setConsentLeadMarketplace(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Email e password sono obbligatorie.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o password non corretti.");
    else handleClose();
    setLoading(false);
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Nome, email e password sono obbligatori.");
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
    if (!consentLeadMarketplace) {
      setError("Devi accettare il trattamento dati per il marketplace lead.");
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
          role: "professionista",
          categoria: selected,
          ordine,
          consent_privacy_policy: true,
          consent_terms: true,
          consent_marketing: consentMarketing,
          consent_lead_marketplace: consentLeadMarketplace,
          consent_timestamp: consentTimestamp,
        },
      },
    });
    if (error) {
      setError(error.message);
    } else if (data.user) {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "professionista",
          userId: data.user.id,
          email,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else handleClose();
    }
    setLoading(false);
  }

  const prof = selected ? PROFS[selected] : null;

  return (
    <ModalOverlay open={open} onClose={handleClose} wide>
      <ModalClose onClose={handleClose} />

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#1e1e1e] sticky top-0 bg-[#131313] z-10">
        <div className="font-serif text-[22px] mb-[3px]">
          Accedi come Professionista
        </div>
        <div className="text-[12.5px] text-[#555]">
          &euro;29/mese &middot; 14 giorni gratuiti &middot; Ricevi lead qualificati
        </div>

        {/* Step dots */}
        <div className="flex items-center mt-[14px]">
          <StepDot n={1} current={step} label="Categoria" />
          <StepLine done={step > 1} />
          <StepDot n={2} current={step} label="Piano" />
          <StepLine done={step > 2} />
          <StepDot n={3} current={step} label="Accedi" />
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-180px)]">
        {/* STEP 1 — Category selection */}
        {step === 1 && (
          <div>
            <div className="text-[13px] text-[#666] mb-4">
              Seleziona la tua categoria professionale
            </div>
            <div className="grid grid-cols-2 gap-[10px] mb-1">
              {PROF_LIST.map(({ id, span2 }) => {
                const p = PROFS[id];
                return (
                  <button
                    key={id}
                    onClick={() => setSelected(id)}
                    className={`bg-card border-[1.5px] rounded-[14px] p-[18px] px-4 cursor-pointer transition-all duration-150 text-left hover:border-[#444] hover:bg-[#1e1e1e] ${
                      selected === id
                        ? "!border-accent !bg-[#E8340A0c]"
                        : "border-[#252525]"
                    } ${span2 ? "col-span-2" : ""}`}
                  >
                    <div className="text-[14px] font-medium mb-[3px] text-cream">
                      {p.name}
                    </div>
                    <div className="text-[11.5px] text-[#aaa] leading-[1.4] mt-1">
                      {p.desc}
                    </div>
                    <div className="inline-flex items-center text-[10px] mt-2 text-accent bg-[#E8340A10] border border-[#E8340A25] px-[7px] py-[2px] rounded-full">
                      {p.opp}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!selected}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-[10px] text-[14px] font-medium border-none cursor-pointer transition-all duration-150 bg-accent text-white hover:bg-accent-hover mt-4 disabled:bg-[#2a2a2a] disabled:text-[#555] disabled:cursor-not-allowed"
            >
              Continua &rarr;
            </button>
          </div>
        )}

        {/* STEP 2 — Plan & Features */}
        {step === 2 && prof && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="bg-transparent border-none text-[#555] text-[13px] cursor-pointer mb-4 flex items-center gap-[5px] p-0 hover:text-[#aaa]"
            >
              &larr; Cambia categoria
            </button>

            {/* Category badge */}
            <div className="flex items-center gap-[10px] mb-[18px] p-[14px] bg-card rounded-xl border border-[#E8340A30]">
              <span className="text-[26px]">{prof.icon}</span>
              <div>
                <div className="text-[15px] font-medium">{prof.name}</div>
                <div className="text-[12px] text-[#666] mt-[2px]">
                  Piano Professionista &mdash; tutto incluso
                </div>
              </div>
            </div>

            {/* Price row */}
            <div className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-[14px] px-4 mb-4">
              <div className="font-serif text-[28px]">
                <sup className="text-[14px] font-sans">&euro;</sup>29
                <sub className="text-[13px] font-sans text-[#555]">/mese</sub>
              </div>
              <div className="w-px h-10 bg-[#252525]" />
              <div className="flex-1">
                <div className="text-[12px] text-gold mb-[6px]">
                  &#10022; 14 giorni gratuiti
                </div>
                <div className="flex gap-2 flex-wrap">
                  <LeadPill value="€75" label="Lead Privato" />
                  <LeadPill value="€150" label="Lead Impresa" />
                </div>
                <div className="text-[10.5px] text-[#555] mt-1">Scalati dal wallet · crediti senza scadenza</div>
              </div>
            </div>

            {/* Live features */}
            <SectionTitle
              dot="bg-[#22c55e]"
              label="Attivo al lancio"
            />
            <div className="flex flex-col gap-2">
              {prof.live.map((f, i) => (
                <FeatureItem key={i} dot="bg-[#22c55e]" name={f.name} detail={f.detail} saving={f.saving} />
              ))}
            </div>

            {/* Dev features */}
            <SectionTitle dot="bg-gold" label="In via di sviluppo" />
            <div className="flex flex-col gap-2">
              {prof.dev.map((f, i) => (
                <FeatureItem
                  key={i}
                  dot="bg-gold"
                  name={f.name}
                  detail={f.detail}
                  dimmed
                />
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3 rounded-[10px] text-[14px] font-medium border-none cursor-pointer transition-all duration-150 bg-accent text-white hover:bg-accent-hover mt-4"
            >
              Continua &rarr;
            </button>
          </div>
        )}

        {/* STEP 3 — Auth */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="bg-transparent border-none text-[#555] text-[13px] cursor-pointer mb-4 flex items-center gap-[5px] p-0 hover:text-[#aaa]"
            >
              &larr; Torna al piano
            </button>

            <Tabs tabs={["Accedi", "Registrati"]} active={tab} onSwitch={setTab} />

            {error && (
              <div className="text-accent text-[12px] mb-2">{error}</div>
            )}

            {tab === 0 ? (
              <div>
                <FormLabel>Email professionale</FormLabel>
                <FormInput type="email" placeholder="studio@email.it" value={email} onChange={setEmail} />
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
                <FormLabel>Email professionale</FormLabel>
                <FormInput type="email" placeholder="studio@email.it" value={email} onChange={setEmail} />
                <FormLabel>Ordine / Albo (opzionale)</FormLabel>
                <FormInput placeholder="es. Ordine Avvocati Milano" value={ordine} onChange={setOrdine} />
                <FormLabel>Password</FormLabel>
                <FormInput type="password" placeholder="Crea una password sicura" value={password} onChange={setPassword} />

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
                      checked={consentLeadMarketplace}
                      onChange={(e) => setConsentLeadMarketplace(e.target.checked)}
                      className="mt-[2px] shrink-0 accent-[#E8340A]"
                    />
                    <span className="text-[11.5px] text-[#666] leading-[1.5]">
                      * Acconsento alla ricezione di lead qualificati tramite il marketplace NormaAI e al relativo trattamento dati. (obbligatorio per professionisti)
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
                      Acconsento a ricevere comunicazioni email su novità, offerte e aggiornamenti normativi. (opzionale)
                    </span>
                  </label>
                </div>

                <BtnPrimary onClick={handleRegister}>
                  {loading ? "Registrazione..." : "Inizia 14 giorni gratis"}
                </BtnPrimary>
                <p className="text-[11px] text-[#444] text-center mt-[10px]">
                  Nessuna carta richiesta per il trial
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ── Sub-components ── */

function StepDot({
  n,
  current,
  label,
}: {
  n: number;
  current: number;
  label: string;
}) {
  const isDone = current > n;
  const isActive = current === n;
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition-all duration-200 ${
          isDone
            ? "bg-accent text-white"
            : isActive
            ? "bg-[#E8340A22] text-accent border border-[#E8340A40]"
            : "bg-[#1a1a1a] text-[#555] border border-[#252525]"
        }`}
      >
        {isDone ? "✓" : n}
      </div>
      <div className="text-[10px] text-[#555] mt-1">{label}</div>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div
      className={`flex-1 h-px mx-[6px] mb-[14px] ${
        done ? "bg-[#E8340A40]" : "bg-[#252525]"
      }`}
    />
  );
}

function LeadPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-[10px] py-[5px] text-center">
      <span className="text-accent font-semibold text-[14px] block">{value}</span>
      <span className="text-[#666] text-[10px]">{label}</span>
    </div>
  );
}

function SectionTitle({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.6px] text-[#555] mb-[10px] mt-4 flex items-center gap-[7px]">
      <span className="inline-flex items-center gap-[5px]">
        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${dot}`} />
        {label}
      </span>
      <span className="flex-1 h-[0.5px] bg-[#1e1e1e]" />
    </div>
  );
}

function FeatureItem({
  dot,
  name,
  detail,
  saving,
  dimmed,
}: {
  dot: string;
  name: string;
  detail: string;
  saving?: string | null;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-[10px] p-[10px] px-3 rounded-[10px] bg-card border border-card-border/50 ${
        dimmed ? "opacity-70" : ""
      }`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dot}`} />
      <div>
        <div className="text-[13px] font-medium mb-[2px]">{name}</div>
        <div className="text-[11.5px] text-[#666] leading-[1.4]">{detail}</div>
        {saving && (
          <div className="text-[11px] text-[#22c55e] mt-[3px]">{saving}</div>
        )}
      </div>
    </div>
  );
}
