import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VAPI_PUBLIC_KEY = "1fe0aa87-b7a0-4394-b877-d846fa06035d";
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || "";
const ASSISTANT_ID = "e4cb1d2b-5afa-440c-94e7-51380cdc1f4a"; // classico
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const ALERT_EMAIL = "francesco@servizidigitali24.online";
const CRON_SECRET = process.env.CRON_SECRET || "";

async function sendAlert(subject: string, body: string) {
  if (!BREVO_API_KEY) return;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "NormaAI Monitor", email: "noreply@normaai.it" },
      to: [{ email: ALERT_EMAIL }],
      subject,
      textContent: body,
    }),
  });
}

export async function GET(req: NextRequest) {
  // Autorizzazione: Vercel Cron invia Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();
  let callId: string | null = null;

  try {
    // 1. Crea chiamata web
    const res = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PUBLIC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistantId: ASSISTANT_ID }),
    });

    const latencyMs = Date.now() - startMs;

    if (!res.ok) {
      const body = await res.text();
      const msg = `[NormaAI Voice Monitor] FAILURE ${res.status}\nLatency: ${latencyMs}ms\nBody: ${body}\nTime: ${new Date().toISOString()}`;
      await sendAlert(`🔴 NormaAI Voce KO — ${res.status}`, msg);
      return NextResponse.json({ ok: false, status: res.status, body, latencyMs }, { status: 200 });
    }

    const data = await res.json();
    callId = data.id;

    // 2. Termina subito la chiamata per non consumare crediti
    if (callId && VAPI_PRIVATE_KEY) {
      await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ended" }),
      }).catch(() => { /* noop — non blocca il check */ });
    }

    return NextResponse.json({ ok: true, callId, latencyMs }, { status: 200 });

  } catch (err) {
    const msg = `[NormaAI Voice Monitor] EXCEPTION\n${String(err)}\nTime: ${new Date().toISOString()}`;
    await sendAlert("🔴 NormaAI Voce EXCEPTION", msg);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }
}
