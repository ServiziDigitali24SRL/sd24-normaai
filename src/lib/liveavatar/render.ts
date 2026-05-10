// LiveAvatar batch render client — pre-renders a vertical reel video from a script.
//
// Distinct from streaming/client.ts (which opens a live WebRTC session).
// Render flow uses POST /v1/videos with a script + voice + avatar and polls
// GET /v1/videos/{id} until status=completed → returns mp4 URL.
//
// If LIVEAVATAR_API_KEY is unset (local dev / smoke test), we run in MOCK mode
// returning deterministic fake URLs after a short delay. This keeps the batch
// endpoint testable without burning ElevenLabs quota.
//
// Auth: X-API-KEY header (same as session token endpoints).

const BASE = "https://api.liveavatar.com/v1";
const API_KEY = process.env.LIVEAVATAR_API_KEY ?? "";
export const MOCK_MODE = !API_KEY;

export interface RenderInput {
  script: string;
  voice_id: string;
  avatar_id: string;
  layout: "vertical" | "horizontal" | "square";
}

export interface RenderJob {
  video_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  url?: string;
  error?: string;
}

/** Submit a render job. Returns video_id for polling. */
export async function submitRender(input: RenderInput): Promise<{ video_id: string }> {
  if (MOCK_MODE) {
    return { video_id: `mock_${Math.random().toString(36).slice(2, 10)}` };
  }
  const r = await fetch(`${BASE}/videos`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      avatar_id: input.avatar_id,
      voice_id: input.voice_id,
      script: input.script,
      // 9:16 vertical for IG/TikTok reels
      aspect_ratio: input.layout === "vertical" ? "9:16"
        : input.layout === "square" ? "1:1" : "16:9",
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`liveavatar_render_${r.status}_${body.slice(0, 200)}`);
  }
  const j = await r.json() as { code?: number; data?: { video_id: string } };
  if (!j.data?.video_id) throw new Error("liveavatar_render_no_id");
  return { video_id: j.data.video_id };
}

const mockStartedAt = new Map<string, number>();

/** Poll job status. */
export async function pollRender(video_id: string): Promise<RenderJob> {
  if (MOCK_MODE) {
    const t0 = mockStartedAt.get(video_id) ?? (mockStartedAt.set(video_id, Date.now()), Date.now());
    const elapsed = Date.now() - t0;
    if (elapsed < 500) return { video_id, status: "queued" };
    if (elapsed < 1500) return { video_id, status: "processing" };
    return {
      video_id,
      status: "completed",
      url: `https://mock.liveavatar.local/${video_id}.mp4`,
    };
  }
  const r = await fetch(`${BASE}/videos/${video_id}`, {
    headers: { "X-API-KEY": API_KEY },
  });
  if (!r.ok) throw new Error(`liveavatar_poll_${r.status}`);
  const j = await r.json() as {
    data?: { status: string; video_url?: string; error?: string };
  };
  const s = j.data?.status ?? "queued";
  return {
    video_id,
    status: (["queued", "processing", "completed", "failed"].includes(s) ? s : "processing") as RenderJob["status"],
    url: j.data?.video_url,
    error: j.data?.error,
  };
}
