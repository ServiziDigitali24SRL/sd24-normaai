"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeadPreview {
  id: string;
  vertical: string;
  city: string;
  summary: string;
  score: number;
  pdf_url: string;
  created_at: string;
  expires_at: string;
}

export default function LawyerDashboardPage() {
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lawyer/leads")
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j.error)))
      .then(j => setLeads(j.leads ?? []))
      .catch(e => setError(typeof e === "string" ? e : "errore_caricamento"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        padding: "32px 48px",
        fontFamily: "var(--sans)",
      }}
    >
      <header style={{ marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--paper-line, #E8E0D2)" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)", margin: 0, fontWeight: 500 }}>
          Marketplace Lead
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "6px 0 0" }}>
          Lead disponibili che corrispondono alla tua specializzazione. Acquisti a 91 € sbloccano i contatti.
        </p>
      </header>

      {loading && <p style={{ color: "var(--ink-3)" }}>Caricamento…</p>}
      {error && (
        <p style={{ color: "var(--red-error, #B43B25)" }}>
          {error === "not_verified_lawyer"
            ? "Profilo avvocato non ancora verificato. Contatta supporto."
            : "Errore nel caricamento dei lead."}
        </p>
      )}

      {!loading && !error && leads.length === 0 && (
        <p style={{ color: "var(--ink-3)" }}>Nessun lead disponibile al momento.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {leads.map(lead => (
          <article
            key={lead.id}
            style={{
              background: "white",
              border: "1px solid var(--paper-line, #E8E0D2)",
              borderRadius: 8,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                  {lead.vertical} · {lead.city}
                </div>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink-1)", margin: "6px 0 0", fontWeight: 500 }}>
                  Lead #{lead.id.slice(0, 8)}
                </h2>
              </div>
              <span style={{
                background: lead.score >= 70 ? "var(--vermiglio-tint, #FBE8E4)" : "var(--paper-tint, #F8F4ED)",
                color: lead.score >= 70 ? "var(--vermiglio, #C93924)" : "var(--ink-3)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 4,
                fontWeight: 600,
              }}>
                {lead.score}/100
              </span>
            </div>

            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, flex: 1, margin: "8px 0" }}>
              {lead.summary.slice(0, 180)}{lead.summary.length > 180 ? "…" : ""}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--paper-line, #E8E0D2)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink-1)", fontWeight: 500 }}>
                91 €
              </div>
              <Link
                href={`/avvocato/lead/${lead.id}`}
                style={{
                  padding: "8px 14px",
                  background: "var(--vermiglio, #C93924)",
                  color: "white",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Visualizza
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
