// SER-167 — /api/ops/health/alert: alerter Telegram per Vercel cron */2 min.
// Bearer ${CRON_SECRET}. Internamente fetcha /api/ops/health, invia
// alert P1 quando un componente passa da up→down e recovery quando torna up.
// Anti-spam: dedup tramite Set<string> module-scoped (process-local).
//
// NB: Vercel serverless è multi-istanza, quindi il dedup è best-effort:
// in caso di fan-out la worst case è un alert duplicato per cycle.

import { NextResponse } from 'next/server';
import type { OpsHealthResponse } from '@/lib/ops/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Module-scoped state (process-local). Persiste finché lambda è caldo.
const alertedComponents: Set<string> = new Set();

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout_telegram_5000ms')), 5_000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: ctrl.signal,
        cache: 'no-store',
      },
    );
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  // ── Auth: Bearer CRON_SECRET ───────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  if (!constantTimeEqual(auth, expected)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID_FRANCESCO;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://normaai.it';

  // ── Fetch /api/ops/health ──────────────────────────────────────────────────
  let health: OpsHealthResponse;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(
      () => ctrl.abort(new Error('timeout_health_15000ms')),
      15_000,
    );
    try {
      const res = await fetch(`${siteUrl}/api/ops/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'health_fetch_failed', status: res.status },
          { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      health = (await res.json()) as OpsHealthResponse;
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'health_fetch_error', message: msg.slice(0, 200) },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // ── Diff vs stato precedente ───────────────────────────────────────────────
  let alertsSent = 0;
  let recoveriesSent = 0;
  const telegramReady = Boolean(botToken && chatId);

  for (const c of health.components) {
    if (c.status === 'down') {
      if (!alertedComponents.has(c.component)) {
        alertedComponents.add(c.component);
        if (telegramReady) {
          const text =
            `🔴 <b>ALERT P1 — Component DOWN</b>\n` +
            `Component: <code>${escapeHtml(c.component)}</code>\n` +
            `Latency: ${c.latency_ms ?? 'n/a'} ms\n` +
            `Message: ${escapeHtml(c.message ?? '')}\n` +
            `Health: ${siteUrl}/api/ops/health`;
          const ok = await sendTelegram(botToken!, chatId!, text);
          if (ok) alertsSent++;
        }
      }
    } else if (c.status === 'up') {
      if (alertedComponents.has(c.component)) {
        alertedComponents.delete(c.component);
        if (telegramReady) {
          const text =
            `🟢 <b>RECOVERED</b>\n` +
            `Component: <code>${escapeHtml(c.component)}</code>\n` +
            `Latency: ${c.latency_ms ?? 'n/a'} ms\n` +
            `Health: ${siteUrl}/api/ops/health`;
          const ok = await sendTelegram(botToken!, chatId!, text);
          if (ok) recoveriesSent++;
        }
      }
    }
  }

  return NextResponse.json(
    {
      checked: health.components.length,
      alerts_sent: alertsSent,
      recoveries_sent: recoveriesSent,
      telegram_configured: telegramReady,
      components_summary: health.components.map((c) => ({
        component: c.component,
        status: c.status,
      })),
      overall: health.overall,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
