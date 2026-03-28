import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "NormaAI — La norma è uguale per tutti.",
  description:
    "NormaAI — La norma è uguale per tutti. AI normativo italiano per avvocati, commercialisti, consulenti del lavoro, ingegneri e geometri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
