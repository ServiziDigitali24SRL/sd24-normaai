"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useState } from "react";

/**
 * Plausible Analytics — caricato solo con consenso analytics (art. 6(1)(a) GDPR)
 * Domain: normaai.it | Provider: Plausible Analytics (EU-hosted, privacy-first)
 */
export default function PlausibleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem("cookie-consent");
        if (!raw) return;
        const prefs = JSON.parse(raw);
        setHasConsent(prefs?.analytics === true);
      } catch {
        // noop
      }
    };

    check();

    // Ri-controlla se l'utente cambia consenso nel banner
    window.addEventListener("cookie-consent-updated", check);
    return () => window.removeEventListener("cookie-consent-updated", check);
  }, []);

  if (!hasConsent) return null;

  return (
    <Script
      defer
      data-domain="normaai.it"
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
