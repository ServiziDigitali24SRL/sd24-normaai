// SER-164 / Tab 4 — /api/sentinel/heartbeat
//
// Health check consumato da:
//   - Vercel Cron (vercel.json schedule */5 * * * *)
//   - cron systemd Hetzner GEX44 (parallelo, no PAT)
//
// Risposta sempre JSON. Status:
//   ok        → DB raggiungibile + ultimo evento < 5 min fa
//   degraded  → DB ok ma silent > 5 min (no eventi recenti)
//   down      → DB non raggiungibile o errori
// Codice HTTP: 200 (ok), 200 (degraded), 503 (down).
//
// Authorization: Bearer <CRON_SECRET> richiesto se CRON_SECRET è settato.
// In assenza di CRON_SECRET la route è pubblica (utile in dev/preview).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import type { SentinelHeartbeatResponse } from '@/lib/ops/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROCESS_STARTED_AT = Date.now();

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const checks: SentinelHeartbeatResponse['checks'] = {
    db: 'fail',
    sse_listener: 'ok', // best-effort: non possiamo verificare LISTEN da qui
    last_voti_age_seconds: null,
  };
  let lastEventAge: number | null = null;

  try {
    const sb = createAdminClient();
    const [eventRes, votiRes] = await Promise.all([
      sb
        .from('agent_events')
        .select('occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from('voti_history')
        .select('snapshot_at')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!eventRes.error) {
      checks.db = 'ok';
      const ts = (eventRes.data as { occurred_at: string } | null)?.occurred_at;
      lastEventAge = ts ? Math.floor((Date.now() - Date.parse(ts)) / 1000) : null;
    }
    if (!votiRes.error) {
      const ts = (votiRes.data as { snapshot_at: string } | null)?.snapshot_at;
      checks.last_voti_age_seconds = ts
        ? Math.floor((Date.now() - Date.parse(ts)) / 1000)
        : null;
    }
  } catch {
    checks.db = 'fail';
  }

  let status: SentinelHeartbeatResponse['status'];
  if (checks.db !== 'ok') {
    status = 'down';
  } else if (lastEventAge !== null && lastEventAge > 300) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  const body: SentinelHeartbeatResponse = {
    status,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000),
    last_event_age_seconds: lastEventAge,
    checks,
  };

  return NextResponse.json(body, {
    status: status === 'down' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}
