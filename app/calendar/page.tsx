"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type CalTask = {
  id: string; name: string; status: Status;
  dueDate: string; priority: string;
  projectId: string; projectName: string;
  projectColor1: string; projectColor2: string;
};

type CalEvent = {
  id: string; title: string; date: string;
  color: string; time?: string; notes?: string;
  projectId: string; projectName: string;
  projectColor1: string; projectColor2: string;
};

type Project = {
  id: string; name: string;
  color1: string; color2: string;
};

const STATUS_CONFIG: Record<Status, { color: string; bg: string }> = {
  "Hotovo":    { color: "#16a34a", bg: "#dcfce7" },
  "V procese": { color: "#b45309", bg: "#fef3c7" },
  "Uviaznuté": { color: "#dc2626", bg: "#fee2e2" },
  "Nezačaté":  { color: "#6b7280", bg: "#f3f4f6" },
};

const MONTH_NAMES = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];
const DAY_NAMES = ["Po","Ut","St","Št","Pi","So","Ne"];

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [dayModal, setDayModal] = useState<{ date: string; tasks: CalTask[]; events: CalEvent[] } | null>(null);
  const [addModal, setAddModal] = useState<{ date: string; projectId: string } | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventColor, setNewEventColor] = useState("#6366f1");
  const [newEventTime, setNewEventTime] = useState("");

  const surface = darkMode ? theme.card : "#ffffff";
  const headerBg = darkMode ? theme.card2 : "#f8f9fb";
  const shadow = darkMode ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)";
  const EVENT_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#06b6d4"];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const dynamicProjects = userSnap.exists() ? (userSnap.data().projects ?? []).filter((p: any) => !p.archived) : [];
      const staticIds = ["project-1","project-2","project-3","project-4"];
      const staticProjects: any[] = [];
      await Promise.all(staticIds.map(async (id) => {
        if (dynamicProjects.some((p: any) => p.id === id)) return;
        const snap = await getDoc(doc(db, "projects", `${user.uid}_${id}`));
        if (snap.exists()) staticProjects.push({ id, name: snap.data().projectName || id, color1: "#6366f1", color2: "#8b5cf6" });
      }));
      const allProjects: Project[] = [...dynamicProjects, ...staticProjects];
      setProjects(allProjects);

      // Pre-select project from URL param
      const urlProject = searchParams.get("project");
      setSelectedProjects(new Set(urlProject ? [urlProject] : allProjects.map((p: Project) => p.id)));

      const allTasks: CalTask[] = [];
      const allEvents: CalEvent[] = [];

      await Promise.all(allProjects.map(async (project: Project) => {
        const snap = await getDoc(doc(db, "projects", `${user.uid}_${project.id}`));
        if (!snap.exists()) return;
        const data = snap.data();
        (data.tasks ?? []).filter((t: any) => t.dueDate && t.status !== "Hotovo").forEach((t: any) => {
          allTasks.push({ id: t.id, name: t.name, status: t.status ?? "Nezačaté", dueDate: t.dueDate, priority: t.priority ?? "", projectId: project.id, projectName: project.name, projectColor1: project.color1, projectColor2: project.color2 });
        });
        (data.events ?? []).forEach((e: any) => {
          allEvents.push({ id: e.id, title: e.title, date: e.date, color: e.color, time: e.time, notes: e.notes, projectId: project.id, projectName: project.name, projectColor1: project.color1, projectColor2: project.color2 });
        });
      }));

      setTasks(allTasks);
      setEvents(allEvents);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleProject = (id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredTasks = tasks.filter(t => selectedProjects.has(t.projectId) && showTasks);
  const filteredEvents = events.filter(e => selectedProjects.has(e.projectId) && showEvents);

  const getDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getItemsForDay = (dateStr: string) => ({
    tasks: filteredTasks.filter(t => t.dueDate === dateStr),
    events: filteredEvents.filter(e => e.date === dateStr),
  });

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const totalTasksMonth = filteredTasks.filter(t => t.dueDate.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length;
  const totalEventsMonth = filteredEvents.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length;

  const addEvent = async (projectId: string, date: string) => {
    if (!newEventTitle.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    const snap = await getDoc(doc(db, "projects", `${user.uid}_${projectId}`));
    if (!snap.exists()) return;
    const ev = { id: Math.random().toString(36).slice(2,10), title: newEventTitle.trim(), date, color: newEventColor, time: newEventTime, notes: "", type: "event" };
    const existingEvents = snap.data().events ?? [];
    await setDoc(doc(db, "projects", `${user.uid}_${projectId}`), { events: [...existingEvents, ev] }, { merge: true });
    const project = projects.find(p => p.id === projectId);
    setEvents(prev => [...prev, { ...ev, projectId, projectName: project?.name ?? "", projectColor1: project?.color1 ?? appliedA, projectColor2: project?.color2 ?? appliedB }]);
    setNewEventTitle(""); setNewEventTime(""); setAddModal(null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 60px", display: "flex", flexDirection: "column", gap: 16, background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span style={{ fontSize: 20, fontWeight: 900, backgroundImage: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Kalendár</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "5px 10px" }}>{totalTasksMonth} úloh · {totalEventsMonth} udalostí</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        {/* ── SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Type filter */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "14px", boxShadow: shadow }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 10 }}>Zobraziť</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Úlohy", value: showTasks, set: setShowTasks, color: appliedA, icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
                { label: "Udalosti", value: showEvents, set: setShowEvents, color: "#6366f1", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
              ].map(item => (
                <div key={item.label} onClick={() => item.set(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: 8, transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = item.color + "10"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${item.value ? item.color : theme.border}`, background: item.value ? item.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .15s", flexShrink: 0 }}>
                    {item.value && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.value ? theme.text : theme.muted }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project filter */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "14px", boxShadow: shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Projekty</div>
              <button onClick={() => setSelectedProjects(selectedProjects.size === projects.length ? new Set() : new Set(projects.map(p => p.id)))}
                style={{ fontSize: 10, fontWeight: 700, color: appliedA, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
                {selectedProjects.size === projects.length ? "Žiadne" : "Všetky"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {projects.map(p => {
                const active = selectedProjects.has(p.id);
                return (
                  <div key={p.id} onClick={() => toggleProject(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 8px", borderRadius: 8, transition: "background .15s", background: active ? `linear-gradient(135deg, ${p.color1}12, ${p.color2}08)` : "transparent" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = headerBg; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: active ? `linear-gradient(135deg, ${p.color1}, ${p.color2})` : theme.border, flexShrink: 0, transition: "all .15s" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? theme.text : theme.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                    {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color1, flexShrink: 0 }} />}
                  </div>
                );
              })}
              {projects.length === 0 && <div style={{ fontSize: 12, color: theme.muted, textAlign: "center", padding: "8px 0" }}>Žiadne projekty</div>}
            </div>
          </div>

          {/* Mini month nav */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "14px", boxShadow: shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{MONTH_NAMES[month]} {year}</span>
              <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <button onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ width: "100%", background: grad, border: "none", borderRadius: 8, padding: "7px", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Dnes</button>
          </div>
        </div>

        {/* ── CALENDAR GRID ── */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: shadow, animation: "fadeIn .25s ease" }}>
          {/* Gradient header */}
          <div style={{ background: grad, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", bottom: -20, right: 60, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{MONTH_NAMES[month]}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginTop: 2 }}>{year} · {totalTasksMonth} úloh · {totalEventsMonth} udalostí</div>
          </div>

          {/* Day names */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: surface, borderBottom: `1px solid ${theme.border}` }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 800, color: i >= 5 ? appliedA : theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: surface }}>
            {cells.map((day, i) => {
              const dateStr = day ? getDateStr(year, month, day) : "";
              const { tasks: dTasks, events: dEvents } = day ? getItemsForDay(dateStr) : { tasks: [], events: [] };
              const all = [...dEvents, ...dTasks];
              const isCurrentDay = day ? isToday(day) : false;
              const isWeekend = i % 7 >= 5;
              const maxVisible = 3;

              return (
                <div key={i} style={{
                  minHeight: 110,
                  borderRight: (i + 1) % 7 !== 0 ? `1px solid ${theme.border}` : "none",
                  borderBottom: i < cells.length - 7 ? `1px solid ${theme.border}` : "none",
                  padding: "6px",
                  background: !day ? (darkMode ? theme.card2 + "40" : "#f7f8fc") : isWeekend ? (darkMode ? appliedA + "06" : appliedA + "04") : surface,
                  cursor: day ? "pointer" : "default",
                  transition: "background .15s",
                }}
                onClick={() => { if (!day) return; const d = getItemsForDay(dateStr); if (d.tasks.length || d.events.length) setDayModal({ date: dateStr, ...d }); else if (projects.length > 0) setAddModal({ date: dateStr, projectId: projects[0].id }); }}
                onMouseEnter={e => { if (day) e.currentTarget.style.background = darkMode ? appliedA + "12" : appliedA + "07"; }}
                onMouseLeave={e => { if (day) e.currentTarget.style.background = !day ? (darkMode ? theme.card2 + "40" : "#f7f8fc") : isWeekend ? (darkMode ? appliedA + "06" : appliedA + "04") : surface; }}
                >
                  {day && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: all.length ? 4 : 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: isCurrentDay ? grad : "transparent", boxShadow: isCurrentDay ? `0 2px 8px ${appliedA}55` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isCurrentDay ? 900 : isWeekend ? 600 : 400, color: isCurrentDay ? "#fff" : isWeekend ? appliedA : theme.text }}>
                          {day}
                        </div>
                        {all.length > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: appliedA, opacity: 0.4 }} />}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {all.slice(0, maxVisible).map((item, idx) => {
                          const isEvent = "title" in item;
                          const color = isEvent ? (item as CalEvent).color : STATUS_CONFIG[(item as CalTask).status].color;
                          const bg = isEvent ? (item as CalEvent).color + "22" : (darkMode ? STATUS_CONFIG[(item as CalTask).status].color + "22" : STATUS_CONFIG[(item as CalTask).status].bg);
                          const label = isEvent ? (item as CalEvent).title : (item as CalTask).name;
                          return (
                            <div key={idx} onClick={e => { e.stopPropagation(); const d = getItemsForDay(dateStr); setDayModal({ date: dateStr, ...d }); }}
                              style={{ background: bg, color, borderRadius: 4, padding: "2px 5px", fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", borderLeft: `2.5px solid ${color}`, display: "flex", alignItems: "center", gap: 3 }}
                              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                            >
                              {!isEvent && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>}
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: `linear-gradient(135deg, ${(item as any).projectColor1}, ${(item as any).projectColor2})`, flexShrink: 0 }} />
                              {label}
                            </div>
                          );
                        })}
                        {all.length > maxVisible && (
                          <div style={{ fontSize: 10, color: appliedA, fontWeight: 700, paddingLeft: 4, cursor: "pointer" }}>+{all.length - maxVisible} ďalšie</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${theme.border}`, background: surface, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {projects.filter(p => selectedProjects.has(p.id)).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: `linear-gradient(135deg, ${p.color1}, ${p.color2})` }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: theme.muted }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAY DETAIL MODAL ── */}
      {dayModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setDayModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: surface, borderRadius: 20, padding: 20, width: "min(400px, 90vw)", maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, animation: "fadeIn .2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{dayModal.date}</div>
                <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{dayModal.tasks.length} úloh · {dayModal.events.length} udalostí</div>
              </div>
              <button onClick={() => setDayModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...dayModal.events, ...dayModal.tasks].map((item, idx) => {
                const isEvent = "title" in item;
                const color = isEvent ? (item as CalEvent).color : STATUS_CONFIG[(item as CalTask).status].color;
                const bg = isEvent ? (item as CalEvent).color + "18" : (darkMode ? STATUS_CONFIG[(item as CalTask).status].color + "18" : STATUS_CONFIG[(item as CalTask).status].bg);
                return (
                  <div key={idx} onClick={() => { router.push(`/project/${(item as any).projectId}`); setDayModal(null); }}
                    style={{ background: bg, borderRadius: 10, padding: "10px 12px", cursor: "pointer", borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{isEvent ? (item as CalEvent).title : (item as CalTask).name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: `linear-gradient(135deg, ${(item as any).projectColor1}, ${(item as any).projectColor2})` }} />
                      <span style={{ fontSize: 11, color: theme.muted, fontWeight: 600 }}>{(item as any).projectName}</span>
                      {isEvent && (item as CalEvent).time && <span style={{ fontSize: 10, color: theme.muted }}>· {(item as CalEvent).time}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => { setAddModal({ date: dayModal.date, projectId: projects[0]?.id ?? "" }); setDayModal(null); }} style={{ marginTop: 14, width: "100%", background: grad, border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Pridať udalosť
            </button>
          </div>
        </div>
      )}

      {/* ── ADD EVENT MODAL ── */}
      {addModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setAddModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: surface, borderRadius: 20, padding: 24, width: "min(400px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`, animation: "fadeIn .2s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Nová udalosť</div>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 18 }}>{addModal.date}</div>

            <input autoFocus value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Názov udalosti..." onKeyDown={e => { if (e.key === "Enter") addEvent(addModal.projectId, addModal.date); }}
              style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
              onFocus={e => e.target.style.borderColor = appliedA} onBlur={e => e.target.style.borderColor = theme.border} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 5 }}>Projekt</div>
                <select value={addModal.projectId} onChange={e => setAddModal({ ...addModal, projectId: e.target.value })} style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 8, padding: "7px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 5 }}>Čas</div>
                <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} style={{ width: "100%", background: headerBg, border: `1.5px solid ${theme.border}`, borderRadius: 8, padding: "7px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 8 }}>Farba</div>
              <div style={{ display: "flex", gap: 8 }}>
                {EVENT_COLORS.map(c => (
                  <div key={c} onClick={() => setNewEventColor(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: `3px solid ${newEventColor === c ? theme.text : "transparent"}`, boxShadow: newEventColor === c ? `0 0 0 2px ${c}` : "none", transition: "all .15s" }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAddModal(null)} style={{ flex: 1, background: "none", border: `1px solid ${theme.border}`, borderRadius: 12, padding: "10px", color: theme.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
              <button onClick={() => addEvent(addModal.projectId, addModal.date)} style={{ flex: 2, background: grad, border: "none", borderRadius: 12, padding: "10px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 14px ${appliedA}44` }}>Pridať udalosť</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}