export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import PlausibleAnalytics from "@/components/PlausibleAnalytics";
import SessionGuard from "@/components/SessionGuard";
import { ThemeProvider } from "next-themes";

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
    <html lang="it" suppressHydrationWarning>
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <SessionGuard />
          <CookieBanner />
          <PlausibleAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
