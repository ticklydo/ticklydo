"use client";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newPri, setNewPri] = useState("normal");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { router.push("/login"); }
      else { setUser(currentUser); setLoading(false); loadTasks(currentUser.uid); }
    });
    return () => unsubscribe();
  }, []);

  const loadTasks = async (uid: string) => {
    const q = query(collection(db, "tasks"), where("uid", "==", uid));
    const snap = await getDocs(q);
    setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const doc2 = await addDoc(collection(db, "tasks"), {
      text: newTask, col: "todo", pri: newPri, uid: user.uid, createdAt: Date.now()
    });
    setTasks(prev => [...prev, { id: doc2.id, text: newTask, col: "todo", pri: newPri, uid: user.uid }]);
    setNewTask(""); setNewPri("normal");
  };

  const moveTask = async (id: string, col: string) => {
    await updateDoc(doc(db, "tasks", id), { col });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, col } : t));
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleLogout = async () => { await signOut(auth); router.push("/login"); };

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07070f",color:"#c084fc",fontFamily:"sans-serif"}}>Načítavam...</div>;

  const cols = [
    { id: "todo", label: "Todo", color: "#818cf8" },
    { id: "prog", label: "In Progress", color: "#c084fc" },
    { id: "done", label: "Done", color: "#f472b6" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"sans-serif",padding:"24px"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"32px"}}>
          <h1 style={{background:"linear-gradient(90deg,#f472b6,#c084fc,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:"26px",fontWeight:"900"}}>TicklyDo</h1>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{color:"rgba(200,190,255,0.5)",fontSize:"13px"}}>{user?.email}</span>
            <button onClick={handleLogout} style={{padding:"7px 14px",background:"rgba(244,114,182,0.1)",border:"1px solid rgba(244,114,182,0.3)",borderRadius:"8px",color:"#f472b6",fontSize:"13px",fontWeight:"700",cursor:"pointer"}}>Odhlásiť sa</button>
          </div>
        </div>

        {/* Add task */}
        <div style={{display:"flex",gap:"8px",marginBottom:"28px"}}>
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Nová úloha..."
            style={{flex:1,padding:"10px 14px",background:"#13131f",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#f0eeff",fontSize:"14px",outline:"none",fontFamily:"sans-serif"}}
          />
          <select value={newPri} onChange={e => setNewPri(e.target.value)} style={{padding:"10px",background:"#13131f",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"rgba(200,190,255,0.7)",fontSize:"13px",outline:"none"}}>
            <option value="normal">— priorita</option>
            <option value="high">! vysoká</option>
            <option value="urgent">!! urgentná</option>
          </select>
          <button onClick={addTask} style={{padding:"10px 18px",background:"linear-gradient(135deg,#db2777,#9333ea)",border:"none",borderRadius:"8px",color:"#fff",fontSize:"14px",fontWeight:"800",cursor:"pointer"}}>+ Pridať</button>
        </div>

        {/* Columns */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
          {cols.map(col => (
            <div key={col.id} style={{background:"#13131f",borderRadius:"12px",border:`1px solid rgba(255,255,255,0.07)`,borderTop:`3px solid ${col.color}`,padding:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"14px"}}>
                <span style={{fontSize:"12px",fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.8px",color:col.color}}>{col.label}</span>
                <span style={{fontSize:"11px",background:"#1a1a2e",color:"rgba(200,190,255,0.5)",padding:"2px 8px",borderRadius:"20px"}}>{tasks.filter(t=>t.col===col.id).length}</span>
              </div>
              {tasks.filter(t => t.col === col.id).map(task => (
                <div key={task.id} style={{background:"#0f0f1a",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px 12px",marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
                    <span style={{fontSize:"13px",color:"#f0eeff",lineHeight:"1.5",flex:1}}>{task.text}</span>
                    <button onClick={() => deleteTask(task.id)} style={{background:"none",border:"none",color:"rgba(200,190,255,0.3)",cursor:"pointer",fontSize:"16px",lineHeight:"1",flexShrink:0}}>×</button>
                  </div>
                  {task.pri !== "normal" && (
                    <span style={{fontSize:"10px",padding:"2px 6px",borderRadius:"4px",fontWeight:"700",background:task.pri==="urgent"?"rgba(244,114,182,0.15)":"rgba(192,132,252,0.15)",color:task.pri==="urgent"?"#f472b6":"#c084fc",marginTop:"6px",display:"inline-block"}}>
                      {task.pri === "urgent" ? "!! urgentná" : "! vysoká"}
                    </span>
                  )}
                  <div style={{display:"flex",gap:"4px",marginTop:"8px"}}>
                    {cols.filter(c => c.id !== col.id).map(c => (
                      <button key={c.id} onClick={() => moveTask(task.id, c.id)} style={{fontSize:"10px",padding:"3px 7px",borderRadius:"4px",border:`1px solid ${c.color}40`,background:"none",color:c.color,cursor:"pointer",fontWeight:"700"}}>→ {c.label}</button>
                    ))}
                  </div>
                </div>
              ))}
              {tasks.filter(t=>t.col===col.id).length === 0 && (
                <div style={{textAlign:"center",padding:"24px",color:"rgba(200,190,255,0.2)",fontSize:"13px"}}>Žiadne úlohy</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}