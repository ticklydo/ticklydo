"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { useTheme } from "../context/ThemeContext";
import GlobalSearch from "./GlobalSearch";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const AVATARS: Record<string, (c1: string, c2: string) => React.ReactElement> = {
  robot: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="16" y="20" width="32" height="28" rx="8" fill={c1}/>
      <rect x="22" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
      <rect x="34" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
      <rect x="24" y="30" width="4" height="4" rx="1" fill={c2}/>
      <rect x="36" y="30" width="4" height="4" rx="1" fill={c2}/>
      <rect x="27" y="40" width="10" height="3" rx="1.5" fill="white" opacity="0.7"/>
      <rect x="30" y="12" width="4" height="8" rx="2" fill={c1}/>
      <circle cx="32" cy="11" r="3" fill={c2}/>
      <rect x="8" y="26" width="6" height="12" rx="3" fill={c1}/>
      <rect x="50" y="26" width="6" height="12" rx="3" fill={c1}/>
    </svg>
  ),
  cat: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="36" rx="18" ry="16" fill={c1}/>
      <polygon points="16,22 12,8 22,18" fill={c1}/>
      <polygon points="48,22 52,8 42,18" fill={c1}/>
      <circle cx="25" cy="34" r="4" fill="white"/>
      <circle cx="39" cy="34" r="4" fill="white"/>
      <circle cx="26" cy="35" r="2" fill={c2}/>
      <circle cx="40" cy="35" r="2" fill={c2}/>
      <path d="M28 42 Q32 45 36 42" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  fox: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <polygon points="32,8 16,28 20,28" fill={c1}/>
      <polygon points="32,8 48,28 44,28" fill={c1}/>
      <ellipse cx="32" cy="38" rx="18" ry="14" fill={c1}/>
      <circle cx="25" cy="35" r="4" fill="white"/>
      <circle cx="39" cy="35" r="4" fill="white"/>
      <circle cx="26" cy="36" r="2" fill={c2}/>
      <circle cx="40" cy="36" r="2" fill={c2}/>
    </svg>
  ),
  panda: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="32" cy="36" r="18" fill="white"/>
      <circle cx="20" cy="24" r="8" fill={c1}/>
      <circle cx="44" cy="24" r="8" fill={c1}/>
      <circle cx="24" cy="35" r="5" fill={c1}/>
      <circle cx="40" cy="35" r="5" fill={c1}/>
      <circle cx="25" cy="36" r="1.5" fill={c2}/>
      <circle cx="41" cy="36" r="1.5" fill={c2}/>
    </svg>
  ),
  unicorn: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="white"/>
      <path d="M32 8 L36 22 L28 22 Z" fill={c2}/>
      <circle cx="25" cy="36" r="4" fill="white"/>
      <circle cx="39" cy="36" r="4" fill="white"/>
      <circle cx="26" cy="37" r="2" fill={c2}/>
      <circle cx="40" cy="37" r="2" fill={c2}/>
    </svg>
  ),
  alien: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="34" rx="16" ry="20" fill={c1}/>
      <ellipse cx="24" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/>
      <ellipse cx="40" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/>
      <circle cx="24" cy="32" r="2" fill="#111"/>
      <circle cx="40" cy="32" r="2" fill="#111"/>
    </svg>
  ),
  ghost: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M14 52 L14 28 Q14 12 32 12 Q50 12 50 28 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 Z" fill={c1}/>
      <circle cx="24" cy="30" r="5" fill="white"/>
      <circle cx="40" cy="30" r="5" fill="white"/>
      <circle cx="25" cy="31" r="3" fill={c2}/>
      <circle cx="41" cy="31" r="3" fill={c2}/>
    </svg>
  ),
  dragon: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="38" rx="16" ry="14" fill={c1}/>
      <polygon points="20,24 14,10 24,20" fill={c1}/>
      <polygon points="44,24 50,10 40,20" fill={c1}/>
      <circle cx="25" cy="35" r="4" fill="white"/>
      <circle cx="39" cy="35" r="4" fill="white"/>
      <circle cx="26" cy="36" r="2.5" fill={c2}/>
      <circle cx="40" cy="36" r="2.5" fill={c2}/>
    </svg>
  ),
};

const NAV: { id: string; label: string; path: string; svg: React.ReactElement }[] = [
  {
    id: "home", label: "Domov", path: "/home",
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: "work", label: "Moja práca", path: "/work",
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    id: "notifications", label: "Notifikácie", path: "/notifications",
    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode, appliedA, appliedB, grad, theme, avatarId } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const avatarFn = AVATARS[avatarId] ?? AVATARS.robot;

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  function isProfileActive() {
    return pathname === "/profile";
  }

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <aside style={{
        width: 72,
        background: theme.card,
        borderRight: `1px solid ${theme.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 0 24px",
        gap: 4,
        flexShrink: 0,
        transition: "background .3s, border-color .3s",
        zIndex: 50,
      }}>
        {/* Logo */}
        <img
          src="/IKONA.png"
          alt="TicklyDo"
          onClick={() => router.push("/home")}
          style={{
            width: 42, height: 42, borderRadius: 13,
            marginBottom: 18, cursor: "pointer",
            objectFit: "contain",
          }}
        />

        {/* Search button */}
        <button
          title="Hľadať úlohy (Ctrl+K)"
          onClick={() => setSearchOpen(true)}
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "none",
            background: "transparent",
            color: theme.muted,
            transition: "all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = theme.card2; e.currentTarget.style.color = appliedA; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        <div style={{ width: 36, height: 1, background: theme.border, margin: "2px 0" }} />

        {/* Nav items */}
        {NAV.map((item) => (
          <button
            key={item.id}
            title={item.label}
            onClick={() => router.push(item.path)}
            style={{
              width: 46, height: 46, borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "none",
              background: isActive(item.path) ? theme.card2 : "transparent",
              color: isActive(item.path) ? appliedA : theme.muted,
              position: "relative", transition: "all .2s",
            }}
          >
            {isActive(item.path) && (
              <span style={{
                position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                width: 3, height: 24, borderRadius: "0 3px 3px 0",
                background: grad,
              }} />
            )}
            {item.svg}
          </button>
        ))}

        <div style={{ width: 36, height: 1, background: theme.border, margin: "6px 0" }} />

        {/* Profile */}
        <button
          title="Profil & Nastavenia"
          onClick={() => router.push("/profile")}
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "none",
            background: isProfileActive() ? theme.card2 : "transparent",
            color: isProfileActive() ? appliedA : theme.muted,
            position: "relative", transition: "all .2s",
          }}
        >
          {isProfileActive() && (
            <span style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              width: 3, height: 24, borderRadius: "0 3px 3px 0",
              background: grad,
            }} />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        {/* Avatar mini preview */}
        <div
          onClick={() => router.push("/profile")}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: grad, padding: 3,
            cursor: "pointer", marginBottom: 8,
            boxShadow: `0 2px 10px ${appliedA}44`,
          }}
          title="Môj profil"
        >
          {avatarFn(appliedA, appliedB)}
        </div>

        {/* Logout */}
        <button
          title="Odhlásiť sa"
          onClick={async () => {
            await auth.signOut();
            window.location.href = "/login";
          }}
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, cursor: "pointer", border: "none",
            background: "transparent", color: theme.muted,
            fontSize: 10, fontWeight: 700, transition: "color .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={e => e.currentTarget.style.color = theme.muted}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Odhlásiť
        </button>
      </aside>
    </>
  );
}