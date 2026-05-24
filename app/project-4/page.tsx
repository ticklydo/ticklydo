"use client";
import { useRouter } from "next/navigation";

export default function Project4() {
  const router = useRouter();
  return (
    <div style={{minHeight:"100vh",background:"#0b0c13",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      <h1 style={{color:"#f0f0f8",fontSize:"24px",marginBottom:"8px"}}>Spustenie produktu</h1>
      <p style={{color:"#6b6c80",fontSize:"14px",marginBottom:"32px"}}>Zatiaľ prázdne. Čoskoro tu pribudne obsah.</p>
      <button onClick={() => router.push("/home")} style={{background:"none",border:"1px solid #22233a",borderRadius:"10px",padding:"10px 20px",color:"#6b6c80",cursor:"pointer",fontSize:"14px"}}>← Späť</button>
    </div>
  );
}