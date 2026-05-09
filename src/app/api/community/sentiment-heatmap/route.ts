// SER-167 / Tab 4 / Studio M5 — /api/community/sentiment-heatmap.
//
// JSON 7×24 heatmap deterministica. Peaks fissi su Lun/Mer/Ven 19-22
// (engagement reali tipici social IT). Score [-1..1], volume 0..200.

import { NextResponse } from 'next/server';
import type {
  HeatmapCell,
  SentimentDayTotals,
  SentimentHeatmapResponse,
} from '@/types/studio-stubs';

export const runtime = 'edge';
export const revalidate = 300;

const DAY_LABELS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const PEAK_DAYS = new Set([0, 2, 4]); // Lun, Mer, Ven
const PEAK_HOURS = new Set([19, 20, 21, 22]);

function cellScore(day: number, hour: number): { score: number; volume: number } {
  const isPeakDay = PEAK_DAYS.has(day);
  const isPeakHour = PEAK_HOURS.has(hour);
  const isWeekend = day === 5 || day === 6;
  const isNight = hour >= 0 && hour < 6;

  if (isNight) {
    return { score: 0.05, volume: 4 + (hour % 3) };
  }
  if (isPeakDay && isPeakHour) {
    return { score: 0.62, volume: 180 + ((day * 7 + hour) % 20) };
  }
  if (isPeakHour) {
    return { score: 0.42, volume: 110 + ((day * 7 + hour) % 15) };
  }
  if (isWeekend && hour >= 10 && hour < 23) {
    return { score: 0.28, volume: 60 + ((day * 7 + hour) % 12) };
  }
  if (hour >= 8 && hour < 10) {
    return { score: 0.15, volume: 35 + ((day * 7 + hour) % 8) };
  }
  if (hour >= 12 && hour < 15) {
    return { score: 0.18, volume: 50 + ((day * 7 + hour) % 10) };
  }
  if (hour >= 15 && hour < 19) {
    return { score: 0.22, volume: 65 + ((day * 7 + hour) % 12) };
  }
  if (hour >= 23) {
    return { score: -0.08, volume: 25 + (hour % 4) };
  }
  return { score: 0.1, volume: 20 + (hour % 6) };
}

function dayTotals(day: number): SentimentDayTotals {
  let total = 0;
  let posScore = 0;
  let negScore = 0;
  let neuScore = 0;

  for (let h = 0; h < 24; h++) {
    const c = cellScore(day, h);
    total += c.volume;
    if (c.score > 0.2) posScore += c.volume;
    else if (c.score < 0) negScore += c.volume;
    else neuScore += c.volume;
  }

  const pct = (n: number) => Math.round((n / Math.max(total, 1)) * 1000) / 10;
  return {
    day,
    day_label: DAY_LABELS[day],
    positive_pct: pct(posScore),
    neutral_pct: pct(neuScore),
    negative_pct: pct(negScore),
    events_total: total,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10), 1), 7);

  const matrix: HeatmapCell[] = [];
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const c = cellScore(day, hour);
      matrix.push({ day, hour, score: c.score, volume: c.volume });
    }
  }

  const daily_totals: SentimentDayTotals[] = [];
  for (let day = 0; day < days; day++) {
    daily_totals.push(dayTotals(day));
  }

  const payload: SentimentHeatmapResponse = {
    days,
    generated_at: new Date().toISOString(),
    matrix,
    daily_totals,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
