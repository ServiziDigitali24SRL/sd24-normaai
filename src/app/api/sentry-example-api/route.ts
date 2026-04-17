import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// B-18 fix: route di test — disabilitata in produzione
export function GET() {
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_EXAMPLE_ENABLED !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
