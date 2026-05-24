"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";

export default function ProjectPage({ projectName }: { projectName: string }) {
  const router = useRouter();
  const { grad, theme, appliedA } = useTheme();
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 28px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{projectName}</div>
      <p style={{ color: theme.muted, fontWeight: 700 }}>Zatiaľ prázdne. Čoskoro tu pribudne obsah.</p>
      <button onClick={() => router.push("/home")} style={{
        background: "none", border: `1px solid ${theme.border}`,
        borderRadius: 10, padding: "10px 20px", color: theme.muted,
        cursor: "pointer", fontSize: 14, width: "fit-content",
      }}>← Späť</button>
    </div>
  );
}