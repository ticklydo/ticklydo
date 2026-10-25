import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CookieConsent from "./components/CookieConsent";
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
  // "./" = každá stránka má vlastnú kanonickú adresu (nie všetky smerujú na úvodnú)
  alternates: {
    canonical: "./",
  },
  // overenie vlastníctva v Google Search Console (kód nastav vo Verceli ako NEXT_PUBLIC_GSC_VERIFICATION)
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
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
        {/* štruktúrované údaje pre Google (názov, logo a popis aplikácie vo výsledkoch vyhľadávania) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://ticklydo.com/#org",
                name: "TicklyDo",
                url: "https://ticklydo.com",
                logo: "https://ticklydo.com/LOGO.png",
                email: "support@ticklydo.com",
              },
              {
                "@type": "WebSite",
                "@id": "https://ticklydo.com/#website",
                url: "https://ticklydo.com",
                name: "TicklyDo",
                inLanguage: "sk",
                publisher: { "@id": "https://ticklydo.com/#org" },
              },
              {
                "@type": "SoftwareApplication",
                name: "TicklyDo",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: "https://ticklydo.com",
                description: "Projekty, poznámky a plán týždňa na jednom mieste.",
                offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              },
            ],
          }) }}
        />
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
        <CookieConsent />
      </body>
    </html>
  );
}