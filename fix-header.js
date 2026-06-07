const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ProjectBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const original = content;
let fixes = 0;

// Fix 1: padding
if (content.includes('padding: isMobile ? "12px 14px 0" : "14px 20px 0"')) {
  content = content.replace('padding: isMobile ? "12px 14px 0" : "14px 20px 0"', 'padding: isMobile ? "10px 12px 0" : "14px 20px 0"');
  fixes++; console.log('✓ Fix 1: padding');
}

// Fix 2: row gap
if (content.includes('gap: isMobile ? 6 : 10, marginBottom: 10, flexWrap: "nowrap", minWidth: 0')) {
  content = content.replace('gap: isMobile ? 6 : 10, marginBottom: 10, flexWrap: "nowrap", minWidth: 0', 'gap: 8, marginBottom: 8');
  fixes++; console.log('✓ Fix 2: row gap');
}

// Fix 3: font sizes
content = content.replace(/fontSize: isMobile \? 15 : 17, fontWeight: 800, background: headerBg/g, 'fontSize: isMobile ? 14 : 17, fontWeight: 800, background: headerBg');
content = content.replace(/fontSize: isMobile \? 15 : 17, fontWeight: 800, overflow: "hidden"/g, 'fontSize: isMobile ? 14 : 17, fontWeight: 800, overflow: "hidden"');
fixes++; console.log('✓ Fix 3: font sizes');

// Fix 4: subtitle always visible
content = content.replace(
  '{!isMobile && <div style={{ fontSize: 11, color: theme.muted, marginTop: 1, whiteSpace: "nowrap" }}>{tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených</div>}',
  '<div style={{ fontSize: 11, color: theme.muted, marginTop: 1, whiteSpace: "nowrap" }}>{tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených</div>'
);

// Fix 5: remove isMobile subtitle block
const mobileBlock = `
        {isMobile && (
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4, paddingLeft: 2 }}>{tasks.length} úloh · {tasks.filter(t => t.status === "Hotovo").length} dokončených</div>
        )}`;
if (content.includes(mobileBlock)) {
  content = content.replace(mobileBlock, '');
  fixes++; console.log('✓ Fix 5: removed isMobile subtitle block');
}

// Fix 6: old pills row -> new scrollable row
content = content.replace(
  '<div style={{ display: "flex", gap: 6, paddingBottom: 10, overflowX: "auto" }}>',
  '<div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>'
);

// Fix 7: THE BIG ONE - move view toggles + action buttons from row 1 to row 2
// Remove from row 1
const row1ViewBlock = `

          <div style={{ display: "flex", background: headerBg, border: \`1px solid \${theme.border}\`, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
            {([{ id: "table", icon: Icons.table }, { id: "kanban", icon: Icons.kanban }] as { id: View; icon: React.ReactElement }[]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: view === v.id ? grad : "transparent", color: view === v.id ? "#fff" : theme.muted, cursor: "pointer", transition: "all .2s" }}>{v.icon}</button>
            ))}
            <button onClick={() => router.push(\`/calendar?project=\${projectId}\`)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "none", background: "transparent", color: theme.muted, cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = appliedA + "18"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{Icons.calView}</button>
          </div>

          <button onClick={() => setShowActivity(v => !v)} style={{ position: "relative", width: 30, height: 30, borderRadius: 8, background: showActivity ? appliedA + "18" : "transparent", border: \`1px solid \${showActivity ? appliedA + "55" : theme.border}\`, color: showActivity ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>

          <button onClick={() => setShowShare(true)} style={{ display: "flex", alignItems: "center", gap: 5, height: 30, borderRadius: 8, background: members.length > 0 ? appliedA + "18" : "transparent", border: \`1px solid \${members.length > 0 ? appliedA + "55" : theme.border}\`, color: members.length > 0 ? appliedA : theme.muted, cursor: "pointer", padding: "0 8px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-geist-sans)", flexShrink: 0, transition: "all .15s" }}>
            {Icons.share}
          </button>

          <button onClick={() => { setShowAI(true); setAiSummary(""); setAiError(""); }} style={{ display: "flex", alignItems: "center", gap: 5, height: 30, borderRadius: 8, background: showAI ? appliedA + "18" : "transparent", border: \`1px solid \${showAI ? appliedA + "55" : theme.border}\`, color: showAI ? appliedA : theme.muted, cursor: "pointer", padding: "0 8px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-geist-sans)", flexShrink: 0 }}>
            {Icons.ai}
          </button>

          `;

if (content.includes(row1ViewBlock)) {
  content = content.replace(row1ViewBlock, '\n\n          ');
  fixes++; console.log('✓ Fix 7a: removed view toggles from row 1');

  // Add them to row 2
  const row2Marker = '<div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>';
  const row2WithButtons = `<div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
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
          <div style={{ width: 1, height: 20, background: theme.border, flexShrink: 0 }} />`;

  content = content.replace(row2Marker, row2WithButtons);
  fixes++; console.log('✓ Fix 7b: added view toggles to row 2');
} else {
  console.log('✗ Fix 7: view toggle block not found (may already be applied)');
}

if (content !== original) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✅ Done! Applied ${fixes} fixes. File saved.`);
} else {
  console.log('\n⚠ No changes — patterns not found. File unchanged.');
}