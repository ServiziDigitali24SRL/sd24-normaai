"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Menu, PhoneOff, Check } from "lucide-react";
import { MobileOrb, ListeningDots, type OrbStyle } from "@/components/mobile/MobileOrb";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { useMobileVoice } from "@/hooks/useMobileVoice";

const ORB_STYLES: { id: OrbStyle; label: string; preview: string }[] = [
  { id: "classico", label: "Classico", preview: "linear-gradient(135deg, #E6DFCF, #D44A2A)" },
  { id: "notte",    label: "Notte",    preview: "linear-gradient(135deg, #131A30, #3060A0)" },
  { id: "natura",   label: "Natura",   preview: "linear-gradient(135deg, #C8DFC0, #40A030)" },
  { id: "aurora",   label: "Aurora",   preview: "linear-gradient(135deg, #D8C0F0, #C040A0)" },
];

/* -- Pro query button (9 EUR) */
function ProQueryButton({ question }: { question: string }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mobile/pay-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
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
          <span className="mono" style={{ fontSize: 13, color: "var(--vermiglio)", background: "rgba(212,74,42,0.15)", padding: "2px 6px", borderRadius: 4 }}>9 EUR</span>
          Chiedi a un Professionista
        </>
      )}
    </button>
  );
}

/* -- Main Mobile Home Page */
export default function MobilePage() {
  const {
    orbState,
    callActive,
    tapOrb,
    lastQuestion,
  } = useMobileVoice();

  const [showMenu, setShowMenu] = useState(false);
  const [orbStyle, setOrbStyle] = useState<OrbStyle>("classico");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("norma_orb_style") as OrbStyle | null;
    if (saved && ORB_STYLES.some(s => s.id === saved)) setOrbStyle(saved);
  }, []);

  const handleOrbStyleChange = (style: OrbStyle) => {
    setOrbStyle(style);
    localStorage.setItem("norma_orb_style", style);
  };

  const stateCopy: Record<string, string> = {
    idle: "Tocca per parlare con Norma",
    listening: "Sto ascoltando...",
    thinking: "Cerco nelle fonti...",
    speaking: "Norma risponde",
  };

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

      <div style={{ height: "env(safe-area-inset-top, 44px)" }} />

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

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 20px", minHeight: 300,
      }}>
        <MobileOrb state={orbState} onTap={tapOrb} size={190} orbStyle={orbStyle} />

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-3)",
            textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {orbState === "listening" && <ListeningDots />}
            {stateCopy[orbState]}
          </div>

          {orbState === "idle" && !lastQuestion && (
            <p style={{
              fontSize: 13, color: "var(--ink-3)", maxWidth: 260, lineHeight: 1.45,
              marginTop: 10,
            }}>
              Parla con Norma risposta immediata con fonti normative.
            </p>
          )}
        </div>
      </div>

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
              {lastQuestion.slice(0, 120)}{lastQuestion.length > 120 ? "..." : ""}
            </div>
          </div>
          <ProQueryButton question={lastQuestion} />
        </div>
      )}

      <MobileTabBar />

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

            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", marginBottom: 12 }}>
                STILE PALLA
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ORB_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleOrbStyleChange(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      border: orbStyle === s.id ? "1.5px solid var(--ink)" : "1px solid var(--paper-line)",
                      background: orbStyle === s.id ? "var(--paper-2)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: s.preview, flexShrink: 0,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }} />
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                      {s.label}
                    </div>
                    {orbStyle === s.id && (
                      <Check size={14} color="var(--ink)" style={{ marginLeft: "auto" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--paper-line)", paddingTop: 16 }}>
              {[
                { label: "Accedi al tuo account", action: () => router.push("/") },
                { label: "Versione desktop", action: () => router.push("/") },
                { label: "Privacy & Cookie", action: () => router.push("/privacy") },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { setShowMenu(false); item.action(); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "14px 0",
                    border: "none",
                    borderBottom: "1px solid var(--paper-line)",
                    background: "transparent", cursor: "pointer",
                    fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)",
                    display: "block",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
