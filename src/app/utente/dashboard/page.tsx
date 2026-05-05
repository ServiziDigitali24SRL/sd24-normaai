"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainDashboard from "@/components/dashboard/MainDashboard";

export default function UtenteDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; initials: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase-browser");
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.replace("/");
          return;
        }
        const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Utente";
        const initials = name
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        setUser({ name, initials, email: user.email ?? undefined });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F6F2EA", fontFamily: "system-ui, sans-serif", color: "#4A433A" }}>
        Caricamento…
      </main>
    );
  }

  if (!user) return null;

  return (
    <MainDashboard
      role="utente"
      user={{ name: user.name, initials: user.initials, email: user.email }}
    />
  );
}
