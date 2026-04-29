// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b64b0a7ed287cb8c352b11092cfe7519@o4511179464507392.ingest.de.sentry.io/4511179572772944",

  // SER-65: 10% sampling in production — tracesSampleRate:1 inviava TUTTI i trace (GDPR violation)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // SER-65: GDPR — MAI inviare PII di default (email, IP, cookie, auth headers)
  sendDefaultPii: false,

  // SER-65: Scrub PII sensibili prima dell'invio a Sentry
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }
    if (event.request?.cookies) {
      event.request.cookies = {};
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    if (event.request?.url?.includes("/api/health")) {
      return null;
    }
    return event;
  },
});
