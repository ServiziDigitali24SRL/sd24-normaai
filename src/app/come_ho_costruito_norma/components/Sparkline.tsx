interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** CSS color string. Default = brand accent. */
  stroke?: string;
  /** Pixel padding inside the SVG so endpoints don't get clipped. */
  pad?: number;
  /** Show a small dot at the most recent value. */
  endDot?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  stroke = 'oklch(0.58 0.18 35)',
  pad = 2,
  endDot = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const lastX = pad + innerW;
  const lastY = pad + innerH - ((data[data.length - 1] - min) / range) * innerH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Andamento ultimi ${data.length} giorni: da ${data[0]} a ${data[data.length - 1]}`}
      className="inline-block align-middle"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      {endDot && (
        <circle cx={lastX} cy={lastY} r="1.75" fill={stroke} />
      )}
    </svg>
  );
}
