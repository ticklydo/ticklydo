"use client";

import { useState, useEffect, useCallback } from "react";
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
  { emoji: "📋", name: "Môj prvý projekt",    meta: "Zmenené pred 8 min",   starred: true,  grad: ["#3b1fa8","#9b5fe8"], shadow: "rgba(108,63,199,0.3)" },
  { emoji: "📊", name: "Dashboard a reporty", meta: "Zmenené dnes",         starred: false, grad: ["#0d4f6e","#1ab3d4"], shadow: "rgba(14,124,158,0.3)" },
  { emoji: "💡", name: "Nápady na Q3",        meta: "Zmenené včera",        starred: false, grad: ["#7a1f3a","#e8567a"], shadow: "rgba(192,54,90,0.3)" },
  { emoji: "🚀", name: "Spustenie produktu",  meta: "Zmenené pred 2 dňami", starred: false, grad: ["#1a5c2a","#4ecb6e"], shadow: "rgba(46,158,74,0.3)" },
];

type Page = "home" | "work" | "notifications" | "profile";

export default function HomePage() {
  const [activePage, setActivePage]       = useState<Page>("home");
  const [stars, setStars]                 = useState(PROJECTS.map((p) => p.starred));
  const [colorA, setColorA]               = useState("#e040fb");
  const [colorB, setColorB]               = useState("#7c63ff");
  const [appliedA, setAppliedA]           = useState("#e040fb");
  const [appliedB, setAppliedB]           = useState("#7c63ff");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [applyLabel, setApplyLabel]       = useState("Použiť farbu");
  const [toggles, setToggles]             = useState([false, true, true]); // [darkMode, notif, anim]
  const [userEmail, setUserEmail]         = useState("");
  const [userName, setUserName]           = useState("");
  const [editingName, setEditingName]     = useState(false);
  const [darkMode, setDarkMode]           = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user: any) => {
      if (user) setUserEmail(user.email ?? "");
    });
    return () => unsub();
  }, []);
  // Načítaj uložené nastavenia
  useEffect(() => {
    const savedA = localStorage.getItem("colorA");
    const savedB = localStorage.getItem("colorB");
    const savedName = localStorage.getItem("userName");
    const savedDark = localStorage.getItem("darkMode");
    if (savedA) { setColorA(savedA); setAppliedA(savedA); }
    if (savedB) { setColorB(savedB); setAppliedB(savedB); }
    if (savedName) setUserName(savedName);
    if (savedDark !== null) setDarkMode(savedDark === "true");
  }, []);

  // Ukladaj zmeny
  useEffect(() => {
    localStorage.setItem("colorA", appliedA);
    localStorage.setItem("colorB", appliedB);
    localStorage.setItem("userName", userName);
    localStorage.setItem("darkMode", String(darkMode));
  }, [appliedA, appliedB, userName, darkMode]);

  // sync darkMode toggle
  useEffect(() => {
    setToggles(t => [darkMode, t[1], t[2]]);
  }, [darkMode]);

  const grad   = `linear-gradient(135deg, ${appliedA}, ${appliedB})`;

  // THEME colors based on dark/light
  const theme = {
    bg:      darkMode ? "#0b0c13" : "#f4f4f8",
    card:    darkMode ? "#13141e" : "#ffffff",
    card2:   darkMode ? "#1a1b28" : "#ebebf5",
    text:    darkMode ? "#f0f0f8" : "#111118",
    muted:   darkMode ? "#6b6c80" : "#8888a0",
    border:  darkMode ? "#22233a" : "#dddde8",
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

  const NAV = [
    { id: "home",          icon: "🏠", label: "Domov" },
    { id: "work",          icon: "📁", label: "Moja práca" },
    { id: "notifications", icon: "🔔", label: "Notifikácie" },
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
        gap: 6, flexShrink: 0,
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
              cursor: "pointer", fontSize: 20, border: "none",
              background: activePage === item.id ? theme.card2 : "transparent",
              color: activePage === item.id ? theme.text : theme.muted,
              position: "relative", transition: "all .2s",
            }}>
            {activePage === item.id && (
              <span style={{
                position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                width: 3, height: 24, borderRadius: "0 3px 3px 0",
                background: grad,
              }} />
            )}
            {item.icon}
          </button>
        ))}

        <div style={{ width: 36, height: 1, background: theme.border, margin: "6px 0" }} />

        <button title="Profil & Nastavenia" onClick={() => setActivePage("profile")}
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 20, border: "none",
            background: activePage === "profile" ? theme.card2 : "transparent",
            color: activePage === "profile" ? theme.text : theme.muted,
            position: "relative",
          }}>
          {activePage === "profile" && (
            <span style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              width: 3, height: 24, borderRadius: "0 3px 3px 0",
              background: grad,
            }} />
          )}
          ⚙️
        </button>

        <div style={{ flex: 1 }} />

        <button title="Odhlásiť sa"
          style={{
            width: 46, height: 46, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 18, border: "none",
            background: "transparent", color: theme.muted,
          }}>↩️</button>
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
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              Vitaj{userName ? `, ${userName}` : ""} v{" "}
              <span style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                TicklyDo
              </span>{" "}
              👋
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
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{p.emoji}</div>
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
            <div style={{ fontSize: 22, fontWeight: 900 }}>📁 <span style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moja práca</span></div>
            <p style={{ color: theme.muted, fontWeight: 700 }}>Tu bude zoznam tvojich úloh.</p>
          </>
        )}

        {/* NOTIFICATIONS */}
        {activePage === "notifications" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900 }}>🔔 <span style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Notifikácie</span></div>
            <p style={{ color: theme.muted, fontWeight: 700 }}>Zatiaľ žiadne notifikácie.</p>
          </>
        )}

        {/* PROFILE */}
        {activePage === "profile" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900 }}>⚙️ <span style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Profil & Nastavenia</span></div>

            {/* Avatar + meno + email */}
            <div style={{
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 18, padding: 20,
              display: "flex", alignItems: "center", gap: 16, maxWidth: 480,
              transition: "background .3s",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, boxShadow: `0 4px 16px ${appliedA}55`, flexShrink: 0,
              }}>🧑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Meno - editovateľné */}
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
                      background: toggles[i] ? grad : theme.border,
                      position: "relative", transition: "background .25s", flexShrink: 0,
                    }}>
                    <div style={{
                      position: "absolute", top: 3,
                      left: toggles[i] ? 23 : 3,
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