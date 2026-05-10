// In-memory batch queue for reel pre-rendering via LiveAvatar.
//
// Scope: single-instance Vercel serverless (works for smoke test / dev preview).
// For production multi-region we'll move to Supabase + cron, but Tab 4 explicitly
// scoped this round to in-memory parallelism=3.
//
// Lifecycle:
//   createBatch({scripts, voice_id, avatar_id, layout}) → batch_id
//   getBatch(batch_id) → status snapshot
//   cancelReel(batch_id, reel_id) → mark cancelled
//
// Worker: simple async loop running up to PARALLELISM submits + polls concurrently
// per batch. Each reel = one LiveAvatar render job.

import { submitRender, pollRender, MOCK_MODE, type RenderInput } from "@/lib/liveavatar/render";

const PARALLELISM = 3;
const POLL_INTERVAL_MS = MOCK_MODE ? 200 : 5_000;
const MAX_POLL_ATTEMPTS = MOCK_MODE ? 30 : 240; // ~20 min @ 5s

export type ReelStatus = "queued" | "rendering" | "completed" | "failed" | "cancelled";

export interface Reel {
  reel_id: string;
  script: string;
  status: ReelStatus;
  video_id?: string;
  url?: string;
  error?: string;
}

export interface Batch {
  batch_id: string;
  voice_id: string;
  avatar_id: string;
  layout: RenderInput["layout"];
  created_at: number;
  reels: Reel[];
}

const batches = new Map<string, Batch>();

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBatch(args: {
  scripts: string[];
  voice_id: string;
  avatar_id: string;
  layout: RenderInput["layout"];
}): Batch {
  const batch: Batch = {
    batch_id: uid("batch"),
    voice_id: args.voice_id,
    avatar_id: args.avatar_id,
    layout: args.layout,
    created_at: Date.now(),
    reels: args.scripts.map((script) => ({
      reel_id: uid("reel"),
      script,
      status: "queued",
    })),
  };
  batches.set(batch.batch_id, batch);
  // Fire-and-forget worker.
  void runBatch(batch.batch_id);
  return batch;
}

export function getBatch(batch_id: string): Batch | undefined {
  return batches.get(batch_id);
}

export function cancelReel(batch_id: string, reel_id: string): boolean {
  const b = batches.get(batch_id);
  if (!b) return false;
  const r = b.reels.find((x) => x.reel_id === reel_id);
  if (!r) return false;
  if (r.status === "completed" || r.status === "failed") return false;
  r.status = "cancelled";
  return true;
}

async function processReel(batch: Batch, reel: Reel): Promise<void> {
  if (reel.status === "cancelled") return;
  reel.status = "rendering";
  try {
    const { video_id } = await submitRender({
      script: reel.script,
      voice_id: batch.voice_id,
      avatar_id: batch.avatar_id,
      layout: batch.layout,
    });
    reel.video_id = video_id;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      if ((reel.status as ReelStatus) === "cancelled") return;
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
      const job = await pollRender(video_id);
      if (job.status === "completed") {
        reel.status = "completed";
        reel.url = job.url;
        return;
      }
      if (job.status === "failed") {
        reel.status = "failed";
        reel.error = job.error ?? "render_failed";
        return;
      }
    }
    reel.status = "failed";
    reel.error = "poll_timeout";
  } catch (e) {
    reel.status = "failed";
    reel.error = e instanceof Error ? e.message : "unknown";
  }
}

async function runBatch(batch_id: string): Promise<void> {
  const batch = batches.get(batch_id);
  if (!batch) return;
  const queue = [...batch.reels];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < PARALLELISM; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const reel = queue.shift();
        if (!reel) return;
        await processReel(batch, reel);
      }
    })());
  }
  await Promise.all(workers);
}
