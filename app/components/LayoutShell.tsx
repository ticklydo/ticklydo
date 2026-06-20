"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";
import { ReactNode } from "react";

// Pages where sidebar should NOT appear
const NO_SIDEBAR_PATHS = ["/", "/login", "/register", "/privacy", "/terms"];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, loaded } = useTheme();

  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  // Loading screen (only for authed pages)
  if (!loaded && showSidebar) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0c13",
        gap: 20,
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.92); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <img
          src="/IKONA.png"
          alt="TicklyDo"
          style={{
            width: 72, height: 72, borderRadius: 20,
            animation: "pulse 1.6s ease-in-out infinite",
            objectFit: "contain",
          }}
        />
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #22233a",
          borderTopColor: "#e040fb",
          animation: "spin .8s linear infinite",
        }} />
        <div style={{
          color: "#6b6c80", fontSize: 13, fontWeight: 700,
          fontFamily: "var(--font-geist-sans)",
          letterSpacing: "0.5px",
        }}>
          Načítavam...
        </div>
      </div>
    );
  }

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: theme.bg,
      color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}

export function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Shell>{children}</Shell>
    </ThemeProvider>
  );
}