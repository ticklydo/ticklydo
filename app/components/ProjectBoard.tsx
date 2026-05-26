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
type View = "table" | "kanban";

type SubTask = {
  id: string; name: string; done: boolean;
  status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string;
};

type Comment = {
  id: string;
  text: string;
  author: string;
  createdAt: number;
};

type ActivityEntry = {
  id: string;
  action: string;
  taskName: string;
  field?: string;
  oldVal?: string;
  newVal?: string;
  author: string;
  createdAt: number;
};

type Task = {
  id: string; name: string; status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string; subtasks: SubTask[];
  recurring?: "daily" | "weekly" | "monthly" | "";
  tags?: string[];
  comments?: Comment[];
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
  recurring: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  tag: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
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
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [detailTab, setDetailTab] = useState<"details" | "comments" | "activity">("details");
  const [confirmTaskDelete, setConfirmTaskDelete] = useState<string | null>(null);

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

  // ── NOTIFICATIONS ──
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!tasks.length || Notification.permission !== "granted") return;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
    const dueTomorrow = tasks.filter(t => t.dueDate === tomorrowStr && t.status !== "Hotovo");
    const dueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== "Hotovo");
    if (dueToday.length > 0) {
      new Notification(`Ticklydo — ${projectName}`, { body: `Dnes máš termín: ${dueToday.map(t => t.name).join(", ")}`, icon: "/favicon.ico" });
    } else if (dueTomorrow.length > 0) {
      new Notification(`Ticklydo — ${projectName}`, { body: `Zajtra máš termín: ${dueTomorrow.map(t => t.name).join(", ")}`, icon: "/favicon.ico" });
    }
  }, [tasks.length, projectName]);

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
          recurring: undefined,
          subtasks: (t.subtasks ?? []).map((s: SubTask) => ({
            id: s.id, name: s.name, done: s.done ?? false,
            status: s.status ?? "Nezačaté", priority: s.priority ?? "",
            dueDate: s.dueDate ?? "", owner: s.owner ?? "", notes: s.notes ?? "",
          }))
        })));
        setEvents(data.events ?? []);
        setActivityLog(data.activityLog ?? []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const saveAll = async (newTasks: Task[], newName?: string, newEvents?: CalEvent[], newLog?: ActivityEntry[]) => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "projects", `${user.uid}_${projectId}`), {
      tasks: newTasks,
      projectName: newName ?? projectName,
      events: newEvents ?? events,
      activityLog: (newLog ?? activityLog).slice(0, 100),
    }, { merge: true });
  };

  const logActivity = (action: string, taskName: string, field?: string, oldVal?: string, newVal?: string): ActivityEntry[] => {
    const user = auth.currentUser;
    const entry: ActivityEntry = {
      id: genId(), action, taskName,
      field, oldVal, newVal,
      author: user?.displayName || user?.email?.split("@")[0] || "Ty",
      createdAt: Date.now(),
    };
    const updated = [entry, ...activityLog].slice(0, 100);
    setActivityLog(updated);
    return updated;
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
    const task = tasks.find(t => t.id === id);
    const updated = tasks.map(t => t.id !== id ? t : { ...t, [field]: value });
    const fieldLabels: Partial<Record<keyof Task, string>> = { status: "Status", priority: "Priorita", dueDate: "Termín", owner: "Zodpovedný", name: "Názov" };
    if (task && fieldLabels[field]) {
      const newLog = logActivity("upravil", task.name, fieldLabels[field], String(task[field] || "—"), String(value || "—"));
      setTasks(updated);
      saveAll(updated, undefined, undefined, newLog);
    } else {
      setTasks(updated);
      saveAll(updated);
    }
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
    const newLog = logActivity("vytvoril", t.name);
    setTasks(updated); saveAll(updated, undefined, undefined, newLog);
    setNewTaskName(""); setAddingTask(false);
  }

  async function deleteTask(id: string) {
    const task = tasks.find(t => t.id === id);
    const updated = tasks.filter(t => t.id !== id);
    console.log("deleteTask: removing", id, "remaining:", updated.length, updated.map(t => t.name));
    const newLog = task ? logActivity("vymazal", task.name) : activityLog;
    setTasks(updated);
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    console.log("saveAll tasks:", updated.length);
    await setDoc(doc(db, "projects", `${user.uid}_${projectId}`), {
      tasks: updated,
      projectName,
      events,
      activityLog: newLog.slice(0, 100),
    }, { merge: true });
    console.log("deleteTask: saved to Firebase successfully");
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
  const addComment = (task: Task) => {
    if (!newComment.trim()) return;
    const user = auth.currentUser;
    const comment: Comment = {
      id: genId(), text: newComment.trim(),
      author: user?.displayName || user?.email?.split("@")[0] || "Ty",
      createdAt: Date.now(),
    };
    const updated = tasks.map(t => t.id === task.id ? { ...t, comments: [...(t.comments ?? []), comment] } : t);
    setTasks(updated);
    saveAll(updated);
    setNewComment("");
    logActivity("komentoval", task.name);
  };

  const renderMobileDetail = () => {
    if (!detailTask) return null;
    const task = tasks.find(t => t.id === detailTask.id) ?? detailTask;
    const comments = task.comments ?? [];
    const timeAgo = (ts: number) => {
      const diff = Date.now() - ts;
      const m = Math.floor(diff / 60000);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (m < 1) return "práve teraz";
      if (m < 60) return `pred ${m} min`;
      if (h < 24) return `pred ${h} hod`;
      return `pred ${d} dňami`;
    };
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={() => { setDetailTask(null); setDetailTab("details"); }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: surface, borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto", paddingBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
          </div>
          {/* Header */}
          <div style={{ padding: "8px 16px 0", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, flex: 1, marginRight: 12 }}>{task.name}</div>
              <button onClick={() => setConfirmTaskDelete(task.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "6px 10px", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center" }}>{Icons.close}</button>
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {([["details", "Detaily"], ["comments", `Komentáre${comments.length > 0 ? ` (${comments.length})` : ""}`], ["activity", "Aktivita"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setDetailTab(tab)} style={{ background: "none", border: "none", borderBottom: `2px solid ${detailTab === tab ? appliedA : "transparent"}`, color: detailTab === tab ? appliedA : theme.muted, fontWeight: 700, fontSize: 12, padding: "8px 14px", cursor: "pointer", fontFamily: "var(--font-geist-sans)", transition: "all .15s" }}>{label}</button>
              ))}
            </div>
          </div>
          {detailTab === "details" && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Status</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUSES.map(s => { const cfg = STATUS_CONFIG[s]; const active = task.status === s; return <button key={s} onClick={() => updateTask(task.id, "status", s)} style={{ background: active ? (darkMode ? cfg.color + "33" : cfg.bg) : "transparent", color: active ? cfg.color : theme.muted, border: `1.5px solid ${active ? cfg.color + "55" : theme.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? cfg.dot : theme.muted }} />{s}</button>; })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Priorita</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRIORITIES.map(p => { const cfg = PRIORITY_CONFIG[p]; const active = task.priority === p; return <button key={p} onClick={() => updateTask(task.id, "priority", p)} style={{ background: active && p ? (darkMode ? cfg.color + "33" : cfg.bg) : "transparent", color: active && p ? cfg.color : theme.muted, border: `1.5px solid ${active && p ? cfg.color + "55" : theme.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>{p || "Bez priority"}</button>; })}
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
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Tagy</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {(task.tags ?? []).map(tag => <div key={tag} style={{ background: appliedA + "18", color: appliedA, border: `1px solid ${appliedA}33`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>{Icons.tag} {tag}<button onClick={() => updateTask(task.id, "tags", (task.tags ?? []).filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", color: appliedA, padding: 0, marginLeft: 2, display: "flex", alignItems: "center" }}>{Icons.close}</button></div>)}
                </div>
                <input placeholder="Pridaj tag + Enter" onKeyDown={e => { if (e.key === "Enter") { const val = (e.target as HTMLInputElement).value.trim(); if (val && !(task.tags ?? []).includes(val)) updateTask(task.id, "tags", [...(task.tags ?? []), val]); (e.target as HTMLInputElement).value = ""; } }} style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "7px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Podúlohy</div>
                {task.subtasks.map(sub => <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}22` }}><button onClick={() => updateSubtask(task.id, sub.id, "done", !sub.done)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${sub.done ? appliedA : theme.border}`, background: sub.done ? appliedA : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .15s" }}>{sub.done && Icons.check}</button><span style={{ flex: 1, fontSize: 13, textDecoration: sub.done ? "line-through" : "none", opacity: sub.done ? 0.5 : 1 }}>{sub.name}</span><button onClick={() => deleteSubtask(task.id, sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, padding: 4 }}>{Icons.close}</button></div>)}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input value={newSubtask[task.id] ?? ""} onChange={e => setNewSubtask(prev => ({ ...prev, [task.id]: e.target.value }))} placeholder="Nová podúloha..." onKeyDown={e => { if (e.key === "Enter") addSubtask(task.id); }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
                  <button onClick={() => addSubtask(task.id)} style={{ background: grad, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Pridať</button>
                </div>
              </div>
            </div>
          )}

          {/* Comments tab */}
          {detailTab === "comments" && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", color: theme.muted, fontSize: 13 }}>Zatiaľ žiadne komentáre</div>}
              {comments.map(c => (
                <div key={c.id} style={{ background: headerBg, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{c.author[0]?.toUpperCase()}</div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.author}</span>
                    <span style={{ fontSize: 10, color: theme.muted, marginLeft: "auto" }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, paddingLeft: 29 }}>{c.text}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Napíš komentár..." onKeyDown={e => { if (e.key === "Enter") addComment(task); }} style={{ flex: 1, background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "9px 12px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none" }} onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />
                <button onClick={() => addComment(task)} style={{ background: grad, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Odoslať</button>
              </div>
            </div>
          )}

          {/* Activity tab */}
          {detailTab === "activity" && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {activityLog.filter(l => l.taskName === task.name).length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: theme.muted, fontSize: 13 }}>Žiadna aktivita</div>
              )}
              {activityLog.filter(l => l.taskName === task.name).map(log => (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: `1px solid ${theme.border}22` }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", color: appliedA, flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{log.author} </span>
                    <span style={{ fontSize: 12, color: theme.muted }}>{log.action}</span>
                    {log.field && <span style={{ fontSize: 12, color: theme.muted }}> · {log.field}: <span style={{ color: "#dc2626" }}>{log.oldVal}</span> → <span style={{ color: "#16a34a" }}>{log.newVal}</span></span>}
                    <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{timeAgo(log.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {([{ id: "table", icon: Icons.table }, { id: "kanban", icon: Icons.kanban }] as { id: View; icon: React.ReactElement }[]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: view === v.id ? grad : "transparent", color: view === v.id ? "#fff" : theme.muted, cursor: "pointer", transition: "all .2s" }}>{v.icon}</button>
            ))}
            <button onClick={() => router.push(`/calendar?project=${projectId}`)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: "transparent", color: theme.muted, cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = appliedA + "18"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              title="Globálny kalendár"
            >{Icons.calView}</button>
          </div>
          {/* Activity log button */}
          <button onClick={() => setShowActivity(v => !v)} style={{ position: "relative", width: 30, height: 30, borderRadius: 8, background: showActivity ? appliedA + "18" : "transparent", border: `1px solid ${showActivity ? appliedA + "55" : theme.border}`, color: showActivity ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
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
                          {(task.tags ?? []).length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                              {(task.tags ?? []).slice(0, 2).map(tag => <span key={tag} style={{ fontSize: 9, fontWeight: 700, color: appliedA, background: appliedA + "15", borderRadius: 10, padding: "1px 6px" }}>#{tag}</span>)}
                            </div>
                          )}
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
                      <button onClick={() => setConfirmTaskDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.muted; }}>{Icons.close}</button>
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

                      {/* ── TAGS + COMMENTS INLINE ── */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: `1px solid ${theme.border}33` }}>
                        {/* Tags */}
                        <div style={{ padding: "10px 14px 10px 42px", borderRight: `1px solid ${theme.border}33` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: appliedA, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>{Icons.tag} Tagy</div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
                            {(task.tags ?? []).length === 0 && <span style={{ fontSize: 11, color: theme.muted }}>Žiadne tagy</span>}
                            {(task.tags ?? []).map(tag => (
                              <div key={tag} style={{ background: appliedA + "15", color: appliedA, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                #{tag}
                                <button onClick={() => updateTask(task.id, "tags", (task.tags ?? []).filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", color: appliedA, padding: 0, display: "flex", alignItems: "center", fontSize: 10 }}>{Icons.close}</button>
                              </div>
                            ))}
                          </div>
                          <input placeholder="+ Pridaj tag" onKeyDown={e => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !(task.tags ?? []).includes(val)) updateTask(task.id, "tags", [...(task.tags ?? []), val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }} style={{ background: "transparent", border: "none", borderBottom: `1.5px solid ${theme.border}`, outline: "none", color: theme.text, fontSize: 12, fontFamily: "var(--font-geist-sans)", padding: "3px 0", width: "100%", transition: "border-color .15s" }}
                          onFocus={e => e.target.style.borderBottomColor = appliedA}
                          onBlur={e => e.target.style.borderBottomColor = theme.border} />
                        </div>

                        {/* Comments */}
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: appliedA, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            Komentáre {(task.comments ?? []).length > 0 && `(${task.comments!.length})`}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 100, overflowY: "auto", marginBottom: 7 }}>
                            {(task.comments ?? []).length === 0 && <span style={{ fontSize: 11, color: theme.muted }}>Žiadne komentáre</span>}
                            {(task.comments ?? []).slice(-3).map(c => (
                              <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{c.author[0]?.toUpperCase()}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700 }}>{c.author} </span>
                                  <span style={{ fontSize: 11, color: theme.text }}>{c.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              placeholder="Napíš komentár..."
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (!val) return;
                                  const user = auth.currentUser;
                                  const comment: Comment = { id: genId(), text: val, author: user?.displayName || user?.email?.split("@")[0] || "Ty", createdAt: Date.now() };
                                  updateTask(task.id, "comments", [...(task.comments ?? []), comment]);
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }}
                              style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1.5px solid ${theme.border}`, outline: "none", color: theme.text, fontSize: 12, fontFamily: "var(--font-geist-sans)", padding: "3px 0", transition: "border-color .15s" }}
                              onFocus={e => e.target.style.borderBottomColor = appliedA}
                              onBlur={e => e.target.style.borderBottomColor = theme.border}
                            />
                          </div>
                        </div>
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
                              <button onClick={() => setConfirmTaskDelete(task.id)} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 7px", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = theme.muted; }}>{Icons.close}</button>
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

      {/* ── CONFIRM TASK DELETE MODAL ── */}
      {confirmTaskDelete && (() => {
        const task = tasks.find(t => t.id === confirmTaskDelete);
        if (!task) return null;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => setConfirmTaskDelete(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: surface, borderRadius: 20, padding: "24px 24px 20px",
              width: "min(380px, 90vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              border: `1px solid ${theme.border}`, animation: "fadeIn .2s ease",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>Vymazať úlohu?</div>
                <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.5 }}>
                  Naozaj chceš vymazať úlohu <strong style={{ color: theme.text }}>"{task.name}"</strong>? Táto akcia je nenávratná.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmTaskDelete(null)} style={{ flex: 1, background: "none", border: `1px solid ${theme.border}`, borderRadius: 12, padding: "10px", color: theme.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                <button onClick={() => { deleteTask(confirmTaskDelete); setDetailTask(null); setConfirmTaskDelete(null); }} style={{ flex: 1, background: "#dc2626", border: "none", borderRadius: 12, padding: "10px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: "0 4px 12px #dc262644" }}>Vymazať</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}