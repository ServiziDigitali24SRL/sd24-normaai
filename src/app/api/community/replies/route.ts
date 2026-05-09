// SER-167 / Tab 4 / Studio M5 — /api/community/replies (SSE stub).
//
// Stream eventi auto-reply Sofia ogni 4-7s. Mock deterministico:
// 20 template fissi che ciclano + cadenza variabile derivata da timestamp
// (no Math.random). Tutti gli eventi includono disclaimer_present:true.

import { NextRequest } from 'next/server';
import type { ReplyEvent, SocialPlatform, Sentiment } from '@/types/studio-stubs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 250;

const HARD_CLOSE_MS = 240_000;

interface Template {
  platform: SocialPlatform;
  handle: string;
  comment: string;
  reply: string;
  sentiment: Sentiment;
}

const TEMPLATES: ReadonlyArray<Template> = [
  { platform: 'instagram', handle: '@anon_legale_84',
    comment: 'NormaAI sostituisce davvero un avvocato?',
    reply: 'No: NormaAI affianca, non sostituisce. Disclaimer: questa risposta è informativa, per il tuo caso consulta un professionista.',
    sentiment: 'neu' },
  { platform: 'tiktok', handle: '@gianni.real_estate',
    comment: 'Si può usare per agibilità urbanistica?',
    reply: 'Sì, NormaAI cita TUE + circolari edilizie. Verifica sempre con il tuo tecnico abilitato.',
    sentiment: 'pos' },
  { platform: 'linkedin', handle: '@stefania.commercialista',
    comment: 'Quanto costa per uno studio piccolo?',
    reply: '€29/mese piano micro (1 utente), €149/mese piccolo studio (5 utenti). Versione gratuita disponibile per privati.',
    sentiment: 'pos' },
  { platform: 'instagram', handle: '@bruno_tecnico',
    comment: 'L\'AI inventa risposte come ChatGPT?',
    reply: 'NormaAI cita la fonte (sentenza, articolo legge). Se non trova, risponde "non disponibile" invece di inventare.',
    sentiment: 'neu' },
  { platform: 'tiktok', handle: '@maria_inps',
    comment: 'Funziona anche per pratiche INPS?',
    reply: 'Sì: corpus include circolari INPS, messaggi, FAQ. Disclaimer: per la pratica reale, sportello fisico.',
    sentiment: 'pos' },
  { platform: 'linkedin', handle: '@dr.luca.avvocato',
    comment: 'Concorrente diretto degli avvocati?',
    reply: 'Strumento di triage prima del legale. Lo studio resta indispensabile per redazioni atti, udienze, contenzioso.',
    sentiment: 'neu' },
  { platform: 'instagram', handle: '@cittadino_curioso',
    comment: 'Trova le ultime sentenze Cassazione?',
    reply: 'Aggiornamento giornaliero da Italgiure + GUItalia. Le citazioni puntano a fonti ufficiali con data.',
    sentiment: 'pos' },
  { platform: 'tiktok', handle: '@anonimo_diffidente',
    comment: 'Sembra una truffa, dove è il trucco?',
    reply: 'Trasparenza: codice deploy aperto su /come_ho_costruito_norma, costi reali su /studio. Provala gratis senza carta.',
    sentiment: 'neg' },
  { platform: 'linkedin', handle: '@hr.manager.pmi',
    comment: 'Privacy GDPR? I dati restano in Italia?',
    reply: 'Tutti i dati su Supabase EU + Cloudflare R2 EU. Zero traffico verso US. Disclaimer GDPR completo nei T&C.',
    sentiment: 'pos' },
  { platform: 'instagram', handle: '@studente_giurisprudenza',
    comment: 'Posso usarla per studiare?',
    reply: 'Sì, ma verifica sempre sui manuali. NormaAI è un assistente di ricerca, non sostituisce lo studio.',
    sentiment: 'pos' },
  { platform: 'tiktok', handle: '@trader_fiscale',
    comment: 'Risponde su crypto + Agenzia Entrate?',
    reply: 'Risoluzioni AdE crypto + framework MiCA inclusi. Per dichiarazione reale: commercialista.',
    sentiment: 'pos' },
  { platform: 'linkedin', handle: '@geom.giancarlo',
    comment: 'Pratiche edilizie in zona sismica?',
    reply: 'NTC 2018 + ordinanze regionali sismica caricate. Verifica con genio civile per casi specifici.',
    sentiment: 'pos' },
  { platform: 'instagram', handle: '@startup_founder',
    comment: 'C\'è API per integrare nel mio prodotto?',
    reply: 'API B2B in beta — €499/mese, 1k query/giorno. Scrivi a francesco@servizidigitali24.online per accesso.',
    sentiment: 'pos' },
  { platform: 'tiktok', handle: '@dubbioso_lento',
    comment: 'Tempo di risposta? Sembra lento...',
    reply: 'Voice 1.2s avg, chat 600ms avg, avatar 2s sync. Stiamo ottimizzando con Groq llama-3.3-70b.',
    sentiment: 'neu' },
  { platform: 'linkedin', handle: '@procuratore.fallimentare',
    comment: 'Codice Crisi Impresa coperto?',
    reply: 'D.Lgs 14/2019 + correttivi 2024 + circolari ministeriali. Aggiornamento mensile.',
    sentiment: 'pos' },
  { platform: 'instagram', handle: '@anonima_sfiduciata',
    comment: 'Non mi fido di AI italiane.',
    reply: 'Comprensibile. NormaAI è verificabile: ogni citazione ha link diretto alla fonte ufficiale. Provalo, decidi tu.',
    sentiment: 'neg' },
  { platform: 'tiktok', handle: '@user_under30',
    comment: 'C\'è app mobile?',
    reply: 'iOS + Android in beta su TestFlight/Play Internal. Web mobile già ottimizzato (PWA installabile).',
    sentiment: 'pos' },
  { platform: 'linkedin', handle: '@consulente.lavoro',
    comment: 'Calcola TFR + cedolini?',
    reply: 'Risponde su normativa CCNL + interpello ML. Calcoli numerici: usare gestionali dedicati.',
    sentiment: 'neu' },
  { platform: 'instagram', handle: '@nonna.curiosa',
    comment: 'Funziona anche per pensioni?',
    reply: 'Sì, INPS pensioni completo: minima, integrazione, opzione donna, quota 103. Disclaimer: ogni caso è unico.',
    sentiment: 'pos' },
  { platform: 'tiktok', handle: '@haters_gonna_hate',
    comment: 'Avvocato AI = fine del diritto.',
    reply: 'Il diritto resta umano. NormaAI è un aiuto su volumi noiosi, non sulle decisioni. Più tempo per casi veri.',
    sentiment: 'neg' },
];

