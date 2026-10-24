"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useTheme } from "../context/ThemeContext";

type PendingUser = { uid: string; email: string; createdAt?: number };

export default function AdminPage() {
  const { theme, grad } = useTheme();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [rejected, setRejected] = useState<PendingUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubs.forEach(u => u());
      unsubs = [];
      if (!user) { setIsAdmin(false); setChecking(false); return; }
      try {
        const me = await getDoc(doc(db, "users", user.uid));
        const admin = me.exists() && me.data().isAdmin === true;
        setIsAdmin(admin);
        setChecking(false);
        if (!admin) return;

        const toList = (snap: any): PendingUser[] =>
          snap.docs
            .map((d: any) => ({ uid: d.id, email: d.data().email || "(bez e-mailu)", createdAt: d.data().createdAt }))
            .sort((a: PendingUser, b: PendingUser) => (b.createdAt || 0) - (a.createdAt || 0));

        unsubs.push(onSnapshot(
          query(collection(db, "users"), where("approved", "==", false)),
          (snap) => setPending(toList(snap).filter((u: PendingUser) => !snap.docs.find((d: any) => d.id === u.uid)?.data().rejected)),
          (e) => setError("Načítanie zlyhalo: " + e.message)
        ));
        unsubs.push(onSnapshot(
          query(collection(db, "users"), where("rejected", "==", true)),
          (snap) => setRejected(toList(snap)),
          (e) => setError("Načítanie zlyhalo: " + e.message)
        ));
      } catch (e: any) {
        setError("Chyba: " + e.message);
        setChecking(false);
      }
    });
    return () => {
      unsubAuth();
      unsubs.forEach(u => u());
    };
  }, []);

  const setStatus = async (uid: string, patch: Record<string, any>) => {
    setBusyId(uid);
    setError("");
    try {
      await updateDoc(doc(db, "users", uid), patch);
    } catch (e: any) {
      setError("Uloženie zlyhalo: " + e.message);
    }
    setBusyId(null);
  };

  const approve = (uid: string) => setStatus(uid, { approved: true, rejected: false, approvedAt: Date.now() });
  const reject = (uid: string) => setStatus(uid, { rejected: true });

  const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString("sk-SK") : "—");

  if (checking) {
    return <div style={{ padding: 32, color: theme.muted, fontFamily: "var(--font-geist-sans)" }}>Načítavam...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: theme.text, fontFamily: "var(--font-geist-sans)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Nemáš prístup</h1>
        <p style={{ color: theme.muted, fontSize: 14 }}>Táto stránka je len pre správcu.</p>
      </div>
    );
  }

  const row = (u: PendingUser, actions: React.ReactNode) => (
    <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 16px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, wordBreak: "break-all" }}>{u.email}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>Registrácia: {fmt(u.createdAt)}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{actions}</div>
    </div>
  );

  const btn = (label: string, onClick: () => void, primary: boolean, id: string) => (
    <button
      onClick={onClick}
      disabled={busyId === id}
      style={{
        padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: busyId === id ? "default" : "pointer",
        fontFamily: "var(--font-geist-sans)", opacity: busyId === id ? 0.6 : 1,
        border: primary ? "none" : `1px solid ${theme.border}`,
        background: primary ? grad : "transparent",
        color: primary ? "#fff" : theme.text,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: "28px 24px 48px", maxWidth: 760, width: "100%", margin: "0 auto", color: theme.text, fontFamily: "var(--font-geist-sans)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Schvaľovanie registrácií</h1>
      <p style={{ fontSize: 13.5, color: theme.muted, marginBottom: 24 }}>
        Noví používatelia sa dostanú do aplikácie až po tvojom potvrdení.
      </p>

      {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Čakajúce ({pending.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {pending.length === 0 && <div style={{ fontSize: 13.5, color: theme.muted }}>Žiadne čakajúce registrácie.</div>}
        {pending.map(u => row(u, <>
          {btn("Schváliť", () => approve(u.uid), true, u.uid)}
          {btn("Zamietnuť", () => reject(u.uid), false, u.uid)}
        </>))}
      </div>

      {rejected.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Zamietnuté ({rejected.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rejected.map(u => row(u, btn("Schváliť", () => approve(u.uid), true, u.uid)))}
          </div>
        </>
      )}
    </div>
  );
}