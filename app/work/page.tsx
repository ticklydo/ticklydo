"use client";

import React, { useState, useEffect, useRef } from "react";
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

const STATUS_CONFIG: Record<Status, { color: string; bg: string; dot: string; label: string }> = {
  "Hotovo":    { color: "#16a34a", bg: "#dcfce7", dot: "#16a34a", label: "Hotovo" },
  "V procese": { color: "#b45309", bg: "#fef3c7", dot: "#f59e0b", label: "V procese" },
  "Uviaznuté": { color: "#dc2626", bg: "#fee2e2", dot: "#ef4444", label: "Uviaznuté" },
  "Nezačaté":  { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af", label: "Nezačaté" },
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

// ── Skeleton loader ──
function Skeleton({ w, h, radius = 8 }: { w: string | number; h: number; radius?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "linear-gradient(90deg, var(--sk-a) 25%, var(--sk-b) 50%, var(--sk-a) 75%)", backgroundSize: "200% 100%", animation: "skeletonShimmer 1.4s ease infinite" }} />
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-border)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Skeleton w={100} h={12} />
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Skeleton w={100} h={100} radius={50} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton w="80%" h={10} />
          <Skeleton w="60%" h={10} />
          <Skeleton w="70%" h={10} />
          <Skeleton w="50%" h={10} />
        </div>
      </div>
      <Skeleton w="100%" h={6} radius={3} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto auto", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--sk-border)" }}>
      <Skeleton w={20} h={20} radius={6} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Skeleton w="55%" h={12} />
        <Skeleton w="30%" h={9} />
      </div>
      <Skeleton w={50} h={20} />
      <Skeleton w={50} h={20} />
      <Skeleton w={70} h={24} radius={6} />
    </div>
  );
}

