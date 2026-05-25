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

type Status = "Hotovo" | "V procese" | "Uviaznuté" | "Nezačaté";
type Priority = "Vysoká" | "Stredná" | "Nízka" | "";

type Task = {
  id: string; name: string; status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string;
  projectId: string; projectName: string;
  projectColor1: string; projectColor2: string;
};

const STATUS_CONFIG: Record<Status, { color: string; bg: string; dot: string }> = {
  "Hotovo":    { color: "#16a34a", bg: "#dcfce7", dot: "#16a34a" },
  "V procese": { color: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  "Uviaznuté": { color: "#dc2626", bg: "#fee2e2", dot: "#ef4444" },
  "Nezačaté":  { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
};
const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  "Vysoká":  { color: "#dc2626", bg: "#fee2e2" },
  "Stredná": { color: "#b45309", bg: "#fef3c7" },
  "Nízka":   { color: "#2563eb", bg: "#dbeafe" },
  "":        { color: "#9ca3af", bg: "transparent" },
};
const STATUSES: Status[] = ["Nezačaté", "V procese", "Hotovo", "Uviaznuté"];

function formatDate(d: string) {
  if (!d) return "";
  const months = ["jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"];
  const parts = d.split("-");
  if (parts.length === 3) return `${parseInt(parts[2])}. ${months[parseInt(parts[1]) - 1]}`;
  return d;
}
function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d + "T00:00:00") < new Date();
}

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

type FilterStatus = Status | "Všetky";
type FilterPriority = Priority | "Všetky";
type SortBy = "dueDate" | "priority" | "status" | "project" | "name";

