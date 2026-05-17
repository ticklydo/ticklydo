"use client";

import { useState, useEffect } from "react";
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

const PRESETS = [
  { a: "#e040fb", b: "#7c63ff" },
  { a: "#ff6b6b", b: "#ffa34d" },
  { a: "#00c6ff", b: "#0072ff" },
  { a: "#43e97b", b: "#38f9d7" },
  { a: "#f7971e", b: "#ffd200" },
  { a: "#ff0099", b: "#493240" },
  { a: "#8e2de2", b: "#4a00e0" },
  { a: "#11998e", b: "#38ef7d" },
];

const PROJECTS = [
  { name: "Môj prvý projekt",    meta: "Zmenené pred 8 min",   starred: true,  grad: ["#3b1fa8","#9b5fe8"], shadow: "rgba(108,63,199,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { name: "Dashboard a reporty", meta: "Zmenené dnes",         starred: false, grad: ["#0d4f6e","#1ab3d4"], shadow: "rgba(14,124,158,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { name: "Nápady na Q3",        meta: "Zmenené včera",        starred: false, grad: ["#7a1f3a","#e8567a"], shadow: "rgba(192,54,90,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
  { name: "Spustenie produktu",  meta: "Zmenené pred 2 dňami", starred: false, grad: ["#1a5c2a","#4ecb6e"], shadow: "rgba(46,158,74,0.3)",
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
];

// SVG avatars
const AVATARS = [
  { id: "robot", label: "Robot", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="16" y="20" width="32" height="28" rx="8" fill={c1}/>
      <rect x="22" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
      <rect x="34" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
      <rect x="24" y="30" width="4" height="4" rx="1" fill={c2}/>
      <rect x="36" y="30" width="4" height="4" rx="1" fill={c2}/>
      <rect x="27" y="40" width="10" height="3" rx="1.5" fill="white" opacity="0.7"/>
      <rect x="30" y="12" width="4" height="8" rx="2" fill={c1}/>
      <circle cx="32" cy="11" r="3" fill={c2}/>
      <rect x="8" y="26" width="6" height="12" rx="3" fill={c1}/>
      <rect x="50" y="26" width="6" height="12" rx="3" fill={c1}/>
    </svg>
  )},
  { id: "cat", label: "Mačka", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="36" rx="18" ry="16" fill={c1}/>
      <polygon points="16,22 12,8 22,18" fill={c1}/>
      <polygon points="48,22 52,8 42,18" fill={c1}/>
      <polygon points="17,20 14,10 21,17" fill={c2} opacity="0.6"/>
      <polygon points="47,20 50,10 43,17" fill={c2} opacity="0.6"/>
      <circle cx="25" cy="34" r="4" fill="white"/>
      <circle cx="39" cy="34" r="4" fill="white"/>
      <circle cx="26" cy="35" r="2" fill={c2}/>
      <circle cx="40" cy="35" r="2" fill={c2}/>
      <path d="M28 42 Q32 45 36 42" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <line x1="20" y1="38" x2="10" y2="36" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="20" y1="40" x2="10" y2="40" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="44" y1="38" x2="54" y2="36" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="44" y1="40" x2="54" y2="40" stroke="white" strokeWidth="1" opacity="0.6"/>
    </svg>
  )},
  { id: "fox", label: "Líška", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <polygon points="32,8 16,28 20,28" fill={c1}/>
      <polygon points="32,8 48,28 44,28" fill={c1}/>
      <polygon points="32,12 18,28 22,28" fill={c2} opacity="0.5"/>
      <polygon points="32,12 46,28 42,28" fill={c2} opacity="0.5"/>
      <ellipse cx="32" cy="38" rx="18" ry="14" fill={c1}/>
      <ellipse cx="32" cy="42" rx="10" ry="8" fill="white" opacity="0.4"/>
      <circle cx="25" cy="35" r="4" fill="white"/>
      <circle cx="39" cy="35" r="4" fill="white"/>
      <circle cx="26" cy="36" r="2" fill={c2}/>
      <circle cx="40" cy="36" r="2" fill={c2}/>
      <ellipse cx="32" cy="42" rx="3" ry="2" fill={c2} opacity="0.7"/>
    </svg>
  )},
  { id: "panda", label: "Panda", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="32" cy="36" r="18" fill="white"/>
      <circle cx="20" cy="24" r="8" fill={c1}/>
      <circle cx="44" cy="24" r="8" fill={c1}/>
      <circle cx="24" cy="35" r="5" fill={c1}/>
      <circle cx="40" cy="35" r="5" fill={c1}/>
      <circle cx="24" cy="35" r="3" fill="white"/>
      <circle cx="40" cy="35" r="3" fill="white"/>
      <circle cx="25" cy="36" r="1.5" fill={c2}/>
      <circle cx="41" cy="36" r="1.5" fill={c2}/>
      <ellipse cx="32" cy="43" rx="4" ry="3" fill={c1} opacity="0.3"/>
      <path d="M28 44 Q32 47 36 44" stroke={c1} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )},
  { id: "unicorn", label: "Jednorožec", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="white"/>
      <path d="M32 8 L36 22 L28 22 Z" fill={c2}/>
      <path d="M32 10 L35 20 L29 20 Z" fill={c1} opacity="0.6"/>
      <path d="M14 26 Q10 18 16 14 Q18 22 20 24" fill={c1}/>
      <circle cx="25" cy="36" r="4" fill="white"/>
      <circle cx="39" cy="36" r="4" fill="white"/>
      <circle cx="26" cy="37" r="2" fill={c2}/>
      <circle cx="40" cy="37" r="2" fill={c2}/>
      <path d="M28 44 Q32 47 36 44" stroke={c1} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="27" cy="34" r="1" fill="white"/>
      <circle cx="41" cy="34" r="1" fill="white"/>
    </svg>
  )},
  { id: "alien", label: "Mimozemšťan", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="34" rx="16" ry="20" fill={c1}/>
      <ellipse cx="24" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/>
      <ellipse cx="40" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/>
      <ellipse cx="24" cy="31" rx="3" ry="4" fill="white"/>
      <ellipse cx="40" cy="31" rx="3" ry="4" fill="white"/>
      <circle cx="24" cy="32" r="2" fill="#111"/>
      <circle cx="40" cy="32" r="2" fill="#111"/>
      <circle cx="24.7" cy="31.3" r="0.7" fill="white"/>
      <circle cx="40.7" cy="31.3" r="0.7" fill="white"/>
      <path d="M26 44 Q32 48 38 44" stroke={c2} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <line x1="20" y1="18" x2="16" y2="10" stroke={c1} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="15" cy="9" r="2" fill={c2}/>
      <line x1="44" y1="18" x2="48" y2="10" stroke={c1} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="49" cy="9" r="2" fill={c2}/>
    </svg>
  )},
  { id: "ghost", label: "Duch", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M14 52 L14 28 Q14 12 32 12 Q50 12 50 28 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 Z" fill={c1}/>
      <circle cx="24" cy="30" r="5" fill="white"/>
      <circle cx="40" cy="30" r="5" fill="white"/>
      <circle cx="25" cy="31" r="3" fill={c2}/>
      <circle cx="41" cy="31" r="3" fill={c2}/>
      <circle cx="26" cy="30" r="1" fill="white"/>
      <circle cx="42" cy="30" r="1" fill="white"/>
      <path d="M26 40 Q32 44 38 40" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
    </svg>
  )},
  { id: "dragon", label: "Drak", svg: (c1: string, c2: string) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="32" cy="38" rx="16" ry="14" fill={c1}/>
      <polygon points="20,24 14,10 24,20" fill={c1}/>
      <polygon points="44,24 50,10 40,20" fill={c1}/>
      <polygon points="21,22 16,12 23,19" fill={c2} opacity="0.5"/>
      <polygon points="43,22 48,12 41,19" fill={c2} opacity="0.5"/>
      <ellipse cx="32" cy="42" rx="10" ry="6" fill={c2} opacity="0.3"/>
      <circle cx="25" cy="35" r="4" fill="white"/>
      <circle cx="39" cy="35" r="4" fill="white"/>
      <circle cx="26" cy="36" r="2.5" fill={c2}/>
      <circle cx="40" cy="36" r="2.5" fill={c2}/>
      <circle cx="27" cy="35" r="1" fill="white"/>
      <circle cx="41" cy="35" r="1" fill="white"/>
      <path d="M27 44 Q32 48 37 44" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="29" cy="28" r="1.5" fill={c2} opacity="0.6"/>
      <circle cx="35" cy="27" r="1.5" fill={c2} opacity="0.6"/>
    </svg>
  )},
];

