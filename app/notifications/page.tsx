"use client";

import React, { useState, useEffect } from "react";
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

type NotifType = "deadline" | "member_joined";

type AppNotification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  projectDocId?: string;
  projectName?: string;
  read: boolean;
  createdAt: number;
};

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

const TYPE_ICON: Record<NotifType, React.ReactElement> = {
  deadline: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  member_joined: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { theme, appliedA, grad } = useTheme();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
    let unsubSnap: (() => void) | null = null;
    (async () => {
      const { getFirestore, collection, query, where, orderBy, limit, onSnapshot } = await import("firebase/firestore");
      const db = getFirestore();
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      unsubSnap = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      });
    })();
    return () => { if (unsubSnap) unsubSnap(); };
  }, [uid]);

  const markAsRead = async (id: string) => {
    const { getFirestore, doc, updateDoc } = await import("firebase/firestore");
    const db = getFirestore();
    try { await updateDoc(doc(db, "notifications", id), { read: true }); } catch {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const { getFirestore, doc, writeBatch } = await import("firebase/firestore");
    const db = getFirestore();
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    try { await batch.commit(); } catch {}
  };

  const handleClick = (n: AppNotification) => {
    if (!n.read) markAsRead(n.id);
    if (n.projectDocId) router.push(`/project/${n.projectDocId}${n.projectName ? `?name=${encodeURIComponent(n.projectName)}` : ""}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${lineColor}`, borderTopColor: appliedA, animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "24px 28px 60px", background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, maxWidth: 640 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: theme.text }}>Notifikácie</div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{ background: "none", border: `1px solid ${lineColor}`, borderRadius: 9, padding: "6px 12px", color: theme.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
          >
            Označiť všetko ako prečítané
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ maxWidth: 640, background: surface, border: `1px solid ${lineColor}`, borderRadius: 18, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: appliedA + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: appliedA }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 6 }}>Zatiaľ žiadne notifikácie</div>
          <div style={{ fontSize: 13, color: theme.muted }}>Termíny úloh a noví členovia projektov sa zobrazia tu.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                background: n.read ? surface : appliedA + "0c",
                border: `1px solid ${n.read ? lineColor : appliedA + "33"}`,
                borderRadius: 14, cursor: n.projectDocId ? "pointer" : "default",
                transition: "background .15s",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: n.read ? theme.card2 : grad, color: n.read ? theme.muted : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {TYPE_ICON[n.type] ?? TYPE_ICON.deadline}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: n.read ? 600 : 800, color: theme.text }}>{n.title}</div>
                <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6 }}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: appliedA, flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}