import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from 'next/font/google';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
      className={`${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable} min-h-screen bg-[#F6F2EA] text-[#13110F] antialiased`}
      style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}
