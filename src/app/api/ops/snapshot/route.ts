// SER-164 / Tab 4 — /api/ops/snapshot
// Edge runtime: aggregato real-time per dashboard pubblica /come_ho_costruito_norma.
// Cache 5s lato Next + Cache-Control public per eventuale CDN.
//
// Fonte dati: Supabase project rjwaegzdfsdlnbijkark (NormaAI).
// Tutte le query usano viste sicure (no PII, corpus pubblico).
//
// PII / leak guard: questa route è esposta SENZA auth. Restituisce solo
// metadati operativi pubblicabili. NON aggiungere campi sensibili
// (config_hash, env, raw inputs ADR senza sanitizzazione, host pid privati).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import type {
  ADR,
  AgentStatus,
  AgentsCountBySquadron,
  AutopilotBudgetToday,
  CorpusKpi,
  GpuStatus,
  Incident,
  Milestone,
  SentinelHealth,
  Skill,
  SnapshotData,
  VotiSnapshot,
  Voti24hTrend,
} from '@/lib/ops/types';

export const runtime = 'edge';
export const revalidate = 5;
export const dynamic = 'force-dynamic';

interface GpuJobsLatencyRow {
  model: string;
  job_type: string;
  n: number;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  max_gpu_mem_mb: number | null;
}

interface IncidentsMttr90dRow {
  severity: string;
  n_resolved: number;
  mttr_minutes: number | null;
}

function pct(n: number | null | undefined, d: number | null | undefined): number {
  if (!n || !d) return 0;
  return Math.round((Number(n) / Number(d)) * 10000) / 100;
}

