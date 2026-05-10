import { CLUSTER_COUNTS, SQUADRON_META, mockSnapshot } from '../_lib/mock';
import type { AgentSnapshot, AgentStatus, SquadronId } from '../_lib/types';

/** Per-cluster SVG canvas — cluster fits in 140x120 box, points centered on (70, 70). */
const CLUSTER_W = 140;
const CLUSTER_H = 120;
const CLUSTER_CX = CLUSTER_W / 2;
const CLUSTER_CY = CLUSTER_H / 2;
const BASE_R = 7;
const DOT_R = 2.6;

const STATUS_COLORS: Record<AgentStatus, string> = {
  running: 'currentColor',
  idle: 'currentColor',
  retry: '#C9A14B',
  error: '#B43B25',
};

const STATUS_OPACITY: Record<AgentStatus, number> = {
  running: 1,
  idle: 0.3,
  retry: 1,
  error: 1,
};

/** Vogel-spiral packing centered on (cx, cy). Compatto, golden angle. */
function clusterPoints(count: number, cx: number, cy: number) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: cx, y: cy }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const r = BASE_R * Math.sqrt(i);
    const theta = i * golden;
    return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
  });
}

interface ClusterRender {
  squadron: SquadronId;
  agents: AgentSnapshot[];
}

function buildClusters(agents: AgentSnapshot[]): ClusterRender[] {
  const bySquadron = new Map<SquadronId, AgentSnapshot[]>();
  for (const a of agents) {
    if (!bySquadron.has(a.squadron)) bySquadron.set(a.squadron, []);
    bySquadron.get(a.squadron)!.push(a);
  }
  return CLUSTER_COUNTS.map(({ id }) => ({
    squadron: id,
    agents: bySquadron.get(id) ?? [],
  }));
}

function ClusterCard({ cluster }: { cluster: ClusterRender }) {
  const meta = SQUADRON_META[cluster.squadron];
  const points = clusterPoints(cluster.agents.length, CLUSTER_CX, CLUSTER_CY);

  return (
    <div className="flex flex-col items-center">
      <h3
        className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {cluster.squadron}
      </h3>
      <p
        className="mt-1 text-[11px] text-[#756C5E]"
        style={{ fontFamily: 'var(--font-inter-tight)' }}
      >
        {meta.italianLabel} · {cluster.agents.length}
      </p>
      <svg
        viewBox={`0 0 ${CLUSTER_W} ${CLUSTER_H}`}
        width={CLUSTER_W}
        height={CLUSTER_H}
        className="mt-3"
        style={{ color: meta.accent }}
        role="img"
        aria-label={`${cluster.squadron} · ${cluster.agents.length} agenti`}
      >
        {cluster.agents.map((a, i) => {
          const p = points[i];
          return (
            <circle
              key={a.id}
              cx={p.x}
              cy={p.y}
              r={DOT_R}
              fill={STATUS_COLORS[a.status]}
              opacity={STATUS_OPACITY[a.status]}
              className={a.status === 'retry' ? 'animate-pulse motion-reduce:animate-none' : ''}
            >
              <title>{`${a.id} · ${italianStatus(a.status)}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

export function AgentMap() {
  const { agents, totals } = mockSnapshot;
  const clusters = buildClusters(agents);

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.42_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        03 · chi lavora
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Centoquattordici agenti.
        <br />
        Otto reparti, più uno.
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">
          {wordsForCount(totals.running)} in azione adesso.
        </em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Ogni puntino è un agente. <span className="text-[#13110F]">Pieno</span> = al
        lavoro. <span className="text-[#13110F] opacity-40">Sbiadito</span> = in
        attesa. <span className="text-[#C9A14B]">Ocra</span> = riprova in corso.{' '}
        <span className="text-[#B43B25]">Rosso</span> = errore.
      </p>

      <div
        className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:gap-x-10 lg:gap-y-16"
        role="group"
        aria-label={`Mappa di ${agents.length} agenti distribuiti in ${CLUSTER_COUNTS.length} reparti`}
      >
        {clusters.map((c) => (
          <ClusterCard key={c.squadron} cluster={c} />
        ))}
      </div>

      <hr className="mt-16 border-t border-[#D8CFBC]" aria-hidden="true" />

      <div
        className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3 text-[13px] text-[#756C5E]"
        style={{ fontFamily: 'var(--font-inter-tight)' }}
        role="group"
        aria-label="Riepilogo stato agenti"
      >
        <Stat label="in azione"  value={totals.running} accent="#13110F" />
        <Stat label="in attesa"  value={totals.idle}    accent="#13110F" />
        <Stat label="in riprova" value={totals.retry}   accent="#C9A14B" />
        <Stat label="in errore"  value={totals.error}   accent="#B43B25" />
        <p className="w-full text-[12px] text-[#9A8E83] sm:ml-auto sm:w-auto">
          {agents.length} in mappa · 114 nominali a regime
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-baseline gap-2" aria-label={`${value} ${label}`}>
      <span
        className="text-[28px] leading-none"
        style={{ fontFamily: 'var(--font-instrument-serif)', color: accent }}
        aria-hidden="true"
      >
        {value}
      </span>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

const ITALIAN_STATUS: Record<AgentStatus, string> = {
  running: 'in azione',
  idle: 'in attesa',
  retry: 'in riprova',
  error: 'in errore',
};
function italianStatus(s: AgentStatus) {
  return ITALIAN_STATUS[s];
}

const ITALIAN_NUMBERS: Record<number, string> = {
  0: 'Zero', 1: 'Un', 2: 'Due', 3: 'Tre', 4: 'Quattro', 5: 'Cinque',
  6: 'Sei', 7: 'Sette', 8: 'Otto', 9: 'Nove', 10: 'Dieci',
};

/** Numeri da 0 a 99 in lettere (italiano), con maiuscola iniziale. Fallback a cifre per >99. */
function wordsForCount(n: number): string {
  if (n in ITALIAN_NUMBERS) return ITALIAN_NUMBERS[n];
  if (n < 20) {
    const map: Record<number, string> = {
      11: 'Undici', 12: 'Dodici', 13: 'Tredici', 14: 'Quattordici', 15: 'Quindici',
      16: 'Sedici', 17: 'Diciassette', 18: 'Diciotto', 19: 'Diciannove',
    };
    return map[n] ?? String(n);
  }
  if (n < 100) {
    const tens = ['', '', 'Venti', 'Trenta', 'Quaranta', 'Cinquanta', 'Sessanta', 'Settanta', 'Ottanta', 'Novanta'];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return tens[t];
    const tensWord = tens[t];
    const elide = u === 1 || u === 8;
    const tensStem = elide ? tensWord.slice(0, -1) : tensWord;
    const units = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
    return tensStem + units[u];
  }
  return String(n);
}
