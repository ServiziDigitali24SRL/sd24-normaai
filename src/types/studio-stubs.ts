// src/types/studio-stubs.ts
//
// Tipi per i 5 stub endpoint /studio Tab 6 (M5 Tier 1+2).
// Mock data DETERMINISTICA (no Math.random) — peaks fissi per
// stabilità Lighthouse + screenshot riproducibili.

// ─── /api/community/replies (SSE) ───────────────────────────────────────────

export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin';
export type Sentiment = 'pos' | 'neu' | 'neg';

export interface ReplyEvent {
  ts: string;                  // ISO 8601
  platform: SocialPlatform;
  user_handle: string;         // '@anon_legale_84'
  comment_excerpt: string;
  sofia_reply: string;
  sentiment: Sentiment;
  disclaimer_present: true;
}

// ─── /api/community/sentiment-heatmap?days=7 ────────────────────────────────

export interface HeatmapCell {
  day: number;       // 0-6 (lun=0, dom=6)
  hour: number;      // 0-23
  score: number;     // -1..1
  volume: number;    // n eventi nel cell
}

export interface SentimentDayTotals {
  day: number;
  day_label: string;       // 'lun'..'dom'
  positive_pct: number;    // 0-100
  neutral_pct: number;
  negative_pct: number;
  events_total: number;
}

export interface SentimentHeatmapResponse {
  days: number;             // 7
  generated_at: string;
  matrix: HeatmapCell[];
  daily_totals: SentimentDayTotals[];
}

// ─── /api/ops/agent/[id]/pause ──────────────────────────────────────────────

export interface PauseRequest {
  reason?: string;
  duration_h?: number;
}

export interface PauseRecord {
  agent_id: string;
  paused: boolean;
  paused_at: string | null;
  reason: string | null;
  duration_h: number | null;
  resume_at: string | null;
  paused_by: string;
}

// ─── /api/ops/squadron/status ───────────────────────────────────────────────

export type AgentStudioStatus = 'idle' | 'running' | 'paused' | 'error';

export interface AgentStudioRow {
  id: string;
  name: string;
  squadron: string;
  status: AgentStudioStatus;
  last_event_ts: string;
  last_action: string;
}

export interface SquadronGroup {
  squadron: string;
  target_voto: number;
  current_voto: number;
  agents_total: number;
  agents_idle: number;
  agents_running: number;
  agents_paused: number;
  agents_error: number;
  agents: AgentStudioRow[];
}

export interface SquadronStatusResponse {
  generated_at: string;
  total_agents: number;
  groups: SquadronGroup[];
}

// ─── /api/ops/spend ─────────────────────────────────────────────────────────

export interface SpendBreakdown {
  heygen: number;
  elevenlabs: number;
  groq: number;
  openrouter: number;
  anthropic: number;
  vercel: number;
  supabase: number;
  r2: number;
}

export interface SpendDailyPoint {
  date: string;          // YYYY-MM-DD
  total_eur: number;
  delta_vs_avg_pct: number;
}

export interface SpendResponse {
  month: string;            // '2026-05'
  total_eur: number;
  breakdown: SpendBreakdown;
  trend_30d: SpendDailyPoint[];
  avg_daily_eur: number;
}
