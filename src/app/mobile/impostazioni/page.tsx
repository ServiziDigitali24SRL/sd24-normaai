"use client";

/**
 * /mobile/impostazioni — settings mobile.
 * Lingua sito, lingua voice, colore ORB, gestione account.
 * Le impostazioni sono lette/scritte in localStorage onboarding draft per ora;
 * sync server-side avverrà via /api/users/me PATCH in commit successivo.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/mobile/shell";
import { MobileSelect } from "@/components/mobile/inputs";
import { MobileButton } from "@/components/mobile/buttons";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING, type OrbColor } from "@/components/mobile/theme";
import { clearDraft, loadDraft, saveDraft, type OnboardingDraft } from "../onboarding/draft";

const VOICE_LANGS = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "ar", label: "العربية" },
  { value: "ro", label: "Română" },
  { value: "zh", label: "中文" },
  { value: "uk", label: "Українська" },
  { value: "bn", label: "বাংলা" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ja", label: "日本語" },
];

const ORB_OPTIONS: { value: OrbColor; label: string }[] = [
  { value: "vermiglio", label: "Vermiglio" },
  { value: "alloro", label: "Alloro" },
  { value: "ambra", label: "Ambra" },
  { value: "blu", label: "Blu" },
];

export default function MobileImpostazioniPage() {
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  const update = (patch: Partial<OnboardingDraft>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    saveDraft(patch);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1500);
  };

  if (!draft) return null;

  return (
    <MobileShell topbar topbarTitle="Impostazioni" userName={draft.first_name}>
      {/* Profile card */}
      <Section title="Profilo">
        <Card>
          <Row label="Nome" value={`${draft.first_name} ${draft.last_name}`.trim() || "—"} />
          <Row label="Email" value={draft.email || "—"} />
          <Row label="Cellulare" value={draft.phone || "—"} />
          <Row label="Residenza" value={[draft.citta, draft.provincia].filter(Boolean).join(" (") + (draft.provincia ? ")" : "") || "—"} />
        </Card>
      </Section>

      {/* Preferenze */}
      <Section title="Preferenze">
        <div style={{ display: "flex", flexDirection: "column", gap: MOBILE_SPACING.md }}>
          <MobileSelect
            label="Lingua del sito"
            value={draft.preferred_lang}
            onChange={(v) => update({ preferred_lang: v as OnboardingDraft["preferred_lang"] })}
            options={[
              { value: "it", label: "Italiano" },
              { value: "en", label: "English" },
            ]}
          />
          <MobileSelect
            label="Lingua della voce (Sofia)"
            value={draft.preferred_voice_lang}
            onChange={(v) => update({ preferred_voice_lang: v })}
            options={VOICE_LANGS}
          />

          <div>
            <div
              style={{
                fontSize: MOBILE_FONT.small,
                fontWeight: 500,
                color: MOBILE_COLORS.textMuted,
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              Colore Orb
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {ORB_OPTIONS.map((c) => {
                const hex = MOBILE_COLORS.orb[c.value];
                const active = draft.preferred_orb_color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => update({ preferred_orb_color: c.value })}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 4px",
                      borderRadius: 12,
                      border: active ? `2px solid ${MOBILE_COLORS.blue}` : `1px solid ${MOBILE_COLORS.line}`,
                      background: active ? MOBILE_COLORS.blueLight : MOBILE_COLORS.surface,
                      cursor: "pointer",
                      fontFamily: MOBILE_FONT.family,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: `radial-gradient(circle at 30% 30%, ${hex} 0%, ${hex}aa 60%, ${hex}33 100%)`,
                        boxShadow: `0 2px 8px ${hex}55`,
                      }}
                    />
                    <span style={{ fontSize: 10, color: active ? MOBILE_COLORS.blue : MOBILE_COLORS.text }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/?desktop=1"
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: MOBILE_COLORS.surface,
              border: `1px solid ${MOBILE_COLORS.line}`,
              textDecoration: "none",
              color: MOBILE_COLORS.text,
              fontSize: MOBILE_FONT.body,
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Apri versione desktop <span style={{ color: MOBILE_COLORS.textSoft }}>›</span>
          </Link>
          <MobileButton
            variant="ghost"
            size="lg"
            full
            onClick={() => {
              if (confirm("Sei sicuro? Verrai disconnesso e tornerai alla welcome.")) {
                clearDraft();
                window.location.href = "/mobile/welcome";
              }
            }}
            style={{ borderColor: MOBILE_COLORS.danger + "55", color: MOBILE_COLORS.danger }}
          >
            Esci e cancella sessione locale
          </MobileButton>
        </div>
      </Section>

      {/* Saved toast */}
      {savedToast && (
        <div
          style={{
            position: "fixed",
            bottom: `calc(env(safe-area-inset-bottom, 0px) + 24px)`,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 16px",
            background: MOBILE_COLORS.text,
            color: MOBILE_COLORS.textInverse,
            borderRadius: 999,
            fontSize: MOBILE_FONT.small,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            animation: "mobileFadeIn 0.2s ease",
            zIndex: 80,
          }}
        >
          ✓ Salvato
        </div>
      )}
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: MOBILE_SPACING.lg, marginBottom: MOBILE_SPACING.sm }}>
      <h2
        style={{
          fontSize: MOBILE_FONT.small,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: MOBILE_COLORS.textMuted,
          margin: `0 0 ${MOBILE_SPACING.sm}px 4px`,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: MOBILE_COLORS.surface,
        border: `1px solid ${MOBILE_COLORS.line}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: `1px solid ${MOBILE_COLORS.lineSoft}`,
        fontSize: MOBILE_FONT.body,
      }}
    >
      <span style={{ color: MOBILE_COLORS.textMuted }}>{label}</span>
      <span style={{ color: MOBILE_COLORS.text, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
