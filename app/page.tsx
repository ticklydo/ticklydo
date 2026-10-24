"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

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
    <div style={{minHeight:"100vh",background:"#09090f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src="/IKONA.png" alt="loading" style={{width:"120px",animation:"bounce 0.8s infinite alternate"}} />
      <style>{`@keyframes bounce { from { transform: translateY(0px) rotate(-5deg); } to { transform: translateY(-30px) rotate(5deg); } }`}</style>
    </div>
  );

  const features = [
    {
      icon: "✦",
      tone: "purple",
      title: "Projekty a úlohy",
      text: "Tabuľa s úlohami, prioritami a termínmi. Pozvi ostatných a pracujte na projekte spolu. Pripomienky termínov ti prídu e-mailom aj v aplikácii.",
    },
    {
      icon: "📝",
      tone: "pink",
      title: "Poznámky",
      text: "Píš text, vkladaj fotky priamo doň a pridávaj zoznamy s políčkami. Poznámku zdieľaj odkazom alebo ju prepoj s projektom.",
    },
    {
      icon: "📅",
      tone: "blue",
      title: "Týždenný plán",
      text: "Celý týždeň na jednom prehľade. Vidíš, čo ťa čaká každý deň, a nič ti neunikne.",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --pink: #d94fbf;
          --blue: #4f8ef7;
          --purple: #a066ff;
          --bg: #09090f;
          --surface: #111119;
          --border: rgba(255,255,255,0.07);
          --text: #f0eeff;
          --muted: rgba(240,238,255,0.6);
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .landing-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 0.9rem 2rem;
          background: rgba(9,9,15,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-actions { display: flex; align-items: center; gap: 0.6rem; }

        .btn-primary, .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s, transform 0.2s, border-color 0.2s, color 0.2s;
        }
        .btn-primary {
          padding: 0.85rem 2rem;
          font-size: 1rem;
          border: none;
          color: #fff;
          background: linear-gradient(135deg, var(--pink), var(--purple));
          box-shadow: 0 0 30px rgba(160,102,255,0.25);
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-2px); }
        .btn-secondary {
          padding: 0.85rem 2rem;
          font-size: 1rem;
          background: none;
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.18);
        }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.4); }
        .btn-small { padding: 0.5rem 1.1rem; font-size: 0.85rem; box-shadow: none; }

        .hero {
          position: relative;
          min-height: 88vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 7rem 1.5rem 4rem;
          overflow: hidden;
        }
        .hero-glow {
          position: absolute;
          width: min(700px, 100vw);
          height: min(700px, 100vw);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(160,102,255,0.16) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -55%);
          pointer-events: none;
        }
        .hero h1 {
          position: relative;
          font-size: clamp(2.4rem, 7vw, 4.6rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          max-width: 760px;
          animation: fadeUp 0.6s 0.1s ease both;
        }
        .gradient-text {
          background: linear-gradient(90deg, var(--pink) 0%, var(--purple) 45%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          position: relative;
          margin-top: 1.3rem;
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          color: var(--muted);
          max-width: 540px;
          line-height: 1.7;
          animation: fadeUp 0.6s 0.2s ease both;
        }
        .hero-actions {
          position: relative;
          display: flex;
          gap: 0.8rem;
          margin-top: 2.2rem;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.6s 0.3s ease both;
        }

        .features-section {
          padding: 3rem 1.5rem 5rem;
          max-width: 1050px;
          margin: 0 auto;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.2rem;
        }
        .feature-card {
          padding: 1.8rem;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--surface);
          transition: border-color 0.3s, transform 0.3s;
        }
        .feature-card:hover { border-color: rgba(160,102,255,0.3); transform: translateY(-4px); }
        .feature-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          margin-bottom: 1.1rem;
        }
        .icon-purple { background: rgba(160,102,255,0.15); }
        .icon-pink { background: rgba(217,79,191,0.15); }
        .icon-blue { background: rgba(79,142,247,0.15); }
        .feature-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.55rem; }
        .feature-card p { font-size: 0.92rem; color: var(--muted); line-height: 1.7; }

        .cta-section {
          position: relative;
          padding: 4rem 1.5rem 5rem;
          text-align: center;
          overflow: hidden;
        }
        .cta-glow {
          position: absolute;
          width: min(600px, 100vw);
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(217,79,191,0.14) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .cta-inner { position: relative; max-width: 560px; margin: 0 auto; }
        .cta-inner h2 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; line-height: 1.2; margin-bottom: 0.9rem; }
        .cta-inner p { color: var(--muted); font-size: 1rem; margin-bottom: 1.8rem; }

        .landing-footer {
          border-top: 1px solid var(--border);
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.6rem 1.5rem;
          font-size: 0.82rem;
          color: var(--muted);
        }
        .footer-links { display: flex; gap: 1.2rem; flex-wrap: wrap; justify-content: center; }
        .footer-links span, .footer-links a {
          cursor: pointer;
          color: var(--muted);
          font-size: 0.82rem;
          text-decoration: none;
        }
        .footer-links span:hover, .footer-links a:hover { color: var(--text); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .landing-nav { padding: 0.7rem 1rem; }
          .hero { padding: 6.5rem 1.2rem 3rem; min-height: 80vh; }
          .hero-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 300px; }
          .landing-footer { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="landing-nav">
        <img src="/LOGO.png" alt="TicklyDo" style={{height:"44px"}} />
        <div className="nav-actions">
          <button className="btn-secondary btn-small" onClick={() => router.push("/login")}>
            Prihlásiť sa
          </button>
          <button className="btn-primary btn-small" onClick={() => router.push("/register")}>
            Registrovať sa
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Organizuj nápady<br />
          <span className="gradient-text">po svojom.</span>
        </h1>
        <p className="hero-sub">
          Projekty, poznámky a týždenný plán na jednom mieste. Žiadny chaos, len čistý flow.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => router.push("/register")}>
            Začať zadarmo
          </button>
          <button className="btn-secondary" onClick={() => router.push("/login")}>
            Prihlásiť sa
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card" key={f.title}>
              <div className={`feature-icon icon-${f.tone}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="cta-inner">
          <h2>Začni organizovať<br /><span className="gradient-text">dnes, nie zajtra.</span></h2>
          <p>Registrácia je zadarmo. Žiadna kreditná karta.</p>
          <button className="btn-primary" onClick={() => router.push("/register")}>
            Vytvoriť účet
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <span>© 2026 TicklyDo. Všetky práva vyhradené.</span>
        <div className="footer-links">
          <span onClick={() => router.push("/privacy")}>Podmienky & GDPR</span>
          <span onClick={() => router.push("/terms")}>Podmienky používania</span>
          <a href="mailto:support@ticklydo.com">support@ticklydo.com</a>
        </div>
      </footer>

      {/* COOKIE BANNER */}
      {cookieBanner && (
        <div style={{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#13131f",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",padding:"16px 24px",display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap",justifyContent:"center",maxWidth:"600px",width:"calc(100% - 40px)",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
          <p style={{color:"rgba(200,190,255,0.8)",fontFamily:"sans-serif",fontSize:"13px",margin:0,flex:1,minWidth:"200px"}}>
            Používame cookies nevyhnutné pre fungovanie prihlásenia. Viac info v{" "}
            <span onClick={() => router.push("/privacy")} style={{color:"#c084fc",cursor:"pointer"}}>Podmienkach & GDPR</span>.
          </p>
          <button onClick={acceptCookies} style={{padding:"8px 20px",background:"linear-gradient(135deg,#db2777,#9333ea)",border:"none",borderRadius:"50px",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>
            Rozumiem
          </button>
        </div>
      )}
    </>
  );
}