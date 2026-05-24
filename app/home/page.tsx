"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { useTheme } from "../context/ThemeContext";

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

const PROJECTS = [
  { name: "Môj prvý projekt",    meta: "Zmenené pred 8 min",    starred: true,  grad: ["#3b1fa8","#9b5fe8"], shadow: "rgba(108,63,199,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { name: "Dashboard a reporty", meta: "Zmenené dnes",          starred: false, grad: ["#0d4f6e","#1ab3d4"], shadow: "rgba(14,124,158,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { name: "Nápady na Q3",        meta: "Zmenené včera",         starred: false, grad: ["#7a1f3a","#e8567a"], shadow: "rgba(192,54,90,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
  { name: "Spustenie produktu",  meta: "Zmenené pred 2 dňami", starred: false, grad: ["#1a5c2a","#4ecb6e"], shadow: "rgba(46,158,74,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
];

export default function HomePage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, avatarId, userName } = useTheme();
  const [stars, setStars] = useState(PROJECTS.map((p) => p.starred));

  const AVATARS: Record<string, (c1: string, c2: string) => React.ReactElement> = {
    robot: (c1, c2) => (
      <svg viewBox="0 0 64 64" fill="none" width="100%" height="100%">
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
    ghost: (c1, c2) => (
      <svg viewBox="0 0 64 64" fill="none" width="100%" height="100%">
        <path d="M14 52 L14 28 Q14 12 32 12 Q50 12 50 28 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 Z" fill={c1}/>
        <circle cx="24" cy="30" r="5" fill="white"/><circle cx="40" cy="30" r="5" fill="white"/>
        <circle cx="25" cy="31" r="3" fill={c2}/><circle cx="41" cy="31" r="3" fill={c2}/>
      </svg>
    ),
    cat: (c1, c2) => (
      <svg viewBox="0 0 64 64" fill="none" width="100%" height="100%">
        <ellipse cx="32" cy="36" rx="18" ry="16" fill={c1}/>
        <polygon points="16,22 12,8 22,18" fill={c1}/><polygon points="48,22 52,8 42,18" fill={c1}/>
        <circle cx="25" cy="34" r="4" fill="white"/><circle cx="39" cy="34" r="4" fill="white"/>
        <circle cx="26" cy="35" r="2" fill={c2}/><circle cx="40" cy="35" r="2" fill={c2}/>
      </svg>
    ),
  };

  const avatarFn = AVATARS[avatarId] ?? AVATARS.robot;

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: "28px 28px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: grad, padding: 3, flexShrink: 0 }}>
          {avatarFn(appliedA, appliedB)}
        </div>
        Vitaj{userName ? `, ${userName}` : ""}
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px" }}>
        Naposledy otvorené
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
        {PROJECTS.map((p, i) => (
          <div key={i} onClick={() => router.push(`/project-${i + 1}`)} style={{
            borderRadius: 18, padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 14,
            cursor: "pointer", position: "relative", overflow: "hidden",
            background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`,
            boxShadow: `0 6px 22px ${p.shadow}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{p.svg}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{p.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{p.meta}</div>
            </div>
            <span onClick={(e) => { e.stopPropagation(); setStars(s => s.map((v, j) => j === i ? !v : v)); }}
              style={{
                fontSize: 18, cursor: "pointer", zIndex: 1,
                color: stars[i] ? "#f5c842" : "rgba(255,255,255,0.25)",
                filter: stars[i] ? "drop-shadow(0 0 5px rgba(245,200,66,0.5))" : "none",
              }}>
              {stars[i] ? "★" : "☆"}
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 4 }}>
        Pracovné priestory
      </div>

      <div style={{
        maxWidth: 480, background: theme.card2, border: `1px solid ${theme.border}`,
        borderRadius: 18, padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13, background: grad,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0, boxShadow: `0 4px 14px ${appliedA}55`,
        }}>⊞</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Hlavný workspace</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginTop: 2 }}>4 projekty · 2 členovia</div>
        </div>
        <span style={{ color: theme.muted }}>→</span>
      </div>

      <button style={{
        position: "fixed", bottom: 28, right: 28,
        width: 52, height: 52, borderRadius: "50%",
        background: grad, border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, color: "#fff", cursor: "pointer",
        boxShadow: `0 8px 24px ${appliedA}77`,
      }}>+</button>
    </div>
  );
}