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
type Todo = { id: string; text: string; done: boolean };

const DAY_SHORT = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const DAY_LONG = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const MONTHS = ["januára", "februára", "marca", "apríla", "mája", "júna", "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];

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

export default function WeeklyPlanPage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const weekId = toDateStr(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [mainTasks, setMainTasks] = useState<Record<string, string>>({});
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [allEvents, setAllEvents] = useState<CalEvent[]>([]);

  const [editingDate, setEditingDate] = useState<string | null>(null);

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newRecurringName, setNewRecurringName] = useState("");
  const [newRecurringDays, setNewRecurringDays] = useState<string[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  // ── confirm-delete state for to-do items ──
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── responsive: stacked day-cards under this width ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
      } else {
        setMainTasks({});
        setRecurring([]);
        setTodos([]);
      }
      setLoading(false);
    })();
  }, [uid, weekId]);

  // reset any pending delete-confirmation when switching weeks
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [weekId]);

  const save = useCallback(async (patch: Partial<{ mainTasks: Record<string, string>; recurring: Recurring[]; todos: Todo[] }>) => {
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
    setNewRecurringDays([]);
    setShowAddHabit(false);
  };

  const deleteRecurring = (id: string) => {
    const updated = recurring.filter(r => r.id !== id);
    setRecurring(updated);
    save({ recurring: updated });
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

  const eventsForDate = (dateStr: string) => allEvents.filter(e => e.date === dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const doneTodos = todos.filter(t => t.done).length;
  const todoPct = todos.length > 0 ? Math.round((doneTodos / todos.length) * 100) : 0;

  const rangeLabel = `${weekDays[0].getDate()}. ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()}. ${MONTHS[weekDays[6].getMonth()]}`;

  const border = (r: boolean, b: boolean) => ({
    borderRight: r ? `1px solid ${lineColor}` : "none",
    borderBottom: b ? `1px solid ${lineColor}` : "none",
  });

  if (loading && uid === null) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  const LABEL_COL = 130;
  const todoToDelete = todos.find(t => t.id === confirmDeleteId) || null;

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
        }
      `}</style>

      {/* Banner header */}
      <div className="wp-banner" style={{
        borderRadius: 16, padding: "16px 20px",
        background: grad, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        boxShadow: `0 6px 20px ${appliedA}33`,
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

      {/* ── PLANNER TABLE: day headers / main task / events ── */}
      {isMobile ? (
        <div style={{ background: surface, borderRadius: 12, border: `1px solid ${lineColor}`, flexShrink: 0 }}>
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d);
            const isEditing = editingDate === dateStr;
            const today = isToday(d);
            const dayEvents = eventsForDate(dateStr);
            return (
              <div key={"row" + i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 10px",
                borderBottom: i < 6 ? `1px solid ${lineColor}` : "none",
                borderLeft: today ? `3px solid ${appliedA}` : "3px solid transparent",
                background: today ? appliedA + "08" : "transparent",
              }}>
                {/* day label */}
                <div style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: today ? appliedA : theme.text, lineHeight: 1.2 }}>{DAY_SHORT[i]}</div>
                  <div style={{ fontSize: 9.5, color: theme.muted, fontWeight: 600 }}>{d.getDate()}.{d.getMonth() + 1}.</div>
                </div>

                {/* priority + events */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      className="wp-input"
                      defaultValue={mainTasks[dateStr] ?? ""}
                      onBlur={e => { saveMainTask(dateStr, e.target.value); setEditingDate(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { saveMainTask(dateStr, e.currentTarget.value); setEditingDate(null); } if (e.key === "Escape") setEditingDate(null); }}
                      placeholder="napíš úlohu..."
                      style={{ width: "100%", background: theme.card2, border: `1.5px solid ${appliedA}`, borderRadius: 6, padding: "4px 7px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                    />
                  ) : (
                    <div onClick={() => setEditingDate(dateStr)} style={{
                      cursor: "pointer", fontSize: 12.5, fontWeight: 700, lineHeight: 1.3,
                      color: mainTasks[dateStr] ? theme.text : theme.muted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {mainTasks[dateStr] || "+ pridať prioritu"}
                    </div>
                  )}

                  {dayEvents.length === 0 ? null : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {dayEvents.map(ev => (
                        <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: theme.muted }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: ev.color || appliedA, flexShrink: 0 }} />
                          {ev.time && <span style={{ fontWeight: 700, flexShrink: 0 }}>{ev.time}</span>}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="wp-scroll" style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${lineColor}`, flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: `${LABEL_COL}px repeat(7, minmax(118px, 1fr))`, minWidth: LABEL_COL + 7 * 118, background: surface }}>

          {/* header row */}
          <div style={{ ...border(true, true), padding: "10px 12px", display: "flex", alignItems: "center", background: theme.card2 }} />
          {weekDays.map((d, i) => {
            const today = isToday(d);
            return (
              <div key={"h" + i} style={{
                ...border(i < 6, true), padding: "10px 8px", textAlign: "center",
                background: today ? appliedA + "14" : theme.card2,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: today ? appliedA : theme.text }}>{DAY_LONG[i]}</div>
                <div style={{ fontSize: 10, color: theme.muted, fontWeight: 600, marginTop: 1 }}>{d.getDate()}. {MONTHS[d.getMonth()].slice(0, 3)}</div>
              </div>
            );
          })}

          {/* main task row */}
          <div style={{ ...border(true, true), padding: "10px 12px", fontSize: 11, fontWeight: 800, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
            ⭐ Priorita dňa
          </div>
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d);
            const isEditing = editingDate === dateStr;
            const today = isToday(d);
            return (
              <div key={"m" + i} style={{ ...border(i < 6, true), padding: 6, background: today ? appliedA + "08" : "transparent" }}>
                {isEditing ? (
                  <input
                    autoFocus
                    className="wp-input"
                    defaultValue={mainTasks[dateStr] ?? ""}
                    onBlur={e => { saveMainTask(dateStr, e.target.value); setEditingDate(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { saveMainTask(dateStr, e.currentTarget.value); setEditingDate(null); } if (e.key === "Escape") setEditingDate(null); }}
                    placeholder="napíš úlohu..."
                    style={{ width: "100%", background: theme.card2, border: `1.5px solid ${appliedA}`, borderRadius: 7, padding: "6px 8px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                ) : (
                  <div onClick={() => setEditingDate(dateStr)} style={{
                    cursor: "pointer", borderRadius: 7, padding: "6px 8px", minHeight: 30,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.35,
                    color: mainTasks[dateStr] ? theme.text : theme.muted,
                  }}>
                    {mainTasks[dateStr] || "+ pridať"}
                  </div>
                )}
              </div>
            );
          })}

          {/* events row */}
          <div style={{ ...border(true, false), padding: "10px 12px", fontSize: 11, fontWeight: 800, color: theme.muted, display: "flex", alignItems: "center", gap: 6 }}>
            🗓️ Udalosti
          </div>
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d);
            const dayEvents = eventsForDate(dateStr);
            const today = isToday(d);
            return (
              <div key={"e" + i} style={{ ...border(i < 6, false), padding: "8px 8px", minHeight: 54, background: today ? appliedA + "08" : "transparent" }}>
                {dayEvents.length === 0 ? (
                  <div style={{ fontSize: 10.5, color: theme.muted, fontStyle: "italic" }}>—</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {dayEvents.map(ev => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color || appliedA, flexShrink: 0 }} />
                        {ev.time && <span style={{ color: theme.muted, fontWeight: 700, flexShrink: 0 }}>{ev.time}</span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── HABIT TRACKER GRID ── */}
      <div style={{ background: surface, borderRadius: 14, border: `1px solid ${lineColor}`, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${lineColor}`, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>🔁 Opakujúce sa činnosti</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={copyRecurringFromPrevWeek} style={{ background: "none", border: `1px solid ${lineColor}`, borderRadius: 7, padding: "5px 10px", color: theme.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", whiteSpace: "nowrap" }}>
              {isMobile ? "Skopírovať min." : "Skopírovať min. týždeň"}
            </button>
            <button onClick={() => setShowAddHabit(v => !v)} style={{ background: appliedA + "16", border: `1px solid ${appliedA}33`, borderRadius: 7, padding: "5px 10px", color: appliedA, fontSize: 10.5, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-geist-sans)", whiteSpace: "nowrap" }}>
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
          <div className="wp-scroll" style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `1fr repeat(7, 38px)`, minWidth: 300 }}>
              {/* header */}
              <div style={{ padding: "8px 16px", fontSize: 10, fontWeight: 800, color: theme.muted, borderBottom: `1px solid ${lineColor}` }} />
              {DAY_SHORT.map((ds, i) => (
                <div key={ds} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, fontWeight: 800, color: theme.muted, borderBottom: `1px solid ${lineColor}`, borderLeft: i === 0 ? `1px solid ${lineColor}` : "none" }}>{ds}</div>
              ))}

              {recurring.map((r, ri) => {
                const isLast = ri === recurring.length - 1;
                return (
                  <React.Fragment key={r.id}>
                    <div style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: isLast ? "none" : `1px solid ${lineColor}` }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span onClick={() => deleteRecurring(r.id)} style={{ cursor: "pointer", color: "#ef4444", opacity: 0.6, flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </span>
                    </div>
                    {DAY_SHORT.map((ds, di) => {
                      const applies = r.days.includes(ds);
                      const dateStr = toDateStr(weekDays[di]);
                      const done = r.doneDates.includes(dateStr);
                      return (
                        <div key={ds} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderBottom: isLast ? "none" : `1px solid ${lineColor}`, borderLeft: `1px solid ${lineColor}` }}>
                          {applies ? (
                            <div onClick={() => toggleRecurringDone(r.id, dateStr)} style={{ width: 18, height: 18, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${done ? appliedA : lineColor}`, background: done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          ) : (
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: lineColor }} />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── TODO LIST ── */}
      <div style={{ background: surface, borderRadius: 14, border: `1px solid ${lineColor}`, padding: 18, display: "flex", flexDirection: "column", gap: 12, maxWidth: 520, position: "relative", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>✅ To-do list týždňa</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: appliedA }}>{todoPct}%</div>
        </div>

        <div style={{ height: 6, borderRadius: 3, background: lineColor, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${todoPct}%`, background: grad, transition: "width .3s ease" }} />
        </div>

        {todos.length === 0 && <div style={{ fontSize: 12, color: theme.muted, fontStyle: "italic" }}>Žiadne úlohy v zozname</div>}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {todos.map((t, ti) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", borderBottom: ti < todos.length - 1 ? `1px dashed ${lineColor}` : "none" }}>
              <div onClick={() => toggleTodo(t.id)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: `1.5px solid ${t.done ? appliedA : lineColor}`, background: t.done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {t.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: t.done ? theme.muted : theme.text, textDecoration: t.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{t.text}</div>
              <div onClick={() => requestDeleteTodo(t.id)} style={{ cursor: "pointer", color: "#ef4444", flexShrink: 0, opacity: 0.6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </div>
            </div>
          ))}
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
    </div>
  );
}