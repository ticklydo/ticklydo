"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconBoard = () => (
  <svg {...iconProps}><rect x="3" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="7" height="11" rx="2"/></svg>
);
const IconNote = () => (
  <svg {...iconProps}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
);
const IconWeek = () => (
  <svg {...iconProps}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
);

const features = [
  { icon: <IconBoard />, title: "Projekty a úlohy", text: "Úlohy s termínmi na prehľadnej tabuli. Pozvi ostatných a pracujte spolu, pripomienky ti prídu e-mailom aj v aplikácii." },
  { icon: <IconNote />, title: "Poznámky", text: "Text, fotky priamo v texte a zoznamy s políčkami. Zdieľaj odkazom alebo prepoj s projektom." },
  { icon: <IconWeek />, title: "Týždenný plán", text: "Celý týždeň na jednom prehľade, aby si vždy vedela, čo ťa čaká." },
];

const audience = [
  { title: "Študenti", text: "Semestrálky, termíny a poznámky z prednášok." },
  { title: "Tímy", text: "Spoločné projekty a zdieľané poznámky." },
  { title: "Jednotlivci", text: "Osobný plán týždňa a nápady." },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [cookieBanner, setCookieBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/home");
      else setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies-accepted");
    if (!accepted) setCookieBanner(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookies-accepted", "true");
    setCookieBanner(false);
  };

  if (checking) return (
    <div style={{minHeight:"100vh",background:"#fafafc",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src="/IKONA.png" alt="loading" style={{width:"120px",animation:"bounce 0.8s infinite alternate"}} />
      <style>{`@keyframes bounce { from { transform: translateY(0px) rotate(-5deg); } to { transform: translateY(-30px) rotate(5deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --pink: #d94fbf; --purple: #8b5cf6; --blue: #4f8ef7;
          --bg: #fafafc; --surface: #ffffff; --border: #e4e4ee;
          --text: #14141f; --muted: #5c5c72;
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
        .btn-primary, .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600;
          cursor: pointer; white-space: nowrap; transition: opacity 0.2s, border-color 0.2s;
          padding: 0.85rem 1.7rem; font-size: 0.95rem;
        }
        .btn-primary { border: none; color: #fff; background: linear-gradient(135deg, var(--pink), var(--purple)); }
        .btn-primary:hover { opacity: 0.88; }
        .btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
        .btn-secondary:hover { border-color: var(--muted); }
        .gradient-text { background: linear-gradient(90deg, var(--pink), var(--purple) 55%, var(--blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .footer-links { display: flex; gap: 1.1rem; flex-wrap: wrap; }
        .footer-links span, .footer-links a { cursor: pointer; color: var(--muted); font-size: 0.8rem; text-decoration: none; }
        .footer-links span:hover, .footer-links a:hover { color: var(--text); }

        .split { position: relative; min-height: 100vh; display: grid; grid-template-columns: 1.15fr 1fr; }
        .split::before {
          content: "";
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(180deg, #f472b6, #a78bfa, #60a5fa, #2dd4bf, #f472b6);
          background-size: 100% 400%;
          opacity: 0.55;
          -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.6) 30%, transparent 70%);
          mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.6) 30%, transparent 70%);
          animation: colorFlow 14s ease-in-out infinite alternate;
        }
        .brand-side {
          padding: 2.2rem 4rem 2.5rem;
          position: relative; z-index: 1;
          display: flex; flex-direction: column; justify-content: space-between; gap: 2rem;
        }
        .brand-main { max-width: 520px; }
        .brand-main h1 { font-size: clamp(2rem, 4vw, 3.1rem); font-weight: 800; line-height: 1.12; letter-spacing: -0.03em; }
        .brand-main .sub { margin-top: 1rem; font-size: 1.05rem; color: var(--muted); line-height: 1.65; max-width: 460px; }
        .feat-list { margin-top: 2.2rem; display: flex; flex-direction: column; gap: 1.1rem; }
        .feat { display: flex; gap: 0.9rem; align-items: flex-start; }
        .feat-icon { width: 40px; height: 40px; border-radius: 50%; background: #fff; color: var(--purple); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 10px rgba(139,92,246,0.15); }
        .feat h3 { font-size: 0.98rem; font-weight: 700; }
        .feat p { font-size: 0.88rem; color: var(--muted); line-height: 1.55; margin-top: 0.15rem; }
        .action-side { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 2.2rem 2rem 1.5rem; }
        .action-card { width: 100%; max-width: 380px; margin: auto 0; text-align: center; }
        .action-card h2 { font-size: 1.5rem; font-weight: 700; margin-top: 0.8rem; }
        .action-card .note { font-size: 0.85rem; color: var(--muted); margin-top: 0.4rem; }
        .action-buttons { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.6rem; }
        .aud { margin-top: 2rem; padding-top: 1.4rem; border-top: 1px solid var(--border); text-align: left; display: flex; flex-direction: column; gap: 0.8rem; }
        .aud-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .aud-item { font-size: 0.88rem; color: var(--muted); line-height: 1.5; }
        .aud-item b { color: var(--text); font-weight: 600; }
        .action-footer { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; font-size: 0.78rem; color: var(--muted); text-align: center; }
        .action-footer .footer-links { justify-content: center; }
        @keyframes colorFlow {
          from { background-position: 0% 0%; }
          to { background-position: 0% 100%; }
        }
        @media (max-width: 900px) {
          .split { grid-template-columns: 1fr; }
          .brand-side { padding: 1.5rem 1.4rem 2rem; }
          .action-side { padding: 2rem 1.4rem 1.5rem; }
        }
      `}</style>

      <div className="split">
        <section className="brand-side">
          <img src="/LOGO.png" alt="TicklyDo" style={{height:"68px",width:"auto",alignSelf:"flex-start"}} />
          <div className="brand-main">
            <h1>Projekty, poznámky a plán týždňa <span className="gradient-text">na jednom mieste.</span></h1>
            <p className="sub">Prehľadne si zorganizuj prácu aj štúdium bez chaosu.</p>
            <div className="feat-list">
              {features.map(f => (
                <div className="feat" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div />
        </section>

        <section className="action-side">
          <div />
          <div className="action-card">
            <img src="/IKONA.png" alt="" style={{width:"84px",height:"auto"}} />
            <h2>Začni s TicklyDo</h2>
            <p className="note">Registrácia je zadarmo, bez kreditnej karty.</p>
            <div className="action-buttons">
              <button className="btn-primary" onClick={() => router.push("/register")}>Registrácia</button>
              <button className="btn-secondary" onClick={() => router.push("/login")}>Prihlásenie</button>
            </div>
            <div className="aud">
              <div className="aud-label">Pre koho je</div>
              {audience.map(a => (
                <div className="aud-item" key={a.title}><b>{a.title}</b> · {a.text}</div>
              ))}
            </div>
          </div>
          <div className="action-footer">
            <span>© 2026 TicklyDo</span>
            <div className="footer-links">
              <span onClick={() => router.push("/privacy")}>Podmienky & GDPR</span>
              <span onClick={() => router.push("/terms")}>Podmienky používania</span>
              <a href="mailto:support@ticklydo.com">support@ticklydo.com</a>
            </div>
          </div>
        </section>
      </div>

      {cookieBanner && (
        <div style={{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#ffffff",border:"1px solid #e0e0ea",borderRadius:"16px",padding:"16px 24px",display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap",justifyContent:"center",maxWidth:"600px",width:"calc(100% - 40px)",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
          <p style={{color:"#3a3a4e",fontFamily:"sans-serif",fontSize:"13px",margin:0,flex:1,minWidth:"200px"}}>
            Používame cookies nevyhnutné pre fungovanie prihlásenia. Viac info v{" "}
            <span onClick={() => router.push("/privacy")} style={{color:"#a855f7",cursor:"pointer"}}>Podmienkach & GDPR</span>.
          </p>
          <button onClick={acceptCookies} style={{padding:"8px 20px",background:"linear-gradient(135deg,#db2777,#9333ea)",border:"none",borderRadius:"10px",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>
            Rozumiem
          </button>
        </div>
      )}
    </>
  );
}