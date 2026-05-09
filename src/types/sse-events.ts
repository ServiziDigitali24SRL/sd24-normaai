// src/types/sse-events.ts
//
// Mirror compilato di sd24-normaai-megabuild/shared/sse-types.ts.
// Tab 6 (frontend storytelling) consuma da qui via `import { SseEvent }
// from '@/types/sse-events'`.
// Mantenere allineato manualmente con il file canonico in megabuild.

import type {
  ADR,
  AgentEvent,
  Incident,
  Milestone,
  VotiSnapshot,
} from '@/lib/ops/types';

export type SseEvent =
  | { type: 'agent_event'; data: AgentEvent }
  | { type: 'voti_update'; data: VotiSnapshot }
  | { type: 'incident_open'; data: Incident }
  | {
      type: 'incident_close';
      data: Pick<Incident, 'incident_key' | 'state' | 'resolved_at'>;
    }
  | { type: 'milestone_achieved'; data: Milestone }
  | { type: 'adr_decided'; data: ADR }
  | { type: 'heartbeat'; data: { ts: string } };

export type SseEventType = SseEvent['type'];

export interface AgentEventNotifyPayload {
  id: number;
  agent_id: string;
  squadron: AgentEvent['squadron'];
  event_type: AgentEvent['event_type'];
  severity: AgentEvent['severity'];
  occurred_at: string;
}

export const PUBLIC_SAFE_EVENT_FILTER = (
  ev: AgentEventNotifyPayload,
): boolean => {
  if (ev.squadron === 'ops') {
    if (ev.event_type === 'incident_detected' && ev.severity === 'P0') {
      return false;
    }
  }
  return true;
};
