"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface LeadFull {
  id: string;
  vertical: string;
  city: string;
  summary: string;
  score: number;
  pdf_url: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  expires_at: string;
}

export default function LawyerLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  const [lead, setLead] = useState<LeadFull | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetch(`/api/lawyer/leads/${leadId}`)
      .then(r => r.json())
      .then(j => { setLead(j.lead); setPurchased(!!j.purchased); })
      .finally(() => setLoading(false));
  }, [leadId]);

  async function buy() {
    setBuying(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "lead_buy", lead_id: leadId }),
      });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else { alert(j.error ?? "Errore"); setBuying(false); }
    } catch {
      setBuying(false);
    }
  }

  if (loading) return <main style={{ padding: 48 }}>Caricamento…</main>;
  if (!lead)   return <main style={{ padding: 48 }}>Lead non trovato.</main>;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        padding: "32px 48px",
        fontFamily: "var(--sans)",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <Link href="/avvocato/dashboard" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>
        ← Marketplace
      </Link>

      <header style={{ margin: "20px 0 28px", paddingBottom: 16, borderBottom: "1px solid var(--paper-line, #E8E0D2)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          {lead.vertical} · {lead.city}
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, color: "var(--ink-1)", margin: "8px 0 6px", fontWeight: 500 }}>
          Lead #{lead.id.slice(0, 8)}
        </h1>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
          Punteggio qualità <strong style={{ color: "var(--ink-1)" }}>{lead.score}/100</strong> · scade il {new Date(lead.expires_at).toLocaleDateString("it-IT")}
        </div>
      </header>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-1)", marginBottom: 10, fontWeight: 500 }}>
          Sintesi del caso
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>{lead.summary}</p>
      </section>

      {lead.pdf_url && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-1)", marginBottom: 10, fontWeight: 500 }}>
            Parere AI (PDF)
          </h2>
          <a href={lead.pdf_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 13, color: "var(--vermiglio, #C93924)", textDecoration: "underline" }}>
            Apri parere PDF →
          </a>
        </section>
      )}

      <section style={{ marginBottom: 28, padding: 20, background: "var(--paper-tint, #F8F4ED)", borderRadius: 8 }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-1)", marginBottom: 10, fontWeight: 500 }}>
          Contatti del cliente
        </h2>
        {purchased ? (
          <div style={{ fontSize: 14, color: "var(--ink-1)" }}>
            <p>Nome: <strong>{lead.contact_name}</strong></p>
            <p>Email: <a href={`mailto:${lead.contact_email}`}>{lead.contact_email}</a></p>
            <p>Telefono: <a href={`tel:${lead.contact_phone}`}>{lead.contact_phone}</a></p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
              Acquista il lead per sbloccare nome, email e telefono del cliente.
              Il cliente è in attesa di essere contattato.
            </p>
            <button
              onClick={buy}
              disabled={buying}
              style={{
                padding: "12px 22px",
                background: "var(--vermiglio, #C93924)",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: buying ? "wait" : "pointer",
              }}
            >
              {buying ? "Apertura checkout…" : "Acquista lead — 91 €"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
