import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, JetBrains_Mono } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { config } from "@/lib/config";
import "./globals.css";

// Variable, with an optical-size axis: headlines get the true display cut automatically.
const display = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-display-face",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Roboto Condensed", "sans-serif"],
});
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body-face" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: "QUORUM — a buyers' union", template: "%s · QUORUM" },
  description:
    "Bring the group chat and the price falls for everyone — including the people who joined first. Every drop publishes its full receipt.",
  openGraph: { siteName: "QUORUM", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e7e8e1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1216" },
  ],
};

// Stamp the saved theme before first paint so there's no flash of the wrong one.
const themeBoot = `try{var t=localStorage.getItem("q-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-sm">
          Skip to content
        </a>
        <DemoBanner />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
