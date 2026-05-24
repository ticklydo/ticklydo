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

type Task = {
  id: string;
  name: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  owner: string;
  notes: string;
};

const STATUS_CONFIG: Record<Status, { color: string; bg: string; emoji: string }> = {
  "Hotovo":    { color: "#16a34a", bg: "#dcfce7", emoji: "✅" },
  "V procese": { color: "#d97706", bg: "#fef3c7", emoji: "🔄" },
  "Uviaznuté": { color: "#dc2626", bg: "#fee2e2", emoji: "🚧" },
  "Nezačaté":  { color: "#6b7280", bg: "#f3f4f6", emoji: "⭕" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  "Vysoká":  { color: "#dc2626", bg: "#fee2e2", emoji: "🔴" },
  "Stredná": { color: "#d97706", bg: "#fef3c7", emoji: "🟡" },
  "Nízka":   { color: "#2563eb", bg: "#dbeafe", emoji: "🔵" },
  "":        { color: "#9ca3af", bg: "transparent", emoji: "" },
};

const STATUSES: Status[] = ["Nezačaté", "V procese", "Hotovo", "Uviaznuté"];
const PRIORITIES: Priority[] = ["", "Vysoká", "Stredná", "Nízka"];

const PASTEL_BIGS = ["#f0e6ff", "#e6f4ff", "#fff3e6", "#e6fff4", "#ffe6f0", "#f0ffe6"];

function genId() { return Math.random().toString(36).slice(2, 10); }

function formatDate(d: string) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
}

