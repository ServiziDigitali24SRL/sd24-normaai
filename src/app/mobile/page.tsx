"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Menu, PhoneOff, Check, Globe, LogOut } from "lucide-react";
import { MobileOrb, ListeningDots } from "@/components/mobile/MobileOrb";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileAuthSheet } from "@/components/mobile/MobileAuthSheet";
import { useMobileVoice } from "@/hooks/useMobileVoice";
import { createClient } from "@/lib/supabase-browser";
import {
  ORB_PERSONALITIES,
  type OrbPersonalityId,
  type SupportedLang,
  SUPPORTED_LANGS,
  langLabel,
  detectLanguage,
  ORB_PERSONALITY_KEY,
  LANG_OVERRIDE_KEY,
} from "@/lib/orb-personalities";

/* ── Pro query button (9€) ──────────────────────────────────────────────── */
function ProQueryButton({ question }: { question: string }) {
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setPayError(null);
    try {
      const res = await fetch("/api/mobile/pay-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error ?? "Errore. Riprova tra qualche secondo.");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPayError("Pagamento non disponibile al momento. Riprova.");
        setLoading(false);
      }
    } catch {
      setPayError("Connessione persa. Controlla la rete e riprova.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 10,
          border: "none",
          background: loading ? "var(--paper-2)" : "var(--ink)",
          color: loading ? "var(--ink-3)" : "var(--paper)",
          fontFamily: "var(--sans)",
          fontSize: 14,
          fontWeight: 500,
          cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {loading ? "Apertura pagamento..." : (
          <>
            <span className="mono" style={{ fontSize: 13, color: "var(--vermiglio)", background: "rgba(212,74,42,0.15)", padding: "2px 6px", borderRadius: 4 }}>9€</span>
            Chiedi a un Professionista
          </>
        )}
      </button>
      {payError && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(212,74,42,0.08)",
          border: "1px solid rgba(212,74,42,0.25)",
          borderRadius: 8,
          fontSize: 12.5, color: "var(--vermiglio-ink)",
          fontFamily: "var(--sans)", lineHeight: 1.4,
        }}>
          {payError}
        </div>
      )}
    </div>
  );
}

