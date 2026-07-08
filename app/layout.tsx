import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { LayoutShell } from "./components/LayoutShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TicklyDo — Organizuj nápady po svojom",
    template: "%s | TicklyDo",
  },
  description: "TicklyDo je moderný projektový nástroj pre jednotlivcov a tímy. Spravuj úlohy, kalendár a projekty na jednom mieste. Žiadny chaos, len čistý flow.",
  metadataBase: new URL("https://ticklydo.com"),
  alternates: {
    canonical: "https://ticklydo.com",
  },
  keywords: [
    "projektový manažment", "task manager", "úlohy", "produktivita",
    "kalendár", "tímová spolupráca", "Slovensko", "organizácia práce",
    "ticklydo", "project management", "to-do app"
  ],
  authors: [{ name: "TicklyDo", url: "https://ticklydo.com" }],
  creator: "TicklyDo",
  publisher: "TicklyDo",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "sk_SK",
    url: "https://ticklydo.com",
    siteName: "TicklyDo",
    title: "TicklyDo — Organizuj nápady po svojom",
    description: "Moderný projektový nástroj pre jednotlivcov a tímy. Úlohy, kalendár a projekty na jednom mieste.",
    images: [
      {
        url: "https://ticklydo.com/LOGO.png",
        width: 1200,
        height: 630,
        alt: "TicklyDo — Organizuj nápady po svojom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TicklyDo — Organizuj nápady po svojom",
    description: "Moderný projektový nástroj pre jednotlivcov a tímy. Úlohy, kalendár a projekty na jednom mieste.",
    images: ["https://ticklydo.com/LOGO.png"],
    creator: "@ticklydo",
  },
  icons: {
    icon: "/IKONA.png?v=2",
    shortcut: "/IKONA.png?v=2",
    apple: "/IKONA.png?v=2",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TicklyDo",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/IKONA.png" />
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LayoutShell>{children}</LayoutShell>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}