type Page = "home" | "work" | "notifications" | "profile";

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

export default function HomePage() {
  const [activePage, setActivePage]         = useState<Page>("home");
  const [stars, setStars]                   = useState(PROJECTS.map((p) => p.starred));
  const [colorA, setColorA]                 = useState("#e040fb");
  const [colorB, setColorB]                 = useState("#7c63ff");
  const [appliedA, setAppliedA]             = useState("#e040fb");
  const [appliedB, setAppliedB]             = useState("#7c63ff");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [applyLabel, setApplyLabel]         = useState("Použiť farbu");
  const [toggles, setToggles]               = useState([false, true, true]);
  const [userEmail, setUserEmail]           = useState("");
  const [userName, setUserName]             = useState("");
  const [editingName, setEditingName]       = useState(false);
  const [darkMode, setDarkMode]             = useState(true);
  const [avatarId, setAvatarId]             = useState("robot");
  const [pickingAvatar, setPickingAvatar]   = useState(false);

 // Načítaj z Firestore
useEffect(() => {
  const unsub2 = onAuthStateChanged(auth, async (user: any) => {
    if (!user) return;
    setUserEmail(user.email ?? "");
    const { getFirestore, doc, getDoc } = await import("firebase/firestore");
    const db = getFirestore();
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.colorA)   { setColorA(d.colorA);   setAppliedA(d.colorA); }
      if (d.colorB)   { setColorB(d.colorB);   setAppliedB(d.colorB); }
      if (d.userName) setUserName(d.userName);
      if (d.avatarId) setAvatarId(d.avatarId);
      if (d.darkMode !== undefined) setDarkMode(d.darkMode);
    }
  });
  return () => unsub2();
}, []);

