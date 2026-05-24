"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

export default function NotificationsPage() {
  const { grad, theme, appliedA } = useTheme();
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 28px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={gradientText(grad)}>Notifikácie</span>
      </div>
      <p style={{ color: theme.muted, fontWeight: 700 }}>Zatiaľ žiadne notifikácie.</p>
    </div>
  );
}