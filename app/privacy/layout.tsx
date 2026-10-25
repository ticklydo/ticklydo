import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zásady ochrany osobných údajov",
  description: "Ako TicklyDo zbiera, používa a chráni tvoje osobné údaje, a aké máš práva podľa GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}