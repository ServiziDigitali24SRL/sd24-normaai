// SER-167 / OAuth — YouTube refresh.
// POST con Bearer CRON_SECRET (uso interno) → forza refresh + ritorna nuovo expires_at.
// Auto-refresh anche disponibile via getValidToken() lato consumer.

import { NextRequest, NextResponse } from 'next/server';
import { refreshToken, getTokenRow } from '@/lib/oauth/token-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    await refreshToken('youtube');
    const row = await getTokenRow('youtube');
    return NextResponse.json({
      ok: true,
      provider: 'youtube',
      expires_at: row?.expires_at,
      updated_at: row?.updated_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ ok: false, error: msg.slice(0, 300) }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  // Status only (read-only, no refresh)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const row = await getTokenRow('youtube');
  if (!row) return NextResponse.json({ ok: false, error: 'no_token' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    provider: 'youtube',
    has_refresh_token: Boolean(row.refresh_token),
    expires_at: row.expires_at,
    scopes: row.scopes,
    updated_at: row.updated_at,
  });
}
