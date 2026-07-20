"use client";

import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { useTheme } from "../../../context/ThemeContext";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
if (getApps().length === 0) initializeApp(firebaseConfig);

type ChecklistItem = { id: string; text: string; checked: boolean };
type NoteFile = { name: string; url: string };

type SharedNote = {
  id: string;
  title: string;
  content: string;
  color: string;
  labels: string[];
  checklist: boolean;
  items: ChecklistItem[];
  images: string[];
  files: NoteFile[];
  updatedAt: number;
};

// Rovnaká paletka farieb ako v app/notes/page.tsx, aby zdieľaná poznámka vyzerala rovnako
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

const LABEL_COLORS = [
  "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#a855f7", "#f43f5e", "#84cc16",
];

function getLabelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) & 0xffffffff;
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

function getCardColor(colorId: string, darkMode: boolean): string {
  const c = NOTE_COLORS.find(c => c.id === colorId) ?? NOTE_COLORS[0];
  return darkMode ? c.dark : c.light;
}

export default function SharedNoteView({ token }: { token: string }) {
  const { theme, appliedA, darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<SharedNote | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { getFirestore, collection, query, where, limit, getDocs } = await import("firebase/firestore");
        const db = getFirestore();
        // Dôležité: filter na publicLinkEnabled == true musí byť súčasťou dotazu (nie len security rule),
        // inak Firestore odmietne dotaz pre neprihláseného návštevníka ako "neoveriteľne bezpečný".
        const q = query(
          collection(db, "notes"),
          where("publicLinkToken", "==", token),
          where("publicLinkEnabled", "==", true),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setNotFound(true);
        } else {
          const d = snap.docs[0].data();
          setNote({
            id: snap.docs[0].id,
            title: d.title || "",
            content: d.content || "",
            color: d.color || "default",
            labels: Array.isArray(d.labels) ? d.labels : [],
            checklist: !!d.checklist,
            items: Array.isArray(d.items) ? d.items : [],
            images: Array.isArray(d.images) ? d.images : [],
            files: Array.isArray(d.files) ? d.files : [],
            updatedAt: d.updatedAt || 0,
          });
        }
      } catch (err) {
        console.error("Chyba pri načítaní zdieľanej poznámky:", err);
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const surface = theme.card;
  const lineColor = theme.border;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${lineColor}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: theme.bg, color: theme.text, fontFamily: "var(--font-geist-sans)", padding: 24, textAlign: "center" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="12" y1="17.5" x2="12.01" y2="17.5"/></svg>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Táto poznámka nie je dostupná</div>
        <div style={{ fontSize: 13, color: theme.muted, maxWidth: 320 }}>Odkaz je neplatný, alebo vlastník zdieľanie medzičasom vypol.</div>
      </div>
    );
  }

  const bg = getCardColor(note.color, darkMode);
  const dividerColor = darkMode || note.color !== "default" ? "rgba(255,255,255,0.12)" : lineColor;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "var(--font-geist-sans)" }}>
      <style>{`
        .shared-note-content{outline:none;}
        .shared-note-content h1{font-size:26px;font-weight:800;margin:18px 0 8px;line-height:1.3;}
        .shared-note-content h2{font-size:20px;font-weight:800;margin:16px 0 8px;line-height:1.35;}
        .shared-note-content h3{font-size:16.5px;font-weight:700;margin:14px 0 6px;line-height:1.4;color:${theme.muted};}
        .shared-note-content p{margin:8px 0;line-height:1.7}
        .shared-note-content ul{margin:10px 0;padding-left:24px;list-style-type:disc;list-style-position:outside;}
        .shared-note-content li{margin:5px 0;line-height:1.6;display:list-item;padding-left:2px;}
        .shared-note-content b, .shared-note-content strong{font-weight:800}
        .shared-note-content i, .shared-note-content em{font-style:italic}
        .shared-note-content code{background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
        .shared-note-content hr{border:none;border-top:1px solid rgba(0,0,0,0.15);margin:18px 0}
        .note-chk-line{display:flex;align-items:flex-start;gap:9px;margin:6px 0;}
        .note-chk-box{flex-shrink:0;display:inline-flex;margin-top:3px;}
        .note-chk-text{flex:1;min-width:0;}
        .note-chk-text.note-chk-done{text-decoration:line-through;opacity:.55;}
      `}</style>

      {/* Hlavička — len značka appky, žiadny toolbar (obsah je len na čítanie) */}
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${dividerColor}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.muted, letterSpacing: "0.3px" }}>Ticklydo</span>
        <span style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>· zdieľaná poznámka (len na čítanie)</span>
      </div>

      <div style={{ padding: "32px 24px 60px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: theme.text, marginBottom: 16 }}>
            {note.title || "Bez názvu"}
          </div>

          {note.checklist ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {note.items.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${item.checked ? appliedA : theme.muted}`,
                    background: item.checked ? appliedA : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize: 15, color: theme.text, textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.55 : 1 }}>{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="shared-note-content"
              dangerouslySetInnerHTML={{ __html: note.content }}
              style={{ fontSize: 16, lineHeight: 1.7, color: theme.text }}
            />
          )}

          {note.labels.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 20 }}>
              {note.labels.map(l => (
                <span key={l} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: getLabelColor(l), padding: "3px 10px", borderRadius: 12 }}>{l}</span>
              ))}
            </div>
          )}

          {note.images.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, paddingTop: 16, borderTop: `1px solid ${dividerColor}` }}>Prílohy</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {note.images.map((url, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${dividerColor}` }}>
                    <img src={url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {note.files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {note.images.length === 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, paddingTop: 16, borderTop: `1px solid ${dividerColor}` }}>Prílohy</div>
              )}
              {note.files.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${dividerColor}`, textDecoration: "none", color: theme.text }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ef444422", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#ef4444" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}