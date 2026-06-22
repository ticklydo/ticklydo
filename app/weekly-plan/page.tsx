"use client";

import React, { useState, useEffect, useCallback } from "react";
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

type CalEvent = { id: string; title: string; date: string; time: string; color: string; notes?: string };
type Recurring = { id: string; name: string; days: string[]; doneDates: string[] };
type Todo = { id: string; text: string; done: boolean; color?: string };

const DAY_SHORT = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const DAY_MICRO = ["P", "U", "S", "Š", "P", "S", "N"];
const DAY_LONG = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const MONTHS = ["januára", "februára", "marca", "apríla", "mája", "júna", "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];
const MONTHS_NOM = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];

// ── Farebná paleta odvodená z TicklyDo loga (fialová → ružová/koralová → tyrkysová → modrá) ──
const LOGO_PALETTE = [
  { id: "violet", label: "Fialová", value: "#8b5cf6" },
  { id: "pink", label: "Ružová", value: "#ec4899" },
  { id: "coral", label: "Koralová", value: "#fb7185" },
  { id: "orange", label: "Oranžová", value: "#f97316" },
  { id: "teal", label: "Tyrkysová", value: "#14b8a6" },
  { id: "blue", label: "Modrá", value: "#3b82f6" },
];

// ── Farba pre každý deň v týždni (Po → Ne) v habit trackeri — 7 farieb z palety loga + 1 navyše ──
const DAY_COLORS = [
  "#8b5cf6", // Po — fialová
  "#ec4899", // Ut — ružová
  "#fb7185", // St — koralová
  "#f97316", // Št — oranžová
  "#eab308", // Pi — žltá
  "#14b8a6", // So — tyrkysová
  "#3b82f6", // Ne — modrá
];

