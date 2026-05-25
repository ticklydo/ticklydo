"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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

type Project = {
  id: string;
  name: string;
  color1: string;
  color2: string;
  iconId: string;
  starred: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

const GRADIENTS = [
  { a: "#3b1fa8", b: "#9b5fe8", shadow: "rgba(108,63,199,0.3)" },
  { a: "#0d4f6e", b: "#1ab3d4", shadow: "rgba(14,124,158,0.3)" },
  { a: "#7a1f3a", b: "#e8567a", shadow: "rgba(192,54,90,0.3)" },
  { a: "#1a5c2a", b: "#4ecb6e", shadow: "rgba(46,158,74,0.3)" },
  { a: "#7c2d12", b: "#f97316", shadow: "rgba(249,115,22,0.3)" },
  { a: "#1e1b4b", b: "#6366f1", shadow: "rgba(99,102,241,0.3)" },
  { a: "#164e63", b: "#06b6d4", shadow: "rgba(6,182,212,0.3)" },
  { a: "#4a044e", b: "#d946ef", shadow: "rgba(217,70,239,0.3)" },
];

const ICONS: { id: string; svg: React.ReactElement }[] = [
  { id: "doc", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "grid", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: "bulb", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
  { id: "rocket", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  { id: "star", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id: "target", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: "chart", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id: "heart", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
];

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
  fox: (c1, c2) => (
    <svg viewBox="0 0 64 64" fill="none" width="100%" height="100%">
      <polygon points="32,8 16,28 20,28" fill={c1}/><polygon points="32,8 48,28 44,28" fill={c1}/>
      <ellipse cx="32" cy="38" rx="18" ry="14" fill={c1}/>
      <circle cx="25" cy="35" r="4" fill="white"/><circle cx="39" cy="35" r="4" fill="white"/>
      <circle cx="26" cy="36" r="2" fill={c2}/><circle cx="40" cy="36" r="2" fill={c2}/>
    </svg>
  ),
};

function genId() { return Math.random().toString(36).slice(2, 10); }
function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Práve teraz";
  if (m < 60) return `Pred ${m} min`;
  if (h < 24) return `Pred ${h} hod`;
  if (d === 1) return "Včera";
  return `Pred ${d} dňami`;
}

export default function HomePage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, avatarId, userName } = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  // New project form
  const [newName, setNewName] = useState("");
  const [newGradIdx, setNewGradIdx] = useState(0);
  const [newIconId, setNewIconId] = useState("doc");

  const avatarFn = AVATARS[avatarId] ?? AVATARS.robot;

  // Load projects from Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().projects) {
        setProjects(snap.data().projects);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveProjects = async (newProjects: Project[]) => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", user.uid), { projects: newProjects }, { merge: true });
  };

  const createProject = () => {
    if (!newName.trim()) return;
    const g = GRADIENTS[newGradIdx];
    const p: Project = {
      id: genId(),
      name: newName.trim(),
      color1: g.a,
      color2: g.b,
      iconId: newIconId,
      starred: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...projects, p];
    setProjects(updated);
    saveProjects(updated);
    setShowNewModal(false);
    setNewName("");
    setNewGradIdx(0);
    setNewIconId("doc");
    router.push(`/project/${p.id}`);
  };

  const toggleStar = (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, starred: !p.starred } : p);
    setProjects(updated);
    saveProjects(updated);
  };

  const archiveProject = (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, archived: true } : p);
    setProjects(updated);
    saveProjects(updated);
    setShowMenuId(null);
  };

  const unarchiveProject = (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, archived: false } : p);
    setProjects(updated);
    saveProjects(updated);
  };

  const deleteProject = (id: string) => {
    if (!window.confirm("Naozaj chceš vymazať tento projekt? Všetky dáta budú stratené.")) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
    setShowMenuId(null);
  };

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);
  const starredProjects = activeProjects.filter(p => p.starred);
  const recentProjects = [...activeProjects].sort((a, b) => b.updatedAt - a.updatedAt);

  const surface = theme.card;
  const surfaceHover = theme.card2;

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  const ProjectCard = ({ p }: { p: Project }) => {
    const icon = ICONS.find(ic => ic.id === p.iconId) ?? ICONS[0];
    const shadow = `rgba(0,0,0,0.2)`;
    return (
      <div style={{ position: "relative" }}>
        <div onClick={() => router.push(`/project/${p.id}`)} style={{
          borderRadius: 18, padding: "16px 18px",
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", overflow: "hidden",
          background: `linear-gradient(135deg, ${p.color1}, ${p.color2})`,
          boxShadow: `0 6px 22px ${shadow}`,
          transition: "transform .2s, box-shadow .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${shadow}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 6px 22px ${shadow}`; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon.svg}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{p.name}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{timeAgo(p.updatedAt)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Star */}
            <div onClick={e => { e.stopPropagation(); toggleStar(p.id); }} style={{ cursor: "pointer", color: p.starred ? "#f5c842" : "rgba(255,255,255,0.3)", filter: p.starred ? "drop-shadow(0 0 4px rgba(245,200,66,0.6))" : "none", transition: "all .2s" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={p.starred ? "#f5c842" : "none"} stroke={p.starred ? "#f5c842" : "rgba(255,255,255,0.5)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            {/* Menu */}
            <div onClick={e => { e.stopPropagation(); setShowMenuId(showMenuId === p.id ? null : p.id); }} style={{ cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </div>
          </div>
        </div>

        {/* Context menu */}
        {showMenuId === p.id && (
          <>
            <div onClick={() => setShowMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0,
              background: surface, border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: 6, zIndex: 51, minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              animation: "fadeIn .15s ease",
            }}>
              {[
                { label: "Otvoriť", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>, action: () => { router.push(`/project/${p.id}`); setShowMenuId(null); }, color: theme.text },
                { label: "Archivovať", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, action: () => archiveProject(p.id), color: theme.muted },
                { label: "Vymazať", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>, action: () => deleteProject(p.id), color: "#ef4444" },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  borderRadius: 8, cursor: "pointer", color: item.color,
                  fontSize: 13, fontWeight: 600, transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.card2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{item.icon} {item.label}</div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 28px 80px",
      display: "flex", flexDirection: "column", gap: 20,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: grad, padding: 3, flexShrink: 0 }}>
          {avatarFn(appliedA, appliedB)}
        </div>
        Vitaj{userName ? `, ${userName}` : ""}
      </div>

      {/* Starred */}
      {starredProjects.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={appliedA} stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Obľúbené
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
            {starredProjects.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        </>
      )}

      {/* Recent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 520 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          Všetky projekty ({activeProjects.length})
        </div>
        {archivedProjects.length > 0 && (
          <button onClick={() => setShowArchive(v => !v)} style={{
            background: "none", border: `1px solid ${theme.border}`, borderRadius: 8,
            padding: "4px 10px", color: theme.muted, fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            Archív ({archivedProjects.length})
          </button>
        )}
      </div>

      {activeProjects.length === 0 ? (
        <div style={{ maxWidth: 520, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 18, padding: "32px 20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: appliedA }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Žiadne projekty</div>
          <div style={{ fontSize: 13, color: theme.muted, marginBottom: 16 }}>Vytvor svoj prvý projekt kliknutím na "+"</div>
          <button onClick={() => setShowNewModal(true)} style={{ background: grad, border: "none", borderRadius: 12, padding: "10px 24px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Vytvoriť projekt</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          {recentProjects.map(p => <ProjectCard key={p.id} p={p} />)}
        </div>
      )}

      {/* Archive */}
      {showArchive && archivedProjects.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px", display: "flex", alignItems: "center", gap: 6, maxWidth: 520 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            Archivované
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
            {archivedProjects.map(p => {
              const icon = ICONS.find(ic => ic.id === p.iconId) ?? ICONS[0];
              return (
                <div key={p.id} style={{ borderRadius: 18, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, background: theme.card, border: `1px solid ${theme.border}`, opacity: 0.7 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${p.color1}, ${p.color2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {icon.svg}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>Archivované</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => unarchiveProject(p.id)} style={{ background: appliedA + "18", border: "none", borderRadius: 8, padding: "6px 12px", color: appliedA, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Obnoviť</button>
                    <button onClick={() => deleteProject(p.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 10px", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Vymazať</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FAB */}
      <button onClick={() => setShowNewModal(true)} style={{
        position: "fixed", bottom: 28, right: 28,
        width: 52, height: 52, borderRadius: "50%",
        background: grad, border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: `0 8px 24px ${appliedA}77`,
        transition: "transform .2s",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowNewModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: theme.card, borderRadius: 24, padding: 28,
            width: "min(480px, 92vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            border: `1px solid ${theme.border}`, animation: "fadeIn .2s ease",
          }}>
            {/* Preview */}
            <div style={{
              borderRadius: 16, padding: "18px 20px", marginBottom: 24,
              background: `linear-gradient(135deg, ${GRADIENTS[newGradIdx].a}, ${GRADIENTS[newGradIdx].b})`,
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: `0 8px 24px ${GRADIENTS[newGradIdx].shadow}`,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(ICONS.find(i => i.id === newIconId) ?? ICONS[0]).svg}
              </div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{newName || "Názov projektu"}</div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Názov projektu</div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Môj nový projekt..."
                onKeyDown={e => { if (e.key === "Enter") createProject(); }}
                style={{
                  width: "100%", background: theme.card2, border: `1.5px solid ${theme.border}`,
                  borderRadius: 12, padding: "11px 14px", color: theme.text,
                  fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = appliedA}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Ikona</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ICONS.map(ic => (
                  <div key={ic.id} onClick={() => setNewIconId(ic.id)} style={{
                    width: 44, height: 44, borderRadius: 12, cursor: "pointer",
                    background: newIconId === ic.id ? `linear-gradient(135deg, ${GRADIENTS[newGradIdx].a}, ${GRADIENTS[newGradIdx].b})` : theme.card2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${newIconId === ic.id ? "transparent" : theme.border}`,
                    transition: "all .15s",
                  }}>
                    <div style={{ filter: newIconId === ic.id ? "none" : "invert(0.5)" }}>{ic.svg}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Farba</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {GRADIENTS.map((g, i) => (
                  <div key={i} onClick={() => setNewGradIdx(i)} style={{
                    width: 36, height: 36, borderRadius: 10, cursor: "pointer",
                    background: `linear-gradient(135deg, ${g.a}, ${g.b})`,
                    border: `3px solid ${newGradIdx === i ? theme.text : "transparent"}`,
                    boxShadow: newGradIdx === i ? `0 0 0 2px ${g.a}` : "none",
                    transition: "all .15s",
                  }} />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{
                flex: 1, background: "none", border: `1px solid ${theme.border}`, borderRadius: 12,
                padding: "12px", color: theme.muted, fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "var(--font-geist-sans)",
              }}>Zrušiť</button>
              <button onClick={createProject} style={{
                flex: 2, background: grad, border: "none", borderRadius: 12,
                padding: "12px", color: "#fff", fontWeight: 800, fontSize: 14,
                cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                boxShadow: `0 4px 14px ${appliedA}44`,
              }}>Vytvoriť projekt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}