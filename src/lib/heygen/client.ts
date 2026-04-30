// HeyGen client — generates async talking-head videos for Sofia avatar.
// Uses HeyGen v2 video.generate API. Returns a video_id that the caller polls
// (or webhook-receives) until status === "completed", then plays the URL.
//
// Auth: header `X-Api-Key`. Endpoint: https://api.heygen.com/v2

const BASE = "https://api.heygen.com/v2";

const API_KEY = process.env.HEYGEN_API_KEY ?? "";

// Two NormaAI avatars — user picks which one greets them.
// Voices are HeyGen Italian voices (Elena female, Riccardo male).
export const AVATARS = {
  sofia: {
    avatarId: "Violante_Business_Sitting_Front_public",
    voiceId: process.env.HEYGEN_VOICE_ID_SOFIA ?? "131a2a3eef0c4a82a07c1d24a39bca39",
    label: "Sofia",
  },
  marco: {
    avatarId: "Onat_Macbook_Front2_public",
    // TODO set HEYGEN_VOICE_ID_MARCO to a real Italian male voice id from
    // GET /v2/voices. Falls back to Elena (female) until configured.
    voiceId: process.env.HEYGEN_VOICE_ID_MARCO ?? "131a2a3eef0c4a82a07c1d24a39bca39",
    label: "Marco",
  },
} as const;

export type AvatarKey = keyof typeof AVATARS;

// Legacy single-avatar env (still respected if set, used as override for "sofia")
const ENV_AVATAR_OVERRIDE = process.env.HEYGEN_AVATAR_ID;
const ENV_VOICE_OVERRIDE = process.env.HEYGEN_VOICE_ID;

export interface GenerateVideoParams {
  text: string;            // ≤1500 chars (HeyGen limit)
  avatar?: AvatarKey;      // "sofia" | "marco" — picks from AVATARS map
  avatarId?: string;       // raw override (wins over `avatar`)
  voiceId?: string;        // raw override (wins over `avatar`)
  background?: string;     // hex color, e.g. "#FDFBF7" (paper warm)
}

export interface VideoStatus {
  videoId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  error?: string;
}

export async function generateVideo(p: GenerateVideoParams): Promise<{ videoId: string }> {
  if (!API_KEY) throw new Error("heygen_no_api_key");

  const text = p.text.slice(0, 1500);
  const preset = AVATARS[p.avatar ?? "sofia"];
  const avatarId = p.avatarId ?? ENV_AVATAR_OVERRIDE ?? preset.avatarId;
  const voiceId = p.voiceId ?? ENV_VOICE_OVERRIDE ?? preset.voiceId;

  const r = await fetch(`${BASE}/video/generate`, {
    method: "POST",
    headers: { "X-Api-Key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: text,
            voice_id: voiceId,
          },
          background: {
            type: "color",
            value: p.background ?? "#FDFBF7",
          },
        },
      ],
      dimension: { width: 720, height: 1280 }, // 9:16 portrait — works mobile + desktop modal
    }),
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`heygen_${r.status}_${body.slice(0, 200)}`);
  }
  const j = await r.json() as { data?: { video_id: string } };
  if (!j.data?.video_id) throw new Error("heygen_no_video_id");
  return { videoId: j.data.video_id };
}

export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
  if (!API_KEY) throw new Error("heygen_no_api_key");

  const r = await fetch(`${BASE}/video_status.get?video_id=${videoId}`, {
    headers: { "X-Api-Key": API_KEY },
  });
  if (!r.ok) throw new Error(`heygen_status_${r.status}`);

  const j = await r.json() as {
    data?: {
      status: VideoStatus["status"];
      video_url?: string;
      thumbnail_url?: string;
      duration?: number;
      error?: { detail?: string };
    };
  };
  const d = j.data;
  return {
    videoId,
    status: d?.status ?? "failed",
    videoUrl: d?.video_url,
    thumbnailUrl: d?.thumbnail_url,
    durationSec: d?.duration,
    error: d?.error?.detail,
  };
}
