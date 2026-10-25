"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

// Súhlas s cookies. Google Analytics sa načíta až po kliknutí na "Prijať všetko".
// "Len nevyhnutné" = len prihlásenie, žiadne sledovanie.
const KEY = "ticklydo-cookie-consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function CookieConsent() {
  const [consent, setConsent] = useState<string | null | undefined>(undefined);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(KEY));
      setDark(localStorage.getItem("landing-theme") === "dark");
    } catch {
      setConsent(null);
    }
    // odkaz "Nastavenia cookies" v pätičke znovu otvorí lištu
    const reopen = () => setConsent(null);
    window.addEventListener("ticklydo-cookie-settings", reopen);
    return () => window.removeEventListener("ticklydo-cookie-settings", reopen);
  }, []);

  const choose = (v: "all" | "necessary") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setConsent(v);
  };

  return (
    <>
      {consent === "all" && GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {consent === null && (
        <div
          role="dialog"
          aria-label="Súhlas s cookies"
          style={{
            position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
            width: "calc(100% - 24px)", maxWidth: 560,
            background: dark ? "#13131f" : "#ffffff",
            border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e0e0ea",
            borderRadius: 16, padding: "16px 18px", boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            fontFamily: "sans-serif",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: dark ? "rgba(220,214,255,0.88)" : "#3a3a4e" }}>
            Používame nevyhnutné cookies na prihlásenie. Ak súhlasíš, použijeme aj analytické cookies (Google Analytics), vďaka ktorým vidíme, ako sa web používa, a vieme ho zlepšovať.{" "}
            <a href="/privacy" style={{ color: "#a855f7" }}>Viac info</a>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => choose("all")}
              style={{ flex: "1 1 140px", padding: "10px 16px", background: "linear-gradient(135deg,#db2777,#9333ea)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Prijať všetko
            </button>
            <button
              onClick={() => choose("necessary")}
              style={{ flex: "1 1 140px", padding: "10px 16px", background: "transparent", border: dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cfcfe0", borderRadius: 10, color: dark ? "#f0eeff" : "#14141f", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Len nevyhnutné
            </button>
          </div>
        </div>
      )}
    </>
  );
}