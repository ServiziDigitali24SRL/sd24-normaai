// POST /api/reels/batch — submit a batch of reel scripts for pre-render via LiveAvatar.
//
// Body: { scripts: string[], voice_id: string, avatar_id: string, layout: "vertical"|"horizontal"|"square" }
// Returns: { batch_id: string, queued: number }
//
// Scope (Tab 7 round): in-memory queue, parallelism=3. Multi-region durable
// queue is deferred to Tab 4 once the smoke flow lands.

import { NextRequest, NextResponse } from "next/server";
import { createBatch } from "@/lib/reels/batch-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  scripts?: unknown;
  voice_id?: unknown;
  avatar_id?: unknown;
  layout?: unknown;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const scripts = Array.isArray(body.scripts) ? body.scripts.filter((s) => typeof s === "string" && s.length > 0) as string[] : null;
  if (!scripts || scripts.length === 0) {
    return NextResponse.json({ error: "scripts_required" }, { status: 400 });
  }
  if (scripts.length > 50) {
    return NextResponse.json({ error: "too_many_scripts", max: 50 }, { status: 400 });
  }
  const voice_id = typeof body.voice_id === "string" ? body.voice_id : null;
  const avatar_id = typeof body.avatar_id === "string" ? body.avatar_id : null;
  if (!voice_id || !avatar_id) {
    return NextResponse.json({ error: "voice_and_avatar_required" }, { status: 400 });
  }
  const layoutRaw = typeof body.layout === "string" ? body.layout : "vertical";
  const layout = (["vertical", "horizontal", "square"].includes(layoutRaw) ? layoutRaw : "vertical") as "vertical" | "horizontal" | "square";

  const batch = createBatch({ scripts, voice_id, avatar_id, layout });
  return NextResponse.json({ batch_id: batch.batch_id, queued: batch.reels.length });
}
