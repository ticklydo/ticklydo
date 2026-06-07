// app/utils/exportProject.ts

type Status = "Hotovo" | "V procese" | "Uviaznuté" | "Nezačaté";
type Priority = "Vysoká" | "Stredná" | "Nízka" | "";
type SubTask = { id: string; name: string; done: boolean; status: Status; priority: Priority; dueDate: string; owner: string; notes: string; };
type Comment = { id: string; text: string; author: string; createdAt: number; };
type Task = { id: string; name: string; status: Status; priority: Priority; dueDate: string; owner: string; notes: string; subtasks: SubTask[]; tags?: string[]; comments?: Comment[]; };

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Hotovo":    { bg: "#dcfce7", text: "#16a34a", border: "#16a34a" },
  "V procese": { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  "Uviaznuté": { bg: "#fee2e2", text: "#dc2626", border: "#ef4444" },
  "Nezačaté":  { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" },
};

const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  "Vysoká":  { bg: "#fee2e2", text: "#dc2626" },
  "Stredná": { bg: "#fef3c7", text: "#b45309" },
  "Nízka":   { bg: "#dbeafe", text: "#2563eb" },
  "":        { bg: "transparent", text: "#9ca3af" },
};

function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d + "T00:00:00") < new Date();
}

// ── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export async function exportToExcel(projectName: string, tasks: Task[]) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // ── MAIN SHEET ──
  const wsData: any[][] = [];

  // Header
  wsData.push(["#", "Typ", "Názov úlohy / Podúlohy", "Status", "Priorita", "Termín", "Zodpovedný", "Poznámky", "Tagy", "Komentáre"]);

  let rowNum = 1;
  tasks.forEach((task, ti) => {
    wsData.push([
      ti + 1,
      "Úloha",
      task.name,
      task.status,
      task.priority || "—",
      task.dueDate || "—",
      task.owner || "—",
      task.notes || "",
      (task.tags ?? []).join(", ") || "—",
      (task.comments ?? []).map(c => `${c.author}: ${c.text}`).join(" | ") || "—",
    ]);
    rowNum++;

    task.subtasks.forEach(sub => {
      wsData.push([
        "",
        "  └ Podúloha",
        "      " + sub.name,
        sub.done ? "Hotovo" : sub.status,
        sub.priority || "—",
        sub.dueDate || "—",
        sub.owner || "—",
        sub.notes || "",
        "—",
        "—",
      ]);
      rowNum++;
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 4 }, { wch: 12 }, { wch: 38 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 35 },
  ];

  // Style header row
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: "6366F1" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "4F46E5" } },
      bottom: { style: "thin", color: { rgb: "4F46E5" } },
      left: { style: "thin", color: { rgb: "4F46E5" } },
      right: { style: "thin", color: { rgb: "4F46E5" } },
    }
  };

  const cols = ["A","B","C","D","E","F","G","H","I","J"];
  cols.forEach(col => {
    const cell = ws[col + "1"];
    if (cell) cell.s = headerStyle;
  });

  // Style data rows
  const statusFills: Record<string, string> = {
    "Hotovo": "DCFCE7", "V procese": "FEF3C7", "Uviaznuté": "FEE2E2", "Nezačaté": "F3F4F6",
  };
  const statusTexts: Record<string, string> = {
    "Hotovo": "16A34A", "V procese": "B45309", "Uviaznuté": "DC2626", "Nezačaté": "6B7280",
  };
  const priorityFills: Record<string, string> = {
    "Vysoká": "FEE2E2", "Stredná": "FEF3C7", "Nízka": "DBEAFE",
  };
  const priorityTexts: Record<string, string> = {
    "Vysoká": "DC2626", "Stredná": "B45309", "Nízka": "2563EB",
  };

  for (let r = 2; r <= wsData.length; r++) {
    const rowData = wsData[r - 1];
    const isSubtask = rowData[1]?.toString().includes("Podúloha");
    const status = rowData[3]?.toString() ?? "";
    const priority = rowData[4]?.toString() ?? "";
    const dueDate = rowData[5]?.toString() ?? "";
    const overdue = dueDate !== "—" && isOverdue(dueDate);

    // Row background - alternate
    const rowBg = isSubtask ? "F8F9FF" : (r % 2 === 0 ? "FFFFFF" : "F9FAFB");

    cols.forEach((col, ci) => {
      const addr = col + r;
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      const cell = ws[addr];

      let fillColor = rowBg;
      let fontColor = isSubtask ? "6B7280" : "111827";
      let bold = false;
      let italic = isSubtask;

      if (ci === 3 && statusFills[status]) { // Status column
        fillColor = statusFills[status];
        fontColor = statusTexts[status] ?? fontColor;
        bold = true;
      } else if (ci === 4 && priorityFills[priority]) { // Priority column
        fillColor = priorityFills[priority];
        fontColor = priorityTexts[priority] ?? fontColor;
        bold = true;
      } else if (ci === 5 && overdue) { // Due date overdue
        fillColor = "FEE2E2";
        fontColor = "DC2626";
        bold = true;
      }

      cell.s = {
        font: { bold, italic, color: { rgb: fontColor }, sz: isSubtask ? 9 : 10 },
        fill: { patternType: "solid", fgColor: { rgb: fillColor } },
        alignment: { vertical: "center", wrapText: ci === 2 },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } },
        }
      };
    });
  }

  // Row heights
  ws["!rows"] = [{ hpt: 22 }]; // header height
  for (let r = 2; r <= wsData.length; r++) {
    (ws["!rows"] as any[]).push({ hpt: 18 });
  }

  XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));

  // ── SUMMARY SHEET ──
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const summaryData = [
    ["Súhrn projektu", projectName],
    ["Dátum exportu", new Date().toLocaleDateString("sk-SK")],
    ["", ""],
    ["Celkom úloh", tasks.length],
    ["✅ Hotovo", done],
    ["🔄 V procese", tasks.filter(t => t.status === "V procese").length],
    ["🔴 Uviaznuté", tasks.filter(t => t.status === "Uviaznuté").length],
    ["⬜ Nezačaté", tasks.filter(t => t.status === "Nezačaté").length],
    ["", ""],
    ["Celkom podúloh", tasks.reduce((a, t) => a + t.subtasks.length, 0)],
    ["Vysoká priorita", tasks.filter(t => t.priority === "Vysoká").length],
    ["Dokončených %", tasks.length > 0 ? Math.round((done / tasks.length) * 100) + "%" : "0%"],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 30 }];

  // Style summary header
  if (wsSummary["A1"]) wsSummary["A1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  if (wsSummary["B1"]) wsSummary["B1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };

  XLSX.utils.book_append_sheet(wb, wsSummary, "Súhrn");

  XLSX.writeFile(wb, `${projectName}-export.xlsx`);
}

