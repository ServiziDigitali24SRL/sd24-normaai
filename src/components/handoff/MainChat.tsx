/**
 * Handoff design system — MainChat screen (01) (SER-209).
 * Ported from norma-ai-test-template/project/components/MainChat.jsx.
 *
 * Layout: Sidebar 260px + main column (top bar / messages / composer).
 * NOTA: questo commit ports solo l'UI; il composer fa optimistic-update
 * locale ma NON chiama ancora /api/chat. Wire backend in commit separato.
 */

"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Logo, NavItem, Stamp } from "./atoms";

interface SidebarProps {
  onNav?: (key: string) => void;
}

function Sidebar({ onNav }: SidebarProps) {
  const items = [
    { key: "chat", icon: <Icon name="chat" />, label: "Chat legale", active: true },
    { key: "archivio", icon: <Icon name="archive" />, label: "Archivio documenti", badge: "12" },
    { key: "pdf", icon: <Icon name="doc" />, label: "Analisi PDF" },
    { key: "scadenze", icon: <Icon name="clock" />, label: "Scadenze", badge: "3" },
    { key: "prof", icon: <Icon name="users" />, label: "Trova professionista" },
  ];

  const recent = [
    { t: "Contratto locazione — cedolare secca", d: "2h fa" },
    { t: "Licenziamento giusta causa", d: "Ieri" },
    { t: "TFR e trattamento di fine rapporto", d: "3 giorni" },
    { t: "Art. 2043 c.c. responsabilità", d: "1 sett." },
  ];

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        background: "var(--paper-tint)",
        borderRight: "1px solid var(--paper-line)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ padding: "20px 20px 14px" }}>
        <Logo />
      </div>

      <div style={{ padding: "0 14px" }}>
        <button
          onClick={() => onNav?.("new")}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--sans)",
          }}
        >
          <Icon name="plus" size={14} /> Nuova consultazione
        </button>
      </div>

      <div style={{ padding: "18px 14px 8px" }}>
        <div className="caps" style={{ color: "var(--ink-4)", paddingLeft: 12, marginBottom: 6 }}>
          Area personale
        </div>
        {items.map((it) => (
          <NavItem
            key={it.key}
            icon={it.icon}
            label={it.label}
            active={it.active}
            badge={it.badge}
            onClick={() => onNav?.(it.key)}
          />
        ))}
      </div>

      <div style={{ padding: "8px 14px" }}>
        <div className="caps" style={{ color: "var(--ink-4)", paddingLeft: 12, marginBottom: 6 }}>
          Conversazioni recenti
        </div>
        {recent.map((c, i) => (
          <button
            key={i}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.t}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>
              {c.d}
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          margin: 14,
          padding: 16,
          border: "1px solid var(--paper-line)",
          borderRadius: 8,
          background: "white",
        }}
      >
        <Stamp>Piano Gratuito</Stamp>
        <div style={{ fontSize: 13, color: "var(--ink-2)", margin: "10px 0 12px", lineHeight: 1.45 }}>
          3 di 10 consultazioni mensili utilizzate
        </div>
        <div
          style={{
            height: 4,
            background: "var(--paper-2)",
            borderRadius: 2,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ width: "30%", height: "100%", background: "var(--vermiglio)" }} />
        </div>
        <button
          onClick={() => onNav?.("upgrade")}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Passa a PRO <Icon name="arrow" size={12} />
        </button>
      </div>

      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--paper-line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--ink)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          MR
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Marco Rossi</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>
            CITTADINO
          </div>
        </div>
        <button
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-4)" }}
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </aside>
  );
}

function ChatMessage({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
        <div
          style={{
            maxWidth: "72%",
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 14.5,
            lineHeight: 1.55,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
      <div
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "50%",
          background: "var(--paper-2)",
          border: "1px solid var(--paper-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--serif)",
          fontSize: 18,
          fontStyle: "italic",
          color: "var(--vermiglio)",
        }}
      >
        §
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>{children}</div>
    </div>
  );
}

export function MainChat({ onNav }: { onNav?: (key: string) => void }) {
  const [composerValue, setComposerValue] = useState("");

  return (
    <div
      data-design="handoff"
      style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--paper)" }}
    >
      <Sidebar onNav={onNav} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar — minimal, no active consultation */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 28px",
            borderBottom: "1px solid var(--paper-line)",
            gap: 16,
            minHeight: 56,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-4)",
              }}
            >
              Nuova consultazione
            </div>
          </div>
        </header>

        {/* Empty state — chat vergine, attende il primo input */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "48px 48px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontSize: 96,
                lineHeight: 1,
                color: "var(--vermiglio)",
                marginBottom: 24,
              }}
            >
              §
            </div>
            <h1
              className="serif"
              style={{
                fontSize: 36,
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                fontWeight: 400,
              }}
            >
              Come posso aiutarLa?
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: "var(--ink-3)",
                margin: "0 0 28px",
                lineHeight: 1.55,
              }}
            >
              Affitto, lavoro, fisco, condominio, contratti, privacy. Scriva la Sua domanda — Le
              risponderò citando le norme italiane in vigore.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {[
                "Cedolare secca conviene?",
                "Mi hanno licenziato senza preavviso",
                "Come funziona il diritto di recesso?",
                "GDPR per piccola impresa",
              ].map((s) => (
                <button
                  key={s}
                  style={{
                    padding: "8px 14px",
                    background: "white",
                    border: "1px solid var(--paper-line)",
                    borderRadius: 20,
                    fontSize: 13,
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                  onClick={() => setComposerValue(s)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--paper-2)";
                    e.currentTarget.style.borderColor = "var(--ink-5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "var(--paper-line)";
                  }}
                >
                  ↳ {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Composer */}
        <div style={{ padding: "0 48px 28px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div
              style={{
                background: "white",
                border: "1px solid var(--paper-line)",
                borderRadius: 12,
                padding: 14,
                boxShadow: "var(--shadow-2)",
              }}
            >
              <textarea
                value={composerValue}
                onChange={(e) => setComposerValue(e.target.value)}
                placeholder="Domanda di follow-up, allega un PDF, o cerca una norma…"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: 14.5,
                  fontFamily: "var(--sans)",
                  color: "var(--ink)",
                  minHeight: 40,
                  background: "transparent",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                  <Icon name="paperclip" size={13} /> Allega PDF
                </button>
                <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                  <Icon name="book" size={13} /> Materia
                </button>
                <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                  <Icon name="spark" size={13} /> Ricerca giurisprudenza
                </button>
                <div style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>
                  7/10 consultazioni
                </span>
                <button className="btn btn-accent" style={{ padding: "8px 14px" }}>
                  <Icon name="send" size={13} /> Invia
                </button>
              </div>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-4)",
                textAlign: "center",
                marginTop: 10,
                letterSpacing: "0.08em",
              }}
            >
              NormaAI non sostituisce la consulenza legale professionale · Fonti: Gazzetta Ufficiale,
              Normattiva, De Jure
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
