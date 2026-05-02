// /api/avatar/streaming/start — POST creates a LiveAvatar streaming session.
//
// Request:  { avatar?: "sofia"|"marco", greeting?: string }
// Response: { session_id, session_token, livekit_url }
//
// Frontend uses session_token + livekit_url with LiveAvatar SDK
// (or LiveKit JS client) to establish WebRTC stream.

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, startSession, AVATARS, type AvatarKey } from "@/lib/liveavatar/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  avatar?: AvatarKey;
  greeting?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const avatarKey = body.avatar ?? "sofia";
    const cfg = AVATARS[avatarKey];

    if (!cfg.id) {
      return NextResponse.json(
        { error: "avatar_not_configured", avatar: avatarKey },
        { status: 400 },
      );
    }

    const token = await createSessionToken({
      avatar_id: cfg.id,
      persona: {
        voice_id: cfg.voiceId,
        language: "it",
        voice_settings: {
          provider: "elevenlabs",
          speed: 1.0,
          stability: 0.75,
          similarity: 0.75,
        },
      },
      greeting: body.greeting,
    });

    // Start the actual streaming session (avatar enters "ready" state)
    await startSession(token.session_id);

    return NextResponse.json({
      session_id: token.session_id,
      session_token: token.session_token,
      livekit_url: token.livekit_url,
      avatar: avatarKey,
    });
  } catch (err) {
    console.error("[avatar/streaming/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 },
    );
  }
}
