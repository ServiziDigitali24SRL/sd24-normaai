import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Font (Instrument Serif + Inter Tight + JetBrains Mono) sono caricati dal
// root layout (src/app/layout.tsx) e disponibili come CSS variables a tutta
// l'app: var(--font-instrument-serif), var(--font-inter-tight),
// var(--font-jetbrains-mono).

export const metadata: Metadata = {
  title: 'Come ho costruito NormaAI — 114 agenti AI in tempo reale',
  description:
    'Guarda dal vivo come 114 agenti AI stanno costruendo il più grande corpus normativo italiano: documenti scaricati, chunk processati, embedding GPU, voti di qualità — tutto in tempo reale, niente cloud LLM a pagamento.',
  alternates: { canonical: 'https://www.normaai.it/come_ho_costruito_norma' },
  openGraph: {
    title: 'Come ho costruito NormaAI — 114 agenti AI in tempo reale',
    description:
      '114 agenti AI in tempo reale, zero LLM cloud a pagamento. Costruzione del più grande corpus normativo italiano.',
    url: 'https://www.normaai.it/come_ho_costruito_norma',
    type: 'article',
    locale: 'it_IT',
    siteName: 'NormaAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Come ho costruito NormaAI — 114 agenti AI in tempo reale',
    description: '114 agenti AI in tempo reale, zero LLM cloud a pagamento.',
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export default function ComeHoCostruitoNormaLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#F6F2EA] text-[#13110F] antialiased"
      style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}
