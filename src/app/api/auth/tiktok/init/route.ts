// SER-167 / OAuth — TikTok init (preparazione, attivo quando review approvata).
// Content Posting API scopes: video.upload + video.publish + user.info.basic.

import { NextRequest, NextResponse } from 'next/server';
import { generateState, setStateCookie } from '@/lib/oauth/state-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/tiktok/callback`;
}

export async function GET(_req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY not configured' }, { status: 503 });
  }

  const state = generateState();
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(','), // TikTok usa virgola, non spazio
    state,
  });

  const res = NextResponse.redirect(`${TIKTOK_AUTH_URL}?${params.toString()}`);
  setStateCookie(res, 'tiktok', state);
  return res;
}
