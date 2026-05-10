// SER-167 — health check helpers per /api/ops/health
//
// Ogni check ritorna un ComponentHealth con timeout esplicito.
// Convenzioni:
//   - status='unknown'  → env mancante o configurazione assente
//   - status='down'     → check eseguito e fallito (timeout, http >= 500, errore)
//   - status='degraded' → eseguito, ma risposta fuori soglia (es. http 4xx non critico)
//   - status='up'       → tutto ok
//
// Nessuna PII, nessun secret nei message. message viene troncato a 200 char.

import { createAdminClient } from '@/lib/supabase-admin';
import type { ComponentHealth, HealthStatus } from './types';

const TIMEOUT_DB_MS = 3_000;
const TIMEOUT_REMOTE_MS = 5_000;
const MESSAGE_MAX_LEN = 200;

function truncate(s: string): string {
  if (s.length <= MESSAGE_MAX_LEN) return s;
  return s.slice(0, MESSAGE_MAX_LEN - 1) + '…';
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, rej) => {
        timer = setTimeout(
          () => rej(new Error(`timeout_${label}_${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function makeResult(
  component: string,
  status: HealthStatus,
  startedAt: number,
  message?: string,
): ComponentHealth {
  return {
    component,
    status,
    latency_ms: status === 'unknown' ? null : Date.now() - startedAt,
    ...(message ? { message: truncate(message) } : {}),
    checked_at: nowIso(),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
  label: string,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new Error(`timeout_${label}_${ms}ms`)),
    ms,
  );
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── DB Supabase ───────────────────────────────────────────────────────────────
export async function checkDb(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'db';
  try {
    const sb = createAdminClient();
    const result = await withTimeout(
      Promise.resolve(
        sb
          .from('voti_latest')
          .select('squadron', { head: true, count: 'exact' })
          .limit(1),
      ),
      TIMEOUT_DB_MS,
      'db',
    );
    if (result.error) {
      return makeResult(component, 'down', startedAt, result.error.message);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── Voti 8 squadron ───────────────────────────────────────────────────────────
export async function checkVoti(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'voti';
  try {
    const sb = createAdminClient();
    const result = await withTimeout(
      Promise.resolve(sb.from('voti_latest').select('squadron, voto')),
      TIMEOUT_DB_MS,
      'voti',
    );
    if (result.error) {
      return makeResult(component, 'down', startedAt, result.error.message);
    }
    const rows = (result.data ?? []) as { squadron: string; voto: number | null }[];
    const positive = rows.filter((r) => typeof r.voto === 'number' && r.voto > 0).length;
    if (positive >= 8) {
      return makeResult(component, 'up', startedAt, `voti_positive=${positive}`);
    }
    if (positive >= 4) {
      return makeResult(
        component,
        'degraded',
        startedAt,
        `voti_positive=${positive}/8`,
      );
    }
    return makeResult(
      component,
      'down',
      startedAt,
      `voti_positive=${positive}/8`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── GPU embed.normaai.it ──────────────────────────────────────────────────────
export async function checkGpu(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'gpu';
  try {
    const res = await fetchWithTimeout(
      'https://embed.normaai.it/health',
      { method: 'GET', cache: 'no-store' },
      TIMEOUT_REMOTE_MS,
      'gpu',
    );
    if (!res.ok) {
      return makeResult(component, 'down', startedAt, `http_${res.status}`);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── R2 (HEAD opzionale) ───────────────────────────────────────────────────────
export async function checkR2(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'r2';
  const url = process.env.R2_HEALTHCHECK_URL;
  if (!url) {
    return makeResult(component, 'unknown', startedAt, 'R2_HEALTHCHECK_URL not set');
  }
  try {
    const res = await fetchWithTimeout(
      url,
      { method: 'HEAD', cache: 'no-store' },
      TIMEOUT_REMOTE_MS,
      'r2',
    );
    if (!res.ok) {
      return makeResult(component, 'down', startedAt, `http_${res.status}`);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── n8n ────────────────────────────────────────────────────────────────────────
export async function checkN8n(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'n8n';
  try {
    const res = await fetchWithTimeout(
      'https://n8n.normaai.it/healthz',
      { method: 'GET', cache: 'no-store' },
      TIMEOUT_REMOTE_MS,
      'n8n',
    );
    if (!res.ok) {
      return makeResult(component, 'down', startedAt, `http_${res.status}`);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── ElevenLabs Sofia agent ────────────────────────────────────────────────────
export async function checkSofiaAgent(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'sofia_agent';
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID_SOFIA;
  if (!apiKey || !agentId) {
    return makeResult(
      component,
      'unknown',
      startedAt,
      'ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID_SOFIA not set',
    );
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': apiKey },
        cache: 'no-store',
      },
      TIMEOUT_REMOTE_MS,
      'sofia_agent',
    );
    if (!res.ok) {
      return makeResult(component, 'down', startedAt, `http_${res.status}`);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}

// ── Telegram bot health ───────────────────────────────────────────────────────
export async function checkTelegramBot(): Promise<ComponentHealth> {
  const startedAt = Date.now();
  const component = 'telegram_bot';
  try {
    const res = await fetchWithTimeout(
      'https://telegram.normaai.it/healthz',
      { method: 'GET', cache: 'no-store' },
      TIMEOUT_REMOTE_MS,
      'telegram_bot',
    );
    if (!res.ok) {
      return makeResult(component, 'down', startedAt, `http_${res.status}`);
    }
    return makeResult(component, 'up', startedAt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return makeResult(component, 'down', startedAt, msg);
  }
}
