"use client";

import React, { useState } from "react";
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

const AVATARS: { id: string; svg: (c1: string, c2: string) => React.ReactElement }[] = [
  { id: "robot", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><rect x="16" y="20" width="32" height="28" rx="8" fill={c1}/><rect x="22" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/><rect x="34" y="28" width="8" height="8" rx="2" fill="white" opacity="0.9"/><rect x="24" y="30" width="4" height="4" rx="1" fill={c2}/><rect x="36" y="30" width="4" height="4" rx="1" fill={c2}/><rect x="27" y="40" width="10" height="3" rx="1.5" fill="white" opacity="0.7"/><rect x="30" y="12" width="4" height="8" rx="2" fill={c1}/><circle cx="32" cy="11" r="3" fill={c2}/><rect x="8" y="26" width="6" height="12" rx="3" fill={c1}/><rect x="50" y="26" width="6" height="12" rx="3" fill={c1}/></svg>) },
  { id: "cat", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><ellipse cx="32" cy="36" rx="18" ry="16" fill={c1}/><polygon points="16,22 12,8 22,18" fill={c1}/><polygon points="48,22 52,8 42,18" fill={c1}/><polygon points="17,20 14,10 21,17" fill={c2} opacity="0.6"/><polygon points="47,20 50,10 43,17" fill={c2} opacity="0.6"/><circle cx="25" cy="34" r="4" fill="white"/><circle cx="39" cy="34" r="4" fill="white"/><circle cx="26" cy="35" r="2" fill={c2}/><circle cx="40" cy="35" r="2" fill={c2}/><path d="M28 42 Q32 45 36 42" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>) },
  { id: "fox", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><polygon points="32,8 16,28 20,28" fill={c1}/><polygon points="32,8 48,28 44,28" fill={c1}/><polygon points="32,12 18,28 22,28" fill={c2} opacity="0.5"/><polygon points="32,12 46,28 42,28" fill={c2} opacity="0.5"/><ellipse cx="32" cy="38" rx="18" ry="14" fill={c1}/><circle cx="25" cy="35" r="4" fill="white"/><circle cx="39" cy="35" r="4" fill="white"/><circle cx="26" cy="36" r="2" fill={c2}/><circle cx="40" cy="36" r="2" fill={c2}/></svg>) },
  { id: "panda", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><circle cx="32" cy="36" r="18" fill="white"/><circle cx="20" cy="24" r="8" fill={c1}/><circle cx="44" cy="24" r="8" fill={c1}/><circle cx="24" cy="35" r="5" fill={c1}/><circle cx="40" cy="35" r="5" fill={c1}/><circle cx="24" cy="35" r="3" fill="white"/><circle cx="40" cy="35" r="3" fill="white"/><circle cx="25" cy="36" r="1.5" fill={c2}/><circle cx="41" cy="36" r="1.5" fill={c2}/></svg>) },
  { id: "unicorn", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><ellipse cx="32" cy="38" rx="18" ry="14" fill="white"/><path d="M32 8 L36 22 L28 22 Z" fill={c2}/><path d="M32 10 L35 20 L29 20 Z" fill={c1} opacity="0.6"/><path d="M14 26 Q10 18 16 14 Q18 22 20 24" fill={c1}/><circle cx="25" cy="36" r="4" fill="white"/><circle cx="39" cy="36" r="4" fill="white"/><circle cx="26" cy="37" r="2" fill={c2}/><circle cx="40" cy="37" r="2" fill={c2}/></svg>) },
  { id: "alien", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><ellipse cx="32" cy="34" rx="16" ry="20" fill={c1}/><ellipse cx="24" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/><ellipse cx="40" cy="30" rx="6" ry="8" fill={c2} opacity="0.9"/><ellipse cx="24" cy="31" rx="3" ry="4" fill="white"/><ellipse cx="40" cy="31" rx="3" ry="4" fill="white"/><circle cx="24" cy="32" r="2" fill="#111"/><circle cx="40" cy="32" r="2" fill="#111"/></svg>) },
  { id: "ghost", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><path d="M14 52 L14 28 Q14 12 32 12 Q50 12 50 28 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 Z" fill={c1}/><circle cx="24" cy="30" r="5" fill="white"/><circle cx="40" cy="30" r="5" fill="white"/><circle cx="25" cy="31" r="3" fill={c2}/><circle cx="41" cy="31" r="3" fill={c2}/><circle cx="26" cy="30" r="1" fill="white"/><circle cx="42" cy="30" r="1" fill="white"/></svg>) },
  { id: "dragon", svg: (c1, c2) => (<svg viewBox="0 0 64 64" fill="none" width="100%" height="100%"><ellipse cx="32" cy="38" rx="16" ry="14" fill={c1}/><polygon points="20,24 14,10 24,20" fill={c1}/><polygon points="44,24 50,10 40,20" fill={c1}/><polygon points="21,22 16,12 23,19" fill={c2} opacity="0.5"/><polygon points="43,22 48,12 41,19" fill={c2} opacity="0.5"/><circle cx="25" cy="35" r="4" fill="white"/><circle cx="39" cy="35" r="4" fill="white"/><circle cx="26" cy="36" r="2.5" fill={c2}/><circle cx="40" cy="36" r="2.5" fill={c2}/></svg>) },
];

const gradientText = (grad: string) => ({
  backgroundImage: grad,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
});

