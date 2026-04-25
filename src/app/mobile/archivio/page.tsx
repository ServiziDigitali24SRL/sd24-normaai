"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, FileText, File, Lock } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";

type Tab = "chat" | "articoli" | "documenti";

interface ConvRow {
  id: string;
  title: string;
  updated_at: string;
}

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* ── Unauthenticated gate ──────────────────────────────────────────────── */
function AuthGate() {
  const router = useRouter();
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", textAlign: "center",
    }}>
      <Lock size={36} color="var(--ink-4)" style={{ marginBottom: 16 }} />
      <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Archivio personale</div>
      <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 24 }}>
        Accedi o registrati per vedere la tua cronologia chat,
        gli articoli salvati e i documenti caricati.
      </p>
      <button
        onClick={() => router.push("/onboarding")}
        style={{
          padding: "14px 28px", borderRadius: 10, border: "none",
          background: "var(--vermiglio)", color: "white",
          fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer",
          marginBottom: 10,
        }}
      >
        Registrati gratis
      </button>
      <button
        onClick={() => router.push("/")}
        style={{
          padding: "12px 28px", borderRadius: 10,
          background: "transparent", border: "1px solid var(--paper-line)",
          fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", cursor: "pointer",
        }}
      >
        Accedi
      </button>
    </div>
  );
}

/* ── Paywall for free users ──────────────────────────────────────────────── */
function SubscriptionGate() {
  const router = useRouter();
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", textAlign: "center",
    }}>
      <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Archivio — Piano Pro</div>
      <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 24 }}>
        Salva e ritrova tutta la tua cronologia, gli articoli di legge
        e i documenti caricati. Disponibile con piano a pagamento.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        style={{
          padding: "14px 28px", borderRadius: 10, border: "none",
          background: "var(--vermiglio)", color: "white",
          fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}
      >
        Vedi i piani
      </button>
    </div>
  );
}

/* ── Coming soon placeholder ─────────────────────────────────────────────────── */
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 20, fontStyle: "italic", color: "var(--ink-3)", marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-4)", lineHeight: 1.5 }}>
        Funzionalità in arrivo.<br />
        Aggiornamento previsto nelle prossime settimane.
      </p>
    </div>
  );
}

/* ── Chat list ────────────────────────────────────────────────────────────────────────── */
function ChatList({ userId }: { userId: string }) {
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabase();
    supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setConvs((data ?? []) as ConvRow[]);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 14 }}>Caricamento…</div>;
  if (convs.length === 0) return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>
      Nessuna conversazione salvata.
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {convs.map((c) => (
        <div key={c.id} style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--paper-line)",
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500, marginBottom: 3 }}>
            {c.title || "Conversazione"}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
            {new Date(c.updated_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────────────────── */
export default function MobileArchivioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPaidPlan, setHasPaidPlan] = useState(false);

  useEffect(() => {
    const supabase = createSupabase();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Check active paid subscription in subscriptions table (source of truth)
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .not("plan", "eq", "free")
          .maybeSingle();
        setHasPaidPlan(!!sub);
      }
      setLoading(false);
    });
  }, []);

  const tabs = [
    { id: "chat" as Tab, label: "Chat", icon: <MessageSquare size={16} /> },
    { id: "articoli" as Tab, label: "Articoli", icon: <FileText size={16} /> },
    { id: "documenti" as Tab, label: "Documenti", icon: <File size={16} /> },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
      {/* Safe area top */}
      <div style={{ height: "env(safe-area-inset-top, 44px)", background: "var(--paper)", flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        padding: "10px 16px 0",
        borderBottom: "1px solid var(--paper-line)",
        flexShrink: 0,
      }}>
        <div className="serif" style={{ fontSize: 20, marginBottom: 12 }}>
          Archivio
        </div>
        {/* Tab pills */}
        <div style={{ display: "flex", gap: 4, paddingBottom: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "9px 4px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                borderBottom: activeTab === t.id ? "2px solid var(--vermiglio)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: activeTab === t.id ? 600 : 400,
                color: activeTab === t.id ? "var(--vermiglio)" : "var(--ink-3)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>Caricamento…</div>
        ) : !user ? (
          <AuthGate />
        ) : !hasPaidPlan ? (
          <SubscriptionGate />
        ) : (
          <>
            {activeTab === "chat" && <ChatList userId={user.id} />}
            {activeTab === "articoli" && <ComingSoon label="Articoli salvati" />}
            {activeTab === "documenti" && <ComingSoon label="Documenti" />}
          </>
        )}
      </div>

      <MobileTabBar />
    </div>
  );
}
