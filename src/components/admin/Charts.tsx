"use client";

interface ChartDataPoint {
  date: string;
  count: number;
}

// ─── Line Chart (nuovi iscritti 30 giorni) ────────────────────────────────────

interface LineChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  color?: string;
}

export function LineChart({ data, loading, color = "#4F6EF7" }: LineChartProps) {
  if (loading || data.length === 0) {
    return (
      <div className="w-full h-[120px] bg-[#1E1E2E] rounded-xl animate-pulse" />
    );
  }

  const W = 600;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 20, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * innerW;
    const y = PAD.top + innerH - (d.count / maxVal) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)}` +
    ` L ${PAD.left} ${(PAD.top + innerH).toFixed(1)} Z`;

  // Show only first, middle, last date labels
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y gridlines */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y}
              y2={y}
              stroke="#1E1E2E"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={y + 4}
              fontSize="9"
              fill="#4A4A6A"
              textAnchor="end"
            >
              {Math.round(t * maxVal)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points (only visible ones) */}
      {points
        .filter((_, i) => i % 5 === 0 || i === points.length - 1)
        .map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
        ))}

      {/* X axis labels */}
      {labelIndices.map((idx) => {
        const p = points[idx];
        const label = p.date.slice(5); // MM-DD
        return (
          <text
            key={idx}
            x={p.x}
            y={H - 4}
            fontSize="9"
            fill="#4A4A6A"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Bar Chart (domande per giorno, 7 giorni) ─────────────────────────────────

interface BarChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  color?: string;
}

export function BarChart({ data, loading, color = "#00FF88" }: BarChartProps) {
  if (loading || data.length === 0) {
    return (
      <div className="w-full h-[100px] bg-[#1E1E2E] rounded-xl animate-pulse" />
    );
  }

  const W = 400;
  const H = 100;
  const PAD = { top: 8, right: 4, bottom: 24, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barWidth = (innerW / data.length) * 0.6;
  const barGap = (innerW / data.length) * 0.4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Y gridlines */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y}
              y2={y}
              stroke="#1E1E2E"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={y + 4}
              fontSize="9"
              fill="#4A4A6A"
              textAnchor="end"
            >
              {Math.round(t * maxVal)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const barH = maxVal > 0 ? (d.count / maxVal) * innerH : 0;
        const x = PAD.left + i * (barWidth + barGap) + barGap / 2;
        const y = PAD.top + innerH - barH;
        const dayLabel = new Date(d.date).toLocaleDateString("it-IT", {
          weekday: "short",
        });
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="3"
              fill={color}
              fillOpacity={d.count === 0 ? 0.2 : 0.85}
            />
            <text
              x={x + barWidth / 2}
              y={H - 8}
              fontSize="9"
              fill="#4A4A6A"
              textAnchor="middle"
            >
              {dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
