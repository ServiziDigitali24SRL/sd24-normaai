// src/lib/oauth/token-manager.ts
// Token lifecycle: store/get/refresh tokens in studio.oauth_tokens.
// Single-tenant per ora (user_id='francesco').

import { createAdminClient } from '@/lib/supabase-admin';
import type { OAuthProvider, OAuthTokenRow, TokenResponse } from './types';

const DEFAULT_USER_ID = 'francesco';
const REFRESH_BUFFER_MS = 60_000; // refresh 60s prima della scadenza

export async function saveTokens(
  provider: OAuthProvider,
  tokens: TokenResponse,
  scopes: string[] | null = null,
  userId: string = DEFAULT_USER_ID,
): Promise<OAuthTokenRow> {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const sb = createAdminClient();
  const { data, error } = await sb
    .schema('studio')
    .from('oauth_tokens')
    .upsert(
      {
        provider,
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? 'Bearer',
        expires_at: expiresAt,
        scopes: scopes ?? (tokens.scope ? tokens.scope.split(/[\s,]+/) : null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider,user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`oauth_tokens upsert failed: ${error.message}`);
  return data as OAuthTokenRow;
}

export async function getTokenRow(
  provider: OAuthProvider,
  userId: string = DEFAULT_USER_ID,
): Promise<OAuthTokenRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .schema('studio')
    .from('oauth_tokens')
    .select('*')
    .eq('provider', provider)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`oauth_tokens lookup failed: ${error.message}`);
  return (data as OAuthTokenRow | null) ?? null;
}

export function isExpiringSoon(row: OAuthTokenRow | null): boolean {
  if (!row?.expires_at) return false;
  return Date.parse(row.expires_at) <= Date.now() + REFRESH_BUFFER_MS;
}

/**
 * Refresh provider-specific. Ritorna il nuovo access_token o solleva.
 */
export async function refreshToken(provider: OAuthProvider, userId: string = DEFAULT_USER_ID): Promise<string> {
  const row = await getTokenRow(provider, userId);
  if (!row) throw new Error(`no token row for provider ${provider}/${userId}`);
  if (!row.refresh_token) throw new Error(`no refresh_token for ${provider} (re-authenticate)`);

  let newTokens: TokenResponse;

  if (provider === 'youtube') {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!r.ok) throw new Error(`youtube refresh failed: ${r.status} ${await r.text()}`);
    newTokens = (await r.json()) as TokenResponse;
    // Google non rimanda il refresh_token: preserva quello vecchio
    if (!newTokens.refresh_token) newTokens.refresh_token = row.refresh_token;
  } else if (provider === 'tiktok') {
    const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!r.ok) throw new Error(`tiktok refresh failed: ${r.status} ${await r.text()}`);
    newTokens = (await r.json()) as TokenResponse;
  } else if (provider === 'linkedin') {
    // LinkedIn supporta refresh ma è raro: richiede `r_liteprofile w_member_social` con app review
    const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!r.ok) throw new Error(`linkedin refresh failed: ${r.status} ${await r.text()}`);
    newTokens = (await r.json()) as TokenResponse;
  } else {
    throw new Error(`refresh not implemented for ${provider}`);
  }

  await saveTokens(provider, newTokens, row.scopes, userId);
  return newTokens.access_token;
}

/**
 * Ritorna un access_token valido (refresh automatico se needed).
 * Usata da /api/publish/* prima di chiamare API esterne.
 */
export async function getValidToken(
  provider: OAuthProvider,
  userId: string = DEFAULT_USER_ID,
): Promise<string> {
  const row = await getTokenRow(provider, userId);
  if (!row) {
    throw new Error(`no token for ${provider}/${userId} — authenticate via /api/auth/${provider}/init`);
  }
  if (isExpiringSoon(row)) {
    return await refreshToken(provider, userId);
  }
  return row.access_token;
}
