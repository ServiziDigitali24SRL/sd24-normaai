// /api/avatar/status?id=<videoId> → {status, videoUrl?}
// Lightweight passthrough to HeyGen status. Client polls every 2s.

import { NextRequest, NextResponse } from "next/server";
import { getVideoStatus } from "@/lib/heygen/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    const status = await getVideoStatus(id);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "heygen_failed" },
      { status: 500 },
    );
  }
}
