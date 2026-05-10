// SER-167 / Tab 4 / Studio M5 — /api/ops/squadron/status (stub).
//
// 8 squadron + 114 agent + META-AUTOPILOT. Distribuzione fissa:
//   60% idle, 30% running, 5% paused, 5% error.
// Posizione di ogni agent calcolata da hash deterministico (no random).

import { NextResponse } from 'next/server';
import type {
  AgentStudioRow,
  AgentStudioStatus,
  SquadronGroup,
  SquadronStatusResponse,
} from '@/types/studio-stubs';

export const runtime = 'edge';
export const revalidate = 30;

interface SquadronSpec {
  squadron: string;
  target_voto: number;
  current_voto: number;
  agents_count: number;
  agent_prefixes: string[];
}

const SQUADRONS: ReadonlyArray<SquadronSpec> = [
  { squadron: 'corpus', target_voto: 95, current_voto: 88, agents_count: 28,
    agent_prefixes: ['disc_openga','disc_italgiure','disc_normattiva','disc_regional','disc_codici_brocardi','dl_pool','ext_html_semantic','ext_pdf_text','ext_pdf_ocr','ext_json_api','ext_playwright_spa','validator_r1_r9','reviewer_llm','approver','storage_tx','watch_gazzetta','watch_cassazione','watch_inps','watch_agenzia_entrate','dedup_minhash','classifier_topic','tagger_keywords','quality_gate','retry_dlq','rate_limiter','snapshot_hourly','metrics_emitter','corpus_leader'] },
  { squadron: 'chunking', target_voto: 99, current_voto: 92, agents_count: 12,
    agent_prefixes: ['strat_semantic','strat_recursive','strat_sentence_window','strat_fixed_512','strat_article_aware','bound_legal_headers','bound_section','judge_coherence','judge_info_loss','opt_grid_search','chunk_workers','chunking_leader'] },
  { squadron: 'embedding', target_voto: 99, current_voto: 95, agents_count: 11,
    agent_prefixes: ['embed_bge_m3','embed_e5_large','embed_gte','embed_jina','embed_mistral','qa_cluster_purity','qa_neighbor_analysis','qa_recall_eval','idx_hnsw_tuner','embed_workers','embedding_leader'] },
  { squadron: 'rag', target_voto: 99, current_voto: 90, agents_count: 16,
    agent_prefixes: ['retr_dense','retr_fts','retr_hybrid','rerank_bge','synth_qwen32b','synth_llama70b','citation_resolver','grounding_check','rewrite_phi','intent_router','followup_planner','answer_critic','context_compressor','rate_limiter_user','cache_warm','rag_leader'] },
  { squadron: 'agents', target_voto: 95, current_voto: 87, agents_count: 13,
    agent_prefixes: ['orchestrator','planner','memory_writer','memory_reader','tool_picker','contract_validator','exec_python','exec_sql','llm_judge','reflector','adversarial_redteam','observer','agents_leader'] },
  { squadron: 'ops', target_voto: 95, current_voto: 91, agents_count: 11,
    agent_prefixes: ['front_builder_nextjs','front_realtime_ws','front_viz_charts','doc_linear_sync','doc_obsidian_sync','doc_adr_writer','doc_runbook_writer','mon_grafana_exporter','mon_alert_router','telegram_router','ops_leader'] },
  { squadron: 'sentinel', target_voto: 95, current_voto: 89, agents_count: 13,
    agent_prefixes: ['detect_latency_drift','detect_error_rate','detect_voto_drop','detect_gpu_oom','detect_offline_mass','rule_engine','incident_open','incident_correlate','auto_heal','escalator','postmortem_writer','runbook_picker','sentinel_leader'] },
  { squadron: 'discovery', target_voto: 95, current_voto: 86, agents_count: 7,
    agent_prefixes: ['scout_skill','bench_runner','adr_proposer','config_diff','impact_estimator','approver_human','discovery_leader'] },
];

const META_AGENT: SquadronSpec = {
  squadron: 'meta',
  target_voto: 95,
  current_voto: 90,
  agents_count: 1,
  agent_prefixes: ['meta_autopilot'],
};

const ALL = [...SQUADRONS, META_AGENT];
const TOTAL_AGENTS = ALL.reduce((acc, sq) => acc + sq.agents_count, 0);

function statusForIndex(globalIdx: number): AgentStudioStatus {
  // Distribution: 60% idle, 30% running, 5% paused, 5% error
  const m = globalIdx % 100;
  if (m < 60) return 'idle';
  if (m < 90) return 'running';
  if (m < 95) return 'paused';
  return 'error';
}

const ACTIONS_BY_STATUS: Record<AgentStudioStatus, string[]> = {
  idle: ['waiting_queue', 'heartbeat', 'cooldown_after_run'],
  running: ['job_started', 'embedding_batch', 'crawl_in_progress', 'judge_eval', 'snapshot_voti'],
  paused: ['paused_by_human', 'paused_by_autopilot', 'paused_budget_cap'],
  error: ['transient_5xx', 'rate_limit_hit', 'schema_mismatch'],
};

function actionForIndex(idx: number, status: AgentStudioStatus): string {
  const arr = ACTIONS_BY_STATUS[status];
  return arr[idx % arr.length];
}

function lastEventTs(idx: number): string {
  // 0-300s ago, deterministico
  const secondsAgo = (idx * 17) % 300;
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

export async function GET() {
  let globalIdx = 0;
  const groups: SquadronGroup[] = [];

  for (const sq of ALL) {
    const agents: AgentStudioRow[] = [];
    let countIdle = 0,
      countRunning = 0,
      countPaused = 0,
      countError = 0;

    for (let i = 0; i < sq.agents_count; i++) {
      const status = statusForIndex(globalIdx);
      const name = sq.agent_prefixes[i] || `${sq.squadron}_${i}`;
      agents.push({
        id: `sq-${sq.squadron}.${name}`,
        name,
        squadron: sq.squadron,
        status,
        last_event_ts: lastEventTs(globalIdx),
        last_action: actionForIndex(globalIdx, status),
      });
      switch (status) {
        case 'idle': countIdle++; break;
        case 'running': countRunning++; break;
        case 'paused': countPaused++; break;
        case 'error': countError++; break;
      }
      globalIdx++;
    }

    groups.push({
      squadron: sq.squadron,
      target_voto: sq.target_voto,
      current_voto: sq.current_voto,
      agents_total: sq.agents_count,
      agents_idle: countIdle,
      agents_running: countRunning,
      agents_paused: countPaused,
      agents_error: countError,
      agents,
    });
  }

  const payload: SquadronStatusResponse = {
    generated_at: new Date().toISOString(),
    total_agents: TOTAL_AGENTS,
    groups,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
