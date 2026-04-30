// Shared agent contracts. Every agent implements `run` and emits SSE events
// via the orchestrator's `emit` helper.

import type { AgentEvent, AgentState } from "@/lib/agent-events";
import type { AgentName } from "@/config/agents";

export type EmitFn = (ev: Omit<AgentEvent, "ts">) => void;

export interface AgentContext {
  conversationId: string;
  messageId?: string;
  userQuery: string;
  emit: EmitFn;
  abortSignal?: AbortSignal;
}

export interface CitationRef {
  urn: string;
  title: string;
  article: string | null;
  excerpt: string;
  source_chunk_id: string;
  verified: boolean;
}

export interface AgentResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface Agent<TIn = unknown, TOut = unknown> {
  name: AgentName;
  run(input: TIn, ctx: AgentContext): Promise<AgentResult<TOut>>;
}
