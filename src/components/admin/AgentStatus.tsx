"use client";

interface AgentStatusProps {
  lastDeploy?: string;
}

export default function AgentStatus({ lastDeploy }: AgentStatusProps) {
  const deployDate = lastDeploy ? new Date(lastDeploy) : null;
  const deployStr = deployDate
    ? deployDate.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">
          Monitor Agente VPS
        </p>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
          ONLINE
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-[#4A4A6A]">VPS Hetzner</span>
          <span className="text-white font-mono text-[11px]">89.167.123.25</span>
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-[#4A4A6A]">Ultimo deploy</span>
          <span className="text-[#8888AA] font-mono text-[11px]">{deployStr}</span>
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-[#4A4A6A]">Stack</span>
          <span className="text-[#8888AA] text-[11px]">Docker · n8n · FastAPI</span>
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-[#4A4A6A]">Corpus chunks</span>
          <span className="text-[#00FF88] font-mono text-[11px]">8,057,078</span>
        </div>
      </div>
    </div>
  );
}
