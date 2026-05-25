"use client";

import React, { useState, useEffect, useRef } from "react";
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
type View = "table" | "kanban" | "calendar";

type SubTask = {
  id: string; name: string; done: boolean;
  status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string;
};

type Task = {
  id: string; name: string; status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string; subtasks: SubTask[];
};

type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  color: string;
  type: "event" | "task";
  taskId?: string; // link to task if type=task
  notes?: string;
  time?: string; // HH:MM
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
  const months = ["jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"];
  const iso = toISODate(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const day = parseInt(iso.split("-")[2], 10);
    const month = parseInt(iso.split("-")[1], 10) - 1;
    if (month >= 0 && month < 12) return `${day}. ${months[month]}`;
  }
  return d;
}

function formatDateDMY(d: string) {
  if (!d) return "";
  const iso = toISODate(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const parts = iso.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
}

function toISODate(d: string) {
  if (!d) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  // Convert DD.MM.YYYY or D.M.YYYY to YYYY-MM-DD
  if (d.includes(".")) {
    const parts = d.split(".");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const mon = parts[1].padStart(2, "0");
      const yr = parts[2].length === 4 ? parts[2] : parts[2].padStart(4, "0");
      return `${yr}-${mon}-${day}`;
    }
  }
  return d;
}
function isOverdue(d: string) {
  if (!d) return false;
  const iso = toISODate(d);
  return new Date(iso + "T00:00:00") < new Date();
}

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  table: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
  kanban: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  chevron: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  close: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  calendar: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  user: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  notes: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="13" y1="17" x2="8" y2="17"/></svg>,
  subtask: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  edit: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  pencil: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  calView: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="7" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="14" width="3" height="3" rx="0.5"/></svg>,
  navLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  navRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
};

const COLS = "1fr 110px 95px 120px 130px 110px 36px";

