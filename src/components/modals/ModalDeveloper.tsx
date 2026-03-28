"use client";

import { useState } from "react";
import ModalOverlay, {
  ModalClose,
  CheckIcon,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: null,
    queries: "100 query / mese",
    features: [
      "Accesso immediato all'API",
      "5 verticali normativi",
      "Rate limit: 10 req/min",
      "Risposta JSON con fonti",
    ],
    cta: "Ottieni chiave API",
    highlight: false,
    trial: false,
  },
  {
    id: "price_developer",
    name: "Developer",
    price: 49,
    queries: "5.000 query / mese",
    features: [
      "Tutto il piano Free",
      "Rate limit: 60 req/min",
      "Streaming SSE",
      "SLA 99.5%",
    ],
    cta: "Inizia — 14 giorni gratis",
    highlight: true,
    trial: true,
  },
  {
    id: "price_developer_pro",
    name: "Pro",
    price: 199,
    queries: "50.000 query / mese",
    features: [
      "Tutto il piano Developer",
      "Rate limit: 300 req/min",
      "Accesso prioritario ai nuovi modelli",
      "SLA 99.9% + supporto dedicato",
    ],
    cta: "Attiva ora",
    highlight: false,
    trial: false,
  },
];

const CODE_EXAMPLE = `curl -X POST https://normaai.it/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $NORMA_API_KEY" \\
  -d '{
    "question": "Termini per impugnare una multa?",
    "vertical": "Avvocato"
  }'`;

export default function ModalDeveloper({ open, onClose }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [freeEmail, setFreeEmail] = useState("");
  const [freeSent, setFreeSent] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setLoadingPlan(null);
    setFreeEmail("");
    setFreeSent(false);
    onClose();
  }

  async function handlePaidPlan(priceId: string) {
    setLoadingPlan(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      /* silent */
    }
    setLoadingPlan(null);
  }

  async function handleFreePlan() {
    if (!freeEmail.trim()) return;
    setLoadingPlan("free");
    try {
      await fetch("/api/developer-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: freeEmail, plan: "free" }),
      });
    } catch { /* silent */ }
    setLoadingPlan(null);
    setFreeSent(true);
  }

  function copyCode() {
    navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalOverlay open={open} onClose={handleClose} wide>
      <ModalClose onClose={handleClose} />

      <div className="p-7">
        <div className="text-[11px] text-accent uppercase tracking-[1px] mb-2">API NormaAI</div>
        <h2 className="font-serif text-[26px] tracking-[-0.5px] text-cream mb-1">
          Integra la normativa italiana<br />nella tua applicazione
        </h2>
        <p className="text-[12.5px] text-[#555] mb-5 leading-[1.6]">
          La stessa AI di normaai.it via REST API. Risposte con fonti normative, streaming incluso.
        </p>

        {/* Code preview */}
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4 mb-6 relative">
          <div className="text-[10px] text-[#444] uppercase tracking-[0.5px] mb-2">Esempio</div>
          <pre className="text-[11px] text-[#888] font-mono leading-[1.7] overflow-x-auto whitespace-pre-wrap break-all">
            {CODE_EXAMPLE}
          </pre>
          <button
            onClick={copyCode}
            className="absolute top-3 right-3 text-[11px] text-[#555] hover:text-cream transition-colors bg-[#1a1a1a] border border-[#252525] px-2 py-[3px] rounded cursor-pointer"
          >
            {copied ? "✓ Copiato" : "Copia"}
          </button>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-4 border ${
                plan.highlight
                  ? "border-accent bg-[#E8340A08]"
                  : "border-[#1e1e1e] bg-[#141414]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-[2px]">
                    <span className="text-[13px] font-medium text-cream">{plan.name}</span>
                    <span className="text-[11px] text-accent">{plan.queries}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-[3px] mt-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-[5px] text-[11px] text-[#666]">
                        <CheckIcon />
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Free plan: inline email input */}
                  {plan.id === "free" && !freeSent && (
                    <div className="flex gap-2 mt-3">
                      <input
                        type="email"
                        placeholder="La tua email"
                        value={freeEmail}
                        onChange={(e) => setFreeEmail(e.target.value)}
                        className="flex-1 py-[7px] px-[11px] bg-[#1c1c1c] border border-[#252525] rounded-[8px] text-cream text-[12px] outline-none focus:border-[#3a3a3a] placeholder:text-[#3a3a3a]"
                      />
                      <button
                        onClick={handleFreePlan}
                        disabled={!freeEmail.trim() || loadingPlan === "free"}
                        className="px-3 py-[7px] rounded-[8px] text-[12px] bg-[#1e1e1e] border border-[#2a2a2a] text-cream hover:border-[#444] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {loadingPlan === "free" ? "..." : "Ottieni →"}
                      </button>
                    </div>
                  )}
                  {plan.id === "free" && freeSent && (
                    <p className="text-[12px] text-accent mt-3">✓ Chiave API inviata via email</p>
                  )}
                </div>

                {/* Price + CTA for paid plans */}
                {plan.price !== null && (
                  <div className="flex flex-col items-end shrink-0">
                    <div className="font-serif text-[22px] text-cream leading-none mb-[2px]">
                      <sup className="text-[11px] font-sans">€</sup>{plan.price}
                      <sub className="text-[11px] font-sans text-[#555]">/mo</sub>
                    </div>
                    {plan.trial && (
                      <div className="text-[10px] text-[#555] mb-2">14 giorni gratis</div>
                    )}
                    <button
                      onClick={() => handlePaidPlan(plan.id)}
                      disabled={loadingPlan === plan.id}
                      className={`px-4 py-[7px] rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                        plan.highlight
                          ? "bg-accent text-white hover:bg-accent-hover"
                          : "bg-[#1e1e1e] border border-[#2a2a2a] text-cream hover:border-[#444]"
                      }`}
                    >
                      {loadingPlan === plan.id ? "..." : plan.cta}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#333] text-center mt-4">
          Pagamento sicuro via Stripe · Cancella quando vuoi
        </p>
      </div>
    </ModalOverlay>
  );
}
