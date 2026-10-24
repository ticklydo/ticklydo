"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "../context/ThemeContext";
import {
  SavedAccount, accountApp, getSavedAccounts, logoutAll, mainAuth, removeAccount,
  saveCurrentAccount, switchToAccount,
} from "../utils/accounts";

// Hook: uloží práve prihláseného používateľa medzi účty zariadenia (volá sa v ApprovalGate, vždy zapnutý)
export function useAutoSaveAccount() {
  useEffect(() => {
    const unsub = onAuthStateChanged(mainAuth(), (user) => {
      if (user) saveCurrentAccount(user);
    });
    return () => unsub();
  }, []);
}

// Hook: zoznam uložených účtov + počet neprečítaných upozornení pre KAŽDÝ z nich
// (aj pre neaktívne účty, takže upozornenia sú aktívne nonstop, kým je aplikácia otvorená).
export function useAccounts() {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeUid, setActiveUid] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setAccounts(getSavedAccounts());
    load();
    window.addEventListener("ticklydo-accounts-changed", load);
    window.addEventListener("storage", load);
    const unsub = onAuthStateChanged(mainAuth(), (u) => setActiveUid(u?.uid ?? null));
    return () => {
      window.removeEventListener("ticklydo-accounts-changed", load);
      window.removeEventListener("storage", load);
      unsub();
    };
  }, []);

  const uidKey = accounts.map(a => a.uid).join(",");

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    accounts.forEach(acc => {
      let first = true;
      try {
        const db = getFirestore(accountApp(acc.uid));
        const q = query(collection(db, "notifications"), where("userId", "==", acc.uid), where("read", "==", false));
        unsubs.push(onSnapshot(q, (snap) => {
          setUnread(prev => ({ ...prev, [acc.uid]: snap.size }));
          if (first) { first = false; return; }
          // nové upozornenie počas behu aplikácie → systémová notifikácia prehliadača (ak je povolená)
          snap.docChanges().forEach(ch => {
            if (ch.type !== "added") return;
            try {
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                const d: any = ch.doc.data();
                new Notification(d.title || "TicklyDo", {
                  body: `${d.body || ""}${acc.email ? `\n(${acc.email})` : ""}`,
                  icon: "/IKONA.png",
                });
              }
            } catch {}
          });
        }, () => {}));
      } catch {}
    });
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidKey]);

  return { accounts, unread, activeUid };
}

export default function AccountSwitcher({ onClose, isMobile }: { onClose: () => void; isMobile: boolean }) {
  const router = useRouter();
  const { theme, appliedA, grad } = useTheme();
  const { accounts, unread, activeUid } = useAccounts();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [perm, setPerm] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const doSwitch = async (uid: string) => {
    setBusy(uid);
    setError("");
    try {
      await switchToAccount(uid);
    } catch (e: any) {
      setError(e.message || "Prepnutie zlyhalo.");
      setBusy(null);
    }
  };

  const enableNotifications = async () => {
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
    } catch {}
  };

  const initial = (a: SavedAccount) => (a.name || a.email || "?").trim().charAt(0).toUpperCase();

  const linkBtn = (label: string, onClick: () => void, danger = false) => (
    <button
      onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 9, background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: danger ? "#ef4444" : theme.text, fontFamily: "var(--font-geist-sans)" }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.card2)}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", zIndex: 1500,
        ...(isMobile ? { left: 12, right: 12, bottom: 70 } : { left: 76, bottom: 18, width: 300 }),
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.35)", padding: 8, fontFamily: "var(--font-geist-sans)",
        maxHeight: "70vh", overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.muted, padding: "6px 12px 8px" }}>
        Účty na tomto zariadení
      </div>

      {accounts.length === 0 && (
        <div style={{ fontSize: 12.5, color: theme.muted, padding: "4px 12px 10px" }}>
          Aktuálny účet sa uloží po chvíli. Potom sem môžeš pridať ďalšie.
        </div>
      )}

      {accounts.map(a => {
        const active = a.uid === activeUid;
        return (
          <div key={a.uid} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => (active ? onClose() : doSwitch(a.uid))}
              disabled={busy === a.uid}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: active ? theme.card2 : "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-geist-sans)", opacity: busy === a.uid ? 0.6 : 1 }}
            >
              <span style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: grad, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {initial(a)}
                {(unread[a.uid] || 0) > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: `1.5px solid ${theme.card}` }}>
                    {unread[a.uid] > 9 ? "9+" : unread[a.uid]}
                  </span>
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name || a.email}</span>
                {a.name && <span style={{ display: "block", fontSize: 11.5, color: theme.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</span>}
              </span>
              {active && <span style={{ fontSize: 10.5, fontWeight: 800, color: appliedA }}>Aktívny</span>}
            </button>
            {!active && (
              <button
                title="Odstrániť z tohto zariadenia"
                onClick={() => removeAccount(a.uid)}
                style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "none", color: theme.muted, cursor: "pointer", flexShrink: 0 }}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {error && <div style={{ color: "#ef4444", fontSize: 12, padding: "6px 12px" }}>{error}</div>}

      <div style={{ height: 1, background: theme.border, margin: "8px 4px" }} />

      {linkBtn("+ Pridať ďalší účet", () => { onClose(); router.push("/login?add=1"); })}
      {perm === "default" && linkBtn("Povoliť upozornenia v prehliadači", enableNotifications)}
      {perm === "denied" && (
        <div style={{ fontSize: 11.5, color: theme.muted, padding: "4px 12px 6px" }}>
          Upozornenia v prehliadači sú zablokované. Povoľ ich v nastaveniach stránky (ikona zámku pri adrese).
        </div>
      )}
      {perm === "granted" && (
        <div style={{ fontSize: 11.5, color: theme.muted, padding: "4px 12px 6px" }}>Upozornenia v prehliadači sú zapnuté.</div>
      )}
      {linkBtn("Odhlásiť všetky účty", () => logoutAll(), true)}
    </div>
  );
}