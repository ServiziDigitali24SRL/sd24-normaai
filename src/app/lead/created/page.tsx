"use client";

// /lead/created?session_id=... — pagina di conferma post-pagamento 9€.
// Il webhook Stripe ha già creato il lead row e notificato gli avvocati.

import { Suspense } from "react";
import Link from "next/link";

function Inner() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper, #F6F2EA)", padding: "60px 20px",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)",
      color: "var(--ink, #13110F)",
    }}>
      <div style={{
        maxWidth: 540, width: "100%", background: "white",
        border: "1px solid #e8e6e0", borderRadius: 10, padding: "40px 36px",
        textAlign: "center",
      }}>
        <div style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 56, lineHeight: 1, color: "var(--vermiglio, #c64227)" }}>§</div>
        <h1 style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 30, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>
          Richiesta inviata
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.78, margin: "8px 0 24px" }}>
          Il tuo parere PDF è in generazione e la richiesta è ora visibile a tutti gli avvocati verificati su NormaAI.
          Riceverai una mail appena un avvocato acquisterà il lead — di solito entro 24-48 ore.
        </p>

        <div style={{
          background: "#fafaf8", border: "1px dashed #d6d3cd", borderRadius: 6,
          padding: 14, fontSize: 12.5, lineHeight: 1.55, textAlign: "left", marginBottom: 24,
        }}>
          <strong>Prossimi passi:</strong>
          <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
            <li>Ti arriverà una mail con il tuo parere PDF (entro 5 min).</li>
            <li>Un avvocato qualificato ti contatterà entro 48 ore.</li>
            <li>Puoi tracciare lo stato dalla tua <Link href="/dashboard" style={{ color: "var(--vermiglio, #c64227)", textDecoration: "underline" }}>dashboard</Link>.</li>
          </ul>
        </div>

        <Link href="/dashboard" style={{
          display: "inline-block", background: "var(--ink, #13110F)", color: "white",
          padding: "10px 20px", borderRadius: 6, textDecoration: "none",
          fontSize: 13.5, fontWeight: 500,
        }}>
          Vai alla dashboard
        </Link>
      </div>
    </div>
  );
}

export default function LeadCreated() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
