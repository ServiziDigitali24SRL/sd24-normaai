// /api/avatar/generate — POST {text} → {videoId}
// Triggers HeyGen video generation. Client polls /api/avatar/status?id= until ready.

import { NextRequest, NextResponse } from "next/server";
import { generateVideo, type AvatarKey } from "@/lib/heygen/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { text?: string; avatar?: AvatarKey };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  if (!body.text || body.text.trim().length < 5) {
    return NextResponse.json({ error: "text_too_short" }, { status: 400 });
  }

  try {
    const { videoId } = await generateVideo({ text: body.text, avatar: body.avatar });
    return NextResponse.json({ videoId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "heygen_failed" },
      { status: 500 },
    );
  }
}
