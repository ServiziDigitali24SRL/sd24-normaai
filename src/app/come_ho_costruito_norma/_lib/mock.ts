import type {
  AgentEvent,
  AgentSnapshot,
  AgentStatus,
  FunnelSnapshot,
  GpuSnapshot,
  SnapshotData,
  SourceSnapshot,
  SquadronId,
} from './types';

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

/** §6 — funnel corpus: numeri reali stato corrente. */
const mockFunnel: FunnelSnapshot = {
  fontiPubbliche: 704_211,
  fontiRegionali: 185_439,
  scaricati: 687_412,
  rifiutati: 74_565,
  pulito: 612_847,
  scarto: 45_231,
  chunkPronti: 8_300_000,
  etaCompletamentoOre: 14,
  velocityChunkPerMin: 3_400,
};

/** §7 — GPU: serie deterministic ~72% con oscillazione naturale. */
function buildGpuSeries(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 60; i++) {
    const base = 72;
    const wave = Math.sin(i / 7) * 8 + Math.sin(i / 3.3) * 4;
    out.push(Math.round(Math.max(50, Math.min(92, base + wave))));
  }
  return out;
}

const mockGpu: GpuSnapshot = {
  utilPct: 72,
  utilSeries60s: buildGpuSeries(),
  vramUsedGb: 17.2,
  vramTotalGb: 20,
  models: [
    { name: 'gemma2:9b-fp16',    status: 'active' },
    { name: 'llama3.1:8b',       status: 'active' },
    { name: 'qwen2.5:7b',        status: 'idle' },
    { name: 'whisper-large-v3',  status: 'active' },
  ],
  llmCost24hUsd: 0,
  llmCostBaselineUsd: 84.12,
};

/** §8 — fonti normative con stato copertura. */
const mockSources: SourceSnapshot[] = [
  {
    name: 'Gazzetta Ufficiale',
    shortName: 'Gazzetta UF',
    status: 'complete',
    coveragePct: 100,
    documentCount: 124_231,
    lastUpdateLabel: 'aggiornata 2 ore fa',
    url: 'https://gazzettaufficiale.it',
  },
  {
    name: 'Corte di Cassazione',
    shortName: 'Cassazione',
    status: 'complete',
    coveragePct: 98,
    documentCount: 89_412,
    lastUpdateLabel: 'aggiornata 1 ora fa',
    url: 'https://cortedicassazione.it',
  },
  {
    name: 'Agenzia delle Entrate',
    shortName: 'Agenzia Entrate',
    status: 'complete',
    coveragePct: 100,
    documentCount: 67_891,
    lastUpdateLabel: 'aggiornata 30 minuti fa',
    url: 'https://agenziaentrate.gov.it',
  },
  {
    name: 'Ministero del Lavoro',
    shortName: 'Min. Lavoro',
    status: 'partial',
    coveragePct: 84,
    documentCount: 12_487,
    lastUpdateLabel: 'in download',
    url: 'https://lavoro.gov.it',
  },
  {
    name: 'Ministero della Salute',
    shortName: 'Min. Salute',
    status: 'partial',
    coveragePct: 91,
    documentCount: 23_412,
    lastUpdateLabel: 'in pulizia',
    url: 'https://salute.gov.it',
  },
  {
    name: 'INPS',
    shortName: 'INPS',
    status: 'partial',
    coveragePct: 72,
    documentCount: 8_224,
    lastUpdateLabel: 'in download',
    url: 'https://inps.it',
  },
  {
    name: 'Regione Lazio',
    shortName: 'Reg. Lazio',
    status: 'partial',
    coveragePct: 45,
    documentCount: 4_231,
    lastUpdateLabel: 'in download',
    url: 'https://regione.lazio.it',
  },
  {
    name: 'INAIL',
    shortName: 'INAIL',
    status: 'missing',
    coveragePct: 0,
    documentCount: 0,
    lastUpdateLabel: 'Discovery-02 sta cercando l’endpoint',
    url: 'https://inail.it',
  },
];

/** §9 — eventi pre-popolati per primo render (fallback se SSE non parte). */
function buildRecentEvents(): AgentEvent[] {
  const now = new Date('2026-05-09T12:04:31.000Z').getTime();
  const lines: { offsetSec: number; agentId: string; squadron: SquadronId; message: string }[] = [
    { offsetSec: 0,  agentId: 'CORPUS-07',    squadron: 'CORPUS',    message: 'scaricato D.Lgs 81/2008 (412 pagine)' },
    { offsetSec: 1,  agentId: 'EMBEDDING-03', squadron: 'EMBEDDING', message: 'vettorializzato batch 256 chunk' },
    { offsetSec: 2,  agentId: 'SENTINEL-01',  squadron: 'SENTINEL',  message: 'riavviato CORPUS-12 dopo timeout' },
    { offsetSec: 3,  agentId: 'RAG-04',       squadron: 'RAG',       message: 'risposto a "art. 2087 cc" in 0,8s' },
    { offsetSec: 4,  agentId: 'DISCOVERY-02', squadron: 'DISCOVERY', message: 'trovata fonte: anac.gov.it/decisioni' },
    { offsetSec: 5,  agentId: 'AGENTS-21',    squadron: 'AGENTS',    message: 'videochiamata con utente (avatar Sofia)' },
    { offsetSec: 6,  agentId: 'OPS-02',       squadron: 'OPS',       message: 'backup snapshot Supabase ok (2,4 GB)' },
    { offsetSec: 7,  agentId: 'CHUNKING-05',  squadron: 'CHUNKING',  message: 'doc 89342 → 84 chunk (semantic split)' },
    { offsetSec: 8,  agentId: 'CORPUS-09',    squadron: 'CORPUS',    message: 'GET cassazione/sez-civ/2024-12 → 200 OK' },
    { offsetSec: 9,  agentId: 'EMBEDDING-05', squadron: 'EMBEDDING', message: 'cache hit 87% su batch 128' },
    { offsetSec: 10, agentId: 'META-01',      squadron: 'META',      message: 'rebalance squadron AGENTS: +2 worker' },
    { offsetSec: 11, agentId: 'RAG-07',       squadron: 'RAG',       message: 'reranker top-12 → top-5 in 220ms' },
  ];
  return lines.map((l) => ({
    ts: new Date(now - l.offsetSec * 1000).toISOString(),
    agentId: l.agentId,
    squadron: l.squadron,
    message: l.message,
  }));
}
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
    chunks: 8_300_000,
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
  funnel: mockFunnel,
  gpu: mockGpu,
  sources: mockSources,
  recentEvents: buildRecentEvents(),
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
