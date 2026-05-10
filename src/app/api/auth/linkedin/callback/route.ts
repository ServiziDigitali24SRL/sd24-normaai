// SER-167 / OAuth — LinkedIn callback.
// Exchange code for token, salva in studio.oauth_tokens, redirect a /studio/connections?ok=linkedin

import { NextRequest, NextResponse } from 'next/server';
import { verifyState, clearStateCookie } from '@/lib/oauth/state-cookie';
import { saveTokens } from '@/lib/oauth/token-manager';
import type { TokenResponse } from '@/lib/oauth/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/linkedin/callback`;
}

function fail(reason: string, code = 400): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return NextResponse.redirect(
    `${base}/studio/connections?error=linkedin&reason=${encodeURIComponent(reason)}`,
    code === 400 ? 302 : 302,
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const ldError = url.searchParams.get('error');

  if (ldError) {
    return fail(`linkedin_${ldError}`);
  }
  if (!code) return fail('missing_code');
  if (!state) return fail('missing_state');

  const stateCheck = verifyState(req, 'linkedin', state);
  if (!stateCheck.ok) return fail(`csrf_${stateCheck.reason}`);

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'LinkedIn OAuth not configured' }, { status: 503 });
  }

  // Exchange code for token
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[oauth/linkedin] token exchange failed', tokenRes.status, text.slice(0, 500));
    return fail(`token_exchange_${tokenRes.status}`);
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  try {
    await saveTokens('linkedin', tokens, ['w_member_social', 'r_liteprofile', 'r_emailaddress']);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[oauth/linkedin] save failed', msg);
    return fail(`db_save_${msg.slice(0, 50)}`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  const res = NextResponse.redirect(`${base}/studio/connections?ok=linkedin`);
  clearStateCookie(res, 'linkedin');
  return res;
}
