/**
 * Handoff design system — Onboarding screen (02) (SER-209).
 * Ported from norma-ai-test-template/project/components/Onboarding.jsx.
 *
 * Branch per role:
 * - cittadino / cittadino-pro / professionista: 4 step (role -> profilo -> goal -> otp)
 * - avvocato: 7 step (role -> profilo prof -> spec -> tools -> obiettivi -> directory -> otp)
 * - impresa: 5 step (role -> size -> dati -> referente -> otp)
 *
 * Wire: localStorage per ora (template behavior); Supabase auth in commit
 * successivo. SKIP button (giallo) mantenuto per testing fino a wire backend.
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Logo, Stamp, Badge, SectionLabel } from "./atoms";

type Role = "cittadino" | "cittadino-pro" | "avvocato" | "professionista" | "impresa";

type Profile = {
  nome: string; email: string; cellulare: string;
  cap: string; citta: string; regione: string;
  situazione: string; problemi: string[];
};

type Avv = {
  nome: string; email: string; cellulare: string;
  piva: string; studio: string; ordine: string; foro: string;
  iscrizione: string; anni: string; studioSize: string;
  specializzazioni: string[];
  tools: string[]; toolOther: string;
  obiettivi: string[];
  cittaStudio: string; bio: string; tariffa: string; foto: File | null;
  linkedin: string; facebook: string; instagram: string; x: string;
};

type Imp = {
  dimensione: "micro" | "piccola" | "media" | "";
  ragione: string; piva: string; email: string; telefono: string;
  ateco: string; dipendenti: string; regolamentato: "si" | "no" | null;
  refNome: string; refEmail: string; refRuolo: string; refDpo: "si" | "no" | null;
};

// ── Atoms ────────────────────────────────────────────────────────────────

function OLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="mono"
      style={{
        display: "block",
        fontSize: 10,
        letterSpacing: "0.14em",
        color: "var(--ink-3)",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      {children}
    </label>
  );
}

interface OFieldProps {
  label: string;
  val: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  autoFilled?: boolean;
  maxLength?: number;
}

function OField({ label, val, onChange, placeholder, type = "text", required, disabled, autoFilled, maxLength }: OFieldProps) {
  return (
    <div>
      <OLabel>
        {label}
        {required && <span style={{ color: "var(--vermiglio)", marginLeft: 4 }}>*</span>}
      </OLabel>
      <div style={{ position: "relative", marginTop: 8 }}>
        <input
          type={type}
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          style={{
            width: "100%",
            padding: "13px 16px",
            border: `1px solid ${val ? "var(--ink)" : "var(--paper-line)"}`,
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "var(--sans)",
            background: disabled ? "var(--paper-2)" : "white",
            outline: "none",
            color: disabled ? "var(--ink-3)" : "var(--ink)",
            paddingRight: autoFilled ? 40 : 16,
          }}
        />
        {autoFilled && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--alloro)" }}>
            <Icon name="check" size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

// ── STEP 1: Role picker ──────────────────────────────────────────────────

function Step1Role({ role, setRole }: { role: Role | null; setRole: (r: Role) => void }) {
  const tiers: { id: Role; tag: string; name: string; price: string; priceSub: string; desc: string; icon: IconName; highlight?: boolean; features: string[] }[] = [
    { id: "cittadino", tag: "Per iniziare", name: "Cittadino", price: "Gratis", priceSub: "10 consult./mese",
      desc: "Risposte su lavoro, casa, famiglia, consumo.", icon: "users",
      features: ["10 consultazioni/mese", "Riferimenti normativi", "Archivio base"] },
    { id: "cittadino-pro", tag: "Più popolare", name: "Cittadino PRO", price: "€9", priceSub: "/mese",
      desc: "Illimitate, PDF, firma digitale.", highlight: true, icon: "star",
      features: ["Consultazioni illimitate", "Analisi PDF & contratti", "Firma digitale", "Connettori email/cloud"] },
    { id: "avvocato", tag: "Foro · Albo", name: "Avvocato", price: "€29", priceSub: "/mese",
      desc: "Studio legale · Foro · Marketplace lead.", icon: "scale",
      features: ["Marketplace lead €75/€150", "Profilo directory pubblico", "Redazione atti AI", "Formazione CFP"] },
    { id: "professionista", tag: "Commercialisti & altri", name: "Professionista", price: "€29", priceSub: "/mese",
      desc: "Consulenti, commercialisti, notai.", icon: "briefcase",
      features: ["Profilo pubblico", "Parcelle & progetti", "Organigramma studio", "Business plan AI"] },
    { id: "impresa", tag: "Da 5 a 500+ dip.", name: "Impresa", price: "€29–€499", priceSub: "/mese",
      desc: "Compliance GDPR, 231, sicurezza, lavoro.", icon: "building",
      features: ["Chat compliance", "Checklist GDPR/231", "Analisi contratti", "Team & seat"] },
  ];

  return (
    <div>
      <SectionLabel>Piani</SectionLabel>
      <h1 className="serif" style={{ fontSize: 52, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Chi è Lei, <em style={{ color: "var(--vermiglio)" }}>per NormaAI?</em>
      </h1>
      <p style={{ fontSize: 16, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 600 }}>
        Scelga il piano più adatto. Potrà cambiarlo in ogni momento.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {tiers.map((t) => {
          const active = role === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setRole(t.id)}
              style={{
                background: active ? "white" : "var(--paper-tint)",
                border: active ? "2px solid var(--ink)" : "1px solid var(--paper-line)",
                margin: active ? 0 : 1,
                borderRadius: 10,
                padding: "20px 18px",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.2s ease",
                transform: active ? "translateY(-4px)" : "none",
                boxShadow: active ? "var(--shadow-3)" : "none",
              }}
            >
              {t.highlight && (
                <div style={{ position: "absolute", top: -10, right: 14 }}>
                  <Stamp color="var(--vermiglio)" rotate={2}>
                    Consigliato
                  </Stamp>
                </div>
              )}
              <div style={{ color: active ? "var(--vermiglio)" : "var(--ink-3)", marginBottom: 8 }}>
                <Icon name={t.icon} size={22} />
              </div>
              <div className="caps" style={{ color: active ? "var(--vermiglio-ink)" : "var(--ink-4)" }}>
                {t.tag}
              </div>
              <div className="serif" style={{ fontSize: 24, marginTop: 6, letterSpacing: "-0.02em" }}>
                {t.name}
              </div>

              <div style={{ margin: "14px 0 10px", display: "flex", alignItems: "baseline", gap: 5 }}>
                <span className="serif" style={{ fontSize: t.price.length > 4 ? 22 : 32, lineHeight: 1 }}>
                  {t.price}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{t.priceSub}</span>
              </div>

              <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.45, minHeight: 48 }}>{t.desc}</div>
              <hr className="rule" style={{ margin: "14px 0" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--ink-2)", padding: "3px 0", lineHeight: 1.4 }}>
                    <span style={{ color: "var(--vermiglio)", flexShrink: 0, paddingTop: 2 }}>
                      <Icon name="check" size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div
                style={{
                  marginTop: 16,
                  padding: 8,
                  textAlign: "center",
                  border: active ? "1px solid var(--ink)" : "1px dashed var(--paper-line)",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--paper)" : "var(--ink-4)",
                  borderRadius: 6,
                  fontFamily: "var(--mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {active ? <>✓ Selezionato</> : "Seleziona"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CITTADINO STEP 2 ──────────────────────────────────────────────────────

function Step2Profile({
  profile,
  setProfile,
  handleCap,
  toggleProblema,
  problemi,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  handleCap: (cap: string) => void;
  toggleProblema: (p: string) => void;
  problemi: string[];
}) {
  return (
    <div>
      <SectionLabel>I Suoi dati</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Si presenti, <em style={{ color: "var(--vermiglio)" }}>in breve.</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 600 }}>
        Queste informazioni restano private. Servono per personalizzare le Sue risposte legali.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <OField label="Nome e Cognome" val={profile.nome} onChange={(v) => setProfile({ ...profile, nome: v })} placeholder="Marco Rossi" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <OField label="Email" val={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} placeholder="marco@email.it" type="email" required />
            <OField label="Cellulare" val={profile.cellulare} onChange={(v) => setProfile({ ...profile, cellulare: v })} placeholder="+39 333 1234567" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 14 }}>
            <OField label="CAP" val={profile.cap} onChange={handleCap} placeholder="20121" maxLength={5} required />
            <OField label="Città" val={profile.citta} onChange={() => {}} placeholder="Auto" disabled autoFilled={!!profile.citta} />
            <OField label="Regione" val={profile.regione} onChange={() => {}} placeholder="Auto" disabled autoFilled={!!profile.regione} />
          </div>
          <div>
            <OLabel>La Sua situazione</OLabel>
            <div style={{ position: "relative", marginTop: 8 }}>
              <select
                value={profile.situazione}
                onChange={(e) => setProfile({ ...profile, situazione: e.target.value })}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: `1px solid ${profile.situazione ? "var(--ink)" : "var(--paper-line)"}`,
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "var(--sans)",
                  background: "white",
                  outline: "none",
                  color: profile.situazione ? "var(--ink)" : "var(--ink-4)",
                  appearance: "none",
                  paddingRight: 36,
                }}
              >
                <option value="">Scelga dalla lista…</option>
                {["Dipendente", "Libero professionista", "Imprenditore", "Pensionato", "Studente", "Disoccupato", "Casalingo", "Altro"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-4)" }}>
                <Icon name="arrowDown" size={14} />
              </div>
            </div>
          </div>
        </div>
        <div>
          <OLabel>Negli ultimi 10 anni ha avuto problemi con:</OLabel>
          <p style={{ fontSize: 12, color: "var(--ink-4)", margin: "4px 0 14px" }}>Selezione multipla. Personalizzeremo la Sua dashboard.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {problemi.map((p) => {
              const selected = profile.problemi.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProblema(p)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 20,
                    border: selected ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                    background: selected ? "var(--ink)" : "white",
                    color: selected ? "var(--paper)" : "var(--ink-2)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  {selected && <Icon name="check" size={12} />}
                  {p}
                </button>
              );
            })}
          </div>
          {profile.problemi.length > 0 && !profile.problemi.includes("Nessuno") && (
            <div style={{ marginTop: 20, padding: 14, background: "var(--paper-tint)", border: "1px dashed var(--paper-line)", borderRadius: 6 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--vermiglio-ink)", textTransform: "uppercase", marginBottom: 6 }}>
                § Anteprima dashboard
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
                Creeremo {profile.problemi.length} sezione{profile.problemi.length > 1 ? "i" : ""} dedicate nella Sua sidebar:{" "}
                <strong>{profile.problemi.join(" · ")}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CITTADINO STEP 3 ──────────────────────────────────────────────────────

function Step3Goal({ goal, setGoal }: { goal: string | null; setGoal: (g: string) => void }) {
  const goals: { id: string; title: string; desc: string; icon: IconName }[] = [
    { id: "diritti", title: "Capire i miei diritti", desc: "Voglio sapere cosa posso fare, legalmente, in una situazione.", icon: "book" },
    { id: "risolvere", title: "Risolvere un problema ora", desc: "Ho un problema concreto e mi serve aiuto subito.", icon: "bolt" },
    { id: "aggiornato", title: "Tenermi aggiornato", desc: "Voglio seguire scadenze e novità normative che mi riguardano.", icon: "clock" },
    { id: "professionista", title: "Trovare un professionista", desc: "Mi serve un avvocato o commercialista di fiducia.", icon: "users" },
  ];
  return (
    <div>
      <SectionLabel>Obiettivo</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Cosa vuole fare <em style={{ color: "var(--vermiglio)" }}>con NormaAI?</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 600 }}>
        Una sola scelta. Ci aiuta a mostrarLe prima le cose che Le servono davvero.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, maxWidth: 900 }}>
        {goals.map((g) => {
          const active = goal === g.id;
          return (
            <label
              key={g.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
                padding: 22,
                border: active ? "2px solid var(--ink)" : "1px solid var(--paper-line)",
                margin: active ? 0 : 1,
                background: active ? "var(--paper-tint)" : "white",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input type="radio" name="goal" checked={active} onChange={() => setGoal(g.id)} style={{ position: "absolute", opacity: 0 }} />
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: active ? "6px solid var(--vermiglio)" : "1px solid var(--paper-line)",
                  background: active ? "var(--paper)" : "white",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: active ? "var(--vermiglio)" : "var(--ink-3)" }}>
                    <Icon name={g.icon} size={18} />
                  </span>
                  <span className="serif" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                    {g.title}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.5, marginLeft: 28 }}>{g.desc}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── AVVOCATO STEP 2 — Profilo professionale ──────────────────────────────

function AvvStep2({ avv, setAvv, handlePiva }: { avv: Avv; setAvv: (a: Avv) => void; handlePiva: (v: string) => void }) {
  const set = (k: keyof Avv) => (v: string) => setAvv({ ...avv, [k]: v });
  const fori = ["Milano", "Roma", "Torino", "Napoli", "Bologna", "Firenze", "Genova", "Palermo", "Bari", "Venezia", "Verona", "Brescia"];
  return (
    <div>
      <SectionLabel>Profilo professionale</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Il Suo <em style={{ color: "var(--vermiglio)" }}>profilo professionale.</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 640 }}>
        Verificheremo l&apos;iscrizione all&apos;albo prima di pubblicare il Suo profilo nella directory.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OField label="Nome e Cognome" val={avv.nome} onChange={set("nome")} placeholder="Avv. Giulia Mancini" required />
          <OField label="Email professionale" val={avv.email} onChange={set("email")} placeholder="giulia@studiomancini.it" type="email" required />
          <OField label="Cellulare" val={avv.cellulare} onChange={set("cellulare")} placeholder="+39 333 1234567" required />
          <OField label="P.IVA" val={avv.piva} onChange={handlePiva} placeholder="12345678901" maxLength={11} required autoFilled={avv.piva.length === 11} />
          <OField label="Nome Studio" val={avv.studio} onChange={set("studio")} placeholder="Auto-compilato da P.IVA" autoFilled={!!avv.studio && avv.piva.length === 11} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OField label="Ordine" val={avv.ordine} onChange={set("ordine")} placeholder="Ordine degli Avvocati" />
          <div>
            <OLabel>
              Foro di appartenenza <span style={{ color: "var(--vermiglio)", marginLeft: 4 }}>*</span>
            </OLabel>
            <div style={{ position: "relative", marginTop: 8 }}>
              <select
                value={avv.foro}
                onChange={(e) => set("foro")(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: `1px solid ${avv.foro ? "var(--ink)" : "var(--paper-line)"}`,
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "var(--sans)",
                  background: "white",
                  outline: "none",
                  color: avv.foro ? "var(--ink)" : "var(--ink-4)",
                  appearance: "none",
                  paddingRight: 36,
                }}
              >
                <option value="">Scelga il foro…</option>
                {fori.map((f) => (
                  <option key={f} value={f}>
                    Foro di {f}
                  </option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-4)" }}>
                <Icon name="arrowDown" size={14} />
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
            <OField label="N. iscrizione albo" val={avv.iscrizione} onChange={set("iscrizione")} placeholder="A12345" required />
            <OField label="Anni iscrizione" val={avv.anni} onChange={set("anni")} placeholder="12" type="number" required />
          </div>
          <div>
            <OLabel>
              Numero avvocati nello studio <span style={{ color: "var(--vermiglio)", marginLeft: 4 }}>*</span>
            </OLabel>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {["Solo io", "2-5", "6-20", "20+"].map((s) => {
                const selected = avv.studioSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("studioSize")(s)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 6,
                      border: selected ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                      background: selected ? "var(--ink)" : "white",
                      color: selected ? "var(--paper)" : "var(--ink-2)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                      flex: 1,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AVVOCATO STEP 3 — Specializzazioni ───────────────────────────────────

function AvvStep3({ avv, toggle }: { avv: Avv; toggle: (v: string) => void }) {
  const spec = ["Civile", "Penale", "Tributario", "Lavoro", "Amministrativo", "Famiglia", "231/Penale d'impresa", "GDPR", "Commerciale", "Societario", "Esecuzioni", "Multe/Sanzioni"];
  return (
    <div>
      <SectionLabel>Specializzazioni</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Le Sue <em style={{ color: "var(--vermiglio)" }}>aree di pratica.</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Selezioni tutte quelle che esercita abitualmente. Nessun limite.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 900 }}>
        {spec.map((s) => {
          const selected = avv.specializzazioni.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              style={{
                padding: "12px 20px",
                borderRadius: 24,
                border: selected ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                background: selected ? "var(--ink)" : "white",
                color: selected ? "var(--paper)" : "var(--ink-2)",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              {selected && <Icon name="check" size={13} />}
              {s}
            </button>
          );
        })}
      </div>
      {avv.specializzazioni.length > 0 && (
        <div style={{ marginTop: 24, padding: "12px 16px", background: "var(--paper-tint)", border: "1px dashed var(--paper-line)", borderRadius: 6, display: "inline-block" }}>
          <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--vermiglio-ink)", textTransform: "uppercase" }}>
            § {avv.specializzazioni.length} area{avv.specializzazioni.length > 1 ? "e" : ""} selezionat{avv.specializzazioni.length > 1 ? "e" : "a"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── AVVOCATO STEP 4 — Tools ──────────────────────────────────────────────

function AvvStep4({ avv, setAvv, toggle }: { avv: Avv; setAvv: (a: Avv) => void; toggle: (v: string) => void }) {
  const tools = [
    { id: "banche", label: "De Jure / Lex24 / ITALGIUREWEB" },
    { id: "gestionali", label: "Jarvis Legal / LegalProd / SECIB" },
    { id: "word", label: "Solo Word + Excel" },
    { id: "altro", label: "Altro gestionale" },
    { id: "nessuno", label: "Nessuno" },
  ];
  return (
    <div>
      <SectionLabel>Tools attuali</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Cosa usa già <em style={{ color: "var(--vermiglio)" }}>nel Suo studio?</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Ci aiuta a capire come integrare NormaAI senza farLe cambiare abitudini.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 700 }}>
        {tools.map((t) => {
          const selected = avv.tools.includes(t.id);
          return (
            <label
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                border: selected ? "2px solid var(--ink)" : "1px solid var(--paper-line)",
                margin: selected ? 0 : 1,
                background: selected ? "var(--paper-tint)" : "white",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: selected ? "none" : "1px solid var(--paper-line)",
                  background: selected ? "var(--ink)" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--paper)",
                  flexShrink: 0,
                }}
              >
                {selected && <Icon name="check" size={13} />}
              </div>
              <input type="checkbox" checked={selected} onChange={() => toggle(t.id)} style={{ position: "absolute", opacity: 0 }} />
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{t.label}</span>
              {t.id === "altro" && selected && (
                <input
                  placeholder="Quale?"
                  value={avv.toolOther}
                  onChange={(e) => setAvv({ ...avv, toolOther: e.target.value })}
                  onClick={(e) => e.preventDefault()}
                  style={{
                    marginLeft: "auto",
                    padding: "6px 12px",
                    border: "1px solid var(--paper-line)",
                    borderRadius: 4,
                    fontSize: 13,
                    fontFamily: "var(--sans)",
                    background: "white",
                    outline: "none",
                    width: 180,
                  }}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── AVVOCATO STEP 5 — Obiettivi ──────────────────────────────────────────

function AvvStep5({ avv, toggle }: { avv: Avv; toggle: (v: string) => void }) {
  const obiettivi: { id: string; title: string; desc: string; icon: IconName }[] = [
    { id: "clienti", title: "Trovare nuovi clienti", desc: "Marketplace lead (€75 privato · €150 impresa).", icon: "flame" },
    { id: "ricerca", title: "Ricerca normativa e giurisprudenza", desc: "Fonti ufficiali, giurisprudenza Cassazione, precedenti.", icon: "book" },
    { id: "alert", title: "Alert automatici su novità normative", desc: "Aggiornamenti sulla Sua specializzazione, settimanali.", icon: "clock" },
    { id: "redazione", title: "Redazione atti assistita dall'AI", desc: "Bozze di atti, pareri, contratti — nel Suo stile.", icon: "pen" },
    { id: "pdf", title: "Analisi PDF fascicoli", desc: "Carichi un fascicolo: estraiamo fatti, scadenze, rischi.", icon: "doc" },
  ];
  return (
    <div>
      <SectionLabel>Obiettivi</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Cosa vuole fare <em style={{ color: "var(--vermiglio)" }}>con NormaAI?</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Selezione multipla. La Sua dashboard si adatterà automaticamente.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 1000 }}>
        {obiettivi.map((o) => {
          const selected = avv.obiettivi.includes(o.id);
          return (
            <label
              key={o.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: 20,
                border: selected ? "2px solid var(--ink)" : "1px solid var(--paper-line)",
                margin: selected ? 0 : 1,
                background: selected ? "var(--paper-tint)" : "white",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  marginTop: 3,
                  border: selected ? "none" : "1px solid var(--paper-line)",
                  background: selected ? "var(--ink)" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--paper)",
                  flexShrink: 0,
                }}
              >
                {selected && <Icon name="check" size={13} />}
              </div>
              <input type="checkbox" checked={selected} onChange={() => toggle(o.id)} style={{ position: "absolute", opacity: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: selected ? "var(--vermiglio)" : "var(--ink-3)" }}>
                    <Icon name={o.icon} size={16} />
                  </span>
                  <span className="serif" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
                    {o.title}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginLeft: 26 }}>{o.desc}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── AVVOCATO STEP 6 — Profilo Directory ──────────────────────────────────

function AvvStep6({ avv, setAvv }: { avv: Avv; setAvv: (a: Avv) => void }) {
  const set = (k: keyof Avv) => (v: string) => setAvv({ ...avv, [k]: v });
  const bioMax = 160;
  const socials: { key: keyof Avv; label: string }[] = [
    { key: "linkedin", label: "LinkedIn" },
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "x", label: "X" },
  ];
  return (
    <div>
      <SectionLabel>Profilo directory</SectionLabel>
      <h1 className="serif" style={{ fontSize: 42, margin: "16px 0 6px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Il Suo <em style={{ color: "var(--vermiglio)" }}>profilo pubblico.</em>
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Visibile ai cittadini e alle imprese che cercano un avvocato.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <OField label="Città dello studio" val={avv.cittaStudio} onChange={set("cittaStudio")} placeholder="Torino" required />
          <div>
            <OLabel>Bio breve</OLabel>
            <textarea
              value={avv.bio}
              onChange={(e) => {
                if (e.target.value.length <= bioMax) set("bio")(e.target.value);
              }}
              placeholder="Es. Specializzata in diritto di famiglia e separazioni consensuali. Socia fondatrice."
              style={{
                width: "100%",
                padding: "13px 16px",
                border: `1px solid ${avv.bio ? "var(--ink)" : "var(--paper-line)"}`,
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "var(--sans)",
                background: "white",
                outline: "none",
                color: "var(--ink)",
                minHeight: 100,
                resize: "vertical",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: avv.bio.length > bioMax - 20 ? "var(--vermiglio-ink)" : "var(--ink-4)",
                textAlign: "right",
                marginTop: 4,
                letterSpacing: "0.06em",
              }}
            >
              {avv.bio.length} / {bioMax}
            </div>
          </div>
          <OField label="Tariffa indicativa €/h (opzionale)" val={avv.tariffa} onChange={set("tariffa")} placeholder="150" type="number" />
          <div>
            <OLabel>Foto profilo (opzionale)</OLabel>
            <div
              style={{
                marginTop: 8,
                padding: 16,
                border: "1px dashed var(--paper-line)",
                borderRadius: 6,
                background: "var(--paper-tint)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "white",
                  border: "1px solid var(--paper-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  fontStyle: "italic",
                  color: "var(--ink-4)",
                }}
              >
                {avv.nome
                  ? avv.nome
                      .split(" ")
                      .slice(-2)
                      .map((x) => x[0])
                      .join("")
                  : "§"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Trascini un&apos;immagine o</div>
                <button
                  onClick={(e) => e.preventDefault()}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--vermiglio-ink)",
                    padding: 0,
                    fontSize: 13,
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontFamily: "var(--sans)",
                  }}
                >
                  scelga un file
                </button>
              </div>
            </div>
          </div>
          <div>
            <OLabel>Social (opzionali)</OLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
              {socials.map(({ key, label }) => (
                <input
                  key={key}
                  value={avv[key] as string}
                  onChange={(e) => set(key)(e.target.value)}
                  placeholder={label}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--paper-line)",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontFamily: "var(--sans)",
                    background: "white",
                    outline: "none",
                    color: "var(--ink)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <OLabel>Anteprima directory</OLabel>
          <div style={{ marginTop: 8, background: "white", border: "1px solid var(--paper-line)", borderRadius: 10, padding: 20, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, right: 16 }}>
              <Stamp color="var(--vermiglio)" rotate={2}>
                In verifica
              </Stamp>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--paper-2)",
                  border: "1px solid var(--paper-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontFamily: "var(--serif)",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  flexShrink: 0,
                }}
              >
                {avv.nome
                  ? avv.nome
                      .split(" ")
                      .slice(-2)
                      .map((x) => x[0])
                      .join("")
                  : "§"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{avv.nome || "Avv. Giulia Mancini"}</div>
                <div
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  {avv.cittaStudio || "Città"} {avv.foro && `· Foro di ${avv.foro}`}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(avv.specializzazioni.length ? avv.specializzazioni : ["Le Sue aree"]).slice(0, 4).map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, margin: "0 0 14px", fontFamily: "var(--serif)", fontStyle: "italic" }}>
              « {avv.bio || "La Sua bio apparirà qui."} »
            </p>
            <hr className="rule" style={{ margin: "14px 0" }} />
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-3)" }}>
              {avv.tariffa && <span className="mono">€{avv.tariffa}/h</span>}
              {avv.anni && <span>· {avv.anni} anni di iscrizione</span>}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, background: "var(--ambra-soft)", borderRadius: 6, display: "flex", gap: 12 }}>
            <Icon name="shield" size={18} />
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              <strong>In verifica.</strong> Il profilo apparirà in directory dopo la verifica del numero di iscrizione all&apos;albo (tipicamente 24–48h).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── IMPRESA STEP 2 — Dimensione ──────────────────────────────────────────

function ImpStep2Size({ imp, setImp }: { imp: Imp; setImp: (i: Imp) => void }) {
  const sizes: { id: Imp["dimensione"]; label: string; range: string; price: string; priceSub: string; desc: string; features: string[] }[] = [
    { id: "micro", label: "MICRO", range: "1–9 dipendenti", price: "€29", priceSub: "/mese",
      desc: "Per piccole realtà, artigiani, studi professionali.",
      features: ["Chat compliance base", "Checklist GDPR essenziale", "1 seat incluso"] },
    { id: "piccola", label: "PICCOLA", range: "10–49 dipendenti", price: "€79", priceSub: "/mese",
      desc: "Per PMI con obblighi compliance strutturati.",
      features: ["GDPR + Sicurezza lavoro", "Analisi contratti AI", "5 seat inclusi"] },
    { id: "media", label: "MEDIA", range: "50–249 dipendenti", price: "€199", priceSub: "/mese",
      desc: "Per aziende con compliance 231 e DPO.",
      features: ["GDPR + 231 + DPO", "Audit checklist complete", "15 seat inclusi"] },
  ];
  return (
    <div>
      <SectionLabel>Dimensione azienda</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Quanto è <em style={{ color: "var(--vermiglio)" }}>grande la Sua azienda?</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Il piano si adatta al numero di dipendenti. Potrà cambiarlo in ogni momento.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 1100 }}>
        {sizes.map((s) => {
          const active = imp.dimensione === s.id;
          return (
            <label
              key={s.id}
              onClick={() => setImp({ ...imp, dimensione: s.id })}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 24,
                border: active ? "2px solid var(--ink)" : "1px solid var(--paper-line)",
                margin: active ? 0 : 1,
                background: active ? "white" : "var(--paper-tint)",
                borderRadius: 10,
                cursor: "pointer",
                transform: active ? "translateY(-4px)" : "none",
                boxShadow: active ? "var(--shadow-3)" : "none",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: active ? "6px solid var(--vermiglio)" : "1px solid var(--paper-line)",
                    background: active ? "var(--paper)" : "white",
                    flexShrink: 0,
                  }}
                />
                <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: active ? "var(--vermiglio-ink)" : "var(--ink-4)" }}>
                  {s.label}
                </span>
              </div>
              <input type="radio" name="dimensione" checked={active} onChange={() => {}} style={{ position: "absolute", opacity: 0 }} />
              <div className="serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.01em", marginBottom: 6 }}>
                {s.range}
              </div>
              <div style={{ margin: "10px 0", display: "flex", alignItems: "baseline", gap: 5 }}>
                <span className="serif" style={{ fontSize: 38, lineHeight: 1 }}>
                  {s.price}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-4)" }}>{s.priceSub}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, margin: "4px 0 14px", minHeight: 40 }}>{s.desc}</p>
              <hr className="rule" style={{ margin: "0 0 12px" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {s.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--ink-2)", padding: "3px 0", lineHeight: 1.4 }}>
                    <span style={{ color: "var(--vermiglio)", flexShrink: 0, paddingTop: 2 }}>
                      <Icon name="check" size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── IMPRESA STEP 3 — Dati aziendali ──────────────────────────────────────

function ImpStep3Dati({ imp, setImp, handlePiva }: { imp: Imp; setImp: (i: Imp) => void; handlePiva: (v: string) => void }) {
  const set = (k: keyof Imp) => (v: string) => setImp({ ...imp, [k]: v } as Imp);
  const atecoList = [
    "C — Attività manifatturiere",
    "F — Costruzioni",
    "G — Commercio all'ingrosso e al dettaglio",
    "H — Trasporto e magazzinaggio",
    "I — Servizi alloggio e ristorazione",
    "J — Servizi di informazione e comunicazione",
    "K — Attività finanziarie e assicurative",
    "L — Attività immobiliari",
    "M — Attività professionali, scientifiche e tecniche",
    "N — Noleggio, agenzie di viaggio, servizi alle imprese",
    "P — Istruzione",
    "Q — Sanità e assistenza sociale",
    "Altro",
  ];
  const pivaValid = imp.piva.length === 11;
  return (
    <div>
      <SectionLabel>Dati aziendali</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        I dati <em style={{ color: "var(--vermiglio)" }}>della Sua azienda.</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Verificheremo la P.IVA tramite VIES prima dell&apos;attivazione.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OField label="Ragione sociale" val={imp.ragione} onChange={set("ragione")} placeholder="Acme SRL" required />
          <div>
            <OField label="P.IVA" val={imp.piva} onChange={handlePiva} placeholder="12345678901" maxLength={11} required autoFilled={pivaValid} />
            {pivaValid && (
              <div
                className="mono"
                style={{
                  marginTop: 6,
                  fontSize: 10.5,
                  color: "var(--alloro)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="check" size={11} /> Validata VIES
              </div>
            )}
          </div>
          <OField label="Email aziendale" val={imp.email} onChange={set("email")} placeholder="info@acme.it" type="email" required />
          <OField label="Telefono" val={imp.telefono} onChange={set("telefono")} placeholder="+39 02 1234567" required />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <OLabel>
              Codice ATECO <span style={{ color: "var(--vermiglio)", marginLeft: 4 }}>*</span>
            </OLabel>
            <div style={{ position: "relative", marginTop: 8 }}>
              <select
                value={imp.ateco}
                onChange={(e) => set("ateco")(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: `1px solid ${imp.ateco ? "var(--ink)" : "var(--paper-line)"}`,
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "var(--sans)",
                  background: "white",
                  outline: "none",
                  color: imp.ateco ? "var(--ink)" : "var(--ink-4)",
                  appearance: "none",
                  paddingRight: 36,
                }}
              >
                <option value="">Scelga il settore…</option>
                {atecoList.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-4)" }}>
                <Icon name="arrowDown" size={14} />
              </div>
            </div>
          </div>
          <OField label="Numero dipendenti" val={imp.dipendenti} onChange={set("dipendenti")} placeholder="Es. 25" type="number" required />
          <div>
            <OLabel>
              Settore regolamentato? <span style={{ color: "var(--vermiglio)", marginLeft: 4 }}>*</span>
            </OLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {(["si", "no"] as const).map((v) => {
                const sel = imp.regolamentato === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setImp({ ...imp, regolamentato: v })}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 6,
                      border: sel ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                      background: sel ? "var(--ink)" : "white",
                      color: sel ? "var(--paper)" : "var(--ink-2)",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    {v === "si" ? "Sì" : "No"}
                  </button>
                );
              })}
            </div>
            {imp.regolamentato === "si" && (
              <div
                className="mono"
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  background: "var(--ambra-soft)",
                  borderRadius: 4,
                  fontSize: 10.5,
                  color: "var(--ink-2)",
                  letterSpacing: "0.04em",
                }}
              >
                Attiveremo i moduli di compliance settoriale specifici.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── IMPRESA STEP 4 — Referente compliance ────────────────────────────────

function ImpStep4Referente({ imp, setImp }: { imp: Imp; setImp: (i: Imp) => void }) {
  const set = (k: keyof Imp) => (v: string) => setImp({ ...imp, [k]: v } as Imp);
  return (
    <div>
      <SectionLabel>Referente compliance</SectionLabel>
      <h1 className="serif" style={{ fontSize: 46, margin: "16px 0 10px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
        Chi gestirà <em style={{ color: "var(--vermiglio)" }}>la compliance?</em>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 640 }}>
        Campo opzionale. Può compilarlo ora o in seguito dalle impostazioni azienda.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 900 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OField label="Nome e Cognome" val={imp.refNome} onChange={set("refNome")} placeholder="Es. Laura Bianchi" />
          <OField label="Email" val={imp.refEmail} onChange={set("refEmail")} placeholder="laura@acme.it" type="email" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OField label="Ruolo" val={imp.refRuolo} onChange={set("refRuolo")} placeholder="Es. Responsabile Legal & Compliance" />
          <div>
            <OLabel>È il DPO (Data Protection Officer)?</OLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {(["si", "no"] as const).map((v) => {
                const sel = imp.refDpo === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setImp({ ...imp, refDpo: v })}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 6,
                      border: sel ? "1px solid var(--ink)" : "1px solid var(--paper-line)",
                      background: sel ? "var(--ink)" : "white",
                      color: sel ? "var(--paper)" : "var(--ink-2)",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    {v === "si" ? "Sì" : "No"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 28,
          padding: 16,
          background: "var(--paper-tint)",
          border: "1px dashed var(--paper-line)",
          borderRadius: 6,
          display: "flex",
          gap: 12,
          maxWidth: 900,
        }}
      >
        <Icon name="shield" size={18} />
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
          Il referente riceverà gli alert di compliance, le scadenze e le notifiche di aggiornamento normativo per il Suo settore.
        </div>
      </div>
    </div>
  );
}

// ── Shared STEP OTP ──────────────────────────────────────────────────────

function StepOtp({ email, otp, setOtp }: { email: string; otp: string[]; setOtp: (o: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--paper-tint)",
          border: "1px solid var(--paper-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          color: "var(--vermiglio)",
        }}
      >
        <Icon name="mail" size={32} />
      </div>
      <SectionLabel>Verifica email</SectionLabel>
      <h1 className="serif" style={{ fontSize: 38, margin: "14px 0 10px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        Abbiamo inviato un codice a
        <br />
        <em style={{ color: "var(--vermiglio)" }}>{email || "la Sua email"}</em>
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-3)", margin: "0 0 36px" }}>Inserisca le 6 cifre ricevute. Il codice scade in 10 minuti.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            style={{
              width: 54,
              height: 64,
              textAlign: "center",
              fontFamily: "var(--serif)",
              fontSize: 30,
              border: `1px solid ${d ? "var(--ink)" : "var(--paper-line)"}`,
              borderRadius: 6,
              background: "white",
              outline: "none",
              color: "var(--ink)",
              transition: "all 0.15s ease",
            }}
          />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
        Non ha ricevuto il codice?{" "}
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "var(--vermiglio-ink)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Invia di nuovo
        </button>
      </div>
    </div>
  );
}

// ── Main Onboarding entry ────────────────────────────────────────────────

interface OnboardingProps {
  onComplete?: (data: unknown) => void;
}

export function Onboarding({ onComplete }: OnboardingProps = {}) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);

  const [profile, setProfile] = useState<Profile>({
    nome: "", email: "", cellulare: "", cap: "", citta: "", regione: "",
    situazione: "", problemi: [],
  });
  const [goal, setGoal] = useState<string | null>(null);

  const [avv, setAvv] = useState<Avv>({
    nome: "", email: "", cellulare: "", piva: "", studio: "",
    ordine: "Ordine degli Avvocati", foro: "", iscrizione: "", anni: "", studioSize: "",
    specializzazioni: [],
    tools: [], toolOther: "",
    obiettivi: [],
    cittaStudio: "", bio: "", tariffa: "", foto: null,
    linkedin: "", facebook: "", instagram: "", x: "",
  });

  const [imp, setImp] = useState<Imp>({
    dimensione: "",
    ragione: "", piva: "", email: "", telefono: "", ateco: "", dipendenti: "", regolamentato: null,
    refNome: "", refEmail: "", refRuolo: "", refDpo: null,
  });

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);

  const isAvvocato = role === "avvocato";
  const isImpresa = role === "impresa";
  const totalSteps = isAvvocato ? 7 : isImpresa ? 5 : 4;

  const problemi = [
    "Condominio", "Lavoro", "Tasse", "Affitto", "Separazione/divorzio",
    "Eredità", "Incidente", "Contratti", "Banca", "PA/Comune/Multa", "Nessuno",
  ];

  const capMap: Record<string, { citta: string; regione: string }> = {
    "20121": { citta: "Milano", regione: "Lombardia" },
    "00187": { citta: "Roma", regione: "Lazio" },
    "10121": { citta: "Torino", regione: "Piemonte" },
    "80121": { citta: "Napoli", regione: "Campania" },
    "40121": { citta: "Bologna", regione: "Emilia-Romagna" },
    "50121": { citta: "Firenze", regione: "Toscana" },
  };

  const pivaMap: Record<string, string> = {
    "12345678901": "Studio Legale Mancini & Associati",
    "98765432109": "Studio Rossi Avvocati",
    "11223344556": "Esposito Legal Partners",
  };

  const handleCap = (cap: string) => {
    const match = capMap[cap];
    setProfile((p) => ({ ...p, cap, citta: match ? match.citta : p.citta, regione: match ? match.regione : p.regione }));
  };

  const handlePiva = (piva: string) => {
    const clean = piva.replace(/\D/g, "").slice(0, 11);
    const match = pivaMap[clean] || (clean.length === 11 ? `Studio Legale ${clean.slice(-4)}` : "");
    setAvv((a) => ({ ...a, piva: clean, studio: match || a.studio }));
  };

  const toggleProblema = (p: string) => {
    setProfile((prev) => {
      if (p === "Nessuno") return { ...prev, problemi: prev.problemi.includes("Nessuno") ? [] : ["Nessuno"] };
      const filtered = prev.problemi.filter((x) => x !== "Nessuno");
      return { ...prev, problemi: filtered.includes(p) ? filtered.filter((x) => x !== p) : [...filtered, p] };
    });
  };

  const toggleArr = (key: "specializzazioni" | "tools" | "obiettivi", val: string) => {
    setAvv((prev) => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const handleImpPiva = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 11);
    setImp((i) => ({ ...i, piva: clean }));
  };

  // Validation
  let canNext = false;
  if (isImpresa) {
    canNext =
      step === 1 ? !!role :
      step === 2 ? !!imp.dimensione :
      step === 3 ? !!(imp.ragione && imp.piva.length === 11 && imp.email && imp.telefono && imp.ateco && imp.dipendenti && imp.regolamentato !== null) :
      step === 4 ? true :
      step === 5 ? otp.every((d) => d !== "") : false;
  } else if (isAvvocato) {
    canNext =
      step === 1 ? !!role :
      step === 2 ? !!(avv.nome && avv.email && avv.cellulare && avv.piva.length === 11 && avv.studio && avv.foro && avv.iscrizione && avv.anni && avv.studioSize) :
      step === 3 ? avv.specializzazioni.length > 0 :
      step === 4 ? avv.tools.length > 0 :
      step === 5 ? avv.obiettivi.length > 0 :
      step === 6 ? !!(avv.cittaStudio && avv.bio) :
      step === 7 ? otp.every((d) => d !== "") : false;
  } else {
    canNext =
      step === 1 ? !!role :
      step === 2 ? !!(profile.nome && profile.email && profile.cellulare && profile.cap && profile.situazione && profile.problemi.length > 0) :
      step === 3 ? !!goal :
      step === 4 ? otp.every((d) => d !== "") : false;
  }

  const handleNext = () => {
    if (!canNext) return;
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }
    const data = isAvvocato
      ? { role, avv, registered: true }
      : isImpresa
      ? { role, imp, registered: true }
      : { role, profile, goal, registered: true };
    try {
      localStorage.setItem("norma.user", JSON.stringify(data));
    } catch {}
    onComplete?.(data);
  };

  // TODO: RIMUOVERE PRIMA DI PROD — bypass testing
  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }
    const data = isAvvocato
      ? { role: role || "avvocato", avv, registered: true }
      : isImpresa
      ? { role: role || "impresa", imp, registered: true }
      : { role: role || "cittadino", profile, goal, registered: true };
    try {
      localStorage.setItem("norma.user", JSON.stringify(data));
    } catch {}
    onComplete?.(data);
  };

  useEffect(() => {
    if (step > totalSteps) setStep(totalSteps);
  }, [totalSteps, step]);

  const labels = isAvvocato
    ? ["Scelga il ruolo", "Profilo professionale", "Specializzazioni", "Tools attuali", "Obiettivi", "Profilo directory", "Verifica email"]
    : isImpresa
    ? ["Scelga il ruolo", "Dimensione", "Dati aziendali", "Referente compliance", "Verifica email"]
    : ["Scelga il ruolo", "I Suoi dati", "Il Suo obiettivo", "Verifica email"];

  return (
    <div
      data-design="handoff"
      className="grain"
      style={{ minHeight: "100vh", height: "100vh", overflow: "auto", background: "var(--paper)", position: "relative" }}
    >
      {/* TODO: RIMUOVERE IN PROD — skip button per testing */}
      <button
        onClick={handleSkip}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          padding: "6px 12px",
          background: "#FDE047",
          border: "1px solid #EAB308",
          borderRadius: 4,
          fontFamily: "var(--mono, ui-monospace, monospace)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "#422006",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FACC15")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FDE047")}
      >
        SKIP →
      </button>

      <header
        style={{
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--paper-line)",
          position: "sticky",
          top: 0,
          background: "var(--paper)",
          zIndex: 10,
        }}
      >
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-4)", textTransform: "uppercase" }}>
            PASSO {step} DI {totalSteps}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 2,
                  background: i + 1 <= step ? "var(--vermiglio)" : "var(--paper-line)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 40px 80px" }}>
        {step === 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              background: "var(--ink)",
              color: "var(--paper)",
              borderRadius: 10,
              marginBottom: 32,
            }}
          >
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", color: "var(--vermiglio)", lineHeight: 1 }}>§</div>
            <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>
              <strong>Ha usato le 10 consultazioni gratuite.</strong>{" "}
              <span style={{ color: "var(--ink-5)" }}>Per continuare, crei un account — servono 2 minuti.</span>
            </div>
            <Stamp color="var(--vermiglio)">Limite raggiunto</Stamp>
          </div>
        )}

        {step === 1 && <Step1Role role={role} setRole={setRole} />}

        {!isAvvocato && !isImpresa && step === 2 && (
          <Step2Profile profile={profile} setProfile={setProfile} handleCap={handleCap} toggleProblema={toggleProblema} problemi={problemi} />
        )}
        {!isAvvocato && !isImpresa && step === 3 && <Step3Goal goal={goal} setGoal={setGoal} />}
        {!isAvvocato && !isImpresa && step === 4 && <StepOtp email={profile.email} otp={otp} setOtp={setOtp} />}

        {isImpresa && step === 2 && <ImpStep2Size imp={imp} setImp={setImp} />}
        {isImpresa && step === 3 && <ImpStep3Dati imp={imp} setImp={setImp} handlePiva={handleImpPiva} />}
        {isImpresa && step === 4 && <ImpStep4Referente imp={imp} setImp={setImp} />}
        {isImpresa && step === 5 && <StepOtp email={imp.email} otp={otp} setOtp={setOtp} />}

        {isAvvocato && step === 2 && <AvvStep2 avv={avv} setAvv={setAvv} handlePiva={handlePiva} />}
        {isAvvocato && step === 3 && <AvvStep3 avv={avv} toggle={(v) => toggleArr("specializzazioni", v)} />}
        {isAvvocato && step === 4 && <AvvStep4 avv={avv} setAvv={setAvv} toggle={(v) => toggleArr("tools", v)} />}
        {isAvvocato && step === 5 && <AvvStep5 avv={avv} toggle={(v) => toggleArr("obiettivi", v)} />}
        {isAvvocato && step === 6 && <AvvStep6 avv={avv} setAvv={setAvv} />}
        {isAvvocato && step === 7 && <StepOtp email={avv.email} otp={otp} setOtp={setOtp} />}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 40,
            paddingTop: 28,
            borderTop: "1px solid var(--paper-line)",
          }}
        >
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className="btn btn-ghost"
            style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? "none" : "auto" }}
          >
            ← Indietro
          </button>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--ink-4)", textTransform: "uppercase" }}>
            {labels[step - 1]}
          </div>
          <button
            onClick={handleNext}
            className={canNext ? "btn btn-accent" : "btn btn-ghost"}
            style={{ padding: "12px 22px", opacity: canNext ? 1 : 0.5, cursor: canNext ? "pointer" : "not-allowed" }}
            disabled={!canNext}
          >
            {step === totalSteps ? "Conferma e accedi" : "Continua"} <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
