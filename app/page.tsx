"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/home");
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --pink: #d94fbf;
          --blue: #4f8ef7;
          --teal: #3ee8c4;
          --purple: #a066ff;
          --bg: #09090f;
          --surface: #111119;
          --surface2: #18181f;
          --border: rgba(255,255,255,0.07);
          --text: #f0eeff;
          --muted: rgba(240,238,255,0.5);
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
          padding: 1.5rem 2rem;
          background: rgba(9,9,15,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }

        .nav-logo {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(90deg, var(--pink), var(--blue), var(--teal));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-decoration: none;
        }

        .nav-cta {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1.2rem;
          border-radius: 50px;
          background: linear-gradient(135deg, var(--pink), var(--purple));
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
          white-space: nowrap;
          cursor: pointer;
        }
        .nav-cta:hover { opacity: 0.85; transform: scale(1.03); }

        .hero {
          position: relative;
          min-height: 100vh;
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
          background: radial-gradient(circle, rgba(160,102,255,0.15) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -60%);
          pointer-events: none;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 1rem;
          border-radius: 50px;
          border: 1px solid rgba(160,102,255,0.3);
          background: rgba(160,102,255,0.1);
          font-size: 0.78rem;
          color: #c9a8ff;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s ease both;
        }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--teal);
          display: inline-block;
          animation: pulse 2s infinite;
        }

        .hero h1 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(2.2rem, 7vw, 5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          max-width: 500px;
          animation: fadeUp 0.6s 0.1s ease both;
        }

        .gradient-text {
          background: linear-gradient(90deg, var(--pink) 0%, var(--purple) 40%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-sub {
          margin-top: 1.2rem;
          font-size: clamp(0.95rem, 2.5vw, 1.15rem);
          color: var(--muted);
          max-width: 520px;
          line-height: 1.7;
          animation: fadeUp 0.6s 0.2s ease both;
        }

        .hero-actions {
          display: flex;
          gap: 0.8rem;
          margin-top: 2rem;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp 0.6s 0.3s ease both;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.8rem 1.8rem;
          border-radius: 50px;
          background: linear-gradient(135deg, var(--pink), var(--purple));
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 0 30px rgba(160,102,255,0.25);
        }
        .btn-primary:hover { opacity: 0.85; transform: translateY(-2px); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.8rem 1.8rem;
          border-radius: 50px;
          border: 1px solid var(--border);
          color: var(--muted);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          background: none;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.25); color: var(--text); }

        .hero-preview {
          margin-top: 3rem;
          width: 100%;
          max-width: 860px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--surface);
          overflow: hidden;
          animation: fadeUp 0.8s 0.4s ease both;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .preview-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0.8rem 1.2rem;
          background: var(--surface2);
          border-bottom: 1px solid var(--border);
        }
        .preview-dot { width: 10px; height: 10px; border-radius: 50%; }
        .preview-dot-r { background: #ff5f57; }
        .preview-dot-y { background: #febc2e; }
        .preview-dot-g { background: #28c840; }

        .preview-content {
          padding: 1.2rem;
          display: grid;
          grid-template-columns: 190px 1fr;
          gap: 1rem;
        }

        .preview-sidebar {
          border-right: 1px solid var(--border);
          padding-right: 1rem;
        }

        .preview-sidebar-label {
          font-size: 0.67rem;
          color: var(--muted);
          margin-bottom: 0.6rem;
          padding-left: 0.4rem;
        }

        .preview-sidebar-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border-radius: 7px;
          font-size: 0.8rem;
          color: var(--muted);
          margin-bottom: 2px;
        }
        .preview-sidebar-item.active { background: rgba(160,102,255,0.12); color: #c9a8ff; }

        .preview-divider {
          height: 1px;
          background: var(--border);
          margin: 0.6rem 0.4rem;
        }

        .preview-main { padding-left: 0.2rem; }

        .preview-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.8rem;
        }

        .preview-task {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.65rem;
          border-radius: 8px;
          background: var(--surface2);
          margin-bottom: 0.4rem;
          font-size: 0.79rem;
          border: 1px solid var(--border);
        }

        .task-check {
          width: 15px; height: 15px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px;
          color: #fff;
        }
        .task-check-done { background: linear-gradient(135deg, var(--pink), var(--purple)); }
        .task-check-pink { border: 1.5px solid var(--pink); }
        .task-check-blue { border: 1.5px solid var(--blue); }
        .task-check-todo { border: 1.5px solid rgba(255,255,255,0.2); }

        .task-label { flex: 1; }
        .task-label-done { text-decoration: line-through; color: var(--muted); }

        .task-tag {
          font-size: 0.67rem;
          padding: 0.1rem 0.4rem;
          border-radius: 50px;
          font-weight: 500;
          white-space: nowrap;
        }
        .tag-pink { background: rgba(217,79,191,0.15); color: #e88de0; }
        .tag-blue { background: rgba(79,142,247,0.15); color: #87b7ff; }
        .tag-teal { background: rgba(62,232,196,0.12); color: #7af0db; }
        .tag-muted { background: rgba(255,255,255,0.05); color: var(--muted); }

        .cal-section {
          margin-top: 0.8rem;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border);
        }
        .cal-label { font-size: 0.67rem; color: var(--muted); margin-bottom: 0.3rem; }
        .cal-mini {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
          margin-top: 0.3rem;
        }
        .cal-day {
          aspect-ratio: 1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          color: var(--muted);
          background: rgba(255,255,255,0.03);
        }
        .cal-day-task { background: rgba(160,102,255,0.18); color: #c9a8ff; }
        .cal-day-today { background: linear-gradient(135deg, var(--pink), var(--purple)); color: #fff; font-weight: 700; }

        .features-section {
          padding: 5rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .section-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--purple);
          margin-bottom: 0.7rem;
        }

        .section-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800;
          line-height: 1.15;
          max-width: 560px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.2rem;
          margin-top: 2.5rem;
        }

        .feature-card {
          padding: 1.6rem;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--surface);
          transition: border-color 0.3s, transform 0.3s;
        }
        .feature-card:hover { border-color: rgba(160,102,255,0.3); transform: translateY(-4px); }

        .feature-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }
        .icon-purple { background: rgba(160,102,255,0.15); }
        .icon-pink { background: rgba(217,79,191,0.15); }
        .icon-blue { background: rgba(79,142,247,0.15); }
        .icon-teal { background: rgba(62,232,196,0.12); }

        .feature-card h3 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .feature-card p { font-size: 0.88rem; color: var(--muted); line-height: 1.7; }

        .cta-section {
          position: relative;
          padding: 5rem 1.5rem;
          text-align: center;
          overflow: hidden;
        }
        .cta-glow {
          position: absolute;
          width: min(600px, 100vw);
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(217,79,191,0.15) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .cta-inner {
          position: relative;
          max-width: 560px;
          margin: 0 auto;
        }
        .cta-inner h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .cta-inner p { color: var(--muted); font-size: 1rem; margin-bottom: 2rem; }

        .landing-footer {
          border-top: 1px solid var(--border);
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.82rem;
          color: var(--muted);
        }
        .footer-logo {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          background: linear-gradient(90deg, var(--pink), var(--blue));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (max-width: 768px) {
          .preview-content { grid-template-columns: 160px 1fr; }
        }

        @media (max-width: 600px) {
          .landing-nav { padding: 0.9rem 1.2rem; }
          .hero { padding: 6rem 1.2rem 3rem; }
          .hero-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 300px; }
          .preview-content { grid-template-columns: 1fr; }
          .preview-sidebar { display: none; }
          .preview-main { padding-left: 0; }
          .features-grid { grid-template-columns: 1fr; }
          .landing-footer { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="landing-nav">
        <img src="/LOGO.png" alt="TicklyDo" style={{height: "80px"}} />
        <button className="nav-cta" onClick={() => router.push("/login")}>
          Prihlásiť sa →
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Organizuj nápady<br />
          <span className="gradient-text">po svojom.</span>
        </h1>
        <p className="hero-sub">
          Tasky, kalendár a nápady na jednom mieste. Žiadny chaos, len čistý flow.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => router.push("/register")}>
            ✦ Vyskúšaj zadarmo
          </button>
          <button className="btn-secondary" onClick={() => router.push("/login")}>
            Prihlásiť sa
          </button>
        </div>

        {/* PREVIEW */}
        <div className="hero-preview">
          <div className="preview-bar">
            <div className="preview-dot preview-dot-r" />
            <div className="preview-dot preview-dot-y" />
            <div className="preview-dot preview-dot-g" />
          </div>
          <div className="preview-content">
            <div className="preview-sidebar">
              <div className="preview-sidebar-label">WORKSPACE</div>
              <div className="preview-sidebar-item active">📋 Moje tasky</div>
              <div className="preview-sidebar-item">📅 Kalendár</div>
              <div className="preview-sidebar-item">💡 Nápady</div>
              <div className="preview-divider" />
              <div className="preview-sidebar-item">＋ Nový projekt</div>
            </div>
            <div className="preview-main">
              <div className="preview-title">Moje tasky</div>
              <div className="preview-task">
                <div className="task-check task-check-done">✓</div>
                <span className="task-label task-label-done">Wireframe úvodnej stránky</span>
                <span className="task-tag tag-teal">Hotovo</span>
              </div>
              <div className="preview-task">
                <div className="task-check task-check-pink" />
                <span className="task-label">Napojiť Vercel na doménu</span>
                <span className="task-tag tag-pink">Dnes</span>
              </div>
              <div className="preview-task">
                <div className="task-check task-check-blue" />
                <span className="task-label">Dizajn landing page</span>
                <span className="task-tag tag-blue">Zajtra</span>
              </div>
              <div className="preview-task">
                <div className="task-check task-check-todo" />
                <span className="task-label">Monetizácia — preskúmať</span>
                <span className="task-tag tag-muted">Neskôr</span>
              </div>
              <div className="cal-section">
                <div className="cal-label">Máj 2026</div>
                <div className="cal-mini">
                  {["P","U","S","Š","P","S","N"].map(d => <div key={d} className="cal-day">{d}</div>)}
                  {["","","","1","2","3","4"].map((d,i) => <div key={i} className={`cal-day ${d==="3"?"cal-day-task":""}`}>{d}</div>)}
                  {["5","6","7","8","9","10","11"].map(d => <div key={d} className={`cal-day ${d==="6"||d==="8"?"cal-day-task":""}`}>{d}</div>)}
                  {["12","13","14","15"].map(d => <div key={d} className={`cal-day ${d==="12"?"cal-day-today":d==="14"?"cal-day-task":""}`}>{d}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <img src="/LOGO.png" alt="TicklyDo" style={{height: "80px"}} />
        <h2 className="section-title">Všetko čo potrebuješ,<br />nič čo nepotrebuješ.</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-purple">✦</div>
            <h3>Inteligentné tasky</h3>
            <p>Vytvár, organizuj a sleduj úlohy s prioritami, tagmi a termínmi. Prehľadne a rýchlo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-pink">📅</div>
            <h3>Kalendár na dosah</h3>
            <p>Tvoje tasky sa premietajú do kalendára. Vidíš čo ťa čaká dnes, zajtra, tento týždeň.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-blue">⚡</div>
            <h3>Rýchly capture</h3>
            <p>Nápad ti príde kedykoľvek. Zachyť ho za sekundu a roztriedi neskôr. Žiadna myšlienka sa nestratí.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-teal">◈</div>
            <h3>Vizuálny prehľad</h3>
            <p>Board, zoznam alebo kalendárne zobrazenie — vyber si ako chceš vidieť svoju prácu.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="cta-inner">
          <h2>Začni organizovať<br /><span className="gradient-text">dnes, nie zajtra.</span></h2>
          <p>Registrácia je zadarmo. Žiadna kreditná karta.</p>
          <button className="btn-primary" onClick={() => router.push("/register")}>
            ✦ Vyskúšaj TicklyDo
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <img src="/LOGO.png" alt="TicklyDo" style={{height: "80px"}} />
        <span>© 2026 TicklyDo. Všetky práva vyhradené.</span>
      </footer>
    </>
  );
}