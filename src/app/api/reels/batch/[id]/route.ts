// GET /api/reels/batch/[id] — batch status snapshot.

import { NextResponse } from "next/server";
import { getBatch } from "@/lib/reels/batch-queue";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = getBatch(id);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const counts = batch.reels.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    batch_id: batch.batch_id,
    voice_id: batch.voice_id,
    avatar_id: batch.avatar_id,
    layout: batch.layout,
    created_at: batch.created_at,
    counts,
    reels: batch.reels.map((r) => ({
      reel_id: r.reel_id,
      status: r.status,
      url: r.url,
      error: r.error,
    })),
  });
}
