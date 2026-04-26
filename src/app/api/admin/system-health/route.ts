import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = [
  "francesco@servizidigitali24.online",
  "agenticsimpermeo@gmail.com",
];

const OPENROUTER_API_KEY =
  "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";

export async function GET(_req: NextRequest) {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !ALLOWED_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results = await Promise.allSettled([
    // 1. Supabase DB ping — time a simple count query
    pingSupabase(),
    // 2. OpenRouter credits
    fetchOpenRouterCredits(),
  ]);

  const [supabaseResult, openRouterResult] = results;

  const supabase =
    supabaseResult.status === "fulfilled"
      ? supabaseResult.value
      : { ok: false, latency: null, error: (supabaseResult.reason as Error)?.message };

  const openRouter =
    openRouterResult.status === "fulfilled"
      ? openRouterResult.value
      : { ok: false, credits: null, error: (openRouterResult.reason as Error)?.message };

  return NextResponse.json({
    vercel: { ok: true }, // if we got here, Vercel is up
    supabase,
    openRouter,
    checkedAt: new Date().toISOString(),
  });
}

async function pingSupabase(): Promise<{
  ok: boolean;
  latency: number | null;
  error?: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, latency: null, error: "Missing env vars" };
  }

  const t0 = Date.now();
  const client = createClient(url, key);
  const { error } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .limit(1);

  const latency = Date.now() - t0;

  if (error) {
    return { ok: false, latency, error: error.message };
  }
  return { ok: true, latency };
}

async function fetchOpenRouterCredits(): Promise<{
  ok: boolean;
  credits: number | null;
  limit: number | null;
  usage: number | null;
  error?: string;
}> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {
        ok: false,
        credits: null,
        limit: null,
        usage: null,
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    // OpenRouter returns { data: { label, usage, limit, is_free_tier, rate_limit } }
    const keyData = data?.data ?? data;
    const limit = keyData?.limit ?? null;
    const usage = keyData?.usage ?? null;
    const credits = limit !== null && usage !== null ? Math.max(0, limit - usage) : null;

    return { ok: true, credits, limit, usage };
  } catch (err) {
    return {
      ok: false,
      credits: null,
      limit: null,
      usage: null,
      error: (err as Error)?.message,
    };
  }
}
