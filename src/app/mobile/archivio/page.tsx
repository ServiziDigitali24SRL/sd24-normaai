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
  last_message?: string;
}

interface ArticleRow {
  id: string;
  code: string;
  title: string;
  snippet: string;
  saved_at: string;
}

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* ââ Unauthenticated gate ââââââââââââââââââââââââââââââââââââââââââââââââââ */
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

/* ââ Paywall for free users ââââââââââââââââââââââââââââââââââââââââââââââââ */
function SubscriptionGate() {
  const router = useRouter();
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", textAlign: "center",
    }}>
      <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Archivio â Piano Pro</div>
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

/* ââ Chat list âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
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

  if (loading) return <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 14 }}>Caricamentoâ¦</div>;
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

/* ââ Articles list âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function ArticleList({ userId }: { userId: string }) {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabase();
    supabase
      .from("saved_articles")
      .select("id, code, title, snippet, saved_at")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setArticles((data ?? []) as ArticleRow[]);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 14 }}>Caricamentoâ¦</div>;
  if (articles.length === 0) return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>
      Nessun articolo salvato.<br />
      <span style={{ fontSize: 13 }}>Salva gli articoli durante le risposte.</span>
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {articles.map((a) => (
        <div key={a.id} style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--paper-line)",
          borderLeft: "3px solid var(--vermiglio)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--vermiglio)", fontWeight: 600 }}>Â§ {a.code}</span>
            <span style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>{a.title}</span>
          </div>
          {a.snippet && (
            <div className="serif" style={{ fontSize: 13.5, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.4 }}>
              Â«{a.snippet}Â»
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ââ Documents list ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function DocList({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabase();
    supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setDocs((data ?? []) as { id: string; name: string; created_at: string }[]);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 14 }}>Caricamentoâ¦</div>;
  if (docs.length === 0) return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>
      Nessun documento caricato.
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {docs.map((d) => (
        <div key={d.id} style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--paper-line)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <File size={18} color="var(--ink-3)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.name}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2, letterSpacing: "0.06em" }}>
              {new Date(d.created_at).toLocaleDateString("it-IT")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ââ Main Page âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, subscription_tier")
          .eq("id", user.id)
          .single();
        const isPaid = profile?.subscription_status === "active" ||
          ["cittadino_pro", "professionista", "impresa", "avvocato"].includes(profile?.subscription_tier ?? "");
        setHasPaidPlan(isPaid);
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
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>Caricamentoâ¦</div>
        ) : !user ? (
          <AuthGate />
        ) : !hasPaidPlan ? (
          <SubscriptionGate />
        ) : (
          <>
            {activeTab === "chat" && <ChatList userId={user.id} />}
            {activeTab === "articoli" && <ArticleList userId={user.id} />}
            {activeTab === "documenti" && <DocList userId={user.id} />}
          </>
        )}
      </div>

      <MobileTabBar />
    </div>
  );
}
