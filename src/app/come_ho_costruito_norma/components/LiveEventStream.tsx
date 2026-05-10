'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SQUADRON_META, mockSnapshot } from '../_lib/mock';
import type { AgentEvent, SquadronId } from '../_lib/types';

const MAX_EVENTS = 100;
const MOCK_INTERVAL_MS = 2500;
const SSE_FAIL_THRESHOLD = 2;
const STREAM_URL = '/api/ops/stream';

/** Pool di eventi sintetici per il demo mode (ricicla in coda). */
const DEMO_TEMPLATES: Omit<AgentEvent, 'ts'>[] = [
  { agentId: 'CORPUS-04',    squadron: 'CORPUS',    message: 'GET gazzetta/2026-05-09 → 200 OK 8 doc' },
  { agentId: 'CHUNKING-03',  squadron: 'CHUNKING',  message: 'doc 89412 → 67 chunk semantici' },
  { agentId: 'EMBEDDING-07', squadron: 'EMBEDDING', message: 'batch 128 → vec 1024 (gemma2-fp16) ok' },
  { agentId: 'RAG-02',       squadron: 'RAG',       message: 'query "Art. 32 Cost." → 9 chunk top, 0,6s' },
  { agentId: 'AGENTS-15',    squadron: 'AGENTS',    message: 'sessione voce iniziata (vapi, avatar Marco)' },
  { agentId: 'SENTINEL-04',  squadron: 'SENTINEL',  message: 'check liveness OK su 8 reparti' },
  { agentId: 'DISCOVERY-03', squadron: 'DISCOVERY', message: 'sito comune.napoli.it → 312 candidati trovati' },
  { agentId: 'OPS-06',       squadron: 'OPS',       message: 'rotazione log nightly completata (2,1 GB)' },
  { agentId: 'META-01',      squadron: 'META',      message: 'rebalance: spawn nuovo CORPUS-29' },
  { agentId: 'CORPUS-11',    squadron: 'CORPUS',    message: 'retry connessione gazzetta (1/3)' },
  { agentId: 'EMBEDDING-02', squadron: 'EMBEDDING', message: 'cache miss, ricomputo 64 chunk' },
  { agentId: 'RAG-09',       squadron: 'RAG',       message: 'reranker top-20 → top-5 in 180 ms' },
  { agentId: 'AGENTS-08',    squadron: 'AGENTS',    message: 'risposta a chat libera in 1,2s' },
];

