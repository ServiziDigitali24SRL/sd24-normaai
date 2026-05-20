"use client";

// /impostazioni — pagina profilo utente.
// Campi:
//   • Profilo: nome, cognome, email (read-only), telefono
//   • Preferenze: lingua sito, lingua voce, colore ORB
//   • Account: tipo cittadino, CAP/città
//   • Pericolo: cancella account (soft-delete)

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  cap: string | null;
  citta: string | null;
  citizenship_type: string | null;
  preferred_lang: string;
  preferred_voice_lang: string;
  preferred_orb_color: string;
  role: string;
}

const LANG_SITE = [
  { v: "it", label: "Italiano" },
  { v: "en", label: "English" },
];
const LANG_VOICE = [
  { v: "it", label: "Italiano" }, { v: "en", label: "English" }, { v: "es", label: "Español" },
  { v: "ar", label: "العربية" }, { v: "ro", label: "Română" }, { v: "zh", label: "中文" },
  { v: "uk", label: "Українська" }, { v: "bn", label: "বাংলা" }, { v: "de", label: "Deutsch" },
  { v: "fr", label: "Français" }, { v: "ja", label: "日本語" },
];
const ORB_COLORS = [
  { v: "vermiglio", label: "Vermiglio", hex: "#c64227" },
  { v: "alloro",    label: "Alloro",    hex: "#5a7a3a" },
  { v: "ambra",     label: "Ambra",     hex: "#d97706" },
  { v: "blu",       label: "Blu",       hex: "#2563EB" },
];
const CITIZENSHIP = [
  { v: "italiano", label: "Italiano/a" },
  { v: "turista", label: "Turista in Italia" },
  { v: "straniero_residente", label: "Straniero residente" },
];

