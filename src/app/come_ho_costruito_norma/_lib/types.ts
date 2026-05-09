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
