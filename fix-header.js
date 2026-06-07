const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ProjectBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the entire HEADER section and replace it
const headerStart = '      {/* ── HEADER ── */}';
const headerEnd = '      <div style={{ padding: isMobile ? "12px 14px 60px" : "16px 20px 60px"';

const startIdx = content.indexOf(headerStart);
const endIdx = content.indexOf(headerEnd);

if (startIdx === -1 || endIdx === -1) {
  console.log('✗ Could not find header section');
  console.log('headerStart found:', startIdx !== -1);
  console.log('headerEnd found:', endIdx !== -1);
  process.exit(1);
}

const newHeader = `      {/* ── HEADER ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: surface, borderBottom: \`1px solid \${theme.border}\`, padding: isMobile ? "10px 12px 0" : "14px 20px 0" }}>

        {/* Riadok 1: Späť + Názov projektu */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={() => router.push("/home")} style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: \`1px solid \${theme.border}\`, color: theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icons.back}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input ref={nameInputRef} defaultValue={projectName}
                onBlur={e => saveName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(e.currentTarget.value); if (e.key === "Escape") setEditingName(false); }}
                style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, background: headerBg, border: \`1.5px solid \${appliedA}\`, borderRadius: 8, padding: "3px 10px", color: theme.text, fontFamily: "var(--font-geist-sans)", outline: "none", width: "100%" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setEditingName(true)}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</div>
                <span style={{ color: theme.muted, flexShrink: 0, opacity: 0.5 }}>{Icons.pencil}</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených</div>
          </div>
        </div>

        {/* Riadok 2: View prepínače + Akcie + Pridať */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", background: headerBg, border: \`1px solid \${theme.border}\`, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
            {([{ id: "table", icon: Icons.table }, { id: "kanban", icon: Icons.kanban }] as { id: View; icon: React.ReactElement }[]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: view === v.id ? grad : "transparent", color: view === v.id ? "#fff" : theme.muted, cursor: "pointer", transition: "all .2s" }}>{v.icon}</button>
            ))}
            <button onClick={() => router.push(\`/calendar?project=\${projectId}\`)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: "transparent", color: theme.muted, cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = appliedA + "18"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{Icons.calView}</button>
          </div>
          <button onClick={() => setShowActivity(v => !v)} style={{ width: 30, height: 30, borderRadius: 8, background: showActivity ? appliedA + "18" : "transparent", border: \`1px solid \${showActivity ? appliedA + "55" : theme.border}\`, color: showActivity ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button onClick={() => setShowShare(true)} style={{ width: 30, height: 30, borderRadius: 8, background: members.length > 0 ? appliedA + "18" : "transparent", border: \`1px solid \${members.length > 0 ? appliedA + "55" : theme.border}\`, color: members.length > 0 ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Icons.share}
          </button>
          <button onClick={() => { setShowAI(true); setAiSummary(""); setAiError(""); }} style={{ width: 30, height: 30, borderRadius: 8, background: showAI ? appliedA + "18" : "transparent", border: \`1px solid \${showAI ? appliedA + "55" : theme.border}\`, color: showAI ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Icons.ai}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setAddingTask(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: grad, border: "none", borderRadius: 9, padding: isMobile ? "7px 10px" : "7px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", boxShadow: \`0 4px 12px \${appliedA}44\`, flexShrink: 0 }}>{Icons.plus}{!isMobile && <span> Nová úloha</span>}</button>
        </div>

        {/* Riadok 3: Status pills */}
        <div style={{ display: "flex", gap: 6, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = tasks.filter(t => t.status === s).length;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, background: darkMode ? cfg.bg + "18" : cfg.bg, border: \`1px solid \${cfg.color}28\`, borderRadius: 7, padding: "4px 9px", flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: cfg.color }}>{isMobile ? s.slice(0, 3) : s}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, background: cfg.color + "20", borderRadius: 10, padding: "0 5px" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      `;

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);
content = before + newHeader + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Header opravený — 3 riadky!');