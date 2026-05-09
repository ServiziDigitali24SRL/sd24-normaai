import type { SnapshotData } from './types';

export const mockSnapshot: SnapshotData = {
  ts: '2026-05-09T12:04:31.000Z',
  totals: {
    agents: 114,
    running: 47,
    idle: 65,
    retry: 2,
    error: 0,
    documents: 612847,
    corpusCleanPct: 89.4,
    llmCost24hUsd: 0,
    chunks: 4_200_000,
  },
  voti: [
    { squadron: 'CORPUS',    italianLabel: 'raccolta documenti',      voto: 87, target: 85, trend: 'up' },
    { squadron: 'CHUNKING',  italianLabel: 'segmentazione semantica', voto: 92, target: 80, trend: 'up' },
    { squadron: 'EMBEDDING', italianLabel: 'vettorializzazione GPU',  voto: 89, target: 90, trend: 'down' },
    { squadron: 'RAG',       italianLabel: 'recupero contestuale',    voto: 85, target: 90, trend: 'down' },
    { squadron: 'AGENTS',    italianLabel: 'agenti conversazionali',  voto: 88, target: 80, trend: 'up' },
  ],
  agents: [],
};
