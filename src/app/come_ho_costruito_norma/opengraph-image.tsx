// SER-164 / Tab 4 — og:image dinamico /come_ho_costruito_norma.
//
// Edge runtime + ImageResponse (next/og built-in). Cache 1h.
// Vibe cream/serif Stripe Press italiana (NO dark/cyber, NO emoji).
// Brand tokens reali estratti dal frontend Tab 6:
//   bg #F6F2EA · accent oklch(0.58 0.18 35) ruggine
//   serif Instrument Serif headlines + Inter Tight body
//
// Mostra snapshot vivo: voto medio + count agent attivi + tagline.

import { ImageResponse } from 'next/og';
import type { SnapshotData } from '@/lib/ops/types';

export const runtime = 'edge';
export const revalidate = 3600;
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'NormaAI — Stiamo costruendo. Centoquattordici agenti. In azione.';

async function fetchSnapshot(req?: Request): Promise<Partial<SnapshotData>> {
  // L'og:image render è server-side al deploy/cache; uso URL assoluta.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'https://www.normaai.it';
  const url = base.startsWith('http') ? `${base}/api/ops/snapshot` : `https://${base}/api/ops/snapshot`;
  try {
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) return {};
    return (await r.json()) as Partial<SnapshotData>;
  } catch {
    return {};
  }
}

export default async function OgImage(): Promise<ImageResponse> {
  const snap = await fetchSnapshot();
  const voti = snap.voti ?? [];
  const avgVoto =
    voti.length > 0
      ? Math.round(voti.reduce((a, v) => a + Number(v.voto || 0), 0) / voti.length)
      : null;
  const activeAgents = snap.agents_count
    ? snap.agents_count.reduce((a, s) => a + (s.active ?? 0), 0)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#F6F2EA',
          color: '#1A1814',
          fontFamily: '"Instrument Serif", "Times New Roman", serif',
          padding: '64px 80px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: 24,
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#7A6A50',
            }}
          >
            NormaAI · Diario di costruzione
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 400,
              maxWidth: 980,
              letterSpacing: '-0.02em',
            }}
          >
            Stiamo costruendo. Centoquattordici agenti. In azione.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 40,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(26,24,20,0.18)',
            paddingTop: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 16,
                fontFamily: '"Inter Tight", system-ui, sans-serif',
                color: '#7A6A50',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Voto medio
            </div>
            <div style={{ fontSize: 88, lineHeight: 1, color: 'oklch(0.58 0.18 35)' }}>
              {avgVoto !== null ? avgVoto : '—'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 16,
                fontFamily: '"Inter Tight", system-ui, sans-serif',
                color: '#7A6A50',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Agent attivi
            </div>
            <div style={{ fontSize: 88, lineHeight: 1 }}>
              {activeAgents !== null ? activeAgents : '—'}
              <span style={{ fontSize: 36, color: '#7A6A50', marginLeft: 8 }}>/ 114</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontFamily: '"Inter Tight", system-ui, sans-serif',
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#7A6A50',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              normaai.it
            </div>
            <div style={{ fontSize: 14, color: '#7A6A50', marginTop: 4 }}>
              {new Date().toISOString().slice(0, 10)}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
