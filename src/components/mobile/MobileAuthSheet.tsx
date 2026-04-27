"use client";

/**
 * MobileAuthSheet — bottom-sheet auth (login + signup) for the mobile flow.
 *
 * Used by:
 *   - mobile/page.tsx menu "Accedi al tuo account"
 *   - mobile/chat/page.tsx 402-paywall "Registrati gratis"
 *   - mobile/leads/page.tsx "Accedi" CTA
 *
 * Mirrors the auth logic of the desktop ModalCittadino/Professionista/Impresa
 * but in mobile-first chrome (bottom sheet, large touch targets, no animations
 * during keyboard open). After a successful auth the sheet closes; the parent
 * page detects the new auth state via Supabase's onAuthStateChange listener
 * (or a forced router.refresh() on close).
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, User, Briefcase, Building2, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";
type RoleId = "privato" | "professionista" | "impresa";

const ROLES: { id: RoleId; label: string; icon: LucideIcon; sub: string }[] = [
  { id: "privato",        label: "Cittadino",       icon: User,       sub: "Gratis · 10 query/giorno" },
  { id: "professionista", label: "Professionista",  icon: Briefcase,  sub: "€29/mese · 14gg trial" },
  { id: "impresa",        label: "Impresa",         icon: Building2,  sub: "Da €29/mese · 7gg trial" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  initialRole?: RoleId;
  /** Called after successful login or signup. Defaults to a router.refresh(). */
  onSuccess?: () => void;
}

