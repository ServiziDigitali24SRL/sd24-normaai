// SER-167 / Tab 4 / Studio M5 — /api/ops/spend (stub).
//
// Mock cost dashboard deterministico. Mese corrente + 30gg trend.
// Numeri realistici per SD24 NormaAI ma fissi (no random).

import { NextResponse } from 'next/server';
import type {
  SpendBreakdown,
  SpendDailyPoint,
  SpendResponse,
} from '@/types/studio-stubs';

export const runtime = 'edge';
export const revalidate = 600;

const BREAKDOWN_FIXED: SpendBreakdown = {
  heygen: 218.4,
  elevenlabs: 142.0,
  groq: 38.5,
  openrouter: 27.8,
  anthropic: 196.0,
  vercel: 80.0,
  supabase: 25.0,
  r2: 12.7,
};

function totalFromBreakdown(b: SpendBreakdown): number {
  return Math.round(
    (b.heygen + b.elevenlabs + b.groq + b.openrouter + b.anthropic + b.vercel + b.supabase + b.r2) * 100,
  ) / 100;
}

function trend30d(monthTotal: number): SpendDailyPoint[] {
  // Distribuzione settimanale: lun-ven più spesa, sab-dom calo
  const points: SpendDailyPoint[] = [];
  const today = new Date();
  const avgDaily = monthTotal / 30;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const dow = (d.getDay() + 6) % 7; // 0=lun .. 6=dom
    const isWeekend = dow >= 5;
    const isFriday = dow === 4;

    let factor: number;
    if (isWeekend) factor = 0.55;
    else if (isFriday) factor = 1.15;
    else factor = 1.05;

    // Variazione deterministica giorno
    const microVar = ((d.getDate() * 7 + d.getMonth()) % 11) / 100; // 0..0.10
    factor *= 1 + microVar - 0.05;

    const dayTotal = Math.round(avgDaily * factor * 100) / 100;
    const delta = Math.round(((dayTotal - avgDaily) / avgDaily) * 1000) / 10;

    points.push({
      date: d.toISOString().slice(0, 10),
      total_eur: dayTotal,
      delta_vs_avg_pct: delta,
    });
  }
  return points;
}

export async function GET() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const total = totalFromBreakdown(BREAKDOWN_FIXED);
  const trend = trend30d(total);
  const avgDaily = Math.round((total / 30) * 100) / 100;

  const payload: SpendResponse = {
    month,
    total_eur: total,
    breakdown: BREAKDOWN_FIXED,
    trend_30d: trend,
    avg_daily_eur: avgDaily,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
  });
}
