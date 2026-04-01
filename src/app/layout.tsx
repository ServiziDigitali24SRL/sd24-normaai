import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ThemeProvider } from "next-themes";

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
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased h-screen overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
