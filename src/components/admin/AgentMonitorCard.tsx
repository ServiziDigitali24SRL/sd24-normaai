"use client";

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

interface AgentMonitorCardProps {
  data: AgentStatusData | null;
  loading: boolean;
}

function PulseDot({ color = "green" }: { color?: "green" | "yellow" | "red" | "gray" }) {
  const cls = {
    green: "bg-[#00FF88] shadow-[0_0_8px_#00FF88]",
    yellow: "bg-[#F7C94F] shadow-[0_0_8px_#F7C94F]",
    red: "bg-[#FF4444] shadow-[0_0_8px_#FF4444]",
    gray: "bg-[#4A4A6A]",
  }[color];
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls} ${color !== "gray" ? "animate-pulse" : ""}`}
    />
  );
}

function MonitorRow({
  label,
  status,
  badge,
  detail,
  loading,
}: {
  label: string;
  status: "ok" | "warn" | "error" | "idle";
  badge: string;
  detail?: string;
  loading?: boolean;
}) {
  const dotColor = { ok: "green", warn: "yellow", error: "red", idle: "gray" }[status] as
    | "green"
    | "yellow"
    | "red"
    | "gray";

  const badgeStyle = {
    ok: "text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20",
    warn: "text-[#F7C94F] bg-[#F7C94F]/10 border-[#F7C94F]/20",
    error: "text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20",
    idle: "text-[#6B6B8A] bg-[#1E1E2E] border-[#2A2A3E]",
  }[status];

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1E1E2E] last:border-0">
      <div className="flex items-center gap-2.5">
        {loading ? (
          <span className="w-2 h-2 rounded-full bg-[#1E1E2E] animate-pulse" />
        ) : (
          <PulseDot color={dotColor} />
        )}
        <span className="text-[13px] text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && (
          <span className="text-[10px] font-mono text-[#4A4A6A] hidden sm:block">
            {detail}
          </span>
        )}
        {loading ? (
          <div className="h-4 w-16 bg-[#1E1E2E] rounded-full animate-pulse" />
        ) : (
          <span
            className={`text-[10px] font-medium border rounded-full px-2.5 py-0.5 ${badgeStyle}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AgentMonitorCard({ data, loading }: AgentMonitorCardProps) {
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
          NormaAI Agent Monitor
        </p>
        <div className="flex items-center gap-2">
          {checkedAt && (
            <span className="text-[10px] text-[#4A4A6A] font-mono hidden sm:block">
              {checkedAt}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
            VPS ONLINE
          </span>
        </div>
      </div>

      <MonitorRow
        label="Bash Check"
        status="ok"
        badge={data ? `OK · ${data.bash.lastCheckLabel}` : "—"}
        detail={data ? `${data.bash.totalChecksToday} check oggi` : undefined}
        loading={loading}
      />
      <MonitorRow
        label="Haiku Validator"
        status="ok"
        badge={data ? `PASS · ${data.haiku.lastCheckLabel}` : "—"}
        detail={data ? `${data.haiku.latencyMs}ms` : undefined}
        loading={loading}
      />
      <MonitorRow
        label="Sonnet Auto-fix"
        status="idle"
        badge={data?.sonnetFix.label ?? "—"}
        detail="mai attivato"
        loading={loading}
      />

      {/* VPS info footer */}
      <div className="mt-3 pt-3 border-t border-[#1E1E2E] grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-[#4A4A6A] mb-0.5">VPS</p>
          <p className="text-[11px] font-mono text-[#8888AA]">{data?.vps.ip ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#4A4A6A] mb-0.5">Uptime</p>
          <p className="text-[11px] font-mono text-[#00FF88]">{data?.vps.uptime ?? "—"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] text-[#4A4A6A] mb-0.5">Regione</p>
          <p className="text-[11px] text-[#6B6B8A]">{data?.vps.region ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
