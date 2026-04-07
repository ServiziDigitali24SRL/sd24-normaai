import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Route API pubbliche (no auth richiesta)
function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname === "/api/chat" ||                        // freemium anonimo consentito
    pathname.startsWith("/api/stripe/webhook") ||      // Stripe non manda cookie
    pathname.startsWith("/api/auth/") ||               // OAuth callbacks
    pathname === "/api/bug-report" ||
    pathname === "/api/developer-waitlist" ||
    pathname === "/api/invest-lead" ||
    pathname === "/api/leads/preview"           // lead preview pubblica
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Determina se la route richiede autenticazione ─────────────────────────
  const isProtectedPageRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/profilo") && !pathname.startsWith("/profilo-pubblico"));

  const isProtectedApiRoute =
    pathname.startsWith("/api/") && !isPublicApiRoute(pathname);

  if (!isProtectedPageRoute && !isProtectedApiRoute) {
    return NextResponse.next();
  }

  // ── Auth check ────────────────────────────────────────────────────────────
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
    if (isProtectedApiRoute) {
      // API route → JSON 401
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    // Page route → redirect alla home
    return NextResponse.redirect(new URL("/", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
