"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
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

export default function JoinPage({ params }: { params: Promise<{ projectRef: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { grad, theme, appliedA } = useTheme();
  const [status, setStatus] = useState<"loading" | "joining" | "success" | "error" | "already">("loading");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("error"); setError("Neplatný link"); return; }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }

      const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");
      const db = getFirestore();

      // projectRef JE UŽ celé Firestore ID dokumentu (ownerUid_projectId) — netreba nič skladať,
      // len z neho vieme vytiahnuť ownerUid (potrebný pre pole ownerId kvôli security rules)
      const resolvedParams = await params;
      const projectRef = resolvedParams.projectRef;
      const lastUnderscore = projectRef.lastIndexOf("_");
      const ownerUid = projectRef.slice(0, lastUnderscore);

      const projectSnap = await getDoc(doc(db, "projects", projectRef));
      if (!projectSnap.exists()) { setStatus("error"); setError("Projekt neexistuje"); return; }

      const data = projectSnap.data();
      setProjectName(data.projectName || projectRef);

      const invites = data.invites ?? [];
      const invite = invites.find((i: any) => i.token === token);
      if (!invite) { setStatus("error"); setError("Pozvánka nie je platná alebo bola zrušená"); return; }

      const members = data.members ?? [];
      if (members.some((m: any) => m.uid === user.uid)) { setStatus("already"); return; }

      setStatus("joining");

      // Add user as member
      const newMember = {
        uid: user.uid,
        email: user.email ?? "",
        name: user.displayName ?? "",
        role: invite.role,
        joinedAt: Date.now(),
      };
      const newMembers = [...members, newMember];

      // Remove used invite if email-specific
      const newInvites = invite.email ? invites.filter((i: any) => i.token !== token) : invites;

      await setDoc(doc(db, "projects", projectRef), {
        members: newMembers,
        invites: newInvites,
        // ownerId + memberUids sú kvôli Firestore security rules (potvrdzujú, kto smie k dokumentu pristupovať)
        ownerId: ownerUid,
        memberUids: newMembers.map((m: any) => m.uid),
      }, { merge: true });

      // Add project to user's project list — docId je celé Firestore ID, aby appka vedela
      // priamo (bez skladania) nájsť ten istý dokument pri každom ďalšom otvorení
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userProjects = userSnap.exists() ? (userSnap.data().projects ?? []) : [];
      if (!userProjects.some((p: any) => p.docId === projectRef)) {
        await setDoc(doc(db, "users", user.uid), {
          projects: [...userProjects, {
            id: `shared_${projectRef}`,
            name: data.projectName || projectRef,
            color1: "#6366f1", color2: "#8b5cf6",
            iconId: "doc", starred: false, archived: false,
            createdAt: Date.now(), updatedAt: Date.now(),
            shared: true, docId: projectRef,
          }]
        }, { merge: true });
      }

      // ── Notifikácia priamo v appke pre vlastníka projektu ──
      try {
        const { addDoc, collection } = await import("firebase/firestore");
        await addDoc(collection(db, "notifications"), {
          userId: ownerUid,
          type: "member_joined",
          title: "Nový člen v projekte",
          body: `${user.displayName || user.email || "Niekto"} sa pripojil/a k projektu „${data.projectName || projectRef}"`,
          projectDocId: projectRef,
          projectName: data.projectName || projectRef,
          read: false,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error("Notification write error:", err);
      }

      setStatus("success");
      setTimeout(() => router.push(`/project/${projectRef}`), 2000);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg, fontFamily: "var(--font-geist-sans)" }}>
      <div style={{ background: theme.card, borderRadius: 20, padding: "40px 32px", width: "min(420px, 90vw)", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: `1px solid ${theme.border}` }}>
        {status === "loading" && (
          <>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>Načítavam pozvánku...</div>
          </>
        )}
        {status === "joining" && (
          <>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${theme.border}`, borderTopColor: appliedA, animation: "spin .8s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pripájam ťa k projektu...</div>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Vitaj v projekte!</div>
            <div style={{ fontSize: 13, color: theme.muted }}>Presmerovávam ťa na <strong>{projectName}</strong>...</div>
          </>
        )}
        {status === "already" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Už si členom</div>
            <div style={{ fontSize: 13, color: theme.muted, marginBottom: 20 }}>Máš prístup k projektu <strong>{projectName}</strong></div>
            <button onClick={() => router.push("/home")} style={{ background: grad, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Ísť na projekty</button>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Neplatná pozvánka</div>
            <div style={{ fontSize: 13, color: theme.muted, marginBottom: 20 }}>{error}</div>
            <button onClick={() => router.push("/home")} style={{ background: grad, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}>Ísť domov</button>
          </>
        )}
      </div>
    </div>
  );
}