function pickTemplate(seed: number): Template {
  return TEMPLATES[seed % TEMPLATES.length];
}

function intervalMs(seed: number): number {
  // 4000-7000ms deterministico in base a seed
  return 4000 + ((seed * 941) % 3000);
}

function sseEncode(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

export async function GET(req: NextRequest) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hardCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let counter = Math.floor(Date.now() / 1000) % TEMPLATES.length;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        if (hardCloseTimer) clearTimeout(hardCloseTimer);
        try { controller.close(); } catch { /* already closed */ }
      };

      const emit = () => {
        if (closed) return;
        const t = pickTemplate(counter);
        const ev: ReplyEvent = {
          ts: new Date().toISOString(),
          platform: t.platform,
          user_handle: t.handle,
          comment_excerpt: t.comment,
          sofia_reply: t.reply,
          sentiment: t.sentiment,
          disclaimer_present: true,
        };
        try {
          controller.enqueue(sseEncode('reply', ev));
        } catch {
          cleanup();
          return;
        }
        counter += 1;
        timer = setTimeout(emit, intervalMs(counter));
      };

      // Hello + first event after 1s
      controller.enqueue(sseEncode('hello', { connected: true, ts: new Date().toISOString() }));
      timer = setTimeout(emit, 1000);

      hardCloseTimer = setTimeout(() => {
        try {
          controller.enqueue(sseEncode('reconnect', { reason: 'soft_timeout' }));
        } catch { /* ignore */ }
        cleanup();
      }, HARD_CLOSE_MS);

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      if (hardCloseTimer) clearTimeout(hardCloseTimer);
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
