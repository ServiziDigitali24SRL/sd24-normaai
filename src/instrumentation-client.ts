// SER-181 — Sentry client lazy + minimo bundle.
//
// Configurazione precedente (replay 10% sampling + traces 100%) caricava
// ~120 kB di JS extra al primo paint, contribuendo a Lighthouse Perf 44 in
// prod su /come_ho_costruito_norma. Replay registra anche le chat legali
// → conflitto GDPR già escluso in sentry.client.config.ts (replay 0).
// Allineiamo questo file allo stesso standard:
//
//   - replaysSessionSampleRate: 0  (no replay → grosso saving bundle + GDPR)
//   - replaysOnErrorSampleRate: 0  (idem)
//   - tracesSampleRate: 0.1        (10% in prod, era 100%)
//   - enableLogs: false            (overhead, già loggi via console)
//   - sendDefaultPii: false        (GDPR + meno payload)
//
// L'import dinamico esistente (Sentry SDK lazy-loaded dopo il primo paint)
// resta invariato — è già la best practice di Sentry per Next.js.
//
// `requestIdleCallback` aggiuntivo per spostare anche il microtask dell'init
// in idle time (TBT win): l'errore tracking potrebbe perdere errori nei
// primi 200-1500 ms ma è un trade-off accettabile per la pagina pubblica
// di marketing /come_ho_costruito_norma.

if (process.env.NODE_ENV !== 'development') {
  const initSentry = () => {
    import("@sentry/nextjs").then(({ init }) => {
      init({
        dsn: "https://b64b0a7ed287cb8c352b11092cfe7519@o4511179464507392.ingest.de.sentry.io/4511179572772944",
        // No integrations extra — niente replay, niente browser tracing pesante.
        // Per ottenere browser tracing in futuro, usare BrowserTracing su singole
        // route critiche (auth, payment) invece che globalmente.
        integrations: [],
        tracesSampleRate: 0.1,
        enableLogs: false,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        sendDefaultPii: false,
      });
    }).catch(() => {
      // Sentry init failure should not break the app
    });
  };

  if (typeof window !== 'undefined') {
    type IdleCb = (cb: () => void, opts?: { timeout: number }) => number;
    const ric = (window as Window & { requestIdleCallback?: IdleCb }).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(initSentry, { timeout: 3000 });
    } else {
      setTimeout(initSentry, 1500);
    }
  }
}

export const onRouterTransitionStart = async (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') return;
  try {
    const { captureRouterTransitionStart } = await import("@sentry/nextjs");
    return (captureRouterTransitionStart as (...a: unknown[]) => unknown)(...args);
  } catch {
    // Sentry not loaded yet; skip silently
  }
};
