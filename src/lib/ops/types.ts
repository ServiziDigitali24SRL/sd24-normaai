// src/lib/ops/types.ts
//
// Mirror compilato dei tipi canonici definiti in
//   sd24-normaai-megabuild/shared/types.ts (commit 33194db, Tab 4 SER-164).
// Mantenere allineato manualmente: ogni modifica qui DEVE essere replicata
// nel repo megabuild e viceversa, altrimenti deriva tra API (sd24-normaai)
// e orchestrator/docs (megabuild).

export type Squadron =
  | 'corpus'
  | 'chunking'
  | 'embedding'
  | 'rag'
  | 'agents'
  | 'ops'
  | 'sentinel'
  | 'discovery'
  | 'meta';

export type AgentState =
  | 'starting'
  | 'idle'
  | 'busy'
  | 'degraded'
  | 'error'
  | 'offline'
  | 'retired';

export type EventType =
  | 'spawned'
  | 'started'
  | 'job_started'
  | 'job_completed'
  | 'job_failed'
  | 'state_change'
  | 'milestone_reached'
  | 'adr_proposed'
  | 'skill_discovered'
  | 'incident_detected'
  | 'warning'
  | 'info'
  | 'retired';

export type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'info';

export type IncidentState =
  | 'open'
  | 'acknowledged'
  | 'mitigated'
  | 'resolved'
  | 'false_positive';

export type SkillStatus = 'proposed' | 'active' | 'deprecated' | 'retired';

export type SkillCategory =
  | 'parser'
  | 'classifier'
  | 'extractor'
  | 'scorer'
  | 'transformer'
  | 'retriever';

export type MilestoneCategory =
  | 'infra'
  | 'corpus'
  | 'rag'
  | 'frontend'
  | 'ops'
  | 'adr'
  | 'eval'
  | 'release';

export type DecisionType =
  | 'spawn_agent'
  | 'retire_agent'
  | 'propose_adr'
  | 'approve_skill'
  | 'deprecate_skill'
  | 'raise_milestone'
  | 'adjust_priority'
  | 'budget_change'
  | 'escalate_to_human';

export type DecisionState =
  | 'pending'
  | 'executed'
  | 'reverted'
  | 'observed'
  | 'failed';

export interface VotiSnapshot {
  squadron: Squadron;
  voto: number;
  voto_target: number | null;
  breakdown: Record<string, number> | null;
  snapshot_at: string;
}

export interface Voti24hTrend {
  squadron: Squadron;
  voto_now: number | null;
  voto_24h_ago: number | null;
  snapshots_24h: number;
}

export interface AgentStatus {
  agent_id: string;
  squadron: Squadron;
  role: string;
  state: AgentState;
  current_job_id: number | null;
  last_heartbeat: string;
  started_at: string;
  retired_at: string | null;
  version: string;
  host: string | null;
  pid: number | null;
  metrics: Record<string, unknown>;
  notes: string | null;
}

export interface AgentsCountBySquadron {
  squadron: Squadron;
  active: number;
  busy: number;
  unhealthy: number;
  retired: number;
}

export interface AgentEvent {
  id: number;
  agent_id: string;
  squadron: Squadron;
  event_type: EventType;
  severity: Severity;
  payload: Record<string, unknown>;
  message: string | null;
  occurred_at: string;
}

export interface Incident {
  incident_key: string;
  rule_id: string;
  squadron: Squadron | null;
  severity: Severity;
  state: IncidentState;
  title: string;
  description: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  mitigated_at: string | null;
  resolved_at: string | null;
  minutes_open: number;
  context: Record<string, unknown>;
  linear_issue_url: string | null;
  obsidian_doc_path: string | null;
}

export interface Milestone {
  milestone_key: string;
  title: string;
  category: MilestoneCategory;
  description: string | null;
  target_at: string | null;
  achieved_at: string | null;
  achieved_by: string | null;
  evidence_url: string | null;
  voto_at_achievement: number | null;
}

export interface Skill {
  skill_id: string;
  name: string;
  category: SkillCategory;
  owner_squadron: Squadron;
  description: string;
  status: SkillStatus;
  bench_score: number | null;
  version: string;
  proposed_by: string;
  approved_by: string | null;
  proposed_at: string;
  approved_at: string | null;
}

export interface ADR {
  decision_id: string;
  decision_type: DecisionType;
  rationale: string;
  inputs: Record<string, unknown>;
  action_taken: Record<string, unknown>;
  expected_impact: Record<string, unknown> | null;
  observed_impact: Record<string, unknown> | null;
  state: DecisionState;
  decided_at: string;
  human_override: boolean;
  override_by: string | null;
  override_reason: string | null;
  linear_issue_url: string | null;
  obsidian_doc_path: string | null;
}

export interface AutopilotBudgetToday {
  agents_spawned_today: number;
  adrs_proposed_today: number;
  agents_retired_today: number;
  total_decisions_today: number;
}

export interface CorpusKpi {
  total_docs: number;
  total_chunks: number;
  clean_target: number;
  url_coverage_pct: number;
  cost_cloud_llm_usd: number;
}

export interface GpuStatus {
  utilization_pct: number;
  vram_used_gb: number;
  vram_total_gb: number;
  models_loaded: string[];
  latency_p50_ms_5min: number | null;
  latency_p95_ms_5min: number | null;
}

export interface SentinelHealth {
  healthy: boolean;
  auto_heal_count_7d: number;
  mttr_minutes: number;
  last_event_age_seconds: number | null;
}

export interface SnapshotData {
  voti: VotiSnapshot[];
  voti_trend_24h: Voti24hTrend[];
  agents: AgentStatus[];
  agents_count: AgentsCountBySquadron[];
  kpi: CorpusKpi;
  gpu: GpuStatus;
  milestones: Milestone[];
  skills: Skill[];
  autopilot_recent: ADR[];
  autopilot_budget: AutopilotBudgetToday;
  incidents_active: Pick<
    Incident,
    'incident_key' | 'severity' | 'title' | 'minutes_open' | 'squadron' | 'state'
  >[];
  sentinel_health: SentinelHealth;
  generated_at: string;
}

export type SseEvent =
  | { type: 'agent_event'; data: AgentEvent }
  | { type: 'voti_update'; data: VotiSnapshot }
  | { type: 'incident_open'; data: Incident }
  | {
      type: 'incident_close';
      data: Pick<Incident, 'incident_key' | 'state' | 'resolved_at'>;
    }
  | { type: 'milestone_achieved'; data: Milestone }
  | { type: 'adr_decided'; data: ADR }
  | { type: 'heartbeat'; data: { ts: string } };

export interface SentinelHeartbeatResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime_seconds: number;
  last_event_age_seconds: number | null;
  checks: {
    db: 'ok' | 'fail';
    sse_listener: 'ok' | 'fail';
    last_voti_age_seconds: number | null;
  };
}

// SER-167 — /api/ops/health aggregated health check
export type HealthStatus = 'up' | 'down' | 'degraded' | 'unknown';

export interface ComponentHealth {
  component: string;
  status: HealthStatus;
  latency_ms: number | null;
  message?: string;
  checked_at: string;
}

export interface OpsHealthResponse {
  generated_at: string;
  overall: HealthStatus;
  components: ComponentHealth[];
  squadrons_voti: { squadron: string; voto: number }[];
}
