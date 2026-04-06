import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/next";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/ssr";

// Arcjet è opzionale: se la chiave non è configurata il middleware funziona comunque
const aj = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      characteristics: ["ip.src"],
      rules: [
        // Blocca bot noti (crawler malevoli, scanner, ecc.)
        detectBot({
          mode: "LIVE",
          allow: [
            "CATEGORY:SEARCH_ENGINE",  // Google, Bing, DuckDuckGo
            "CATEGORY:MONITOR",        // Uptime monitors
            "CATEGORY:PREVIEW",        // Social media preview
          ],
        }),
        // Shield: protezione da injection, path traversal, SQLi, XSS
        shield({ mode: "LIVE" }),
        // Rate limit base per IP: 100 req/min per tutti
        tokenBucket({
          mode: "LIVE",
          refillRate: 100,
          interval: 60,
          capacity: 100,
        }),
      ],
    })
  : null;

export async function middleware(req: NextRequest) {
  // ── Arcjet security check ──────────────────────────────────────────────────
  if (aj) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { error: "Troppe richieste. Riprova tra qualche secondo.", code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
      if (decision.reason.isBot()) {
        return NextResponse.json(
          { error: "Accesso non autorizzato.", code: "BOT_DETECTED" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Richiesta bloccata.", code: "BLOCKED" },
        { status: 403 }
      );
    }
  }

  // ── Auth check per rotte protette ─────────────────────────────────────────
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/app") ||
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/profilo");

  if (isProtectedRoute) {
    const supabase = createClient(
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // read-only in middleware, handled by response
            void cookiesToSet;
          },
        },
      } as Parameters<typeof createClient>[0],
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Rate limit differenziato per /api ─────────────────────────────────────
  // Le rotte API hanno già Arcjet dal wrapper nel controller.
  // Questo blocco aggiunge header di debug in dev.
  if (process.env.NODE_ENV === "development" && req.nextUrl.pathname.startsWith("/api")) {
    const res = NextResponse.next();
    res.headers.set("X-Arcjet-Decision", decision.conclusion);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tutte le rotte eccetto _next/static, _next/image, favicon.ico, .well-known e file statici
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
