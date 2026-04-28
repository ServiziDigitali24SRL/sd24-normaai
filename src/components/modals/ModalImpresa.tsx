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

const PIANI = [
  { id: "impresa_micro",   label: "Micro",   prezzo: "29",  query: "543 query/mese",  desc: "Fino a 5 dip. · 3 seat" },
  { id: "impresa_piccola", label: "Piccola", prezzo: "79",  query: "1.481 query/mese", desc: "Fino a 25 dip. · 10 seat" },
  { id: "impresa_media",   label: "Media",   prezzo: "199", query: "3.731 query/mese", desc: "Fino a 100 dip. · 50 seat" },
  { id: "impresa_grande",  label: "Grande",  prezzo: "499", query: "9.356 query/mese", desc: "Oltre 100 dip. · illimitati" },
];

export default function ModalImpresa({ open, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [piva, setPiva] = useState("");
  const [piano, setPiano] = useState("impresa_micro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
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
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        if (err.message.includes("Email not confirmed")) {
          setError("Email non ancora confermata. Controlla la tua casella.");
        } else if (err.message.toLowerCase().includes("rate")) {
          setError("Troppi tentativi. Riprova tra qualche minuto.");
        } else {
          setError("Email o password non corretti.");
        }
      } else {
        onClose();
        router.refresh();
        router.push("/dashboard-impresa");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!ragioneSociale.trim() || !email.trim() || !password.trim()) {
      setError("Ragione sociale, email e password sono obbligatori.");
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
            ragione_sociale: ragioneSociale,
            p_iva: piva,
            role: "impresa",
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
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: piano, userId: data.user.id, email }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Errore avviando il checkout. Riprova.");
          return;
        }
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        } else {
          onClose();
          router.refresh();
          router.push("/dashboard-impresa");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const feats = [
    "Query normative illimitate con AI (nel pool del piano)",
    "Modello Claude Opus 4.6 per analisi critiche",
    "Fascicolo aziendale documenti",
    "Gestione team e ruoli aziendali",
    "Matching con professionisti (avvocati, consulenti)",
    "Alert scadenze normative automatici",
    "Report compliance mensile",
    "Dashboard impresa dedicata",
  ];

  const pianoSelezionato = PIANI.find(p => p.id === piano) ?? PIANI[0];

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>NormaAI per Imprese</ModalTitle>
        <ModalSub>7 giorni gratuiti &mdash; disdici quando vuoi &mdash; nessuna carta richiesta</ModalSub>

        {/* Piano selector */}
        <div className="mt-4 grid grid-cols-4 gap-[6px]">
          {PIANI.map(p => (
            <button
              key={p.id}
              onClick={() => setPiano(p.id)}
              className={`flex flex-col items-center py-[10px] px-[4px] rounded-xl border text-center transition-all cursor-pointer ${piano === p.id ? "border-accent bg-accent/5" : "border-[#E5E1D8] bg-white hover:border-[#C8C2BA]"}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${piano === p.id ? "text-accent" : "text-[#6B6763]"}`}>{p.label}</span>
              <span className={`text-[16px] font-serif mt-[2px] ${piano === p.id ? "text-[#1a1a1a]" : "text-[#3a3a3a]"}`}>€{p.prezzo}</span>
              <span className="text-[9px] text-[#9A9690] mt-[1px]">/mese</span>
            </button>
          ))}
        </div>
        <div className="mt-[6px] text-[11px] text-[#9A9690] text-center">{pianoSelezionato.desc} &middot; {pianoSelezionato.query}</div>

        {/* Features */}
        <div className="bg-card border border-card-border rounded-xl p-[14px] mt-[12px] flex flex-col gap-[6px]">
          {feats.map((f) => (
            <div key={f} className="flex items-start gap-[7px] text-[11.5px] text-[#9A9690]">
              <CheckIcon />
              {f}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Tabs tabs={["Accedi", "Registrati"]} active={tab} onSwitch={(t) => { setTab(t); setError(""); }} />
        </div>

        {error && <div className="text-accent text-[12px] mb-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        {tab === 0 ? (
          <div>
            <FormLabel htmlFor="impresa-login-email">Email aziendale</FormLabel>
            <FormInput id="impresa-login-email" name="email" type="email" placeholder="azienda@email.it" value={email} onChange={setEmail} />
            <FormLabel htmlFor="impresa-login-password">Password</FormLabel>
            <FormInput id="impresa-login-password" name="password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
            <BtnPrimary onClick={handleLogin} disabled={loading}>
              {loading ? "Accesso..." : "Accedi"}
            </BtnPrimary>
            <BtnOutline onClick={() => setTab(1)}>Registra la tua azienda</BtnOutline>
          </div>
        ) : (
          <div>
            <FormLabel htmlFor="impresa-reg-ragione">Ragione Sociale</FormLabel>
            <FormInput id="impresa-reg-ragione" name="ragione_sociale" placeholder="Azienda S.r.l." value={ragioneSociale} onChange={setRagioneSociale} />
            <FormLabel htmlFor="impresa-reg-piva">P.IVA</FormLabel>
            <FormInput id="impresa-reg-piva" name="piva" placeholder="IT00000000000" value={piva} onChange={setPiva} />
            <FormLabel htmlFor="impresa-reg-email">Email aziendale</FormLabel>
            <FormInput id="impresa-reg-email" name="email" type="email" placeholder="admin@azienda.it" value={email} onChange={setEmail} />
            <FormLabel htmlFor="impresa-reg-password">Password</FormLabel>
            <FormInput id="impresa-reg-password" name="password" type="password" placeholder="Crea una password (min. 8 caratteri)" value={password} onChange={setPassword} />

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} className="mt-[2px] shrink-0 accent-[#E8340A]" />
                <span className="text-[11.5px] text-[#6B6763] leading-[1.5]">
                  * Ho letto e accetto la{" "}
                  <a href="/privacy" target="_blank" className="text-accent hover:underline">Privacy Policy</a>
                  {" "}e i{" "}
                  <a href="/termini" target="_blank" className="text-accent hover:underline">Termini di Servizio</a>. (obbligatorio)
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)} className="mt-[2px] shrink-0 accent-[#E8340A]" />
                <span className="text-[11.5px] text-[#6B6763] leading-[1.5]">
                  Acconsento a ricevere email su novità e aggiornamenti normativi. (opzionale)
                </span>
              </label>
            </div>

            <BtnPrimary onClick={handleRegister} disabled={loading}>
              {loading ? "Registrazione..." : `Inizia 7 giorni gratis — Piano ${pianoSelezionato.label}`}
            </BtnPrimary>
            <p className="text-[11px] text-[#7A766F] text-center mt-[10px]">
              Nessuna carta richiesta per il trial · €{pianoSelezionato.prezzo}/mese dopo i 7 giorni
            </p>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
