import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Mobile UA patterns
const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

function isMobileUA(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return MOBILE_UA_RE.test(ua);
}

// Route API pubbliche (no auth richiesta)
function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname === "/api/chat" ||                        // freemium anonimo consentito
    pathname === "/api/quota/me" ||                    // quota status (anon ok)
    pathname.startsWith("/api/onboarding/lookup/") ||  // CAP/PIVA lookups (anon ok)
    pathname === "/api/onboarding/finalize" ||         // crea account a fine onboarding
    pathname === "/api/enterprise-leads" ||            // form Su Misura anonimo
    pathname.startsWith("/api/stripe/webhook") ||      // Stripe non manda cookie
    pathname.startsWith("/api/auth/") ||               // OAuth callbacks + OTP SMS
    pathname === "/api/bug-report" ||
    pathname === "/api/developer-waitlist" ||
    pathname === "/api/invest-lead" ||
    pathname === "/api/leads/preview" ||               // lead preview pubblica
    pathname === "/api/mobile/buy-lead" ||              // mobile: acquisto lead
    pathname === "/api/mobile/pay-professional" ||      // mobile: pagamento professionista
    pathname.startsWith("/api/avatar/streaming/") ||     // LiveAvatar WebRTC + ElevenLabs Agent (freemium)
    pathname === "/api/avatar/livesession" ||            // Surface 2: LiveAvatar Beta (auth via X-API-KEY env)
    pathname === "/api/avatar/corpus-tool" ||            // ElevenLabs Agent tool (Bearer-auth)
    pathname === "/api/voice/sofia" ||                   // Surface 1: Sofia voice agent (auth via xi-api-key env)
    pathname === "/api/voice/transcribe" ||              // voice ASR (Voxtral): freemium pubblico
    pathname === "/api/voice/tts" ||                     // voice TTS (Voxtral): freemium pubblico
    pathname === "/api/voice/chat-turn" ||               // voice loop turn (ASR+LLM+TTS)
    pathname === "/api/voice/chat-stream" ||             // voice loop streaming SSE
    pathname === "/api/ops/snapshot" ||                  // SQ-OPS public snapshot (/come_ho_costruito_norma)
    pathname === "/api/ops/stream" ||                    // SQ-OPS public SSE (filtro public-safe interno)
    pathname === "/api/ops/health" ||                    // public health aggregato (no PII)
    pathname === "/api/ops/health/alert" ||              // gate Bearer CRON_SECRET interno
    pathname === "/api/sentinel/heartbeat" ||            // sentinel cron (Bearer CRON_SECRET interno)
    pathname === "/api/community/webhook" ||             // n8n bridge (auth via X-Community-Webhook-Secret env)
    pathname === "/api/community/replies" ||             // Studio M5 stub: SSE auto-reply Sofia
    pathname === "/api/community/sentiment-heatmap" ||   // Studio M5 stub: 7×24 heatmap
    pathname === "/api/ops/squadron/status" ||           // Studio M5 stub: 114 agent grid
    pathname === "/api/ops/spend" ||                     // Studio M5 stub: cost dashboard
    pathname.startsWith("/api/ops/agent/")               // Studio M5 stub: pause agent (in-memory)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ââ Mobile redirect: homepage â /mobile for mobile browsers ââââââââââââââ
  // Only redirect GET requests on "/" or "/avatar" (not API, not assets).
  // SER-184 sprint launch: mobile default surface ora è /voice (Surface 1),
  // /avatar resta desktop-only e mobile UA viene rediretto a /voice.
  // /mobile resta accessibile come legacy bookmark.
  if (
    req.method === "GET" &&
    isMobileUA(req) &&
    !req.nextUrl.searchParams.has("desktop") &&
    (pathname === "/" || pathname === "/avatar")
  ) {
    return NextResponse.redirect(new URL("/voice", req.url));
  }

  // ââ /mobile routes are always public (auth handled client-side) âââââââââââ
  if (pathname.startsWith("/mobile")) {
    return NextResponse.next();
  }

  // SER-184 — /voice (Surface 1 mobile) e /avatar (Surface 2 desktop) sono
  // pubbliche, no auth required. Mic/cam permission gestita lato browser.
  if (pathname === "/voice" || pathname === "/avatar") {
    return NextResponse.next();
  }

  // ââ Determina se la route richiede autenticazione âââââââââââââââââââââââââ
  const isProtectedPageRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/profilo") && !pathname.startsWith("/profilo-pubblico"));

  const isProtectedApiRoute =
    pathname.startsWith("/api/") && !isPublicApiRoute(pathname);

  // /onboarding Ã¨ sempre accessibile agli utenti autenticati
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  // /api/onboarding Ã¨ pubblica per utenti autenticati
  const isOnboardingApi = pathname.startsWith("/api/onboarding/");

  if (!isProtectedPageRoute && !isProtectedApiRoute && !isOnboardingApi) {
    return NextResponse.next();
  }

  // ââ Auth check ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
    if (isProtectedApiRoute || isOnboardingApi) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect a /onboarding se utente autenticato ma onboarding non completato
  // (solo su route protette di pagina, non su /onboarding stessa o API)
  if (isProtectedPageRoute && !isOnboardingRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile && profile.onboarding_completed === false) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
