"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, { ModalClose } from "../ModalOverlay";
import type { User } from "@supabase/supabase-js";

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

type Tab = "lead" | "acquistati" | "abbonamento" | "wallet";

interface Lead {
  id: string;
  created_at: string;
  tipo: "privato" | "impresa";
  materia: string;
  descrizione: string;
  citta: string;
  prezzo: number;
  status: "disponibile" | "acquistato" | "scaduto";
}

const MATERIA_COLOR: Record<string, string> = {
  "Diritto civile": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Diritto penale": "bg-red-500/10 text-red-400 border-red-500/20",
  "Diritto del lavoro": "bg-green-500/10 text-green-400 border-green-500/20",
  "Diritto tributario": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Diritto amministrativo": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Diritto commerciale": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};
const DEFAULT_MATERIA_COLOR = "bg-accent/10 text-accent border-accent/20";

function getMateriaColor(materia: string) {
  return MATERIA_COLOR[materia] ?? DEFAULT_MATERIA_COLOR;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

export default function ModalDashboard({ open, onClose, user }: Props) {
  const [tab, setTab] = useState<Tab>("lead");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [acquistati, setAcquistati] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const supabase = createClient();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.nome || user?.email?.split("@")[0] || "";
  const categoria = user?.user_metadata?.categoria as string | undefined;
  const piano = user?.user_metadata?.piano as string | undefined ?? "Base";

  useEffect(() => {
    if (!open || !user) return;
    fetchLeads();
    fetchWallet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  async function fetchLeads() {
    setLoading(true);
    try {
      // Lead disponibili (non ancora acquistati)
      const { data: disponibili } = await supabase
        .from("marketplace_leads")
        .select("*")
        .eq("status", "disponibile")
        .order("created_at", { ascending: false })
        .limit(20);

      // Lead già acquistati da questo professionista
      const { data: miei } = await supabase
        .from("marketplace_leads")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setLeads(disponibili ?? []);
      setAcquistati(miei ?? []);
    } catch {
      // Tabella non ancora creata — silent fail, mostra empty state
    } finally {
      setLoading(false);
    }
  }

  async function fetchWallet() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("wallet_credits")
        .eq("id", user.id)
        .single();
      setWalletCredits(data?.wallet_credits ?? 0);
    } catch {
      setWalletCredits(0);
    }
  }

  async function redeemPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Codice non valido.");
      } else {
        setPromoCode("");
        setWalletCredits(data.new_balance);
        showToast(data.message);
      }
    } catch {
      setPromoError("Errore di rete. Riprova.");
    } finally {
      setPromoLoading(false);
    }
  }

  async function buyLead(lead: Lead) {
    if (!user) return;
    setBuyingId(lead.id);
    try {
      // Chiama Stripe checkout per il lead
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, userId: user.id, tipo: "lead", importo: lead.prezzo }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      } else {
        // Fallback: segna interesse senza pagamento (sandbox)
        showToast("Lead riservato. Ti contatteremo per il pagamento.");
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      }
    } catch {
      showToast("Errore. Riprova tra poco.");
    } finally {
      setBuyingId(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const tabClass = (t: Tab) =>
    `text-[12.5px] font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${tab === t ? "bg-[#1a1a1a] text-cream" : "text-[#555] hover:text-[#888]"}`;

  return (
    <ModalOverlay open={open} onClose={onClose} maxWidth="max-w-[700px]">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[15px] font-semibold text-accent uppercase shrink-0">
                {userName.charAt(0)}
              </div>
              <div>
                <div className="text-cream text-[14px] font-semibold leading-tight">{userName}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {categoria && <span className="text-[10.5px] text-[#666]">{categoria}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${piano === "Pro" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" : "text-accent bg-accent/10 border-accent/20"}`}>{piano}</span>
                </div>
              </div>
            </div>
            <ModalClose onClose={onClose} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Lead disponibili", value: leads.length, color: "text-accent" },
              { label: "Lead acquistati", value: acquistati.length, color: "text-green-400" },
              { label: "Piano attivo", value: piano, color: "text-[#888]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-3">
                <div className={`text-[18px] font-semibold leading-tight ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-[#555] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 shrink-0">
          <button className={tabClass("lead")} onClick={() => setTab("lead")}>Lead disponibili {leads.length > 0 && <span className="ml-1 text-[10px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5">{leads.length}</span>}</button>
          <button className={tabClass("acquistati")} onClick={() => setTab("acquistati")}>I miei lead</button>
          <button className={tabClass("abbonamento")} onClick={() => setTab("abbonamento")}>Abbonamento</button>
          <button className={tabClass("wallet")} onClick={() => setTab("wallet")}>
            Wallet {walletCredits !== null && <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 rounded-full px-1.5 py-0.5">€{(walletCredits / 100).toFixed(0)}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Lead disponibili */}
          {!loading && tab === "lead" && (
            <div className="space-y-3">
              {leads.length === 0 ? (
                <EmptyState
                  icon="📭"
                  title="Nessun lead disponibile al momento"
                  sub="I lead vengono generati dai privati che usano NormaAI. Ti notificheremo non appena ne arrivano di nuovi nella tua area."
                />
              ) : (
                leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onBuy={() => buyLead(lead)}
                    buying={buyingId === lead.id}
                    showBuy
                  />
                ))
              )}
            </div>
          )}

          {/* Lead acquistati */}
          {!loading && tab === "acquistati" && (
            <div className="space-y-3">
              {acquistati.length === 0 ? (
                <EmptyState
                  icon="🎯"
                  title="Nessun lead acquistato ancora"
                  sub="I lead che acquisti appaiono qui con tutti i dettagli di contatto per metterti in comunicazione con il cliente."
                />
              ) : (
                acquistati.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} showBuy={false} />
                ))
              )}
            </div>
          )}

          {/* Abbonamento */}
          {!loading && tab === "abbonamento" && (
            <div className="space-y-4">
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-cream text-[14px] font-semibold">Piano {piano}</div>
                    <div className="text-[12px] text-[#555] mt-0.5">Professionista NormaAI</div>
                  </div>
                  <span className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">Attivo</span>
                </div>

                <div className="space-y-2 mb-5">
                  {[
                    "Query illimitate all'AI normativo",
                    "Accesso ai lead qualificati",
                    "Profilo nella directory pubblica",
                    "Chat AI con corpus legislativo completo",
                    "Generazione bozze: pareri, email, memorie",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[12.5px] text-[#888]">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-accent fill-none stroke-[2.5]"><polyline points="20,6 9,17 4,12" /></svg>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#1e1e1e] pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-cream text-[18px] font-semibold">€29</span>
                    <span className="text-[12px] text-[#555]">/mese</span>
                  </div>
                  {piano === "Base" && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: "investi" }))}
                      className="text-[12.5px] text-accent border border-accent/30 hover:bg-accent/10 rounded-lg px-4 py-2 transition-colors"
                    >
                      Passa a Pro →
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
                <h3 className="text-[13px] text-cream font-medium mb-3">Lead — prezzi dal wallet</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[#888]">Lead privato (persona fisica)</span>
                    <span className="text-cream font-medium">€75</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[#888]">Lead impresa / società</span>
                    <span className="text-cream font-medium">€150</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#444] mt-3">I crediti si scalano dal wallet. I crediti non scadono mai.</p>
              </div>
            </div>
          )}

          {/* Wallet */}
          {!loading && tab === "wallet" && (
            <div className="space-y-4">
              {/* Saldo */}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
                <div className="text-[12px] text-[#555] mb-1">Saldo wallet</div>
                <div className="text-[32px] font-semibold text-green-400 leading-tight">
                  €{walletCredits !== null ? (walletCredits / 100).toFixed(2) : "—"}
                </div>
                <p className="text-[11px] text-[#444] mt-2">I crediti non scadono mai. Si scalano automaticamente all&apos;acquisto dei lead.</p>
              </div>

              {/* Codice promozionale */}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
                <h3 className="text-[13px] text-cream font-medium mb-1">Codice promozionale</h3>
                <p className="text-[12px] text-[#555] mb-4">Hai un codice promo? Inseriscilo qui per aggiungere crediti al tuo wallet.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && redeemPromo()}
                    placeholder="Es. LAUNCH50"
                    className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-cream placeholder-[#444] focus:outline-none focus:border-accent/50 font-mono tracking-wider uppercase"
                    disabled={promoLoading}
                  />
                  <button
                    onClick={redeemPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2 bg-accent text-black text-[12.5px] font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {promoLoading ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                    ) : "Applica"}
                  </button>
                </div>
                {promoError && (
                  <p className="text-[12px] text-red-400 mt-2">{promoError}</p>
                )}
              </div>

              {/* Prezzi lead */}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
                <h3 className="text-[13px] text-cream font-medium mb-3">Prezzi lead</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[#888]">Lead privato (persona fisica)</span>
                    <span className="text-cream font-medium">€75</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[#888]">Lead impresa / società</span>
                    <span className="text-cream font-medium">€150</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] bg-[#1a1a1a] border border-[#333] text-cream text-[13px] px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </ModalOverlay>
  );
}

function LeadCard({ lead, onBuy, buying, showBuy }: { lead: Lead; onBuy?: () => void; buying?: boolean; showBuy: boolean }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-[10.5px] font-medium border rounded-full px-2.5 py-0.5 ${getMateriaColor(lead.materia)}`}>{lead.materia}</span>
            <span className={`text-[10.5px] border rounded-full px-2.5 py-0.5 ${lead.tipo === "impresa" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" : "text-[#888] bg-[#1a1a1a] border-[#252525]"}`}>
              {lead.tipo === "impresa" ? "Impresa" : "Privato"}
            </span>
            {lead.citta && <span className="text-[10.5px] text-[#555]">📍 {lead.citta}</span>}
            <span className="text-[10.5px] text-[#444] ml-auto">{timeAgo(lead.created_at)}</span>
          </div>
          <p className="text-[13px] text-[#ccc] leading-[1.5] line-clamp-2">{lead.descrizione || "Cliente cerca consulenza professionale. Acquista per vedere i dettagli completi."}</p>
        </div>

        {showBuy && (
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span className="text-cream text-[15px] font-semibold">€{lead.prezzo ?? (lead.tipo === "impresa" ? 150 : 75)}</span>
            <button
              onClick={onBuy}
              disabled={buying}
              className="text-[12px] bg-accent text-white rounded-lg px-3 py-1.5 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {buying ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : "Acquista →"}
            </button>
          </div>
        )}

        {!showBuy && (
          <span className="text-[10.5px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5 shrink-0">Acquistato</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[36px] mb-3">{icon}</div>
      <p className="text-[13.5px] text-cream font-medium mb-2">{title}</p>
      <p className="text-[12px] text-[#555] max-w-[340px] leading-[1.6]">{sub}</p>
    </div>
  );
}
