// SER-164 / Tab 4 — /ops/admin landing.
//
// Stub iniziale. Estensioni future:
//   - tab "Agents" (114 agent state, restart count)
//   - tab "Incidents" (open + history)
//   - tab "Autopilot" (ADR + budget)
//   - tab "Voti" (drift detection, breakdown)
// Ogni tab consuma /api/ops/snapshot + /api/ops/admin/stream (SSE senza
// public-safe filter, da implementare in S5).

export default function OpsAdminPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
        <p className="text-zinc-400 max-w-prose">
          Stato real-time delle 8 squadron, 114 agent + META-AUTOPILOT. Tutti
          gli eventi sensibili (P0 ops/security, ADR raw inputs) sono visibili
          solo qui. Per la vista pubblica:{' '}
          <a
            className="underline decoration-dotted"
            href="/come_ho_costruito_norma"
          >
            /come_ho_costruito_norma
          </a>
          .
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400">Voti squadron</h3>
          <p className="text-xs text-zinc-500 mt-2">
            Live trend + drift. (in arrivo)
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400">Agent ledger</h3>
          <p className="text-xs text-zinc-500 mt-2">
            114 agent state · heartbeat · errori. (in arrivo)
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400">Incident</h3>
          <p className="text-xs text-zinc-500 mt-2">
            Open + 90gg MTTR. (in arrivo)
          </p>
        </div>
      </section>
    </div>
  );
}
