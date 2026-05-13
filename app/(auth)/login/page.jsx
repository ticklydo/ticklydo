"use client";
import { useState } from "react";
import { auth } from "../../firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07070f"}}>
      <div style={{background:"#13131f",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",padding:"40px",width:"100%",maxWidth:"400px"}}>
        <<img src="/LOGO.png" alt="TicklyDo" style={{height: "60px", marginBottom: "8px"}} />
        <p style={{color:"rgba(200,190,255,0.6)",marginBottom:"32px",fontFamily:"sans-serif"}}>
          {isRegister ? "Vytvor si účet" : "Prihlás sa do svojho účtu"}
        </p>

        <div style={{marginBottom:"16px"}}>
          <label style={{display:"block",color:"rgba(200,190,255,0.7)",fontSize:"13px",marginBottom:"6px",fontFamily:"sans-serif"}}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tvoj@email.sk"
            style={{width:"100%",padding:"10px 14px",background:"#1a1a2e",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"#f0eeff",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"}}
          />
        </div>

        <div style={{marginBottom:"24px"}}>
          <label style={{display:"block",color:"rgba(200,190,255,0.7)",fontSize:"13px",marginBottom:"6px",fontFamily:"sans-serif"}}>Heslo</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{width:"100%",padding:"10px 14px",background:"#1a1a2e",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:"8px",color:"#f0eeff",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"}}
          />
        </div>

        {error && (
          <p style={{color:"#f87171",fontSize:"13px",marginBottom:"16px",fontFamily:"sans-serif"}}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#db2777,#9333ea,#4f46e5)",border:"none",borderRadius:"8px",color:"#fff",fontSize:"15px",fontWeight:"800",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"16px"}}
        >
          {isRegister ? "Registrovať sa" : "Prihlásiť sa"}
        </button>

        <p style={{textAlign:"center",color:"rgba(200,190,255,0.5)",fontSize:"13px",fontFamily:"sans-serif"}}>
          {isRegister ? "Už máš účet? " : "Nemáš účet? "}
          <span
            onClick={() => setIsRegister(!isRegister)}
            style={{color:"#c084fc",cursor:"pointer",fontWeight:"700"}}
          >
            {isRegister ? "Prihlás sa" : "Registruj sa"}
          </span>
        </p>
      </div>
    </div>
  );
}