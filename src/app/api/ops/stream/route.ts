// SER-164 / Tab 4 — /api/ops/stream
// Node runtime · Server-Sent Events · pg LISTEN agent_event.
//
// Long-running connection: Vercel Pro maxDuration 300s, taro a 250s
// (vercel.json) + auto-reconnect lato client a 240s → margine sicuro.
//
// Filtro public-safe (PUBLIC_SAFE_EVENT_FILTER) applicato in uscita:
// /come_ho_costruito_norma è esposto SENZA auth, quindi mai eventi
// security/credenziali. Per /ops/admin (auth, Step 10) creeremo
// /api/ops/admin/stream senza filtro.

import { NextRequest } from 'next/server';
import { Client as PgClient } from 'pg';
import {
  PUBLIC_SAFE_EVENT_FILTER,
  toWirePayload,
  type AgentEventNotifyPayload,
} from '@/types/sse-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 250;

const HEARTBEAT_INTERVAL_MS = 30_000;
const HARD_CLOSE_MS = 240_000; // chiudi prima del maxDuration → client riconnette

function getDatabaseUrl(): string {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      '[ops/stream] Missing POSTGRES_URL_NON_POOLING / SUPABASE_DB_URL env. ' +
        'LISTEN/NOTIFY richiede session-mode (porta 5432, NON pooler 6543).',
    );
  }
  return url;
}

function sseEncode(event: string, data: unknown): Uint8Array {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`);
}

export async function GET(req: NextRequest) {
  let pg: PgClient | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let hardCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // controller chiuso (client disconnesso)
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (hardCloseTimer) clearTimeout(hardCloseTimer);
        if (pg) {
          pg.removeAllListeners('notification');
          pg.end().catch(() => {});
          pg = null;
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        pg = new PgClient({
          connectionString: getDatabaseUrl(),
          ssl: { rejectUnauthorized: false },
        });
        await pg.connect();
        await pg.query('LISTEN agent_event');

        // Hello + heartbeat iniziale
        safeEnqueue(
          sseEncode('heartbeat', { ts: new Date().toISOString(), connected: true }),
        );

        pg.on('notification', (msg) => {
          if (closed || msg.channel !== 'agent_event' || !msg.payload) return;
          let parsed: AgentEventNotifyPayload;
          try {
            parsed = JSON.parse(msg.payload) as AgentEventNotifyPayload;
          } catch {
            return; // payload malformato, scarta
          }
          if (!PUBLIC_SAFE_EVENT_FILTER(parsed)) return;
          // Map a wire format Tab 6: {ts, squadron, agent_id, action, status}
          safeEnqueue(sseEncode('agent_event', toWirePayload(parsed)));
        });

        pg.on('error', (err) => {
          // Errore connessione: notifica + chiudi → client riconnette
          safeEnqueue(
            sseEncode('error', {
              code: 'pg_error',
              message: err.message,
              ts: new Date().toISOString(),
            }),
          );
          cleanup();
        });

        // Heartbeat periodico (keep-alive proxy/CDN)
        heartbeat = setInterval(() => {
          safeEnqueue(sseEncode('heartbeat', { ts: new Date().toISOString() }));
        }, HEARTBEAT_INTERVAL_MS);

        // Hard close prima del maxDuration: forza il client a riconnettere
        hardCloseTimer = setTimeout(() => {
          safeEnqueue(
            sseEncode('reconnect', {
              reason: 'soft_timeout',
              ts: new Date().toISOString(),
            }),
          );
          cleanup();
        }, HARD_CLOSE_MS);

        // Client disconnect (browser chiude tab / Vercel chiude funzione)
        req.signal.addEventListener('abort', cleanup);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        safeEnqueue(sseEncode('error', { code: 'connect_failed', message: msg }));
        cleanup();
      }
    },
    cancel() {
      // ReadableStream cancellata da consumer
      if (heartbeat) clearInterval(heartbeat);
      if (hardCloseTimer) clearTimeout(hardCloseTimer);
      if (pg) {
        pg.removeAllListeners('notification');
        pg.end().catch(() => {});
        pg = null;
      }
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
