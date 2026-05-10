// SER-167 / Tab 4 / Studio M5 — /api/ops/agent/[id]/pause (stub).
//
// In-memory map (process-local — perde state al cold start, OK per stub demo).
// Production: spostare a tabella public.agent_pauses + Supabase RLS.

import { NextRequest, NextResponse } from 'next/server';
import type { PauseRequest, PauseRecord } from '@/types/studio-stubs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAUSES = new Map<string, PauseRecord>();

function emptyRecord(agentId: string): PauseRecord {
  return {
    agent_id: agentId,
    paused: false,
    paused_at: null,
    reason: null,
    duration_h: null,
    resume_at: null,
    paused_by: 'studio_ui',
  };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  let body: PauseRequest;
  try {
    body = (await req.json()) as PauseRequest;
  } catch {
    body = {};
  }

  const now = new Date();
  const durationH = typeof body.duration_h === 'number' && body.duration_h > 0 ? body.duration_h : null;
  const resumeAt = durationH ? new Date(now.getTime() + durationH * 3_600_000).toISOString() : null;

  const record: PauseRecord = {
    agent_id: id,
    paused: true,
    paused_at: now.toISOString(),
    reason: body.reason ?? null,
    duration_h: durationH,
    resume_at: resumeAt,
    paused_by: 'studio_ui',
  };
  PAUSES.set(id, record);

  return NextResponse.json(record, { status: 200 });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const rec = PAUSES.get(id) ?? emptyRecord(id);
  return NextResponse.json(rec);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  PAUSES.delete(id);
  return NextResponse.json({ agent_id: id, paused: false }, { status: 200 });
}
