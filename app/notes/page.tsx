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

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

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

export default function NotesPage() {
  const { grad, theme, appliedA, darkMode } = useTheme();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // otvorená poznámka v modáli (null = zatvorené)
  const [openId, setOpenId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState("default");
  const [preview, setPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const loaded: Note[] = (data.notes ?? []).map((n: any) => ({ color: "default", ...n }));
      setNotes(loaded.sort((a: Note, b: Note) => b.updatedAt - a.updatedAt));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveNotes = useCallback(async (updatedNotes: Note[]) => {
    if (!uid) return;
    setSaving(true);
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", uid), { notes: updatedNotes }, { merge: true });
    setSaving(false);
  }, [uid]);

  const persistField = (id: string, patch: Partial<Note>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const updated = notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(updated);
      saveNotes(updated);
    }, 700);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    if (openId) persistField(openId, { title: value, content: editContent });
  };
  const handleContentChange = (value: string) => {
    setEditContent(value);
    if (openId) persistField(openId, { title: editTitle, content: value });
  };
  const handleColorChange = (colorId: string) => {
    setEditColor(colorId);
    setShowColorPicker(false);
    if (!openId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const updated = notes.map(n => n.id === openId ? { ...n, color: colorId, updatedAt: Date.now() } : n)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(updated);
    saveNotes(updated);
  };

  const createNote = () => {
    const newNote: Note = {
      id: genId(), title: "", content: "", color: "default",
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
    setPreview(false);
    setShowColorPicker(false);
  };

  const closeModal = () => {
    // finálne uloženie pri zatvorení, bez čakania na debounce
    if (openId) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const updated = notes.map(n => n.id === openId ? { ...n, title: editTitle, content: editContent, color: editColor, updatedAt: (editTitle !== n.title || editContent !== n.content || editColor !== n.color) ? Date.now() : n.updatedAt } : n)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(updated);
      saveNotes(updated);
    }
    setOpenId(null);
    setShowColorPicker(false);
  };

  const deleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    await saveNotes(updated);
    setConfirmDelete(null);
    if (openId === id) setOpenId(null);
  };

  const filteredNotes = search.trim()
    ? notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const noteToDelete = notes.find(n => n.id === confirmDelete);
  const openNoteData = notes.find(n => n.id === openId);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${lineColor}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "24px 28px 80px", background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .keep-input::placeholder{color:${theme.muted}}
        .keep-content::placeholder{color:${theme.muted}}
        .keep-card{transition:box-shadow .15s ease, transform .1s ease;}
        .keep-card:hover{box-shadow:0 4px 14px rgba(0,0,0,0.15);}
        .keep-grid{column-count:1;column-gap:16px;}
        @media (min-width:600px){.keep-grid{column-count:2;}}
        @media (min-width:900px){.keep-grid{column-count:3;}}
        @media (min-width:1250px){.keep-grid{column-count:4;}}
        @media (min-width:1550px){.keep-grid{column-count:5;}}
        .keep-card-wrap{break-inside:avoid;margin-bottom:16px;}
        .keep-preview h1{font-size:20px;font-weight:800;margin:0 0 8px}
        .keep-preview h2{font-size:16px;font-weight:700;margin:14px 0 6px}
        .keep-preview h3{font-size:14px;font-weight:700;margin:12px 0 4px}
        .keep-preview p{margin:6px 0;line-height:1.6}
        .keep-preview ul{margin:6px 0;padding-left:20px}
        .keep-preview li{margin:3px 0;line-height:1.55}
        .keep-preview strong{font-weight:800}
        .keep-preview em{font-style:italic}
        .keep-preview code{background:rgba(0,0,0,0.08);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:12px}
        .keep-preview hr{border:none;border-top:1px solid rgba(0,0,0,0.15);margin:14px 0}
        .keep-swatch{transition:transform .12s ease}
        .keep-swatch:hover{transform:scale(1.15)}
        .keep-toolbtn:hover{opacity:0.7}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: theme.text }}>Poznámky</div>
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
          <button
            onClick={createNote}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: grad, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 3px 10px ${appliedA}44` }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Nová poznámka
          </button>
        </div>
      </div>

      {/* Mriežka kariet */}
      {filteredNotes.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: theme.muted, padding: "60px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{search ? "Žiadne výsledky" : "Zatiaľ žiadne poznámky"}</div>
        </div>
      ) : (
        <div className="keep-grid">
          {filteredNotes.map(note => {
            const bg = getCardColor(note.color || "default", darkMode);
            const isDefault = (note.color || "default") === "default";
            return (
              <div key={note.id} className="keep-card-wrap">
                <div
                  className="keep-card"
                  onClick={() => openNote(note)}
                  style={{
                    background: bg,
                    border: `1px solid ${isDefault ? lineColor : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: darkMode || !isDefault ? theme.text : "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {note.title || "Bez názvu"}
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }}
                      style={{ opacity: 0.4, cursor: "pointer", color: "#ef4444", flexShrink: 0 }}
                      title="Vymazať"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </div>
                  </div>
                  {note.content && (
                    <div style={{ fontSize: 13, color: darkMode || !isDefault ? theme.muted : "#555", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", whiteSpace: "pre-wrap" }}>
                      {note.content.replace(/[#*`]/g, "")}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: darkMode || !isDefault ? theme.muted : "#777", marginTop: 4 }}>
                    {timeAgo(note.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: otvorená poznámka (editor) ── */}
      {openId && openNoteData && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn .15s ease" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: getCardColor(editColor, darkMode),
              borderRadius: 16, width: "min(1100px, 94vw)", height: "88vh", maxHeight: "88vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              animation: "popIn .18s ease",
              border: `1px solid ${editColor === "default" ? lineColor : "rgba(0,0,0,0.1)"}`,
            }}
          >
            {/* Toolbar hore */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${darkMode || editColor !== "default" ? "rgba(255,255,255,0.1)" : lineColor}`, flexWrap: "wrap" }}>
              {!preview && (
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { label: "B", insert: "**tučný text**", title: "Tučné" },
                    { label: "I", insert: "*kurzíva*", title: "Kurzíva" },
                    { label: "H", insert: "## ", title: "Nadpis" },
                    { label: "—", insert: "\n---\n", title: "Oddeľovač" },
                    { label: "•", insert: "- ", title: "Zoznam" },
                    { label: "</>", insert: "`kód`", title: "Kód" },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      title={btn.title}
                      onClick={() => handleContentChange(editContent + (editContent && !editContent.endsWith("\n") ? "\n" : "") + btn.insert)}
                      style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(0,0,0,0.06)", border: "none", color: theme.text, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
              {saving && <div style={{ fontSize: 10.5, color: theme.muted, fontStyle: "italic" }}>Ukladám...</div>}
              <button
                onClick={() => setPreview(v => !v)}
                style={{ padding: "5px 12px", borderRadius: 8, background: preview ? appliedA : "rgba(0,0,0,0.06)", border: "none", color: preview ? "#fff" : theme.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
              >
                {preview ? "Upraviť" : "Náhľad"}
              </button>

              {/* Farba paletka */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowColorPicker(v => !v)}
                  title="Farba poznámky"
                  style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${lineColor}`, background: getCardColor(editColor, darkMode), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
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

              <button
                onClick={() => setConfirmDelete(openId)}
                title="Vymazať"
                style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>

              <button
                onClick={closeModal}
                title="Zavrieť"
                style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "none", color: theme.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Obsah */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column" }}>
              <input
                value={editTitle}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Názov"
                className="keep-input"
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 26, fontWeight: 800, color: theme.text, fontFamily: "var(--font-geist-sans)", marginBottom: 16, padding: 0 }}
              />
              {preview ? (
                <div
                  className="keep-preview"
                  style={{ flex: 1, color: theme.text, fontSize: 15.5, lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: editContent ? renderMarkdown(editContent) : '<p style="color:' + theme.muted + ';font-style:italic">Prázdna poznámka.</p>' }}
                />
              ) : (
                <textarea
                  value={editContent}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder="Napíš niečo..."
                  className="keep-content"
                  style={{ flex: 1, minHeight: 400, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 15.5, lineHeight: 1.7, color: theme.text, fontFamily: "var(--font-geist-sans)", padding: 0 }}
                />
              )}
            </div>
          </div>
        </div>
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