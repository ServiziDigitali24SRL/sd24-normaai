// SER-167 — /api/ops/health: aggregato real-time health di 7 componenti.
// Pubblica (no PII), cache CDN 15s. Usata da dashboard ops + alert cron.
//
// Algoritmo overall:
//   - >=2 down → 'down'
//   - 1 down OR >=2 degraded → 'degraded'
//   - tutti up/unknown → 'up'

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  checkDb,
  checkVoti,
  checkGpu,
  checkR2,
  checkN8n,
  checkSofiaAgent,
  checkTelegramBot,
} from '@/lib/ops/health-checks';
import type {
  ComponentHealth,
  HealthStatus,
  OpsHealthResponse,
} from '@/lib/ops/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function settledToHealth(
  component: string,
  result: PromiseSettledResult<ComponentHealth>,
): ComponentHealth {
  if (result.status === 'fulfilled') return result.value;
  const reason =
    result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
  return {
    component,
    status: 'down',
    latency_ms: null,
    message: reason.slice(0, 200),
    checked_at: new Date().toISOString(),
  };
}

function computeOverall(components: ComponentHealth[]): HealthStatus {
  let down = 0;
  let degraded = 0;
  for (const c of components) {
    if (c.status === 'down') down++;
    else if (c.status === 'degraded') degraded++;
  }
  if (down >= 2) return 'down';
  if (down === 1 || degraded >= 2) return 'degraded';
  return 'up';
}

export async function GET() {
  const checks = await Promise.allSettled([
    checkDb(),
    checkVoti(),
    checkGpu(),
    checkR2(),
    checkN8n(),
    checkSofiaAgent(),
    checkTelegramBot(),
  ]);

  const labels = [
    'db',
    'voti',
    'gpu',
    'r2',
    'n8n',
    'sofia_agent',
    'telegram_bot',
  ] as const;

  const components: ComponentHealth[] = checks.map((res, i) =>
    settledToHealth(labels[i], res),
  );

  // Squadrons voti separato (solo dati non-PII per dashboard).
  let squadrons_voti: { squadron: string; voto: number }[] = [];
  try {
    const sb = createAdminClient();
    const votiRes = await sb
      .from('voti_latest')
      .select('squadron, voto');
    if (!votiRes.error) {
      const rows = (votiRes.data ?? []) as { squadron: string; voto: number | null }[];
      squadrons_voti = rows
        .filter((r): r is { squadron: string; voto: number } =>
          typeof r.voto === 'number',
        )
        .map((r) => ({ squadron: r.squadron, voto: r.voto }));
    }
  } catch {
    // non-fatale: voti già tracciato in components
    squadrons_voti = [];
  }

  const payload: OpsHealthResponse = {
    generated_at: new Date().toISOString(),
    overall: computeOverall(components),
    components,
    squadrons_voti,
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
    },
  });
}
