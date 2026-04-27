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

      {/* ── Menu slide-up (impostazioni) ── */}
      {showMenu && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(26,24,20,0.5)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "var(--paper)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "88dvh",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, background: "var(--paper-3)",
              borderRadius: 2, margin: "14px auto 0", flexShrink: 0,
            }} />

            {/* Header sticky */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px 10px", flexShrink: 0,
              borderBottom: "1px solid var(--paper-line)",
            }}>
              <span className="serif" style={{ fontSize: 20 }}>Impostazioni</span>
              <button
                onClick={() => setShowMenu(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                aria-label="Chiudi"
              >
                <X size={20} color="var(--ink-2)" />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* ── Carosello personalità ── */}
              <div style={{ paddingTop: 18 }}>
                <div className="mono" style={{
                  fontSize: 9, letterSpacing: "0.16em", color: "var(--ink-3)",
                  textTransform: "uppercase", paddingLeft: 20, marginBottom: 14,
                }}>
                  Personalità
                </div>

                {/* Carosello — 1 palla grande, scroll-snap */}
                <div
                  ref={personalityCarouselRef}
                  onScroll={handlePersonalityScroll}
                  style={{
                    display: "flex",
                    overflowX: "scroll",
                    scrollSnapType: "x mandatory",
                    scrollbarWidth: "none",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    WebkitOverflowScrolling: "touch" as any,
                  }}
                >
                  {ORB_PERSONALITIES.map((p) => {
                    const active = personality === p.id;
                    return (
                      <div
                        key={p.id}
                        style={{
                          flexShrink: 0, width: "100%",
                          scrollSnapAlign: "center",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", padding: "10px 28px 20px",
                        }}
                      >
                        {/* Pallina grande */}
                        <div
                          onClick={() => handlePersonalityChange(p.id)}
                          style={{
                            width: 118, height: 118, borderRadius: "50%",
                            background: p.preview,
                            boxShadow: active
                              ? "0 0 0 4px var(--ink), 0 12px 40px rgba(0,0,0,0.22)"
                              : "0 8px 28px rgba(0,0,0,0.18)",
                            cursor: "pointer",
                            transition: "box-shadow 0.2s",
                            flexShrink: 0,
                          }}
                        />
                        {/* Nome + descrizione */}
                        <div className="serif" style={{
                          fontSize: 22, marginTop: 18, marginBottom: 5,
                          color: "var(--ink)",
                        }}>
                          {p.label}
                        </div>
                        <div style={{
                          fontSize: 13.5, color: "var(--ink-3)",
                          fontFamily: "var(--sans)", textAlign: "center",
                          lineHeight: 1.5, maxWidth: 240,
                        }}>
                          {p.description}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dots */}
                <div style={{
                  display: "flex", justifyContent: "center",
                  gap: 7, paddingBottom: 6,
                }}>
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
                        cursor: "pointer",
                        transition: "all 0.22s ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Carosello lingua ── */}
              <div style={{ paddingTop: 16, paddingBottom: 4 }}>
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

                {/* Carosello lingue — palla più piccola */}
                {(() => {
                  const allLangs: (SupportedLang | "auto")[] = ["auto", ...SUPPORTED_LANGS];
                  const activeIdx = langOverride === null ? 0 : allLangs.indexOf(langOverride);
                  return (
                    <>
                      <div
                        ref={langCarouselRef}
                        onScroll={handleLangScroll}
                        style={{
                          display: "flex",
                          overflowX: "scroll",
                          scrollSnapType: "x mandatory",
                          scrollbarWidth: "none",
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    WebkitOverflowScrolling: "touch" as any,
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
                                alignItems: "center", padding: "8px 28px 16px",
                              }}
                            >
                              {/* Palla piccola */}
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
                                  cursor: "pointer",
                                  transition: "box-shadow 0.2s",
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
                                  lineHeight: 1.4,
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
                              cursor: "pointer",
                              transition: "all 0.22s ease",
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

            {/* Footer account — fisso in basso */}
            <div style={{
              borderTop: "1px solid var(--paper-line)",
              padding: "12px 20px",
              paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
              flexShrink: 0,
            }}>
              {authedUser ? (
                <>
                  <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--paper-line)", marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                      {authedUser.name || authedUser.email}
                    </div>
                    {authedUser.name && (
                      <div style={{ fontFamily: "var(--sans)", fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>
                        {authedUser.email}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowMenu(false); router.push("/privacy"); }}
                    style={{ width: "100%", textAlign: "left", padding: "11px 0", border: "none", borderBottom: "1px solid var(--paper-line)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", display: "block" }}
                  >
                    Privacy & Cookie
                  </button>
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      setAuthedUser(null);
                    }}
                    style={{ width: "100%", textAlign: "left", padding: "11px 0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, display: "flex", alignItems: "center", gap: 8, color: "var(--vermiglio-ink)", marginTop: 2 }}
                  >
                    <LogOut size={14} /> Esci dall&apos;account
                  </button>
                </>
              ) : (
                <>
                  {[
                    { label: "Accedi al tuo account", action: () => { setAuthMode("login");  setShowAuth(true); } },
                    { label: "Crea account gratuito", action: () => { setAuthMode("signup"); setShowAuth(true); } },
                    { label: "Privacy & Cookie",      action: () => router.push("/privacy") },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setShowMenu(false); item.action(); }}
                      style={{ width: "100%", textAlign: "left", padding: "11px 0", border: "none", borderBottom: "1px solid var(--paper-line)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", display: "block" }}
                    >
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
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
