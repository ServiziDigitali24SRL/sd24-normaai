"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";
import SystemHealth from "@/components/admin/SystemHealth";
import CorpusCard from "@/components/admin/CorpusCard";
import AgentMonitorCard from "@/components/admin/AgentMonitorCard";
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

interface AgentStatusData {
  bash: {
    status: string;
    lastCheck: string;
    lastCheckLabel: string;
    consecutiveFails: number;
    totalChecksToday: number;
  };
  haiku: {
    status: string;
    lastCheck: string;
    lastCheckLabel: string;
    result: string;
    latencyMs: number;
  };
  sonnetFix: {
    lastFix: string | null;
    totalFixes: number;
    label: string;
  };
  vps: {
    ip: string;
    region: string;
    uptime: string;
  };
  checkedAt: string;
}

const ALLOWED_EMAILS = [
  "francesco@servizidigitali24.online",
  "agenticsimpermeo@gmail.com",
];

const REFRESH_INTERVAL_MS = 30_000;

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => {
    const n = Math.round(v);
    if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M${suffix}`;
    if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K${suffix}`;
    return `${prefix}${n}${suffix}`;
  });

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  return <motion.span>{display}</motion.span>;
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{time}</span>;
}

// ─── Animated KPI Card ────────────────────────────────────────────────────────

