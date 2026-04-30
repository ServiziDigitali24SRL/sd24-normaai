"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CookiePrefs {
  technical: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [acceptAnalytics, setAcceptAnalytics] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function savePrefs(prefs: Omit<CookiePrefs, "technical" | "timestamp">) {
    const full: CookiePrefs = {
      technical: true,
      ...prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("cookie-consent", JSON.stringify(full));
    window.dispatchEvent(new Event("cookie-consent-updated"));
    setVisible(false);
    setShowCustomize(false);
  }

  function acceptAll() {
    savePrefs({ analytics: true, marketing: true });
  }

  function declineAll() {
    savePrefs({ analytics: false, marketing: false });
  }

  function saveCustom() {
    savePrefs({ analytics: acceptAnalytics, marketing: acceptMarketing });
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] p-4 bg-white border-t border-[#222]">
      <div className="max-w-[760px] mx-auto">
        {showCustomize ? (
          <div>
            <p className="text-[13px] text-[#ccc] font-medium mb-3">Personalizza cookie</p>
            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-2">
                <input type="checkbox" disabled checked className="mt-[3px] shrink-0" />
                <span className="text-[12px] text-[#888] leading-[1.5]">
                  <strong className="text-[#aaa]">Cookie tecnici</strong> — necessari al funzionamento del sito (autenticazione, sessione, sicurezza). Sempre attivi.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptAnalytics}
                  onChange={(e) => setAcceptAnalytics(e.target.checked)}
                  className="mt-[3px] shrink-0 accent-[#E8340A]"
                />
                <span className="text-[12px] text-[#888] leading-[1.5]">
                  <strong className="text-[#aaa]">Cookie analitici</strong> — miglioramento UX tramite Vercel Analytics. Dati anonimi, max 13 mesi.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptMarketing}
                  onChange={(e) => setAcceptMarketing(e.target.checked)}
                  className="mt-[3px] shrink-0 accent-[#E8340A]"
                />
                <span className="text-[12px] text-[#888] leading-[1.5]">
                  <strong className="text-[#aaa]">Cookie marketing</strong> — pubblicità personalizzata. Al momento non utilizzati da NormaAI.
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomize(false)}
                className="flex-1 px-3 py-[7px] text-[12px] text-[#666] border border-[#D5D0C8] rounded-lg hover:border-[#C8C2BA] transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={saveCustom}
                className="flex-1 px-3 py-[7px] text-[12px] text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
              >
                Salva scelte
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-[12px] text-[#888] flex-1 leading-[1.6]">
              Utilizziamo cookie tecnici necessari al funzionamento e, con il tuo consenso, cookie analitici
              per migliorare il servizio. Leggi la nostra{" "}
              <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
              {" "}e la{" "}
              <Link href="/cookie" className="text-accent hover:underline">Cookie Policy</Link>.
            </p>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setShowCustomize(true)}
                className="px-4 py-[7px] text-[12px] text-[#666] border border-[#D5D0C8] rounded-lg hover:border-[#C8C2BA] hover:text-[#999] transition-colors"
              >
                Personalizza
              </button>
              <button
                onClick={declineAll}
                className="px-4 py-[7px] text-[12px] text-[#666] border border-[#D5D0C8] rounded-lg hover:border-[#C8C2BA] hover:text-[#999] transition-colors"
              >
                Solo tecnici
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-[7px] text-[12px] text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
              >
                Accetta tutti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
