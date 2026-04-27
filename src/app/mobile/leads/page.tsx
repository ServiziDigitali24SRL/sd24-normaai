"use client";

import { useState, useEffect } from "react";
import { User, Building2, Lock, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileAuthSheet } from "@/components/mobile/MobileAuthSheet";

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface Lead {
  id: string;
  question_summary: string;
  lead_type: string;
  created_at: string;
  purchased: boolean;
}

function LeadCard({ lead, onBuy }: { lead: Lead; onBuy: (id: string) => void }) {
  const isImpresa = lead.lead_type === "impresa";
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
              {isImpresa ? "Impresa" : "Privato"}
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
          «{lead.question_summary}»
        </div>

        {lead.purchased ? (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(74,155,110,0.12)",
            fontFamily: "var(--sans)", fontSize: 13, color: "var(--alloro)", textAlign: "center",
          }}>
            ✓ Lead acquistato — contatta il cliente
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
            }}>9€</span>
            Acquista lead
          </button>
        )}
      </div>
    </div>
  );
}

export default function MobileLeadsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isProfessionista, setIsProfessionista] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [paymentToast, setPaymentToast] = useState<string | null>(null);

  useEffect(() => {
    // Payment result toast
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setPaymentToast("✓ Lead acquistato! Trovi il contatto in questa lista.");
      window.history.replaceState({}, "", "/mobile/leads");
    } else if (payment === "cancelled") {
      setPaymentToast("Acquisto annullato.");
      window.history.replaceState({}, "", "/mobile/leads");
    }

    const supabase = createSupabase();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUser(user);

      // Check professionista role using the real `role` column in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const professionista = profile?.role === "professionista";
      setIsProfessionista(professionista);

      if (professionista) {
        // Fetch available leads from marketplace_leads (real table name)
        const { data: leadsData } = await supabase
          .from("marketplace_leads")
          .select("id, question_summary, lead_type, created_at")
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .limit(20);

        // Fetch leads already purchased by this professional
        const { data: purchasedLeads } = await supabase
          .from("marketplace_leads")
          .select("id")
          .eq("professional_id", user.id)
          .in("status", ["purchased", "active", "closed"]);

        const purchasedIds = new Set((purchasedLeads ?? []).map((l: { id: string }) => l.id));

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
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error("No redirect URL");
    } catch (err) {
      console.error("[buy-lead]", err);
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--ink-4)", fontSize: 14 }}>Caricamento…</div>
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
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.5 }}>Accedi al tuo account professionista per vedere i lead disponibili.</p>
          <button onClick={() => setShowAuth(true)} style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: "var(--vermiglio)", color: "white", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Accedi
          </button>
        </div>
        <MobileTabBar isAvvocato />
        <MobileAuthSheet
          open={showAuth}
          initialMode="login"
          initialRole="professionista"
          onClose={() => setShowAuth(false)}
        />
      </div>
    );
  }

  if (!isProfessionista) {
    const handleUpgrade = async () => {
      setUpgradingPlan(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "professionista" }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          // Fallback: desktop landing with pricing
          window.location.href = "/?desktop=1#pricing";
        }
      } catch {
        window.location.href = "/?desktop=1#pricing";
      }
      setUpgradingPlan(false);
    };

    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <div className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Piano Professionista</div>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.5 }}>
            Il marketplace lead è riservato ai professionisti iscritti a NormaAI.<br />
            €29/mese · 14 giorni gratis.
          </p>
          <button
            onClick={handleUpgrade}
            disabled={upgradingPlan}
            style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: upgradingPlan ? "var(--paper-3)" : "var(--vermiglio)", color: upgradingPlan ? "var(--ink-4)" : "white", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: upgradingPlan ? "default" : "pointer" }}
          >
            {upgradingPlan ? "Apertura pagamento..." : "Abbonati — 14gg gratis"}
          </button>
        </div>
        <MobileTabBar isAvvocato />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>
      <div style={{ height: "env(safe-area-inset-top, 44px)", background: "var(--paper)", flexShrink: 0 }} />

      {/* Payment toast */}
      {paymentToast && (
        <div style={{
          margin: "8px 16px 0",
          padding: "12px 14px",
          background: paymentToast.startsWith("✓") ? "var(--alloro)" : "var(--paper-3)",
          color: paymentToast.startsWith("✓") ? "white" : "var(--ink-2)",
          borderRadius: 10, fontSize: 13.5, fontFamily: "var(--sans)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span>{paymentToast}</span>
          <button onClick={() => setPaymentToast(null)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", flexShrink: 0 }}>
            <X size={14} color={paymentToast?.startsWith("✓") ? "rgba(255,255,255,0.8)" : "var(--ink-3)"} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid var(--paper-line)", flexShrink: 0 }}>
        <div className="serif" style={{ fontSize: 20 }}>Lead disponibili</div>
        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.08em", marginTop: 3, textTransform: "uppercase" }}>
          {leads.length} richieste • 9€ per lead
        </div>
      </div>

      {/* Lead list */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 12, paddingBottom: 72 }}>
        {leads.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>
            Nessun lead disponibile al momento.<br />
            <span style={{ fontSize: 13 }}>Ricontrolla più tardi.</span>
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