// ── Animated counter ──
function AnimatedNumber({ target, color, suffix = "" }: { target: number; color?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    ref.current = 0;
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(eased * target);
      if (cur !== ref.current) { ref.current = cur; setVal(cur); }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <span style={{ color }}>{val}{suffix}</span>;
}
function DonutChart({ data, size = 120 }: { data: { value: number; color: string; label: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>0</div>;
  const r = 40; const cx = 50; const cy = 50; const stroke = 14;
  let angle = -90;
  const arcs = data.map(d => {
    const pct = d.value / total;
    const deg = pct * 360;
    const r2 = (Math.PI * 2 * r);
    const dasharray = `${pct * r2} ${r2}`;
    const rotate = angle;
    angle += deg;
    return { ...d, dasharray, rotate, pct };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {arcs.map((arc, i) => arc.value > 0 && (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={stroke}
          strokeDasharray={arc.dasharray}
          strokeDashoffset={0}
          transform={`rotate(${arc.rotate} ${cx} ${cy})`}
          strokeLinecap="round"
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="800" fill="currentColor">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#9ca3af">úloh</text>
    </svg>
  );
}

// ── Bar Chart ──
function BarChart({ data, color, darkMode }: { data: { label: string; value: number; color?: string }[]; color: string; darkMode: boolean }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", width: 70, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
          <div style={{ flex: 1, height: 20, background: darkMode ? "#ffffff0a" : "#f3f4f6", borderRadius: 6, overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", width: `${(d.value / max) * 100}%`, background: d.color ?? color, borderRadius: 6, transition: "width .6s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              {d.value > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{d.value}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Week Calendar ──
function WeekCalendar({ tasks, appliedA, darkMode, theme }: { tasks: Task[]; appliedA: string; darkMode: boolean; theme: any }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const dayNames = ["Ne","Po","Ut","St","Št","Pi","So"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {days.map((day, i) => {
        const iso = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
        const dayTasks = tasks.filter(t => t.dueDate === iso);
        const isToday = i === 0;
        const overdue = dayTasks.filter(t => t.status !== "Hotovo").length;
        return (
          <div key={i} style={{
            borderRadius: 10, padding: "8px 4px", textAlign: "center",
            background: isToday ? appliedA : (darkMode ? "#ffffff08" : "#f8f9fb"),
            border: `1px solid ${isToday ? appliedA : theme.border}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? "rgba(255,255,255,0.7)" : theme.muted, marginBottom: 2 }}>{dayNames[day.getDay()]}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: isToday ? "#fff" : theme.text }}>{day.getDate()}</div>
            {dayTasks.length > 0 ? (
              <div style={{ marginTop: 4, width: 18, height: 18, borderRadius: "50%", background: isToday ? "rgba(255,255,255,0.25)" : appliedA + "22", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 0", fontSize: 9, fontWeight: 800, color: isToday ? "#fff" : appliedA }}>{dayTasks.length}</div>
            ) : (
              <div style={{ height: 22 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const gradientText = (grad: string) => ({
  backgroundImage: grad, WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const,
});

type FilterStatus = Status | "Všetky";
type SortBy = "dueDate" | "priority" | "status" | "project" | "name";

function Heatmap({ data, appliedA, darkMode, theme }: { data: Record<string, number>; appliedA: string; darkMode: boolean; theme: any }) {
  const today = new Date();
  const weeks = 26; // 6 months
  const days: { date: string; count: number }[] = [];

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, count: data[key] || 0 });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const cols: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  const getColor = (count: number) => {
    if (count === 0) return darkMode ? "#ffffff0a" : "#f0f0f0";
    const intensity = count / maxCount;
    if (intensity < 0.25) return appliedA + "44";
    if (intensity < 0.5) return appliedA + "77";
    if (intensity < 0.75) return appliedA + "aa";
    return appliedA;
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","Máj","Jún","Júl","Aug","Sep","Okt","Nov","Dec"];
  const monthLabels: { label: string; col: number }[] = [];
  cols.forEach((col, ci) => {
    const d = new Date(col[0].date);
    if (ci === 0 || new Date(cols[ci-1][0].date).getMonth() !== d.getMonth()) {
      monthLabels.push({ label: MONTHS[d.getMonth()], col: ci });
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", paddingTop: 18, minWidth: cols.length * 13 }}>
        {/* Month labels */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16 }}>
          {monthLabels.map((m, i) => (
            <span key={i} style={{ position: "absolute", left: m.col * 13, fontSize: 9, color: theme.muted, fontWeight: 700 }}>{m.label}</span>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display: "flex", gap: 2 }}>
          {cols.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.map((day, di) => (
                <div key={di} title={`${day.date}: ${day.count} akcií`} style={{ width: 11, height: 11, borderRadius: 2, background: getColor(day.count), transition: "transform .1s", cursor: day.count > 0 ? "pointer" : "default" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.transform = "scale(1.3)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, color: theme.muted }}>Menej</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? (darkMode ? "#ffffff0a" : "#f0f0f0") : appliedA + Math.round(v * 255).toString(16).padStart(2,"0") }} />
        ))}
        <span style={{ fontSize: 9, color: theme.muted }}>Viac</span>
      </div>
    </div>
  );
}

function TrendChart({ tasks, appliedA, darkMode, theme }: { tasks: any[]; appliedA: string; darkMode: boolean; theme: any }) {
  // Last 8 weeks - tasks with dueDate grouped by week
  const weeks: { label: string; total: number; done: number }[] = [];
  const today = new Date();

  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - w * 7 - today.getDay() + 1);
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split("T")[0];
    const endStr = weekEnd.toISOString().split("T")[0];

    const weekTasks = tasks.filter(t => t.dueDate >= startStr && t.dueDate <= endStr);
    weeks.push({
      label: `${weekStart.getDate()}.${weekStart.getMonth()+1}`,
      total: weekTasks.length,
      done: weekTasks.filter(t => t.status === "Hotovo").length,
    });
  }

  const maxVal = Math.max(...weeks.map(w => w.total), 1);
  const chartH = 80;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: chartH + 24 }}>
      {weeks.map((w, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: chartH, gap: 2 }}>
            {w.total > 0 && (
              <div style={{ width: "100%", borderRadius: "4px 4px 0 0", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", height: Math.max((w.total / maxVal) * chartH, 4), background: darkMode ? appliedA + "33" : appliedA + "22", borderRadius: "4px 4px 0 0", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", height: Math.max((w.done / maxVal) * chartH, w.done > 0 ? 4 : 0), background: appliedA, borderRadius: w.done === w.total ? "4px 4px 0 0" : "0 0 0 0", transition: "height .4s ease" }} />
                </div>
              </div>
            )}
            {w.total === 0 && <div style={{ width: "100%", height: 3, background: darkMode ? "#ffffff0a" : "#f0f0f0", borderRadius: 2 }} />}
          </div>
          <div style={{ fontSize: 9, color: theme.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{w.label}</div>
        </div>
      ))}
    </div>
  );
}

function BurndownChart({ tasks, appliedA, darkMode, theme }: { tasks: any[]; appliedA: string; darkMode: boolean; theme: any }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  const totalTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  if (totalTasks === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: theme.muted, fontSize: 12 }}>Žiadne úlohy s termínom tento mesiac</div>
  );

  const points: { day: number; remaining: number }[] = [];
  for (let d = 1; d <= Math.min(today.getDate(), daysInMonth); d++) {
    const dayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const completed = tasks.filter(t => t.dueDate === dayStr && t.status === "Hotovo").length;
    const prev = points.length > 0 ? points[points.length-1].remaining : totalTasks;
    points.push({ day: d, remaining: Math.max(0, prev - completed) });
  }

  const idealLine: { day: number; ideal: number }[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    ideal: Math.round(totalTasks * (1 - (i + 1) / daysInMonth)),
  }));

  const chartH = 80;
  const chartW = 100;

  const toX = (day: number) => ((day - 1) / (daysInMonth - 1)) * chartW;
  const toY = (val: number) => chartH - (val / totalTasks) * chartH;

  const actualPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.day)} ${toY(p.remaining)}`).join(" ");
  const idealPath = idealLine.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.day)} ${toY(p.ideal)}`).join(" ");

  const remaining = points.length > 0 ? points[points.length-1].remaining : totalTasks;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11 }}>
        <span style={{ color: theme.muted }}>Zostáva: <strong style={{ color: remaining > 0 ? "#dc2626" : "#16a34a" }}>{remaining}</strong> úloh</span>
        <span style={{ color: theme.muted }}>Celkom: {totalTasks}</span>
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: chartH * 2, overflow: "visible" }}>
        {/* Ideal line */}
        <path d={idealPath} fill="none" stroke={darkMode ? "#ffffff22" : "#00000015"} strokeWidth="0.8" strokeDasharray="2,2" />
        {/* Actual line */}
        <path d={actualPath} fill="none" stroke={appliedA} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current point */}
        {points.length > 0 && (
          <circle cx={toX(points[points.length-1].day)} cy={toY(points[points.length-1].remaining)} r="2.5" fill={appliedA} />
        )}
      </svg>
      <div style={{ display: "flex", gap: 12, fontSize: 10, color: theme.muted, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, background: appliedA, borderRadius: 1 }} /> Skutočnosť</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, background: darkMode ? "#ffffff33" : "#00000020", borderRadius: 1 }} /> Ideál</div>
      </div>
    </div>
  );
}

export default function WorkPage() {
  const router = useRouter();
  const { grad, theme, appliedA, appliedB, darkMode } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [activityHeatmap, setActivityHeatmap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Všetky");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [search, setSearch] = useState("");
  const [groupByProject, setGroupByProject] = useState(false);

  const surface = darkMode ? theme.card : "#ffffff";
  const headerBg = darkMode ? theme.card2 : "#f8f9fb";
  const shadow = darkMode ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) { setLoading(false); return; }
      const projects = userSnap.data().projects ?? [];
      const allTasks: Task[] = [];
      const allActivity: { date: string; count: number }[] = [];
      const activityByDay: Record<string, number> = {};

      await Promise.all(projects.filter((p: any) => !p.archived).map(async (project: any) => {
        const projectPath = project.shared ? `${project.ownerUid}_${project.projectId}` : `${user.uid}_${project.id}`;
const snap = await getDoc(doc(db, "projects", projectPath));
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
        // Collect activity for heatmap
        (data.activityLog ?? []).forEach((entry: any) => {
          const date = new Date(entry.createdAt).toISOString().split("T")[0];
          activityByDay[date] = (activityByDay[date] || 0) + 1;
        });
      }));

      setTasks(allTasks);
      setActivityHeatmap(activityByDay);
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
    const updatedTasks = (snap.data().tasks ?? []).map((t: any) => t.id === task.id ? { ...t, status: newStatus } : t);
    await setDoc(doc(db, "projects", `${user.uid}_${task.projectId}`), { tasks: updatedTasks }, { merge: true });
    setTasks(prev => prev.map(t => t.id === task.id && t.projectId === task.projectId ? { ...t, status: newStatus } : t));
  };

  // ── Stats for charts ──
  const statusCounts = STATUSES.map(s => ({ label: s, value: tasks.filter(t => t.status === s).length, color: STATUS_CONFIG[s].color }));
  const priorityCounts = [
    { label: "Vysoká", value: tasks.filter(t => t.priority === "Vysoká").length, color: "#dc2626" },
    { label: "Stredná", value: tasks.filter(t => t.priority === "Stredná").length, color: "#b45309" },
    { label: "Nízka", value: tasks.filter(t => t.priority === "Nízka").length, color: "#2563eb" },
    { label: "Bez priority", value: tasks.filter(t => !t.priority).length, color: "#9ca3af" },
  ];
  const projectMap = new Map<string, { name: string; count: number; color1: string; color2: string }>();
  tasks.forEach(t => {
    if (!projectMap.has(t.projectId)) projectMap.set(t.projectId, { name: t.projectName, count: 0, color1: t.projectColor1, color2: t.projectColor2 });
    projectMap.get(t.projectId)!.count++;
  });
  const projectCounts = [...projectMap.values()].sort((a,b) => b.count - a.count).slice(0, 6).map(p => ({ label: p.name, value: p.count }));

  const totalDone = tasks.filter(t => t.status === "Hotovo").length;
  const totalOverdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "Hotovo").length;
  const completionPct = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  // ── Filter + sort ──
  let filtered = tasks.filter(t => {
    if (filterStatus !== "Všetky" && t.status !== filterStatus) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const PRIORITY_ORDER: Record<string, number> = { "Vysoká": 0, "Stredná": 1, "Nízka": 2, "": 3 };
  const STATUS_ORDER: Record<string, number> = { "Uviaznuté": 0, "V procese": 1, "Nezačaté": 2, "Hotovo": 3 };
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "dueDate") { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate); }
    if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    if (sortBy === "status") return (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2);
    if (sortBy === "project") return a.projectName.localeCompare(b.projectName);
    return a.name.localeCompare(b.name);
  });

  const groups: { label: string; color1: string; color2: string; projectId: string; tasks: Task[] }[] = [];
  if (groupByProject) {
    const map = new Map<string, Task[]>();
    filtered.forEach(t => { if (!map.has(t.projectId)) map.set(t.projectId, []); map.get(t.projectId)!.push(t); });
    map.forEach((ts, projectId) => { const f = ts[0]; groups.push({ label: f.projectName, color1: f.projectColor1, color2: f.projectColor2, projectId, tasks: ts }); });
  }

  const TaskRow = ({ task }: { task: Task }) => {
    const sCfg = STATUS_CONFIG[task.status];
    const pCfg = PRIORITY_CONFIG[task.priority];
    const over = isOverdue(task.dueDate) && task.status !== "Hotovo";
    const done = task.status === "Hotovo";
    return (
      <div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, transition: "background .15s", opacity: done ? 0.55 : 1 }}
        onMouseEnter={e => e.currentTarget.style.background = darkMode ? appliedA + "08" : appliedA + "05"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div onClick={() => updateTaskStatus(task, done ? "Nezačaté" : "Hotovo")} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${done ? appliedA : theme.border}`, background: done ? appliedA : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}>
          {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: `linear-gradient(135deg, ${task.projectColor1}, ${task.projectColor2})`, flexShrink: 0 }} />
            <span onClick={() => router.push(`/project/${task.projectId}`)} style={{ fontSize: 11, color: theme.muted, fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = appliedA}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = theme.muted}
            >{task.projectName}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: over ? "#dc2626" : task.dueDate ? theme.muted : theme.border, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {task.dueDate && <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>{formatDate(task.dueDate)}</>}
        </div>
        {task.priority ? <span style={{ background: darkMode ? pCfg.color + "22" : pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.color}33`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{task.priority}</span> : <div style={{ width: 40 }} />}
        <select value={task.status} onChange={e => updateTaskStatus(task, e.target.value as Status)} style={{ background: darkMode ? sCfg.color + "22" : sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.color}33`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "none" as const, fontFamily: "var(--font-geist-sans)", flexShrink: 0 }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    );
  };

  if (loading) return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 12px 60px" : "24px 24px 60px", display: "flex", flexDirection: "column", gap: 20, background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes skeletonShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        :root{--sk-a:${darkMode?"#ffffff0a":"#f0f0f0"};--sk-b:${darkMode?"#ffffff16":"#e0e0e0"};--sk-surface:${darkMode?theme.card:"#ffffff"};--sk-border:${theme.border};}
      `}</style>
      {/* Header skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Skeleton w={22} h={22} radius={4} />
        <Skeleton w={160} h={28} radius={8} />
      </div>
      {/* Charts skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      {/* Filter skeleton */}
      <div style={{ background: darkMode ? theme.card : "#fff", border: `1px solid ${theme.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10 }}>
        <Skeleton w="40%" h={32} radius={8} />
        <Skeleton w={120} h={32} radius={8} />
        <Skeleton w={120} h={32} radius={8} />
      </div>
      {/* Rows skeleton */}
      <div style={{ background: darkMode ? theme.card : "#fff", border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden" }}>
        {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 12px 60px" : "24px 24px 60px", display: "flex", flexDirection: "column", gap: 20, background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)", transition: "background .3s, color .3s" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes skeletonShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        select{appearance:none!important;-webkit-appearance:none!important}
      `}</style>
      <style>{`
        :root {
          --sk-a: ${darkMode ? "#ffffff0a" : "#f0f0f0"};
          --sk-b: ${darkMode ? "#ffffff16" : "#e0e0e0"};
          --sk-surface: ${darkMode ? theme.card : "#ffffff"};
          --sk-border: ${theme.border};
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <span style={{ fontSize: 22, fontWeight: 900, ...gradientText(grad) }}>Moja práca</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {totalOverdue > 0 && <div style={{ background: "#fee2e2", border: "1px solid #ef444433", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{totalOverdue} po termíne</div>}
          <div style={{ background: darkMode ? "#16a34a22" : "#dcfce7", border: "1px solid #16a34a33", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#16a34a" }}>{totalDone}/{tasks.length} hotovo</div>
        </div>
      </div>

      {/* ── DASHBOARD CHARTS ── */}
      {tasks.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, animation: "fadeIn .3s ease" }}>

          {/* Completion donut */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Dokončenie</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <DonutChart data={statusCounts} size={100} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                {statusCounts.map(s => s.value > 0 && (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: theme.muted, flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: theme.muted, fontWeight: 600 }}>Celkový progres</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: appliedA }}><AnimatedNumber target={completionPct} color={appliedA} suffix="%" /></span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${completionPct}%`, background: `linear-gradient(90deg, ${appliedA}, ${appliedB})`, borderRadius: 3, transition: "width .8s ease" }} />
              </div>
            </div>
          </div>

          {/* Priority breakdown */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Podľa priority</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <DonutChart data={priorityCounts.filter(p => p.value > 0)} size={100} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                {priorityCounts.map(p => p.value > 0 && (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: theme.muted, flex: 1 }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: p.color }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Urgent tasks highlight */}
            <div style={{ background: "#dc262610", border: "1px solid #dc262622", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>{tasks.filter(t => t.priority === "Vysoká" && t.status !== "Hotovo").length} vysokých prioritít čaká</span>
            </div>
          </div>

          {/* This week calendar */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Tento týždeň</div>
            <WeekCalendar tasks={tasks} appliedA={appliedA} darkMode={darkMode} theme={theme} />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: headerBg, borderRadius: 8, padding: "8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: appliedA }}>
                  <AnimatedNumber target={tasks.filter(t => { const d = new Date(); const d7 = new Date(); d7.setDate(d.getDate()+7); return t.dueDate >= `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` && t.dueDate < `${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,"0")}-${String(d7.getDate()).padStart(2,"0")}`; }).length} color={appliedA} />
                </div>
                <div style={{ fontSize: 10, color: theme.muted, fontWeight: 600 }}>termínov</div>
              </div>
              <div style={{ flex: 1, background: "#fee2e2", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>
                  <AnimatedNumber target={totalOverdue} color="#dc2626" />
                </div>
                <div style={{ fontSize: 10, color: "#dc262699", fontWeight: 600 }}>po termíne</div>
              </div>
            </div>
          </div>

          {/* Projects bar chart */}
          {projectCounts.length > 1 && (
            <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Úlohy podľa projektu</div>
              <BarChart data={projectCounts} color={appliedA} darkMode={darkMode} />
            </div>
          )}
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", boxShadow: shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", flex: "1 1 160px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadaj úlohu..." style={{ border: "none", background: "transparent", outline: "none", color: theme.text, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-geist-sans)", width: "100%" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} style={{ background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "var(--font-geist-sans)" }}>
          <option value="Všetky">Všetky statusy</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} style={{ background: headerBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", color: theme.text, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "var(--font-geist-sans)" }}>
          <option value="dueDate">Podľa termínu</option>
          <option value="priority">Podľa priority</option>
          <option value="status">Podľa statusu</option>
          <option value="project">Podľa projektu</option>
          <option value="name">Podľa názvu</option>
        </select>
        <button onClick={() => setGroupByProject(v => !v)} style={{ background: groupByProject ? appliedA + "18" : headerBg, border: `1px solid ${groupByProject ? appliedA + "55" : theme.border}`, borderRadius: 8, padding: "6px 10px", color: groupByProject ? appliedA : theme.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", display: "flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Podľa projektu
        </button>
      </div>

      {/* ── ANALYTIKA ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Heatmap */}
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: isMobile ? "14px 12px" : "18px 20px", boxShadow: shadow }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>Aktivita za posledných 6 mesiacov</div>
            <div style={{ fontSize: 11, color: theme.muted }}>{Object.values(activityHeatmap).reduce((a, b) => a + b, 0)} akcií</div>
          </div>
          <Heatmap data={activityHeatmap} appliedA={appliedA} darkMode={darkMode} theme={theme} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          {/* Trend chart */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: isMobile ? "14px 12px" : "18px 20px", boxShadow: shadow }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Úlohy podľa týždňa</div>
            <TrendChart tasks={tasks} appliedA={appliedA} darkMode={darkMode} theme={theme} />
            <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: darkMode ? appliedA + "33" : appliedA + "22" }} /><span style={{ color: theme.muted }}>Celkom</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: appliedA }} /><span style={{ color: theme.muted }}>Hotovo</span></div>
            </div>
          </div>

          {/* Burndown */}
          <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: isMobile ? "14px 12px" : "18px 20px", boxShadow: shadow }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Burndown — tento mesiac</div>
            <BurndownChart tasks={tasks} appliedA={appliedA} darkMode={darkMode} theme={theme} />
          </div>
        </div>
      </div>

      {/* ── TASK LIST ── */}
      {filtered.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: appliedA }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Žiadne úlohy</div>
          <div style={{ fontSize: 13, color: theme.muted }}>{tasks.length === 0 ? "Vytvor projekty a pridaj úlohy" : "Žiadne úlohy nezodpovedajú filtru"}</div>
        </div>
      ) : groupByProject ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn .2s ease" }}>
          {groups.map(group => (
            <div key={group.projectId} style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden", boxShadow: shadow }}>
              <div onClick={() => router.push(`/project/${group.projectId}`)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: `linear-gradient(135deg, ${group.color1}18, ${group.color2}10)`, borderBottom: `1px solid ${theme.border}`, cursor: "pointer" }}>
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
        <div style={{ background: surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden", boxShadow: shadow, animation: "fadeIn .2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto auto", gap: 12, padding: "8px 16px", background: headerBg, borderBottom: `1px solid ${theme.border}`, fontSize: 10, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px" }}>
            <div /><div>Úloha</div><div>Termín</div><div>Priorita</div><div>Status</div>
          </div>
          {filtered.map(task => <TaskRow key={task.id + task.projectId} task={task} />)}
        </div>
      )}
    </div>
  );
}