const FILTER_PILLS: ('all' | SquadronId)[] = [
  'all',
  'CORPUS',
  'CHUNKING',
  'EMBEDDING',
  'RAG',
  'AGENTS',
  'OPS',
  'SENTINEL',
  'DISCOVERY',
  'META',
];

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export function LiveEventStream() {
  const [events, setEvents] = useState<AgentEvent[]>(() => mockSnapshot.recentEvents);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<'connecting' | 'live' | 'demo'>('connecting');
  const [filter, setFilter] = useState<'all' | SquadronId>('all');

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pushEvent = useCallback((ev: AgentEvent) => {
    if (pausedRef.current) return;
    setEvents((prev) => {
      const next = [...prev, ev];
      return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
    });
  }, []);

  // SSE wiring + demo fallback. Defer init a quando il browser è idle (TBT win).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setMode('demo');
      return;
    }

    let demoTimer: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;
    let cleanupListeners: (() => void) | null = null;

    let demoCursor = 0;
    const startDemo = () => {
      if (demoTimer) return;
      setMode('demo');
      demoTimer = setInterval(() => {
        const t = DEMO_TEMPLATES[demoCursor % DEMO_TEMPLATES.length];
        demoCursor += 1;
        pushEvent({ ...t, ts: new Date().toISOString() });
      }, MOCK_INTERVAL_MS);
    };

    const initSse = () => {
      let failCount = 0;
      es = new EventSource(STREAM_URL);

      es.onopen = () => {
        failCount = 0;
        setMode('live');
        if (demoTimer) {
          clearInterval(demoTimer);
          demoTimer = null;
        }
      };

      const onAgentEvent = (rawEv: MessageEvent) => {
        try {
          const data = JSON.parse(rawEv.data);
          // Tab 4 backend payload: { ts, squadron, agent_id, action, status }
          // (legacy fallback: agentId, message/msg per altre fonti SSE)
          const action = data.action ?? data.message ?? data.msg ?? '';
          const status = data.status;
          const composed = status ? `${action} · ${status}` : String(action);
          const next: AgentEvent = {
            ts: data.ts ?? new Date().toISOString(),
            agentId: String(data.agent_id ?? data.agentId ?? 'unknown'),
            squadron: (data.squadron ?? 'META') as SquadronId,
            message: composed,
          };
          pushEvent(next);
        } catch {
          // ignore malformed payload
        }
      };
      es.addEventListener('agent_event', onAgentEvent);

      es.onerror = () => {
        failCount += 1;
        if (failCount >= SSE_FAIL_THRESHOLD || es?.readyState === EventSource.CLOSED) {
          es?.close();
          startDemo();
        }
      };

      cleanupListeners = () => {
        es?.removeEventListener('agent_event', onAgentEvent);
      };
    };

    // Defer SSE setup a "browser idle" per liberare il main thread durante TBT.
    // Fallback setTimeout 200ms se requestIdleCallback non disponibile (Safari).
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    if (typeof win.requestIdleCallback === 'function') {
      idleHandle = win.requestIdleCallback(initSse, { timeout: 1500 });
    } else {
      timeoutHandle = setTimeout(initSse, 200);
    }

    return () => {
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle) clearTimeout(timeoutHandle);
      cleanupListeners?.();
      es?.close();
      if (demoTimer) clearInterval(demoTimer);
    };
  }, [pushEvent]);

  // Auto-scroll fondo quando arrivano nuovi eventi (se non in pausa)
  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events, paused]);

  const visible = useMemo(() => {
    return filter === 'all' ? events : events.filter((e) => e.squadron === filter);
  }, [events, filter]);

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.42_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        07 · cronaca
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Tutto quello che succede
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">in questo momento.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Ogni riga è un’azione di un agente. Lo stream resta aperto finché tieni la
        pagina aperta. Puoi mettere in pausa per leggere senza perdere nulla.
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={
              mode === 'live'
                ? 'inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[oklch(0.42_0.20_35)]'
                : 'inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#756C5E]'
            }
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            aria-live="polite"
          >
            <span aria-hidden="true" className="relative inline-flex h-2 w-2">
              <span
                className={
                  mode === 'live'
                    ? 'absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.58_0.18_35)] opacity-50 motion-reduce:hidden'
                    : 'hidden'
                }
              />
              <span
                className={
                  mode === 'live'
                    ? 'relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.58_0.18_35)]'
                    : 'relative inline-flex h-2 w-2 rounded-full bg-[#756C5E]'
                }
              />
            </span>
            {mode === 'live' ? 'in diretta' : mode === 'demo' ? 'demo' : 'connessione…'}
          </span>
          <span className="text-[12px] text-[#756C5E]">
            {visible.length} {visible.length === 1 ? 'evento' : 'eventi'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded border border-[#D8CFBC] bg-[#FBF8F1] px-3 py-1 text-[12px] uppercase tracking-[0.18em] text-[#13110F] transition hover:border-[#756C5E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[oklch(0.58_0.18_35)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          aria-pressed={paused}
          aria-label={paused ? 'Riprendi lo stream eventi' : 'Metti in pausa lo stream eventi'}
        >
          <span aria-hidden="true">{paused ? '▶ riprendi' : '⏸ pausa'}</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 h-[420px] overflow-y-auto rounded-md border border-[#D8CFBC] bg-[#FBF8F1] p-4"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Cronaca live degli agenti"
      >
        {visible.length === 0 ? (
          <p className="text-[#756C5E]">Nessun evento per il filtro selezionato.</p>
        ) : (
          <ul className="space-y-1.5">
            {visible.map((e, i) => (
              <li key={`${e.ts}-${e.agentId}-${i}`} className="grid grid-cols-[auto_auto_1fr] gap-x-3 leading-relaxed">
                <span className="text-[#9A8E83]">{fmtTime(e.ts)}</span>
                <span style={{ color: SQUADRON_META[e.squadron]?.accent ?? '#13110F' }}>
                  [{e.agentId}]
                </span>
                <span className="text-[#13110F]">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_PILLS.map((p) => {
          const isActive = filter === p;
          const accent = p === 'all' ? 'oklch(0.58 0.18 35)' : SQUADRON_META[p as SquadronId]?.accent;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              className={
                isActive
                  ? 'rounded-full border border-transparent px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#FBF8F1]'
                  : 'rounded-full border border-[#D8CFBC] bg-[#FBF8F1] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#756C5E] transition hover:border-[#756C5E]'
              }
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                ...(isActive ? { backgroundColor: accent } : {}),
              }}
              aria-pressed={isActive}
            >
              {p === 'all' ? 'tutti' : p.toLowerCase()}
            </button>
          );
        })}
      </div>
    </section>
  );
}
