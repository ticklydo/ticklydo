const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ProjectBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add import
const importOld = `import { getAuth } from "firebase/auth";`;
const importNew = `import { getAuth } from "firebase/auth";
// @ts-ignore
import { exportToExcel, exportToPDF } from "../utils/exportProject";`;

if (!content.includes('exportToExcel')) {
  content = content.replace(importOld, importNew);
  console.log('✓ Import pridaný');
} else {
  console.log('- Import už existuje');
}

// Fix 2: Add useState
const stateOld = `const [copySuccess, setCopySuccess] = useState(false);`;
const stateNew = `const [copySuccess, setCopySuccess] = useState(false);
  const [showExport, setShowExport] = useState(false);`;

if (!content.includes('showExport')) {
  content = content.replace(stateOld, stateNew);
  console.log('✓ useState pridaný');
} else {
  console.log('- useState už existuje');
}

// Fix 3: Add export button after AI button in header
const aiButtonOld = `          <button onClick={() => { setShowAI(true); setAiSummary(""); setAiError(""); }} style={{ width: 30, height: 30, borderRadius: 8, background: showAI ? appliedA + "18" : "transparent", border: \`1px solid \${showAI ? appliedA + "55" : theme.border}\`, color: showAI ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Icons.ai}
          </button>`;

const aiButtonNew = `          <button onClick={() => { setShowAI(true); setAiSummary(""); setAiError(""); }} style={{ width: 30, height: 30, borderRadius: 8, background: showAI ? appliedA + "18" : "transparent", border: \`1px solid \${showAI ? appliedA + "55" : theme.border}\`, color: showAI ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Icons.ai}
          </button>
          <button onClick={() => setShowExport(v => !v)} title="Export" style={{ width: 30, height: 30, borderRadius: 8, background: showExport ? appliedA + "18" : "transparent", border: \`1px solid \${showExport ? appliedA + "55" : theme.border}\`, color: showExport ? appliedA : theme.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>`;

if (!content.includes('setShowExport(v => !v)')) {
  content = content.replace(aiButtonOld, aiButtonNew);
  console.log('✓ Export button pridaný do headera');
} else {
  console.log('- Export button už existuje');
}

// Fix 4: Add export modal before AI modal
const aiModalMarker = `      {/* ── AI MODAL ── */}`;
const exportModal = `      {/* ── EXPORT DROPDOWN ── */}
      {showExport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setShowExport(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: isMobile ? "auto" : 110, bottom: isMobile ? 80 : "auto", right: isMobile ? 12 : 20, background: surface, border: \`1px solid \${theme.border}\`, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: 8, minWidth: 190, animation: "fadeIn .15s ease", zIndex: 201 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.7px", padding: "6px 10px 4px" }}>Exportovať projekt</div>
            <button
              onClick={async () => { setShowExport(false); const { exportToExcel } = await import("../utils/exportProject"); await exportToExcel(projectName, tasks); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: theme.text, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-geist-sans)", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = headerBg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#16a34a18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div>Excel (.xlsx)</div>
                <div style={{ fontSize: 10, color: theme.muted, fontWeight: 400 }}>Úlohy + podúlohy + komentáre</div>
              </div>
            </button>
            <button
              onClick={async () => { setShowExport(false); const { exportToPDF } = await import("../utils/exportProject"); await exportToPDF(projectName, tasks); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: theme.text, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-geist-sans)", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = headerBg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#dc262618", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div>PDF</div>
                <div style={{ fontSize: 10, color: theme.muted, fontWeight: 400 }}>Formátovaný report</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── AI MODAL ── */}`;

if (!content.includes('EXPORT DROPDOWN')) {
  content = content.replace(aiModalMarker, exportModal);
  console.log('✓ Export modal pridaný');
} else {
  console.log('- Export modal už existuje');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Hotovo! Teraz: git add . && git commit -m "feat: export Excel/PDF" && git push');