// SER-81: Reverse prompt caching semantico — Upstash Redis
// Normalizza la query, calcola SHA-256(query_norm + corpus_version) → cache key
// Cache hit → risposta immediata senza RAG + LLM call (-70-90% costo/latenza)

import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Versione corpus: bumpa quando il corpus cambia significativamente
// Imposta via env var per evitare invalidazioni accidentali in prod
const CORPUS_VERSION = process.env.NORMAAI_CORPUS_VERSION ?? "v1";

// TTL cache: 24h di default. Materie volatili (es. fisco) potrebbero usare meno.
const CACHE_TTL_SECONDS = parseInt(process.env.SEMANTIC_CACHE_TTL ?? "86400", 10);

// Cache abilitata solo in prod per default (in dev vogliamo sempre risposta fresca)
const CACHE_ENABLED =
  process.env.SEMANTIC_CACHE_ENABLED === "true" ||
  (process.env.NODE_ENV === "production" && process.env.SEMANTIC_CACHE_ENABLED !== "false");

export interface CachedResponse {
  answer: string;
  sources: Array<{
    id: string;
    titolo: string;
    fonte: string;
    url: string;
    tipo?: string;
    status?: string;
  }>;
  disclaimer: string;
  confidenceScore: number;
  confidenceLevel: string;
  cachedAt: string;
  cacheVersion: string;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  if (!_redis) _redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  return _redis;
}

/**
 * Normalizza la query per massimizzare i cache hit su varianti semanticamente identiche.
 * "Cos'è il contratto di lavoro?" e "cosa è il contratto di lavoro" → stessa chiave.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    // Rimuovi punteggiatura finale e multipla
    .replace(/[?!.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    // Normalizza apostrofi
    .replace(/[''`]/g, "'")
    // Rimuovi articoli iniziali comuni (non cambiano il senso della query)
    .replace(/^(qual è|qual e|cos'è|cos è|cosa è|cosa sono|come si|quando si|dove si)\s+/i, "");
}

/**
 * Genera la cache key da query normalizzata + vertical + corpus_version.
 * vertical è incluso perché lo stesso testo ha risposte diverse per area legale.
 */
export function getCacheKey(query: string, vertical?: string | null): string {
  const normalized = normalizeQuery(query);
  const payload = `${normalized}|${vertical ?? "generic"}|${CORPUS_VERSION}`;
  return `nc:${createHash("sha256").update(payload).digest("hex")}`;
}

/**
 * Recupera una risposta dalla cache semantica.
 * Ritorna null se non trovata o se la cache è disabilitata.
 */
export async function getFromCache(
  query: string,
  vertical?: string | null
): Promise<CachedResponse | null> {
  if (!CACHE_ENABLED) return null;
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = getCacheKey(query, vertical);
    const cached = await redis.get<CachedResponse>(key);
    return cached ?? null;
  } catch {
    // Cache non disponibile → procedi normalmente
    return null;
  }
}

/**
 * Salva una risposta nella cache semantica.
 * Non-blocking: gli errori non propagano.
 */
export async function setInCache(
  query: string,
  vertical: string | null | undefined,
  response: CachedResponse
): Promise<void> {
  if (!CACHE_ENABLED) return;
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = getCacheKey(query, vertical);
    await redis.set(key, response, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Ignora errori di cache
  }
}

/**
 * Invalida tutta la cache (es. dopo aggiornamento corpus).
 * Usa il pattern "nc:*" — richiede Redis con SCAN support.
 */
export async function invalidateAllCache(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    // Upstash supporta SCAN via pipeline
    let cursor = 0;
    let deleted = 0;
    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [nextCursor, keys] = await (redis as any).scan(cursor, { match: "nc:*", count: 100 });
      cursor = parseInt(nextCursor as string, 10);
      if (keys.length > 0) {
        await redis.del(...(keys as string[]));
        deleted += keys.length;
      }
    } while (cursor !== 0);
    return deleted;
  } catch {
    return 0;
  }
}
