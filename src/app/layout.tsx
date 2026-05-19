import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "RunnerBet — pariez sur vos chronos",
  description: "App de paris virtuels entre coureurs basée sur les chronos VDOT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
          <footer className="text-center text-xs text-white/40 py-8">
            RunnerBet — jetons virtuels, aucune monnaie réelle.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
