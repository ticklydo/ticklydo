"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";
import { ReactNode, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

// Pages where sidebar should NOT appear
const NO_SIDEBAR_PATHS = ["/", "/login", "/register", "/privacy", "/terms"];

// Stránky, ktoré sú dostupné aj bez schváleného účtu (verejné stránky a verejný odkaz na poznámku)
const isPublicPath = (pathname: string) =>
  NO_SIDEBAR_PATHS.includes(pathname) || pathname.startsWith("/notes/shared/");

type ApprovalState = "loading" | "anon" | "approved" | "pending" | "rejected";

// Nové účty sa po registrácii vytvoria ako "čakajúce" (approved: false). Kým ich správca
// neschváli na stránke /admin, používateľ vidí len obrazovku "Čakáš na schválenie".
// Účty vytvorené pred zavedením schvaľovania (bez poľa approved) sa považujú za schválené.
function ApprovalGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<ApprovalState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (!user) { setState("anon"); return; }
      setEmail(user.email ?? "");
      unsubDoc = onSnapshot(
        doc(db, "users", user.uid),
        async (snap) => {
          if (!snap.exists()) {
            // úplne nový účet — založ čakajúci záznam
            setState("pending");
            try {
              await setDoc(doc(db, "users", user.uid), {
                email: user.email ?? "",
                approved: false,
                createdAt: Date.now(),
              }, { merge: true });
            } catch (e) {
              console.error("Nepodarilo sa založiť záznam používateľa:", e);
            }
            return;
          }
          const d = snap.data();
          if (d.rejected === true) setState("rejected");
          else if (d.approved === false) setState("pending");
          else setState("approved");
        },
        (err) => {
          // pri chybe čítania (napr. výpadok siete) nezamykaj aplikáciu
          console.error("Kontrola schválenia zlyhala:", err);
          setState("approved");
        }
      );
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  if (isPublicPath(pathname) || state === "anon" || state === "approved") return <>{children}</>;

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c13" }}>
        <style>{`@keyframes gateSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #22233a", borderTopColor: "#e040fb", animation: "gateSpin .8s linear infinite" }} />
      </div>
    );
  }

  const rejected = state === "rejected";
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#09090f", fontFamily: "var(--font-geist-sans)" }}>
      <div style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 440, textAlign: "center" }}>
        <img src="/LOGO.png" alt="TicklyDo" style={{ height: 72, marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f0eeff", marginBottom: 10 }}>
          {rejected ? "Registrácia nebola schválená" : "Čakáš na schválenie"}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(200,190,255,0.75)", marginBottom: 6 }}>
          {rejected
            ? "Tvoju žiadosť o prístup sme zatiaľ nepotvrdili. Ak si myslíš, že ide o omyl, napíš nám."
            : "Tvoj účet ešte musí potvrdiť správca. Hneď ako to urobí, aplikácia sa ti sama sprístupní, stránku nemusíš obnovovať."}
        </p>
        {email && <p style={{ fontSize: 13, color: "rgba(200,190,255,0.5)", marginBottom: 20 }}>{email}</p>}
        <a href="mailto:support@ticklydo.com" style={{ display: "block", fontSize: 13, color: "#c084fc", marginBottom: 20, textDecoration: "none" }}>support@ticklydo.com</a>
        <button
          onClick={async () => { await signOut(auth); router.push("/"); }}
          style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0eeff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-geist-sans)" }}
        >
          Odhlásiť sa
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, loaded } = useTheme();

  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  // Loading screen (only for authed pages)
  if (!loaded && showSidebar) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0c13",
        gap: 20,
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.92); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <img
          src="/IKONA.png"
          alt="TicklyDo"
          style={{
            width: 72, height: 72, borderRadius: 20,
            animation: "pulse 1.6s ease-in-out infinite",
            objectFit: "contain",
          }}
        />
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #22233a",
          borderTopColor: "#e040fb",
          animation: "spin .8s linear infinite",
        }} />
        <div style={{
          color: "#6b6c80", fontSize: 13, fontWeight: 700,
          fontFamily: "var(--font-geist-sans)",
          letterSpacing: "0.5px",
        }}>
          Načítavam...
        </div>
      </div>
    );
  }

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: theme.bg,
      color: theme.text,
      fontFamily: "var(--font-geist-sans)",
      transition: "background .3s, color .3s",
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}

export function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ApprovalGate>
        <Shell>{children}</Shell>
      </ApprovalGate>
    </ThemeProvider>
  );
}