import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const [tokenRes, agentRes] = await Promise.all([
    fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    ),
    fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      { headers: { "xi-api-key": apiKey } },
    ),
  ]);

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: err.slice(0, 200) }, { status: tokenRes.status });
  }

  const { signed_url } = await tokenRes.json();

  let avatarUrl: string | null = null;
  if (agentRes.ok) {
    const agent = await agentRes.json();
    avatarUrl =
      agent?.widget?.avatar?.url ??
      agent?.widget?.avatar?.image_url ??
      agent?.platform_settings?.widget?.avatar?.url ??
      null;
  }

  return NextResponse.json({ signed_url, avatar_url: avatarUrl });
}