/* ── Main Mobile Home Page ──────────────────────────────────────────────── */
export default function MobilePage() {
  // The picked personality drives both the orb visuals AND the Vapi assistant
  // ID resolved inside useMobileVoice.
  const [personality, setPersonality] = useState<OrbPersonalityId>("classico");

  // For "globo" the active language can be overridden manually; null = auto-detect.
  const [langOverride, setLangOverride] = useState<SupportedLang | null>(null);
  const [detectedLang, setDetectedLang] = useState<SupportedLang>("it");

  const {
    orbState,
    callActive,
    tapOrb,
    lastQuestion,
    voiceError,
    clearVoiceError,
  } = useMobileVoice(personality);

  const [showMenu, setShowMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  // null = loading, undefined-ish handled via separate flag
  const [authedUser, setAuthedUser] = useState<{ email: string | null; name: string } | null>(null);
  const [paymentToast, setPaymentToast] = useState<string | null>(null);
  const router = useRouter();

  // Auth state + payment toast + personality restore on mount.
  useEffect(() => {
    // 1. Restore personality + lang
    try {
      const saved = localStorage.getItem(ORB_PERSONALITY_KEY) as OrbPersonalityId | null;
      const legacy = localStorage.getItem("norma_orb_style") as OrbPersonalityId | null;
      const pick = saved || legacy;
      if (pick && ORB_PERSONALITIES.some((p) => p.id === pick)) setPersonality(pick);
      const lang = localStorage.getItem(LANG_OVERRIDE_KEY) as SupportedLang | null;
      if (lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)) setLangOverride(lang);
      setDetectedLang(detectLanguage());
    } catch { /* localStorage may be blocked */ }

    // 2. Check auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthedUser({
          email: data.user.email ?? null,
          name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.nome ?? data.user.email?.split("@")[0] ?? "",
        });
      }
    });

    // 3. Payment success/cancel toast
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setPaymentToast("✓ Richiesta inviata! Un professionista ti risponderà a breve.");
      // Clean URL without reload
      window.history.replaceState({}, "", "/mobile");
    } else if (payment === "cancelled") {
      setPaymentToast("Pagamento annullato.");
      window.history.replaceState({}, "", "/mobile");
    }
  }, []);

  const handlePersonalityChange = (id: OrbPersonalityId) => {
    setPersonality(id);
    try { localStorage.setItem(ORB_PERSONALITY_KEY, id); } catch { /* noop */ }
  };

  const handleLangChange = (lang: SupportedLang | null) => {
    setLangOverride(lang);
    try {
      if (lang) localStorage.setItem(LANG_OVERRIDE_KEY, lang);
      else localStorage.removeItem(LANG_OVERRIDE_KEY);
    } catch { /* noop */ }
    setDetectedLang(detectLanguage());
  };

  const stateCopy: Record<string, string> = {
    idle: "Tocca per parlare con Norma",
    listening: "Sto ascoltando...",
    thinking: "Cerco nelle fonti...",
    speaking: "Norma risponde",
  };

  const activeLang = langOverride ?? detectedLang;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--paper)",
      paddingBottom: 72,
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Status bar spacer ── */}
      <div style={{ height: "env(safe-area-inset-top, 44px)" }} />

      {/* ── Header ── */}
      <div style={{
        padding: "6px 20px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1.2px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic",
          }}>N</div>
          <div>
            <div className="serif" style={{ fontSize: 19, lineHeight: 1, letterSpacing: "-0.01em" }}>
              Norma<span style={{ fontStyle: "italic", color: "var(--vermiglio)" }}>AI</span>
            </div>
            <div className="mono" style={{ fontSize: 8.5, letterSpacing: "0.14em", color: "var(--ink-3)", marginTop: 2 }}>
              AGENTE VOCALE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* End call button — visible only during active call */}
          {callActive && (
            <button
              onClick={tapOrb}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                border: "none",
                background: "var(--vermiglio)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <PhoneOff size={16} color="white" />
            </button>
          )}

          <button
            onClick={() => setShowMenu(true)}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              border: "1px solid var(--paper-line)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Menu size={17} color="var(--ink-2)" />
          </button>
        </div>
      </div>

      {/* ── Orb area ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 20px", minHeight: 300,
      }}>
        <MobileOrb state={orbState} onTap={tapOrb} size={190} orbStyle={personality} />

        {/* State label */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-3)",
            textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {orbState === "listening" && <ListeningDots />}
            {stateCopy[orbState]}
          </div>

          {/* Idle subtitle */}
          {orbState === "idle" && !lastQuestion && (
            <p style={{
              fontSize: 13, color: "var(--ink-3)", maxWidth: 260, lineHeight: 1.45,
              marginTop: 10,
            }}>
              Parla con Norma — risposta immediata con fonti normative.
            </p>
          )}
        </div>
      </div>

      {/* ── Pro query CTA (after conversation) ── */}
      {lastQuestion && orbState === "idle" && (
        <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
          <div style={{
            background: "var(--paper-2)",
            border: "1px solid var(--paper-line)",
            borderRadius: 10, padding: "10px 14px",
            marginBottom: 10,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 4 }}>
              ULTIMA DOMANDA
            </div>
            <div className="serif" style={{ fontSize: 13, fontStyle: "italic", color: "var(--ink-2)" }}>
              «{lastQuestion.slice(0, 120)}{lastQuestion.length > 120 ? "…" : ""}»
            </div>
          </div>
          <ProQueryButton question={lastQuestion} />
        </div>
      )}

      {/* ── Voice error banner ── */}
      {voiceError && (
        <div style={{
          margin: "0 16px 10px",
          background: "rgba(212,74,42,0.08)",
          border: "1px solid rgba(212,74,42,0.25)",
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex", alignItems: "flex-start", gap: 8,
          fontSize: 12.5, color: "var(--vermiglio-ink)",
          fontFamily: "var(--sans)", lineHeight: 1.4,
          flexShrink: 0,
        }}>
          <span style={{ flex: 1 }}>{voiceError}</span>
          <button
            onClick={clearVoiceError}
            aria-label="Chiudi"
            style={{
              border: "none", background: "transparent",
              padding: 0, cursor: "pointer",
              display: "inline-flex", alignItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={14} color="var(--vermiglio-ink)" />
          </button>
        </div>
      )}

      {/* ── Mobile auth sheet (login + signup) ── */}
      <MobileAuthSheet
        open={showAuth}
        initialMode={authMode}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          const supabase = createClient();
          supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
              setAuthedUser({
                email: data.user.email ?? null,
                name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.nome ?? data.user.email?.split("@")[0] ?? "",
              });
            }
          });
        }}
      />

      {/* ── Payment result toast ── */}
      {paymentToast && (
        <div style={{
          position: "fixed", top: "calc(env(safe-area-inset-top, 44px) + 8px)",
          left: 16, right: 16, zIndex: 500,
          background: paymentToast.startsWith("✓") ? "var(--alloro)" : "var(--ink-3)",
          color: "white",
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: 13.5, fontFamily: "var(--sans)", lineHeight: 1.4,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
          <span>{paymentToast}</span>
          <button onClick={() => setPaymentToast(null)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", flexShrink: 0 }}>
            <X size={14} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
      )}

      {/* ── Bottom tab bar ── */}
      <MobileTabBar />

      {/* ── Menu slide-up ── */}
      {showMenu && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(26,24,20,0.5)",
          backdropFilter: "blur(2px)",
        }} onClick={() => setShowMenu(false)}>
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "var(--paper)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 24px",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span className="serif" style={{ fontSize: 20 }}>Impostazioni</span>
              <button onClick={() => setShowMenu(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={20} color="var(--ink-2)" />
              </button>
            </div>

            {/* ── Personality picker ── */}
            <div style={{ marginBottom: 20, maxHeight: "55vh", overflowY: "auto" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", marginBottom: 12 }}>
                PERSONALITÀ
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ORB_PERSONALITIES.map((p) => {
                  const active = personality === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePersonalityChange(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 12px", borderRadius: 10,
                        border: active ? "1.5px solid var(--ink)" : "1px solid var(--paper-line)",
                        background: active ? "var(--paper-2)" : "transparent",
                        cursor: "pointer", textAlign: "left",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: p.preview, flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                          {p.label}
                        </div>
                        <div style={{
                          fontFamily: "var(--sans)", fontSize: 11.5, color: "var(--ink-3)",
                          marginTop: 2, lineHeight: 1.35,
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {p.description}
                        </div>
                      </div>
                      {active && (
                        <Check size={14} color="var(--ink)" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lingua override (only meaningful for Globo) */}
              {personality === "globo" && (
                <div style={{ marginTop: 18 }}>
                  <div className="mono" style={{
                    fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Globe size={11} /> LINGUA
                    <span style={{
                      marginLeft: "auto", fontSize: 10, color: "var(--ink-4)",
                      letterSpacing: "0.04em", textTransform: "none",
                    }}>
                      Auto: {langLabel(detectedLang).flag} {langLabel(detectedLang).native}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button
                      onClick={() => handleLangChange(null)}
                      style={{
                        padding: "6px 10px", borderRadius: 8,
                        border: langOverride === null ? "1.5px solid var(--ink)" : "1px solid var(--paper-line)",
                        background: langOverride === null ? "var(--paper-2)" : "transparent",
                        fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)",
                        cursor: "pointer", WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      Auto
                    </button>
                    {SUPPORTED_LANGS.map((code) => {
                      const isActive = langOverride === code;
                      const isAutoMatch = langOverride === null && detectedLang === code;
                      const l = langLabel(code);
                      return (
                        <button
                          key={code}
                          onClick={() => handleLangChange(code)}
                          style={{
                            padding: "6px 10px", borderRadius: 8,
                            border: isActive ? "1.5px solid var(--ink)" :
                                    isAutoMatch ? "1px dashed var(--ink-4)" :
                                    "1px solid var(--paper-line)",
                            background: isActive ? "var(--paper-2)" : "transparent",
                            fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)",
                            cursor: "pointer", WebkitTapHighlightColor: "transparent",
                            display: "inline-flex", alignItems: "center", gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{l.flag}</span>
                          <span>{l.native}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 8, lineHeight: 1.4 }}>
                    Norma parla in <strong>{langLabel(activeLang).native}</strong>{" "}
                    {langLabel(activeLang).flag}.
                    {langOverride === null && " Riconosciuta dalla lingua del telefono."}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--paper-line)", paddingTop: 16 }}>
              {/* If authenticated: show user info + logout. If not: show login/signup. */}
              {authedUser ? (
                <>
                  <div style={{ padding: "4px 0 14px", borderBottom: "1px solid var(--paper-line)" }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                      {authedUser.name || authedUser.email}
                    </div>
                    {authedUser.name && (
                      <div style={{ fontFamily: "var(--sans)", fontSize: 11.5, color: "var(--ink-4)", marginTop: 2 }}>
                        {authedUser.email}
                      </div>
                    )}
                  </div>
                  {[
                    { label: "Versione desktop", action: () => { window.location.href = "/?desktop=1"; } },
                    { label: "Privacy & Cookie",  action: () => router.push("/privacy") },
                  ].map((item) => (
                    <button key={item.label} onClick={() => { setShowMenu(false); item.action(); }}
                      style={{ width: "100%", textAlign: "left", padding: "14px 0", border: "none", borderBottom: "1px solid var(--paper-line)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", display: "block" }}>
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      setAuthedUser(null);
                    }}
                    style={{ width: "100%", textAlign: "left", padding: "14px 0", border: "none", borderBottom: "1px solid var(--paper-line)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, display: "flex", alignItems: "center", gap: 8, color: "var(--vermiglio-ink)" }}
                  >
                    <LogOut size={14} />
                    Esci dall&apos;account
                  </button>
                </>
              ) : (
                <>
                  {[
                    // Open the inline mobile auth sheet — never bounce out to /
                    { label: "Accedi al tuo account",  action: () => { setAuthMode("login");  setShowAuth(true); } },
                    { label: "Crea account gratuito",  action: () => { setAuthMode("signup"); setShowAuth(true); } },
                    // ?desktop=1 bypasses the middleware mobile-UA redirect
                    { label: "Versione desktop",       action: () => { window.location.href = "/?desktop=1"; } },
                    { label: "Privacy & Cookie",       action: () => router.push("/privacy") },
                  ].map((item) => (
                    <button key={item.label} onClick={() => { setShowMenu(false); item.action(); }}
                      style={{ width: "100%", textAlign: "left", padding: "14px 0", border: "none", borderBottom: "1px solid var(--paper-line)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", display: "block" }}>
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
