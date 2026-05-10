// src/lib/oauth/state-cookie.ts
// CSRF state via httpOnly cookie (10 min TTL). Più semplice di una tabella DB
// per single-tenant OAuth flow (Francesco only).

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { OAuthProvider } from './types';

const TTL_MS = 10 * 60 * 1000;

export function cookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

export function generateState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function setStateCookie(
  res: NextResponse,
  provider: OAuthProvider,
  state: string,
): void {
  res.cookies.set({
    name: cookieName(provider),
    value: state,
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // 'lax' è necessario per OAuth redirect
    maxAge: TTL_MS / 1000,
    path: '/',
  });
}

export function readStateCookie(
  req: NextRequest,
  provider: OAuthProvider,
): string | null {
  const c = req.cookies.get(cookieName(provider));
  return c?.value ?? null;
}

export function clearStateCookie(
  res: NextResponse,
  provider: OAuthProvider,
): void {
  res.cookies.set({
    name: cookieName(provider),
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function verifyState(
  req: NextRequest,
  provider: OAuthProvider,
  receivedState: string,
): { ok: boolean; reason?: string } {
  const cookieState = readStateCookie(req, provider);
  if (!cookieState) return { ok: false, reason: 'missing_cookie' };
  if (!receivedState) return { ok: false, reason: 'missing_state' };
  if (cookieState.length !== receivedState.length) return { ok: false, reason: 'length_mismatch' };
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < cookieState.length; i++) {
    diff |= cookieState.charCodeAt(i) ^ receivedState.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'state_mismatch' };
}
