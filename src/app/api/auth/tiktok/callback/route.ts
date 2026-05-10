// SER-167 / OAuth — TikTok callback (preparazione, attivo quando review approvata).

import { NextRequest, NextResponse } from 'next/server';
import { verifyState, clearStateCookie } from '@/lib/oauth/state-cookie';
import { saveTokens } from '@/lib/oauth/token-manager';
import type { TokenResponse } from '@/lib/oauth/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/tiktok/callback`;
}

function fail(reason: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return NextResponse.redirect(
    `${base}/studio/connections?error=tiktok&reason=${encodeURIComponent(reason)}`,
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const ttError = url.searchParams.get('error');

  if (ttError) return fail(`tiktok_${ttError}`);
  if (!code) return fail('missing_code');
  if (!state) return fail('missing_state');

  const stateCheck = verifyState(req, 'tiktok', state);
  if (!stateCheck.ok) return fail(`csrf_${stateCheck.reason}`);

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: 'TikTok OAuth not configured' }, { status: 503 });
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[oauth/tiktok] token exchange failed', tokenRes.status, text.slice(0, 500));
    return fail(`token_exchange_${tokenRes.status}`);
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  try {
    await saveTokens('tiktok', tokens, ['user.info.basic', 'video.upload', 'video.publish']);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[oauth/tiktok] save failed', msg);
    return fail(`db_save_${msg.slice(0, 50)}`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  const res = NextResponse.redirect(`${base}/studio/connections?ok=tiktok`);
  clearStateCookie(res, 'tiktok');
  return res;
}
