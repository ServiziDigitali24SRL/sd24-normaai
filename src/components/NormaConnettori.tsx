"use client";

import { useState } from "react";

const connectors = [
  {
    id: "gmail",
    name: "Gmail",
    emoji: "📧",
    color: "#EA4335",
    desc: "Analizza le tue email legali e ricevi alert normativi direttamente in Gmail.",
    status: "connect",
  },
  {
    id: "gdrive",
    name: "Google Drive",
    emoji: "📁",
    color: "#4285F4",
    desc: "Analizza contratti e documenti legali direttamente da Google Drive.",
    status: "connect",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    emoji: "📦",
    color: "#0061FF",
    desc: "Sincronizza e analizza file legali da Dropbox.",
    status: "connect",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    emoji: "☁️",
    color: "#0078D4",
    desc: "Analizza documenti legali da Microsoft OneDrive.",
    status: "connect",
  },
  {
    id: "outlook",
    name: "Outlook",
    emoji: "📮",
    color: "#0078D4",
    desc: "Integra NormaAI con la tua casella di posta Outlook.",
    status: "connect",
  },
  {
    id: "docusign",
    name: "DocuSign",
    emoji: "✍️",
    color: "#FFDD00",
    desc: "Analizza e verifica contratti prima della firma su DocuSign.",
    status: "connect",
  },
  {
    id: "adobesign",
    name: "Adobe Sign",
    emoji: "🖊️",
    color: "#FF0000",
    desc: "Verifica la compliance dei documenti prima della firma con Adobe Sign.",
    status: "connect",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    emoji: "💬",
    color: "#25D366",
    desc: "Ricevi alert normativi e risposte AI direttamente su WhatsApp.",
    status: "connect",
  },
  {
    id: "telegram",
    name: "Telegram",
    emoji: "✈️",
    color: "#2CA5E0",
    desc: "Bot Telegram per query rapide sulla normativa italiana.",
    status: "connect",
  },
];

type Tab = "connettori" | "webhook" | "apikey";

function ConnectorCard({
  name,
  emoji,
  color,
  desc,
  onConnect,
}: {
  name: string;
  emoji: string;
  color: string;
  desc: string;
  onConnect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgb(229,231,235)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo + name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: color + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {emoji}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(26,26,26)" }}>
          {name}
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12.5, color: "rgb(107,107,107)", lineHeight: 1.5, margin: 0, flexGrow: 1 }}>
        {desc}
      </p>

      {/* Button */}
      <button
        onClick={onConnect}
        style={{
          background: "#E8340A",
          color: "white",
          border: "none",
          borderRadius: 6,
          padding: "7px 16px",
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          alignSelf: "flex-start",
          transition: "background 0.15s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#c42d08")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#E8340A")}
      >
        Connetti →
      </button>
    </div>
  );
}

export default function NormaConnettori({
  onOpenModal,
}: {
  onOpenModal: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("connettori");

  const tabs: { key: Tab; label: string }[] = [
    { key: "connettori", label: "Connettori" },
    { key: "webhook", label: "Webhook" },
    { key: "apikey", label: "API Key" },
  ];

  return (
    <div style={{ fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgb(229,231,235)", paddingBottom: 0 }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? "#E8340A" : "rgb(107,107,107)",
              padding: "8px 16px",
              borderBottom: activeTab === key ? "2px solid #E8340A" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "connettori" && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(26,26,26)", margin: "0 0 16px 0" }}>
            App e servizi collegabili
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {connectors.map((c) => (
              <ConnectorCard
                key={c.id}
                name={c.name}
                emoji={c.emoji}
                color={c.color}
                desc={c.desc}
                onConnect={() => onOpenModal(c.id)}
              />
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "rgb(107,107,107)" }}>
            Hai bisogno di un'integrazione non presente?{" "}
            <button
              onClick={() => onOpenModal("bug")}
              style={{ color: "#E8340A", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
            >
              Richiedicela →
            </button>
          </p>
        </>
      )}

      {activeTab === "webhook" && (
        <div style={{ color: "rgb(107,107,107)", fontSize: 14, paddingTop: 32, textAlign: "center" }}>
          Webhook in arrivo — disponibile con il piano Professionista.
        </div>
      )}

      {activeTab === "apikey" && (
        <div style={{ color: "rgb(107,107,107)", fontSize: 14, paddingTop: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 12px 0" }}>Gestione API Key disponibile nel pannello sviluppatore.</p>
          <button
            onClick={() => onOpenModal("developer")}
            style={{
              background: "#E8340A",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Apri Developer Panel →
          </button>
        </div>
      )}
    </div>
  );
}
