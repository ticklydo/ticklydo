 "use client";
import { useState } from "react";
import { auth } from "../../firebase.js";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) return setError("Heslo musí mať aspoň 8 znakov.");
    if (!/[A-Z]/.test(password)) return setError("Heslo musí obsahovať aspoň jedno veľké písmeno.");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return setError("Heslo musí obsahovať aspoň jeden špeciálny znak.");
    if (password !== password2) return setError("Heslá sa nezhodujú.");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Tento email je už zaregistrovaný.");
      else if (err.code === "auth/invalid-email") setError("Neplatná emailová adresa.");
      else setError("Chyba: " + err.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      setError("Google prihlásenie zlyhalo.");
    }
  };

  const inputStyle = {width:"100%",padding:"10px 14px",background:"#1a1a2e",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"#f0eeff",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"};
  const labelStyle = {display:"block",color:"rgba(200,190,255,0.7)",fontSize:"13px",marginBottom:"6px",fontFamily:"sans-serif"};

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07070f"}}>
      <div style={{background:"#13131f",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",padding:"40px",width:"100%",maxWidth:"400px"}}>
        <img src="/LOGO.png" alt="TicklyDo" style={{height:"100px",marginBottom:"8px"}} />
        <p style={{color:"rgba(200,190,255,0.6)",marginBottom:"24px",fontFamily:"sans-serif"}}>Vytvor si účet</p>

        <div style={{marginBottom:"16px"}}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tvoj@email.sk" style={inputStyle} />
        </div>

        <div style={{marginBottom:"16px"}}>
          <label style={labelStyle}>Heslo</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          {password.length > 0 && (
            <div style={{marginTop:"8px",fontFamily:"sans-serif",fontSize:"12px"}}>
              <div style={{color:password.length >= 8 ? "#4ade80" : "#f87171"}}>{password.length >= 8 ? "✓" : "✗"} Minimálne 8 znakov</div>
              <div style={{color:/[A-Z]/.test(password) ? "#4ade80" : "#f87171"}}>{/[A-Z]/.test(password) ? "✓" : "✗"} Veľké písmeno</div>
              <div style={{color:/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "#4ade80" : "#f87171"}}>{/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✓" : "✗"} Špeciálny znak</div>
            </div>
          )}
        </div>

        <div style={{marginBottom:"24px"}}>
          <label style={labelStyle}>Potvrd heslo</label>
          <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        </div>

        {error && <p style={{color:"#f87171",fontSize:"13px",marginBottom:"16px",fontFamily:"sans-serif"}}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#db2777,#9333ea,#4f46e5)",border:"none",borderRadius:"8px",color:"#fff",fontSize:"15px",fontWeight:"800",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"12px",opacity:loading?0.7:1}}>
          {loading ? "Registrujem..." : "Registrovať sa"}
        </button>

        <button onClick={handleGoogle}
          style={{width:"100%",padding:"12px",background:"#fff",border:"none",borderRadius:"8px",color:"#333",fontSize:"15px",fontWeight:"700",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
          <img src="https://www.google.com/favicon.ico" style={{height:"18px"}} /> Registrovať cez Google
        </button>

        <p style={{textAlign:"center",color:"rgba(200,190,255,0.5)",fontSize:"13px",fontFamily:"sans-serif"}}>
          Už máš účet? <span onClick={() => router.push("/login")} style={{color:"#c084fc",cursor:"pointer",fontWeight:"700"}}>Prihlás sa</span>
        </p>
        <button onClick={() => router.push("/")} style={{marginTop:"16px",background:"none",border:"none",color:"rgba(200,190,255,0.5)",fontSize:"13px",cursor:"pointer",fontFamily:"sans-serif"}}>
          ← Späť na úvodnú stránku
        </button>
      </div>
    </div>
  );
}