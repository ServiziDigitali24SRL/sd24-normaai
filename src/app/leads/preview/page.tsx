"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Lead {
  id: string;
  vertical: string;
  vertical_id: string;
  city: string | null;
  tier: string;
  price_cents: number;
  created_at: string;
  summary_preview: string;
}

const VERTICALS = [
  { value: "", label: "Tutte le aree" },
  { value: "avvocato", label: "Diritto Civile" },
  { value: "commercialista", label: "Fisco e Tributi" },
  { value: "lavoro", label: "Diritto del Lavoro" },
  { value: "tecnico", label: "Edilizia e Tecnica" },
  { value: "finanziario", label: "Finanza" },
];

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  hot: { label: "🔥 Urgente", color: "bg-red-50 text-red-700 border-red-200" },
  warm: { label: "⚡ Caldo", color: "bg-orange-50 text-orange-700 border-orange-200" },
  cold: { label: "📋 Standard", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(0)}`;
}

export default function LeadsPreviewPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verticale, setVerticale] = useState("");
  const [citta, setCitta] = useState("");
  const [prezzoMax, setPrezzoMax] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (verticale) params.set("verticale", verticale);
    if (citta.trim()) params.set("citta", citta.trim());
    if (prezzoMax) params.set("prezzo_max", prezzoMax);
    const res = await fetch(`/api/leads/preview?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
      setCount(data.count ?? 0);
    }
    setLoading(false);
  }, [verticale, citta, prezzoMax]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const tier = (t: string) => TIER_LABELS[t] ?? TIER_LABELS.cold;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E1D8] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif text-[18px] tracking-[-0.5px] text-[#1a1a1a]">
            Norma<span className="text-[#E8340A]">AI</span>
          </Link>
          <Link
            href="/"
            className="bg-[#E8340A] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#c42d08] transition-colors"
          >
            Accedi come Professionista →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#E8340A10] border border-[#E8340A25] text-[#E8340A] text-[12px] px-3 py-1 rounded-full mb-3">
            👥 Lead Marketplace — Aggiornato in tempo reale
          </div>
          <h1 className="font-serif text-[32px] md:text-[40px] text-[#1a1a1a] mb-3 leading-tight">
            Lead disponibili questa settimana
          </h1>
          <p className="text-[15px] text-[#666] max-w-2xl mx-auto">
            Anteprima anonimizzata dei lead generati dalla piattaforma. Abbonati come professionista per acquistare i lead completi con nome, email e numero di telefono.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-4 mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] text-[#888] block mb-1 uppercase tracking-wide">Area</label>
            <select
              value={verticale}
              onChange={(e) => setVerticale(e.target.value)}
              className="w-full border border-[#ddd] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#E8340A]"
            >
              {VERTICALS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] text-[#888] block mb-1 uppercase tracking-wide">Città</label>
            <input
              type="text"
              placeholder="es. Milano, Roma…"
              value={citta}
              onChange={(e) => setCitta(e.target.value)}
              className="w-full border border-[#ddd] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#E8340A]"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] text-[#888] block mb-1 uppercase tracking-wide">Prezzo max</label>
            <select
              value={prezzoMax}
              onChange={(e) => setPrezzoMax(e.target.value)}
              className="w-full border border-[#ddd] rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#E8340A]"
            >
              <option value="">Qualsiasi</option>
              <option value="50">Fino a €50</option>
              <option value="75">Fino a €75</option>
              <option value="100">Fino a €100</option>
              <option value="150">Fino a €150</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchLeads}
              className="bg-[#F0EDE8] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#E0DCD6] transition-colors"
            >
              Filtra
            </button>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] text-[#666]">
            {loading ? "Caricamento…" : `${count} lead ${count === 1 ? "disponibile" : "disponibili"} questa settimana`}
          </div>
          <div className="text-[11.5px] text-[#999]">Dati anonimizzati — aggiornati ogni 60s</div>
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-[#E5E1D8] rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-[#f0ede8] rounded w-1/3 mb-3" />
                <div className="h-3 bg-[#f0ede8] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[#f0ede8] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-[#999]">
            <div className="text-[40px] mb-3">📭</div>
            <div className="text-[15px]">Nessun lead trovato con questi filtri.</div>
            <button onClick={() => { setVerticale(""); setCitta(""); setPrezzoMax(""); }} className="text-[#E8340A] text-[13px] mt-2 hover:underline">
              Rimuovi filtri
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white border border-[#E5E1D8] rounded-xl p-5 hover:border-[#C8C2BA] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[12px] font-medium text-[#1a1a1a] bg-[#f5f3ef] border border-[#E5E1D8] px-2 py-0.5 rounded-full">
                        {lead.vertical}
                      </span>
                      <span className={`text-[11px] border px-2 py-0.5 rounded-full ${tier(lead.tier).color}`}>
                        {tier(lead.tier).label}
                      </span>
                      {lead.city && (
                        <span className="text-[11.5px] text-[#888]">📍 {lead.city}</span>
                      )}
                    </div>
                    <div className="text-[14px] text-[#1a1a1a] font-medium mb-1">
                      {lead.summary_preview}
                      <span className="text-[#ccc] ml-1">████████████████</span>
                    </div>
                    <div className="text-[11.5px] text-[#999]">{formatDate(lead.created_at)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-[18px] font-bold text-[#1a1a1a]">{formatPrice(lead.price_cents)}</div>
                    <Link
                      href="/"
                      className="bg-[#E8340A] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#c42d08] transition-colors whitespace-nowrap"
                    >
                      Acquista lead →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA bottom */}
        <div className="mt-10 bg-[#F0EDE8] rounded-2xl p-8 text-center">
          <div className="text-[28px] font-serif text-white mb-2">Vuoi acquistare questi lead?</div>
          <p className="text-[#999] text-[14px] mb-6 max-w-lg mx-auto">
            Abbonati come professionista a €29/mese e accedi ai lead completi con nome, email, numero di telefono e contesto della richiesta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-[#E8340A] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#c42d08] transition-colors"
            >
              Inizia il trial gratuito 14 giorni →
            </Link>
            <Link
              href="/"
              className="border border-[#C8C2BA] text-[#ccc] font-medium px-6 py-3 rounded-lg hover:border-[#666] transition-colors"
            >
              Scopri come funziona
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
