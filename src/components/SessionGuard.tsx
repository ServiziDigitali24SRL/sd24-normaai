"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

/** Millisecondi mancanti alla prossima 04:30 (oggi o domani) */
function msUntilNext430(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(4, 30, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

/**
 * Monta silenziosamente su ogni pagina.
 * - Se l'utente è loggato e il suo last_sign_in è precedente alla 04:30 di oggi
 *   (e sono già le 04:30 passate) → sign out immediato.
 * - Altrimenti schedula il sign out alla prossima 04:30.
 */
export default function SessionGuard() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let timer: ReturnType<typeof setTimeout>;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      const today430 = new Date(now);
      today430.setHours(4, 30, 0, 0);

      const lastSignIn = new Date(session.user.last_sign_in_at ?? 0);

      // Sessione creata prima delle 04:30 di oggi e sono già passate le 04:30
      if (now >= today430 && lastSignIn < today430) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }

      // Schedula il logout alla prossima 04:30
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }, msUntilNext430());
    }

    init();
    return () => clearTimeout(timer);
  }, []);

  return null;
}