export default function ProfilePage() {
  const {
    darkMode, setDarkMode,
    appliedA, appliedB, setAppliedA, setAppliedB,
    grad, theme,
    userName, setUserName,
    avatarId, setAvatarId,
    userEmail,
  } = useTheme();

  const [colorA, setColorA] = useState(appliedA);
  const [colorB, setColorB] = useState(appliedB);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [applyLabel, setApplyLabel] = useState("Použiť farbu");
  const [toggles, setToggles] = useState([false, true, true]);
  const [editingName, setEditingName] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const currentAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];

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
    if (i === 0) setDarkMode(!darkMode);
    else setToggles(t => t.map((v, j) => j === i ? !v : v));
  }

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: "28px 28px 60px",
      display: "flex", flexDirection: "column", gap: 16,
      background: theme.bg, color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={appliedA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        <span style={gradientText(grad)}>Profil & Nastavenia</span>
      </div>

      {/* Avatar & meno */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 18, padding: 20,
        display: "flex", alignItems: "center", gap: 16, maxWidth: 480,
        transition: "background .3s", position: "relative",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div onClick={() => setPickingAvatar(v => !v)} style={{
            width: 64, height: 64, borderRadius: "50%",
            background: grad, padding: 4, cursor: "pointer",
            boxShadow: `0 4px 16px ${appliedA}55`,
          }}>
            {currentAvatar.svg(appliedA, appliedB)}
          </div>
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 20, height: 20, borderRadius: "50%",
            background: grad, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, cursor: "pointer", color: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }} onClick={() => setPickingAvatar(v => !v)}>✏️</div>

          {pickingAvatar && (
            <div style={{
              position: "absolute", top: 74, left: 0,
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: 12,
              display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8,
              zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", width: 280,
            }}>
              {AVATARS.map(a => (
                <div key={a.id} onClick={() => { setAvatarId(a.id); setPickingAvatar(false); }}
                  style={{
                    width: 52, height: 52, borderRadius: 12, cursor: "pointer",
                    background: avatarId === a.id ? grad : theme.card2, padding: 6,
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
              <input autoFocus type="text" value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Tvoje meno..."
                onKeyDown={e => { if (e.key === "Enter") setEditingName(false); }}
                style={{
                  background: theme.card2, border: `1px solid ${theme.border}`,
                  borderRadius: 10, padding: "7px 12px", color: theme.text,
                  fontFamily: "var(--font-geist-sans)", fontWeight: 700, fontSize: 15,
                  outline: "none", flex: 1,
                }}
              />
              <button onClick={() => setEditingName(false)} style={{
                background: grad, border: "none", borderRadius: 10,
                padding: "7px 14px", color: "#fff", fontWeight: 800,
                fontSize: 13, cursor: "pointer", fontFamily: "var(--font-geist-sans)",
              }}>Uložiť</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{userName || "Pridaj svoje meno"}</div>
              <button onClick={() => setEditingName(true)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, color: theme.muted, padding: 0,
              }}>✏️</button>
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.muted }}>{userEmail}</div>
        </div>
      </div>

      {/* Farba */}
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
            <div key={i} onClick={() => pickPreset(i)} style={{
              height: 48, borderRadius: 13, cursor: "pointer",
              background: `linear-gradient(135deg, ${p.a}, ${p.b})`,
              border: selectedPreset === i ? "3px solid #fff" : "3px solid transparent",
              boxShadow: selectedPreset === i ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#fff", fontWeight: 900,
            }}>{selectedPreset === i ? "✓" : ""}</div>
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
                  background: c.val, border: `2px solid ${theme.border}`, cursor: "pointer", overflow: "hidden",
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
          background: grad, color: "#fff", border: "none", borderRadius: 13, padding: 14,
          fontFamily: "var(--font-geist-sans)", fontWeight: 800, fontSize: 14,
          cursor: "pointer", width: "100%", boxShadow: `0 6px 20px ${appliedA}55`,
        }}>{applyLabel}</button>
      </div>

      {/* Všeobecné */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 18, padding: 20,
        display: "flex", flexDirection: "column", gap: 18, maxWidth: 480,
        transition: "background .3s",
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: theme.muted }}>🛠 Všeobecné</div>
        {[
          { name: "Tmavý režim", desc: "Prepni medzi tmavým a svetlým" },
          { name: "Notifikácie", desc: "Upozornenia o zmenách v projektoch" },
          { name: "Animácie",    desc: "Plynulé prechody a efekty" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginTop: 2 }}>{s.desc}</div>
            </div>
            <div onClick={() => handleToggle(i)} style={{
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

      {/* Nebezpečná zóna */}
      <div style={{
        background: theme.card, border: `1px solid #ef4444`,
        borderRadius: 18, padding: 20,
        display: "flex", flexDirection: "column", gap: 12, maxWidth: 480,
        transition: "background .3s",
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#ef4444" }}>⚠️ Nebezpečná zóna</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.muted }}>Po vymazaní účtu budú všetky tvoje dáta nenávratne odstránené.</div>
        <button onClick={async () => {
          if (!window.confirm("Naozaj chceš vymazať svoj účet? Táto akcia je nevratná.")) return;
          const user = auth.currentUser;
          if (!user) return;
          try {
            const { getFirestore, doc, deleteDoc } = await import("firebase/firestore");
            const db = getFirestore();
            await deleteDoc(doc(db, "users", user.uid));
            await user.delete();
            window.location.href = "/";
          } catch (err: any) {
            if (err.code === "auth/requires-recent-login") {
              alert("Z bezpečnostných dôvodov sa musíš znova prihlásiť pred vymazaním účtu.");
              await auth.signOut();
              window.location.href = "/login";
            } else {
              alert("Chyba pri mazaní účtu: " + err.message);
            }
          }
        }} style={{
          background: "transparent", border: "1px solid #ef4444",
          borderRadius: 13, padding: 14, color: "#ef4444",
          fontFamily: "var(--font-geist-sans)", fontWeight: 800, fontSize: 14,
          cursor: "pointer", width: "100%", transition: "background .2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >Vymazať účet</button>
      </div>
    </div>
  );
}