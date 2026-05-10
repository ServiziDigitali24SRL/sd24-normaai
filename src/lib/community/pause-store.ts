// SER-167 M5/M6 — Process-local pause store (cold start = reset).
// MVP: stato in-memory; Production target = Redis condiviso.
import type { PauseRecord } from "./types";

class PauseStore {
  private state: PauseRecord | null = null;

  setPause(reason: string, hours: number, by = "community-webhook"): void {
    const now = new Date();
    this.state = {
      reason,
      paused_at: now.toISOString(),
      expires_at: new Date(now.getTime() + hours * 3_600_000).toISOString(),
      by,
    };
  }

  isPaused(): boolean {
    if (!this.state) return false;
    if (Date.now() >= Date.parse(this.state.expires_at)) {
      this.state = null;
      return false;
    }
    return true;
  }

  getInfo(): PauseRecord | null {
    return this.state;
  }

  clear(): void {
    this.state = null;
  }
}

export const pauseStore = new PauseStore();
