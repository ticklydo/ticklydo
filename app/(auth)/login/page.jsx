"use client";
import { useState, useEffect } from "react";
import { auth } from "../../firebase.js";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getRedirectResult, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { useRouter } from "next/navigation";

const REMEMBER_KEY = "ticklydo_remember_until";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const rememberUntil = localStorage.getItem(REMEMBER_KEY);
        const isWithin30Days = rememberUntil && Date.now() < parseInt(rememberUntil);
        if (isWithin30Days) {
          router.replace("/home");
        } else {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    });

    getRedirectResult(auth).then(result => {
      if (result?.user) {
        localStorage.setItem(REMEMBER_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
        router.push("/home");
      }
    }).catch(() => {});

    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      router.push("/home");
    } catch (err) {
      if (err.code === "auth/invalid-credential") setError("Nesprávny email alebo heslo.");
      else if (err.code === "auth/invalid-email") setError("Neplatná emailová adresa.");
      else setError("Chyba: " + err.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
        }
        router.push("/home");
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google prihlásenie zlyhalo: " + err.code);
      }
    }
  };

  const handleReset = async () => {
    if (!email) return setError("Zadaj email pre reset hesla.");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setError("Nepodarilo sa odoslať reset hesla.");
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", background: "#1a1a2e",
    border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    color: "#f0eeff", fontSize: "14px", outline: "none",
    boxSizing: "border-box", fontFamily: "sans-serif",
  };
  const labelStyle = {
    display: "block", color: "rgba(200,190,255,0.7)",
    fontSize: "13px", marginBottom: "6px", fontFamily: "sans-serif",
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070f" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #22233a", borderTopColor: "#c084fc", animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070f" }}>
      <div style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "400px" }}>
        <img src="/LOGO.png" alt="TicklyDo" style={{ height: "100px", marginBottom: "8px" }} />
        <p style={{ color: "rgba(200,190,255,0.6)", marginBottom: "24px", fontFamily: "sans-serif" }}>Prihlás sa do svojho účtu</p>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tvoj@email.sk" style={inputStyle} />
        </div>

        <div style={{ marginBottom: "8px" }}>
          <label style={labelStyle}>Heslo</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div
              onClick={() => setRememberMe(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${rememberMe ? "#c084fc" : "rgba(255,255,255,0.2)"}`,
                background: rememberMe ? "#c084fc" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s", cursor: "pointer",
              }}
            >
              {rememberMe && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <span style={{ color: "rgba(200,190,255,0.6)", fontSize: "13px", fontFamily: "sans-serif" }}>
              Zostať prihlásený 30 dní
            </span>
          </label>
          <span onClick={handleReset} style={{ color: "#c084fc", cursor: "pointer", fontSize: "12px", fontFamily: "sans-serif" }}>
            Zabudol si heslo?
          </span>
        </div>

        {resetSent && <p style={{ color: "#4ade80", fontSize: "13px", marginBottom: "16px", fontFamily: "sans-serif" }}>Reset hesla bol odoslaný na tvoj email.</p>}
        {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px", fontFamily: "sans-serif" }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#db2777,#9333ea,#4f46e5)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "15px", fontWeight: "800", cursor: "pointer", fontFamily: "sans-serif", marginBottom: "12px", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Prihlasujem..." : "Prihlásiť sa"}
        </button>

        <button onClick={handleGoogle}
          style={{ width: "100%", padding: "12px", background: "#fff", border: "none", borderRadius: "8px", color: "#333", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "sans-serif", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <img src="https://www.google.com/favicon.ico" style={{ height: "18px" }} /> Prihlásiť cez Google
        </button>

        <p style={{ textAlign: "center", color: "rgba(200,190,255,0.5)", fontSize: "13px", fontFamily: "sans-serif" }}>
          Nemáš účet? <span onClick={() => router.push("/register")} style={{ color: "#c084fc", cursor: "pointer", fontWeight: "700" }}>Registruj sa</span>
        </p>
        <button onClick={() => router.push("/")} style={{ marginTop: "16px", background: "none", border: "none", color: "rgba(200,190,255,0.5)", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}>
          ← Späť na úvodnú stránku
        </button>
      </div>
    </div>
  );
}