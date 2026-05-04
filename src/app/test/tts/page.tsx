"use client";

// Test page — Voxtral Italian TTS (zero-shot voice cloning).

import { useState } from "react";

const PRESETS = [
  "Ciao, sono Sofia. Sono qui per aiutarti con qualsiasi questione legale. Dimmi pure di cosa hai bisogno.",
  "Il decreto legge 21 marzo 2022 numero 21 prevede sanzioni amministrative pecuniarie da 1.000 a 10.000 euro.",
  "Posso indirizzarti verso un avvocato specializzato. Acquistando il parere a 9 euro sblocchi anche il consulto telefonico.",
];

export default function TestTtsPage() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function generate() {
    if (!text || text.trim().length < 2) return;
    setLoading(true); setError(null); setAudioUrl(null); setLatencyMs(null);

    try {
      const t0 = performance.now();
      const r = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `http_${r.status}`);
      }
      const lat = r.headers.get("X-Latency-Ms");
      const blob = await r.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setLatencyMs(lat ? Number(lat) : Math.round(performance.now() - t0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100dvh", background: "var(--paper, #FDFBF7)",
      padding: "32px 24px", fontFamily: "var(--sans)", maxWidth: 760, margin: "0 auto",
    }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
          textTransform: "uppercase", color: "var(--ink-3)",
        }}>
          Test · Voxtral TTS
        </div>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)",
          margin: "6px 0 0", fontWeight: 500,
        }}>
          Sintesi vocale italiana — voce Sofia
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          Voxtral non ha voci italiane preset, quindi usa <strong>zero-shot voice cloning</strong>{" "}
          dal sample <code>sofia.mp3</code>. Latenza tipica: 1.5s su 6s di audio.
        </p>
      </header>

      <section style={{ marginBottom: 20 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Cosa deve dire Sofia? (max 5000 caratteri)"
          maxLength={5000}
          rows={5}
          style={{
            width: "100%", padding: 12, borderRadius: 8,
            border: "1px solid var(--paper-line, #E8E0D2)",
            fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-1)",
            background: "white", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => setText(p)}
              style={{
                padding: "6px 10px", fontSize: 11, borderRadius: 6,
                border: "1px solid var(--paper-line, #E8E0D2)",
                background: "white", color: "var(--ink-2)", cursor: "pointer",
                fontFamily: "var(--mono)", letterSpacing: "0.05em",
              }}
            >
              Preset {i + 1}
            </button>
          ))}
          <button
            onClick={generate}
            disabled={loading || text.trim().length < 2}
            style={{
              marginLeft: "auto", padding: "8px 18px", borderRadius: 6,
              background: "var(--vermiglio, #C93924)", color: "white",
              border: "none", fontSize: 13, fontWeight: 600,
              cursor: loading || text.trim().length < 2 ? "not-allowed" : "pointer",
              opacity: loading || text.trim().length < 2 ? 0.5 : 1,
            }}
          >
            {loading ? "Generazione…" : "Genera audio"}
          </button>
        </div>
      </section>

      {audioUrl && (
        <section style={{
          background: "white",
          border: "1px solid var(--paper-line, #E8E0D2)",
          borderRadius: 8, padding: 20,
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8,
          }}>
            Audio generato {latencyMs != null ? `· ${latencyMs}ms` : ""}
          </div>
          <audio src={audioUrl} controls autoPlay style={{ width: "100%" }} />
          <div style={{ marginTop: 8 }}>
            <a href={audioUrl} download="sofia-tts.mp3" style={{
              fontSize: 12, color: "var(--vermiglio, #C93924)", textDecoration: "underline",
            }}>
              Scarica MP3
            </a>
          </div>
        </section>
      )}

      {error && (
        <p style={{ color: "var(--red-error, #B43B25)", fontSize: 13 }}>
          Errore: {error}
        </p>
      )}
    </main>
  );
}
