import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrácia",
  description: "Vytvor si zadarmo účet v TicklyDo a organizuj projekty, poznámky a plán týždňa na jednom mieste.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}