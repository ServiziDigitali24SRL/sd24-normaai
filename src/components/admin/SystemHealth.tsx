"use client";

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

interface SystemHealthProps {
  data: HealthData | null;
  loading: boolean;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? "bg-[#00FF88]" : "bg-[#FF4444]"}`}
    />
  );
}

function HealthRow({
  label,
  ok,
  detail,
  loading,
}: {
  label: string;
  ok: boolean;
  detail?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1E1E2E] last:border-0">
      <div className="flex items-center gap-2.5">
        {loading ? (
          <span className="w-2 h-2 rounded-full bg-[#1E1E2E] animate-pulse" />
        ) : (
          <StatusDot ok={ok} />
        )}
        <span className="text-[13px] text-white">{label}</span>
      </div>
      <span className="text-[11px] font-mono text-[#6B6B8A]">
        {loading ? "..." : detail ?? (ok ? "OK" : "ERROR")}
      </span>
    </div>
  );
}

export default function SystemHealth({ data, loading }: SystemHealthProps) {
  const orUsagePct =
    data?.openRouter.limit && data.openRouter.usage != null
      ? Math.round((data.openRouter.usage / data.openRouter.limit) * 100)
      : null;

  const checkedAt = data?.checkedAt
    ? new Date(data.checkedAt).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
          System Health
        </p>
        {checkedAt && (
          <span className="text-[10px] text-[#4A4A6A] font-mono">{checkedAt}</span>
        )}
      </div>

      <HealthRow label="Vercel" ok={data?.vercel.ok ?? true} detail="Deployed" loading={loading} />
      <HealthRow
        label="Supabase DB"
        ok={data?.supabase.ok ?? false}
        detail={
          data?.supabase.latency != null
            ? `${data.supabase.latency}ms`
            : data?.supabase.error?.slice(0, 20) ?? undefined
        }
        loading={loading}
      />
      <HealthRow
        label="OpenRouter"
        ok={data?.openRouter.ok ?? false}
        detail={
          data?.openRouter.credits != null
            ? `$${data.openRouter.credits.toFixed(2)} left${orUsagePct != null ? ` · ${orUsagePct}% used` : ""}`
            : data?.openRouter.error?.slice(0, 24) ?? undefined
        }
        loading={loading}
      />
    </div>
  );
}
