// DELETE /api/reels/batch/[id]/[reel_id] — cancel an in-flight reel.

import { NextResponse } from "next/server";
import { cancelReel, getBatch } from "@/lib/reels/batch-queue";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; reel_id: string }> },
) {
  const { id, reel_id } = await params;
  if (!getBatch(id)) return NextResponse.json({ error: "batch_not_found" }, { status: 404 });
  const ok = cancelReel(id, reel_id);
  if (!ok) return NextResponse.json({ error: "cannot_cancel" }, { status: 409 });
  return NextResponse.json({ ok: true, reel_id, status: "cancelled" });
}
