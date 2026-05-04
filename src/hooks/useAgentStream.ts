"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AGENT_DEFINITIONS, type AgentName } from "@/config/agents";
import type { AgentEvent, AgentState } from "@/lib/agent-events";

export interface AgentRow {
  name: AgentName;
  state: AgentState;
  durationMs?: number;
  output?: string;
  error?: string;
  startedAt?: number;
}

function initialRows(): Record<AgentName, AgentRow> {
  return Object.fromEntries(
    AGENT_DEFINITIONS.map(d => [d.name, { name: d.name, state: "idle" as AgentState }])
  ) as Record<AgentName, AgentRow>;
}

/**
 * Subscribes to an SSE endpoint that emits `event: agent` lines.
 * Returns a flat record keyed by agent name with current state.
 *
 * The endpoint URL is the chat stream endpoint itself; agent events are
 * multiplexed on the same connection via named SSE events.
 */
export function useAgentStream(streamUrl: string | null) {
  const [rows, setRows] = useState<Record<AgentName, AgentRow>>(initialRows);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => setRows(initialRows()), []);

  useEffect(() => {
    if (!streamUrl) return;

    const es = new EventSource(streamUrl);
    esRef.current = es;

    es.addEventListener("agent", (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as AgentEvent;
        setRows(prev => ({
          ...prev,
          [ev.agent]: {
            name: ev.agent,
            state: ev.state,
            durationMs: ev.durationMs,
            output: ev.output,
            error: ev.error,
            startedAt: ev.state === "started" ? ev.ts : prev[ev.agent]?.startedAt,
          },
        }));
      } catch {
        /* ignore malformed events */
      }
    });

    es.addEventListener("error", () => {
      // EventSource auto-reconnects unless closed
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [streamUrl]);

  return { rows, reset };
}
