"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] p-4 bg-[#111] border-t border-[#222]">
      <div className="max-w-[760px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-[12px] text-[#888] flex-1 leading-[1.6]">
          Utilizziamo cookie tecnici necessari al funzionamento e, con il tuo consenso, cookie analitici
          per migliorare il servizio. Leggi la nostra{" "}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-[7px] text-[12px] text-[#666] border border-[#333] rounded-lg hover:border-[#444] hover:text-[#999] transition-colors"
          >
            Solo tecnici
          </button>
          <button
            onClick={accept}
            className="px-4 py-[7px] text-[12px] text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
          >
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
}
