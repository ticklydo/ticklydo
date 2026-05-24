"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { getAuth } from "firebase/auth";
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
type View = "table" | "kanban";

type SubTask = { id: string; name: string; done: boolean };

type Task = {
  id: string;
  name: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  owner: string;
  notes: string;
  subtasks: SubTask[];
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
const PRIORITIES: Priority[] = ["", "Vysoká", "Stredná", "Nízka"];

function genId() { return Math.random().toString(36).slice(2, 10); }
function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
}
function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

// SVG Icons
const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  table: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
  kanban: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  close: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  user: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  notes: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="13" y1="17" x2="8" y2="17"/></svg>,
  subtask: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

export default function ProjectBoard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const { grad, theme, appliedA, darkMode } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("table");
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [newSubtask, setNewSubtask] = useState<{ [key: string]: string }>({});

  const surface = darkMode ? theme.card : "#ffffff";
  const surfaceHover = darkMode ? theme.card2 : "#f9fafb";
  const headerBg = darkMode ? theme.card2 : "#f8f9fb";
  const shadow = darkMode ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)";

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "projects", `${user.uid}_${projectId}`));
      if (snap.exists()) {
        const data = snap.data().tasks ?? [];
        setTasks(data.map((t: Task) => ({ ...t, subtasks: t.subtasks ?? [] })));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const saveTasks = async (newTasks: Task[]) => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "projects", `${user.uid}_${projectId}`), { tasks: newTasks }, { merge: true });
  };

  function updateTask(id: string, field: keyof Task, value: any) {
    const updated = tasks.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTasks(updated);
    saveTasks(updated);
  }

  function addTask() {
    if (!newTaskName.trim()) return;
    const t: Task = { id: genId(), name: newTaskName.trim(), status: "Nezačaté", priority: "", dueDate: "", owner: "", notes: "", subtasks: [] };
    const updated = [...tasks, t];
    setTasks(updated);
    saveTasks(updated);
    setNewTaskName("");
    setAddingTask(false);
  }

  function deleteTask(id: string) {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  }

  function addSubtask(taskId: string) {
    const name = newSubtask[taskId]?.trim();
    if (!name) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub: SubTask = { id: genId(), name, done: false };
    const subtasks = [...(task.subtasks ?? []), sub];
    updateTask(taskId, "subtasks", subtasks);
    setNewSubtask(prev => ({ ...prev, [taskId]: "" }));
  }

  function toggleSubtask(taskId: string, subId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
    updateTask(taskId, "subtasks", subtasks);
  }

  function deleteSubtask(taskId: string, subId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, "subtasks", task.subtasks.filter(s => s.id !== subId));
  }

  const pillStyle = (color: string, bg: string) => ({
    background: darkMode ? color + "22" : bg,
    color,
    border: `1px solid ${color}33`,
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-geist-sans)",
    cursor: "pointer",
    outline: "none",
    appearance: "none" as const,
    display: "inline-block",
  });

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)", minHeight: "100vh", transition: "background .3s, color .3s" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .task-row:hover .row-actions { opacity: 1 !important; }
        select { appearance: none !important; -webkit-appearance: none !important; }
      `}</style>

      {/* STICKY HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: surface,
        borderBottom: `1px solid ${theme.border}`,
        padding: "16px 24px 0",
        boxShadow: "0 1px 0 " + theme.border,
      }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => router.push("/home")} style={{
            width: 32, height: 32, borderRadius: 8,
            background: "transparent", border: `1px solid ${theme.border}`,
            color: theme.muted, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = surfaceHover; e.currentTarget.style.color = theme.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}
          >{Icons.back}</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 1 }}>
              {tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených
            </div>
          </div>

          {/* View switcher */}
          <div style={{ display: "flex", background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {([{ id: "table", icon: Icons.table, label: "Tabuľka" }, { id: "kanban", icon: Icons.kanban, label: "Kanban" }] as { id: View; icon: React.ReactElement; label: string }[]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 7, border: "none",
                background: view === v.id ? grad : "transparent",
                color: view === v.id ? "#fff" : theme.muted,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: "var(--font-geist-sans)", transition: "all .2s",
              }}>{v.icon}<span>{v.label}</span></button>
            ))}
          </div>

          <button onClick={() => setAddingTask(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: grad, border: "none", borderRadius: 10,
            padding: "8px 16px", color: "#fff", fontWeight: 700,
            fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
            boxShadow: `0 4px 12px ${appliedA}44`, whiteSpace: "nowrap",
          }}>{Icons.plus} Nová úloha</button>
        </div>

        {/* Status bar */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 14, overflowX: "auto" }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = tasks.filter(t => t.status === s).length;
            return (
              <div key={s} style={{
                display: "flex", alignItems: "center", gap: 7,
                background: darkMode ? cfg.bg + "18" : cfg.bg,
                border: `1px solid ${cfg.color}30`,
                borderRadius: 8, padding: "6px 12px", flexShrink: 0,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{s}</span>
                <span style={{
                  fontSize: 12, fontWeight: 800, color: cfg.color,
                  background: cfg.color + "20", borderRadius: 12,
                  padding: "0 7px", minWidth: 20, textAlign: "center",
                }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: "20px 24px 60px" }}>

        {/* TABLE VIEW */}
        {view === "table" && (
          <div style={{ background: surface, borderRadius: 16, border: `1px solid ${theme.border}`, boxShadow: shadow, overflow: "hidden", animation: "fadeIn .25s ease" }}>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 100px 120px 140px 120px 40px",
              padding: "9px 16px",
              background: headerBg,
              borderBottom: `1px solid ${theme.border}`,
              fontSize: 11, fontWeight: 700, color: theme.muted,
              textTransform: "uppercase", letterSpacing: "0.8px",
              gap: 8,
            }}>
              <div>Úloha</div>
              <div>Status</div>
              <div>Priorita</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{Icons.calendar} Termín</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{Icons.user} Zodpovedný</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{Icons.notes} Poznámky</div>
              <div></div>
            </div>

            {tasks.length === 0 && !addingTask && (
              <div style={{ padding: "56px 20px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: appliedA }}>{Icons.subtask}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Žiadne úlohy</div>
                <div style={{ fontSize: 13, color: theme.muted }}>Klikni na "Nová úloha" a začni</div>
              </div>
            )}

            {tasks.map((task, idx) => {
              const sCfg = STATUS_CONFIG[task.status];
              const pCfg = PRIORITY_CONFIG[task.priority];
              const over = isOverdue(task.dueDate);
              const isExp = expandedId === task.id;
              const doneCount = task.subtasks.filter(s => s.done).length;

              return (
                <React.Fragment key={task.id}>
                  <div className="task-row" style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 100px 120px 140px 120px 40px",
                    padding: "10px 16px",
                    borderBottom: isExp ? "none" : `1px solid ${theme.border}`,
                    alignItems: "center",
                    gap: 8,
                    background: isExp ? (appliedA + "08") : "transparent",
                    transition: "background .15s",
                    animation: `fadeIn .2s ease ${idx * 0.03}s both`,
                    cursor: "default",
                  }}
                  onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = surfaceHover; }}
                  onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Task name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <button onClick={() => setExpandedId(isExp ? null : task.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: isExp ? appliedA : theme.muted, padding: 3, flexShrink: 0,
                        display: "flex", alignItems: "center",
                        transform: isExp ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform .2s, color .15s",
                      }}>{Icons.chevron}</button>

                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: sCfg.dot, flexShrink: 0 }} />

                      {editingCell?.id === task.id && editingCell.field === "name" ? (
                        <input autoFocus defaultValue={task.name}
                          onBlur={e => { updateTask(task.id, "name", e.target.value); setEditingCell(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "name", e.currentTarget.value); setEditingCell(null); } }}
                          style={{
                            flex: 1, background: headerBg, border: `1.5px solid ${appliedA}`,
                            borderRadius: 8, padding: "5px 10px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                            fontSize: 14, outline: "none",
                          }}
                        />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <div onClick={() => setEditingCell({ id: task.id, field: "name" })} style={{
                            fontWeight: 600, fontSize: 14, cursor: "text",
                            textDecoration: task.status === "Hotovo" ? "line-through" : "none",
                            opacity: task.status === "Hotovo" ? 0.5 : 1,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{task.name}</div>
                          {task.subtasks.length > 0 && (
                            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <div style={{ width: 36, height: 3, borderRadius: 2, background: theme.border, overflow: "hidden" }}>
                                <div style={{ width: `${(doneCount / task.subtasks.length) * 100}%`, height: "100%", background: appliedA, borderRadius: 2, transition: "width .3s" }} />
                              </div>
                              {doneCount}/{task.subtasks.length}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <select value={task.status} onChange={e => updateTask(task.id, "status", e.target.value)}
                        style={pillStyle(sCfg.color, sCfg.bg)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <select value={task.priority} onChange={e => updateTask(task.id, "priority", e.target.value)}
                        style={pillStyle(pCfg.color, pCfg.bg)}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p || "—"}</option>)}
                      </select>
                    </div>

                    {/* Due date */}
                    <div>
                      <label style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: over && task.dueDate ? (darkMode ? "#fee2e222" : "#fee2e2") : headerBg,
                        border: `1px solid ${over && task.dueDate ? "#ef444444" : theme.border}`,
                        borderRadius: 6, padding: "3px 10px", cursor: "pointer",
                        color: over && task.dueDate ? "#dc2626" : theme.muted,
                        fontSize: 12, fontWeight: 600,
                      }}>
                        <span style={{ color: over && task.dueDate ? "#dc2626" : appliedA }}>{Icons.calendar}</span>
                        {task.dueDate ? formatDate(task.dueDate) : <span style={{ color: theme.muted }}>Pridaj</span>}
                        <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, "dueDate", e.target.value)}
                          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }} />
                      </label>
                    </div>

                    {/* Owner */}
                    <div>
                      {editingCell?.id === task.id && editingCell.field === "owner" ? (
                        <input autoFocus defaultValue={task.owner} placeholder="Meno..."
                          onBlur={e => { updateTask(task.id, "owner", e.target.value); setEditingCell(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "owner", e.currentTarget.value); setEditingCell(null); } }}
                          style={{
                            background: headerBg, border: `1.5px solid ${appliedA}`,
                            borderRadius: 6, padding: "3px 10px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                            fontSize: 13, outline: "none", width: "100%",
                          }}
                        />
                      ) : (
                        <div onClick={() => setEditingCell({ id: task.id, field: "owner" })}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                            border: "1px solid transparent", transition: "border-color .15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = theme.border}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                        >
                          {task.owner ? (
                            <>
                              <div style={{
                                width: 22, height: 22, borderRadius: "50%", background: grad,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, color: "#fff", fontWeight: 800, flexShrink: 0,
                              }}>{task.owner[0].toUpperCase()}</div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{task.owner}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: theme.muted, display: "flex", alignItems: "center", gap: 4 }}>
                              {Icons.user} Pridaj
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notes inline */}
                    <div>
                      {editingCell?.id === task.id && editingCell.field === "notes" ? (
                        <input autoFocus defaultValue={task.notes} placeholder="Poznámka..."
                          onBlur={e => { updateTask(task.id, "notes", e.target.value); setEditingCell(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "notes", e.currentTarget.value); setEditingCell(null); } }}
                          style={{
                            background: headerBg, border: `1.5px solid ${appliedA}`,
                            borderRadius: 6, padding: "3px 10px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 500,
                            fontSize: 12, outline: "none", width: "100%",
                          }}
                        />
                      ) : (
                        <div onClick={() => setEditingCell({ id: task.id, field: "notes" })}
                          style={{
                            padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                            border: "1px solid transparent", transition: "border-color .15s",
                            fontSize: 12, color: task.notes ? theme.text : theme.muted,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = theme.border}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                        >
                          <span style={{ color: appliedA, flexShrink: 0 }}>{Icons.notes}</span>
                          <span>{task.notes || "Pridaj"}</span>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="row-actions" style={{ opacity: 0, transition: "opacity .15s", display: "flex", justifyContent: "center" }}>
                      <button onClick={() => deleteTask(task.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: theme.muted, width: 26, height: 26, borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background .15s, color .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}
                      >{Icons.close}</button>
                    </div>
                  </div>

                  {/* EXPANDED — Subtasks */}
                  {isExp && (
                    <div style={{
                      padding: "12px 16px 16px 52px",
                      borderBottom: `1px solid ${theme.border}`,
                      background: appliedA + "05",
                      animation: "fadeIn .2s ease",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: appliedA, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        {Icons.subtask} Podúlohy
                      </div>

                      {task.subtasks.map(sub => (
                        <div key={sub.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "6px 0", borderBottom: `1px solid ${theme.border}33`,
                        }}>
                          <button onClick={() => toggleSubtask(task.id, sub.id)} style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${sub.done ? appliedA : theme.border}`,
                            background: sub.done ? appliedA : "transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", transition: "all .15s",
                          }}>
                            {sub.done && Icons.check}
                          </button>
                          <span style={{
                            fontSize: 13, fontWeight: 500, flex: 1,
                            textDecoration: sub.done ? "line-through" : "none",
                            opacity: sub.done ? 0.5 : 1,
                          }}>{sub.name}</span>
                          <button onClick={() => deleteSubtask(task.id, sub.id)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: theme.muted, display: "flex", alignItems: "center",
                            opacity: 0.5, transition: "opacity .15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                          >{Icons.close}</button>
                        </div>
                      ))}

                      {/* Add subtask */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${theme.border}`, flexShrink: 0 }} />
                        <input
                          value={newSubtask[task.id] ?? ""}
                          onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="Pridaj podúlohu..."
                          onKeyDown={e => { if (e.key === "Enter") addSubtask(task.id); }}
                          style={{
                            flex: 1, background: "transparent", border: "none",
                            borderBottom: `1.5px solid ${theme.border}`,
                            padding: "4px 0", color: theme.text, fontSize: 13,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 500,
                            outline: "none", transition: "border-color .15s",
                          }}
                          onFocus={e => e.target.style.borderBottomColor = appliedA}
                          onBlur={e => e.target.style.borderBottomColor = theme.border}
                        />
                        <button onClick={() => addSubtask(task.id)} style={{
                          background: appliedA + "18", border: "none", borderRadius: 6,
                          padding: "4px 10px", color: appliedA, fontWeight: 700,
                          fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                        }}>Pridať</button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add task input */}
            {addingTask && (
              <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, animation: "fadeIn .2s ease" }}>
                <input autoFocus value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
                  placeholder="Názov novej úlohy..."
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); } }}
                  style={{
                    flex: 1, background: headerBg, border: `1.5px solid ${appliedA}`,
                    borderRadius: 10, padding: "8px 14px", color: theme.text,
                    fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 14, outline: "none",
                  }}
                />
                <button onClick={addTask} style={{
                  background: grad, border: "none", borderRadius: 10, padding: "8px 18px",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 12px ${appliedA}44`,
                }}>Pridať</button>
                <button onClick={() => { setAddingTask(false); setNewTaskName(""); }} style={{
                  background: "none", border: `1px solid ${theme.border}`, borderRadius: 10,
                  padding: "8px 14px", color: theme.muted, fontWeight: 600,
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}>Zrušiť</button>
              </div>
            )}

            {!addingTask && (
              <div onClick={() => setAddingTask(true)} style={{
                padding: "11px 16px", color: theme.muted, fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "background .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{Icons.plus}</div>
                Pridať úlohu
              </div>
            )}
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === "kanban" && (
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, animation: "fadeIn .25s ease" }}>
            {STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const col = tasks.filter(t => t.status === status);
              return (
                <div key={status} style={{
                  minWidth: 260, flex: "0 0 260px",
                  background: surface, border: `1px solid ${theme.border}`,
                  borderRadius: 16, display: "flex", flexDirection: "column",
                  overflow: "hidden", boxShadow: shadow,
                }}>
                  <div style={{
                    padding: "12px 14px",
                    background: darkMode ? cfg.bg + "18" : cfg.bg,
                    borderBottom: `2px solid ${cfg.color}30`,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{status}</span>
                    <span style={{
                      marginLeft: "auto", background: cfg.color + "20", color: cfg.color,
                      borderRadius: 12, padding: "1px 8px", fontSize: 12, fontWeight: 800,
                    }}>{col.length}</span>
                  </div>

                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {col.map((task, idx) => {
                      const pCfg = PRIORITY_CONFIG[task.priority];
                      const over = isOverdue(task.dueDate);
                      const doneCount = task.subtasks.filter(s => s.done).length;
                      return (
                        <div key={task.id} style={{
                          background: surfaceHover, border: `1px solid ${theme.border}`,
                          borderRadius: 12, padding: "12px 13px",
                          display: "flex", flexDirection: "column", gap: 8,
                          animation: `fadeIn .2s ease ${idx * 0.04}s both`,
                          transition: "transform .15s, box-shadow .15s",
                          cursor: "default",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 18px ${appliedA}1a`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{task.name}</div>

                          {task.subtasks.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: theme.border, overflow: "hidden" }}>
                                <div style={{ width: `${(doneCount / task.subtasks.length) * 100}%`, height: "100%", background: appliedA, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 11, color: theme.muted }}>{doneCount}/{task.subtasks.length}</span>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {task.priority && (
                              <span style={{
                                background: darkMode ? pCfg.bg + "22" : pCfg.bg,
                                color: pCfg.color, border: `1px solid ${pCfg.color}30`,
                                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                              }}>{task.priority}</span>
                            )}
                            {task.dueDate && (
                              <span style={{
                                background: over ? (darkMode ? "#fee2e222" : "#fee2e2") : headerBg,
                                color: over ? "#dc2626" : theme.muted,
                                border: `1px solid ${over ? "#ef444433" : theme.border}`,
                                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                                display: "flex", alignItems: "center", gap: 4,
                              }}>{Icons.calendar} {formatDate(task.dueDate)}</span>
                            )}
                          </div>

                          {task.owner && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: "50%", background: grad,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 9, color: "#fff", fontWeight: 800,
                              }}>{task.owner[0].toUpperCase()}</div>
                              <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>{task.owner}</span>
                            </div>
                          )}

                          {task.notes && (
                            <div style={{
                              fontSize: 12, color: theme.muted, lineHeight: 1.5,
                              borderTop: `1px solid ${theme.border}`, paddingTop: 7,
                            }}>{task.notes.length > 65 ? task.notes.slice(0, 65) + "…" : task.notes}</div>
                          )}

                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            <select value={task.status} onChange={e => updateTask(task.id, "status", e.target.value)} style={{
                              flex: 1, background: surface, border: `1px solid ${theme.border}`,
                              borderRadius: 8, padding: "4px 8px", color: theme.text,
                              fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                              fontSize: 11, cursor: "pointer", outline: "none", appearance: "none",
                            }}>
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => deleteTask(task.id)} style={{
                              background: "none", border: `1px solid ${theme.border}`,
                              borderRadius: 8, padding: "4px 8px", color: theme.muted,
                              cursor: "pointer", display: "flex", alignItems: "center",
                              transition: "all .15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = theme.muted; }}
                            >{Icons.close}</button>
                          </div>
                        </div>
                      );
                    })}

                    <button onClick={() => {
                      const name = prompt("Názov úlohy:");
                      if (!name?.trim()) return;
                      const t: Task = { id: genId(), name: name.trim(), status, priority: "", dueDate: "", owner: "", notes: "", subtasks: [] };
                      const updated = [...tasks, t];
                      setTasks(updated);
                      saveTasks(updated);
                    }} style={{
                      background: "none", border: `1.5px dashed ${theme.border}`,
                      borderRadius: 10, padding: "9px", color: theme.muted,
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      width: "100%", fontFamily: "var(--font-geist-sans)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = appliedA; e.currentTarget.style.color = appliedA; e.currentTarget.style.background = appliedA + "08"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "none"; }}
                    >{Icons.plus} Pridať</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}