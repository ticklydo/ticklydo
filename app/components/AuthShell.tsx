"use client";

import { useEffect, useLayoutEffect, useState, ReactNode } from "react";

// Spoločný vzhľad pre prihlásenie a registráciu: svetlý/tmavý režim (zapamätaný aj z úvodnej stránky)
// a rovnaký farebný gradient dole ako na úvodnej stránke.

const THEME_KEY = "landing-theme";
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type AuthTheme = {
  dark: boolean;
  card: string;
  cardBorder: string;
  text: string;
  muted: string;
  link: string;
  inputBg: string;
  inputBorder: string;
  checkBorder: string;
  googleBorder: string;
  error: string;
  success: string;
};

export function getAuthTheme(dark: boolean): AuthTheme {
  return dark
    ? {
        dark: true, card: "#13131f", cardBorder: "rgba(255,255,255,0.1)", text: "#f0eeff",
        muted: "rgba(200,190,255,0.65)", link: "#c084fc", inputBg: "#1a1a2e",
        inputBorder: "rgba(255,255,255,0.12)", checkBorder: "rgba(255,255,255,0.25)",
        googleBorder: "transparent", error: "#f87171", success: "#4ade80",
      }
    : {
        dark: false, card: "#ffffff", cardBorder: "#e4e4ee", text: "#14141f",
        muted: "#5c5c72", link: "#7c3aed", inputBg: "#f6f6fa",
        inputBorder: "#d9d9e6", checkBorder: "#c4c4d4",
        googleBorder: "#d9d9e6", error: "#dc2626", success: "#16a34a",
      };
}

export default function AuthShell({ children }: { children: (t: AuthTheme) => ReactNode }) {
  const [dark, setDark] = useState(false);

  useIsoLayoutEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "dark") setDark(true);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch {}
  };

  const t = getAuthTheme(dark);

  return (
    <div className="auth-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: dark ? "#09090f" : "#fafafc", color: t.text, overflow: "hidden", transition: "background .3s" }}>
      <style>{`
        /* mobil: karta sa zmestí na obrazovku bez rolovania; polia majú 16px písmo (iOS inak približuje stránku) */
        .auth-root input:not([type="checkbox"]) { font-size: 16px !important; }
        @media (max-width: 480px) {
          .auth-root { padding: 58px 12px 14px !important; }
          .auth-root [style*="max-width: 400px"] { padding: 18px 18px 14px !important; border-radius: 14px !important; }
          .auth-root [style*="max-width: 400px"] > img:first-child { height: 52px !important; margin-bottom: 4px !important; }
          .auth-root [style*="max-width: 400px"] > p:nth-of-type(1) { margin-bottom: 12px !important; font-size: 14px; }
          .auth-root [style*="max-width: 400px"] > p:nth-of-type(2) { margin-top: -6px !important; margin-bottom: 12px !important; font-size: 12px !important; line-height: 1.45 !important; }
          .auth-root [style*="max-width: 400px"] > div { margin-bottom: 10px !important; }
          .auth-root [style*="max-width: 400px"] label { margin-bottom: 4px !important; }
          .auth-root [style*="max-width: 400px"] input:not([type="checkbox"]) { padding: 9px 12px !important; min-height: 44px; }
          .auth-root [style*="max-width: 400px"] button { min-height: 44px; padding-top: 9px !important; padding-bottom: 9px !important; margin-bottom: 8px !important; }
          .auth-root [style*="max-width: 400px"] > button:last-child { margin-top: 2px !important; margin-bottom: 0 !important; min-height: 36px; }
        }
        .auth-glow {
          position: absolute; left: 0; right: 0; bottom: 0; height: 60%; z-index: 0; pointer-events: none;
          background: linear-gradient(90deg, #f472b6, #a78bfa, #60a5fa, #2dd4bf, #f472b6);
          background-size: 400% 100%;
          opacity: ${dark ? 0.42 : 0.38};
          -webkit-mask-image: linear-gradient(0deg, #000 0%, rgba(0,0,0,0.55) 40%, transparent 100%);
          mask-image: linear-gradient(0deg, #000 0%, rgba(0,0,0,0.55) 40%, transparent 100%);
          animation: authColorFlow 16s ease-in-out infinite alternate;
        }
        @keyframes authColorFlow {
          from { background-position: 0% 0%; }
          to { background-position: 100% 0%; }
        }
        .auth-toggle {
          position: absolute; top: 1.4rem; right: 1.5rem; z-index: 5;
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color .2s;
        }
      `}</style>
      <div className="auth-glow" />
      <button
        className="auth-toggle"
        onClick={toggleTheme}
        aria-label={dark ? "Prepnúť na svetlý režim" : "Prepnúť na tmavý režim"}
        title={dark ? "Svetlý režim" : "Tmavý režim"}
        style={{ background: t.card, color: t.text, border: `1px solid ${t.cardBorder}` }}
      >
        {dark ? (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></svg>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        )}
      </button>
      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
        {children(t)}
      </div>
    </div>
  );
}