export default function ProjectBoard({ projectId, projectName: initialName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const { grad, theme, appliedA, darkMode } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("table");
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [projectName, setProjectName] = useState(initialName || "Projekt");
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calModal, setCalModal] = useState<{ date: string; event?: CalEvent } | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<"event" | "task">("event");
  const [quickTime, setQuickTime] = useState("");
  const [quickColor, setQuickColor] = useState("#6366f1");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; items: (CalEvent | Task)[] } | null>(null);

  const surface = darkMode ? theme.card : "#ffffff";
  const surfaceHover = darkMode ? theme.card2 : "#f9fafb";
  const headerBg = darkMode ? theme.card2 : "#f8f9fb";
  const subBg = darkMode ? appliedA + "08" : appliedA + "04";
  const shadow = darkMode ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "projects", `${user.uid}_${projectId}`));
      if (snap.exists()) {
        const data = snap.data();
        if (data.projectName) setProjectName(data.projectName);
        setTasks((data.tasks ?? []).map((t: Task) => ({
          ...t,
          subtasks: (t.subtasks ?? []).map((s: SubTask) => ({
            id: s.id, name: s.name, done: s.done ?? false,
            status: s.status ?? "Nezačaté", priority: s.priority ?? "",
            dueDate: s.dueDate ?? "", owner: s.owner ?? "", notes: s.notes ?? "",
          }))
        })));
        setEvents(data.events ?? []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const saveAll = async (newTasks: Task[], newName?: string, newEvents?: CalEvent[]) => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "projects", `${user.uid}_${projectId}`), {
      tasks: newTasks,
      projectName: newName ?? projectName,
      events: newEvents ?? events,
    }, { merge: true });
  };

  const saveEvents = async (newEvents: CalEvent[]) => {
    setEvents(newEvents);
    await saveAll(tasks, projectName, newEvents);
  };

  function saveName(name: string) {
    const trimmed = name.trim() || projectName;
    setProjectName(trimmed);
    setEditingName(false);
    saveAll(tasks, trimmed);
    // Also update project name in users collection
    const user = auth.currentUser;
    if (!user) return;
    import("firebase/firestore").then(({ getFirestore, doc, getDoc, setDoc }) => {
      const db = getFirestore();
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (!snap.exists()) return;
        const projects = snap.data().projects ?? [];
        const updated = projects.map((p: any) => p.id === projectId ? { ...p, name: trimmed, updatedAt: Date.now() } : p);
        setDoc(doc(db, "users", user.uid), { projects: updated }, { merge: true });
      });
    });
  }

  function updateTask(id: string, field: keyof Task, value: any) {
    const updated = tasks.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTasks(updated);
    saveAll(updated);
    if (detailTask?.id === id) setDetailTask(prev => prev ? { ...prev, [field]: value } : null);
  }

  function updateSubtask(taskId: string, subId: string, field: keyof SubTask, value: any) {
    const updated = tasks.map(t => t.id !== taskId ? t : {
      ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, [field]: value } : s)
    });
    setTasks(updated);
    saveAll(updated);
  }

  function addTask() {
    if (!newTaskName.trim()) return;
    const t: Task = { id: genId(), name: newTaskName.trim(), status: "Nezačaté", priority: "", dueDate: "", owner: "", notes: "", subtasks: [] };
    const updated = [...tasks, t];
    setTasks(updated); saveAll(updated);
    setNewTaskName(""); setAddingTask(false);
  }

  function deleteTask(id: string) {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated); saveAll(updated);
    if (detailTask?.id === id) setDetailTask(null);
  }

  function addSubtask(taskId: string) {
    const name = newSubtask[taskId]?.trim();
    if (!name) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const sub: SubTask = { id: genId(), name, done: false, status: "Nezačaté", priority: "", dueDate: "", owner: "", notes: "" };
    updateTask(taskId, "subtasks", [...task.subtasks, sub]);
    setNewSubtask(prev => ({ ...prev, [taskId]: "" }));
  }

  function deleteSubtask(taskId: string, subId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, "subtasks", task.subtasks.filter(s => s.id !== subId));
  }

  const pill = (color: string, bg: string, small = false) => ({
    background: darkMode ? color + "22" : bg,
    color, border: `1px solid ${color}33`,
    borderRadius: 6, padding: small ? "2px 6px" : "3px 8px",
    fontSize: small ? 10 : 11, fontWeight: 700,
    fontFamily: "var(--font-geist-sans)",
    cursor: "pointer", outline: "none", appearance: "none" as const,
  });

  // ── Reusable cells ──
  const StatusCell = ({ id, val, onChange, isSubtask = false }: { id: string; val: Status; onChange: (v: string) => void; isSubtask?: boolean }) => {
    const cfg = STATUS_CONFIG[val];
    return (
      <select value={val} onChange={e => {
        onChange(e.target.value);
        if (e.target.value === "Hotovo" && !isSubtask) setExpandedId(null);
      }} style={pill(cfg.color, cfg.bg)}>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  };

  const PriorityCell = ({ val, onChange }: { val: Priority; onChange: (v: string) => void }) => {
    const cfg = PRIORITY_CONFIG[val];
    return <select value={val} onChange={e => onChange(e.target.value)} style={pill(val ? cfg.color : theme.muted, val ? cfg.bg : headerBg)}>{PRIORITIES.map(p => <option key={p} value={p}>{p || "—"}</option>)}</select>;
  };

  const DateCell = ({ cellKey, val, onChange }: { cellKey: string; val: string; onChange: (v: string) => void }) => {
    const over = isOverdue(val);
    const isEditing = editingCell?.id === cellKey;
    const [inputText, setInputText] = useState(val ? formatDateDMY(val) : "");

    const handleChange = (text: string) => {
      const digits = text.replace(/\D/g, "").slice(0, 8);
      let formatted = digits.slice(0, 2);
      if (digits.length > 2) formatted += "/" + digits.slice(2, 4);
      if (digits.length > 4) formatted += "/" + digits.slice(4, 8);
      setInputText(formatted);
      if (digits.length === 8) {
        const d = parseInt(digits.slice(0, 2), 10);
        const m = parseInt(digits.slice(2, 4), 10);
        const y = parseInt(digits.slice(4, 8), 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
          onChange(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
        }
      }
    };

    if (isEditing) return (
      <input
        autoFocus
        value={inputText}
        onChange={e => handleChange(e.target.value)}
        placeholder="dd/mm/rrrr"
        onBlur={() => { setEditingCell(null); setInputText(val ? formatDateDMY(val) : ""); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingCell(null); }}
        style={{
          width: 100, background: headerBg, border: `1.5px solid ${appliedA}`,
          borderRadius: 6, padding: "3px 8px", color: theme.text,
          fontFamily: "var(--font-geist-sans)", fontSize: 12,
          fontWeight: 600, outline: "none",
        }}
      />
    );

    return (
      <div onClick={() => { setInputText(val ? formatDateDMY(val) : ""); setEditingCell({ id: cellKey, field: "dueDate" }); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: over && val ? (darkMode ? "#fee2e222" : "#fee2e2") : headerBg,
          border: `1px solid ${over && val ? "#ef444433" : theme.border}`,
          borderRadius: 6, padding: "3px 8px", cursor: "text",
          color: over && val ? "#dc2626" : val ? theme.text : theme.muted,
          fontSize: 11, fontWeight: 600, transition: "border-color .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = appliedA}
        onMouseLeave={e => e.currentTarget.style.borderColor = over && val ? "#ef444433" : theme.border}
      >
        <span style={{ color: over && val ? "#dc2626" : appliedA }}>{Icons.calendar}</span>
        {val ? formatDate(val) : <span>Pridaj</span>}
      </div>
    );
  };

  const OwnerCell = ({ cellKey, val, onChange }: { cellKey: string; val: string; onChange: (v: string) => void }) => {
    const isEditing = editingCell?.id === cellKey;
    if (isEditing) return (
      <input autoFocus defaultValue={val} placeholder="Meno..."
        onBlur={e => { onChange(e.target.value); setEditingCell(null); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(e.currentTarget.value); setEditingCell(null); } }}
        style={{ background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 6, padding: "3px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 500, fontSize: 12, outline: "none", width: "100%" }}
      />
    );
    return (
      <div onClick={() => setEditingCell({ id: cellKey, field: "owner" })}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 6px", borderRadius: 6, cursor: "pointer", border: "1px solid transparent", transition: "border-color .15s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = theme.border}
        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      >
        {val ? (
          <>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{val[0].toUpperCase()}</div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{val}</span>
          </>
        ) : <span style={{ fontSize: 11, color: theme.muted, display: "flex", alignItems: "center", gap: 3 }}>{Icons.user} Pridaj</span>}
      </div>
    );
  };

  const NotesCell = ({ cellKey, val, onChange }: { cellKey: string; val: string; onChange: (v: string) => void }) => {
    const isEditing = editingCell?.id === cellKey;
    if (isEditing) return (
      <input autoFocus defaultValue={val} placeholder="Poznámka..."
        onBlur={e => { onChange(e.target.value); setEditingCell(null); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(e.currentTarget.value); setEditingCell(null); } }}
        style={{ background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 6, padding: "3px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 500, fontSize: 12, outline: "none", width: "100%" }}
      />
    );
    return (
      <div onClick={() => setEditingCell({ id: cellKey, field: "notes" })}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 6, cursor: "pointer", border: "1px solid transparent", transition: "border-color .15s", overflow: "hidden" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = theme.border}
        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      >
        <span style={{ color: appliedA, flexShrink: 0 }}>{Icons.notes}</span>
        <span style={{ fontSize: 11, color: val ? theme.text : theme.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val || "Pridaj"}</span>
      </div>
    );
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  // ── MOBILE DETAIL MODAL ──
  const renderMobileDetail = () => {
    if (!detailTask) return null;
    const task = tasks.find(t => t.id === detailTask.id) ?? detailTask;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={() => setDetailTask(null)}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: surface, borderRadius: "20px 20px 0 0", maxHeight: "88vh", overflowY: "auto", paddingBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
          </div>
          <div style={{ padding: "8px 16px 12px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, flex: 1, marginRight: 12 }}>{task.name}</div>
              <button onClick={() => { deleteTask(task.id); setDetailTask(null); }} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 10px", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.close}</button>
            </div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Status</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  const active = task.status === s;
                  return <button key={s} onClick={() => updateTask(task.id, "status", s)} style={{ background: active ? (darkMode ? cfg.color + "33" : cfg.bg) : "transparent", color: active ? cfg.color : theme.muted, border: `1.5px solid ${active ? cfg.color + "55" : theme.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? cfg.dot : theme.muted }} />{s}</button>;
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Priorita</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRIORITIES.map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  const active = task.priority === p;
                  return <button key={p} onClick={() => updateTask(task.id, "priority", p)} style={{ background: active && p ? (darkMode ? cfg.color + "33" : cfg.bg) : "transparent", color: active && p ? cfg.color : theme.muted, border: `1.5px solid ${active && p ? cfg.color + "55" : theme.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>{p || "Bez priority"}</button>;
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Termín</div>
              <input type="date" value={toISODate(task.dueDate)} onChange={e => updateTask(task.id, "dueDate", e.target.value)} style={{ background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Zodpovedný</div>
              <input type="text" value={task.owner} onChange={e => updateTask(task.id, "owner", e.target.value)} placeholder="Meno..." style={{ background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Poznámky</div>
              <textarea value={task.notes} onChange={e => updateTask(task.id, "notes", e.target.value)} placeholder="Pridaj poznámky..." rows={3} style={{ background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", width: "100%", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Podúlohy</div>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}22` }}>
                  <button onClick={() => updateSubtask(task.id, sub.id, "done", !sub.done)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${sub.done ? appliedA : theme.border}`, background: sub.done ? appliedA : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .15s" }}>{sub.done && Icons.check}</button>
                  <span style={{ flex: 1, fontSize: 13, textDecoration: sub.done ? "line-through" : "none", opacity: sub.done ? 0.5 : 1 }}>{sub.name}</span>
                  <button onClick={() => deleteSubtask(task.id, sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, padding: 4 }}>{Icons.close}</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={newSubtask[task.id] ?? ""} onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))} placeholder="Nová podúloha..." onKeyDown={e => { if (e.key === "Enter") addSubtask(task.id); }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
                <button onClick={() => addSubtask(task.id)} style={{ background: grad, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Pridať</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)", minHeight: "100vh", transition: "background .3s, color .3s" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .task-row:hover .del-btn{opacity:1!important}
        select{appearance:none!important;-webkit-appearance:none!important}
      `}</style>

      {renderMobileDetail()}

      {/* ── HEADER ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: surface, borderBottom: `1px solid ${theme.border}`, padding: isMobile ? "12px 14px 0" : "14px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <button onClick={() => router.push("/home")} style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: `1px solid ${theme.border}`, color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icons.back}</button>

          {/* ── EDITABLE PROJECT NAME ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input
                ref={nameInputRef}
                defaultValue={projectName}
                onBlur={e => saveName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(e.currentTarget.value); if (e.key === "Escape") setEditingName(false); }}
                style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 8, padding: "3px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", outline: "none", width: "100%" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setEditingName(true)}>
                <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</div>
                <span style={{ color: theme.muted, flexShrink: 0, opacity: 0.6 }}>{Icons.pencil}</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených</div>
          </div>

          <div style={{ display: "flex", background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
            {([{ id: "table", icon: Icons.table }, { id: "kanban", icon: Icons.kanban }, { id: "calendar", icon: Icons.calView }] as { id: View; icon: React.ReactElement }[]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: view === v.id ? grad : "transparent", color: view === v.id ? "#fff" : theme.muted, cursor: "pointer", transition: "all .2s" }}>{v.icon}</button>
            ))}
          </div>
          <button onClick={() => setAddingTask(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: grad, border: "none", borderRadius: 9, padding: isMobile ? "7px 10px" : "7px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 12px ${appliedA}44`, flexShrink: 0 }}>{Icons.plus}{!isMobile && <span> Nová úloha</span>}</button>
        </div>

        <div style={{ display: "flex", gap: 6, paddingBottom: 10, overflowX: "auto" }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = tasks.filter(t => t.status === s).length;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, background: darkMode ? cfg.bg + "18" : cfg.bg, border: `1px solid ${cfg.color}28`, borderRadius: 7, padding: "4px 9px", flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: cfg.color }}>{isMobile ? s.slice(0, 3) : s}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, background: cfg.color + "20", borderRadius: 10, padding: "0 5px" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: isMobile ? "12px 14px 60px" : "16px 20px 60px" }}>

        {/* ── TABLE ── */}
        {view === "table" && (
          <div style={{ background: surface, borderRadius: 14, border: `1px solid ${theme.border}`, boxShadow: shadow, overflow: "hidden", animation: "fadeIn .2s ease" }}>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "8px 14px", background: headerBg, borderBottom: `1px solid ${theme.border}`, fontSize: 10, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.8px", gap: 8 }}>
                <div>Úloha</div><div>Status</div><div>Priorita</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>{Icons.calendar} Termín</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>{Icons.user} Zodpovedný</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>{Icons.notes} Poznámky</div>
                <div></div>
              </div>
            )}

            {tasks.length === 0 && !addingTask && (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: appliedA }}>{Icons.subtask}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>Žiadne úlohy</div>
                <div style={{ fontSize: 12, color: theme.muted }}>Klikni na "+" a začni</div>
              </div>
            )}

            {tasks.map((task, idx) => {
              const sCfg = STATUS_CONFIG[task.status];
              const pCfg = PRIORITY_CONFIG[task.priority];
              const isExp = expandedId === task.id;
              const doneCount = task.subtasks.filter(s => s.done).length;

              if (isMobile) return (
                <div key={task.id} style={{ padding: "11px 14px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 10, animation: `fadeIn .18s ease ${idx * 0.03}s both`, cursor: "pointer" }} onClick={() => setDetailTask(task)}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: sCfg.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: task.status === "Hotovo" ? "line-through" : "none", opacity: task.status === "Hotovo" ? 0.5 : 1 }}>{task.name}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ ...pill(sCfg.color, sCfg.bg, true) }}>{task.status}</span>
                      {task.priority && <span style={{ ...pill(pCfg.color, pCfg.bg, true) }}>{task.priority}</span>}
                      {task.dueDate && <span style={{ fontSize: 10, color: isOverdue(task.dueDate) ? "#dc2626" : theme.muted, display: "flex", alignItems: "center", gap: 2 }}>{Icons.calendar} {formatDate(task.dueDate)}</span>}
                      {task.subtasks.length > 0 && <span style={{ fontSize: 10, color: theme.muted }}>{doneCount}/{task.subtasks.length}</span>}
                    </div>
                  </div>
                  <div style={{ color: theme.muted, flexShrink: 0 }}>{Icons.edit}</div>
                </div>
              );

              return (
                <React.Fragment key={task.id}>
                  <div className="task-row" style={{ display: "grid", gridTemplateColumns: COLS, padding: "9px 14px", borderBottom: isExp ? "none" : `1px solid ${theme.border}`, alignItems: "center", gap: 8, background: isExp ? subBg : "transparent", transition: "background .15s", animation: `fadeIn .18s ease ${idx * 0.03}s both` }}
                    onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = surfaceHover; }}
                    onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <button onClick={() => setExpandedId(isExp ? null : task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: isExp ? appliedA : theme.muted, padding: 2, flexShrink: 0, display: "flex", alignItems: "center", transform: isExp ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s, color .15s" }}>{Icons.chevron}</button>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: sCfg.dot, flexShrink: 0 }} />
                      {editingCell?.id === `${task.id}-name` ? (
                        <input autoFocus defaultValue={task.name} onBlur={e => { updateTask(task.id, "name", e.target.value); setEditingCell(null); }} onKeyDown={e => { if (e.key === "Enter") { updateTask(task.id, "name", e.currentTarget.value); setEditingCell(null); } }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 7, padding: "4px 9px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 13, outline: "none" }} />
                      ) : (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => setEditingCell({ id: `${task.id}-name`, field: "name" })} style={{ fontWeight: 600, fontSize: 13, cursor: "text", textDecoration: task.status === "Hotovo" ? "line-through" : "none", opacity: task.status === "Hotovo" ? 0.5 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</div>
                          {task.subtasks.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                              <div style={{ width: 40, height: 2, borderRadius: 2, background: theme.border, overflow: "hidden" }}><div style={{ width: `${(doneCount / task.subtasks.length) * 100}%`, height: "100%", background: appliedA, transition: "width .3s" }} /></div>
                              <span style={{ fontSize: 10, color: theme.muted }}>{doneCount}/{task.subtasks.length}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <StatusCell id={task.id} val={task.status} onChange={v => updateTask(task.id, "status", v)} />
                    <PriorityCell val={task.priority} onChange={v => updateTask(task.id, "priority", v)} />
                    <DateCell cellKey={`${task.id}-date`} val={task.dueDate} onChange={v => updateTask(task.id, "dueDate", v)} />
                    <OwnerCell cellKey={`${task.id}-owner`} val={task.owner} onChange={v => updateTask(task.id, "owner", v)} />
                    <NotesCell cellKey={`${task.id}-notes`} val={task.notes} onChange={v => updateTask(task.id, "notes", v)} />
                    <div className="del-btn" style={{ opacity: 0, transition: "opacity .15s", display: "flex", justifyContent: "center" }}>
                      <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}>{Icons.close}</button>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ borderBottom: `1px solid ${theme.border}`, background: subBg, animation: "fadeIn .2s ease" }}>
                      <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "6px 14px 6px 42px", gap: 8, borderBottom: `1px solid ${theme.border}33`, background: appliedA + "08" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: appliedA, textTransform: "uppercase", letterSpacing: "0.8px", display: "flex", alignItems: "center", gap: 5 }}>{Icons.subtask} Podúlohy</div>
                        {["Status", "Priorita", "Termín", "Zodpovedný", "Poznámky"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</div>)}
                        <div></div>
                      </div>
                      {task.subtasks.map(sub => (
                        <div key={sub.id} style={{ display: "grid", gridTemplateColumns: COLS, padding: "7px 14px 7px 42px", gap: 8, alignItems: "center", borderBottom: `1px solid ${theme.border}22`, transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = appliedA + "08"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                            <button onClick={() => {
                              const newDone = !sub.done;
                              const updated = tasks.map(t => t.id !== task.id ? t : {
                                ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, done: newDone, status: newDone ? "Hotovo" as Status : "Nezačaté" as Status } : s)
                              });
                              setTasks(updated);
                              saveAll(updated);
                            }} style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, border: `2px solid ${sub.done ? appliedA : theme.border}`, background: sub.done ? appliedA : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .15s" }}>{sub.done && Icons.check}</button>
                            {editingCell?.id === `${task.id}-${sub.id}-name` ? (
                              <input autoFocus defaultValue={sub.name} onBlur={e => { updateSubtask(task.id, sub.id, "name", e.target.value); setEditingCell(null); }} onKeyDown={e => { if (e.key === "Enter") { updateSubtask(task.id, sub.id, "name", e.currentTarget.value); setEditingCell(null); } }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 6, padding: "3px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 500, fontSize: 12, outline: "none" }} />
                            ) : (
                              <span onClick={() => setEditingCell({ id: `${task.id}-${sub.id}-name`, field: "name" })} style={{ fontSize: 12, fontWeight: 500, cursor: "text", textDecoration: sub.done ? "line-through" : "none", opacity: sub.done ? 0.5 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{sub.name}</span>
                            )}
                          </div>
                          <StatusCell id={sub.id} val={sub.status} onChange={v => {
                            const updated = tasks.map(t => t.id !== task.id ? t : {
                              ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, status: v as Status, done: v === "Hotovo" } : s)
                            });
                            setTasks(updated);
                            saveAll(updated);
                          }} isSubtask />
                          <PriorityCell val={sub.priority} onChange={v => updateSubtask(task.id, sub.id, "priority", v)} />
                          <DateCell cellKey={`${task.id}-${sub.id}-date`} val={sub.dueDate} onChange={v => updateSubtask(task.id, sub.id, "dueDate", v)} />
                          <OwnerCell cellKey={`${task.id}-${sub.id}-owner`} val={sub.owner} onChange={v => updateSubtask(task.id, sub.id, "owner", v)} />
                          <NotesCell cellKey={`${task.id}-${sub.id}-notes`} val={sub.notes} onChange={v => updateSubtask(task.id, sub.id, "notes", v)} />
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button onClick={() => deleteSubtask(task.id, sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; e.currentTarget.style.opacity = "0.5"; }}>{Icons.close}</button>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 10px 42px" }}>
                        <div style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${theme.border}`, flexShrink: 0 }} />
                        <input value={newSubtask[task.id] ?? ""} onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))} placeholder="Pridaj podúlohu..." onKeyDown={e => { if (e.key === "Enter") addSubtask(task.id); }} style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1.5px solid ${theme.border}`, padding: "3px 0", color: theme.text, fontSize: 12, fontFamily: "var(--font-geist-sans)", fontWeight: 500, outline: "none", transition: "border-color .15s" }} onFocus={e => e.target.style.borderBottomColor = appliedA} onBlur={e => e.target.style.borderBottomColor = theme.border} />
                        <button onClick={() => addSubtask(task.id)} style={{ background: appliedA + "18", border: "none", borderRadius: 6, padding: "4px 10px", color: appliedA, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Pridať</button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {addingTask && (
              <div style={{ display: "flex", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${theme.border}`, animation: "fadeIn .2s ease" }}>
                <input autoFocus value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Názov novej úlohy..." onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAddingTask(false); setNewTaskName(""); } }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${appliedA}`, borderRadius: 9, padding: "7px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 13, outline: "none" }} />
                <button onClick={addTask} style={{ background: grad, border: "none", borderRadius: 9, padding: "7px 16px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 12px ${appliedA}44` }}>Pridať</button>
                <button onClick={() => { setAddingTask(false); setNewTaskName(""); }} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 9, padding: "7px 12px", color: theme.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
              </div>
            )}
            {!addingTask && (
              <div onClick={() => setAddingTask(true)} style={{ padding: "10px 14px", color: theme.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{Icons.plus}</div>
                Pridať úlohu
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" && (() => {
          const year = calMonth.getFullYear();
          const month = calMonth.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startOffset = firstDay === 0 ? 6 : firstDay - 1;
          const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
          const cells = Array.from({ length: totalCells }, (_, i) => {
            const day = i - startOffset + 1;
            return day >= 1 && day <= daysInMonth ? day : null;
          });
          const monthNames = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];
          const dayNames = isMobile ? ["P","U","S","Š","P","S","N"] : ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
          const today = new Date();
          const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

          const getItemsForDay = (day: number) => {
            const dateStr = getDateStr(day);
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            const dayEvents = events.filter(e => e.date === dateStr);
            return { tasks: dayTasks, events: dayEvents, all: [...dayEvents, ...dayTasks] };
          };

          const totalTasks = tasks.filter(t => t.dueDate?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length;
          const doneTasks = tasks.filter(t => t.dueDate?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`) && t.status === "Hotovo").length;
          const totalEvents = events.filter(e => e.date?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length;

          const EVENT_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#06b6d4"];

          const addQuickItem = () => {
            if (!quickName.trim() || !calModal) return;
            if (quickType === "event") {
              const ev: CalEvent = { id: genId(), title: quickName.trim(), date: calModal.date, color: quickColor, type: "event", time: quickTime, notes: "" };
              saveEvents([...events, ev]);
            } else {
              const t: Task = { id: genId(), name: quickName.trim(), status: "Nezačaté", priority: "", dueDate: calModal.date, owner: "", notes: "", subtasks: [] };
              const updated = [...tasks, t];
              setTasks(updated);
              saveAll(updated);
            }
            setQuickName(""); setQuickTime(""); setCalModal(null);
          };

          return (
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: shadow, animation: "fadeIn .25s ease" }}>

              {/* HEADER */}
              <div style={{ background: grad, padding: isMobile ? "18px 16px 20px" : "22px 28px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ position: "absolute", bottom: -30, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                  <div>
                    <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>{monthNames[month]}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginTop: 2 }}>{year} · {totalTasks} úloh · {totalEvents} udalostí</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {totalTasks > 0 && (
                      <div style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                        {doneTasks}/{totalTasks} dok.
                      </div>
                    )}
                    <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                    >{Icons.navLeft}</button>
                    <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ width: 34, height: 34, borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                    >{Icons.navRight}</button>
                    <button onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ height: 34, borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", padding: "0 12px", fontSize: 11, fontWeight: 700 }}>Dnes</button>
                  </div>
                </div>
                {totalTasks > 0 && (
                  <div style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
                    <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(doneTasks / totalTasks) * 100}%`, background: "#fff", borderRadius: 2, transition: "width .5s ease" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* DAY NAMES */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: surface, borderBottom: `1px solid ${theme.border}` }}>
                {dayNames.map((d, i) => (
                  <div key={i} style={{ padding: isMobile ? "6px 2px" : "10px 8px", textAlign: "center", fontSize: isMobile ? 9 : 11, fontWeight: 800, color: i >= 5 ? appliedA : theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>{d}</div>
                ))}
              </div>

              {/* GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: surface }}>
                {cells.map((day, i) => {
                  const { tasks: dTasks, events: dEvents, all } = day ? getItemsForDay(day) : { tasks: [], events: [], all: [] };
                  const isCurrentDay = day ? isToday(day) : false;
                  const isWeekend = i % 7 >= 5;
                  const maxVisible = isMobile ? 1 : 3;
                  const dateStr = day ? getDateStr(day) : "";

                  return (
                    <div key={i} style={{
                      minHeight: isMobile ? 70 : 110,
                      borderRight: (i + 1) % 7 !== 0 ? `1px solid ${theme.border}` : "none",
                      borderBottom: i < cells.length - 7 ? `1px solid ${theme.border}` : "none",
                      padding: isMobile ? "5px 3px" : "6px",
                      background: !day ? (darkMode ? theme.card2 + "40" : "#f7f8fc") : isWeekend ? (darkMode ? appliedA + "06" : appliedA + "05") : surface,
                      transition: "background .15s",
                      cursor: day ? "pointer" : "default",
                      position: "relative",
                    }}
                    onClick={() => { if (day) setCalModal({ date: dateStr }); }}
                    onMouseEnter={e => { if (day) e.currentTarget.style.background = darkMode ? appliedA + "12" : appliedA + "08"; }}
                    onMouseLeave={e => { if (day) e.currentTarget.style.background = !day ? (darkMode ? theme.card2 + "40" : "#f7f8fc") : isWeekend ? (darkMode ? appliedA + "06" : appliedA + "05") : surface; }}
                    >
                      {day && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: all.length ? 4 : 0 }}>
                            <div style={{
                              width: isMobile ? 22 : 26, height: isMobile ? 22 : 26, borderRadius: "50%",
                              background: isCurrentDay ? grad : "transparent",
                              boxShadow: isCurrentDay ? `0 2px 8px ${appliedA}55` : "none",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: isMobile ? 10 : 12, fontWeight: isCurrentDay ? 900 : isWeekend ? 600 : 400,
                              color: isCurrentDay ? "#fff" : isWeekend ? appliedA : theme.text,
                            }}>{day}</div>
                            {all.length > 0 && !isMobile && (
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: appliedA, opacity: 0.4 }} />
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={e => e.stopPropagation()}>
                            {all.slice(0, maxVisible).map((item, idx) => {
                              const isEvent = "title" in item;
                              const color = isEvent ? (item as CalEvent).color : STATUS_CONFIG[(item as Task).status].color;
                              const bg = isEvent ? (item as CalEvent).color + "22" : (darkMode ? STATUS_CONFIG[(item as Task).status].color + "22" : STATUS_CONFIG[(item as Task).status].bg);
                              const label = isEvent ? (item as CalEvent).title : (item as Task).name;
                              const time = isEvent ? (item as CalEvent).time : "";
                              return (
                                <div key={idx} onClick={e => { e.stopPropagation(); if (isEvent) setCalModal({ date: dateStr, event: item as CalEvent }); else setDetailTask(item as Task); }}
                                  style={{
                                    background: bg, color, borderRadius: 4,
                                    padding: isMobile ? "1px 4px" : "2px 6px",
                                    fontSize: isMobile ? 8 : 10, fontWeight: 700,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    cursor: "pointer", borderLeft: `2.5px solid ${color}`,
                                    display: "flex", alignItems: "center", gap: 3,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                >
                                  {time && !isMobile && <span style={{ opacity: 0.7, fontWeight: 600, fontSize: 9 }}>{time}</span>}
                                  {!isEvent && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>}
                                  {label}
                                </div>
                              );
                            })}
                            {all.length > maxVisible && (
                              <div onClick={e => { e.stopPropagation(); setSelectedDayEvents({ date: dateStr, items: all }); }}
                                style={{ fontSize: isMobile ? 8 : 10, color: appliedA, fontWeight: 700, paddingLeft: 4, cursor: "pointer" }}>
                                +{all.length - maxVisible} ďalšie
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* LEGEND */}
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${theme.border}`, background: surface, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#6366f1" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: theme.muted }}>Udalosť</span>
                </div>
                {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: darkMode ? cfg.color + "44" : cfg.bg, border: `2px solid ${cfg.color}` }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{s}</span>
                    </div>
                  );
                })}
              </div>

              {/* ── QUICK ADD / EDIT MODAL ── */}
              {calModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                  onClick={() => { setCalModal(null); setQuickName(""); setQuickTime(""); }}>
                  <div onClick={e => e.stopPropagation()} style={{
                    background: surface, borderRadius: 20, padding: 24, width: isMobile ? "90vw" : 400,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeIn .2s ease",
                    border: `1px solid ${theme.border}`,
                  }}>
                    {/* Modal header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>
                          {calModal.event ? "Upraviť udalosť" : "Pridať na deň"}
                        </div>
                        <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                          {formatDate(calModal.date)} {calModal.date.split("-")[0]}
                        </div>
                      </div>
                      <button onClick={() => { setCalModal(null); setQuickName(""); setQuickTime(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, display: "flex", alignItems: "center" }}>{Icons.close}</button>
                    </div>

                    {/* Type selector (only for new) */}
                    {!calModal.event && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        {(["event","task"] as const).map(t => (
                          <button key={t} onClick={() => setQuickType(t)} style={{
                            flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${quickType === t ? appliedA : theme.border}`,
                            background: quickType === t ? appliedA + "18" : "transparent",
                            color: quickType === t ? appliedA : theme.muted, fontWeight: 700, fontSize: 12, cursor: "pointer",
                            fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          }}>
                            {t === "event" ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                            {t === "event" ? "Udalosť" : "Úloha"}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Name input */}
                    <input
                      autoFocus
                      value={calModal.event ? calModal.event.title : quickName}
                      onChange={e => {
                        if (calModal.event) setCalModal({ ...calModal, event: { ...calModal.event!, title: e.target.value } });
                        else setQuickName(e.target.value);
                      }}
                      placeholder={quickType === "event" ? "Názov udalosti..." : "Názov úlohy..."}
                      onKeyDown={e => { if (e.key === "Enter") addQuickItem(); }}
                      style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                      onFocus={e => e.target.style.borderColor = appliedA}
                      onBlur={e => e.target.style.borderColor = theme.border}
                    />

                    {/* Time (events only) */}
                    {(quickType === "event" || calModal.event) && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 5 }}>ČAS</div>
                          <input type="time" value={calModal.event ? calModal.event.time || "" : quickTime}
                            onChange={e => {
                              if (calModal.event) setCalModal({ ...calModal, event: { ...calModal.event!, time: e.target.value } });
                              else setQuickTime(e.target.value);
                            }}
                            style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 8, padding: "7px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Color picker (events only) */}
                    {(quickType === "event" || calModal.event) && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 8 }}>FARBA</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {EVENT_COLORS.map(c => (
                            <div key={c} onClick={() => {
                              if (calModal.event) setCalModal({ ...calModal, event: { ...calModal.event!, color: c } });
                              else setQuickColor(c);
                            }} style={{
                              width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                              border: `3px solid ${(calModal.event ? calModal.event.color : quickColor) === c ? theme.text : "transparent"}`,
                              boxShadow: (calModal.event ? calModal.event.color : quickColor) === c ? `0 0 0 2px ${c}` : "none",
                              transition: "all .15s",
                            }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <textarea
                      value={calModal.event ? calModal.event.notes || "" : ""}
                      onChange={e => { if (calModal.event) setCalModal({ ...calModal, event: { ...calModal.event!, notes: e.target.value } }); }}
                      placeholder="Poznámky (voliteľné)..."
                      rows={2}
                      style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 12, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 16 }}
                      onFocus={e => e.target.style.borderColor = appliedA}
                      onBlur={e => e.target.style.borderColor = theme.border}
                    />

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {calModal.event && (
                        <button onClick={() => {
                          const updated = events.filter(e => e.id !== calModal.event!.id);
                          saveEvents(updated);
                          setCalModal(null);
                        }} style={{ background: "#fee2e2", border: "none", borderRadius: 10, padding: "10px 16px", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Vymazať</button>
                      )}
                      <div style={{ flex: 1 }} />
                      <button onClick={() => { setCalModal(null); setQuickName(""); setQuickTime(""); }} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 16px", color: theme.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                      <button onClick={() => {
                        if (calModal.event) {
                          const updated = events.map(e => e.id === calModal.event!.id ? calModal.event! : e);
                          saveEvents(updated);
                          setCalModal(null);
                        } else {
                          addQuickItem();
                        }
                      }} style={{ background: grad, border: "none", borderRadius: 10, padding: "10px 20px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 12px ${appliedA}44` }}>
                        {calModal.event ? "Uložiť" : "Pridať"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DAY DETAIL MODAL ("+X ďalšie") ── */}
              {selectedDayEvents && (
                <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                  onClick={() => setSelectedDayEvents(null)}>
                  <div onClick={e => e.stopPropagation()} style={{
                    background: surface, borderRadius: 20, padding: 20, width: isMobile ? "90vw" : 360,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeIn .2s ease",
                    border: `1px solid ${theme.border}`, maxHeight: "70vh", overflowY: "auto",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{formatDate(selectedDayEvents.date)}</div>
                      <button onClick={() => setSelectedDayEvents(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted }}>{Icons.close}</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedDayEvents.items.map((item, idx) => {
                        const isEvent = "title" in item;
                        const color = isEvent ? (item as CalEvent).color : STATUS_CONFIG[(item as Task).status].color;
                        const bg = isEvent ? (item as CalEvent).color + "18" : (darkMode ? STATUS_CONFIG[(item as Task).status].color + "18" : STATUS_CONFIG[(item as Task).status].bg);
                        return (
                          <div key={idx} onClick={() => { if (isEvent) { setCalModal({ date: selectedDayEvents.date, event: item as CalEvent }); setSelectedDayEvents(null); } else { setDetailTask(item as Task); setSelectedDayEvents(null); } }}
                            style={{ background: bg, borderRadius: 10, padding: "10px 12px", cursor: "pointer", borderLeft: `3px solid ${color}`, display: "flex", alignItems: "center", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color }}>{isEvent ? (item as CalEvent).title : (item as Task).name}</div>
                              {isEvent && (item as CalEvent).time && <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{(item as CalEvent).time}</div>}
                              {!isEvent && <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{(item as Task).status}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => { setCalModal({ date: selectedDayEvents.date }); setSelectedDayEvents(null); }} style={{
                      marginTop: 14, width: "100%", background: grad, border: "none", borderRadius: 10,
                      padding: "10px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                      fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>{Icons.plus} Pridať na tento deň</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── KANBAN ── */}
        {view === "kanban" && (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, animation: "fadeIn .2s ease" }}>
            {STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const col = tasks.filter(t => t.status === status);
              return (
                <div key={status} style={{ minWidth: isMobile ? 220 : 255, flex: `0 0 ${isMobile ? "220px" : "255px"}`, background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: shadow }}>
                  <div style={{ padding: "11px 13px", background: darkMode ? cfg.bg + "18" : cfg.bg, borderBottom: `2px solid ${cfg.color}28`, display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
                    <span style={{ fontWeight: 700, fontSize: 12, color: cfg.color }}>{status}</span>
                    <span style={{ marginLeft: "auto", background: cfg.color + "20", color: cfg.color, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{col.length}</span>
                  </div>
                  <div style={{ padding: 9, display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                    {col.map((task, idx) => {
                      const pCfg = PRIORITY_CONFIG[task.priority];
                      const over = isOverdue(task.dueDate);
                      const doneCount = task.subtasks.filter(s => s.done).length;
                      return (
                        <div key={task.id} onClick={() => isMobile ? setDetailTask(task) : undefined} style={{ background: surfaceHover, border: `1px solid ${theme.border}`, borderRadius: 11, padding: "11px 12px", display: "flex", flexDirection: "column", gap: 7, animation: `fadeIn .18s ease ${idx * 0.04}s both`, transition: "transform .15s, box-shadow .15s", cursor: isMobile ? "pointer" : "default" }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${appliedA}18`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{task.name}</div>
                          {task.subtasks.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ flex: 1, height: 2, borderRadius: 2, background: theme.border, overflow: "hidden" }}><div style={{ width: `${(doneCount / task.subtasks.length) * 100}%`, height: "100%", background: appliedA }} /></div><span style={{ fontSize: 10, color: theme.muted }}>{doneCount}/{task.subtasks.length}</span></div>}
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {task.priority && <span style={{ background: darkMode ? pCfg.bg + "22" : pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.color}28`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{task.priority}</span>}
                            {task.dueDate && <span style={{ background: over ? (darkMode ? "#fee2e222" : "#fee2e2") : headerBg, color: over ? "#dc2626" : theme.muted, border: `1px solid ${over ? "#ef444428" : theme.border}`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>{Icons.calendar} {formatDate(task.dueDate)}</span>}
                          </div>
                          {task.owner && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 800 }}>{task.owner[0].toUpperCase()}</div><span style={{ fontSize: 11, color: theme.muted, fontWeight: 600 }}>{task.owner}</span></div>}
                          {task.notes && <div style={{ fontSize: 11, color: theme.muted, borderTop: `1px solid ${theme.border}`, paddingTop: 6, lineHeight: 1.5 }}>{task.notes.length > 60 ? task.notes.slice(0, 60) + "…" : task.notes}</div>}
                          {!isMobile && (
                            <div style={{ display: "flex", gap: 5 }}>
                              <select value={task.status} onChange={e => updateTask(task.id, "status", e.target.value)} style={{ flex: 1, background: surface, border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 7px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 10, cursor: "pointer", outline: "none", appearance: "none" }}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                              <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 7px", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = theme.muted; }}>{Icons.close}</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => { const name = prompt("Názov úlohy:"); if (!name?.trim()) return; const t: Task = { id: genId(), name: name.trim(), status, priority: "", dueDate: "", owner: "", notes: "", subtasks: [] }; const updated = [...tasks, t]; setTasks(updated); saveAll(updated); }}
                      style={{ background: "none", border: `1.5px dashed ${theme.border}`, borderRadius: 9, padding: "8px", color: theme.muted, cursor: "pointer", fontSize: 11, fontWeight: 600, width: "100%", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all .15s" }}
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