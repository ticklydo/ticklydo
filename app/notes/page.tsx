"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

type ChecklistItem = { id: string; text: string; checked: boolean };

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  labels: string[];
  checklist: boolean;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
};

type Snapshot = { title: string; content: string; checklist: boolean; items: ChecklistItem[]; color: string };

function genId() { return Math.random().toString(36).slice(2, 10); }

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "Práve teraz";
  if (m < 60) return `Pred ${m} min`;
  if (h < 24) return `Pred ${h} hod`;
  if (d === 1) return "Včera";
  return `Pred ${d} dňami`;
}

// Paletka farieb v Keep štýle — svetlé pastelové (light mode) verzie
const NOTE_COLORS = [
  { id: "default", light: "#ffffff", dark: "#2a2a2e" },
  { id: "red", light: "#f6b7ae", dark: "#5c2b29" },
  { id: "orange", light: "#f8d3a0", dark: "#5c3f22" },
  { id: "yellow", light: "#faf3a1", dark: "#5c5722" },
  { id: "green", light: "#c9e7ba", dark: "#2c4a2a" },
  { id: "teal", light: "#b3e0da", dark: "#1f4a45" },
  { id: "blue", light: "#aecdf0", dark: "#25395c" },
  { id: "purple", light: "#d3b6f0", dark: "#3d2c5c" },
  { id: "pink", light: "#f6b8dc", dark: "#5c2b47" },
  { id: "brown", light: "#d9c2a6", dark: "#4a3c2c" },
];

function getCardColor(colorId: string, darkMode: boolean): string {
  const c = NOTE_COLORS.find(c => c.id === colorId) ?? NOTE_COLORS[0];
  return darkMode ? c.dark : c.light;
}

// Jednoduchý markdown renderer — bold, italic, nadpisy, zoznamy, kód
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[hupli]|<hr|<br)(.+)/, "<p>$1")
    .replace(/(.+)(?!<\/[hup]>)$/, "$1</p>");
}

function normalizeNote(n: any): Note {
  return {
    id: n.id, title: n.title || "", content: n.content || "",
    color: n.color || "default",
    pinned: !!n.pinned, archived: !!n.archived,
    labels: Array.isArray(n.labels) ? n.labels : [],
    checklist: !!n.checklist,
    items: Array.isArray(n.items) ? n.items : [],
    createdAt: n.createdAt || Date.now(), updatedAt: n.updatedAt || Date.now(),
  };
}

