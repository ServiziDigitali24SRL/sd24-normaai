export type SquadronId =
  | 'CORPUS'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'RAG'
  | 'AGENTS'
  | 'OPS'
  | 'SENTINEL'
  | 'DISCOVERY';

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
}
