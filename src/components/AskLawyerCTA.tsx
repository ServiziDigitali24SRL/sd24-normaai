"use client";

import { useState } from "react";
import { Scale, X } from "lucide-react";

interface Props {
  conversationId: string | null;
  conversationSummary?: string;
}

/**
 * Always-visible bottom-right CTA. Never popup, never auto-open. Click opens
 * a modal with conversation summary preview + Stripe 9€ checkout.
 *
 * Stripe checkout is initiated via /api/stripe/checkout — when not
 * configured, button simulates redirect to /lead/created (stub).
 */
export default function AskLawyerCTA({ conversationId, conversationSummary }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!conversationId) {
      setError("Inizia una conversazione prima di richiedere un avvocato.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lead_create",
          amount_eur: 9,
          conversation_id: conversationId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore generico.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Genera un parere PDF e ricevi un avvocato — 9€"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          background: "white",
          border: "1.5px solid var(--vermiglio, #C93924)",
          color: "var(--vermiglio, #C93924)",
          padding: "11px 18px",
          borderRadius: 6,
          fontFamily: "var(--sans)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--vermiglio, #C93924)";
          (e.currentTarget as HTMLElement).style.color = "white";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "white";
          (e.currentTarget as HTMLElement).style.color = "var(--vermiglio, #C93924)";
        }}
      >
        <Scale size={14} />
        Rivolgiti a un avvocato
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(20, 14, 10, 0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--paper, #FDFBF7)",
              maxWidth: 520, width: "100%",
              borderRadius: 8,
              padding: "28px 28px 24px",
              fontFamily: "var(--sans)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Chiudi"
              style={{
                position: "absolute", top: 14, right: 14,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--ink-3)", padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: 24,
                color: "var(--ink-1)",
                margin: "0 0 6px",
                fontWeight: 500,
              }}
            >
              Richiedi consulenza umana
            </h2>
            <p
              style={{
                fontSize: 14, color: "var(--ink-3)",
                margin: "0 0 20px", lineHeight: 1.5,
              }}
            >
              Generiamo un parere PDF basato sulla tua conversazione e lo inviamo
              al marketplace. Un avvocato qualificato ti contatterà entro 48h.
            </p>

            {conversationSummary && (
              <div
                style={{
                  background: "var(--paper-tint, #F8F4ED)",
                  border: "1px solid var(--paper-line, #E8E0D2)",
                  borderRadius: 6,
                  padding: 14,
                  fontSize: 13, lineHeight: 1.5,
                  color: "var(--ink-2)",
                  marginBottom: 18,
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {conversationSummary}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingTop: 12,
                borderTop: "1px solid var(--paper-line, #E8E0D2)",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Costo richiesta</div>
                <div style={{ fontSize: 28, fontFamily: "var(--serif)", color: "var(--ink-1)", fontWeight: 500 }}>9 €</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "right", maxWidth: 200, lineHeight: 1.4 }}>
                Pagamento sicuro Stripe.<br />Avvocato vero, non IA.
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: "var(--red-error, #B43B25)", marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              onClick={startCheckout}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "var(--vermiglio, #C93924)",
                color: "white", border: "none",
                borderRadius: 6,
                fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Apertura checkout…" : "Procedi al pagamento — 9 €"}
            </button>

            <p style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 12, textAlign: "center", letterSpacing: "0.05em" }}>
              Cliccando accetti i Termini e l&apos;Informativa Privacy
            </p>
          </div>
        </div>
      )}
    </>
  );
}
