// SER-167 / OAuth — LinkedIn init.
// Single-tenant Francesco. Redirect a LinkedIn authorization URL con state CSRF cookie.

import { NextRequest, NextResponse } from 'next/server';
import { generateState, setStateCookie } from '@/lib/oauth/state-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const SCOPES = ['w_member_social', 'r_liteprofile', 'r_emailaddress'];

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://normaai.it';
  return `${base}/api/auth/linkedin/callback`;
}

export async function GET(_req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID not configured' }, { status: 503 });
  }

  const state = generateState();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(' '),
    state,
  });

  const url = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  const res = NextResponse.redirect(url);
  setStateCookie(res, 'linkedin', state);
  return res;
}