function genId() { return Math.random().toString(36).slice(2, 10); }
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function getMonday(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Vráti 6 týždňov (42 dní) mriežky pre mesačný kalendár, začínajúc pondelkom.
function getMonthGrid(viewMonth: Date) {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = getMonday(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export default function WeeklyPlanPage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const weekId = toDateStr(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // mesiac aktuálne zobrazený v mesačnom kalendári (samostatný od weekStart, ale synchronizovaný pri zmene týždňa)
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());

  const [mainTasks, setMainTasks] = useState<Record<string, string>>({});
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dailyTodos, setDailyTodos] = useState<Record<string, Todo[]>>({});
  const [allEvents, setAllEvents] = useState<CalEvent[]>([]);

  const [editingDate, setEditingDate] = useState<string | null>(null);

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newRecurringName, setNewRecurringName] = useState("");
  const [newRecurringDays, setNewRecurringDays] = useState<string[]>([...DAY_SHORT]);
  const [newTodoText, setNewTodoText] = useState("");

  // ── editing an existing recurring habit (name + days) ──
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [editRecurringName, setEditRecurringName] = useState("");
  const [editRecurringDays, setEditRecurringDays] = useState<string[]>([]);

  // ── confirm-delete state for to-do items ──
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── confirm-delete state for recurring habits ──
  const [confirmDeleteRecurringId, setConfirmDeleteRecurringId] = useState<string | null>(null);

  // ── rýchle pridanie udalosti z bunky "Udalosti" v týždennom pláne ──
  const [addEventForDate, setAddEventForDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventColor, setNewEventColor] = useState<string>(LOGO_PALETTE[0].value);

  // ── denný to-do list (samostatný checklist pre každý deň) ──
  const [newDailyTodoText, setNewDailyTodoText] = useState<Record<string, string>>({});
  // ktorý "prázdny riadok" (index) je práve aktívny na zápis, pre daný deň (key = dateStr)
  const [activeDailyRow, setActiveDailyRow] = useState<Record<string, number | null>>({});
  const [confirmDeleteDaily, setConfirmDeleteDaily] = useState<{ date: string; id: string } | null>(null);

  // ── responsive: stacked day-cards under this width ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const MIN_DAILY_ROWS = isMobile ? 5 : 15;

  const surface = theme.card;
  const lineColor = theme.border;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.exists() ? snap.data() : {};
      setAllEvents(data.globalEvents ?? []);
    })();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    (async () => {
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", uid, "weeklyPlans", weekId));
      if (snap.exists()) {
        const d = snap.data();
        setMainTasks(d.mainTasks ?? {});
        setRecurring(d.recurring ?? []);
        setTodos(d.todos ?? []);
        setDailyTodos(d.dailyTodos ?? {});
      } else {
        setMainTasks({});
        setRecurring([]);
        setTodos([]);
        setDailyTodos({});
      }
      setLoading(false);
    })();
  }, [uid, weekId]);

  // reset any pending delete-confirmation when switching weeks
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [weekId]);

  // keď sa zmení týždeň, posuň zobrazený mesiac tak, aby vždy obsahoval ten týždeň
  useEffect(() => {
    setViewMonth(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  }, [weekId]);

  const save = useCallback(async (patch: Partial<{ mainTasks: Record<string, string>; recurring: Recurring[]; todos: Todo[]; dailyTodos: Record<string, Todo[]> }>) => {
    if (!uid) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", uid, "weeklyPlans", weekId), { ...patch, weekStart: weekId, updatedAt: Date.now() }, { merge: true });
  }, [uid, weekId]);

  const saveMainTask = (dateStr: string, value: string) => {
    const updated = { ...mainTasks, [dateStr]: value };
    setMainTasks(updated);
    save({ mainTasks: updated });
  };

  const toggleRecurringDone = (recId: string, dateStr: string) => {
    const updated = recurring.map(r => {
      if (r.id !== recId) return r;
      const has = r.doneDates.includes(dateStr);
      return { ...r, doneDates: has ? r.doneDates.filter(d => d !== dateStr) : [...r.doneDates, dateStr] };
    });
    setRecurring(updated);
    save({ recurring: updated });
  };

  const addRecurring = () => {
    if (!newRecurringName.trim() || newRecurringDays.length === 0) return;
    const updated = [...recurring, { id: genId(), name: newRecurringName.trim(), days: newRecurringDays, doneDates: [] }];
    setRecurring(updated);
    save({ recurring: updated });
    setNewRecurringName("");
    setNewRecurringDays([...DAY_SHORT]);
    setShowAddHabit(false);
  };

  // Krok 1: klik na X len OTVORÍ potvrdenie (nemaže hneď)
  const requestDeleteRecurring = (id: string) => {
    setConfirmDeleteRecurringId(id);
  };

  // Krok 2: až potvrdením v dialógu sa návyk naozaj natrvalo vymaže
  const confirmDeleteRecurring = () => {
    if (!confirmDeleteRecurringId) return;
    const updated = recurring.filter(r => r.id !== confirmDeleteRecurringId);
    setRecurring(updated);
    save({ recurring: updated });
    if (editingRecurringId === confirmDeleteRecurringId) cancelEditRecurring();
    setConfirmDeleteRecurringId(null);
  };

  const cancelDeleteRecurring = () => setConfirmDeleteRecurringId(null);

  const startEditRecurring = (r: Recurring) => {
    setShowAddHabit(false);
    setEditingRecurringId(r.id);
    setEditRecurringName(r.name);
    setEditRecurringDays(r.days);
  };

  const cancelEditRecurring = () => {
    setEditingRecurringId(null);
    setEditRecurringName("");
    setEditRecurringDays([]);
  };

  const saveEditRecurring = () => {
    if (!editingRecurringId || !editRecurringName.trim() || editRecurringDays.length === 0) return;
    const updated = recurring.map(r =>
      r.id === editingRecurringId
        ? { ...r, name: editRecurringName.trim(), days: editRecurringDays }
        : r
    );
    setRecurring(updated);
    save({ recurring: updated });
    cancelEditRecurring();
  };

  const copyRecurringFromPrevWeek = async () => {
    if (!uid) return;
    const prevWeekId = toDateStr(addDays(weekStart, -7));
    const { getFirestore, doc, getDoc } = await import("firebase/firestore");
    const db = getFirestore();
    const snap = await getDoc(doc(db, "users", uid, "weeklyPlans", prevWeekId));
    if (snap.exists()) {
      const prevRecurring: Recurring[] = snap.data().recurring ?? [];
      const updated = prevRecurring.map(r => ({ ...r, id: genId(), doneDates: [] }));
      setRecurring(updated);
      save({ recurring: updated });
    }
  };

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    const updated = [...todos, { id: genId(), text: newTodoText.trim(), done: false }];
    setTodos(updated);
    save({ todos: updated });
    setNewTodoText("");
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    save({ todos: updated });
  };

  // Krok 1: klik na košík len OTVORÍ potvrdenie (nemaže hneď)
  const requestDeleteTodo = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Krok 2: až potvrdením v dialógu sa úloha naozaj natrvalo vymaže
  const confirmDeleteTodo = () => {
    if (!confirmDeleteId) return;
    const updated = todos.filter(t => t.id !== confirmDeleteId);
    setTodos(updated);
    save({ todos: updated });
    setConfirmDeleteId(null);
  };

  const cancelDeleteTodo = () => setConfirmDeleteId(null);

  // ── denný to-do list (samostatný pre konkrétny deň) ──
  const addDailyTodo = (dateStr: string) => {
    const text = (newDailyTodoText[dateStr] || "").trim();
    if (!text) return;
    const updated = { ...dailyTodos, [dateStr]: [...(dailyTodos[dateStr] || []), { id: genId(), text, done: false }] };
    setDailyTodos(updated);
    save({ dailyTodos: updated });
    setNewDailyTodoText(p => ({ ...p, [dateStr]: "" }));
    setActiveDailyRow(p => ({ ...p, [dateStr]: null }));
  };

  const toggleDailyTodo = (dateStr: string, id: string) => {
    const updated = { ...dailyTodos, [dateStr]: (dailyTodos[dateStr] || []).map(t => t.id === id ? { ...t, done: !t.done } : t) };
    setDailyTodos(updated);
    save({ dailyTodos: updated });
  };

  const requestDeleteDailyTodo = (dateStr: string, id: string) => setConfirmDeleteDaily({ date: dateStr, id });
  const cancelDeleteDailyTodo = () => setConfirmDeleteDaily(null);
  const confirmDeleteDailyTodo = () => {
    if (!confirmDeleteDaily) return;
    const { date, id } = confirmDeleteDaily;
    const updated = { ...dailyTodos, [date]: (dailyTodos[date] || []).filter(t => t.id !== id) };
    setDailyTodos(updated);
    save({ dailyTodos: updated });
    setConfirmDeleteDaily(null);
  };

  const eventsForDate = (dateStr: string) => allEvents.filter(e => e.date === dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const openAddEvent = (dateStr: string) => {
    setAddEventForDate(dateStr);
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventColor(LOGO_PALETTE[0].value);
  };

  const cancelAddEvent = () => {
    setAddEventForDate(null);
    setNewEventTitle("");
    setNewEventTime("");
  };

  // Uloží novú udalosť do toho istého globálneho úložiska (users/{uid}.globalEvents),
  // z ktorého appka čerpá udalosti pre hlavný Kalendár aj pre tento týždenný plán.
  const saveNewEvent = async () => {
    if (!uid || !addEventForDate || !newEventTitle.trim()) return;
    const newEvent: CalEvent = {
      id: genId(),
      title: newEventTitle.trim(),
      date: addEventForDate,
      time: newEventTime,
      color: newEventColor,
    };
    const updated = [...allEvents, newEvent];
    setAllEvents(updated);
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", uid), { globalEvents: updated }, { merge: true });
    cancelAddEvent();
  };

  const doneTodos = todos.filter(t => t.done).length;
  const todoPct = todos.length > 0 ? Math.round((doneTodos / todos.length) * 100) : 0;

  const rangeLabel = `${weekDays[0].getDate()}. ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()}. ${MONTHS[weekDays[6].getMonth()]}`;

  if (loading && uid === null) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  const todoToDelete = todos.find(t => t.id === confirmDeleteId) || null;
  const recurringToDelete = recurring.find(r => r.id === confirmDeleteRecurringId) || null;
  const dailyTodoToDelete = confirmDeleteDaily ? (dailyTodos[confirmDeleteDaily.date] || []).find(t => t.id === confirmDeleteDaily.id) || null : null;
  const monthGrid = getMonthGrid(viewMonth);
  const weekEnd = weekDays[6];

  // klik na deň v mesačnom kalendári → prepne na ten týždeň
  const jumpToWeekOf = (d: Date) => setWeekStart(getMonday(d));

  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "20px 20px 80px", display: "flex", flexDirection: "column", gap: 18, background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes wpFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes wpPopIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .wp-input::placeholder{color:${theme.muted}}
        .wp-scroll::-webkit-scrollbar{height:6px}
        .wp-scroll::-webkit-scrollbar-thumb{background:${theme.border};border-radius:3px}
        .wp-side { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:16px; }
        @media (max-width: 760px) { .wp-side { grid-template-columns: 1fr; } }
        @media (max-width: 720px) {
          .wp-banner { padding: 10px 14px !important; border-radius: 12px !important; }
          .wp-banner-label { font-size: 9px !important; letter-spacing: 1px !important; }
          .wp-banner-range { font-size: 13px !important; margin-top: 0 !important; }
          .wp-banner-nav button { height: 26px !important; width: 26px !important; padding: 0 10px !important; font-size: 11px !important; }
          .wp-banner-nav button svg { width: 11px !important; height: 11px !important; }
          .wp-month-cell { font-size: 10px !important; height: 30px !important; }
        }
        .wp-month-cell { transition: background .15s ease, transform .1s ease; }
        .wp-month-cell:hover { transform: scale(1.04); }
        .wp-todo-swatch { transition: transform .12s ease; }
        .wp-todo-swatch:hover { transform: scale(1.18); }
        @media (max-width: 860px) {
          .wp-bottom-row { flex-direction: column; }
          .wp-bottom-row > div { flex-basis: auto !important; width: 100%; }
        }
      `}</style>

      {/* Banner header */}
      <div className="wp-banner" style={{
        borderRadius: 18, padding: "16px 20px",
        background: grad, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        boxShadow: `0 8px 24px ${appliedA}3d`,
        flexShrink: 0,
      }}>
        <div>
          <div className="wp-banner-label" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "2px", opacity: 0.85, textTransform: "uppercase" }}>Týždenný plán</div>
          <div className="wp-banner-range" style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{rangeLabel}</div>
        </div>
        <div className="wp-banner-nav" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => setWeekStart(getMonday(new Date()))} style={{ height: 32, padding: "0 14px", borderRadius: 9, background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-geist-sans)", whiteSpace: "nowrap" }}>
            Dnes
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* ── MESAČNÝ KALENDÁR (vľavo) + DNI TÝŽDŇA (vpravo) — vedľa seba ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: isMobile ? "wrap" : "nowrap", flexShrink: 0 }}>

        {/* Ľavý stĺpec: kalendár hore, opakujúce sa činnosti + to-do list hneď pod ním (bez medzery) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flexShrink: 0, width: isMobile ? "100%" : 340 }}>

        {/* Mesačný kalendár so zvýrazneným aktuálnym týždňom */}
        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${lineColor}`, padding: isMobile ? 10 : 14, flexShrink: 0, width: isMobile ? "100%" : 340 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: isMobile ? 11 : 12.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{MONTHS_NOM[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={{ width: isMobile ? 18 : 22, height: isMobile ? 18 : 22, borderRadius: 6, background: theme.card2, border: `1px solid ${lineColor}`, color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={{ width: isMobile ? 18 : 22, height: isMobile ? 18 : 22, borderRadius: 6, background: theme.card2, border: `1px solid ${lineColor}`, color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 1.5 : 3 }}>
            {DAY_MICRO.map((d, i) => (
              <div key={"dm" + i} style={{ textAlign: "center", fontSize: isMobile ? 8 : 9, fontWeight: 800, color: theme.muted, padding: "1px 0" }}>{d}</div>
            ))}
            {monthGrid.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const today = isToday(d);
              const inSelectedWeek = d >= weekStart && d <= weekEnd;
              return (
                <div
                  key={"mg" + i}
                  className="wp-month-cell"
                  onClick={() => jumpToWeekOf(d)}
                  style={{
                    height: isMobile ? 20 : 26, borderRadius: isMobile ? 5 : 7, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isMobile ? 9 : 10.5, fontWeight: today ? 900 : 600,
                    color: !inMonth ? theme.muted : today ? "#fff" : theme.text,
                    opacity: inMonth ? 1 : 0.35,
                    background: today
                      ? appliedA
                      : inSelectedWeek
                        ? appliedA + "22"
                        : "transparent",
                    border: inSelectedWeek && !today ? `1px solid ${appliedA}55` : "1px solid transparent",
                    borderTopLeftRadius: inSelectedWeek && isSameDay(d, weekStart) ? (isMobile ? 5 : 7) : (inSelectedWeek ? 0 : (isMobile ? 5 : 7)),
                    borderBottomLeftRadius: inSelectedWeek && isSameDay(d, weekStart) ? (isMobile ? 5 : 7) : (inSelectedWeek ? 0 : (isMobile ? 5 : 7)),
                    borderTopRightRadius: inSelectedWeek && isSameDay(d, weekEnd) ? (isMobile ? 5 : 7) : (inSelectedWeek ? 0 : (isMobile ? 5 : 7)),
                    borderBottomRightRadius: inSelectedWeek && isSameDay(d, weekEnd) ? (isMobile ? 5 : 7) : (inSelectedWeek ? 0 : (isMobile ? 5 : 7)),
                  }}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>

      {/* ── TO-DO LIST (vľavo) + OPAKUJÚCE SA ČINNOSTI (vpravo) — vedľa seba ── */}
      <div className="wp-bottom-row" style={{ display: "flex", flexDirection: "column", gap: 14, flexShrink: 0, width: isMobile ? "100%" : 340 }}>

      {/* ── HABIT TRACKER GRID ── */}
      <div style={{ background: surface, borderRadius: 14, border: `1px solid ${lineColor}`, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${lineColor}`, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            Opakujúce sa činnosti
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={copyRecurringFromPrevWeek} style={{ background: "none", border: `1px solid ${lineColor}`, borderRadius: 7, padding: "5px 10px", color: theme.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", whiteSpace: "nowrap" }}>
              {isMobile ? "Skopírovať min." : "Skopírovať min. týždeň"}
            </button>
            <button onClick={() => { cancelEditRecurring(); setShowAddHabit(v => !v); }} style={{ background: appliedA + "16", border: `1px solid ${appliedA}33`, borderRadius: 7, padding: "5px 10px", color: appliedA, fontSize: 10.5, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-geist-sans)", whiteSpace: "nowrap" }}>
              {showAddHabit ? "✕ Zavrieť" : "+ Nová"}
            </button>
          </div>
        </div>

        {showAddHabit && (
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${lineColor}`, display: "flex", flexDirection: "column", gap: 8, background: theme.card2 }}>
            <input
              autoFocus
              value={newRecurringName}
              onChange={e => setNewRecurringName(e.target.value)}
              placeholder="Názov činnosti (napr. Cvičenie)"
              className="wp-input"
              style={{ width: "100%", background: surface, border: `1.5px solid ${lineColor}`, borderRadius: 9, padding: "8px 11px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DAY_SHORT.map(ds => {
                const active = newRecurringDays.includes(ds);
                return (
                  <div key={ds} onClick={() => setNewRecurringDays(p => active ? p.filter(x => x !== ds) : [...p, ds])} style={{ padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, background: active ? appliedA : surface, color: active ? "#fff" : theme.muted, border: `1px solid ${active ? appliedA : lineColor}` }}>{ds}</div>
                );
              })}
            </div>
            <button onClick={addRecurring} disabled={!newRecurringName.trim() || newRecurringDays.length === 0} style={{ background: !newRecurringName.trim() || newRecurringDays.length === 0 ? lineColor : grad, border: "none", borderRadius: 9, padding: "8px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: !newRecurringName.trim() || newRecurringDays.length === 0 ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>Pridať</button>
          </div>
        )}

        {recurring.length === 0 ? (
          <div style={{ padding: "20px 16px", fontSize: 12, color: theme.muted, fontStyle: "italic", textAlign: "center" }}>Žiadne opakujúce sa činnosti</div>
        ) : (
          /* ── Dni ako stĺpce — šírka sa prizpôsobí, aby sa zmestili bez scrollovania ── */
          <div className="wp-scroll" style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? `minmax(70px, 2.2fr) repeat(7, 1fr)` : `minmax(70px, 1fr) repeat(7, 28px)` }}>
              {/* header */}
              <div style={{ padding: isMobile ? "8px 4px" : "8px 8px", fontSize: 10, fontWeight: 800, color: theme.muted, borderBottom: `1px solid ${lineColor}` }} />
              {DAY_SHORT.map((ds, i) => (
                <div key={ds} style={{ padding: isMobile ? "8px 1px" : "8px 2px", textAlign: "center", fontSize: isMobile ? 8.5 : 9, fontWeight: 800, color: DAY_COLORS[i], borderBottom: `1px solid ${lineColor}`, borderLeft: i === 0 ? `1px solid ${lineColor}` : "none" }}>{ds}</div>
              ))}

              {recurring.map((r, ri) => {
                const isLast = ri === recurring.length - 1;
                const isEditingThis = editingRecurringId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <div style={{ padding: isMobile ? "9px 4px" : "9px 8px", fontSize: isMobile ? 10.5 : 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, borderBottom: isLast && !isEditingThis ? "none" : `1px solid ${lineColor}` }}>
                      <span
                        onClick={() => isEditingThis ? cancelEditRecurring() : startEditRecurring(r)}
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                        title="Upraviť názov a dni"
                      >
                        {r.name}
                      </span>
                      <span onClick={() => requestDeleteRecurring(r.id)} style={{ cursor: "pointer", color: "#ef4444", opacity: 0.6, flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </span>
                    </div>
                    {DAY_SHORT.map((ds, di) => {
                      const applies = r.days.includes(ds);
                      const dateStr = toDateStr(weekDays[di]);
                      const done = r.doneDates.includes(dateStr);
                      const dayColor = DAY_COLORS[di];
                      return (
                        <div key={ds} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderBottom: isLast && !isEditingThis ? "none" : `1px solid ${lineColor}`, borderLeft: `1px solid ${lineColor}` }}>
                          {applies ? (
                            <div onClick={() => toggleRecurringDone(r.id, dateStr)} style={{ width: isMobile ? 15 : 16, height: isMobile ? 15 : 16, borderRadius: 4, cursor: "pointer", border: `1.5px solid ${done ? dayColor : lineColor}`, background: done ? dayColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {done && <svg width={isMobile ? 10 : 9} height={isMobile ? 10 : 9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          ) : (
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: lineColor }} />
                          )}
                        </div>
                      );
                    })}
                    {isEditingThis && (
                      <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: theme.card2, borderBottom: isLast ? "none" : `1px solid ${lineColor}`, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          autoFocus
                          value={editRecurringName}
                          onChange={e => setEditRecurringName(e.target.value)}
                          placeholder="Názov činnosti"
                          className="wp-input"
                          style={{ width: "100%", background: surface, border: `1.5px solid ${lineColor}`, borderRadius: 9, padding: "8px 11px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                        />
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {DAY_SHORT.map(ds => {
                            const active = editRecurringDays.includes(ds);
                            return (
                              <div key={ds} onClick={() => setEditRecurringDays(p => active ? p.filter(x => x !== ds) : [...p, ds])} style={{ padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, background: active ? appliedA : surface, color: active ? "#fff" : theme.muted, border: `1px solid ${active ? appliedA : lineColor}` }}>{ds}</div>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={cancelEditRecurring} style={{ flex: 1, background: surface, border: `1px solid ${lineColor}`, borderRadius: 9, padding: "8px", color: theme.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                          <button onClick={saveEditRecurring} disabled={!editRecurringName.trim() || editRecurringDays.length === 0} style={{ flex: 1, background: !editRecurringName.trim() || editRecurringDays.length === 0 ? lineColor : grad, border: "none", borderRadius: 9, padding: "8px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: !editRecurringName.trim() || editRecurringDays.length === 0 ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>Uložiť</button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── TODO LIST ── */}
      <div style={{ background: surface, borderRadius: 14, border: `1px solid ${lineColor}`, padding: 18, display: "flex", flexDirection: "column", gap: 12, position: "relative", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            To-do list týždňa
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: appliedA }}>{todoPct}%</div>
        </div>

        <div style={{ height: 6, borderRadius: 3, background: lineColor, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${todoPct}%`, background: grad, transition: "width .3s ease" }} />
        </div>

        {todos.length === 0 && <div style={{ fontSize: 12, color: theme.muted, fontStyle: "italic" }}>Žiadne úlohy v zozname</div>}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {todos.map((t, ti) => {
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", borderBottom: ti < todos.length - 1 ? `1px dashed ${lineColor}` : "none" }}>
                <div onClick={() => toggleTodo(t.id)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: `1.5px solid ${t.done ? appliedA : lineColor}`, background: t.done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex: 1, fontSize: 13, color: t.done ? theme.muted : theme.text, textDecoration: t.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{t.text}</div>
                <div onClick={() => requestDeleteTodo(t.id)} style={{ cursor: "pointer", color: "#ef4444", flexShrink: 0, opacity: 0.6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${lineColor}` }}>
          <input
            value={newTodoText}
            onChange={e => setNewTodoText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
            placeholder="Nová úloha..."
            className="wp-input"
            style={{ flex: 1, background: theme.card2, border: `1.5px solid ${lineColor}`, borderRadius: 9, padding: "8px 11px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
          />
          <button onClick={addTodo} disabled={!newTodoText.trim()} style={{ background: !newTodoText.trim() ? lineColor : grad, border: "none", borderRadius: 9, padding: "0 16px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: !newTodoText.trim() ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>+</button>
        </div>
      </div>

      </div>

      </div>

        {/* Dni týždňa: Po–Ne ako STĹPCE, priorita + udalosti ako riadky */}
        <div className="wp-scroll" style={{ flex: isMobile ? "1 1 100%" : 1, width: isMobile ? "100%" : "auto", minWidth: 0, overflowX: "auto", background: surface, borderRadius: 12, border: `1px solid ${lineColor}`, display: "flex", flexDirection: "column" }}>
          {/* nadpis na rovnakej výške ako "Jún 2026" v kalendári vedľa */}
          <div style={{ padding: isMobile ? "10px 12px 0" : "14px 14px 0", flexShrink: 0 }}>
            <div style={{ height: isMobile ? 18 : 22, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: isMobile ? 11 : 12.5, fontWeight: 800 }}>Prehľad týždňa</span>
            </div>
            <div style={{ fontSize: isMobile ? 8 : 9, padding: "1px 0", visibility: "hidden" }}>.</div>
          </div>
          {isMobile ? (
            /* ── MOBILE: každý deň ako samostatný blok pod sebou ── */
            <div style={{ display: "flex", flexDirection: "column" }}>
              {weekDays.map((d, i) => {
                const dateStr = toDateStr(d);
                const today = isToday(d);
                const isEditing = editingDate === dateStr;
                const dayEvents = eventsForDate(dateStr);
                const isAdding = addEventForDate === dateStr;
                const dayTodos = dailyTodos[dateStr] || [];
                const activeRow = activeDailyRow[dateStr] ?? null;
                const emptyRowsCount = Math.max(MIN_DAILY_ROWS - dayTodos.length, activeRow !== null ? activeRow - dayTodos.length + 1 : 0);
                const isLastDay = i === 6;
                const dayColor = DAY_COLORS[i];
                return (
                  <div key={"day" + i} style={{ borderBottom: isLastDay ? "none" : `1px solid ${lineColor}`, background: today ? appliedA + "08" : "transparent" }}>
                    {/* deň header */}
                    <div style={{ padding: "8px 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between", background: today ? appliedA + "22" : dayColor + "1c" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: today ? appliedA : dayColor }}>{DAY_LONG[i]}</span>
                      <span style={{ fontSize: 10, color: theme.muted, fontWeight: 600 }}>{d.getDate()}.{d.getMonth() + 1}.</span>
                    </div>

                    {/* Hlavná úloha */}
                    <div style={{ padding: "6px 12px" }}>
                      <div style={{ fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", padding: "3px 4px", background: dayColor + "cc", margin: "-6px -12px 6px" }}>Hlavná úloha</div>
                      {isEditing ? (
                        <input
                          autoFocus
                          className="wp-input"
                          defaultValue={mainTasks[dateStr] ?? ""}
                          onBlur={e => { saveMainTask(dateStr, e.target.value); setEditingDate(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { saveMainTask(dateStr, e.currentTarget.value); setEditingDate(null); } if (e.key === "Escape") setEditingDate(null); }}
                          placeholder="napíš úlohu..."
                          style={{ width: "100%", background: theme.card2, border: `1.5px solid ${appliedA}`, borderRadius: 6, padding: "5px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                        />
                      ) : (
                        <div onClick={() => setEditingDate(dateStr)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: mainTasks[dateStr] ? theme.text : theme.muted }}>
                          {mainTasks[dateStr] || "+ pridať prioritu"}
                        </div>
                      )}
                    </div>

                    {/* Udalosť */}
                    <div style={{ padding: "6px 12px", position: "relative" }}>
                      <div style={{ fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", padding: "3px 4px", background: dayColor + "cc", margin: "-6px -12px 6px" }}>Udalosť</div>
                      {dayEvents.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: theme.muted }}>—</span>
                          <span onClick={() => isAdding ? cancelAddEvent() : openAddEvent(dateStr)} style={{ fontSize: 12, fontWeight: 800, color: appliedA, cursor: "pointer" }}>{isAdding ? "✕" : "+"}</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {dayEvents.map((ev, evi) => (
                            <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color || appliedA, flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ev.time ? `${ev.time} ` : ""}{ev.title}</span>
                              {evi === dayEvents.length - 1 && (
                                <span onClick={() => isAdding ? cancelAddEvent() : openAddEvent(dateStr)} style={{ fontSize: 12, fontWeight: 800, color: appliedA, cursor: "pointer", flexShrink: 0 }}>{isAdding ? "✕" : "+"}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isAdding && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 6, background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            autoFocus
                            value={newEventTitle}
                            onChange={e => setNewEventTitle(e.target.value)}
                            placeholder="Názov udalosti"
                            className="wp-input"
                            style={{ width: "100%", background: surface, border: `1.5px solid ${lineColor}`, borderRadius: 7, padding: "6px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 11.5, outline: "none", boxSizing: "border-box" }}
                          />
                          <input
                            type="time"
                            value={newEventTime}
                            onChange={e => setNewEventTime(e.target.value)}
                            className="wp-input"
                            style={{ width: "100%", background: surface, border: `1.5px solid ${lineColor}`, borderRadius: 7, padding: "6px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 11.5, outline: "none", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {LOGO_PALETTE.map(c => (
                              <div
                                key={c.id}
                                className="wp-todo-swatch"
                                onClick={() => setNewEventColor(c.value)}
                                title={c.label}
                                style={{ width: 16, height: 16, borderRadius: "50%", background: c.value, cursor: "pointer", border: newEventColor === c.value ? `2px solid ${theme.text}` : "2px solid transparent", boxShadow: `0 0 0 1.5px ${surface}` }}
                              />
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={cancelAddEvent} style={{ flex: 1, background: surface, border: `1px solid ${lineColor}`, borderRadius: 7, padding: "6px", color: theme.muted, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                            <button onClick={saveNewEvent} disabled={!newEventTitle.trim()} style={{ flex: 1, background: !newEventTitle.trim() ? lineColor : grad, border: "none", borderRadius: 7, padding: "6px", color: "#fff", fontWeight: 800, fontSize: 11, cursor: !newEventTitle.trim() ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>Uložiť</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Úlohy dňa */}
                    <div style={{ padding: "6px 12px 12px" }}>
                      <div style={{ fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", padding: "3px 4px", background: dayColor + "cc", margin: "-6px -12px 6px" }}>Úlohy dňa</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {dayTodos.map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              onClick={() => toggleDailyTodo(dateStr, t.id)}
                              style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer", border: `1.5px solid ${t.done ? appliedA : lineColor}`, background: t.done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              {t.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <span style={{ fontSize: 12, flex: 1, minWidth: 0, color: t.done ? theme.muted : theme.text, textDecoration: t.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                            <span onClick={() => requestDeleteDailyTodo(dateStr, t.id)} style={{ cursor: "pointer", color: "#ef4444", opacity: 0.55, flexShrink: 0, fontSize: 11 }}>✕</span>
                          </div>
                        ))}
                        {Array.from({ length: emptyRowsCount }, (_, ei) => {
                          const rowIndex = dayTodos.length + ei;
                          const isActive = activeRow === rowIndex;
                          return (
                            <div key={"empty" + rowIndex} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px dashed ${lineColor}` }} />
                              {isActive ? (
                                <input
                                  autoFocus
                                  value={newDailyTodoText[dateStr] || ""}
                                  onChange={e => setNewDailyTodoText(p => ({ ...p, [dateStr]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") addDailyTodo(dateStr); if (e.key === "Escape") setActiveDailyRow(p => ({ ...p, [dateStr]: null })); }}
                                  onBlur={() => { if (!(newDailyTodoText[dateStr] || "").trim()) setActiveDailyRow(p => ({ ...p, [dateStr]: null })); }}
                                  placeholder="napíš úlohu..."
                                  className="wp-input"
                                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 12, padding: "2px 3px" }}
                                />
                              ) : (
                                <div onClick={() => setActiveDailyRow(p => ({ ...p, [dateStr]: rowIndex }))} style={{ flex: 1, minWidth: 0, height: 19, cursor: "pointer", borderBottom: `1px dashed ${lineColor}` }} />
                              )}
                            </div>
                          );
                        })}
                        <div onClick={() => setActiveDailyRow(p => ({ ...p, [dateStr]: dayTodos.length + emptyRowsCount }))} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 2, opacity: 0.7 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: appliedA, lineHeight: 1 }}>+</span>
                          <span style={{ fontSize: 11.5, color: theme.muted }}>pridať riadok</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(7, minmax(${isMobile ? 62 : 86}px, 1fr))`, gridTemplateRows: "auto auto auto auto", flex: 1, minWidth: isMobile ? 62 * 7 : undefined }}>
            {/* day header row */}
            {weekDays.map((d, i) => {
              const today = isToday(d);
              const dayColor = DAY_COLORS[i];
              return (
                <div key={"h" + i} style={{
                  padding: isMobile ? "5px 2px" : "7px 4px", textAlign: "center",
                  borderBottom: `1px solid ${lineColor}`,
                  borderLeft: i === 0 ? "none" : `1px solid ${lineColor}`,
                  background: today ? appliedA + "22" : dayColor + "1c",
                }}>
                  <div style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 800, color: today ? appliedA : dayColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isMobile ? DAY_SHORT[i] : DAY_LONG[i]}</div>
                  <div style={{ fontSize: isMobile ? 8.5 : 9.5, color: theme.muted, fontWeight: 600 }}>{d.getDate()}.{d.getMonth() + 1}.</div>
                </div>
              );
            })}

            {/* priority row — s malým labelom "Hlavná úloha" v každej bunke */}
            {weekDays.map((d, i) => {
              const dateStr = toDateStr(d);
              const isEditing = editingDate === dateStr;
              const today = isToday(d);
              const dayColor = DAY_COLORS[i];
              return (
                <div key={"m" + i} style={{
                  padding: isMobile ? 4 : 6,
                  borderBottom: `1px solid ${lineColor}`,
                  borderLeft: i === 0 ? "none" : `1px solid ${lineColor}`,
                  background: today ? appliedA + "08" : "transparent",
                  minHeight: isMobile ? 48 : 58,
                }}>
                  <div style={{ fontSize: isMobile ? 7.5 : 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", padding: "3px 4px", textAlign: "center", background: dayColor + "cc", margin: isMobile ? "-4px -4px 4px" : "-6px -6px 4px" }}>
                    Hlavná úloha
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      className="wp-input"
                      defaultValue={mainTasks[dateStr] ?? ""}
                      onBlur={e => { saveMainTask(dateStr, e.target.value); setEditingDate(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { saveMainTask(dateStr, e.currentTarget.value); setEditingDate(null); } if (e.key === "Escape") setEditingDate(null); }}
                      placeholder="..."
                      style={{ width: "100%", background: theme.card2, border: `1.5px solid ${appliedA}`, borderRadius: 5, padding: "4px 6px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: isMobile ? 10.5 : 11.5, outline: "none", boxSizing: "border-box" }}
                    />
                  ) : (
                    <div onClick={() => setEditingDate(dateStr)} style={{
                      cursor: "pointer", fontSize: isMobile ? 10.5 : 11.5, fontWeight: 700, lineHeight: 1.3,
                      color: mainTasks[dateStr] ? theme.text : theme.muted,
                      padding: "1px 4px",
                      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      wordBreak: "break-word",
                    }}>
                      {mainTasks[dateStr] || "+ "}
                    </div>
                  )}
                </div>
              );
            })}

            {/* events row — s malým labelom "Udalosť" v každej bunke */}
            {weekDays.map((d, i) => {
              const dateStr = toDateStr(d);
              const dayEvents = eventsForDate(dateStr);
              const today = isToday(d);
              const isAdding = addEventForDate === dateStr;
              const dayColor = DAY_COLORS[i];
              return (
                <div key={"e" + i} style={{
                  position: "relative",
                  padding: isMobile ? "4px 4px" : "6px 6px",
                  borderLeft: i === 0 ? "none" : `1px solid ${lineColor}`,
                  borderBottom: `1px solid ${lineColor}`,
                  background: today ? appliedA + "08" : "transparent",
                  minHeight: isMobile ? 44 : 54,
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ fontSize: isMobile ? 7.5 : 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", padding: "3px 4px", textAlign: "center", background: dayColor + "cc", margin: isMobile ? "-4px -4px 4px" : "-6px -6px 4px", flexShrink: 0 }}>
                    Udalosť
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  {dayEvents.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: isMobile ? 10 : 11, color: theme.muted }}>—</span>
                      <span
                        onClick={() => isAdding ? cancelAddEvent() : openAddEvent(dateStr)}
                        title="Pridať udalosť"
                        style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: appliedA, cursor: "pointer", lineHeight: 1, opacity: 0.85 }}
                      >
                        {isAdding ? "✕" : "+"}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {dayEvents.map((ev, evi) => (
                        <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: isMobile ? 9.5 : 10.5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color || appliedA, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ev.time ? `${ev.time} ` : ""}{ev.title}</span>
                          {evi === dayEvents.length - 1 && (
                            <span
                              onClick={() => isAdding ? cancelAddEvent() : openAddEvent(dateStr)}
                              title="Pridať udalosť"
                              style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: appliedA, cursor: "pointer", lineHeight: 1, opacity: 0.85, flexShrink: 0 }}
                            >
                              {isAdding ? "✕" : "+"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>

                  {isAdding && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
                        width: 190, background: surface, border: `1px solid ${lineColor}`,
                        borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                        padding: 10, display: "flex", flexDirection: "column", gap: 6,
                      }}
                    >
                      <input
                        autoFocus
                        value={newEventTitle}
                        onChange={e => setNewEventTitle(e.target.value)}
                        placeholder="Názov udalosti"
                        className="wp-input"
                        style={{ width: "100%", background: theme.card2, border: `1.5px solid ${lineColor}`, borderRadius: 7, padding: "6px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 11.5, outline: "none", boxSizing: "border-box" }}
                      />
                      <input
                        type="time"
                        value={newEventTime}
                        onChange={e => setNewEventTime(e.target.value)}
                        className="wp-input"
                        style={{ width: "100%", background: theme.card2, border: `1.5px solid ${lineColor}`, borderRadius: 7, padding: "6px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 11.5, outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {LOGO_PALETTE.map(c => (
                          <div
                            key={c.id}
                            className="wp-todo-swatch"
                            onClick={() => setNewEventColor(c.value)}
                            title={c.label}
                            style={{
                              width: 16, height: 16, borderRadius: "50%", background: c.value, cursor: "pointer",
                              border: newEventColor === c.value ? `2px solid ${theme.text}` : "2px solid transparent",
                              boxShadow: `0 0 0 1.5px ${surface}`,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={cancelAddEvent} style={{ flex: 1, background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 7, padding: "6px", color: theme.muted, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                        <button onClick={saveNewEvent} disabled={!newEventTitle.trim()} style={{ flex: 1, background: !newEventTitle.trim() ? lineColor : grad, border: "none", borderRadius: 7, padding: "6px", color: "#fff", fontWeight: 800, fontSize: 11, cursor: !newEventTitle.trim() ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>Uložiť</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* denný to-do list — samostatný checklist pre každý deň, vyplní zvyšný priestor */}
            {weekDays.map((d, i) => {
              const dateStr = toDateStr(d);
              const dayTodos = dailyTodos[dateStr] || [];
              const today = isToday(d);
              const activeRow = activeDailyRow[dateStr] ?? null;
              // počet prázdnych riadkov pripravených navyše (vždy aspoň MIN_DAILY_ROWS, alebo viac ak si aktívny riadok presahuje za hranicu)
              const emptyRowsCount = Math.max(MIN_DAILY_ROWS - dayTodos.length, activeRow !== null ? activeRow - dayTodos.length + 1 : 0);
              const dayColor = DAY_COLORS[i];
              return (
                <div key={"dt" + i} style={{
                  padding: isMobile ? "4px 4px" : "6px 6px",
                  borderLeft: i === 0 ? "none" : `1px solid ${lineColor}`,
                  background: today ? appliedA + "08" : "transparent",
                  display: "flex", flexDirection: "column", minHeight: isMobile ? 50 : 60,
                }}>
                  <div style={{ fontSize: isMobile ? 7.5 : 8, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", padding: "3px 4px", textAlign: "center", background: dayColor + "cc", margin: isMobile ? "-4px -4px 4px" : "-6px -6px 4px", flexShrink: 0 }}>
                    Úlohy dňa
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {/* vyplnené úlohy */}
                    {dayTodos.map(t => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          onClick={() => toggleDailyTodo(dateStr, t.id)}
                          style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer",
                            border: `1.5px solid ${t.done ? appliedA : lineColor}`,
                            background: t.done ? appliedA : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {t.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <span style={{
                          fontSize: isMobile ? 11.5 : 12.5, flex: 1, minWidth: 0,
                          color: t.done ? theme.muted : theme.text,
                          textDecoration: t.done ? "line-through" : "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{t.text}</span>
                        <span onClick={() => requestDeleteDailyTodo(dateStr, t.id)} style={{ cursor: "pointer", color: "#ef4444", opacity: 0.55, flexShrink: 0, fontSize: 11 }}>✕</span>
                      </div>
                    ))}

                    {/* prázdne pripravené riadky (papierový plánovač) — klik otvorí inline pole na zápis */}
                    {Array.from({ length: emptyRowsCount }, (_, ei) => {
                      const rowIndex = dayTodos.length + ei;
                      const isActive = activeRow === rowIndex;
                      return (
                        <div key={"empty" + rowIndex} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: `1.5px dashed ${lineColor}`,
                          }} />
                          {isActive ? (
                            <input
                              autoFocus
                              value={newDailyTodoText[dateStr] || ""}
                              onChange={e => setNewDailyTodoText(p => ({ ...p, [dateStr]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") addDailyTodo(dateStr); if (e.key === "Escape") setActiveDailyRow(p => ({ ...p, [dateStr]: null })); }}
                              onBlur={() => { if (!(newDailyTodoText[dateStr] || "").trim()) setActiveDailyRow(p => ({ ...p, [dateStr]: null })); }}
                              placeholder="napíš úlohu..."
                              className="wp-input"
                              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: isMobile ? 11.5 : 12.5, padding: "2px 3px" }}
                            />
                          ) : (
                            <div
                              onClick={() => setActiveDailyRow(p => ({ ...p, [dateStr]: rowIndex }))}
                              style={{ flex: 1, minWidth: 0, height: isMobile ? 17 : 19, cursor: "pointer", borderBottom: `1px dashed ${lineColor}` }}
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* posledný riadok — pridá ďalší prázdny riadok navyše */}
                    <div
                      onClick={() => setActiveDailyRow(p => ({ ...p, [dateStr]: dayTodos.length + emptyRowsCount }))}
                      style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 2, opacity: 0.7 }}
                    >
                      <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: appliedA, lineHeight: 1 }}>+</span>
                      <span style={{ fontSize: isMobile ? 10.5 : 11.5, color: theme.muted }}>pridať riadok</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>



      {/* ── CONFIRM DELETE MODAL (to-do úlohy) ── */}
      {confirmDeleteId && (
        <div
          onClick={cancelDeleteTodo}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            animation: "wpFadeIn .15s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: surface, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%",
              border: `1px solid ${lineColor}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              animation: "wpPopIn .18s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.text }}>Odstrániť úlohu?</div>
            </div>

            <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 6 }}>
              {todoToDelete && (
                <>Úloha „<strong style={{ color: theme.text }}>{todoToDelete.text}</strong>" bude natrvalo odstránená.</>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginBottom: 18 }}>
              Táto akcia sa nedá vrátiť späť.
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={cancelDeleteTodo}
                style={{
                  background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9,
                  padding: "8px 16px", color: theme.text, fontWeight: 700, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={confirmDeleteTodo}
                style={{
                  background: "#ef4444", border: "none", borderRadius: 9,
                  padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Odstrániť natrvalo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL (opakujúca sa činnosť) ── */}
      {confirmDeleteRecurringId && (
        <div
          onClick={cancelDeleteRecurring}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            animation: "wpFadeIn .15s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: surface, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%",
              border: `1px solid ${lineColor}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              animation: "wpPopIn .18s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.text }}>Odstrániť činnosť?</div>
            </div>

            <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 6 }}>
              {recurringToDelete && (
                <>Opakujúca sa činnosť „<strong style={{ color: theme.text }}>{recurringToDelete.name}</strong>" aj jej história splnenia bude natrvalo odstránená.</>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginBottom: 18 }}>
              Táto akcia sa nedá vrátiť späť.
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={cancelDeleteRecurring}
                style={{
                  background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9,
                  padding: "8px 16px", color: theme.text, fontWeight: 700, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={confirmDeleteRecurring}
                style={{
                  background: "#ef4444", border: "none", borderRadius: 9,
                  padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Odstrániť natrvalo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL (úloha dňa) ── */}
      {confirmDeleteDaily && (
        <div
          onClick={cancelDeleteDailyTodo}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            animation: "wpFadeIn .15s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: surface, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%",
              border: `1px solid ${lineColor}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              animation: "wpPopIn .18s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.text }}>Odstrániť úlohu?</div>
            </div>

            <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 6 }}>
              {dailyTodoToDelete && (
                <>Úloha „<strong style={{ color: theme.text }}>{dailyTodoToDelete.text}</strong>" bude natrvalo odstránená.</>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginBottom: 18 }}>
              Táto akcia sa nedá vrátiť späť.
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={cancelDeleteDailyTodo}
                style={{
                  background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9,
                  padding: "8px 16px", color: theme.text, fontWeight: 700, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={confirmDeleteDailyTodo}
                style={{
                  background: "#ef4444", border: "none", borderRadius: 9,
                  padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "var(--font-geist-sans)",
                }}
              >
                Odstrániť natrvalo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}