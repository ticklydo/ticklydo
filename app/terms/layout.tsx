import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podmienky používania",
  description: "Podmienky používania aplikácie TicklyDo.",
  alternates: { canonical: "/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}