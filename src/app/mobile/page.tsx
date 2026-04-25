"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, BookmarkPlus, Menu } from "lucide-react";
import { MobileOrb, ListeningDots } from "@/components/mobile/MobileOrb";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { useMobileVoice } from "@/hooks/useMobileVoice";

/* ââ Onboarding gate (shown after 10 anonymous queries) âââââââââââââââââââ */
function OnboardingGate({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(26,24,20,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        width: "100%",
        background: "var(--paper)",
        borderRadius: "20px 20px 0 0",
        padding: "28px 24px 40px",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom))",
      }}>
        {/* Logo */}
        <div className="serif" style={{
          fontSize: 26, textAlign: "center", marginBottom: 8, color: "var(--ink)",
        }}>
          Norma<span style={{ fontStyle: "italic", color: "var(--vermiglio)" }}>AI</span>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.5 }}>
          Hai usato le 10 query gratuite di oggi.<br />
          Registrati per continuare â Ã¨ gratis.
        </p>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: 12, marginBottom: 28, justifyContent: "center",
        }}>
          {[
            { n: "10", label: "query/giorno" },
            { n: "â", label: "fonti normative" },
            { n: "9â¬", label: "consulenza pro" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, textAlign: "center",
              background: "var(--paper-2)", borderRadius: 8, padding: "10px 6px",
              border: "1px solid var(--paper-line)",
            }}>
              <div className="mono" style={{ fontSize: 18, color: "var(--vermiglio)", fontWeight: 600 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/onboarding")}
          style={{
            width: "100%", padding: "16px", borderRadius: 12, border: "none",
            background: "var(--vermiglio)", color: "white",
            fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginBottom: 12,
          }}
        >
          Registrati gratis
        </button>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: "transparent", border: "1px solid var(--paper-line)",
            fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)",
            cursor: "pointer",
          }}
        >
          Continua domani
        </button>
      </div>
    </div>
  );
}

/* ââ AI Source card (shown while speaking) ââââââââââââââââââââââââââââââââ */
function SourceCard({ source, onSave }: {
  source: { code: string; title: string; snippet: string };
  onSave: () => void;
}) {
  return (
    <div style={{
      background: "var(--paper-2)",
      border: "1px solid var(--paper-line)",
      borderLeft: "3px solid var(--vermiglio)",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--vermiglio)", fontWeight: 600, letterSpacing: "0.05em" }}>
          Â§ {source.code}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", flex: 1 }}>{source.title}</span>
        <button onClick={onSave} style={{
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--ink-3)", padding: 4,
        }}>
          <BookmarkPlus size={15} />
        </button>
      </div>
      <div className="serif" style={{
        fontSize: 14, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.4,
      }}>
        Â«{source.snippet}Â»
      </div>
    </div>
  );
}

/* ââ Pro query button (9â¬) ââââââââââââââââââââââââââââââââââââââââââââââââ */
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
        marginTop: 8,
      }}
    >
      {loading ? "Apertura pagamentoâ¦" : (
        <>
          <span className="mono" style={{ fontSize: 13, color: "var(--vermiglio)", background: "rgba(212,74,42,0.15)", padding: "2px 6px", borderRadius: 4 }}>9â¬</span>
          Chiedi a un Professionista
        </>
      )}
    </button>
  );
}

/* ââ Main Mobile Home Page ââââââââââââââââââââââââââââââââââââââââââââââââ */
export default function MobilePage() {
  const { orbState, transcript, lastResult, tapOrb, queriesUsed, queryLimitHit } = useMobileVoice();
  const [showGate, setShowGate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const answerRef = useRef<HTMLDivElement>(null);

  // Listen for limit event from hook
  useEffect(() => {
    const handler = () => setShowGate(true);
    window.addEventListener("norma-mobile-limit", handler);
    return () => window.removeEventListener("norma-mobile-limit", handler);
  }, []);

  // Auto-show gate when limit is hit
  useEffect(() => {
    if (queryLimitHit && queriesUsed >= 10) setShowGate(true);
  }, [queryLimitHit, queriesUsed]);

  // Scroll to answer when result arrives
  useEffect(() => {
    if (lastResult) {
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
    }
  }, [lastResult]);

  const stateCopy: Record<string, string> = {
    idle: "Tocca per parlare",
    listening: "Sto ascoltandoâ¦",
    thinking: "Cerco nelle fontiâ¦",
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

      {/* ââ Status bar spacer ââ */}
      <div style={{ height: "env(safe-area-inset-top, 44px)" }} />

      {/* ââ Header ââ */}
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

      {/* ââ Query counter bar ââ */}
      <div style={{ padding: "10px 20px 0", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 3, background: "var(--paper-3)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(queriesUsed / 10, 1) * 100}%`,
            height: "100%",
            background: queriesUsed >= 9 ? "var(--vermiglio)" : "var(--ink)",
            transition: "width 0.4s ease, background 0.3s",
          }} />
        </div>
        <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-3)" }}>
          {queriesUsed}/10
        </span>
      </div>

      {/* ââ Orb area ââ */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 20px", minHeight: 280,
      }}>
        <MobileOrb state={orbState} onTap={tapOrb} size={180} />

        {/* State label */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-3)",
            textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {orbState === "listening" && <ListeningDots />}
            {stateCopy[orbState]}
          </div>

          {transcript && (
            <div className="serif" style={{
              fontSize: 18, fontStyle: "italic", color: "var(--ink)",
              lineHeight: 1.3, maxWidth: 300, marginTop: 10, textAlign: "center",
            }}>
              Â«{transcript}Â»
            </div>
          )}

          {!transcript && orbState === "idle" && !lastResult && (
            <p style={{
              fontSize: 13, color: "var(--ink-3)", maxWidth: 260, lineHeight: 1.45,
              marginTop: 10,
            }}>
              Parla con Norma â risposta immediata con fonti normative.
            </p>
          )}
        </div>
      </div>

      {/* ââ Answer card (scrollable area) ââ */}
      {lastResult && (
        <div ref={answerRef} style={{ padding: "0 16px 16px", flexShrink: 0 }}>
          {/* Answer text */}
          <div style={{
            background: "var(--paper-2)",
            border: "1px solid var(--paper-line)",
            borderRadius: 12, padding: "14px 16px",
            marginBottom: 10,
          }}>
            <div className="serif" style={{
              fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)",
              fontStyle: "italic",
            }}>
              {lastResult.answer.slice(0, 400)}
              {lastResult.answer.length > 400 && "â¦"}
            </div>
          </div>

          {/* Sources */}
          {lastResult.sources.slice(0, 2).map((src, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <SourceCard
                source={src}
                onSave={() => {/* TODO: save to archivio */}}
              />
            </div>
          ))}

          {/* Pro query CTA */}
          <ProQueryButton question={lastResult.question} />
        </div>
      )}

      {/* ââ Bottom tab bar ââ */}
      <MobileTabBar />

      {/* ââ Onboarding gate ââ */}
      {showGate && <OnboardingGate onClose={() => setShowGate(false)} />}

      {/* ââ Menu slide-up ââ */}
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
              <span className="serif" style={{ fontSize: 20 }}>
                Menu
              </span>
              <button onClick={() => setShowMenu(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={20} color="var(--ink-2)" />
              </button>
            </div>

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
                  borderTop: "none", borderLeft: "none", borderRight: "none",
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
      )}
    </div>
  );
}
