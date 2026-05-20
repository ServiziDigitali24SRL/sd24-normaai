"use client";

// /su-misura — landing B2B per richieste di integrazione enterprise.
// Slogan + form lead capture (no piani fissi). I lead vanno alla tabella
// whitelabel_leads (esiste già da migration 001) + email a info@normaai.it.

import { useState } from "react";
import AppNav from "@/components/AppNav";

interface Form {
  company: string;
  contact_name: string;
  email: string;
  role: string;
  use_case: string;
  budget_range: string;
  note: string;
}

const EMPTY: Form = { company: "", contact_name: "", email: "", role: "", use_case: "", budget_range: "", note: "" };

export default function SuMisuraPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!form.company || !form.contact_name || !form.email) {
      setError("Azienda, nome contatto e email sono obbligatori.");
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/enterprise-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "submit_failed");
      }
      setDone(true);
      setForm(EMPTY);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--paper, #F6F2EA)" }}>
      <AppNav />

      <main style={{
        flex: 1, padding: "48px 60px", maxWidth: 880,
        fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)",
        color: "var(--ink, #13110F)",
      }}>
        {/* Hero editorial */}
        <header style={{ borderBottom: "1px solid var(--paper-line, #e8e6e0)", paddingBottom: 28, marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.5, marginBottom: 12 }}>
            Per aziende
          </div>
          <h1 style={{
            fontFamily: "var(--serif, 'Instrument Serif', serif)",
            fontSize: 46, lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em",
          }}>
            Gestisci un archivio aziendale?<br />
            <span style={{ fontStyle: "italic", color: "var(--vermiglio, #c64227)" }}>Devi integrare AI o normative?</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 20, opacity: 0.78, maxWidth: 640 }}>
            Connettiamo NormaAI ai tuoi sistemi documentali (Google Drive, OneDrive, SharePoint, repository aziendali) e costruiamo agenti
            specifici per la tua compliance. Niente piani standard — partiamo dal tuo caso.
          </p>
        </header>

        {/* Form lead capture */}
        {done ? (
          <div style={{
            background: "white", border: "1px solid var(--paper-line, #e8e6e0)", borderRadius: 10,
            padding: 36, textAlign: "center",
          }}>
            <div style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 48, lineHeight: 1, color: "var(--vermiglio, #c64227)" }}>§</div>
            <h2 style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 28, margin: "16px 0 8px" }}>Richiesta inviata</h2>
            <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.55 }}>
              Ti contatteremo entro 24 ore lavorative all&apos;indirizzo email indicato per discutere il tuo caso.
            </p>
            <button onClick={() => setDone(false)} style={btnGhost}>Invia un&apos;altra richiesta</button>
          </div>
        ) : (
          <section style={{
            background: "white", border: "1px solid var(--paper-line, #e8e6e0)", borderRadius: 10, padding: 32,
          }}>
            <h2 style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 24, margin: 0, marginBottom: 8 }}>Chiedi un preventivo</h2>
            <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 22 }}>Dimmi 3 cose sulla tua azienda — ti scrivo io con una proposta.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Azienda *">
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={inp} />
              </Field>
              <Field label="Tuo nome *">
                <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={inp} />
              </Field>
              <Field label="Email aziendale *">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
              </Field>
              <Field label="Ruolo">
                <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="es. CTO, Legal Counsel…" style={inp} />
              </Field>
            </div>

            <Field label="Caso d'uso *" full>
              <textarea
                value={form.use_case} onChange={e => setForm({ ...form, use_case: e.target.value })}
                placeholder="es. 'Vorrei collegare il nostro Drive con 50k contratti per fare Q&A normativa interna.'"
                rows={3} style={{ ...inp, resize: "vertical" }}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginTop: 14 }}>
              <Field label="Budget orientativo">
                <select value={form.budget_range} onChange={e => setForm({ ...form, budget_range: e.target.value })} style={inp}>
                  <option value="">— scegli —</option>
                  <option value="<5k">Sotto 5k €</option>
                  <option value="5-15k">5–15k €</option>
                  <option value="15-50k">15–50k €</option>
                  <option value="50k+">Oltre 50k €</option>
                  <option value="non_so">Non so ancora</option>
                </select>
              </Field>
              <Field label="Note libere">
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={inp} />
              </Field>
            </div>

            {error && <div style={errBox}>{error}</div>}

            <button onClick={submit} disabled={sending} style={{ ...btnPrimary, marginTop: 20, opacity: sending ? 0.6 : 1 }}>
              {sending ? "Invio…" : "Invia richiesta"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined, marginTop: full ? 14 : 0 }}>
      <span style={{ fontSize: 11, opacity: 0.65, fontFamily: "var(--mono, ui-monospace, monospace)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 6,
  fontSize: 13.5, fontFamily: "inherit", background: "#fafaf8", outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--ink, #13110F)", color: "white", border: "none", borderRadius: 6,
  padding: "11px 20px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
};
const btnGhost: React.CSSProperties = {
  marginTop: 18, background: "transparent", border: "1px solid var(--paper-line, #e8e6e0)", borderRadius: 6,
  padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-2, #2b2724)",
};
const errBox: React.CSSProperties = {
  marginTop: 14, padding: 10, background: "#fdf2f2", color: "#9b1c1c", borderRadius: 6, fontSize: 12.5,
};
