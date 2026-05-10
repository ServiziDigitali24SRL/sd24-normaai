// src/lib/oauth/types.ts
// OAuth multi-platform types (LinkedIn / YouTube / TikTok / Meta).

export type OAuthProvider = 'linkedin' | 'youtube' | 'tiktok' | 'meta';

export interface OAuthTokenRow {
  id: string;
  provider: OAuthProvider;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: string | null; // ISO
  scopes: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number; // seconds
  scope?: string;
  // Provider-specific
  [k: string]: unknown;
}
