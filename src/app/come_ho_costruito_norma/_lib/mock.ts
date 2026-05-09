import type { AgentSnapshot, AgentStatus, SnapshotData, SquadronId } from './types';

const CLUSTER_COUNTS: { id: SquadronId; count: number }[] = [
  { id: 'CORPUS', count: 28 },
  { id: 'CHUNKING', count: 12 },
  { id: 'EMBEDDING', count: 11 },
  { id: 'RAG', count: 16 },
  { id: 'AGENTS', count: 13 },
  { id: 'OPS', count: 10 },
  { id: 'SENTINEL', count: 13 },
  { id: 'DISCOVERY', count: 7 },
  { id: 'META', count: 1 },
];

/** Hardcoded error agents for realistic state (4 totali, distribuiti in 3 squadron). */
const ERROR_IDS = new Set(['CORPUS-12', 'CORPUS-19', 'EMBEDDING-08', 'OPS-04']);

function buildAgents(): AgentSnapshot[] {
  const out: AgentSnapshot[] = [];
  for (const { id, count } of CLUSTER_COUNTS) {
    // ~40% running, ~5% retry, resto idle. Override con ERROR_IDS.
    const runningCount = Math.round(count * 0.4);
    const retryCount = count >= 8 ? 1 : 0;
    for (let i = 1; i <= count; i++) {
      const name = `${id}-${String(i).padStart(2, '0')}`;
      let status: AgentStatus;
      if (ERROR_IDS.has(name)) status = 'error';
      else if (i <= runningCount) status = 'running';
      else if (i === runningCount + 1 && retryCount > 0) status = 'retry';
      else status = 'idle';
      out.push({ id: name, squadron: id, status, lastHeartbeatMs: 1000 + (i % 7) * 350 });
    }
  }
  return out;
}

const builtAgents = buildAgents();
const totalsByStatus = {
  running: builtAgents.filter((a) => a.status === 'running').length,
  idle: builtAgents.filter((a) => a.status === 'idle').length,
  retry: builtAgents.filter((a) => a.status === 'retry').length,
  error: builtAgents.filter((a) => a.status === 'error').length,
};

export const mockSnapshot: SnapshotData = {
  ts: '2026-05-09T12:04:31.000Z',
  totals: {
    agents: 114,
    running: totalsByStatus.running,
    idle: totalsByStatus.idle,
    retry: totalsByStatus.retry,
    error: totalsByStatus.error,
    documents: 612847,
    corpusCleanPct: 89.4,
    llmCost24hUsd: 0,
    chunks: 4_200_000,
  },
  voti: [
    {
      squadron: 'CORPUS',
      italianLabel: 'raccolta documenti',
      voto: 87,
      target: 85,
      trend: 'up',
      trend7d: [83, 84, 85, 85, 86, 86, 87],
      deltaPct: 1.2,
    },
    {
      squadron: 'CHUNKING',
      italianLabel: 'segmentazione semantica',
      voto: 92,
      target: 80,
      trend: 'up',
      trend7d: [89, 90, 91, 91, 92, 92, 92],
      deltaPct: 0.3,
    },
    {
      squadron: 'EMBEDDING',
      italianLabel: 'vettorializzazione GPU',
      voto: 89,
      target: 90,
      trend: 'down',
      trend7d: [91, 91, 90, 90, 89, 89, 89],
      deltaPct: -0.5,
    },
    {
      squadron: 'RAG',
      italianLabel: 'recupero contestuale',
      voto: 85,
      target: 90,
      trend: 'down',
      trend7d: [88, 88, 87, 86, 85, 85, 85],
      deltaPct: -1.8,
    },
    {
      squadron: 'AGENTS',
      italianLabel: 'agenti conversazionali',
      voto: 88,
      target: 80,
      trend: 'up',
      trend7d: [85, 86, 86, 87, 87, 87, 88],
      deltaPct: 0.7,
    },
  ],
  agents: builtAgents,
};

/** Squadron palette + label italiana per AgentMap, voti, log color-coding. */
export const SQUADRON_META: Record<SquadronId, { italianLabel: string; accent: string }> = {
  CORPUS:    { italianLabel: 'raccolta',         accent: '#C0552A' },
  CHUNKING:  { italianLabel: 'segmentazione',    accent: '#8B6F2A' },
  EMBEDDING: { italianLabel: 'vettori',          accent: '#6B5C8A' },
  RAG:       { italianLabel: 'recupero',         accent: '#2E7D5B' },
  AGENTS:    { italianLabel: 'conversazione',    accent: '#B43B25' },
  OPS:       { italianLabel: 'operazioni',       accent: '#4A6B7C' },
  SENTINEL:  { italianLabel: 'guardiano',        accent: '#C9A14B' },
  DISCOVERY: { italianLabel: 'esploratore',      accent: '#8A9A5B' },
  META:      { italianLabel: 'meta',             accent: '#756C5E' },
};

export { CLUSTER_COUNTS };
