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
  const { grad, theme, appliedA, darkMode } = useTheme();

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

  const [newRecurringName, setNewRecurringName] = useState("");
  const [newRecurringDays, setNewRecurringDays] = useState<string[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  const surface = theme.card;

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

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    save({ todos: updated });
  };

  const eventsForDate = (dateStr: string) => allEvents.filter(e => e.date === dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const doneTodos = todos.filter(t => t.done).length;
  const todoPct = todos.length > 0 ? Math.round((doneTodos / todos.length) * 100) : 0;

  const rangeLabel = `${weekDays[0].getDate()}. ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()}. ${MONTHS[weekDays[6].getMonth()]}`;

  if (loading && uid === null) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px", display: "flex", flexDirection: "column", gap: 20, background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .wp-scroll::-webkit-scrollbar{height:0;width:0}
        .wp-input::placeholder{color:${theme.muted}}
        .wp-grid2 { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:16px; }
        @media (max-width: 760px) { .wp-grid2 { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Týždenný plán</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{rangeLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ width: 32, height: 32, borderRadius: 9, background: surface, border: `1px solid ${theme.border}`, color: theme.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => setWeekStart(getMonday(new Date()))} style={{ height: 32, padding: "0 14px", borderRadius: 9, background: surface, border: `1px solid ${theme.border}`, color: theme.text, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-geist-sans)" }}>
            Tento týždeň
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{ width: 32, height: 32, borderRadius: 9, background: surface, border: `1px solid ${theme.border}`, color: theme.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Day cards */}
      <div className="wp-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}>
        {weekDays.map((d, i) => {
          const dateStr = toDateStr(d);
          const today = isToday(d);
          const dayEvents = eventsForDate(dateStr);
          const dayRecurring = recurring.filter(r => r.days.includes(DAY_SHORT[i]));
          const isEditing = editingDate === dateStr;

          return (
            <div key={dateStr} style={{
              flex: "0 0 240px", scrollSnapAlign: "start",
              background: surface, borderRadius: 16,
              border: `1.5px solid ${today ? appliedA : theme.border}`,
              padding: 14, display: "flex", flexDirection: "column", gap: 10,
              boxShadow: today ? `0 4px 16px ${appliedA}22` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: today ? appliedA : theme.text }}>{DAY_LONG[i]}</div>
                <div style={{ fontSize: 11, color: theme.muted, fontWeight: 600 }}>{d.getDate()}. {MONTHS[d.getMonth()].slice(0, 3)}</div>
              </div>

              {isEditing ? (
                <input
                  autoFocus
                  className="wp-input"
                  defaultValue={mainTasks[dateStr] ?? ""}
                  onBlur={e => { saveMainTask(dateStr, e.target.value); setEditingDate(null); }}
                  onKeyDown={e => { if (e.key === "Enter") { saveMainTask(dateStr, e.currentTarget.value); setEditingDate(null); } if (e.key === "Escape") setEditingDate(null); }}
                  placeholder="Hlavná úloha dňa..."
                  style={{ width: "100%", background: theme.card2, border: `1.5px solid ${appliedA}`, borderRadius: 8, padding: "7px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                />
              ) : (
                <div onClick={() => setEditingDate(dateStr)} style={{
                  cursor: "pointer", borderRadius: 8, padding: "7px 10px",
                  background: mainTasks[dateStr] ? `linear-gradient(135deg, ${appliedA}18, ${appliedA}08)` : theme.card2,
                  border: `1px solid ${mainTasks[dateStr] ? appliedA + "33" : theme.border}`,
                  fontSize: 12.5, fontWeight: 700,
                  color: mainTasks[dateStr] ? theme.text : theme.muted,
                  minHeight: 16, lineHeight: 1.4,
                }}>
                  {mainTasks[dateStr] || "+ Hlavná úloha dňa"}
                </div>
              )}

              <div style={{ height: 1, background: theme.border }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>Udalosti</div>
                {dayEvents.length === 0 ? (
                  <div style={{ fontSize: 11, color: theme.muted, fontStyle: "italic" }}>Žiadne udalosti</div>
                ) : dayEvents.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color || appliedA, flexShrink: 0 }} />
                    {ev.time && <span style={{ color: theme.muted, fontWeight: 600, flexShrink: 0 }}>{ev.time}</span>}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                  </div>
                ))}
              </div>

              {dayRecurring.length > 0 && (
                <>
                  <div style={{ height: 1, background: theme.border }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>Opakujúce sa</div>
                    {dayRecurring.map(r => {
                      const done = r.doneDates.includes(dateStr);
                      return (
                        <div key={r.id} onClick={() => toggleRecurringDone(r.id, dateStr)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${done ? appliedA : theme.border}`, background: done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <span style={{ fontSize: 11.5, color: done ? theme.muted : theme.text, textDecoration: done ? "line-through" : "none" }}>{r.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom: Recurring management + Todo list */}
      <div className="wp-grid2">

        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 18, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>🔁 Opakujúce sa činnosti</div>
            <button onClick={copyRecurringFromPrevWeek} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 7, padding: "4px 9px", color: theme.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>
            Skopírovať min. týždeň
            </button>
          </div>

          {recurring.length === 0 && <div style={{ fontSize: 12, color: theme.muted, fontStyle: "italic" }}>Žiadne opakujúce sa činnosti</div>}

          {recurring.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: theme.card2, borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
              <div style={{ display: "flex", gap: 3 }}>
                {DAY_SHORT.map(ds => (
                  <div key={ds} style={{ width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, background: r.days.includes(ds) ? appliedA : theme.border, color: r.days.includes(ds) ? "#fff" : theme.muted }}>{ds[0]}</div>
                ))}
              </div>
              <div onClick={() => deleteRecurring(r.id)} style={{ cursor: "pointer", color: "#ef4444", flexShrink: 0, opacity: 0.7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
            <input
              value={newRecurringName}
              onChange={e => setNewRecurringName(e.target.value)}
              placeholder="Nová činnosť (napr. Cvičenie)"
              className="wp-input"
              style={{ width: "100%", background: theme.card2, border: `1.5px solid ${theme.border}`, borderRadius: 9, padding: "8px 11px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DAY_SHORT.map(ds => {
                const active = newRecurringDays.includes(ds);
                return (
                  <div key={ds} onClick={() => setNewRecurringDays(p => active ? p.filter(x => x !== ds) : [...p, ds])} style={{ padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, background: active ? appliedA : theme.card2, color: active ? "#fff" : theme.muted, border: `1px solid ${active ? appliedA : theme.border}` }}>{ds}</div>
                );
              })}
            </div>
            <button onClick={addRecurring} disabled={!newRecurringName.trim() || newRecurringDays.length === 0} style={{ background: !newRecurringName.trim() || newRecurringDays.length === 0 ? theme.border : grad, border: "none", borderRadius: 9, padding: "8px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: !newRecurringName.trim() || newRecurringDays.length === 0 ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>+ Pridať činnosť</button>
          </div>
        </div>

        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 18, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>✅ To-do list týždňa</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: appliedA }}>{todoPct}%</div>
          </div>

          <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${todoPct}%`, background: grad, transition: "width .3s ease" }} />
          </div>

          {todos.length === 0 && <div style={{ fontSize: 12, color: theme.muted, fontStyle: "italic" }}>Žiadne úlohy v zozname</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {todos.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: theme.card2, borderRadius: 9, padding: "8px 10px" }}>
                <div onClick={() => toggleTodo(t.id)} style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: `1.5px solid ${t.done ? appliedA : theme.border}`, background: t.done ? appliedA : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex: 1, fontSize: 12.5, color: t.done ? theme.muted : theme.text, textDecoration: t.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{t.text}</div>
                <div onClick={() => deleteTodo(t.id)} style={{ cursor: "pointer", color: "#ef4444", flexShrink: 0, opacity: 0.7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
            <input
              value={newTodoText}
              onChange={e => setNewTodoText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
              placeholder="Nová úloha..."
              className="wp-input"
              style={{ flex: 1, background: theme.card2, border: `1.5px solid ${theme.border}`, borderRadius: 9, padding: "8px 11px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontWeight: 600, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={addTodo} disabled={!newTodoText.trim()} style={{ background: !newTodoText.trim() ? theme.border : grad, border: "none", borderRadius: 9, padding: "0 16px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: !newTodoText.trim() ? "default" : "pointer", fontFamily: "var(--font-geist-sans)" }}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}