// SER-167 / OAuth — YouTube (Google) callback.

import { NextRequest, NextResponse } from 'next/server';
import { verifyState, clearStateCookie } from '@/lib/oauth/state-cookie';
import { saveTokens } from '@/lib/oauth/token-manager';
import type { TokenResponse } from '@/lib/oauth/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/youtube/callback`;
}

function fail(reason: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return NextResponse.redirect(
    `${base}/studio/connections?error=youtube&reason=${encodeURIComponent(reason)}`,
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const gError = url.searchParams.get('error');

  if (gError) return fail(`google_${gError}`);
  if (!code) return fail('missing_code');
  if (!state) return fail('missing_state');

  const stateCheck = verifyState(req, 'youtube', state);
  if (!stateCheck.ok) return fail(`csrf_${stateCheck.reason}`);

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'YouTube OAuth not configured' }, { status: 503 });
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[oauth/youtube] token exchange failed', tokenRes.status, text.slice(0, 500));
    return fail(`token_exchange_${tokenRes.status}`);
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  try {
    await saveTokens('youtube', tokens, [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[oauth/youtube] save failed', msg);
    return fail(`db_save_${msg.slice(0, 50)}`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  const res = NextResponse.redirect(`${base}/studio/connections?ok=youtube`);
  clearStateCookie(res, 'youtube');
  return res;
}