// ── PDF EXPORT (HTML print) ───────────────────────────────────────────────────
export function exportToPDF(projectName: string, tasks: Task[]) {
  const today = new Date().toLocaleDateString("sk-SK");
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const inProgress = tasks.filter(t => t.status === "V procese").length;
  const stuck = tasks.filter(t => t.status === "Uviaznuté").length;
  const notStarted = tasks.filter(t => t.status === "Nezačaté").length;

  const badge = (text: string, bg: string, color: string) =>
    `<span style="background:${bg};color:${color};border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">${text}</span>`;

  const taskRows = tasks.map((task, ti) => {
    const sc = STATUS_COLOR[task.status] ?? STATUS_COLOR["Nezačaté"];
    const pc = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR[""];
    const overdue = isOverdue(task.dueDate);
    const dueBg = overdue ? "#fee2e2" : "transparent";
    const dueColor = overdue ? "#dc2626" : "#374151";

    const subtaskRows = task.subtasks.map(sub => {
      const ssc = STATUS_COLOR[sub.done ? "Hotovo" : sub.status] ?? STATUS_COLOR["Nezačaté"];
      const spc = PRIORITY_COLOR[sub.priority] ?? PRIORITY_COLOR[""];
      const sOverdue = isOverdue(sub.dueDate);
      return `<tr style="background:#f8f9ff">
        <td style="padding:5px 10px;color:#6b7280;font-size:11px">↳</td>
        <td style="padding:5px 8px;font-size:12px;color:#374151;padding-left:24px">${sub.name}${sub.done ? ' <span style="color:#16a34a;font-size:10px">✓</span>' : ""}</td>
        <td style="padding:5px 8px;text-align:center">${badge(sub.done ? "Hotovo" : sub.status, ssc.bg, ssc.text)}</td>
        <td style="padding:5px 8px;text-align:center">${sub.priority ? badge(sub.priority, spc.bg, spc.text) : "—"}</td>
        <td style="padding:5px 8px;text-align:center;background:${sOverdue ? "#fee2e2" : "transparent"};color:${sOverdue ? "#dc2626" : "#374151"};font-size:12px">${sub.dueDate || "—"}</td>
        <td style="padding:5px 8px;font-size:12px;color:#6b7280">${sub.owner || "—"}</td>
        <td style="padding:5px 8px;font-size:11px;color:#6b7280">${sub.notes || "—"}</td>
      </tr>`;
    }).join("");

    const rowBg = ti % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `<tr style="background:${rowBg};border-left:3px solid ${sc.border}">
      <td style="padding:8px 10px;font-weight:700;color:#6b7280;font-size:12px">${ti + 1}</td>
      <td style="padding:8px;font-weight:700;font-size:13px;color:#111827">${task.name}${(task.tags ?? []).length > 0 ? `<br><span style="font-size:10px;color:#6366f1;font-weight:400">#${task.tags!.join(" #")}</span>` : ""}</td>
      <td style="padding:8px;text-align:center">${badge(task.status, sc.bg, sc.text)}</td>
      <td style="padding:8px;text-align:center">${task.priority ? badge(task.priority, pc.bg, pc.text) : "—"}</td>
      <td style="padding:8px;text-align:center;background:${dueBg};color:${dueColor};font-weight:${overdue ? "700" : "400"};font-size:12px">${task.dueDate || "—"}${overdue ? " ⚠" : ""}</td>
      <td style="padding:8px;font-size:12px;color:#374151">${task.owner || "—"}</td>
      <td style="padding:8px;font-size:11px;color:#6b7280">${task.notes || "—"}</td>
    </tr>
    ${subtaskRows}`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<title>${projectName} — Export</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111827; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px 28px; border-radius: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 22px; font-weight: 900; }
  .header p { font-size: 12px; opacity: 0.8; margin-top: 3px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .stat { border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 2px; }
  .stat .val { font-size: 22px; font-weight: 900; }
  .stat .lbl { font-size: 11px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
  thead th { padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  tbody tr { border-bottom: 1px solid #e5e7eb; }
  tbody tr:hover { filter: brightness(0.97); }
  .footer { margin-top: 16px; text-align: center; font-size: 10px; color: #9ca3af; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${projectName}</h1>
    <p>Export: ${today} · ${tasks.length} úloh · ${done} dokončených</p>
  </div>
  <div style="text-align:right;font-size:13px;opacity:0.9">
    Ticklydo Project Export
  </div>
</div>

<div class="stats">
  <div class="stat" style="background:#dcfce7">
    <div class="val" style="color:#16a34a">${done}</div>
    <div class="lbl" style="color:#16a34a">✅ Hotovo</div>
  </div>
  <div class="stat" style="background:#fef3c7">
    <div class="val" style="color:#b45309">${inProgress}</div>
    <div class="lbl" style="color:#b45309">🔄 V procese</div>
  </div>
  <div class="stat" style="background:#fee2e2">
    <div class="val" style="color:#dc2626">${stuck}</div>
    <div class="lbl" style="color:#dc2626">🔴 Uviaznuté</div>
  </div>
  <div class="stat" style="background:#f3f4f6">
    <div class="val" style="color:#6b7280">${notStarted}</div>
    <div class="lbl" style="color:#6b7280">⬜ Nezačaté</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px">#</th>
      <th style="width:28%">Úloha / Podúloha</th>
      <th style="width:100px">Status</th>
      <th style="width:90px">Priorita</th>
      <th style="width:100px">Termín</th>
      <th style="width:110px">Zodpovedný</th>
      <th>Poznámky</th>
    </tr>
  </thead>
  <tbody>
    ${taskRows}
  </tbody>
</table>

<div class="footer">
  ${projectName} · Ticklydo export · ${today}
</div>

<button class="print-btn no-print" onclick="window.print()">🖨 Uložiť ako PDF</button>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}