// SER-167 / OAuth — YouTube (Google) init.
// Scopes: youtube.upload + youtube. access_type=offline + prompt=consent per refresh_token.

import { NextRequest, NextResponse } from 'next/server';
import { generateState, setStateCookie } from '@/lib/oauth/state-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/youtube/callback`;
}

export async function GET(_req: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID not configured' }, { status: 503 });
  }

  const state = generateState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  setStateCookie(res, 'youtube', state);
  return res;
}
