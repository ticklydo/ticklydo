"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

export default function WorkPage() {
  const { grad, theme, appliedA } = useTheme();
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 28px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        <span style={gradientText(grad)}>Moja práca</span>
      </div>
      <p style={{ color: theme.muted, fontWeight: 700 }}>Tu bude zoznam tvojich úloh.</p>
    </div>
  );
}