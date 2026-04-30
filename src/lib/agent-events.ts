// Shared types for the agent SSE stream consumed by useAgentStream + AgentSidebar.

import type { AgentName } from "@/config/agents";

export type AgentState = "idle" | "started" | "progress" | "done" | "error";

export interface AgentEvent {
  agent: AgentName;
  state: AgentState;
  ts: number;                      // Date.now()
  durationMs?: number;             // populated on done/error
  output?: string;                 // short summary for sidebar (e.g. "3 norme trovate")
  error?: string;
  meta?: Record<string, unknown>;  // arbitrary debug payload
}

/** Server-Sent Events line format consumed by the client hook. */
export function encodeAgentEvent(ev: AgentEvent): string {
  return `event: agent\ndata: ${JSON.stringify(ev)}\n\n`;
}
