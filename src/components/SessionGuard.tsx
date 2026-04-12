"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Invalida sessioni scadute (token Supabase expirygestito da SDK).
 * NON forza logout a orario fisso — rimosso comportamento 04:30
 * che causava logout improvvisi durante sessioni attive.
 */
export default function SessionGuard() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Ascolta eventi di scadenza token gestiti dall'SDK Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return; // sessione rinnovata, tutto ok
      if (event === "SIGNED_OUT") {
        // Logout avvenuto altrove (altra tab) — sincronizza
        window.location.href = "/";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
