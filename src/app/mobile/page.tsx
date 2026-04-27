"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Menu, PhoneOff, Globe, LogOut } from "lucide-react";
import { MobileOrb, ListeningDots } from "@/components/mobile/MobileOrb";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileAuthSheet } from "@/components/mobile/MobileAuthSheet";
import { MobileOnboarding } from "@/components/mobile/MobileOnboarding";
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

// localStorage key per marcare il primo accesso come completato
const ONBOARDING_KEY = "norma_onboarded_v1";
const USER_NAME_KEY  = "norma_user_name";

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
  const [menuPanel, setMenuPanel] = useState<"menu" | "settings">("menu");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authedUser, setAuthedUser] = useState<{ email: string | null; name: string } | null>(null);
  const [paymentToast, setPaymentToast] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs per i caroselli nel menu impostazioni
  const personalityCarouselRef = useRef<HTMLDivElement>(null);
  const langCarouselRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Restore state + check onboarding + auth + payment toast.
  useEffect(() => {
    try {
      // 1. Restore personality + lang
      const saved = localStorage.getItem(ORB_PERSONALITY_KEY) as OrbPersonalityId | null;
      const legacy = localStorage.getItem("norma_orb_style") as OrbPersonalityId | null;
      const pick = saved || legacy;
      if (pick && ORB_PERSONALITIES.some((p) => p.id === pick)) setPersonality(pick);
      const lang = localStorage.getItem(LANG_OVERRIDE_KEY) as SupportedLang | null;
      if (lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)) setLangOverride(lang);
      setDetectedLang(detectLanguage());

      // 2. Onboarding check — mostra il flow al primo accesso
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      if (!onboarded) setShowOnboarding(true);
    } catch { /* localStorage può essere bloccato in private mode */ }

    // 3. Auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Controlla anche il nome salvato in locale (onboarding)
        let name = data.user.user_metadata?.full_name
          ?? data.user.user_metadata?.nome
          ?? data.user.email?.split("@")[0]
          ?? "";
        try {
          const localName = localStorage.getItem(USER_NAME_KEY);
          if (localName) name = localName;
        } catch { /* noop */ }
        setAuthedUser({ email: data.user.email ?? null, name });
      }
    });

    // 4. Payment toast
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setPaymentToast("✓ Richiesta inviata! Un professionista ti risponderà a breve.");
      window.history.replaceState({}, "", "/mobile");
    } else if (payment === "cancelled") {
      setPaymentToast("Pagamento annullato.");
      window.history.replaceState({}, "", "/mobile");
    }
  }, []);

  // Quando il menu si apre: posiziona il carosello sulla personalità attiva.
  useEffect(() => {
    if (!showMenu) return;
    const t = setTimeout(() => {
      if (personalityCarouselRef.current) {
        const idx = ORB_PERSONALITIES.findIndex((p) => p.id === personality);
        personalityCarouselRef.current.scrollLeft =
          idx * personalityCarouselRef.current.clientWidth;
      }
      if (langCarouselRef.current) {
        const allLangs: (SupportedLang | "auto")[] = ["auto", ...SUPPORTED_LANGS];
        const idx = langOverride === null ? 0 : allLangs.indexOf(langOverride);
        if (idx > 0) {
          langCarouselRef.current.scrollLeft =
            Math.max(0, idx) * langCarouselRef.current.clientWidth;
        }
      }
    }, 60);
    return () => clearTimeout(t);
  }, [showMenu, personality, langOverride]);

  const handlePersonalityChange = (id: OrbPersonalityId) => {
    setPersonality(id);
    try { localStorage.setItem(ORB_PERSONALITY_KEY, id); } catch { /* noop */ }
  };

  // Onboarding completato: salva nome + flag.
  const handleOnboardingComplete = async (name: string) => {
    try {
      localStorage.setItem(USER_NAME_KEY, name);
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch { /* noop */ }
    setShowOnboarding(false);

    // Salva su Supabase se l'utente è già loggato
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
        setAuthedUser((prev) => prev ? { ...prev, name } : null);
      }
    } catch { /* noop */ }
  };

  // Onboarding saltato: segna comunque come visto.
  const handleOnboardingSkip = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* noop */ }
    setShowOnboarding(false);
  };

  const handleLangChange = (lang: SupportedLang | null) => {
    setLangOverride(lang);
    try {
      if (lang) localStorage.setItem(LANG_OVERRIDE_KEY, lang);
      else localStorage.removeItem(LANG_OVERRIDE_KEY);
    } catch { /* noop */ }
    setDetectedLang(detectLanguage());
  };

  // Scroll del carosello personalità → aggiorna stato.
  const handlePersonalityScroll = () => {
    const el = personalityCarouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const p = ORB_PERSONALITIES[idx];
    if (p && p.id !== personality) handlePersonalityChange(p.id);
  };

  // Scroll del carosello lingue → aggiorna stato.
  const handleLangScroll = () => {
    const el = langCarouselRef.current;
    if (!el) return;
    const allLangs: (SupportedLang | "auto")[] = ["auto", ...SUPPORTED_LANGS];
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const code = allLangs[idx];
    if (code === undefined) return;
    const newLang = code === "auto" ? null : code;
    if (newLang !== langOverride) {
      handleLangChange(newLang);
      // Selezionare una lingua specifica implica Globo
      if (newLang !== null && personality !== "globo") handlePersonalityChange("globo");
    }
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
              aria-label="Termina chiamata"
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
            aria-label="Apri menu"
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
        <MobileOrb state={orbState} onTap={tapOrb} size={230} orbStyle={personality} />

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

      {/* ── Side Drawer (menu + impostazioni) ── */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(19,17,15,0.45)",
              backdropFilter: "blur(2px)",
            }}
            onClick={() => { setShowMenu(false); setMenuPanel("menu"); }}
          />

          {/* Drawer — full height, slides from right */}
          <div
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: "min(100%, 380px)", zIndex: 201,
              background: "var(--paper)",
              display: "flex", flexDirection: "column",
              boxShadow: "-20px 0 60px rgba(19,17,15,0.18)",
              borderLeft: "1px solid var(--paper-line)",
              overflow: "hidden",
            }}
          >
            {/* Status bar space */}
            <div style={{ height: "env(safe-area-inset-top, 44px)", flexShrink: 0 }} />

            {/* Header */}
            <div style={{
              padding: "6px 20px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              {menuPanel === "menu" ? (
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--vermiglio)" }}>
                  § MENU
                </div>
              ) : (
                <button
                  onClick={() => setMenuPanel("menu")}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    border: "none", background: "transparent", cursor: "pointer",
                    padding: 0, fontFamily: "var(--mono)", fontSize: 10,
                    letterSpacing: "0.18em", color: "var(--vermiglio)",
                  }}
                >
                  ‹ MENU
                </button>
              )}
              <button
                onClick={() => { setShowMenu(false); setMenuPanel("menu"); }}
                aria-label="Chiudi"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: "1px solid var(--paper-line)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", cursor: "pointer",
                }}
              >
                <X size={16} color="var(--ink-2)" />
              </button>
            </div>

            {/* ── Panel: MENU ── */}
            {menuPanel === "menu" && (
              <>
                {/* Profile block */}
                <div style={{ padding: "0 20px 18px", flexShrink: 0 }}>
                  {authedUser ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "var(--ink)", color: "var(--paper)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic",
                        flexShrink: 0,
                      }}>
                        {(authedUser.name || authedUser.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {authedUser.name || authedUser.email?.split("@")[0]}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                          {authedUser.email} · Piano Gratis
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>
                        Benvenuto <span style={{ fontStyle: "italic" }}>su Norma</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--sans)" }}>
                        Accedi per salvare le conversazioni
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ margin: "0 20px", height: 1, background: "var(--paper-line)", flexShrink: 0 }} />

                {/* Nav items */}
                <div style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
                  {/* Impostazioni */}
                  <button
                    onClick={() => setMenuPanel("settings")}
                    style={{
                      width: "100%", textAlign: "left", padding: "14px 10px",
                      display: "flex", alignItems: "center", gap: 12, borderRadius: 8,
                      border: "none", background: "transparent", cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      border: "1px solid var(--paper-line)", background: "var(--paper-2)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 16 }}>⚙</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, color: "var(--ink)" }}>Impostazioni Norma</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>Personalità · Lingua</div>
                    </div>
                    <span style={{ color: "var(--ink-3)", fontSize: 18, lineHeight: 1 }}>›</span>
                  </button>

                  {/* Privacy */}
                  <button
                    onClick={() => { setShowMenu(false); setMenuPanel("menu"); router.push("/privacy"); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "14px 10px",
                      display: "flex", alignItems: "center", gap: 12, borderRadius: 8,
                      border: "none", background: "transparent", cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      border: "1px solid var(--paper-line)", background: "var(--paper-2)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 15 }}>🔒</span>
                    </div>
                    <div style={{ fontSize: 14.5, color: "var(--ink)" }}>Privacy & Cookie</div>
                  </button>

                  <div style={{ margin: "8px 10px", height: 1, background: "var(--paper-line)" }} />

                  {/* Auth actions */}
                  {authedUser ? (
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        setMenuPanel("menu");
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        setAuthedUser(null);
                      }}
                      style={{
                        width: "100%", textAlign: "left", padding: "14px 10px",
                        display: "flex", alignItems: "center", gap: 12, borderRadius: 8,
                        border: "none", background: "transparent", cursor: "pointer",
                        color: "var(--vermiglio)",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 6,
                        border: "1px solid rgba(212,74,42,0.2)", background: "rgba(212,74,42,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <LogOut size={16} color="var(--vermiglio)" />
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 500 }}>Esci dall&apos;account</div>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setShowMenu(false); setMenuPanel("menu"); setAuthMode("login"); setShowAuth(true); }}
                        style={{
                          width: "100%", textAlign: "left", padding: "14px 10px",
                          display: "flex", alignItems: "center", gap: 12, borderRadius: 8,
                          border: "none", background: "transparent", cursor: "pointer",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 6,
                          border: "1px solid var(--paper-line)", background: "var(--paper-2)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 16 }}>→</span>
                        </div>
                        <div style={{ fontSize: 14.5, color: "var(--ink)" }}>Accedi al tuo account</div>
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); setMenuPanel("menu"); setAuthMode("signup"); setShowAuth(true); }}
                        style={{
                          width: "100%", textAlign: "left", padding: "14px 10px",
                          display: "flex", alignItems: "center", gap: 12, borderRadius: 8,
                          border: "none", background: "transparent", cursor: "pointer",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 6,
                          border: "1px solid var(--paper-line)", background: "var(--paper-2)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 14 }}>✦</span>
                        </div>
                        <div style={{ fontSize: 14.5, color: "var(--ink)" }}>Crea account gratuito</div>
                      </button>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "14px 20px",
                  paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
                  borderTop: "1px solid var(--paper-line)",
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--mono)",
                  letterSpacing: "0.08em", flexShrink: 0,
                }}>
                  <span style={{ color: "oklch(0.48 0.09 145)", fontSize: 8 }}>●</span>
                  SINCRONIZZATO
                  <div style={{ flex: 1 }} />
                  v2.6.0
                </div>
              </>
            )}

            {/* ── Panel: IMPOSTAZIONI ── */}
            {menuPanel === "settings" && (
              <div style={{ flex: 1, overflowY: "auto" }}>

                {/* Carosello personalità */}
                <div style={{ paddingTop: 10 }}>
                  <div className="mono" style={{
                    fontSize: 9, letterSpacing: "0.16em", color: "var(--ink-3)",
                    textTransform: "uppercase", paddingLeft: 20, marginBottom: 10,
                  }}>
                    Personalità
                  </div>

                  <div
                    ref={personalityCarouselRef}
                    onScroll={handlePersonalityScroll}
                    style={{
                      display: "flex", overflowX: "scroll",
                      scrollSnapType: "x mandatory", scrollbarWidth: "none",
                    }}
                  >
                    {ORB_PERSONALITIES.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          flexShrink: 0, width: "100%",
                          scrollSnapAlign: "center",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", padding: "6px 28px 12px",
                        }}
                      >
                        <MobileOrb
                          state="idle"
                          onTap={() => handlePersonalityChange(p.id)}
                          size={130}
                          orbStyle={p.id}
                        />
                        <div className="serif" style={{ fontSize: 20, marginTop: 0, marginBottom: 4, color: "var(--ink)" }}>
                          {p.label}
                        </div>
                        <div style={{
                          fontSize: 13, color: "var(--ink-3)",
                          fontFamily: "var(--sans)", textAlign: "center",
                          lineHeight: 1.45, maxWidth: 240,
                        }}>
                          {p.description}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dots personalità */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 7, paddingBottom: 4 }}>
                    {ORB_PERSONALITIES.map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handlePersonalityChange(p.id);
                          if (personalityCarouselRef.current) {
                            personalityCarouselRef.current.scrollTo({
                              left: i * personalityCarouselRef.current.clientWidth,
                              behavior: "smooth",
                            });
                          }
                        }}
                        style={{
                          height: 6, borderRadius: 3,
                          width: personality === p.id ? 20 : 6,
                          background: personality === p.id ? "var(--ink)" : "var(--paper-3)",
                          cursor: "pointer", transition: "all 0.22s ease",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Carosello lingua */}
                <div style={{ paddingTop: 10, paddingBottom: 4 }}>
                  <div className="mono" style={{
                    fontSize: 9, letterSpacing: "0.16em", color: "var(--ink-3)",
                    textTransform: "uppercase", paddingLeft: 20,
                    marginBottom: 14, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Globe size={10} /> Lingua
                    <span style={{ marginLeft: "auto", paddingRight: 20, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.04em", textTransform: "none" }}>
                      Auto: {langLabel(detectedLang).flag} {langLabel(detectedLang).native}
                    </span>
                  </div>

                  {(() => {
                    const allLangs: (SupportedLang | "auto")[] = ["auto", ...SUPPORTED_LANGS];
                    const activeIdx = langOverride === null ? 0 : allLangs.indexOf(langOverride);
                    return (
                      <>
                        <div
                          ref={langCarouselRef}
                          onScroll={handleLangScroll}
                          style={{
                            display: "flex", overflowX: "scroll",
                            scrollSnapType: "x mandatory", scrollbarWidth: "none",
                          }}
                        >
                          {allLangs.map((code) => {
                            const isAuto = code === "auto";
                            const label = isAuto
                              ? { flag: "🌐", native: "Auto" }
                              : langLabel(code as SupportedLang);
                            const isActive = isAuto ? langOverride === null : langOverride === code;
                            return (
                              <div
                                key={code}
                                style={{
                                  flexShrink: 0, width: "100%",
                                  scrollSnapAlign: "center",
                                  display: "flex", flexDirection: "column",
                                  alignItems: "center", padding: "4px 28px 8px",
                                }}
                              >
                                <div
                                  onClick={() => {
                                    const newLang = isAuto ? null : code as SupportedLang;
                                    handleLangChange(newLang);
                                    if (!isAuto && personality !== "globo") handlePersonalityChange("globo");
                                  }}
                                  style={{
                                    width: 68, height: 68, borderRadius: "50%",
                                    background: isAuto
                                      ? "linear-gradient(135deg, var(--paper-2), var(--paper-3))"
                                      : "linear-gradient(135deg, #B8D4F0, #4A90E2 40%, #1E5BA8)",
                                    boxShadow: isActive
                                      ? "0 0 0 3px var(--ink), 0 6px 20px rgba(0,0,0,0.2)"
                                      : "0 4px 14px rgba(0,0,0,0.14)",
                                    cursor: "pointer", transition: "box-shadow 0.2s",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: isAuto ? 28 : 24,
                                  }}
                                >
                                  {label.flag}
                                </div>
                                <div style={{
                                  fontFamily: "var(--sans)", fontSize: 15,
                                  color: "var(--ink)", marginTop: 10, marginBottom: 2,
                                }}>
                                  {label.native}
                                </div>
                                {!isAuto && personality !== "globo" && (
                                  <div style={{
                                    fontSize: 10.5, color: "var(--ink-4)",
                                    fontFamily: "var(--sans)", textAlign: "center",
                                  }}>
                                    Attiva Globo
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Dots lingua */}
                        <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 8 }}>
                          {allLangs.map((code, i) => (
                            <div
                              key={code}
                              onClick={() => {
                                if (langCarouselRef.current) {
                                  langCarouselRef.current.scrollTo({
                                    left: i * langCarouselRef.current.clientWidth,
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              style={{
                                height: 5, borderRadius: 2.5,
                                width: activeIdx === i ? 16 : 5,
                                background: activeIdx === i ? "var(--ink)" : "var(--paper-3)",
                                cursor: "pointer", transition: "all 0.22s ease",
                              }}
                            />
                          ))}
                        </div>

                        <div style={{
                          fontSize: 11, color: "var(--ink-4)", lineHeight: 1.4,
                          textAlign: "center", padding: "0 20px 16px",
                          fontFamily: "var(--sans)",
                        }}>
                          Norma parla in{" "}
                          <strong>{langLabel(activeLang).native}</strong>{" "}
                          {langLabel(activeLang).flag}
                          {langOverride === null && " · Dalla lingua del telefono"}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Onboarding primo accesso ── */}
      {showOnboarding && (
        <MobileOnboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}
