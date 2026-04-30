// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b64b0a7ed287cb8c352b11092cfe7519@o4511179464507392.ingest.de.sentry.io/4511179572772944",

  // SER-65: 10% sampling in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // SER-65 + SER-80: GDPR — MAI inviare PII e MAI Session Replay
  // Session Replay registrerebbe le chat legali degli utenti = violazione GDPR grave
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // SER-65: Scrub PII lato client prima dell'invio
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    if (event.request?.cookies) {
      event.request.cookies = {};
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
