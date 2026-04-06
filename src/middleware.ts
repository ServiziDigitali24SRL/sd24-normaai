import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/next";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Arcjet è opzionale: se la chiave non è configurata il middleware funziona comunque
const aj = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      characteristics: ["ip.src"],
      rules: [
        detectBot({
          mode: "LIVE",
          allow: [
            "CATEGORY:SEARCH_ENGINE",
            "CATEGORY:MONITOR",
            "CATEGORY:PREVIEW",
          ],
        }),
        shield({ mode: "LIVE" }),
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
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
