// /api/avatar/streaming/stop — POST gracefully closes a LiveAvatar session.
//
// Called by the client on unmount/visibilitychange to release the
// concurrent-session slot and stop credit consumption immediately.
//
// Request:  { session_id }
// Response: { ok: true }

import { NextRequest, NextResponse } from "next/server";
import { stopSession } from "@/lib/liveavatar/client";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

interface Body {
  session_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { session_id } = (await req.json()) as Body;
    if (!session_id) {
      return NextResponse.json({ error: "session_id_required" }, { status: 400 });
    }
    await stopSession(session_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // stopSession is fire-and-forget upstream, but bubble any throw for log
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 },
    );
  }
}
