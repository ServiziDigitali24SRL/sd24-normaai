"use client";

// /lead/new?conv=<conversation_id> — pagina di lead capture
// Flow:
//   1. utente arriva qui cliccando "Rivolgiti a un legale" nella chat
//   2. se anon → richiedi registrazione (TODO: link a /onboarding)
//   3. se auth → mostra anteprima conv + form contatto + bottone Paga 9€
//   4. al click → /api/stripe/checkout {mode:'lead_create', conversation_id}
//   5. webhook crea lead row + notifica avvocati marketplace
//
// Pre-pagamento l'utente vede: cosa l'avvocato vedrà PRIMA del pagamento (preview).
// L'avvocato vedrà nome (no cognome) + città + summary. Solo dopo paga 91€ ottiene
// cognome + telefono + email + chat completa.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ContactForm {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  summary: string;
}

function LeadNewInner() {
  const params = useSearchParams();
  const router = useRouter();
  const convId = params.get("conv");

  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState<ContactForm>({
    firstName: "", lastName: "", phone: "", city: "", summary: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convPreview, setConvPreview] = useState<{ messages: number; first_q: string } | null>(null);

  // 1. Verifica auth
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/users/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setAuthed(true);
          // Prefill da profilo se disponibile
          setForm(f => ({
            ...f,
            firstName: j.first_name ?? "",
            lastName: j.last_name ?? "",
            phone: j.phone ?? "",
            city: j.citta ?? "",
          }));
        } else {
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // 2. Preview conv
  useEffect(() => {
    if (!convId || !authed) return;
    (async () => {
      try {
        const r = await fetch(`/api/conversations/${convId}/preview`);
        if (r.ok) {
          const j = await r.json();
          setConvPreview({ messages: j.messages_count ?? 0, first_q: j.first_question ?? "" });
        }
      } catch { /* preview optional */ }
    })();
  }, [convId, authed]);

  const submit = async () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setError("Nome, cognome e telefono sono obbligatori.");
      return;
    }
    if (!convId) {
      setError("Conversazione non identificata.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lead_create",
          conversation_id: convId,
          contact_phone: form.phone,
          city: form.city || "ND",
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "checkout_failed");
      }
      const j = await r.json();
      if (j.url) window.location.href = j.url;
      else throw new Error("no_checkout_url");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return <div style={shell}><div style={card}>Verifica accesso…</div></div>;
  }

  if (!authed) {
    return (
      <div style={shell}>
        <div style={card}>
          <h2 style={h2}>Crea il tuo account per continuare</h2>
          <p style={p}>
            Per inoltrare la tua richiesta a un avvocato verificato devi prima registrarti.
            Bastano un cellulare e una mail — non chiediamo password.
          </p>
          <button
            onClick={() => router.push(`/onboarding?next=${encodeURIComponent(`/lead/new?conv=${convId ?? ""}`)}`)}
            style={btnPrimary}
          >
            Registrati ora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <h2 style={h2}>Rivolgiti a un legale verificato</h2>
        <p style={p}>
          Il nostro <strong>parere legale automatico</strong> (PDF firmato AI) costa <strong>9 €</strong>.
          Verrà pubblicato nel marketplace di NormaAI e un avvocato qualificato ti contatterà entro 48 ore.
        </p>

        {convPreview && (
          <div style={previewBox}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>ANTEPRIMA CONVERSAZIONE</div>
            <div style={{ fontSize: 13 }}>{convPreview.messages} messaggi</div>
            {convPreview.first_q && (
              <div style={{ fontSize: 12, marginTop: 6, fontStyle: "italic", opacity: 0.8 }}>
                «{convPreview.first_q.slice(0, 140)}{convPreview.first_q.length > 140 ? "…" : ""}»
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
          <Row>
            <Field label="Nome *">
              <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={inp} />
            </Field>
            <Field label="Cognome *">
              <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={inp} />
            </Field>
          </Row>
          <Field label="Telefono * (visibile all'avvocato dopo l'acquisto)">
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+39…" style={inp} />
          </Field>
          <Field label="Città (per consigliare avvocati locali)">
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={inp} />
          </Field>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
          <strong>Cosa vede l&apos;avvocato:</strong> il tuo <em>nome</em>, la <em>città</em>, e un riassunto del tuo caso (no cognome né telefono).
          Solo l&apos;avvocato che acquista il lead (91 €) riceverà i tuoi contatti completi e lo storico chat.
        </div>

        {error && <div style={{ marginTop: 12, padding: 10, background: "#fdf2f2", color: "#9b1c1c", borderRadius: 6, fontSize: 12 }}>{error}</div>}

        <button onClick={submit} disabled={submitting} style={{...btnPrimary, marginTop: 16, opacity: submitting ? 0.6 : 1}}>
          {submitting ? "Reindirizzamento…" : "Procedi al pagamento · 9 €"}
        </button>
      </div>
    </div>
  );
}

export default function LeadNew() {
  return (
    <Suspense fallback={<div style={shell}><div style={card}>Caricamento…</div></div>}>
      <LeadNewInner />
    </Suspense>
  );
}

// ─── Inline editorial paper/ink styles (matches MainDashboard) ───────────────
const shell: React.CSSProperties = {
  minHeight: "100vh", background: "var(--paper, #F6F2EA)", padding: "40px 20px",
  display: "flex", justifyContent: "center", alignItems: "flex-start",
  fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)", color: "var(--ink, #13110F)",
};
const card: React.CSSProperties = {
  maxWidth: 580, width: "100%", background: "white", border: "1px solid #e8e6e0",
  borderRadius: 10, padding: 32, boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
};
const h2: React.CSSProperties = { fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 28, margin: 0, marginBottom: 8, letterSpacing: "-0.01em" };
const p:  React.CSSProperties = { fontSize: 14, lineHeight: 1.55, opacity: 0.78, marginTop: 4 };
const previewBox: React.CSSProperties = { marginTop: 16, padding: 12, background: "#fafaf8", border: "1px dashed #d6d3cd", borderRadius: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "1px solid #d6d3cd", borderRadius: 6, fontSize: 13.5, fontFamily: "inherit", background: "#fafaf8", outline: "none" };
const btnPrimary: React.CSSProperties = { background: "var(--ink, #13110F)", color: "white", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, opacity: 0.65, fontFamily: "var(--mono, monospace)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}