export default function ImpostazioniPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/users/me", { cache: "no-store" });
        if (!r.ok) {
          if (r.status === 401) {
            window.location.href = "/onboarding?next=/impostazioni";
            return;
          }
          throw new Error("load_failed");
        }
        const j = await r.json();
        setProfile(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (patch: Partial<Profile>) => {
    if (!profile) return;
    setProfile({ ...profile, ...patch });
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          cap: profile.cap,
          citta: profile.citta,
          citizenship_type: profile.citizenship_type,
          preferred_lang: profile.preferred_lang,
          preferred_voice_lang: profile.preferred_voice_lang,
          preferred_orb_color: profile.preferred_orb_color,
        }),
      });
      if (!r.ok) throw new Error("save_failed");
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Confermi l'eliminazione dell'account? Verrà disattivato (soft-delete) e potrai riattivarlo entro 30 giorni contattando il supporto.")) return;
    try {
      const r = await fetch("/api/users/me/delete", { method: "POST" });
      if (!r.ok) throw new Error("delete_failed");
      window.location.href = "/?account_deleted=1";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore eliminazione");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--paper, #F6F2EA)" }}>
      <AppNav />

      <main style={{
        flex: 1, padding: "48px 60px", maxWidth: 760,
        fontFamily: "var(--sans, 'Inter Tight', system-ui, sans-serif)",
        color: "var(--ink, #13110F)",
      }}>
        <h1 style={{ fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 38, margin: 0, marginBottom: 6, letterSpacing: "-0.02em" }}>
          Impostazioni
        </h1>
        <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 36 }}>
          Profilo, preferenze e account
        </p>

        {loading && <div style={cardStyle}>Caricamento profilo…</div>}
        {error && <div style={errBox}>{error}</div>}

        {profile && (
          <>
            {/* Profilo */}
            <Section title="Profilo">
              <Row>
                <Field label="Nome">
                  <input value={profile.first_name ?? ""} onChange={e => update({ first_name: e.target.value })} style={inp} />
                </Field>
                <Field label="Cognome">
                  <input value={profile.last_name ?? ""} onChange={e => update({ last_name: e.target.value })} style={inp} />
                </Field>
              </Row>
              <Row>
                <Field label={`Email ${profile.email_verified_at ? "✓ verificata" : "non verificata"}`}>
                  <input value={profile.email} disabled style={{ ...inp, opacity: 0.6 }} />
                </Field>
                <Field label={`Telefono ${profile.phone_verified_at ? "✓ verificato" : "non verificato"}`}>
                  <input value={profile.phone ?? ""} onChange={e => update({ phone: e.target.value })} placeholder="+39…" style={inp} />
                </Field>
              </Row>
              <Row>
                <Field label="CAP">
                  <input value={profile.cap ?? ""} onChange={e => update({ cap: e.target.value })} style={inp} />
                </Field>
                <Field label="Città">
                  <input value={profile.citta ?? ""} onChange={e => update({ citta: e.target.value })} style={inp} />
                </Field>
              </Row>
              <Field label="Tipo di residente">
                <select value={profile.citizenship_type ?? ""} onChange={e => update({ citizenship_type: e.target.value })} style={inp}>
                  <option value="">— scegli —</option>
                  {CITIZENSHIP.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                </select>
              </Field>
            </Section>

            {/* Preferenze */}
            <Section title="Preferenze">
              <Row>
                <Field label="Lingua del sito">
                  <select value={profile.preferred_lang} onChange={e => update({ preferred_lang: e.target.value })} style={inp}>
                    {LANG_SITE.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </Field>
                <Field label="Lingua per la voce (Sofia)">
                  <select value={profile.preferred_voice_lang} onChange={e => update({ preferred_voice_lang: e.target.value })} style={inp}>
                    {LANG_VOICE.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </Field>
              </Row>

              <Field label="Colore dell'ORB (Sofia voice)">
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  {ORB_COLORS.map(c => {
                    const active = profile.preferred_orb_color === c.v;
                    return (
                      <button
                        key={c.v}
                        type="button"
                        onClick={() => update({ preferred_orb_color: c.v })}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          padding: "10px 14px", border: active ? "1.5px solid var(--ink, #13110F)" : "1px solid var(--paper-line, #d6d3cd)",
                          borderRadius: 8, background: active ? "white" : "transparent", cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: `radial-gradient(circle at 30% 30%, ${c.hex} 0%, ${c.hex}aa 60%, ${c.hex}33 100%)`,
                          boxShadow: `0 0 12px ${c.hex}44`,
                        }} />
                        <span style={{ fontSize: 11, color: "var(--ink-2, #2b2724)" }}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            {/* Save button */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
              <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvo…" : "Salva impostazioni"}
              </button>
              {savedAt && <span style={{ fontSize: 12, color: "var(--alloro, #5a7a3a)" }}>✓ Salvato</span>}
            </div>

            {/* Danger zone */}
            <Section title="Account" danger>
              <div style={{ background: "#fdf2f2", border: "1px solid #f5c2c2", borderRadius: 6, padding: 16 }}>
                <strong style={{ color: "#9b1c1c" }}>Elimina account</strong>
                <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6, marginBottom: 12 }}>
                  L&apos;account verrà disattivato (soft-delete). I tuoi dati restano per 30 giorni per consentire il ripristino contattando il supporto.
                  Le conversazioni vengono mantenute per obblighi normativi (vedi <a href="/privacy" style={{ color: "var(--vermiglio, #c64227)" }}>privacy policy</a>).
                </p>
                <button onClick={deleteAccount} style={btnDanger}>Elimina account</button>
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: "var(--serif, 'Instrument Serif', serif)", fontSize: 22, margin: "0 0 14px",
        color: danger ? "#9b1c1c" : "var(--ink, #13110F)",
      }}>
        {title}
      </h2>
      <div style={cardStyle}>
        {children}
      </div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
      <span style={{ fontSize: 11, opacity: 0.65, fontFamily: "var(--mono, ui-monospace, monospace)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white", border: "1px solid var(--paper-line, #e8e6e0)", borderRadius: 8, padding: 22,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid var(--paper-line, #d6d3cd)", borderRadius: 6,
  fontSize: 13.5, fontFamily: "inherit", background: "#fafaf8", outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--ink, #13110F)", color: "white", border: "none", borderRadius: 6,
  padding: "10px 18px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
};
const btnDanger: React.CSSProperties = {
  background: "#9b1c1c", color: "white", border: "none", borderRadius: 6,
  padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
};
const errBox: React.CSSProperties = {
  marginBottom: 14, padding: 10, background: "#fdf2f2", color: "#9b1c1c", borderRadius: 6, fontSize: 12.5,
};
