import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import PlausibleAnalytics from "@/components/PlausibleAnalytics";
import SessionGuard from "@/components/SessionGuard";

// Brand fonts NormaAI cream/serif legal-warm — esposti come CSS variables
// per essere usati da homepage, /come_ho_costruito_norma, /studio e route future
// via `style={{ fontFamily: 'var(--font-instrument-serif)' }}` o tailwind
// arbitrary values. preload:true sul serif primario per LCP del hero.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: true,
  fallback: ["Iowan Old Style", "Georgia", "serif"],
  adjustFontFallback: true,
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "NormaAI — La norma è uguale per tutti.",
  description:
    "AI normativo italiano per avvocati, commercialisti, consulenti del lavoro, ingegneri e geometri. Cerca nella legislazione italiana con intelligenza artificiale.",
  metadataBase: new URL("https://normaai.it"),
  openGraph: {
    title: "NormaAI — La norma è uguale per tutti.",
    description:
      "AI normativo italiano: cerca leggi, articoli, sentenze e normative con intelligenza artificiale. Per professionisti del diritto.",
    url: "https://normaai.it",
    siteName: "NormaAI",
    type: "website",
    locale: "it_IT",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NormaAI — AI normativo italiano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NormaAI — La norma è uguale per tutti.",
    description:
      "AI normativo italiano per professionisti. Cerca nella legislazione con intelligenza artificiale.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "https://normaai.it",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "NormaAI",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://normaai.it",
              description:
                "AI normativo italiano per professionisti del diritto. Cerca leggi, articoli, sentenze e normative.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "Piano gratuito disponibile",
              },
              author: {
                "@type": "Organization",
                name: "Servizi Digitali 24 S.R.L.",
                url: "https://normaai.it",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <SessionGuard />
        <CookieBanner />
        <PlausibleAnalytics />
      </body>
    </html>
  );
}
