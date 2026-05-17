import type { Metadata, Viewport } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MonCasin.fr by i4z — Casino social entre potes",
  description:
    "Machine à sous, leaderboard, boutique VIP et roue quotidienne. Le casino mobile premium pour jouer avec tes amis.",
  applicationName: "MonCasin.fr",
};

export const viewport: Viewport = {
  themeColor: "#0B0813",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${syne.variable}`}>
      <body className="overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 bg-casino-radial" aria-hidden />
        <div className="pointer-events-none fixed -left-32 top-1/4 h-64 w-64 rounded-full bg-casino-purple/20 blur-[100px]" aria-hidden />
        <div className="pointer-events-none fixed -right-24 bottom-1/4 h-48 w-48 rounded-full bg-casino-gold/10 blur-[80px]" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
