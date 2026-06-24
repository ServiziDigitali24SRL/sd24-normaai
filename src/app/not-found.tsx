import Link from "next/link";

const T = {
  ink: "#13110F",
  ink3: "#4A433A",
  ink4: "#756C5E",
  paper: "#F6F2EA",
  v: "#D44A2A",
  serif: "'Instrument Serif','DM Serif Display',Georgia,serif",
  sans: "'Inter Tight','Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'JetBrains Mono','IBM Plex Mono',monospace",
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: T.paper,
        color: T.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        fontFamily: T.sans,
        textAlign: "center",
        position: "relative",
      }}
    >
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: "clamp(120px, 22vw, 220px)",
          lineHeight: 1,
          margin: "0 0 0.25em",
          letterSpacing: "-0.04em",
          fontWeight: 400,
        }}
      >
        4<span style={{ color: T.v }}>0</span>4
      </h1>

      <p
        style={{
          fontFamily: T.serif,
          fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
          color: T.ink3,
          margin: "0 0 0.5rem",
          maxWidth: "560px",
        }}
      >
        La norma che cerchi non è qui.
      </p>

      <p
        style={{
          fontSize: "0.9375rem",
          color: T.ink4,
          margin: "0 0 2.5rem",
          maxWidth: "400px",
          lineHeight: 1.6,
        }}
      >
        La pagina non esiste o è stata spostata. Torna alla home o chiedi
        direttamente a NormaAI.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            border: `1.5px solid ${T.ink}`,
            borderRadius: "0.375rem",
            color: T.ink,
            fontFamily: T.sans,
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
            background: "transparent",
          }}
        >
          Torna alla home
        </Link>

        <Link
          href="/chat"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: T.v,
            border: `1.5px solid ${T.v}`,
            borderRadius: "0.375rem",
            color: T.paper,
            fontFamily: T.sans,
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Chiedi a NormaAI
        </Link>
      </div>

      <p
        style={{
          position: "absolute",
          bottom: "1.5rem",
          fontFamily: T.mono,
          fontSize: "0.6875rem",
          color: T.ink4,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        NormaAI · normaai.it
      </p>
    </main>
  );
}
