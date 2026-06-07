const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'ProjectBoard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { exportToExcel, exportToPDF } from "../utils/exportProject";',
  'import { exportToExcel } from "../utils/exportProject";'
);

// Also remove PDF button from export dropdown
content = content.replace(
  `            <button
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
            </button>`,
  ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Hotovo!');