export default function WorkPage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Všetky");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("Všetky");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [search, setSearch] = useState("");
  const [groupByProject, setGroupByProject] = useState(false);

  const surface = darkMode ? theme.card : "#ffffff";
  const headerBg = darkMode ? theme.card2 : "#f8f9fb";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc, collection, getDocs } = await import("firebase/firestore");
      const db = getFirestore();

      // Load projects list
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) { setLoading(false); return; }
      const projects = userSnap.data().projects ?? [];

      // Load tasks from each project
      const allTasks: Task[] = [];
      await Promise.all(projects.filter((p: any) => !p.archived).map(async (project: any) => {
        const snap = await getDoc(doc(db, "projects", `${user.uid}_${project.id}`));
        if (!snap.exists()) return;
        const data = snap.data();
        (data.tasks ?? []).forEach((t: any) => {
          allTasks.push({
            id: t.id, name: t.name, status: t.status ?? "Nezačaté",
            priority: t.priority ?? "", dueDate: t.dueDate ?? "",
            owner: t.owner ?? "", notes: t.notes ?? "",
            projectId: project.id, projectName: project.name,
            projectColor1: project.color1 ?? appliedA,
            projectColor2: project.color2 ?? appliedB,
          });
        });
      }));

      setTasks(allTasks);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateTaskStatus = async (task: Task, newStatus: Status) => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    const snap = await getDoc(doc(db, "projects", `${user.uid}_${task.projectId}`));
    if (!snap.exists()) return;
    const data = snap.data();
    const updatedTasks = (data.tasks ?? []).map((t: any) =>
      t.id === task.id ? { ...t, status: newStatus } : t
    );
    await setDoc(doc(db, "projects", `${user.uid}_${task.projectId}`), { tasks: updatedTasks }, { merge: true });
    setTasks(prev => prev.map(t => t.id === task.id && t.projectId === task.projectId ? { ...t, status: newStatus } : t));
  };

  // Filter + sort
  let filtered = tasks.filter(t => {
    if (filterStatus !== "Všetky" && t.status !== filterStatus) return false;
    if (filterPriority !== "Všetky" && t.priority !== filterPriority) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const PRIORITY_ORDER: Record<string, number> = { "Vysoká": 0, "Stredná": 1, "Nízka": 2, "": 3 };
  const STATUS_ORDER: Record<string, number> = { "Uviaznuté": 0, "V procese": 1, "Nezačaté": 2, "Hotovo": 3 };

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    if (sortBy === "status") return (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2);
    if (sortBy === "project") return a.projectName.localeCompare(b.projectName);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const totalDone = filtered.filter(t => t.status === "Hotovo").length;
  const totalOverdue = filtered.filter(t => isOverdue(t.dueDate) && t.status !== "Hotovo").length;

  // Group by project if needed
  const groups: { label: string; color1: string; color2: string; projectId: string; tasks: Task[] }[] = [];
  if (groupByProject) {
    const map = new Map<string, Task[]>();
    filtered.forEach(t => {
      if (!map.has(t.projectId)) map.set(t.projectId, []);
      map.get(t.projectId)!.push(t);
    });
    map.forEach((tasks, projectId) => {
      const first = tasks[0];
      groups.push({ label: first.projectName, color1: first.projectColor1, color2: first.projectColor2, projectId, tasks });
    });
  }

  const TaskRow = ({ task }: { task: Task }) => {
    const sCfg = STATUS_CONFIG[task.status];
    const pCfg = PRIORITY_CONFIG[task.priority];
    const over = isOverdue(task.dueDate) && task.status !== "Hotovo";
    const done = task.status === "Hotovo";

    return (
      <div style={{
        display: "grid", gridTemplateColumns: "24px 1fr auto auto auto",
        alignItems: "center", gap: 12, padding: "10px 16px",
        borderBottom: `1px solid ${theme.border}`,
        transition: "background .15s", opacity: done ? 0.55 : 1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = darkMode ? appliedA + "08" : appliedA + "05"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* Checkbox */}
        <div onClick={() => updateTaskStatus(task, done ? "Nezačaté" : "Hotovo")} style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${done ? appliedA : theme.border}`,
          background: done ? appliedA : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .15s",
        }}>
          {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>

        {/* Name + project */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: `linear-gradient(135deg, ${task.projectColor1}, ${task.projectColor2})`, flexShrink: 0 }} />
            <span onClick={() => router.push(`/project/${task.projectId}`)} style={{ fontSize: 11, color: theme.muted, fontWeight: 600, cursor: "pointer", transition: "color .15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = appliedA}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = theme.muted}
            >{task.projectName}</span>
          </div>
        </div>

        {/* Due date */}
        <div style={{ fontSize: 11, fontWeight: 600, color: over ? "#dc2626" : task.dueDate ? theme.muted : theme.border, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {task.dueDate && (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {formatDate(task.dueDate)}
            </>
          )}
        </div>

        {/* Priority */}
        {task.priority ? (
          <span style={{ background: darkMode ? pCfg.color + "22" : pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.color}33`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{task.priority}</span>
        ) : <div style={{ width: 40 }} />}

        {/* Status */}
        <select value={task.status} onChange={e => updateTaskStatus(task, e.target.value as Status)}
          style={{ background: darkMode ? sCfg.color + "22" : sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.color}33`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "none", fontFamily: "var(--font-geist-sans)", flexShrink: 0 }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    );
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "24px 24px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} select{appearance:none!important;-webkit-appearance:none!important}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <span style={{ fontSize: 22, fontWeight: 900, ...gradientText(grad) }}>Moja práca</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Stats */}
          {totalOverdue > 0 && (
            <div style={{ background: "#fee2e2", border: "1px solid #ef444433", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {totalOverdue} po termíne
            </div>
          )}
          <div style={{ background: darkMode ? "#16a34a22" : "#dcfce7", border: "1px solid #16a34a33", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#16a34a" }}>
            {totalDone}/{filtered.length} hotovo
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", flex: "1 1 160px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadaj úlohu..." style={{ border: "none", background: "transparent", outline: "none", color: theme.text, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-geist-sans)", width: "100%" }} />
        </div>

        {/* Status filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} style={{ background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "var(--font-geist-sans)" }}>
          <option value="Všetky">Všetky statusy</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Priority filter */}
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as FilterPriority)} style={{ background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "var(--font-geist-sans)" }}>
          <option value="Všetky">Všetky priority</option>
          <option value="Vysoká">Vysoká</option>
          <option value="Stredná">Stredná</option>
          <option value="Nízka">Nízka</option>
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} style={{ background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "var(--font-geist-sans)" }}>
          <option value="dueDate">Podľa termínu</option>
          <option value="priority">Podľa priority</option>
          <option value="status">Podľa statusu</option>
          <option value="project">Podľa projektu</option>
          <option value="name">Podľa názvu</option>
        </select>

        {/* Group by project */}
        <button onClick={() => setGroupByProject(v => !v)} style={{
          background: groupByProject ? appliedA + "18" : headerBg,
          border: `1px solid ${groupByProject ? appliedA + "55" : theme.border}`,
          borderRadius: 8, padding: "6px 10px", color: groupByProject ? appliedA : theme.muted,
          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
          display: "flex", alignItems: "center", gap: 5, transition: "all .15s",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Podľa projektu
        </button>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: appliedA }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Žiadne úlohy</div>
          <div style={{ fontSize: 13, color: theme.muted }}>
            {tasks.length === 0 ? "Vytvor projekty a pridaj úlohy" : "Žiadne úlohy nezodpovedajú filtru"}
          </div>
        </div>
      ) : groupByProject ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn .2s ease" }}>
          {groups.map(group => (
            <div key={group.projectId} style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden", boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
              {/* Project header */}
              <div onClick={() => router.push(`/project/${group.projectId}`)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                background: `linear-gradient(135deg, ${group.color1}18, ${group.color2}10)`,
                borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: `linear-gradient(135deg, ${group.color1}, ${group.color2})` }} />
                <span style={{ fontWeight: 800, fontSize: 13 }}>{group.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: theme.muted, fontWeight: 600 }}>{group.tasks.length} úloh</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </div>
              {group.tasks.map(task => <TaskRow key={task.id + task.projectId} task={task} />)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden", boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.04)", animation: "fadeIn .2s ease" }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto auto", gap: 12, padding: "8px 16px", background: headerBg, borderBottom: `1px solid ${theme.border}`, fontSize: 10, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>
            <div />
            <div>Úloha</div>
            <div>Termín</div>
            <div>Priorita</div>
            <div>Status</div>
          </div>
          {filtered.map(task => <TaskRow key={task.id + task.projectId} task={task} />)}
        </div>
      )}
    </div>
  );
}