function AnimatedKpiCard({
  label,
  value,
  numericValue,
  subLabel,
  accent,
  loading,
  prefix = "",
  suffix = "",
  animateNumber = false,
}: {
  label: string;
  value: string;
  numericValue?: number;
  subLabel?: string;
  accent?: "green" | "blue" | "yellow" | "red" | "default";
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  animateNumber?: boolean;
}) {
  const ACCENT_COLORS = {
    green: "text-[#00FF88]",
    blue: "text-[#4F6EF7]",
    yellow: "text-[#F7C94F]",
    red: "text-[#FF4444]",
    default: "text-white",
  };
  const valueColor = ACCENT_COLORS[accent ?? "default"];

  return (
    <motion.div
      className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5 flex flex-col gap-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
        {label}
      </p>
      {loading ? (
        <div className="h-9 w-24 bg-[#1E1E2E] rounded-lg animate-pulse" />
      ) : (
        <p className={`text-[32px] font-bold leading-none tracking-tight ${valueColor}`}>
          {animateNumber && numericValue !== undefined ? (
            <AnimatedNumber value={numericValue} prefix={prefix} suffix={suffix} />
          ) : (
            value
          )}
        </p>
      )}
      {subLabel && (
        <p className="text-[11px] text-[#4A4A6A]">{subLabel}</p>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestorDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [authLoading, setAuthLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [agentData, setAgentData] = useState<AgentStatusData | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

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
      const res = await fetch("/api/dashboard/kpis");
      if (res.ok) setKpiData(await res.json());
    } catch { /* silent */ }
    finally { setKpiLoading(false); }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/dashboard/system-health");
      if (res.ok) setHealthData(await res.json());
    } catch { /* silent */ }
    finally { setHealthLoading(false); }
  }, []);

  const fetchAgent = useCallback(async () => {
    setAgentLoading(true);
    try {
      const res = await fetch("/api/dashboard/agent-status");
      if (res.ok) setAgentData(await res.json());
    } catch { /* silent */ }
    finally { setAgentLoading(false); }
  }, []);

  const refreshAll = useCallback(() => {
    fetchKpis();
    fetchHealth();
    fetchAgent();
    setCountdown(REFRESH_INTERVAL_MS / 1000);
  }, [fetchKpis, fetchHealth, fetchAgent]);

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

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans">

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-50 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#1E1E2E] px-5 py-3 flex items-center justify-between">
        {/* Left: brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6EF7]/30 to-[#00FF88]/20 border border-[#4F6EF7]/40 flex items-center justify-center">
            <span className="text-[12px] font-black text-[#4F6EF7]">N</span>
            {/* animated ring */}
            <span className="absolute inset-0 rounded-lg border border-[#4F6EF7]/20 animate-ping" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white tracking-tight leading-none">
              NormaAI
            </span>
            <span className="text-[10px] text-[#4A4A6A] tracking-wider uppercase">
              Control Room
            </span>
          </div>
        </div>

        {/* Center: LIVE badge */}
        <div className="hidden md:flex items-center gap-2 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-full px-3.5 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse shadow-[0_0_6px_#00FF88]" />
          <span className="text-[11px] font-semibold text-[#00FF88] tracking-wider">
            LIVE
          </span>
          <span className="text-[11px] text-[#4A4A6A]">·</span>
          <span className="text-[11px] text-[#4A4A6A]">
            Aggiornato: <LiveClock />
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#4A4A6A] hidden lg:block">
            refresh in {countdown}s
          </span>
          <button
            onClick={refreshAll}
            className="text-[11px] text-[#6B6B8A] border border-[#1E1E2E] hover:border-[#4F6EF7]/50 hover:text-[#4F6EF7] rounded-lg px-3 py-1.5 transition-all duration-200"
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

      {/* ── Main content ── */}
      <div className="max-w-[1400px] mx-auto px-5 py-8 space-y-8">

        {/* ── Hero header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[28px] font-black text-white tracking-tight leading-none">
                NormaAI — Control Room
              </h1>
              {/* animated green dot */}
              <span className="relative flex h-3 w-3 mt-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-50" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF88]" />
              </span>
            </div>
            <p className="text-[13px] text-[#4A4A6A]">
              Dati in tempo reale · Servizi Digitali 24 S.R.L. · Aprile 2026
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#6B6B8A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F6EF7] inline-block" />
            SaaS normativo AI
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] inline-block ml-1" />
            8M+ chunks RAG
            <span className="w-1.5 h-1.5 rounded-full bg-[#F7C94F] inline-block ml-1" />
            Solo Italia
          </div>
        </motion.div>

        {/* ── Section 1: Hero KPIs ── */}
        <div>
          <SectionLabel>Metriche Chiave</SectionLabel>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <AnimatedKpiCard
              label="Iscritti Totali"
              value={kpi ? formatNumber(kpi.totalUsers) : "—"}
              numericValue={kpi?.totalUsers}
              subLabel="utenti registrati"
              accent="blue"
              loading={kpiLoading}
              animateNumber={!!kpi}
            />
            <AnimatedKpiCard
              label="Domande Oggi"
              value={kpi ? formatNumber(kpi.messagesToday) : "—"}
              numericValue={kpi?.messagesToday}
              subLabel="query AI inviate"
              accent="green"
              loading={kpiLoading}
              animateNumber={!!kpi}
            />
            <AnimatedKpiCard
              label="Abbonati Paganti"
              value={kpi ? formatNumber(kpi.payingSubscribers) : "—"}
              numericValue={kpi?.payingSubscribers}
              subLabel="piani attivi"
              accent="yellow"
              loading={kpiLoading}
              animateNumber={!!kpi}
            />
            <AnimatedKpiCard
              label="MRR"
              value={kpi ? `€${formatNumber(kpi.mrr)}` : "—"}
              numericValue={kpi?.mrr}
              subLabel="ricavo mensile ricorrente"
              accent="green"
              loading={kpiLoading}
              prefix="€"
              animateNumber={!!kpi}
            />
          </div>
        </div>

        {/* ── Section 2: Charts ── */}
        <div>
          <SectionLabel>Trend</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
                  Nuovi Iscritti — Ultimi 30 giorni
                </p>
                <span className="text-[11px] font-mono text-[#4F6EF7]">
                  {charts?.newUsers
                    ? formatNumber(charts.newUsers.reduce((s, d) => s + d.count, 0))
                    : "—"}{" "}
                  totale
                </span>
              </div>
              <LineChart
                data={charts?.newUsers ?? []}
                loading={kpiLoading}
                color="#4F6EF7"
              />
            </motion.div>

            <motion.div
              className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
                  Domande AI — Ultimi 7 giorni
                </p>
                <span className="text-[11px] font-mono text-[#00FF88]">
                  {charts?.messages
                    ? formatNumber(charts.messages.reduce((s, d) => s + d.count, 0))
                    : "—"}{" "}
                  totale
                </span>
              </div>
              <BarChart
                data={charts?.messages ?? []}
                loading={kpiLoading}
                color="#00FF88"
              />
            </motion.div>
          </div>
        </div>

        {/* ── Section 3: Infrastructure ── */}
        <div>
          <SectionLabel>Infrastruttura & Sistema</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <AgentMonitorCard data={agentData} loading={agentLoading} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <CorpusCard />
            </motion.div>
            <motion.div
              className="sm:col-span-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <SystemHealth data={healthData} loading={healthLoading} />
            </motion.div>
          </div>
        </div>

        {/* ── Section 4: Business Model ── */}
        <div>
          <SectionLabel>Business Model</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BizCard
              tag="B2C"
              title="Privato"
              price="Gratis"
              priceColor="text-[#6B6B8A]"
              desc="Query illimitate. Base del funnel. Referral automatico al professionista."
              badge="freemium"
              badgeColor="text-[#6B6B8A] bg-[#1E1E2E] border-[#2A2A3E]"
            />
            <BizCard
              tag="B2B"
              title="Professionista"
              price="€29/mese"
              priceColor="text-[#4F6EF7]"
              desc="+€75 lead privato · +€150 lead impresa. Profilo directory pubblica."
              badge="+ lead marketplace"
              badgeColor="text-[#4F6EF7] bg-[#4F6EF7]/10 border-[#4F6EF7]/20"
            />
            <BizCard
              tag="B2B"
              title="Impresa"
              price="€29–€149/mese"
              priceColor="text-[#00FF88]"
              desc="Micro / Piccola impresa. Query illimitate + funzioni avanzate."
              badge="scalabile"
              badgeColor="text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20"
            />
          </div>
        </div>

        {/* ── Section 5: Corpus snapshot ── */}
        <div>
          <SectionLabel>Corpus Normativo</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CorpusStatCard label="Chunks RAG" value="8.057.078" color="text-[#00FF88]" sub="pgvector 1536d" />
            <CorpusStatCard label="Sorgenti" value="7" color="text-[#4F6EF7]" sub="Normattiva · Cassazione · GU…" />
            <CorpusStatCard label="Embedding" value="100%" color="text-[#00FF88]" sub="completato" />
            <CorpusStatCard label="Copertura" value="88%" color="text-[#F7C94F]" sub="normativa italiana" />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E1E2E] pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-[#2A2A3E]">
            NormaAI · Servizi Digitali 24 S.R.L. · P.IVA IT12345678901
          </p>
          <p className="text-[10px] text-[#2A2A3E]">
            Confidenziale — Solo uso interno e investor pitch
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <p className="text-[11px] font-semibold text-[#4A4A6A] uppercase tracking-widest">
        {children}
      </p>
      <div className="flex-1 h-px bg-[#1E1E2E]" />
    </div>
  );
}

function BizCard({
  tag,
  title,
  price,
  priceColor,
  desc,
  badge,
  badgeColor,
}: {
  tag: string;
  title: string;
  price: string;
  priceColor: string;
  desc: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <motion.div
      className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5"
      whileHover={{ scale: 1.01, borderColor: "rgba(79,110,247,0.3)" }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-[#4A4A6A] bg-[#1E1E2E] border border-[#2A2A3E] rounded px-1.5 py-0.5">
          {tag}
        </span>
        <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="text-[14px] font-semibold text-white mb-1">{title}</p>
      <p className={`text-[18px] font-bold mb-3 ${priceColor}`}>{price}</p>
      <p className="text-[11px] text-[#4A4A6A] leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function CorpusStatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <motion.div
      className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-[24px] font-bold leading-none tracking-tight mb-1 ${color}`}>
        {value}
      </p>
      <p className="text-[10px] text-[#4A4A6A]">{sub}</p>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
