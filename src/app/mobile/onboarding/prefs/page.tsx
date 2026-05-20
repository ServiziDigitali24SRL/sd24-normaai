"use client";

/**
 * /mobile/onboarding/prefs — step 4: lingua sito + voice + ORB color.
 * Submit finale: POST /api/onboarding/finalize → crea user Supabase + profile.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell, MobileScreenHero, MobileBottomBar } from "@/components/mobile/shell";
import { MobileButton } from "@/components/mobile/buttons";
import { MobileSelect } from "@/components/mobile/inputs";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING, type OrbColor } from "@/components/mobile/theme";
import { clearDraft, loadDraft, saveDraft, type OnboardingDraft } from "../draft";
import { Progress } from "../phone/page";

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

export default function MobileOnboardingPrefsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<OnboardingDraft["preferred_lang"]>("it");
  const [voiceLang, setVoiceLang] = useState<string>("it");
  const [orbColor, setOrbColor] = useState<OrbColor>("blu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    setLang(d.preferred_lang);
    setVoiceLang(d.preferred_voice_lang);
    setOrbColor(d.preferred_orb_color);
  }, []);

  const finalize = async () => {
    saveDraft({ preferred_lang: lang, preferred_voice_lang: voiceLang, preferred_orb_color: orbColor });
    const d = loadDraft();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: d.first_name,
          last_name: d.last_name,
          phone: d.phone,
          email: d.email,
          cap: d.cap,
          citta: d.citta,
          regione: d.regione,
          citizenship_type: d.citizenship_type,
          preferred_lang: lang,
          preferred_voice_lang: voiceLang,
          preferred_orb_color: orbColor,
          is_lawyer: false, // mobile flow: cittadini only. Avvocati su desktop.
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "finalize_failed");
      }
      // Mantieni "completed" nello storage per il /mobile root redirect → /home
      saveDraft({ completed: true });
      router.push("/mobile/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore creazione account");
      setBusy(false);
    }
  };

  return (
    <MobileShell topbar topbarTransparent>
      <Progress step={4} of={4} />

      <MobileScreenHero
        title={
          <>
            Le tue <span style={{ color: MOBILE_COLORS.blue }}>preferenze</span>
          </>
        }
        subtitle="Personalizzi adesso, modifichi quando vuoi da Impostazioni."
        align="left"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: MOBILE_SPACING.lg }}>
        <MobileSelect
          label="Lingua del sito"
          value={lang}
          onChange={(v) => setLang(v as OnboardingDraft["preferred_lang"])}
          options={[
            { value: "it", label: "Italiano" },
            { value: "en", label: "English" },
          ]}
        />

        <MobileSelect
          label="Lingua della voce (Sofia)"
          value={voiceLang}
          onChange={setVoiceLang}
          options={VOICE_LANGS}
          hint="Sofia parla in 11 lingue"
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
            Colore della tua Orb
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {ORB_OPTIONS.map((c) => {
              const hex = MOBILE_COLORS.orb[c.value];
              const active = orbColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setOrbColor(c.value)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 6px",
                    borderRadius: 14,
                    border: active ? `2px solid ${MOBILE_COLORS.blue}` : `1px solid ${MOBILE_COLORS.line}`,
                    background: active ? MOBILE_COLORS.blueLight : MOBILE_COLORS.surface,
                    cursor: "pointer",
                    fontFamily: MOBILE_FONT.family,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 30% 30%, ${hex} 0%, ${hex}aa 60%, ${hex}33 100%)`,
                      boxShadow: `0 4px 12px ${hex}66`,
                    }}
                  />
                  <span style={{ fontSize: MOBILE_FONT.caption, color: active ? MOBILE_COLORS.blue : MOBILE_COLORS.text }}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: 12,
              background: "#FEF2F2",
              color: MOBILE_COLORS.danger,
              borderRadius: 10,
              fontSize: MOBILE_FONT.small,
              border: `1px solid ${MOBILE_COLORS.danger}33`,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <MobileBottomBar>
        <MobileButton variant="primary" size="lg" full loading={busy} onClick={finalize}>
          {busy ? "Creo il tuo account…" : "Conferma e accedi"}
        </MobileButton>
        <div
          style={{
            textAlign: "center",
            fontSize: MOBILE_FONT.caption,
            color: MOBILE_COLORS.textSoft,
            marginTop: 8,
            paddingBottom: 4,
          }}
        >
          Sei avvocato? Continua dalla{" "}
          <button
            onClick={() => {
              clearDraft();
              router.push("/onboarding/desktop");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: MOBILE_COLORS.blue,
              cursor: "pointer",
              fontSize: MOBILE_FONT.caption,
              textDecoration: "underline",
              padding: 0,
            }}
          >
            versione desktop
          </button>
        </div>
      </MobileBottomBar>
    </MobileShell>
  );
}
