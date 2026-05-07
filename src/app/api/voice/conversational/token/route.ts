import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!r.ok) {
    const err = await r.text();
    return NextResponse.json({ error: err.slice(0, 200) }, { status: r.status });
  }

  const { signed_url } = await r.json();
  return NextResponse.json({ signed_url });
}
