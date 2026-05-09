export type SquadronId =
  | 'CORPUS'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'RAG'
  | 'AGENTS'
  | 'OPS'
  | 'SENTINEL'
  | 'DISCOVERY'
  | 'META';

/** Etichetta italiana, accent color e descrizione breve per ogni squadron. */
export interface SquadronMeta {
  id: SquadronId;
  italianLabel: string;
  accent: string;
}

export type AgentStatus = 'running' | 'idle' | 'retry' | 'error';

export interface AgentSnapshot {
  id: string;
  squadron: SquadronId;
  status: AgentStatus;
  task?: string;
  lastHeartbeatMs: number;
}

export interface VotoSnapshot {
  squadron: SquadronId;
  italianLabel: string;
  voto: number;
  target: number;
  trend: 'up' | 'flat' | 'down';
  /** 7 punti, dal più vecchio al più recente. Stessa scala di voto (0-100). */
  trend7d: number[];
  /** Variazione percentuale assoluta vs giorno precedente. Positivo = migliorato. */
  deltaPct: number;
}

export interface FunnelSnapshot {
  fontiPubbliche: number;
  fontiRegionali: number;
  scaricati: number;
  rifiutati: number;
  pulito: number;
  scarto: number;
  chunkPronti: number;
  etaCompletamentoOre: number;
  velocityChunkPerMin: number;
}

export interface GpuModel {
  name: string;
  status: 'active' | 'idle' | 'unloaded';
}

export interface GpuSnapshot {
  utilPct: number;
  /** 60 valori di utilization GPU, dal più vecchio al più recente. */
  utilSeries60s: number[];
  vramUsedGb: number;
  vramTotalGb: number;
  models: GpuModel[];
  llmCost24hUsd: number;
  /** Costo equivalente con Anthropic Claude per le stesse 24h. */
  llmCostBaselineUsd: number;
}

export type SourceStatus = 'complete' | 'partial' | 'missing';

export interface SourceSnapshot {
  name: string;
  shortName: string;
  status: SourceStatus;
  coveragePct: number;
  documentCount: number;
  lastUpdateLabel: string;
  url: string;
}

export interface AgentEvent {
  /** ISO timestamp. Il client formatta come HH:MM:SS. */
  ts: string;
  agentId: string;
  squadron: SquadronId;
  message: string;
}

export interface SnapshotData {
  ts: string;
  totals: {
    agents: number;
    running: number;
    idle: number;
    retry: number;
    error: number;
    documents: number;
    corpusCleanPct: number;
    llmCost24hUsd: number;
    chunks: number;
  };
  voti: VotoSnapshot[];
  agents: AgentSnapshot[];
  funnel: FunnelSnapshot;
  gpu: GpuSnapshot;
  sources: SourceSnapshot[];
  /** Eventi precaricati per il primo render (fallback se SSE non parte). */
  recentEvents: AgentEvent[];
}
