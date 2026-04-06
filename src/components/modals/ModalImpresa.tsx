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

export default function ModalImpresa({ open, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [piva, setPiva] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onClose();
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ragione_sociale: ragioneSociale,
          p_iva: piva,
          role: "impresa",
        },
      },
    });
    if (error) {
      setError(error.message);
    } else if (data.user) {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_impresa", userId: data.user.id, email }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else onClose();
    }
    setLoading(false);
  }

  const feats = [
    "Multe e sanzioni",
    "Contratti commerciali",
    "Rapporti con dipendenti",
    "Diffide, contenziosi e cause",
    "Altro + domande libere",
    "Archivio conversazioni",
  ];

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Accedi come Impresa</ModalTitle>
        <ModalSub>14 giorni gratuiti, poi 29&euro;/mese &mdash; disdici quando vuoi</ModalSub>

        <div className="bg-card border border-card-border rounded-xl p-[18px] mt-[14px]">
          <div className="font-serif text-[30px]">
            <sup className="text-[14px] font-sans">&euro;</sup>29
            <sub className="text-[13px] font-sans text-[#555]">/mese</sub>
          </div>
          <div className="text-[11.5px] text-gold mt-[3px]">
            &#10022; 14 giorni gratuiti &middot; Modello Opus 4.6
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

        <div className="mt-5">
          <Tabs tabs={["Accedi", "Registrati"]} active={tab} onSwitch={setTab} />
        </div>

        {error && <div className="text-accent text-[12px] mb-2">{error}</div>}

        {tab === 0 ? (
          <div>
            <FormLabel>Email aziendale</FormLabel>
            <FormInput type="email" placeholder="azienda@email.it" value={email} onChange={setEmail} />
            <FormLabel>Password</FormLabel>
            <FormInput type="password" placeholder="••••••••" value={password} onChange={setPassword} />
            <BtnPrimary onClick={handleLogin}>
              {loading ? "Accesso..." : "Accedi"}
            </BtnPrimary>
            <BtnOutline onClick={() => setTab(1)}>Registra la tua azienda</BtnOutline>
          </div>
        ) : (
          <div>
            <FormLabel>Ragione Sociale</FormLabel>
            <FormInput placeholder="Azienda S.r.l." value={ragioneSociale} onChange={setRagioneSociale} />
            <FormLabel>P.IVA</FormLabel>
            <FormInput placeholder="IT00000000000" value={piva} onChange={setPiva} />
            <FormLabel>Email</FormLabel>
            <FormInput type="email" placeholder="admin@azienda.it" value={email} onChange={setEmail} />
            <FormLabel>Password</FormLabel>
            <FormInput type="password" placeholder="Crea una password" value={password} onChange={setPassword} />
            <BtnPrimary onClick={handleRegister}>
              {loading ? "Registrazione..." : "Inizia 14 giorni gratis"}
            </BtnPrimary>
            <p className="text-[11px] text-[#444] text-center mt-[10px]">
              Nessuna carta richiesta per il trial
            </p>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
