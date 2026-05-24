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
  notes: string;
};

const STATUS_COLORS: Record<Status, string> = {
  "Hotovo":    "#22c55e",
  "V procese": "#f59e0b",
  "Uviaznuté": "#ef4444",
  "Nezačaté":  "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Vysoká":  "#ef4444",
  "Stredná": "#f59e0b",
  "Nízka":   "#3b82f6",
  "":        "transparent",
};

const STATUSES: Status[] = ["Nezačaté", "V procese", "Hotovo", "Uviaznuté"];
const PRIORITIES: Priority[] = ["", "Vysoká", "Stredná", "Nízka"];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ProjectBoard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("table");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Load tasks from Firebase
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "projects", `${user.uid}_${projectId}`));
      if (snap.exists()) {
        setTasks(snap.data().tasks ?? []);
      }
      setLoading(false);
    };
    load();
  }, [projectId]);

  // Save tasks to Firebase
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
    const t: Task = {
      id: genId(),
      name: newTaskName.trim(),
      status: "Nezačaté",
      priority: "",
      dueDate: "",
      notes: "",
    };
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

  const gradientText = {
    backgroundImage: grad,
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
    backgroundClip: "text" as const,
  };

  if (loading) return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: theme.bg, color: theme.muted, fontFamily: "var(--font-geist-sans)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: `3px solid ${theme.border}`, borderTopColor: appliedA,
          animation: "spin .8s linear infinite", margin: "0 auto 12px",
        }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        Načítavam...
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "24px 28px 60px",
      display: "flex", flexDirection: "column", gap: 20,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s",
    }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/home")} style={{
          background: "none", border: "none", color: theme.muted,
          cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1,
        }}>←</button>
        <div style={{ fontSize: 22, fontWeight: 900, ...gradientText }}>{projectName}</div>
        <div style={{ flex: 1 }} />

        {/* View switcher */}
        <div style={{
          display: "flex", gap: 4,
          background: theme.card2, borderRadius: 12, padding: 4,
          border: `1px solid ${theme.border}`,
        }}>
          {([
            { id: "table", label: "📋 Tabuľka" },
            { id: "kanban", label: "🗂 Kanban" },
          ] as { id: View; label: string }[]).map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "6px 14px", borderRadius: 9, border: "none",
              background: view === v.id ? grad : "transparent",
              color: view === v.id ? "#fff" : theme.muted,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "var(--font-geist-sans)", transition: "all .2s",
            }}>{v.label}</button>
          ))}
        </div>

        {/* Add task button */}
        <button onClick={() => setAddingTask(true)} style={{
          background: grad, border: "none", borderRadius: 12,
          padding: "8px 18px", color: "#fff", fontWeight: 800,
          fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
          boxShadow: `0 4px 14px ${appliedA}44`,
        }}>+ Nová úloha</button>
      </div>

      {/* STATS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {STATUSES.map(s => {
          const count = tasks.filter(t => t.status === s).length;
          return (
            <div key={s} style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[s] }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>{s}</span>
              <span style={{ fontSize: 16, fontWeight: 900 }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 130px 110px 130px 36px",
            padding: "10px 16px", borderBottom: `1px solid ${theme.border}`,
            fontSize: 11, fontWeight: 800, color: theme.muted,
            textTransform: "uppercase", letterSpacing: "0.8px",
            background: theme.card2,
          }}>
            <div>Úloha</div>
            <div>Status</div>
            <div>Priorita</div>
            <div>Termín</div>
            <div></div>
          </div>

          {/* Tasks */}
          {tasks.length === 0 && !addingTask && (
            <div style={{
              padding: "40px 16px", textAlign: "center",
              color: theme.muted, fontSize: 14, fontWeight: 600,
            }}>
              Žiadne úlohy. Klikni na "+ Nová úloha" a začni.
            </div>
          )}

          {tasks.map(task => (
            <div key={task.id} style={{
              display: "grid", gridTemplateColumns: "1fr 130px 110px 130px 36px",
              padding: "12px 16px", borderBottom: `1px solid ${theme.border}`,
              alignItems: "center", transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = theme.card2)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Name */}
              <div>
                {editingId === task.id && editingField === "name" ? (
                  <input
                    autoFocus
                    defaultValue={task.name}
                    onBlur={e => { updateTask(task.id, "name", e.target.value); setEditingId(null); setEditingField(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "name", e.currentTarget.value); setEditingId(null); setEditingField(null); }}}
                    style={{
                      background: theme.card2, border: `1px solid ${appliedA}`,
                      borderRadius: 8, padding: "4px 10px", color: theme.text,
                      fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                      fontSize: 14, outline: "none", width: "90%",
                    }}
                  />
                ) : (
                  <div onClick={() => { setEditingId(task.id); setEditingField("name"); }}
                    style={{ fontWeight: 700, fontSize: 14, cursor: "text" }}>
                    {task.name}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <select value={task.status}
                  onChange={e => updateTask(task.id, "status", e.target.value)}
                  style={{
                    background: STATUS_COLORS[task.status] + "22",
                    border: `1px solid ${STATUS_COLORS[task.status]}55`,
                    borderRadius: 8, padding: "4px 8px",
                    color: STATUS_COLORS[task.status],
                    fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                    fontSize: 12, cursor: "pointer", outline: "none",
                  }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <select value={task.priority}
                  onChange={e => updateTask(task.id, "priority", e.target.value)}
                  style={{
                    background: task.priority ? PRIORITY_COLORS[task.priority] + "22" : theme.card2,
                    border: `1px solid ${task.priority ? PRIORITY_COLORS[task.priority] + "55" : theme.border}`,
                    borderRadius: 8, padding: "4px 8px",
                    color: task.priority ? PRIORITY_COLORS[task.priority] : theme.muted,
                    fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                    fontSize: 12, cursor: "pointer", outline: "none",
                  }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p || "—"}</option>)}
                </select>
              </div>

              {/* Due date */}
              <div>
                <input type="date" value={task.dueDate}
                  onChange={e => updateTask(task.id, "dueDate", e.target.value)}
                  style={{
                    background: theme.card2, border: `1px solid ${theme.border}`,
                    borderRadius: 8, padding: "4px 8px", color: theme.text,
                    fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                    fontSize: 12, cursor: "pointer", outline: "none",
                  }}
                />
              </div>

              {/* Delete */}
              <button onClick={() => deleteTask(task.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: theme.muted, fontSize: 16, padding: 4,
                borderRadius: 6, transition: "color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
              onMouseLeave={e => e.currentTarget.style.color = theme.muted}
              >✕</button>
            </div>
          ))}

          {/* Add task row */}
          {addingTask && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderBottom: `1px solid ${theme.border}`,
            }}>
              <input
                autoFocus
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                placeholder="Názov úlohy..."
                onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); }}}
                style={{
                  flex: 1, background: theme.card2, border: `1px solid ${appliedA}`,
                  borderRadius: 8, padding: "8px 12px", color: theme.text,
                  fontFamily: "var(--font-geist-sans)", fontWeight: 700,
                  fontSize: 14, outline: "none",
                }}
              />
              <button onClick={addTask} style={{
                background: grad, border: "none", borderRadius: 8,
                padding: "8px 16px", color: "#fff", fontWeight: 800,
                fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
              }}>Pridať</button>
              <button onClick={() => { setAddingTask(false); setNewTaskName(""); }} style={{
                background: "none", border: `1px solid ${theme.border}`, borderRadius: 8,
                padding: "8px 12px", color: theme.muted, fontWeight: 700,
                fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
              }}>Zrušiť</button>
            </div>
          )}

          {/* Footer add */}
          {!addingTask && (
            <div onClick={() => setAddingTask(true)} style={{
              padding: "12px 16px", color: theme.muted, fontSize: 13,
              fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = theme.card2)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 18, color: appliedA }}>+</span> Pridať úlohu
            </div>
          )}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {STATUSES.map(status => {
            const col = tasks.filter(t => t.status === status);
            return (
              <div key={status} style={{
                minWidth: 260, background: theme.card,
                border: `1px solid ${theme.border}`, borderRadius: 16,
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                {/* Column header */}
                <div style={{
                  padding: "12px 16px", display: "flex", alignItems: "center", gap: 8,
                  borderBottom: `2px solid ${STATUS_COLORS[status]}`,
                  background: STATUS_COLORS[status] + "18",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[status] }} />
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{status}</span>
                  <span style={{
                    marginLeft: "auto", background: STATUS_COLORS[status] + "33",
                    color: STATUS_COLORS[status], borderRadius: 20,
                    padding: "2px 8px", fontSize: 11, fontWeight: 800,
                  }}>{col.length}</span>
                </div>

                {/* Cards */}
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {col.map(task => (
                    <div key={task.id} style={{
                      background: theme.card2, border: `1px solid ${theme.border}`,
                      borderRadius: 12, padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{task.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {task.priority && (
                          <span style={{
                            background: PRIORITY_COLORS[task.priority] + "22",
                            color: PRIORITY_COLORS[task.priority],
                            border: `1px solid ${PRIORITY_COLORS[task.priority]}44`,
                            borderRadius: 6, padding: "2px 8px",
                            fontSize: 11, fontWeight: 700,
                          }}>{task.priority}</span>
                        )}
                        {task.dueDate && (
                          <span style={{
                            background: theme.card, border: `1px solid ${theme.border}`,
                            borderRadius: 6, padding: "2px 8px",
                            fontSize: 11, fontWeight: 600, color: theme.muted,
                          }}>📅 {task.dueDate}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select value={task.status}
                          onChange={e => updateTask(task.id, "status", e.target.value)}
                          style={{
                            flex: 1, background: theme.card, border: `1px solid ${theme.border}`,
                            borderRadius: 8, padding: "4px 8px", color: theme.text,
                            fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                            fontSize: 11, cursor: "pointer", outline: "none",
                          }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => deleteTask(task.id)} style={{
                          background: "none", border: `1px solid ${theme.border}`,
                          borderRadius: 8, padding: "4px 8px", color: theme.muted,
                          cursor: "pointer", fontSize: 12, transition: "color .15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                        onMouseLeave={e => e.currentTarget.style.color = theme.muted}
                        >✕</button>
                      </div>
                    </div>
                  ))}

                  {/* Add in kanban */}
                  <button onClick={() => {
                    const name = prompt("Názov úlohy:");
                    if (!name?.trim()) return;
                    const t: Task = { id: genId(), name: name.trim(), status, priority: "", dueDate: "", notes: "" };
                    const updated = [...tasks, t];
                    setTasks(updated);
                    saveTasks(updated);
                  }} style={{
                    background: "none", border: `1px dashed ${theme.border}`,
                    borderRadius: 10, padding: "8px", color: theme.muted,
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                    width: "100%", transition: "border-color .15s",
                    fontFamily: "var(--font-geist-sans)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = appliedA}
                  onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                  >+ Pridať</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}