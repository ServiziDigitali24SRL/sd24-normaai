/**
 * /mobile (root) — redirect a /mobile/welcome.
 * Client-side decide: se localStorage ha onboarding_completed → /mobile/home,
 * altrimenti → /mobile/welcome.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileRootPage() {
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("normaai:mobile-onboarding");
      const parsed = raw ? (JSON.parse(raw) as { completed?: boolean }) : null;
      router.replace(parsed?.completed ? "/mobile/home" : "/mobile/welcome");
    } catch {
      router.replace("/mobile/welcome");
    }
  }, [router]);

  return (
    <main style={{ minHeight: "100dvh", background: "#FAFAFA" }} aria-hidden>
      {/* Splash vuoto durante redirect */}
    </main>
  );
}
