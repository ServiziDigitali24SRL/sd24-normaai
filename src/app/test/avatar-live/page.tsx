"use client";

// Test page for the live conversational avatar (LiveAvatar streaming + ElevenLabs voice).
// Open in browser, click "Avvia", grant mic permission, then type or speak.

import { useRef, useState } from "react";
import { AvatarLive, type AvatarLiveHandle, type AvatarKey } from "@/components/AvatarLive";

export default function TestAvatarLivePage() {
  const ref = useRef<AvatarLiveHandle>(null);
  const [avatar, setAvatar] = useState<AvatarKey>("sofia");
  const [text, setText] = useState("Ciao Sofia, dimmi cosa puoi fare.");

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#F6F2EA", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", fontFamily: "system-ui" }}>
      <h1 style={{ fontFamily: "serif", fontSize: 28 }}>Test · Avatar live conversational</h1>
      <p style={{ color: "#666", fontSize: 13, maxWidth: 600, textAlign: "center" }}>
        L'avatar parte automaticamente. Dopo che vedi il video, scrivi un testo e premi "Parla" — l'avatar pronuncerà quello che hai scritto via ElevenLabs IT.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setAvatar("sofia")} style={{ padding: "6px 14px", borderRadius: 999, border: avatar === "sofia" ? "2px solid #C93924" : "1px solid #ccc", background: avatar === "sofia" ? "#C93924" : "white", color: avatar === "sofia" ? "white" : "#333", cursor: "pointer" }}>Sofia (Katya · donna)</button>
        <button onClick={() => setAvatar("marco")} style={{ padding: "6px 14px", borderRadius: 999, border: avatar === "marco" ? "2px solid #C93924" : "1px solid #ccc", background: avatar === "marco" ? "#C93924" : "white", color: avatar === "marco" ? "white" : "#333", cursor: "pointer" }}>Marco (Graham · uomo)</button>
      </div>

      <AvatarLive ref={ref} avatar={avatar} autoStart={true} showSelector={false} />

      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 480 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi quello che l'avatar deve dire..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14 }}
        />
        <button
          onClick={() => ref.current?.speak(text)}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C93924", color: "white", cursor: "pointer", fontWeight: 600 }}
        >
          Parla
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => ref.current?.interrupt()} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 12 }}>Interrompi</button>
        <button onClick={() => ref.current?.stop()} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 12 }}>Stop sessione</button>
      </div>

      <p style={{ color: "#999", fontSize: 11, marginTop: 24 }}>
        Cambio avatar (Sofia/Marco) ricreerà la sessione. Dopo "Stop", clicca un avatar per ricreare.
      </p>
    </main>
  );
}
