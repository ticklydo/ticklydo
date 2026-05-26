"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";

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

type Notif = {
  id: string;
  type: "overdue" | "today" | "tomorrow" | "soon";
  taskName: string;
  projectName: string;
  projectId: string;
  dueDate: string;
  projectColor1: string;
  projectColor2: string;
};

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

function formatDate(d: string) {
  if (!d) return "";
  const months = ["jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"];
  const parts = d.split("-");
  if (parts.length === 3) return `${parseInt(parts[2])}. ${months[parseInt(parts[1]) - 1]}`;
  return d;
}

const TYPE_CONFIG = {
  overdue: { label: "Po termíne", color: "#dc2626", bg: "#fee2e2", border: "#dc262633", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  today:   { label: "Dnes",      color: "#b45309", bg: "#fef3c7", border: "#b4530933", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  tomorrow:{ label: "Zajtra",    color: "#2563eb", bg: "#dbeafe", border: "#2563eb33", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  soon:    { label: "Tento týždeň", color: "#6b7280", bg: "#f3f4f6", border: "#6b728033", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const surface = darkMode ? theme.card : "#ffffff";
  const shadow = darkMode ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) { setLoading(false); return; }
      const projects = (userSnap.data().projects ?? []).filter((p: any) => !p.archived);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const in7 = new Date(today); in7.setDate(today.getDate() + 7);
      const in7Str = in7.toISOString().split("T")[0];

      const all: Notif[] = [];

      await Promise.all(projects.map(async (project: any) => {
        const snap = await getDoc(doc(db, "projects", `${user.uid}_${project.id}`));
        if (!snap.exists()) return;
        const tasks = snap.data().tasks ?? [];

        tasks.filter((t: any) => t.dueDate && t.status !== "Hotovo").forEach((t: any) => {
          let type: Notif["type"] | null = null;
          if (t.dueDate < todayStr) type = "overdue";
          else if (t.dueDate === todayStr) type = "today";
          else if (t.dueDate === tomorrowStr) type = "tomorrow";
          else if (t.dueDate <= in7Str) type = "soon";

          if (type) all.push({
            id: `${project.id}-${t.id}`,
            type, taskName: t.name,
            projectName: project.name, projectId: project.id,
            dueDate: t.dueDate,
            projectColor1: project.color1 ?? appliedA,
            projectColor2: project.color2 ?? appliedB,
          });
        });
      }));

      // Sort: overdue first, then today, tomorrow, soon; within same type by date
      const order = { overdue: 0, today: 1, tomorrow: 2, soon: 3 };
      all.sort((a, b) => order[a.type] - order[b.type] || a.dueDate.localeCompare(b.dueDate));
      setNotifs(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const visible = notifs.filter(n => !dismissed.has(n.id));
  const overdueCount = visible.filter(n => n.type === "overdue").length;
  const todayCount = visible.filter(n => n.type === "today").length;

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "24px 24px 60px",
      display: "flex", flexDirection: "column", gap: 20,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ fontSize: 22, fontWeight: 900, ...gradientText(grad) }}>Notifikácie</span>
          {visible.length > 0 && (
            <div style={{ background: overdueCount > 0 ? "#dc2626" : appliedA, color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{visible.length}</div>
          )}
        </div>
        {visible.length > 0 && (
          <button onClick={() => setDismissed(new Set(notifs.map(n => n.id)))} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
            Označiť všetky ako prečítané
          </button>
        )}
      </div>

      {/* Summary cards */}
      {visible.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {overdueCount > 0 && (
            <div style={{ background: darkMode ? "#dc262218" : "#fee2e2", border: "1px solid #dc262233", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#dc2626" }}>{overdueCount}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginTop: 2 }}>Po termíne</div>
            </div>
          )}
          {todayCount > 0 && (
            <div style={{ background: darkMode ? "#b4530918" : "#fef3c7", border: "1px solid #b4530933", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309" }}>{todayCount}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginTop: 2 }}>Dnes</div>
            </div>
          )}
          <div style={{ background: darkMode ? theme.card : surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: appliedA }}>{visible.length}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, marginTop: 2 }}>Celkom</div>
          </div>
        </div>
      )}

      {/* Notifications list */}
      {visible.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "56px 20px", textAlign: "center", boxShadow: shadow }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: appliedA }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Všetko v poriadku!</div>
          <div style={{ fontSize: 13, color: theme.muted }}>Žiadne blížiace sa termíny ani oneskorené úlohy.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn .2s ease" }}>
          {(["overdue", "today", "tomorrow", "soon"] as const).map(type => {
            const group = visible.filter(n => n.type === type);
            if (group.length === 0) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type}>
                {/* Group header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginBottom: 6 }}>
                  <div style={{ color: cfg.color }}>{cfg.icon}</div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.7px" }}>{cfg.label}</span>
                  <div style={{ flex: 1, height: 1, background: cfg.border }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "1px 8px" }}>{group.length}</span>
                </div>

                {/* Notif cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {group.map(n => (
                    <div key={n.id} style={{
                      background: darkMode ? cfg.color + "10" : cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderLeft: `4px solid ${cfg.color}`,
                      borderRadius: 12, padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: "pointer", transition: "all .15s",
                    }}
                    onClick={() => router.push(`/project/${n.projectId}`)}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateX(3px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
                    >
                      {/* Project color dot */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${n.projectColor1}, ${n.projectColor2})`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: cfg.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.taskName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: theme.muted, fontWeight: 600 }}>{n.projectName}</span>
                          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 700, background: cfg.color + "18", borderRadius: 6, padding: "1px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {n.type === "overdue" ? `Mal byť ${formatDate(n.dueDate)}` : formatDate(n.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button onClick={e => { e.stopPropagation(); setDismissed(prev => new Set([...prev, n.id])); }} style={{ background: "none", border: "none", cursor: "pointer", color: cfg.color, opacity: 0.5, padding: 4, display: "flex", alignItems: "center", flexShrink: 0, transition: "opacity .15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0.5"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}