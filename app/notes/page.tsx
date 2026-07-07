"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

type Note = {
  id: string;
  title: string;
  content: string;
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
  const router = useRouter();
  const { grad, theme, appliedA, darkMode } = useTheme();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showList, setShowList] = useState(true);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const surface = theme.card;
  const lineColor = theme.border;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      const loaded: Note[] = data.notes ?? [];
      setNotes(loaded.sort((a, b) => b.updatedAt - a.updatedAt));
      if (loaded.length > 0) {
        const first = loaded.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setSelectedId(first.id);
        setEditTitle(first.title);
        setEditContent(first.content);
      }
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

  // Auto-save pri zmene obsahu (debounce 1s)
  const handleContentChange = (value: string) => {
    setEditContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      const updated = notes.map(n =>
        n.id === selectedId ? { ...n, content: value, title: editTitle, updatedAt: Date.now() } : n
      ).sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(updated);
      saveNotes(updated);
    }, 1000);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      const updated = notes.map(n =>
        n.id === selectedId ? { ...n, title: value, content: editContent, updatedAt: Date.now() } : n
      ).sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(updated);
      saveNotes(updated);
    }, 1000);
  };

  const createNote = () => {
    const newNote: Note = {
      id: genId(),
      title: "Nová poznámka",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setSelectedId(newNote.id);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    saveNotes(updated);
    if (isMobile) setShowList(false);
  };

  const selectNote = (note: Note) => {
    // Uložíme aktuálnu poznámku pred prepnutím
    if (selectedId && saveTimer.current) {
      clearTimeout(saveTimer.current);
      const updated = notes.map(n =>
        n.id === selectedId ? { ...n, title: editTitle, content: editContent, updatedAt: Date.now() } : n
      ).sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(updated);
      saveNotes(updated);
    }
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setPreview(false);
    if (isMobile) setShowList(false);
  };

  const deleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    await saveNotes(updated);
    if (selectedId === id) {
      if (updated.length > 0) {
        setSelectedId(updated[0].id);
        setEditTitle(updated[0].title);
        setEditContent(updated[0].content);
      } else {
        setSelectedId(null);
        setEditTitle("");
        setEditContent("");
      }
    }
    setConfirmDelete(null);
  };

  const selectedNote = notes.find(n => n.id === selectedId);
  const filteredNotes = search.trim()
    ? notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const noteToDelete = notes.find(n => n.id === confirmDelete);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${lineColor}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .notes-input::placeholder{color:${theme.muted}}
        .notes-content::placeholder{color:${theme.muted}}
        .notes-preview h1{font-size:22px;font-weight:800;margin:0 0 8px}
        .notes-preview h2{font-size:18px;font-weight:700;margin:16px 0 6px}
        .notes-preview h3{font-size:15px;font-weight:700;margin:14px 0 4px}
        .notes-preview p{margin:6px 0;line-height:1.65}
        .notes-preview ul{margin:6px 0;padding-left:20px}
        .notes-preview li{margin:3px 0;line-height:1.6}
        .notes-preview strong{font-weight:800}
        .notes-preview em{font-style:italic}
        .notes-preview code{background:${lineColor};padding:2px 5px;border-radius:4px;font-family:monospace;font-size:12.5px}
        .notes-preview hr{border:none;border-top:1px solid ${lineColor};margin:16px 0}
        .notes-list-item:hover{background:${theme.card2}!important}
        .notes-action:hover{opacity:1!important}
      `}</style>

      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

        {/* ── ĽAVÝ PANEL: zoznam poznámok ── */}
        {(!isMobile || showList) && (
          <div style={{
            width: isMobile ? "100%" : 280, flexShrink: 0,
            borderRight: `1px solid ${lineColor}`,
            display: "flex", flexDirection: "column",
            background: surface,
          }}>
            {/* Header */}
            <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${lineColor}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Poznámky</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {saving && <div style={{ fontSize: 10, color: theme.muted, fontStyle: "italic" }}>Ukladám...</div>}
                  <button
                    onClick={createNote}
                    style={{ width: 30, height: 30, borderRadius: 8, background: grad, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${appliedA}44` }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>
              {/* Vyhľadávanie */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: theme.muted }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Hľadať..."
                  className="notes-input"
                  style={{ width: "100%", background: theme.card2, border: `1px solid ${lineColor}`, borderRadius: 9, padding: "7px 10px 7px 28px", color: theme.text, fontFamily: "var(--font-geist-sans)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Zoznam */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredNotes.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: theme.muted, fontSize: 13 }}>
                  {search ? "Žiadne výsledky" : "Zatiaľ žiadne poznámky"}
                </div>
              ) : (
                filteredNotes.map(note => (
                  <div
                    key={note.id}
                    className="notes-list-item"
                    onClick={() => selectNote(note)}
                    style={{
                      padding: "11px 16px", cursor: "pointer",
                      borderBottom: `1px solid ${lineColor}`,
                      background: selectedId === note.id ? appliedA + "12" : "transparent",
                      borderLeft: selectedId === note.id ? `3px solid ${appliedA}` : "3px solid transparent",
                      transition: "background .12s",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {note.title || "Bez názvu"}
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {note.content ? note.content.slice(0, 60).replace(/[#*`]/g, "").trim() + (note.content.length > 60 ? "..." : "") : "Prázdna poznámka"}
                        </div>
                        <div style={{ fontSize: 10, color: theme.muted, marginTop: 3 }}>{timeAgo(note.updatedAt)}</div>
                      </div>
                      <div
                        className="notes-action"
                        onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }}
                        style={{ opacity: 0.4, cursor: "pointer", color: "#ef4444", flexShrink: 0, transition: "opacity .15s" }}
                        title="Vymazať"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── PRAVÝ PANEL: editor ── */}
        {(!isMobile || !showList) && (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: theme.bg }}>
            {selectedNote ? (
              <>
                {/* Editor toolbar */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${lineColor}`, display: "flex", alignItems: "center", gap: 10, background: surface }}>
                  {isMobile && (
                    <button
                      onClick={() => setShowList(true)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-geist-sans)", padding: "4px 0" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Späť
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {saving && <div style={{ fontSize: 10.5, color: theme.muted, fontStyle: "italic" }}>Ukladám...</div>}
                  {/* Markdown toolbar */}
                  {!preview && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {[
                        { label: "B", title: "Tučné (**text**)", insert: "**tučný text**" },
                        { label: "I", title: "Kurzíva (*text*)", insert: "*kurzíva*" },
                        { label: "H", title: "Nadpis (## Nadpis)", insert: "## " },
                        { label: "—", title: "Oddeľovač (---)", insert: "\n---\n" },
                        { label: "•", title: "Zoznam (- položka)", insert: "- " },
                        { label: "</>", title: "Kód (`kód`)", insert: "`kód`" },
                      ].map(btn => (
                        <button
                          key={btn.label}
                          title={btn.title}
                          onClick={() => {
                            const newContent = editContent + (editContent && !editContent.endsWith("\n") ? "\n" : "") + btn.insert;
                            handleContentChange(newContent);
                          }}
                          style={{ padding: "4px 8px", borderRadius: 6, background: theme.card2, border: `1px solid ${lineColor}`, color: theme.text, fontSize: btn.label === "I" ? 12 : 11, fontWeight: btn.label === "B" ? 900 : 700, cursor: "pointer", fontFamily: btn.label === "I" ? "serif" : "var(--font-geist-sans)", fontStyle: btn.label === "I" ? "italic" : "normal" }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setPreview(v => !v)}
                    style={{ padding: "5px 12px", borderRadius: 8, background: preview ? appliedA : theme.card2, border: `1px solid ${preview ? appliedA : lineColor}`, color: preview ? "#fff" : theme.muted, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", transition: "all .15s" }}
                  >
                    {preview ? "Upraviť" : "Náhľad"}
                  </button>
                </div>

                {/* Obsah editora */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "24px 32px", overflowY: "auto" }}>
                  {/* Názov poznámky */}
                  <input
                    value={editTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Názov poznámky"
                    className="notes-input"
                    style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: isMobile ? 20 : 24, fontWeight: 800, color: theme.text, fontFamily: "var(--font-geist-sans)", marginBottom: 16, padding: 0 }}
                  />

                  {/* Editor / Preview */}
                  {preview ? (
                    <div
                      className="notes-preview"
                      style={{ flex: 1, color: theme.text, fontSize: 14.5, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: editContent ? renderMarkdown(editContent) : '<p style="color:' + theme.muted + ';font-style:italic">Prázdna poznámka — prepni späť do editora a začni písať.</p>' }}
                    />
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={e => handleContentChange(e.target.value)}
                      placeholder={"Začni písať... Markdown je podporovaný:\n# Nadpis\n**tučné** *kurzíva*\n- Zoznam\n`kód`"}
                      className="notes-content"
                      style={{ flex: 1, minHeight: 300, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14.5, lineHeight: 1.7, color: theme.text, fontFamily: "var(--font-geist-sans)", padding: 0 }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: theme.muted }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Vyber poznámku alebo vytvor novú</div>
                <button
                  onClick={createNote}
                  style={{ padding: "10px 22px", borderRadius: 12, background: grad, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: `0 4px 14px ${appliedA}44` }}
                >
                  + Nová poznámka
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .15s ease" }}
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
              {noteToDelete && <>Poznámka „<strong style={{ color: theme.text }}>{noteToDelete.title}</strong>" bude natrvalo vymazaná.</>}
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