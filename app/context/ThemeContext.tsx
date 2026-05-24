"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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

export type ThemeContextType = {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  appliedA: string;
  appliedB: string;
  setAppliedA: (v: string) => void;
  setAppliedB: (v: string) => void;
  grad: string;
  theme: {
    bg: string;
    card: string;
    card2: string;
    text: string;
    muted: string;
    border: string;
  };
  userName: string;
  setUserName: (v: string) => void;
  avatarId: string;
  setAvatarId: (v: string) => void;
  userEmail: string;
  loaded: boolean;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(true);
  const [appliedA, setAppliedA] = useState("#e040fb");
  const [appliedB, setAppliedB] = useState("#7c63ff");
  const [userName, setUserName] = useState("");
  const [avatarId, setAvatarId] = useState("robot");
  const [userEmail, setUserEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const dataLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from Firebase on auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: any) => {
      if (!user) {
        setLoaded(true);
        return;
      }
      setUserEmail(user.email ?? "");
      try {
        const { getFirestore, doc, getDoc } = await import("firebase/firestore");
        const db = getFirestore();
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.colorA) setAppliedA(d.colorA);
          if (d.colorB) setAppliedB(d.colorB);
          if (d.userName) setUserName(d.userName);
          if (d.avatarId) setAvatarId(d.avatarId);
          if (d.darkMode !== undefined) setDarkModeState(d.darkMode);
        }
      } catch (e) {
        console.error("Firebase load error:", e);
      }
      dataLoaded.current = true;
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  // Save to Firebase (debounced)
  useEffect(() => {
    if (!dataLoaded.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const { getFirestore, doc, setDoc } = await import("firebase/firestore");
        const db = getFirestore();
        await setDoc(doc(db, "users", user.uid), {
          colorA: appliedA,
          colorB: appliedB,
          userName,
          avatarId,
          darkMode,
        }, { merge: true });
      } catch (e) {
        console.error("Firebase save error:", e);
      }
    }, 600);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [appliedA, appliedB, userName, avatarId, darkMode]);

  function setDarkMode(v: boolean) {
    setDarkModeState(v);
  }

  const grad = `linear-gradient(135deg, ${appliedA}, ${appliedB})`;

  const theme = {
    bg:     darkMode ? "#0b0c13" : "#f4f4f8",
    card:   darkMode ? "#13141e" : "#ffffff",
    card2:  darkMode ? "#1a1b28" : "#ebebf5",
    text:   darkMode ? "#f0f0f8" : "#111118",
    muted:  darkMode ? "#6b6c80" : "#8888a0",
    border: darkMode ? "#22233a" : "#dddde8",
  };

  return (
    <ThemeContext.Provider value={{
      darkMode, setDarkMode,
      appliedA, appliedB, setAppliedA, setAppliedB,
      grad, theme,
      userName, setUserName,
      avatarId, setAvatarId,
      userEmail,
      loaded,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}