export function MobileAuthSheet({
  open,
  onClose,
  initialMode = "signup",
  initialRole = "privato",
  onSuccess,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<RoleId>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const supabase = createClient();

  const handleSuccess = useCallback(() => {
    onClose();
    if (onSuccess) onSuccess();
    else router.refresh();
  }, [onClose, onSuccess, router]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Email e password obbligatorie.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError("Email o password non corretti.");
    else handleSuccess();
    setLoading(false);
  }

  async function handleSignup() {
    setError("");
    if (!name.trim()) { setError("Inserisci il tuo nome."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Inserisci un'email valida."); return;
    }
    if (password.length < 8) { setError("Password minimo 8 caratteri."); return; }
    if (!consentPrivacy)    { setError("Devi accettare Privacy e Termini."); return; }

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          role,
          consent_privacy_policy: true,
          consent_terms: true,
          consent_timestamp: new Date().toISOString(),
        },
      },
    });
    setLoading(false);

    if (err) {
      setError(err.message.includes("already")
        ? "Questa email è già registrata. Accedi invece di registrarti."
        : err.message);
      return;
    }
    if (data.user && data.session) {
      // Email confirmation disabled → user is already authed. Go straight in.
      handleSuccess();
    } else {
      // Email confirmation required by Supabase project setting.
      setSignupSent(true);
    }
  }

  async function handleForgot() {
    if (!email.trim()) { setError("Inserisci la tua email per reset."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // ?desktop=1 bypasses the mobile-UA middleware redirect so the user
      // lands on the reset-password form page instead of being bounced to /mobile.
      redirectTo: `${window.location.origin}/reset-password?desktop=1`,
    });
    setLoading(false);
    if (err) setError("Errore invio email. Riprova.");
    else setResetSent(true);
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(26,24,20,0.55)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--paper)",
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          maxHeight: "92dvh",
          overflowY: "auto",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: "var(--paper-3)", borderRadius: 2, margin: "0 auto 14px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 22 }}>
            {mode === "signup" ? "Crea il tuo account" : "Accedi"}
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            style={{ border: "none", background: "transparent", padding: 6, cursor: "pointer" }}
          >
            <X size={18} color="var(--ink-3)" />
          </button>
        </div>

        {/* Mode switch */}
        <div style={{
          display: "flex", gap: 4, padding: 3,
          background: "var(--paper-2)", borderRadius: 10, marginBottom: 18,
        }}>
          {(["signup", "login"] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setSignupSent(false); setResetSent(false); }}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 7,
                border: "none",
                background: mode === m ? "var(--paper)" : "transparent",
                fontFamily: "var(--sans)", fontSize: 13.5,
                fontWeight: mode === m ? 600 : 400,
                color: mode === m ? "var(--ink)" : "var(--ink-3)",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {m === "signup" ? "Registrati" : "Login"}
            </button>
          ))}
        </div>

        {/* Signup confirmation OR reset confirmation */}
        {signupSent ? (
          <SuccessMessage
            title="Controlla la tua email"
            body="Ti abbiamo mandato un link di conferma. Cliccalo e poi torna qui per iniziare."
            onClose={onClose}
          />
        ) : resetSent ? (
          <SuccessMessage
            title="Email di reset inviata"
            body="Controlla la posta e segui il link per reimpostare la password."
            onClose={onClose}
          />
        ) : (
          <>
            {/* Role picker — only for signup */}
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <Label>Sono un...</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {ROLES.map((r) => {
                    const active = role === r.id;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "11px 12px", borderRadius: 10,
                          border: active ? "1.5px solid var(--ink)" : "1px solid var(--paper-line)",
                          background: active ? "var(--paper-2)" : "transparent",
                          cursor: "pointer", textAlign: "left",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <Icon size={18} color={active ? "var(--vermiglio)" : "var(--ink-3)"} strokeWidth={1.6} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontFamily: "var(--sans)", color: "var(--ink)", fontWeight: 500 }}>
                            {r.label}
                          </div>
                          <div style={{ fontSize: 11.5, fontFamily: "var(--sans)", color: "var(--ink-3)", marginTop: 1 }}>
                            {r.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form */}
            {mode === "signup" && (
              <Field label="Nome">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  autoCapitalize="words"
                />
              </Field>
            )}

            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.it"
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Minimo 8 caratteri" : "La tua password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </Field>

            {/* Privacy consent — signup only */}
            {mode === "signup" && (
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, marginBottom: 14,
                cursor: "pointer", fontSize: 12, lineHeight: 1.4, color: "var(--ink-2)",
                fontFamily: "var(--sans)",
              }}>
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--vermiglio)" }}
                />
                <span>
                  Accetto la <a href="/privacy" target="_blank" style={{ color: "var(--vermiglio)", textDecoration: "underline" }}>Privacy Policy</a>{" "}
                  e i <a href="/termini" target="_blank" style={{ color: "var(--vermiglio)", textDecoration: "underline" }}>Termini</a>
                </span>
              </label>
            )}

            {/* Forgot password — login only */}
            {mode === "login" && (
              <button
                onClick={handleForgot}
                disabled={loading}
                style={{
                  background: "transparent", border: "none",
                  fontSize: 12, color: "var(--ink-3)",
                  fontFamily: "var(--sans)", cursor: "pointer",
                  textDecoration: "underline", marginBottom: 12,
                }}
              >
                Password dimenticata?
              </button>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: "10px 12px", marginBottom: 12,
                background: "rgba(212,74,42,0.08)",
                border: "1px solid rgba(212,74,42,0.25)",
                borderRadius: 8,
                fontSize: 13, color: "var(--vermiglio-ink)",
                fontFamily: "var(--sans)", lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={mode === "signup" ? handleSignup : handleLogin}
              disabled={loading}
              style={{
                width: "100%", padding: "14px",
                borderRadius: 10, border: "none",
                background: loading ? "var(--paper-3)" : "var(--vermiglio)",
                color: loading ? "var(--ink-4)" : "white",
                fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {loading ? "Attendi..." : mode === "signup" ? "Crea account" : "Accedi"}
            </button>

            <p style={{
              fontSize: 11, color: "var(--ink-4)", marginTop: 10,
              textAlign: "center", lineHeight: 1.45, fontFamily: "var(--sans)",
            }}>
              {mode === "signup"
                ? "Già registrato? Tocca Login in alto."
                : "Nuovo qui? Tocca Registrati in alto."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono" style={{
      fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)",
      textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Label>{label}</Label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "11px 12px",
        background: "var(--paper-2)",
        border: "1px solid var(--paper-line)",
        borderRadius: 8,
        fontFamily: "var(--sans)",
        fontSize: 15,
        color: "var(--ink)",
        outline: "none",
        WebkitAppearance: "none",
      }}
    />
  );
}

function SuccessMessage({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <div style={{ padding: "12px 0 20px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 20, color: "var(--alloro)", marginBottom: 8 }}>
        {title}
      </div>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 18 }}>
        {body}
      </p>
      <button
        onClick={onClose}
        style={{
          width: "100%", padding: "12px",
          borderRadius: 10, border: "1px solid var(--paper-line)",
          background: "transparent", color: "var(--ink-2)",
          fontFamily: "var(--sans)", fontSize: 14, cursor: "pointer",
        }}
      >
        Chiudi
      </button>
    </div>
  );
}
