import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SENTRY_WEBHOOK_SECRET = process.env.SENTRY_WEBHOOK_SECRET ?? "";
const GITHUB_TOKEN = process.env.GH_PAT_AUTOFIX ?? "";
const REPO = "ServiziDigitali24SRL/sd24-normaai";

// Only attempt autofix for code errors, not network/infra errors
const FIXABLE_ERRORS = [
  "TypeError",
  "ReferenceError",
  "SyntaxError",
  "RangeError",
  "UnhandledPromiseRejection",
  "Error",
];

const SKIP_PATTERNS = [
  "fetch failed",
  "network",
  "ECONNREFUSED",
  "ENOTFOUND",
  "AbortError",
  "socket hang up",
  "timeout",
];

function isFixable(error: { type: string; value: string }): boolean {
  const isCodeError = FIXABLE_ERRORS.some((t) => error.type?.includes(t));
  const isNetworkError = SKIP_PATTERNS.some((p) =>
    error.value?.toLowerCase().includes(p.toLowerCase())
  );
  return isCodeError && !isNetworkError;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify Sentry webhook signature
  if (SENTRY_WEBHOOK_SECRET) {
    const sig = req.headers.get("sentry-hook-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", SENTRY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    if (sig !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle new issues (not updates/resolved)
  const action = payload.action as string;
  if (action !== "created") {
    return NextResponse.json({ skipped: true });
  }

  const issue = payload.data as {
    issue?: {
      title?: string;
      culprit?: string;
      metadata?: { type?: string; value?: string };
      permalink?: string;
    };
  };

  const title = issue?.issue?.title ?? "";
  const culprit = issue?.issue?.culprit ?? "";
  const errorType = issue?.issue?.metadata?.type ?? "Error";
  const errorValue = issue?.issue?.metadata?.value ?? title;
  const permalink = issue?.issue?.permalink ?? "";

  if (!isFixable({ type: errorType, value: errorValue })) {
    return NextResponse.json({ skipped: "non-fixable error type" });
  }

  // Trigger GitHub Actions workflow
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "sentry-error",
        client_payload: {
          error_type: errorType,
          error_message: errorValue,
          culprit,
          permalink,
          title,
        },
      }),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }

  return NextResponse.json({ triggered: true });
}
