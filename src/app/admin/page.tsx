"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import KpiCard from "@/components/admin/KpiCard";
import AgentStatus from "@/components/admin/AgentStatus";
import SystemHealth from "@/components/admin/SystemHealth";
import CorpusCard from "@/components/admin/CorpusCard";
import { LineChart, BarChart } from "@/components/admin/Charts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiData {
  kpis: {
    totalUsers: number;
    messagesToday: number;
    payingSubscribers: number;
    mrr: number;
  };
  charts: {
    newUsers: { date: string; count: number }[];
    messages: { date: string; count: number }[];
  };
}

interface HealthData {
  vercel: { ok: boolean };
  supabase: { ok: boolean; latency: number | null; error?: string };
  openRouter: {
    ok: boolean;
    credits: number | null;
    limit: number | null;
    usage: number | null;
    error?: string;
  };
  checkedAt: string;
}

const ALLOWED_EMAILS = [
  "francesco@servizidigitali24.online",
  "agenticsimpermeo@gmail.com",
];

const REFRESH_INTERVAL_MS = 30_000;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [authLoading, setAuthLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || !ALLOWED_EMAILS.includes(data.user.email ?? "")) {
        router.replace("/");
        return;
      }
      setAuthed(true);
      setAuthLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await fetch("/api/admin/kpis");
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
      }
    } catch {
      // silent
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/system-health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {
      // silent
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchKpis();
    fetchHealth();
    setLastRefresh(new Date());
    setCountdown(REFRESH_INTERVAL_MS / 1000);
  }, [fetchKpis, fetchHealth]);

  // Initial load after auth
  useEffect(() => {
    if (!authed) return;
    refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authed, refreshAll]);

  // Countdown ticker
  useEffect(() => {
    if (!authed) return;
    const ticker = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_INTERVAL_MS / 1000;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [authed]);

  // ── Render states ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0F]">
        <div className="w-7 h-7 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpi = kpiData?.kpis;
  const charts = kpiData?.charts;

  const lastRefreshStr = lastRefresh
    ? lastRefresh.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans">
      {/* Topbar */}
      <div className="sticky top-0 z-50 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#1E1E2E] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#4F6EF7]/20 border border-[#4F6EF7]/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#4F6EF7]">N</span>
          </div>
          <div>
            <span className="text-[14px] font-semibold text-white">NormaAI</span>
            <span className="text-[11px] text-[#4A4A6A] ml-2">Control Room</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#4A4A6A] hidden sm:block">
            Aggiornato alle {lastRefreshStr} · prossimo in {countdown}s
          </span>
          <button
            onClick={refreshAll}
            className="text-[11px] text-[#6B6B8A] border border-[#1E1E2E] hover:border-[#4F6EF7]/40 hover:text-[#4F6EF7] rounded-lg px-3 py-1.5 transition-colors"
          >
            Aggiorna
          </button>
          <a
            href="/"
            className="text-[11px] text-[#6B6B8A] border border-[#1E1E2E] hover:border-[#2A2A3E] rounded-lg px-3 py-1.5 transition-colors hidden sm:block"
          >
            ← App
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">
            Investor Dashboard
          </h1>
          <p className="text-[13px] text-[#4A4A6A] mt-1">
            Dati in tempo reale · NormaAI · Servizi Digitali 24 S.R.L.
          </p>
        </div>

        {/* ── Section 1: Hero KPIs ── */}
        <div>
          <SectionLabel>Metriche Chiave</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Iscritti Totali"
              value={kpi ? formatNumber(kpi.totalUsers) : "—"}
              subLabel="utenti registrati"
              accent="blue"
              loading={kpiLoading}
            />
            <KpiCard
              label="Domande Oggi"
              value={kpi ? formatNumber(kpi.messagesToday) : "—"}
              subLabel="query AI inviate"
              accent="green"
              loading={kpiLoading}
            />
            <KpiCard
              label="Abbonati Paganti"
              value={kpi ? formatNumber(kpi.payingSubscribers) : "—"}
              subLabel="piani attivi"
              accent="yellow"
              loading={kpiLoading}
            />
            <KpiCard
              label="MRR"
              value={kpi ? `€${formatNumber(kpi.mrr)}` : "—"}
              subLabel="ricavo mensile ricorrente"
              accent="green"
              loading={kpiLoading}
            />
          </div>
        </div>

        {/* ── Section 2: Charts ── */}
        <div>
          <SectionLabel>Trend</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Line chart — new users 30d */}
            <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
                  Nuovi Iscritti — Ultimi 30 giorni
                </p>
                <span className="text-[11px] font-mono text-[#4F6EF7]">
                  {charts?.newUsers
                    ? formatNumber(
                        charts.newUsers.reduce((s, d) => s + d.count, 0)
                      )
                    : "—"}
                  {" "}totale
                </span>
              </div>
              <LineChart
                data={charts?.newUsers ?? []}
                loading={kpiLoading}
                color="#4F6EF7"
              />
            </div>

            {/* Bar chart — messages 7d */}
            <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
                  Domande AI — Ultimi 7 giorni
                </p>
                <span className="text-[11px] font-mono text-[#00FF88]">
                  {charts?.messages
                    ? formatNumber(
                        charts.messages.reduce((s, d) => s + d.count, 0)
                      )
                    : "—"}
                  {" "}totale
                </span>
              </div>
              <BarChart
                data={charts?.messages ?? []}
                loading={kpiLoading}
                color="#00FF88"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Infrastructure ── */}
        <div>
          <SectionLabel>Infrastruttura</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AgentStatus />
            <CorpusCard />
            <SystemHealth data={healthData} loading={healthLoading} />
          </div>
        </div>

        {/* ── Section 4: Business model snapshot ── */}
        <div>
          <SectionLabel>Business Model</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BizCard
              icon="🆓"
              title="B2C Privato"
              price="Gratis"
              desc="Query illimitate. Base del funnel."
              color="text-[#6B6B8A]"
            />
            <BizCard
              icon="⚖️"
              title="B2B Professionista"
              price="€29/mese"
              desc="+ €75 lead privato · €150 lead impresa"
              color="text-[#4F6EF7]"
            />
            <BizCard
              icon="🏢"
              title="B2B Impresa"
              price="€29–€149/mese"
              desc="Micro/Piccola. Query illimitate."
              color="text-[#00FF88]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E1E2E] pt-6 pb-4 text-center">
          <p className="text-[10px] text-[#2A2A3E]">
            NormaAI · Servizi Digitali 24 S.R.L. · Confidenziale — Solo uso interno
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[#4A4A6A] uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function BizCard({
  icon,
  title,
  price,
  desc,
  color,
}: {
  icon: string;
  title: string;
  price: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
      <div className="text-[20px] mb-3">{icon}</div>
      <p className="text-[13px] font-semibold text-white mb-1">{title}</p>
      <p className={`text-[15px] font-bold mb-2 ${color}`}>{price}</p>
      <p className="text-[11px] text-[#4A4A6A] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
