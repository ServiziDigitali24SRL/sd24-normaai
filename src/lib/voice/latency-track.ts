// Lightweight latency tracker shared across voice/avatar surfaces.
// Records named marks since construction and returns a final breakdown.
// Used by:
//   - /api/voice/sofia (Surface 1) — first_chunk_ms / total_ms
//   - /api/avatar/livesession (Surface 2) — session lifecycle timings
//
// Intentionally side-effect free: callers decide where to log/emit.

export interface LatencyMark {
  label: string;
  elapsed_ms: number;
}

export interface LatencyResult {
  total_ms: number;
  marks: LatencyMark[];
}

export class LatencyTracker {
  private t0: number;
  private marks: LatencyMark[] = [];

  constructor() {
    this.t0 = Date.now();
  }

  mark(label: string): number {
    const e = Date.now() - this.t0;
    this.marks.push({ label, elapsed_ms: e });
    return e;
  }

  finish(): LatencyResult {
    return { total_ms: Date.now() - this.t0, marks: this.marks };
  }
}
