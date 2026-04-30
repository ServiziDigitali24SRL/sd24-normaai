"use client";

import { useState } from "react";
import { AvatarStream, type AvatarKey } from "@/components/AvatarStream";

const PRESETS = [
  "Ciao, sono qui per aiutarti con qualsiasi domanda di natura legale. Dimmi pure di cosa hai bisogno.",
  "Il decreto legge prevede sanzioni amministrative fino a diecimila euro per violazioni del codice della privacy.",
  "Posso indirizzarti verso un avvocato specializzato nel tuo caso. Ti basta acquistare il parere a nove euro.",
];

export default function TestAvatarPage() {
  const [avatar, setAvatar] = useState<AvatarKey>("sofia");
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FDFBF7)",
        padding: "32px 24px",
        fontFamily: "var(--sans)",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
          textTransform: "uppercase", color: "var(--ink-3)",
        }}>
          Test · HeyGen avatar
        </div>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)",
          margin: "6px 0 0", fontWeight: 500,
        }}>
          Sofia & Marco — anteprima
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          Scrivi un testo (o usa una preset) e premi <strong>Genera</strong>.
          La generazione richiede 8–15 secondi.
        </p>
      </header>

      <section style={{ marginBottom: 20 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Cosa deve dire l'avatar? (max 1500 caratteri)"
          maxLength={1500}
          rows={4}
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
            onClick={() => setSubmitted(text)}
            disabled={!text || text.trim().length < 5}
            style={{
              marginLeft: "auto", padding: "8px 18px", borderRadius: 6,
              background: "var(--vermiglio, #C93924)", color: "white",
              border: "none", fontSize: 13, fontWeight: 600,
              cursor: text.trim().length >= 5 ? "pointer" : "not-allowed",
              opacity: text.trim().length >= 5 ? 1 : 0.5,
            }}
          >
            Genera
          </button>
        </div>
      </section>

      <section style={{ display: "flex", justifyContent: "center" }}>
        <AvatarStream text={submitted} avatar={avatar} onAvatarChange={setAvatar} />
      </section>
    </main>
  );
}
