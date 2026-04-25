"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, Lock } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface Lead {
  id: string;
  question: string;
  user_type: "cittadino" | "impresa";
  created_at: string;
  purchased: boolean;
}

function LeadCard({ lead, onBuy }: { lead: Lead; onBuy: (id: string) => void }) {
  const isImpresa = lead.user_type === "impresa";
  return (
    <div style={{
      margin: "0 16px 12px",
      background: "var(--paper-2)",
      border: "1px solid var(--paper-line)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            padding: "3px 8px", borderRadius: 4,
            background: isImpresa ? "rgba(74,155,110,0.12)" : "rgba(212,74,42,0.1)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {isImpresa ? <Building2 size={11} color="var(--alloro)" /> : <User size={11} color="var(--vermiglio)" />}
            <span className="mono" style={{
              fontSize: 9, letterSpacing: "0.08em",
              color: isImpresa ? "var(--alloro)" : "var(--vermiglio)",
              textTransform: "uppercase",
            }}>
              {isImpresa ? "Impresa" : "Cittadino"}
            </span>
          </div>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
            {new Date(lead.created_at).toLocaleDateString("it-IT")}
          </span>
        </div>

        <div className="serif" style={{
          fontSize: 15, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.4,
          marginBottom: 12,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as never,
          overflow: "hidden",
        }}>
          Â«{lead.question}Â»
        </div>

        {lead.purchased ? (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(74,155,110,0.12)",
            fontFamily: "var(--sans)", fontSize: 13, color: "var(--alloro)", textAlign: "center",
          }}>
            â Lead acquistato â contatta il cliente
          </div>
        ) : (
          <button
            onClick={() => onBuy(lead.id)}
            style={{
              width: "100%", padding: "12px",
              borderRadius: 8, border: "none",
              background: "var(--vermiglio)", color: "white",
              fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <span className="mono" style={{
              fontSize: 11, background: "rgba(255,255,255,0.2)",
              padding: "2px 6px", borderRadius: 3,
            }}>9â¬</span>
            Acquista lead
          </button>
        )}
      </div>
    </div>
  );
}

export default function MobileLeadsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAvvocato, setIsAvvocato] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabase();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUser(user);

      // Check avvocato role
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, profession")
        .eq("id", user.id)
        .single();

      const avv = profile?.subscription_tier === "avvocato" || profile?.profession === "avvocato";
      setIsAvvocato(avv);

      if (avv) {
        // Fetch available leads
        const { data: leadsData } = await supabase
          .from("professional_leads")
          .select("id, question, user_type, created_at")
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .limit(20);

        // Fetch purchased leads
        const { data: purchased } = await supabase
          .from("purchased_leads")
          .select("lead_id")
          .eq("professional_id", user.id);

        const purchasedIds = new Set((purchased ?? []).map((p: { lead_id: string }) => p.lead_id));

        setLeads((leadsData ?? []).map((l: Omit<Lead, "purchased">) => ({
          ...l,
          purchased: purchasedIds.has(l.id),
        })));
      }

      setLoading(false);
    });
  }, []);

  const handleBuy = async (leadId: string) => {
    setBuyingId(leadId);
    try {
      const res = await fetch("/api/mobile/buy-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--ink-4)", fontSize: 14 }}>Caricamentoâ¦</div>
        </div>
        <MobileTabBar isAvvocato />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <Lock size={32} color="var(--ink-4)" style={{ marginBottom: 16 }} />
          <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Area Professionisti</div>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.5 }}>Accedi al tuo account avvocato per vedere i lead disponibili.</p>
          <button onClick={() => router.push("/")} style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: "var(--vermiglio)", color: "white", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Accedi
          </button>
        </div>
        <MobileTabBar isAvvocato />
      </div>
    );
  }

  if (!isAvvocato) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Piano Avvocato</div>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.5 }}>
            Il marketplace lead Ã¨ riservato agli avvocati iscritti.<br />
            Ogni lead richiede una query "Chiedi a un Professionista" (9â¬).
          </p>
          <button onClick={() => router.push("/dashboard")} style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: "var(--vermiglio)", color: "white", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Scopri il piano
          </button>
        </div>
        <MobileTabBar isAvvocato />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
      <div style={{ height: "env(safe-area-inset-top, 44px)", background: "var(--paper)", flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid var(--paper-line)", flexShrink: 0 }}>
        <div className="serif" style={{ fontSize: 20 }}>Lead disponibili</div>
        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.08em", marginTop: 3, textTransform: "uppercase" }}>
          {leads.length} richieste â¢ 9â¬ per lead
        </div>
      </div>

      {/* Lead list */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 12, paddingBottom: 72 }}>
        {leads.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>
            Nessun lead disponibile al momento.<br />
            <span style={{ fontSize: 13 }}>Ricontrolla piÃ¹ tardi.</span>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={buyingId === lead.id ? { ...lead, purchased: false } : lead}
              onBuy={handleBuy}
            />
          ))
        )}
      </div>

      <MobileTabBar isAvvocato />
    </div>
  );
}