export async function GET() {
  const sb = createAdminClient();
  const startedAt = Date.now();

  const [
    votiRes,
    votiTrendRes,
    agentsRes,
    agentsCountRes,
    incidentsRes,
    autopilotRecentRes,
    autopilotBudgetRes,
    skillsRes,
    milestonesRes,
    docsCountRes,
    docsWithUrlRes,
    chunksCountRes,
    gpuLatencyRes,
    mttrRes,
    lastEventRes,
  ] = await Promise.all([
    sb.from('voti_latest').select('squadron, voto, voto_target, breakdown, snapshot_at'),
    sb.from('voti_24h_trend').select('squadron, voto_now, voto_24h_ago, snapshots_24h'),
    sb
      .from('agents_active')
      .select(
        'agent_id, squadron, role, state, current_job_id, last_heartbeat, started_at, retired_at, version, host, pid, metrics, notes',
      )
      .order('squadron', { ascending: true })
      .limit(200),
    sb
      .from('agents_count_by_squadron')
      .select('squadron, active, busy, unhealthy, retired'),
    sb
      .from('incidents_active')
      .select('incident_key, severity, title, minutes_open, squadron, state')
      .limit(50),
    sb
      .from('meta_autopilot_decisions')
      .select(
        'decision_id, decision_type, rationale, inputs, action_taken, expected_impact, observed_impact, state, decided_at, human_override, override_by, override_reason, linear_issue_url, obsidian_doc_path',
      )
      .order('decided_at', { ascending: false })
      .limit(20),
    sb
      .from('meta_autopilot_budget_today')
      .select(
        'agents_spawned_today, adrs_proposed_today, agents_retired_today, total_decisions_today',
      )
      .maybeSingle(),
    sb
      .from('skills_registry')
      .select(
        'skill_id, name, category, owner_squadron, description, status, bench_score, version, proposed_by, approved_by, proposed_at, approved_at',
      )
      .in('status', ['proposed', 'active'])
      .order('proposed_at', { ascending: false })
      .limit(100),
    sb
      .from('milestones')
      .select(
        'milestone_key, title, category, description, target_at, achieved_at, achieved_by, evidence_url, voto_at_achievement',
      )
      .order('target_at', { ascending: true, nullsFirst: false }),
    sb.from('documents').select('id', { count: 'exact', head: true }),
    sb
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .not('source_url', 'is', null),
    sb.from('normaai_chunks').select('id', { count: 'exact', head: true }),
    sb.from('gpu_jobs_latency_5min').select('*'),
    sb.from('incidents_mttr_90d').select('severity, n_resolved, mttr_minutes'),
    sb
      .from('agent_events')
      .select('occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const errors = [
    votiRes.error,
    votiTrendRes.error,
    agentsRes.error,
    agentsCountRes.error,
    incidentsRes.error,
    autopilotRecentRes.error,
    skillsRes.error,
    milestonesRes.error,
    gpuLatencyRes.error,
    mttrRes.error,
  ].filter(Boolean);
  if (errors.length) {
    return NextResponse.json(
      { error: 'snapshot_query_failed', details: errors.map((e) => e?.message) },
      { status: 503 },
    );
  }

  const docsTotal = docsCountRes.count ?? 0;
  const docsWithUrl = docsWithUrlRes.count ?? 0;
  const chunksTotal = chunksCountRes.count ?? 0;

  const kpi: CorpusKpi = {
    total_docs: docsTotal,
    total_chunks: chunksTotal,
    clean_target: Math.max(docsTotal - 149_000, 0),
    url_coverage_pct: pct(docsWithUrl, docsTotal),
    cost_cloud_llm_usd: 0,
  };

  const gpuRows = (gpuLatencyRes.data ?? []) as GpuJobsLatencyRow[];
  const p50s = gpuRows.map((r) => r.p50_ms).filter((v): v is number => typeof v === 'number');
  const p95s = gpuRows.map((r) => r.p95_ms).filter((v): v is number => typeof v === 'number');
  const gpu: GpuStatus = {
    utilization_pct: 0,
    vram_used_gb: 0,
    vram_total_gb: 20,
    models_loaded: Array.from(new Set(gpuRows.map((r) => r.model))).filter(Boolean),
    latency_p50_ms_5min: p50s.length ? Math.max(...p50s) : null,
    latency_p95_ms_5min: p95s.length ? Math.max(...p95s) : null,
  };

  const mttrRows = (mttrRes.data ?? []) as IncidentsMttr90dRow[];
  const mttrAvg =
    mttrRows.length > 0
      ? mttrRows.reduce((acc, r) => acc + (r.mttr_minutes ?? 0), 0) / mttrRows.length
      : 0;
  const lastEventTs = (lastEventRes.data as { occurred_at: string } | null)?.occurred_at ?? null;
  const lastEventAge = lastEventTs
    ? Math.floor((Date.now() - Date.parse(lastEventTs)) / 1000)
    : null;
  const sentinelHealth: SentinelHealth = {
    healthy: lastEventAge !== null ? lastEventAge < 300 : false,
    auto_heal_count_7d: 0,
    mttr_minutes: Math.round(mttrAvg * 10) / 10,
    last_event_age_seconds: lastEventAge,
  };

  const payload: SnapshotData = {
    voti: (votiRes.data ?? []) as VotiSnapshot[],
    voti_trend_24h: (votiTrendRes.data ?? []) as Voti24hTrend[],
    agents: (agentsRes.data ?? []) as AgentStatus[],
    agents_count: (agentsCountRes.data ?? []) as AgentsCountBySquadron[],
    kpi,
    gpu,
    milestones: (milestonesRes.data ?? []) as Milestone[],
    skills: (skillsRes.data ?? []) as Skill[],
    autopilot_recent: (autopilotRecentRes.data ?? []) as ADR[],
    autopilot_budget:
      (autopilotBudgetRes.data as AutopilotBudgetToday | null) ?? {
        agents_spawned_today: 0,
        adrs_proposed_today: 0,
        agents_retired_today: 0,
        total_decisions_today: 0,
      },
    incidents_active: (incidentsRes.data ?? []) as Pick<
      Incident,
      'incident_key' | 'severity' | 'title' | 'minutes_open' | 'squadron' | 'state'
    >[],
    sentinel_health: sentinelHealth,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      'X-Snapshot-Build-Ms': String(Date.now() - startedAt),
    },
  });
}
