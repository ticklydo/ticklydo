"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
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

type SearchResult = {
  taskName: string;
  taskStatus: string;
  taskPriority: string;
  projectName: string;
  projectId: string;
  notes?: string;
  tags?: string[];
};

const STATUS_COLORS: Record<string, string> = {
  "Hotovo": "#16a34a",
  "V procese": "#b45309",
  "Uviaznuté": "#dc2626",
  "Nezačaté": "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Vysoká": "#dc2626",
  "Stredná": "#b45309",
  "Nízka": "#2563eb",
};

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { theme, appliedA, grad, darkMode } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allTasks, setAllTasks] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all tasks on open
  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setSelected(0); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
    loadAllTasks();
  }, [open]);

  const loadAllTasks = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) return;
      const projects = userSnap.data().projects ?? [];
      const allResults: SearchResult[] = [];
      await Promise.all(projects.map(async (p: any) => {
        const projectId = p.shared ? `${p.ownerUid}_${p.projectId}` : `${user.uid}_${p.id}`;
        const pSnap = await getDoc(doc(db, "projects", projectId));
        if (!pSnap.exists()) return;
        const data = pSnap.data();
        const tasks = data.tasks ?? [];
        tasks.forEach((t: any) => {
          allResults.push({
            taskName: t.name,
            taskStatus: t.status ?? "Nezačaté",
            taskPriority: t.priority ?? "",
            projectName: data.projectName || p.name || p.id,
            projectId: p.id,
            notes: t.notes,
            tags: t.tags,
          });
        });
      }));
      setAllTasks(allResults);
    } catch (err) {
      console.error("Search load error:", err);
    }
    setLoading(false);
  };

  // Filter on query change
  useEffect(() => {
    if (!query.trim()) { setResults([]); setSelected(0); return; }
    const q = query.toLowerCase();
    const filtered = allTasks.filter(r =>
      r.taskName.toLowerCase().includes(q) ||
      r.projectName.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.tags?.some(t => t.toLowerCase().includes(q))
    ).slice(0, 12);
    setResults(filtered);
    setSelected(0);
  }, [query, allTasks]);

  const goToResult = useCallback((r: SearchResult) => {
    router.push(`/project/${r.projectId}`);
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setSelected(s => Math.min(s + 1, results.length - 1));
      if (e.key === "ArrowUp") setSelected(s => Math.max(s - 1, 0));
      if (e.key === "Enter" && results[selected]) goToResult(results[selected]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, goToResult, onClose]);

  if (!open) return null;

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: appliedA + "33", color: appliedA, borderRadius: 2, padding: "0 1px" }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(580px, 92vw)", background: theme.card, borderRadius: 18, border: `1px solid ${theme.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", overflow: "hidden", animation: "fadeIn .15s ease" }}
      >
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Hľadaj úlohy naprieč projektmi..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 15, fontWeight: 500 }}
          />
          {loading && (
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
          )}
          <kbd style={{ background: theme.card2, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "2px 6px", fontSize: 11, color: theme.muted, fontFamily: "var(--font-geist-sans)" }}>Esc</kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {results.length === 0 && !loading ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: theme.muted, fontSize: 13 }}>
                Žiadne výsledky pre „{query}"
              </div>
            ) : (
              <div style={{ padding: "6px 0" }}>
                <div style={{ padding: "4px 18px 8px", fontSize: 10, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Úlohy ({results.length})
                </div>
                {results.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => goToResult(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 18px", cursor: "pointer",
                      background: selected === i ? appliedA + "12" : "transparent",
                      borderLeft: selected === i ? `3px solid ${appliedA}` : "3px solid transparent",
                      transition: "background .1s",
                    }}
                    onMouseEnter={() => setSelected(i)}
                  >
                    {/* Status dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[r.taskStatus] ?? "#9ca3af", flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: r.taskStatus === "Hotovo" ? "line-through" : "none", opacity: r.taskStatus === "Hotovo" ? 0.6 : 1 }}>
                        {highlight(r.taskName, query)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: theme.muted }}>{highlight(r.projectName, query)}</span>
                        {r.taskPriority && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[r.taskPriority] ?? theme.muted, background: (PRIORITY_COLORS[r.taskPriority] ?? "#9ca3af") + "18", borderRadius: 4, padding: "1px 5px" }}>
                            {r.taskPriority}
                          </span>
                        )}
                        {(r.tags ?? []).slice(0, 2).map(t => (
                          <span key={t} style={{ fontSize: 10, color: appliedA, background: appliedA + "15", borderRadius: 4, padding: "1px 5px" }}>#{t}</span>
                        ))}
                      </div>
                    </div>

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!query.trim() && (
          <div style={{ padding: "24px 18px", color: theme.muted, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: theme.text }}>Tipy:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>🔍 Hľadaj podľa názvu úlohy</span>
              <span>📁 Hľadaj podľa názvu projektu</span>
              <span>🏷️ Hľadaj podľa tagu</span>
              <span>📝 Hľadaj v poznámkach</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <kbd style={{ background: theme.card2, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 5px" }}>↑↓</kbd> navigácia
              <kbd style={{ background: theme.card2, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 5px" }}>Enter</kbd> otvoriť
              <kbd style={{ background: theme.card2, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 5px" }}>Esc</kbd> zavrieť
            </div>
          </div>
        )}
      </div>
    </div>
  );
}