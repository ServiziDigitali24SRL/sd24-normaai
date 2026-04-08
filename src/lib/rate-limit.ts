// Rate limiter ibrido: in-memory (veloce) + Supabase (persistente cross-instance)
// Strategia: in-memory come prima linea, Supabase per enforcement cross-serverless

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory: prima linea di difesa (fast path, resettabile su cold start)
const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

function inMemoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= maxRequests;
  return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
}

// Supabase-based: persistente cross-instance, usato per utenti autenticati
// Usa la tabella `queries` esistente — nessuna tabella nuova necessaria
async function supabaseUserCheck(
  userId: string,
  maxPerMinute: number
): Promise<boolean> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await supabase
      .from("queries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if (error) return true; // fail open se il DB non risponde
    return (count ?? 0) < maxPerMinute;
  } catch {
    return true; // fail open
  }
}

// Export principale: per utenti anonimi usa solo in-memory, per autenticati aggiunge check Supabase
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  return inMemoryCheck(key, maxRequests, windowMs);
}

// Export per utenti autenticati: check robusto cross-instance
export async function rateLimitUser(
  userId: string,
  maxPerMinute: number = 10
): Promise<boolean> {
  // Fast path: in-memory
  const memResult = inMemoryCheck(`user:${userId}`, maxPerMinute, 60_000);
  if (!memResult.allowed) return false;

  // Slow path: Supabase (solo se in-memory lo passa, per non rallentare ogni richiesta)
  return supabaseUserCheck(userId, maxPerMinute);
}