// Ukladaj do Firestore
useEffect(() => {
  const saveData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { getFirestore, doc, setDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await setDoc(doc(db, "users", user.uid), {
      colorA: appliedA,
      colorB: appliedB,
      userName,
      avatarId,
      darkMode,
    }, { merge: true });
  };
  saveData();
}, [appliedA, appliedB, userName, avatarId, darkMode]);

  const grad = `linear-gradient(135deg, ${appliedA}, ${appliedB})`;

  const theme = {
    bg:     darkMode ? "#0b0c13" : "#f4f4f8",
    card:   darkMode ? "#13141e" : "#ffffff",
    card2:  darkMode ? "#1a1b28" : "#ebebf5",
    text:   darkMode ? "#f0f0f8" : "#111118",
    muted:  darkMode ? "#6b6c80" : "#8888a0",
    border: darkMode ? "#22233a" : "#dddde8",
  };

  function applyColors() {
    setAppliedA(colorA);
    setAppliedB(colorB);
    setApplyLabel("✓ Aplikované!");
    setTimeout(() => setApplyLabel("Použiť farbu"), 1800);
  }

  function pickPreset(i: number) {
    setSelectedPreset(i);
    setColorA(PRESETS[i].a);
    setColorB(PRESETS[i].b);
    setAppliedA(PRESETS[i].a);
    setAppliedB(PRESETS[i].b);
  }

  function handleToggle(i: number) {
    if (i === 0) {
      setDarkMode(v => !v);
    } else {
      setToggles(t => t.map((v, j) => j === i ? !v : v));
    }
  }

  const currentAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];

  const NAV = [
    { id: "home",          label: "Domov",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: "work",          label: "Moja práca",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
    { id: "notifications", label: "Notifikácie",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  ] as const;

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 72, background: theme.card,
        borderRight: `1px solid ${theme.border}`,
        display: "flex", flexDirection: "column",
        alignItems: "center", padding: "18px 0 24px",
        gap: 4, flexShrink: 0,
        transition: "background .3s, border-color .3s",
      }}>
        <img src="/IKONA.png" alt="TicklyDo" style={{
          width: 42, height: 42, borderRadius: 13,
          marginBottom: 18, cursor: "pointer",
          objectFit: "contain",
        }} />

        {NAV.map((item) => (
          <button key={item.id} title={item.label} onClick={() => setActivePage(item.id)}
            style={{
              width: 46, height: 46, borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "none",
              background: activePage === item.id ? theme.card2 : "transparent",
              color: activePage === item.id ? appliedA : theme.muted,
              position: "relative", transition: "all .2s",
            }}>
            {activePage === item.id && (
              <span style={{
                position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                width: 3, height: 24, borderRadius: "0 3px 3px 0",
                background: grad,
              }} />
            )}
            {item.svg}
          </button>
        ))}

        <div style={{ width: 36, height: 1, background: theme.border, margin: "6px 0" }} />

        <button title="Profil & Nastavenia" onClick={() => setActivePage("profile")}
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "none",
            background: activePage === "profile" ? theme.card2 : "transparent",
            color: activePage === "profile" ? appliedA : theme.muted,
            position: "relative",
          }}>
          {activePage === "profile" && (
            <span style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              width: 3, height: 24, borderRadius: "0 3px 3px 0",
              background: grad,
            }} />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </button>

        <div style={{ flex: 1 }} />

        <button title="Odhlásiť sa" onClick={() => { auth.signOut(); window.location.href = "/login"; }}
          style={{
            width: 46, height: 54, borderRadius: 13,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, cursor: "pointer", border: "none",
            background: "transparent", color: theme.muted,
            fontSize: 10, fontWeight: 700,
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Odhlásiť
        </button>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "28px 28px 60px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>

        {/* HOME */}
        {activePage === "home" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}>
  <div style={{ width: 44, height: 44, borderRadius: "50%", background: grad, padding: 3, flexShrink: 0 }}>
    {currentAvatar.svg(appliedA, appliedB)}
  </div>
  Vitaj{userName ? `, ${userName}` : ""}
</div>

            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px" }}>
              Naposledy otvorené
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
              {PROJECTS.map((p, i) => (
                <div key={i} style={{
                  borderRadius: 18, padding: "16px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  cursor: "pointer", position: "relative", overflow: "hidden",
                  background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`,
                  boxShadow: `0 6px 22px ${p.shadow}`,
                }}>
                  <div style={{
  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
  background: "rgba(255,255,255,0.15)",
  display: "flex", alignItems: "center", justifyContent: "center",
}}>
  {p.svg}
</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{p.meta}</div>
                  </div>
                  <span onClick={(e) => { e.stopPropagation(); setStars(s => s.map((v, j) => j === i ? !v : v)); }}
                    style={{
                      fontSize: 18, cursor: "pointer", zIndex: 1,
                      color: stars[i] ? "#f5c842" : "rgba(255,255,255,0.25)",
                      filter: stars[i] ? "drop-shadow(0 0 5px rgba(245,200,66,0.5))" : "none",
                    }}>
                    {stars[i] ? "★" : "☆"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 4 }}>
              Pracovné priestory
            </div>

            <div style={{
              maxWidth: 480, background: theme.card2, border: `1px solid ${theme.border}`,
              borderRadius: 18, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              transition: "background .3s",
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, background: grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0, boxShadow: `0 4px 14px ${appliedA}55`,
              }}>⊞</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Hlavný workspace</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginTop: 2 }}>4 projekty · 2 členovia</div>
              </div>
              <span style={{ color: theme.muted }}>→</span>
            </div>

            <button style={{
              position: "fixed", bottom: 28, right: 28,
              width: 52, height: 52, borderRadius: "50%",
              background: grad, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, color: "#fff", cursor: "pointer",
              boxShadow: `0 8px 24px ${appliedA}77`,
            }}>+</button>
          </>
        )}

        {/* WORK */}
        {activePage === "work" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              <span style={gradientText(grad)}>Moja práca</span>
            </div>
            <p style={{ color: theme.muted, fontWeight: 700 }}>Tu bude zoznam tvojich úloh.</p>
          </>
        )}

        {/* NOTIFICATIONS */}
        {activePage === "notifications" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style={gradientText(grad)}>Notifikácie</span>
            </div>
            <p style={{ color: theme.muted, fontWeight: 700 }}>Zatiaľ žiadne notifikácie.</p>
          </>
        )}

        {/* PROFILE */}
        {activePage === "profile" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              <span style={gradientText(grad)}>Profil & Nastavenia</span>
            </div>

            {/* Avatar + meno + email */}
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 18, padding: 20,
              display: "flex", alignItems: "center", gap: 16, maxWidth: 480,
              transition: "background .3s", position: "relative",
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div onClick={() => setPickingAvatar(v => !v)} style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: grad,
                  padding: 4,
                  cursor: "pointer",
                  boxShadow: `0 4px 16px ${appliedA}55`,
                }}>
                  {currentAvatar.svg(appliedA, appliedB)}
                </div>
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 20, height: 20, borderRadius: "50%",
                  background: grad,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, cursor: "pointer", color: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }} onClick={() => setPickingAvatar(v => !v)}>✏️</div>

                {pickingAvatar && (
                  <div style={{
                    position: "absolute", top: 74, left: 0,
                    background: theme.card, border: `1px solid ${theme.border}`,
                    borderRadius: 16, padding: 12,
                    display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8,
                    zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    width: 280,
                  }}>
                    {AVATARS.map(a => (
                      <div key={a.id} onClick={() => { setAvatarId(a.id); setPickingAvatar(false); }}
                        style={{
                          width: 52, height: 52, borderRadius: 12, cursor: "pointer",
                          background: avatarId === a.id ? grad : theme.card2,
                          padding: 6,
                          border: avatarId === a.id ? `2px solid ${appliedA}` : `2px solid transparent`,
                          transition: "all .15s",
                        }}>
                        {a.svg(appliedA, appliedB)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <input
                      autoFocus
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Tvoje meno..."
                      onKeyDown={e => { if (e.key === "Enter") setEditingName(false); }}
                      style={{
                        background: theme.card2,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10,
                        padding: "7px 12px",
                        color: theme.text,
                        fontFamily: "var(--font-geist-sans)",
                        fontWeight: 700,
                        fontSize: 15,
                        outline: "none",
                        flex: 1,
                      }}
                    />
                    <button onClick={() => setEditingName(false)} style={{
                      background: grad, border: "none", borderRadius: 10,
                      padding: "7px 14px", color: "#fff", fontWeight: 800,
                      fontSize: 13, cursor: "pointer",
                      fontFamily: "var(--font-geist-sans)",
                    }}>Uložiť</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {userName || "Pridaj svoje meno"}
                    </div>
                    <button onClick={() => setEditingName(true)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: theme.muted, padding: 0,
                    }}>✏️</button>
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.muted }}>{userEmail}</div>
              </div>
            </div>

            {/* Color picker */}
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 18, padding: 20,
              display: "flex", flexDirection: "column", gap: 16, maxWidth: 480,
              transition: "background .3s",
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: theme.muted }}>🎨 Farba aplikácie</div>
              <div style={{ height: 6, borderRadius: 4, background: grad }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {PRESETS.map((p, i) => (
                  <div key={i} onClick={() => pickPreset(i)}
                    style={{
                      height: 48, borderRadius: 13, cursor: "pointer",
                      background: `linear-gradient(135deg, ${p.a}, ${p.b})`,
                      border: selectedPreset === i ? "3px solid #fff" : "3px solid transparent",
                      boxShadow: selectedPreset === i ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, color: "#fff", fontWeight: 900,
                    }}>
                    {selectedPreset === i ? "✓" : ""}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Vlastná farba</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginTop: 2 }}>Nastav si akúkoľvek kombináciu</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { val: colorA, set: (v: string) => { setColorA(v); setSelectedPreset(-1); }, label: "OD" },
                    { val: colorB, set: (v: string) => { setColorB(v); setSelectedPreset(-1); }, label: "DO" },
                  ].map((c, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <label style={{
                        display: "block", width: 36, height: 36, borderRadius: 10,
                        background: c.val, border: `2px solid ${theme.border}`, cursor: "pointer",
                        overflow: "hidden",
                      }}>
                        <input type="color" value={c.val} onChange={e => c.set(e.target.value)}
                          style={{ opacity: 0, width: 0, height: 0 }} />
                      </label>
                      <div style={{ fontSize: 10, fontWeight: 800, color: theme.muted, marginTop: 3 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={applyColors} style={{
                background: grad, color: "#fff", border: "none",
                borderRadius: 13, padding: 14,
                fontFamily: "var(--font-geist-sans)", fontWeight: 800, fontSize: 14,
                cursor: "pointer", width: "100%",
                boxShadow: `0 6px 20px ${appliedA}55`,
              }}>{applyLabel}</button>
            </div>

            {/* General settings */}
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 18, padding: 20,
              display: "flex", flexDirection: "column", gap: 18, maxWidth: 480,
              transition: "background .3s",
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: theme.muted }}>🛠 Všeobecné</div>
              {[
                { name: "Tmavý režim",  desc: "Prepni medzi tmavým a svetlým" },
                { name: "Notifikácie",  desc: "Upozornenia o zmenách v projektoch" },
                { name: "Animácie",     desc: "Plynulé prechody a efekty" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginTop: 2 }}>{s.desc}</div>
                  </div>
                  <div onClick={() => handleToggle(i)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                      background: i === 0 ? (darkMode ? grad : theme.border) : (toggles[i] ? grad : theme.border),
                      position: "relative", transition: "background .25s", flexShrink: 0,
                    }}>
                    <div style={{
                      position: "absolute", top: 3,
                      left: (i === 0 ? darkMode : toggles[i]) ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#fff", transition: "left .25s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}