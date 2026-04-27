/**
 * dashboard-utils.ts
 * Utility condivise tra dashboard-cittadino, dashboard-impresa, dashboard-professionista.
 * Estratto dal codice duplicato nelle 3 pagine (2026-04-27).
 */

// ─── Selection interface ──────────────────────────────────────────────────────

/**
 * Stato di navigazione sidebar. Identico in tutte e 3 le dashboard.
 */
export interface Selection {
  macro: string;
  macroLabel: string;
  item: string | null;
}

// ─── daysUntil ────────────────────────────────────────────────────────────────

/**
 * Giorni rimanenti a partire da una stringa data ISO.
 * @example daysUntil("2026-05-15") → 18
 */
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────

/**
 * Spinner di caricamento standard NormaAI — full-viewport.
 * Sostituisce il JSX inline identico in tutte e 3 le dashboard.
 */
export function LoadingSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--paper)" }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--paper-line)", borderTopColor: "var(--vermiglio)", borderRadius: "50%", animation: "mdSpin 0.8s linear infinite" }} />
      <style>{`@keyframes mdSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
