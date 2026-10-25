import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prihlásenie",
  description: "Prihlás sa do TicklyDo a pokračuj vo svojich projektoch, poznámkach a pláne týždňa.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}