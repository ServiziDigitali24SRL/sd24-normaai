// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

if (process.env.NODE_ENV !== 'development') {
  import("@sentry/nextjs").then(({ init, replayIntegration }) => {
    init({
      dsn: "https://b64b0a7ed287cb8c352b11092cfe7519@o4511179464507392.ingest.de.sentry.io/4511179572772944",
      integrations: [replayIntegration()],
      tracesSampleRate: 1,
      enableLogs: true,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true,
    });
  });
}

export const onRouterTransitionStart = async (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') return;
  const { captureRouterTransitionStart } = await import("@sentry/nextjs");
  return (captureRouterTransitionStart as (...a: unknown[]) => unknown)(...args);
};
