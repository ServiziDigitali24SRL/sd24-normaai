// SER-167 M5/M6 — Community webhook bridge: tipi condivisi
export interface CommunityEvent {
  platform: "instagram" | "tiktok" | "linkedin" | "youtube";
  comment_id: string;
  comment_text: string;
  user_handle: string;
  reel_id?: string;
  received_via: "webhook" | "polling" | "manual";
}

export interface PauseRecord {
  reason: string;
  paused_at: string;
  expires_at: string;
  by: string;
}

export interface BridgeResponse {
  status: "forwarded" | "paused" | "forward_failed";
  skipped: boolean;
  n8n_status?: number;
  n8n_response?: unknown;
  error?: string;
}
