/**
 * SER-78: Anthropic EU Proxy — Cloudflare Worker
 *
 * Deploy in EU region (Frankfurt) per garantire data residency UE.
 * Questo worker fa da reverse proxy verso api.anthropic.com, aggiungendo
 * solo l'header Authorization. Le richieste non vengono modificate.
 *
 * Deploy:
 *   cd workers/anthropic-eu-proxy
 *   wrangler deploy --env production
 *
 * Env vars (wrangler secret put):
 *   ANTHROPIC_API_KEY  — chiave API Anthropic
 *   ALLOWED_ORIGIN     — dominio NormaAI autorizzato (es. https://normaai.it)
 *
 * Una volta deployato, imposta su Vercel:
 *   ANTHROPIC_EU_BASE_URL=https://anthropic-eu-proxy.<account>.workers.dev/v1
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const ANTHROPIC_API = "https://api.anthropic.com";
const ALLOWED_PATHS = /^\/(v1)\//; // whitelist solo /v1/*

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN ?? "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, anthropic-version, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    // Whitelist path: solo /v1/*
    if (!ALLOWED_PATHS.test(url.pathname)) {
      return new Response(JSON.stringify({ error: "Path not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Blocca metodi non sicuri
    if (!["GET", "POST"].includes(request.method)) {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Costruisci URL upstream
    const upstreamUrl = `${ANTHROPIC_API}${url.pathname}${url.search}`;

    // Clona headers e sostituisci auth
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("x-api-key", env.ANTHROPIC_API_KEY);
    upstreamHeaders.delete("host"); // CF aggiunge automaticamente

    // Proxy verso Anthropic
    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.body,
      // @ts-expect-error — duplex necessario per streaming
      duplex: "half",
    });

    const upstreamResponse = await fetch(upstreamRequest);

    // Ritorna la risposta con CORS header aggiunto
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN ?? "*");
    // Rimuovi header che espongono info interne
    responseHeaders.delete("cf-ray");
    responseHeaders.delete("cf-cache-status");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies { fetch: (req: Request, env: Env, ctx: any) => Promise<Response> };