function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function ProjectBoard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("table");
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Light mode pastels that adapt
  const surface = darkMode ? theme.card : "#ffffff";
  const surfaceAlt = darkMode ? theme.card2 : "#fafafa";
  const cardShadow = darkMode ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.07)";
  const pillBg = (config: { bg: string }) => darkMode ? config.bg.replace("ff", "22") : config.bg;

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "projects", `${user.uid}_${projectId}`));
      if (snap.exists()) setTasks(snap.data().tasks ?? []);
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

  function updateTask(id: string, field: keyof Task, value: string) {
    const updated = tasks.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTasks(updated);
    saveTasks(updated);
  }

  function addTask() {
    if (!newTaskName.trim()) return;
    const t: Task = { id: genId(), name: newTaskName.trim(), status: "Nezačaté", priority: "", dueDate: "", owner: "", notes: "" };
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

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ color: theme.muted, fontSize: 13, fontWeight: 600 }}>Načítavam...</div>
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: theme.bg,
      color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .task-row:hover { background: ${surfaceAlt} !important; }
        .add-task-btn:hover { background: ${surfaceAlt} !important; }
        select option { background: ${theme.card}; color: ${theme.text}; }
        @media (max-width: 640px) {
          .board-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .view-switcher { width: 100% !important; }
          .new-task-btn { width: 100% !important; justify-content: center !important; }
          .stats-row { gap: 8px !important; }
          .stat-card { padding: 8px 12px !important; }
          .table-grid { grid-template-columns: 1fr 110px 90px 36px !important; }
          .table-header-priority, .table-header-date, .col-priority, .col-date { display: none !important; }
          .table-header-owner, .col-owner { display: none !important; }
          .kanban-wrap { gap: 12px !important; }
          .kanban-col { min-width: 240px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: "20px 20px 0",
        background: darkMode ? theme.card : "#fff",
        borderBottom: `1px solid ${theme.border}`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div className="board-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingBottom: 16 }}>
          {/* Back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <button onClick={() => router.push("/home")} style={{
              width: 34, height: 34, borderRadius: 10,
              background: surfaceAlt, border: `1px solid ${theme.border}`,
              color: theme.muted, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>←</button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projectName}
              </div>
              <div style={{ fontSize: 12, color: theme.muted, fontWeight: 500, marginTop: 1 }}>
                {tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* View switcher */}
            <div className="view-switcher" style={{
              display: "flex", background: surfaceAlt,
              border: `1px solid ${theme.border}`, borderRadius: 12, padding: 3,
            }}>
              {([{ id: "table", label: "📋", full: "Tabuľka" }, { id: "kanban", label: "🗂", full: "Kanban" }] as { id: View; label: string; full: string }[]).map(v => (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  padding: "6px 14px", borderRadius: 9, border: "none",
                  background: view === v.id ? grad : "transparent",
                  color: view === v.id ? "#fff" : theme.muted,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  fontFamily: "var(--font-geist-sans)", transition: "all .2s",
                  whiteSpace: "nowrap",
                }}>{v.label} <span style={{ display: "none" }}>{v.full}</span></button>
              ))}
            </div>

            <button className="new-task-btn" onClick={() => setAddingTask(true)} style={{
              background: grad, border: "none", borderRadius: 12,
              padding: "8px 16px", color: "#fff", fontWeight: 800,
              fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
              boxShadow: `0 4px 14px ${appliedA}55`,
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nová úloha
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 16, overflowX: "auto" }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = tasks.filter(t => t.status === s).length;
            return (
              <div className="stat-card" key={s} style={{
                background: darkMode ? cfg.bg + "18" : cfg.bg,
                border: `1px solid ${cfg.color}33`,
                borderRadius: 12, padding: "8px 14px",
                display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{s}</span>
                <span style={{
                  fontSize: 15, fontWeight: 900, color: cfg.color,
                  background: cfg.color + "22", borderRadius: 20,
                  padding: "0 8px", minWidth: 24, textAlign: "center",
                }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "20px" }}>

        {/* TABLE VIEW */}
        {view === "table" && (
          <div style={{
            background: surface,
            borderRadius: 18,
            border: `1px solid ${theme.border}`,
            boxShadow: cardShadow,
            overflow: "hidden",
            animation: "fadeIn .3s ease",
          }}>
            {/* Table header */}
            <div className="table-grid" style={{
              display: "grid",
              gridTemplateColumns: "2fr 130px 110px 140px 150px 36px",
              padding: "10px 16px",
              background: surfaceAlt,
              borderBottom: `1px solid ${theme.border}`,
              fontSize: 11, fontWeight: 800, color: theme.muted,
              textTransform: "uppercase", letterSpacing: "1px",
            }}>
              <div>Úloha</div>
              <div>Status</div>
              <div className="table-header-priority">Priorita</div>
              <div className="table-header-date">Termín</div>
              <div className="table-header-owner">👤 Zodpovedný</div>
              <div></div>
            </div>

            {tasks.length === 0 && !addingTask && (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 6 }}>Žiadne úlohy</div>
                <div style={{ fontSize: 13, color: theme.muted }}>Klikni na "+ Nová úloha" a začni organizovať</div>
              </div>
            )}

            {tasks.map((task, idx) => {
              const statusCfg = STATUS_CONFIG[task.status];
              const prioCfg = PRIORITY_CONFIG[task.priority];
              const overdue = isOverdue(task.dueDate);
              const isExpanded = expandedId === task.id;

              return (
                <React.Fragment key={task.id}>
                  <div className="task-row" style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 130px 110px 140px 150px 36px",
                    padding: "12px 16px",
                    borderBottom: isExpanded ? "none" : `1px solid ${theme.border}`,
                    alignItems: "center",
                    background: isExpanded ? (darkMode ? appliedA + "11" : appliedA + "08") : "transparent",
                    transition: "background .15s",
                    animation: `fadeIn .25s ease ${idx * 0.04}s both`,
                  }}>
                    {/* Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : task.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: isExpanded ? appliedA : theme.muted,
                        fontSize: 10, padding: "2px 4px", flexShrink: 0,
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform .2s, color .2s",
                      }}>▶</button>

                      {/* Status dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: statusCfg.color, flexShrink: 0,
                      }} />

                      {editingCell?.id === task.id && editingCell.field === "name" ? (
                        <input autoFocus defaultValue={task.name}
                          onBlur={e => { updateTask(task.id, "name", e.target.value); setEditingCell(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "name", e.currentTarget.value); setEditingCell(null); } }}
                          style={{
                            flex: 1, background: theme.card2, border: `2px solid ${appliedA}`,
                            borderRadius: 8, padding: "5px 10px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                            fontSize: 14, outline: "none",
                          }}
                        />
                      ) : (
                        <div onClick={() => setEditingCell({ id: task.id, field: "name" })}
                          style={{
                            fontWeight: 600, fontSize: 14, cursor: "text", flex: 1,
                            textDecoration: task.status === "Hotovo" ? "line-through" : "none",
                            opacity: task.status === "Hotovo" ? 0.6 : 1,
                          }}>
                          {task.name}
                        </div>
                      )}
                    </div>

                    {/* Status pill */}
                    <div>
                      <select value={task.status} onChange={e => updateTask(task.id, "status", e.target.value)} style={{
                        background: pillBg(statusCfg),
                        border: `1.5px solid ${statusCfg.color}44`,
                        borderRadius: 20, padding: "4px 10px",
                        color: statusCfg.color,
                        fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                        fontSize: 12, cursor: "pointer", outline: "none",
                        appearance: "none", textAlign: "center",
                      }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Priority */}
                    <div className="col-priority">
                      <select value={task.priority} onChange={e => updateTask(task.id, "priority", e.target.value)} style={{
                        background: task.priority ? pillBg(prioCfg) : surfaceAlt,
                        border: `1.5px solid ${task.priority ? prioCfg.color + "44" : theme.border}`,
                        borderRadius: 20, padding: "4px 10px",
                        color: task.priority ? prioCfg.color : theme.muted,
                        fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                        fontSize: 12, cursor: "pointer", outline: "none",
                        appearance: "none", textAlign: "center",
                      }}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p || "—"}</option>)}
                      </select>
                    </div>

                    {/* Due date */}
                    <div className="col-date">
                      <label style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: overdue && task.dueDate ? "#fee2e2" : surfaceAlt,
                        border: `1.5px solid ${overdue && task.dueDate ? "#dc262644" : theme.border}`,
                        borderRadius: 20, padding: "4px 10px", cursor: "pointer",
                        color: overdue && task.dueDate ? "#dc2626" : theme.muted,
                        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        <span>{task.dueDate ? "📅" : "📅"}</span>
                        <span>{task.dueDate ? formatDate(task.dueDate) : "Pridaj"}</span>
                        <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, "dueDate", e.target.value)}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
                      </label>
                      <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, "dueDate", e.target.value)}
                        style={{
                          position: "absolute", opacity: 0, pointerEvents: "none",
                        }} />
                    </div>

                    {/* Owner */}
                    <div className="col-owner">
                      {editingCell?.id === task.id && editingCell.field === "owner" ? (
                        <input autoFocus defaultValue={task.owner} placeholder="Meno..."
                          onBlur={e => { updateTask(task.id, "owner", e.target.value); setEditingCell(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "owner", e.currentTarget.value); setEditingCell(null); } }}
                          style={{
                            background: theme.card2, border: `2px solid ${appliedA}`,
                            borderRadius: 20, padding: "4px 12px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                            fontSize: 13, outline: "none", width: "100%",
                          }}
                        />
                      ) : (
                        <div onClick={() => setEditingCell({ id: task.id, field: "owner" })}
                          style={{
                            display: "flex", alignItems: "center", gap: 7,
                            cursor: "pointer", padding: "4px 8px", borderRadius: 20,
                            border: `1.5px solid transparent`, transition: "border-color .15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = theme.border}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                        >
                          {task.owner ? (
                            <>
                              <div style={{
                                width: 24, height: 24, borderRadius: "50%",
                                background: grad, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800, flexShrink: 0,
                              }}>{task.owner[0].toUpperCase()}</div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{task.owner}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>+ Pridať</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button onClick={() => deleteTask(task.id)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: theme.muted, fontSize: 14, width: 28, height: 28,
                      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background .15s, color .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}
                    >✕</button>
                  </div>

                  {/* Expanded notes */}
                  {isExpanded && (
                    <div style={{
                      padding: "14px 20px 18px 52px",
                      borderBottom: `1px solid ${theme.border}`,
                      background: darkMode ? appliedA + "08" : appliedA + "05",
                      animation: "fadeIn .2s ease",
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 800, color: appliedA,
                        textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8,
                      }}>📝 Poznámky</div>
                      <textarea
                        value={task.notes}
                        onChange={e => updateTask(task.id, "notes", e.target.value)}
                        placeholder="Pridaj poznámky, detaily, links..."
                        rows={3}
                        style={{
                          background: surface, border: `1.5px solid ${theme.border}`,
                          borderRadius: 12, padding: "10px 14px", color: theme.text,
                          fontFamily: "var(--font-geist-sans)", fontWeight: 500,
                          fontSize: 13, outline: "none", resize: "vertical",
                          width: "100%", maxWidth: 560, lineHeight: 1.7,
                          transition: "border-color .15s",
                          boxSizing: "border-box",
                        }}
                        onFocus={e => e.target.style.borderColor = appliedA}
                        onBlur={e => e.target.style.borderColor = theme.border}
                      />
                      <div style={{
                        marginTop: 8, fontSize: 12, color: theme.muted,
                        display: "flex", alignItems: "center", gap: 6,
                        background: surfaceAlt, borderRadius: 10, padding: "6px 12px",
                        width: "fit-content", border: `1px solid ${theme.border}`,
                      }}>
                        📎 <span>Prílohy prídu s Firebase Storage (Blaze plán)</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add task row */}
            {addingTask && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderBottom: `1px solid ${theme.border}`,
                animation: "fadeIn .2s ease",
              }}>
                <input autoFocus value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
                  placeholder="Názov novej úlohy..."
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); } }}
                  style={{
                    flex: 1, background: surfaceAlt, border: `2px solid ${appliedA}`,
                    borderRadius: 12, padding: "9px 14px", color: theme.text,
                    fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 14, outline: "none",
                  }}
                />
                <button onClick={addTask} style={{
                  background: grad, border: "none", borderRadius: 12,
                  padding: "9px 18px", color: "#fff", fontWeight: 800,
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                  boxShadow: `0 4px 12px ${appliedA}44`,
                }}>Pridať</button>
                <button onClick={() => { setAddingTask(false); setNewTaskName(""); }} style={{
                  background: "none", border: `1.5px solid ${theme.border}`, borderRadius: 12,
                  padding: "9px 14px", color: theme.muted, fontWeight: 700,
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}>Zrušiť</button>
              </div>
            )}

            {!addingTask && (
              <div className="add-task-btn" onClick={() => setAddingTask(true)} style={{
                padding: "13px 16px", color: theme.muted, fontSize: 13,
                fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "background .15s", background: "transparent",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: grad, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900,
                }}>+</span>
                Pridať úlohu
              </div>
            )}
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === "kanban" && (
          <div className="kanban-wrap" style={{
            display: "flex", gap: 16, overflowX: "auto",
            paddingBottom: 16, animation: "fadeIn .3s ease",
          }}>
            {STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const col = tasks.filter(t => t.status === status);
              return (
                <div className="kanban-col" key={status} style={{
                  minWidth: 270, maxWidth: 300, flex: "0 0 270px",
                  background: surface, border: `1px solid ${theme.border}`,
                  borderRadius: 18, display: "flex", flexDirection: "column",
                  overflow: "hidden", boxShadow: cardShadow,
                }}>
                  {/* Column header */}
                  <div style={{
                    padding: "14px 16px",
                    background: darkMode ? cfg.bg + "18" : cfg.bg,
                    borderBottom: `2px solid ${cfg.color}44`,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: cfg.color }}>{status}</span>
                    <span style={{
                      marginLeft: "auto", background: cfg.color + "22",
                      color: cfg.color, borderRadius: 20,
                      padding: "2px 10px", fontSize: 12, fontWeight: 800,
                    }}>{col.length}</span>
                  </div>

                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    {col.map((task, idx) => {
                      const prioCfg = PRIORITY_CONFIG[task.priority];
                      const overdue = isOverdue(task.dueDate);
                      return (
                        <div key={task.id} style={{
                          background: surfaceAlt, border: `1.5px solid ${theme.border}`,
                          borderRadius: 14, padding: "13px 14px",
                          display: "flex", flexDirection: "column", gap: 9,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                          animation: `fadeIn .2s ease ${idx * 0.05}s both`,
                          transition: "transform .15s, box-shadow .15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${appliedA}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{task.name}</div>

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {task.priority && (
                              <span style={{
                                background: darkMode ? prioCfg.bg + "22" : prioCfg.bg,
                                color: prioCfg.color, border: `1px solid ${prioCfg.color}33`,
                                borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                              }}>{prioCfg.emoji} {task.priority}</span>
                            )}
                            {task.dueDate && (
                              <span style={{
                                background: overdue ? "#fee2e2" : surfaceAlt,
                                color: overdue ? "#dc2626" : theme.muted,
                                border: `1px solid ${overdue ? "#dc262633" : theme.border}`,
                                borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                              }}>📅 {formatDate(task.dueDate)}</span>
                            )}
                          </div>

                          {task.owner && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: "50%", background: grad,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, color: "#fff", fontWeight: 800,
                              }}>{task.owner[0].toUpperCase()}</div>
                              <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>{task.owner}</span>
                            </div>
                          )}

                          {task.notes && (
                            <div style={{
                              fontSize: 12, color: theme.muted, lineHeight: 1.5,
                              borderTop: `1px solid ${theme.border}`, paddingTop: 8, fontStyle: "italic",
                            }}>
                              {task.notes.length > 70 ? task.notes.slice(0, 70) + "…" : task.notes}
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            <select value={task.status} onChange={e => updateTask(task.id, "status", e.target.value)} style={{
                              flex: 1, background: surface, border: `1.5px solid ${theme.border}`,
                              borderRadius: 10, padding: "5px 8px", color: theme.text,
                              fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                              fontSize: 12, cursor: "pointer", outline: "none",
                            }}>
                              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {s}</option>)}
                            </select>
                            <button onClick={() => deleteTask(task.id)} style={{
                              background: "none", border: `1.5px solid ${theme.border}`,
                              borderRadius: 10, padding: "5px 10px", color: theme.muted,
                              cursor: "pointer", fontSize: 12, transition: "all .15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#dc262644"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = theme.muted; e.currentTarget.style.borderColor = theme.border; }}
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add in kanban */}
                    <button onClick={() => {
                      const name = prompt("Názov úlohy:");
                      if (!name?.trim()) return;
                      const t: Task = { id: genId(), name: name.trim(), status, priority: "", dueDate: "", owner: "", notes: "" };
                      const updated = [...tasks, t];
                      setTasks(updated);
                      saveTasks(updated);
                    }} style={{
                      background: "none", border: `1.5px dashed ${theme.border}`,
                      borderRadius: 12, padding: "10px", color: theme.muted,
                      cursor: "pointer", fontSize: 13, fontWeight: 700,
                      width: "100%", fontFamily: "var(--font-geist-sans)",
                      transition: "all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = appliedA; e.currentTarget.style.color = appliedA; e.currentTarget.style.background = appliedA + "08"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "none"; }}
                    >+ Pridať úlohu</button>
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