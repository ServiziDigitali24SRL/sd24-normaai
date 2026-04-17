"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Invalida sessioni scadute (token Supabase expiry gestito da SDK).
 * NON forza logout a orario fisso — rimosso comportamento 04:30
 * che causava logout improvvisi durante sessioni attive.
 */
export default function SessionGuard() {
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Env vars non disponibili (locale senza .env.local) — skip silenziosamente
      return;
    }

    // Ascolta eventi di scadenza token gestiti dall'SDK Supabase
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event) => {
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