export default function NotesPage() {
  const { grad, theme, appliedA, darkMode } = useTheme();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewArchive, setViewArchive] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [showLabelFilterMenu, setShowLabelFilterMenu] = useState(false);

  // otvorená poznámka (celostránkový editor)
  const [openId, setOpenId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState("default");
  const [editPinned, setEditPinned] = useState(false);
  const [editArchived, setEditArchived] = useState(false);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editChecklist, setEditChecklist] = useState(false);
  const [editItems, setEditItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [newLabelText, setNewLabelText] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [saving, setSaving] = useState(false);

  // undo/redo história pre otvorenú poznámku
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isApplyingHistory = useRef(false);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surface = theme.card;
  const lineColor = theme.border;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      const loaded: Note[] = (data.notes ?? []).map(normalizeNote);
      setNotes(loaded);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const sortNotes = (list: Note[]) => [...list].sort((a, b) => b.updatedAt - a.updatedAt);

  const saveNotes = useCallback(async (updatedNotes: Note[]) => {
    if (!uid) return;
    setSaving(true);
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", uid), { notes: updatedNotes }, { merge: true });
    setSaving(false);
  }, [uid]);

  const persistCurrent = useCallback((patch: Partial<Note>) => {
    if (!openId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const updated = sortNotes(notes.map(n => n.id === openId ? { ...n, ...patch, updatedAt: Date.now() } : n));
      setNotes(updated);
      saveNotes(updated);
    }, 700);
  }, [openId, notes, saveNotes]);

  // ── história (undo/redo) ──
  const pushHistory = (snap: Snapshot) => {
    if (isApplyingHistory.current) return;
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      setHistory(h => {
        const trimmed = h.slice(0, historyIndex + 1);
        const next = [...trimmed, snap].slice(-50);
        return next;
      });
      setHistoryIndex(i => Math.min(i + 1, 49));
    }, 400);
  };

  const applySnapshot = (snap: Snapshot) => {
    isApplyingHistory.current = true;
    setEditTitle(snap.title);
    setEditContent(snap.content);
    setEditChecklist(snap.checklist);
    setEditItems(snap.items);
    setEditColor(snap.color);
    persistCurrent({ title: snap.title, content: snap.content, checklist: snap.checklist, items: snap.items, color: snap.color });
    setTimeout(() => { isApplyingHistory.current = false; }, 50);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    applySnapshot(history[newIndex]);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    applySnapshot(history[newIndex]);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    persistCurrent({ title: value });
    pushHistory({ title: value, content: editContent, checklist: editChecklist, items: editItems, color: editColor });
  };
  const handleContentChange = (value: string) => {
    setEditContent(value);
    persistCurrent({ content: value });
    pushHistory({ title: editTitle, content: value, checklist: editChecklist, items: editItems, color: editColor });
  };
  const handleColorChange = (colorId: string) => {
    setEditColor(colorId);
    setShowColorPicker(false);
    if (!openId) return;
    const updated = sortNotes(notes.map(n => n.id === openId ? { ...n, color: colorId, updatedAt: Date.now() } : n));
    setNotes(updated);
    saveNotes(updated);
    pushHistory({ title: editTitle, content: editContent, checklist: editChecklist, items: editItems, color: colorId });
  };

  const togglePinned = (id: string) => {
    const updated = sortNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: n.updatedAt } : n));
    setNotes(updated);
    saveNotes(updated);
    if (openId === id) setEditPinned(v => !v);
  };
  const toggleArchivedFor = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, archived: !n.archived } : n);
    setNotes(updated);
    saveNotes(updated);
    if (openId === id) { setEditArchived(v => !v); setOpenId(null); }
  };

  const toggleChecklistMode = () => {
    const next = !editChecklist;
    setEditChecklist(next);
    if (next && editItems.length === 0 && editContent.trim()) {
      // pri prepnutí na zoznam preveď existujúci text na prvú položku
      const firstItems = [{ id: genId(), text: editContent.trim(), checked: false }];
      setEditItems(firstItems);
      persistCurrent({ checklist: true, items: firstItems });
    } else {
      persistCurrent({ checklist: next });
    }
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    const updated = [...editItems, { id: genId(), text: newItemText.trim(), checked: false }];
    setEditItems(updated);
    setNewItemText("");
    persistCurrent({ items: updated });
  };
  const toggleChecklistItem = (itemId: string) => {
    const updated = editItems.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);
    setEditItems(updated);
    persistCurrent({ items: updated });
  };
  const removeChecklistItem = (itemId: string) => {
    const updated = editItems.filter(it => it.id !== itemId);
    setEditItems(updated);
    persistCurrent({ items: updated });
  };
  const editChecklistItemText = (itemId: string, text: string) => {
    const updated = editItems.map(it => it.id === itemId ? { ...it, text } : it);
    setEditItems(updated);
    persistCurrent({ items: updated });
  };

  const addLabel = () => {
    const val = newLabelText.trim();
    if (!val || editLabels.includes(val)) { setNewLabelText(""); setShowLabelInput(false); return; }
    const updated = [...editLabels, val];
    setEditLabels(updated);
    persistCurrent({ labels: updated });
    setNewLabelText("");
    setShowLabelInput(false);
  };
  const removeLabel = (label: string) => {
    const updated = editLabels.filter(l => l !== label);
    setEditLabels(updated);
    persistCurrent({ labels: updated });
  };

  const createNote = () => {
    const newNote: Note = {
      id: genId(), title: "", content: "", color: "default",
      pinned: false, archived: false, labels: [], checklist: false, items: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    openNote(newNote);
  };

  const openNote = (note: Note) => {
    setOpenId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color || "default");
    setEditPinned(!!note.pinned);
    setEditArchived(!!note.archived);
    setEditLabels(note.labels || []);
    setEditChecklist(!!note.checklist);
    setEditItems(note.items || []);
    setPreview(false);
    setShowColorPicker(false);
    setShowLabelInput(false);
    setHistory([{ title: note.title, content: note.content, checklist: !!note.checklist, items: note.items || [], color: note.color || "default" }]);
    setHistoryIndex(0);
  };

  const closeNote = () => {
    if (openId) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const updated = sortNotes(notes.map(n => n.id === openId ? {
        ...n, title: editTitle, content: editContent, color: editColor,
        checklist: editChecklist, items: editItems, labels: editLabels,
        updatedAt: Date.now(),
      } : n));
      setNotes(updated);
      saveNotes(updated);
    }
    setOpenId(null);
    setShowColorPicker(false);
    setShowFormatHelp(false);
  };

  const deleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    await saveNotes(updated);
    setConfirmDelete(null);
    if (openId === id) setOpenId(null);
  };

  const allLabels = Array.from(new Set(notes.flatMap(n => n.labels || []))).sort();

  const baseNotes = notes.filter(n => viewArchive ? n.archived : !n.archived);
  const labelFiltered = labelFilter ? baseNotes.filter(n => (n.labels || []).includes(labelFilter)) : baseNotes;
  const searched = search.trim()
    ? labelFiltered.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.items || []).some(it => it.text.toLowerCase().includes(search.toLowerCase()))
      )
    : labelFiltered;

  const pinnedNotes = searched.filter(n => n.pinned);
  const unpinnedNotes = searched.filter(n => !n.pinned);

  const noteToDelete = notes.find(n => n.id === confirmDelete);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${lineColor}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  const openNoteData = notes.find(n => n.id === openId);

  // ── CELOSTRÁNKOVÉ ZOBRAZENIE: otvorená poznámka ──
  if (openId && openNoteData) {
    const bg = getCardColor(editColor, darkMode);
    const dividerColor = darkMode || editColor !== "default" ? "rgba(255,255,255,0.12)" : lineColor;
    return (
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", background: bg, fontFamily: "var(--font-geist-sans)" }}>
        <style>{`
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
          .keep-input::placeholder{color:${theme.muted}}
          .keep-content::placeholder{color:${theme.muted}}
          .keep-preview h1{font-size:24px;font-weight:800;margin:0 0 10px}
          .keep-preview h2{font-size:19px;font-weight:700;margin:16px 0 8px}
          .keep-preview h3{font-size:16px;font-weight:700;margin:14px 0 6px}
          .keep-preview p{margin:8px 0;line-height:1.7}
          .keep-preview ul{margin:8px 0;padding-left:22px}
          .keep-preview li{margin:4px 0;line-height:1.6}
          .keep-preview strong{font-weight:800}
          .keep-preview em{font-style:italic}
          .keep-preview code{background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
          .keep-preview hr{border:none;border-top:1px solid rgba(0,0,0,0.15);margin:16px 0}
          .keep-swatch{transition:transform .12s ease}
          .keep-swatch:hover{transform:scale(1.15)}
          .keep-toolbtn:hover{opacity:0.7}
          .keep-item-input::placeholder{color:${theme.muted}}
        `}</style>

        {/* Toolbar hore */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderBottom: `1px solid ${dividerColor}`, flexWrap: "wrap" }}>
          <button
            onClick={closeNote}
            title="Späť na zoznam"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-geist-sans)", padding: "6px 4px" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Späť
          </button>

          <div style={{ width: 1, height: 20, background: dividerColor, margin: "0 4px" }} />

          {/* Pin */}
          <button
            onClick={() => togglePinned(openId)}
            title={editPinned ? "Odopnúť" : "Pripnúť navrch"}
            style={{ width: 30, height: 30, borderRadius: 8, background: editPinned ? appliedA + "22" : "transparent", border: "none", color: editPinned ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={editPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
          </button>

          {/* Checklist toggle */}
          <button
            onClick={toggleChecklistMode}
            title={editChecklist ? "Prepnúť na text" : "Prepnúť na zoznam úloh"}
            style={{ width: 30, height: 30, borderRadius: 8, background: editChecklist ? appliedA + "22" : "transparent", border: "none", color: editChecklist ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </button>

          <div style={{ width: 1, height: 20, background: dividerColor, margin: "0 4px" }} />

          {!editChecklist && !preview && (
            <div style={{ display: "flex", gap: 4, position: "relative" }}>
              {[
                { label: "B", insert: "**tučný text**", title: "Tučné písmo — **text**" },
                { label: "I", insert: "*kurzíva*", title: "Kurzíva — *text*" },
                { label: "H", insert: "## ", title: "Nadpis — ## Nadpis (alebo # a ### pre iné veľkosti)" },
                { label: "—", insert: "\n---\n", title: "Vodorovná čiara — ---" },
                { label: "•", insert: "- ", title: "Odrážkový zoznam — - položka" },
                { label: "</>", insert: "`kód`", title: "Kód — `text`" },
              ].map(btn => (
                <button
                  key={btn.label}
                  title={btn.title}
                  onClick={() => handleContentChange(editContent + (editContent && !editContent.endsWith("\n") ? "\n" : "") + btn.insert)}
                  style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(0,0,0,0.06)", border: "none", color: theme.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
                >
                  {btn.label}
                </button>
              ))}
              <button
                onClick={() => setShowFormatHelp(v => !v)}
                title="Zobraziť pomocníka formátovania"
                style={{ width: 26, height: 26, borderRadius: "50%", background: showFormatHelp ? appliedA : "rgba(0,0,0,0.06)", border: "none", color: showFormatHelp ? "#fff" : theme.muted, cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-geist-sans)" }}
              >
                ?
              </button>
              {showFormatHelp && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: surface, border: `1px solid ${lineColor}`, borderRadius: 12, padding: 16, width: 320, boxShadow: "0 12px 32px rgba(0,0,0,0.25)", zIndex: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginBottom: 10 }}>Podporované formátovanie</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: theme.text }}>
                    {[
                      { syntax: "# Nadpis", desc: "Veľký nadpis (1. úroveň)" },
                      { syntax: "## Nadpis", desc: "Stredný nadpis (2. úroveň)" },
                      { syntax: "### Nadpis", desc: "Malý nadpis (3. úroveň)" },
                      { syntax: "**text**", desc: "Tučné písmo" },
                      { syntax: "*text*", desc: "Kurzíva" },
                      { syntax: "`text`", desc: "Kód (monospace)" },
                      { syntax: "- položka", desc: "Odrážkový zoznam (jedna položka na riadok)" },
                      { syntax: "---", desc: "Vodorovná oddeľovacia čiara" },
                      { syntax: "prázdny riadok", desc: "Nový odstavec" },
                    ].map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <code style={{ background: theme.card2, padding: "2px 6px", borderRadius: 5, fontFamily: "monospace", fontSize: 11.5, flexShrink: 0, whiteSpace: "nowrap" }}>{row.syntax}</code>
                        <span style={{ color: theme.muted }}>{row.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 10, fontStyle: "italic" }}>
                    Použi tlačidlá B, I, H, —, •, {"</>"} vyššie na rýchle vloženie, alebo píš syntax priamo.
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />
          {saving && <div style={{ fontSize: 11, color: theme.muted, fontStyle: "italic" }}>Ukladám...</div>}

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Späť (undo)"
            style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "none", color: historyIndex <= 0 ? theme.muted + "80" : theme.text, cursor: historyIndex <= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Dopredu (redo)"
            style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "none", color: historyIndex >= history.length - 1 ? theme.muted + "80" : theme.text, cursor: historyIndex >= history.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
          </button>

          {!editChecklist && (
            <button
              onClick={() => setPreview(v => !v)}
              style={{ padding: "6px 14px", borderRadius: 8, background: preview ? appliedA : "rgba(0,0,0,0.06)", border: "none", color: preview ? "#fff" : theme.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
            >
              {preview ? "Upraviť" : "Náhľad"}
            </button>
          )}

          {/* Farba paletka */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowColorPicker(v => !v)}
              title="Farba poznámky"
              style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${lineColor}`, background: getCardColor(editColor, darkMode), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            </button>
            {showColorPicker && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: surface, border: `1px solid ${lineColor}`, borderRadius: 12, padding: 10, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 10 }}>
                {NOTE_COLORS.map(c => (
                  <div
                    key={c.id}
                    className="keep-swatch"
                    onClick={() => handleColorChange(c.id)}
                    title={c.id}
                    style={{
                      width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                      background: darkMode ? c.dark : c.light,
                      border: editColor === c.id ? `2px solid ${appliedA}` : `1px solid ${lineColor}`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Archív */}
          <button
            onClick={() => toggleArchivedFor(openId)}
            title={editArchived ? "Zrušiť archiváciu" : "Archivovať"}
            style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "none", color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </button>

          <button
            onClick={() => setConfirmDelete(openId)}
            title="Vymazať"
            style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.75 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>

        {/* Obsah */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "32px 24px 60px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column" }}>
            <input
              value={editTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Názov"
              className="keep-input"
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 30, fontWeight: 800, color: theme.text, fontFamily: "var(--font-geist-sans)", marginBottom: 18, padding: 0 }}
            />

            {editChecklist ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editItems.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      onClick={() => toggleChecklistItem(item.id)}
                      style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                        border: `2px solid ${item.checked ? appliedA : theme.muted}`,
                        background: item.checked ? appliedA : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {item.checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <input
                      value={item.text}
                      onChange={e => editChecklistItemText(item.id, e.target.value)}
                      className="keep-item-input"
                      style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        fontSize: 15, color: theme.text, fontFamily: "var(--font-geist-sans)",
                        textDecoration: item.checked ? "line-through" : "none",
                        opacity: item.checked ? 0.55 : 1,
                      }}
                    />
                    <div onClick={() => removeChecklistItem(item.id)} style={{ cursor: "pointer", color: theme.muted, opacity: 0.6, flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px dashed ${theme.muted}` }} />
                  <input
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addChecklistItem(); }}
                    placeholder="Pridať položku"
                    className="keep-item-input"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: theme.text, fontFamily: "var(--font-geist-sans)" }}
                  />
                </div>
              </div>
            ) : preview ? (
              <div
                className="keep-preview"
                style={{ flex: 1, color: theme.text, fontSize: 16, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: editContent ? renderMarkdown(editContent) : '<p style="color:' + theme.muted + ';font-style:italic">Prázdna poznámka.</p>' }}
              />
            ) : (
              <textarea
                value={editContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Napíš niečo... (podporuje markdown formátovanie — klikni na ? vyššie pre zoznam)"
                className="keep-content"
                autoFocus
                style={{ flex: 1, minHeight: 400, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 16, lineHeight: 1.75, color: theme.text, fontFamily: "var(--font-geist-sans)", padding: 0 }}
              />
            )}

            {/* Štítky */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${dividerColor}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {editLabels.map(label => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(0,0,0,0.06)", fontSize: 12, fontWeight: 600, color: theme.text }}>
                  {label}
                  <span onClick={() => removeLabel(label)} style={{ cursor: "pointer", opacity: 0.6, display: "flex" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </span>
                </div>
              ))}
              {showLabelInput ? (
                <input
                  autoFocus
                  value={newLabelText}
                  onChange={e => setNewLabelText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addLabel(); if (e.key === "Escape") { setShowLabelInput(false); setNewLabelText(""); } }}
                  onBlur={addLabel}
                  placeholder="Názov štítku"
                  style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${lineColor}`, background: "transparent", outline: "none", fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: "var(--font-geist-sans)", width: 110 }}
                />
              ) : (
                <div
                  onClick={() => setShowLabelInput(true)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, border: `1px dashed ${theme.muted}`, fontSize: 12, fontWeight: 600, color: theme.muted, cursor: "pointer" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Štítok
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CONFIRM DELETE MODAL ── */}
        {confirmDelete && (
          <div
            onClick={() => setConfirmDelete(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .15s ease" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: surface, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%", border: `1px solid ${lineColor}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", animation: "popIn .18s ease" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.text }}>Vymazať poznámku?</div>
              </div>
              <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 6 }}>
                {noteToDelete && <>Poznámka „<strong style={{ color: theme.text }}>{noteToDelete.title || "Bez názvu"}</strong>" bude natrvalo vymazaná.</>}
              </div>
              <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginBottom: 18 }}>Táto akcia sa nedá vrátiť späť.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmDelete(null)} style={{ background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9, padding: "8px 16px", color: theme.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
                <button onClick={() => deleteNote(confirmDelete)} style={{ background: "#ef4444", border: "none", borderRadius: 9, padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Vymazať natrvalo</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MRIEŽKA KARIET ──
  const NoteCard = ({ note }: { note: Note }) => {
    const bg = getCardColor(note.color || "default", darkMode);
    const isDefault = (note.color || "default") === "default";
    const textColor = darkMode || !isDefault ? theme.text : "#1a1a1a";
    const mutedColor = darkMode || !isDefault ? theme.muted : "#666";
    return (
      <div className="keep-card-wrap">
        <div
          className="keep-card"
          onClick={() => openNote(note)}
          style={{
            background: bg,
            border: `1px solid ${isDefault ? lineColor : "rgba(0,0,0,0.08)"}`,
            borderRadius: 14, padding: "14px 16px", cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex", flexDirection: "column", gap: 6,
            position: "relative",
          }}
        >
          {note.pinned && (
            <div style={{ position: "absolute", top: 10, right: 10, color: mutedColor, opacity: 0.7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingRight: note.pinned ? 18 : 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {note.title || "Bez názvu"}
            </div>
            {!note.pinned && (
              <div
                onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }}
                style={{ opacity: 0.4, cursor: "pointer", color: "#ef4444", flexShrink: 0 }}
                title="Vymazať"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
            )}
          </div>
          {note.checklist ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {note.items.slice(0, 6).map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${item.checked ? appliedA : mutedColor}`, background: item.checked ? appliedA : "transparent" }} />
                  <span style={{ color: item.checked ? mutedColor : textColor, textDecoration: item.checked ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</span>
                </div>
              ))}
              {note.items.length > 6 && <div style={{ fontSize: 11, color: mutedColor }}>+{note.items.length - 6} ďalších</div>}
            </div>
          ) : note.content && (
            <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", whiteSpace: "pre-wrap" }}>
              {note.content.replace(/[#*`]/g, "")}
            </div>
          )}
          {note.labels && note.labels.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {note.labels.map(l => (
                <span key={l} style={{ fontSize: 10.5, fontWeight: 600, color: mutedColor, background: "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: 10 }}>{l}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <div style={{ fontSize: 10.5, color: mutedColor }}>{timeAgo(note.updatedAt)}</div>
            {!viewArchive && (
              <div
                onClick={e => { e.stopPropagation(); toggleArchivedFor(note.id); }}
                title="Archivovať"
                style={{ opacity: 0.4, cursor: "pointer", color: mutedColor }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              </div>
            )}
            {viewArchive && (
              <button
                onClick={e => { e.stopPropagation(); toggleArchivedFor(note.id); }}
                style={{ fontSize: 10.5, fontWeight: 700, color: appliedA, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Obnoviť
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "24px 28px 80px", background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .keep-input::placeholder{color:${theme.muted}}
        .keep-card{transition:box-shadow .15s ease, transform .1s ease;}
        .keep-card:hover{box-shadow:0 4px 14px rgba(0,0,0,0.15);}
        .keep-grid{column-count:1;column-gap:16px;}
        @media (min-width:600px){.keep-grid{column-count:2;}}
        @media (min-width:900px){.keep-grid{column-count:3;}}
        @media (min-width:1250px){.keep-grid{column-count:4;}}
        @media (min-width:1550px){.keep-grid{column-count:5;}}
        .keep-card-wrap{break-inside:avoid;margin-bottom:16px;}
        .keep-toolbtn:hover{opacity:0.7}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: theme.text }}>{viewArchive ? "Archív" : "Poznámky"}</div>
          <button
            onClick={() => { setViewArchive(v => !v); setLabelFilter(null); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, background: viewArchive ? appliedA + "18" : "transparent", border: `1px solid ${viewArchive ? appliedA : lineColor}`, color: viewArchive ? appliedA : theme.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            {viewArchive ? "Späť na poznámky" : "Archív"}
          </button>
          {allLabels.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowLabelFilterMenu(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, background: labelFilter ? appliedA + "18" : "transparent", border: `1px solid ${labelFilter ? appliedA : lineColor}`, color: labelFilter ? appliedA : theme.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.82z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
                {labelFilter || "Štítky"}
              </button>
              {showLabelFilterMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: surface, border: `1px solid ${lineColor}`, borderRadius: 10, padding: 6, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 20 }}>
                  {labelFilter && (
                    <div onClick={() => { setLabelFilter(null); setShowLabelFilterMenu(false); }} style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#ef4444" }}>Zrušiť filter</div>
                  )}
                  {allLabels.map(l => (
                    <div key={l} onClick={() => { setLabelFilter(l); setShowLabelFilterMenu(false); }} style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: theme.text, background: labelFilter === l ? theme.card2 : "transparent" }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.muted }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hľadať v poznámkach..."
              className="keep-input"
              style={{ width: 220, background: theme.card, border: `1px solid ${lineColor}`, borderRadius: 10, padding: "8px 12px 8px 32px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {!viewArchive && (
            <button
              onClick={createNote}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: grad, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 3px 10px ${appliedA}44` }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Nová poznámka
            </button>
          )}
        </div>
      </div>

      {/* Mriežka kariet */}
      {searched.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: theme.muted, padding: "60px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{search ? "Žiadne výsledky" : viewArchive ? "Archív je prázdny" : "Zatiaľ žiadne poznámky"}</div>
        </div>
      ) : (
        <>
          {pinnedNotes.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Pripnuté</div>
              <div className="keep-grid" style={{ marginBottom: 24 }}>
                {pinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
              {unpinnedNotes.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Ostatné</div>
              )}
            </>
          )}
          <div className="keep-grid">
            {unpinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
          </div>
        </>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .15s ease" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: surface, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%", border: `1px solid ${lineColor}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", animation: "popIn .18s ease" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: theme.text }}>Vymazať poznámku?</div>
            </div>
            <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 6 }}>
              {noteToDelete && <>Poznámka „<strong style={{ color: theme.text }}>{noteToDelete.title || "Bez názvu"}</strong>" bude natrvalo vymazaná.</>}
            </div>
            <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginBottom: 18 }}>Táto akcia sa nedá vrátiť späť.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9, padding: "8px 16px", color: theme.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Zrušiť</button>
              <button onClick={() => deleteNote(confirmDelete)} style={{ background: "#ef4444", border: "none", borderRadius: 9, padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Vymazať natrvalo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}