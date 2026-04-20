"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  accent?: "green" | "blue" | "yellow" | "red" | "default";
  loading?: boolean;
}

const ACCENT_COLORS = {
  green: "text-[#00FF88]",
  blue: "text-[#4F6EF7]",
  yellow: "text-[#F7C94F]",
  red: "text-[#FF4444]",
  default: "text-white",
};

export default function KpiCard({
  label,
  value,
  subLabel,
  accent = "default",
  loading = false,
}: KpiCardProps) {
  const valueColor = ACCENT_COLORS[accent];

  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="h-9 w-24 bg-[#1E1E2E] rounded-lg animate-pulse" />
      ) : (
        <p className={`text-[32px] font-bold leading-none tracking-tight ${valueColor}`}>
          {value}
        </p>
      )}
      {subLabel && (
        <p className="text-[11px] text-[#4A4A6A]">{subLabel}</p>
      )}
    </div>
  );
}
