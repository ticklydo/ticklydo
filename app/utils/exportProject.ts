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
  "Nezacate":  { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" },
};

const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  "Vysoka":  { bg: "#fee2e2", text: "#dc2626" },
  "Stredna": { bg: "#fef3c7", text: "#b45309" },
  "Nizka":   { bg: "#dbeafe", text: "#2563eb" },
  "":        { bg: "transparent", text: "#9ca3af" },
};

function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d + "T00:00:00") < new Date();
}

// Remove diacritics for jsPDF (which doesn't support them natively)
function clean(s: string): string {
  return s
    .replace(/á/g, "a").replace(/Á/g, "A")
    .replace(/ä/g, "a").replace(/Ä/g, "A")
    .replace(/č/g, "c").replace(/Č/g, "C")
    .replace(/ď/g, "d").replace(/Ď/g, "D")
    .replace(/é/g, "e").replace(/É/g, "E")
    .replace(/í/g, "i").replace(/Í/g, "I")
    .replace(/ľ/g, "l").replace(/Ľ/g, "L")
    .replace(/ĺ/g, "l").replace(/Ĺ/g, "L")
    .replace(/ň/g, "n").replace(/Ň/g, "N")
    .replace(/ó/g, "o").replace(/Ó/g, "O")
    .replace(/ô/g, "o").replace(/Ô/g, "O")
    .replace(/ŕ/g, "r").replace(/Ŕ/g, "R")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/ť/g, "t").replace(/Ť/g, "T")
    .replace(/ú/g, "u").replace(/Ú/g, "U")
    .replace(/ý/g, "y").replace(/Ý/g, "Y")
    .replace(/ž/g, "z").replace(/Ž/g, "Z");
}

// ── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export async function exportToExcel(projectName: string, tasks: Task[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  wsData.push(["#", "Typ", "Nazov ulohy / Podulohy", "Status", "Priorita", "Termin", "Zodpovedny", "Poznamky", "Tagy", "Komentare"]);

  tasks.forEach((task, ti) => {
    wsData.push([
      ti + 1, "Uloha", task.name, task.status, task.priority || "—",
      task.dueDate || "—", task.owner || "—", task.notes || "",
      (task.tags ?? []).join(", ") || "—",
      (task.comments ?? []).map(c => `${c.author}: ${c.text}`).join(" | ") || "—",
    ]);
    task.subtasks.forEach(sub => {
      wsData.push([
        "", "  Poduloha", "      " + sub.name,
        sub.done ? "Hotovo" : sub.status, sub.priority || "—",
        sub.dueDate || "—", sub.owner || "—", sub.notes || "", "—", "—",
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 4 }, { wch: 10 }, { wch: 38 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 35 },
  ];

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: "6366F1" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: { style: "thin", color: { rgb: "4F46E5" } }, bottom: { style: "thin", color: { rgb: "4F46E5" } }, left: { style: "thin", color: { rgb: "4F46E5" } }, right: { style: "thin", color: { rgb: "4F46E5" } } }
  };

  const cols = ["A","B","C","D","E","F","G","H","I","J"];
  cols.forEach(col => { const cell = ws[col + "1"]; if (cell) cell.s = headerStyle; });

  const statusFills: Record<string, string> = { "Hotovo": "DCFCE7", "V procese": "FEF3C7", "Uviaznuté": "FEE2E2", "Nezačaté": "F3F4F6" };
  const statusTexts: Record<string, string> = { "Hotovo": "16A34A", "V procese": "B45309", "Uviaznuté": "DC2626", "Nezačaté": "6B7280" };
  const priorityFills: Record<string, string> = { "Vysoká": "FEE2E2", "Stredná": "FEF3C7", "Nízka": "DBEAFE" };
  const priorityTexts: Record<string, string> = { "Vysoká": "DC2626", "Stredná": "B45309", "Nízka": "2563EB" };

  for (let r = 2; r <= wsData.length; r++) {
    const rowData = wsData[r - 1];
    const isSubtask = rowData[1]?.toString().includes("Poduloha");
    const status = rowData[3]?.toString() ?? "";
    const priority = rowData[4]?.toString() ?? "";
    const dueDate = rowData[5]?.toString() ?? "";
    const overdue = dueDate !== "—" && isOverdue(dueDate);
    const rowBg = isSubtask ? "F8F9FF" : (r % 2 === 0 ? "FFFFFF" : "F9FAFB");

    cols.forEach((col, ci) => {
      const addr = col + r;
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      const cell = ws[addr];
      let fillColor = rowBg;
      let fontColor = isSubtask ? "6B7280" : "111827";
      let bold = false;
      const italic = isSubtask;

      if (ci === 3 && statusFills[status]) { fillColor = statusFills[status]; fontColor = statusTexts[status] ?? fontColor; bold = true; }
      else if (ci === 4 && priorityFills[priority]) { fillColor = priorityFills[priority]; fontColor = priorityTexts[priority] ?? fontColor; bold = true; }
      else if (ci === 5 && overdue) { fillColor = "FEE2E2"; fontColor = "DC2626"; bold = true; }

      cell.s = {
        font: { bold, italic, color: { rgb: fontColor }, sz: isSubtask ? 9 : 10 },
        fill: { patternType: "solid", fgColor: { rgb: fillColor } },
        alignment: { vertical: "center", wrapText: ci === 2 },
        border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } }
      };
    });
  }

  ws["!rows"] = [{ hpt: 22 }];
  for (let r = 2; r <= wsData.length; r++) (ws["!rows"] as any[]).push({ hpt: 18 });

  XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));

  const done = tasks.filter(t => t.status === "Hotovo").length;
  const summaryData = [
    ["Suhrn projektu", projectName],
    ["Datum exportu", new Date().toLocaleDateString("sk-SK")],
    ["", ""],
    ["Celkom uloh", tasks.length],
    ["Hotovo", done],
    ["V procese", tasks.filter(t => t.status === "V procese").length],
    ["Uviaznuté", tasks.filter(t => t.status === "Uviaznuté").length],
    ["Nezacate", tasks.filter(t => t.status === "Nezačaté").length],
    ["", ""],
    ["Celkom poduloh", tasks.reduce((a, t) => a + t.subtasks.length, 0)],
    ["Vysoka priorita", tasks.filter(t => t.priority === "Vysoká").length],
    ["Dokoncene %", tasks.length > 0 ? Math.round((done / tasks.length) * 100) + "%" : "0%"],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 30 }];
  if (wsSummary["A1"]) wsSummary["A1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  if (wsSummary["B1"]) wsSummary["B1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  XLSX.utils.book_append_sheet(wb, wsSummary, "Suhrn");

  XLSX.writeFile(wb, `${projectName}-export.xlsx`);
}

// ── PDF EXPORT (jsPDF, bez diakritiky) ───────────────────────────────────────
export async function exportToPDF(projectName: string, tasks: Task[]) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pdfW = 297;
  const margin = 12;
  const cW = pdfW - margin * 2;
  let y = 10;

  const PURPLE: [number,number,number] = [99, 102, 241];
  const WHITE: [number,number,number] = [255, 255, 255];
  const DARK: [number,number,number] = [17, 24, 39];
  const GRAY: [number,number,number] = [107, 114, 128];
  const LIGHT: [number,number,number] = [249, 250, 251];
  const LIGHT2: [number,number,number] = [243, 244, 246];
  const GREEN: [number,number,number] = [22, 163, 74];
  const GREEN_BG: [number,number,number] = [220, 252, 231];
  const AMBER: [number,number,number] = [180, 83, 9];
  const AMBER_BG: [number,number,number] = [254, 243, 199];
  const RED: [number,number,number] = [220, 38, 38];
  const RED_BG: [number,number,number] = [254, 226, 226];

  const checkPage = (need: number) => {
    if (y + need > 200) { doc.addPage(); y = 10; }
  };

  // ── Header bar ──
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(clean(projectName), margin, 10);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Export: ${new Date().toLocaleDateString("sk-SK")} | ${tasks.length} uloh | ${tasks.filter(t => t.status === "Hotovo").length} hotovo`, margin, 17);
  doc.text("Ticklydo", pdfW - margin, 14, { align: "right" });
  y = 28;

  // ── Stat boxes ──
  const stats = [
    { label: "Hotovo", val: tasks.filter(t => t.status === "Hotovo").length, bg: GREEN_BG, fg: GREEN },
    { label: "V procese", val: tasks.filter(t => t.status === "V procese").length, bg: AMBER_BG, fg: AMBER },
    { label: "Uviaznuté", val: tasks.filter(t => t.status === "Uviaznuté").length, bg: RED_BG, fg: RED },
    { label: "Nezacate", val: tasks.filter(t => t.status === "Nezačaté").length, bg: LIGHT2, fg: GRAY },
  ];
  const bw = (cW - 9) / 4;
  stats.forEach((s, i) => {
    const x = margin + i * (bw + 3);
    doc.setFillColor(...s.bg); doc.roundedRect(x, y, bw, 14, 2, 2, "F");
    doc.setFillColor(...s.fg); doc.roundedRect(x, y, 3, 14, 1, 1, "F");
    doc.setTextColor(...s.fg); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(String(s.val), x + bw / 2 + 1, y + 8, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(s.label, x + bw / 2 + 1, y + 12, { align: "center" });
  });
  y += 20;

  // ── Column config ──
  // cols: #, Nazov, Status, Priorita, Termin, Zodpovedny, Poznamky
  const colW = [10, 72, 28, 22, 24, 28, 0]; // last = fill
  colW[6] = cW - colW.slice(0, 6).reduce((a, b) => a + b, 0);
  const colX = [margin];
  for (let i = 1; i < colW.length; i++) colX.push(colX[i-1] + colW[i-1]);

  // ── Table header ──
  doc.setFillColor(...PURPLE);
  doc.rect(margin, y, cW, 8, "F");
  doc.setTextColor(...WHITE); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  const headers = ["#", "Nazov ulohy / Podulohy", "Status", "Priorita", "Termin", "Zodpovedny", "Poznamky"];
  headers.forEach((h, i) => doc.text(h, colX[i] + 2, y + 5.5));
  y += 10;

  // ── Tasks ──
  tasks.forEach((task, ti) => {
    checkPage(12);

    const sc = task.status === "Hotovo" ? { bg: GREEN_BG, fg: GREEN } :
               task.status === "V procese" ? { bg: AMBER_BG, fg: AMBER } :
               task.status === "Uviaznuté" ? { bg: RED_BG, fg: RED } :
               { bg: LIGHT2, fg: GRAY };

    const pc = task.priority === "Vysoká" ? { bg: RED_BG, fg: RED } :
               task.priority === "Stredná" ? { bg: AMBER_BG, fg: AMBER } :
               task.priority === "Nízka" ? { bg: [219, 234, 254] as [number,number,number], fg: [37, 99, 235] as [number,number,number] } :
               { bg: LIGHT2, fg: GRAY };

    const overdue = isOverdue(task.dueDate);
    const rowH = 9;
    const rowBg: [number,number,number] = ti % 2 === 0 ? WHITE : LIGHT;

    doc.setFillColor(...rowBg);
    doc.rect(margin, y, cW, rowH, "F");
    doc.setFillColor(sc.fg[0], sc.fg[1], sc.fg[2]);
    doc.rect(margin, y, 2, rowH, "F");

    // #
    doc.setTextColor(...GRAY); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text(String(ti + 1), colX[0] + 2, y + 6);

    // Name
    doc.setTextColor(...DARK); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    const nameStr = clean(task.name).length > 40 ? clean(task.name).slice(0, 39) + "…" : clean(task.name);
    doc.text(nameStr, colX[1] + 2, y + 6);
    if (task.subtasks.length > 0) {
      doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
      doc.text(`${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} poduloh`, colX[1] + 2, y + 8.5);
    }

    // Status badge
    doc.setFillColor(...sc.bg); doc.roundedRect(colX[2] + 1, y + 1.5, colW[2] - 3, 6, 1, 1, "F");
    doc.setTextColor(...sc.fg); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text(clean(task.status), colX[2] + colW[2] / 2 - 1, y + 5.8, { align: "center" });

    // Priority badge
    if (task.priority) {
      doc.setFillColor(...(pc.bg as [number,number,number])); doc.roundedRect(colX[3] + 1, y + 1.5, colW[3] - 3, 6, 1, 1, "F");
      doc.setTextColor(...(pc.fg as [number,number,number])); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
      doc.text(clean(task.priority), colX[3] + colW[3] / 2 - 1, y + 5.8, { align: "center" });
    } else {
      doc.setTextColor(...GRAY); doc.setFontSize(7); doc.text("—", colX[3] + 4, y + 6);
    }

    // Due date
    if (task.dueDate) {
      if (overdue) { doc.setFillColor(...RED_BG); doc.roundedRect(colX[4] + 1, y + 1.5, colW[4] - 3, 6, 1, 1, "F"); doc.setTextColor(...RED); }
      else { doc.setTextColor(...DARK); }
      doc.setFontSize(7); doc.setFont("helvetica", overdue ? "bold" : "normal");
      doc.text(task.dueDate + (overdue ? " !" : ""), colX[4] + 2, y + 6);
    } else {
      doc.setTextColor(...GRAY); doc.setFontSize(7); doc.text("—", colX[4] + 2, y + 6);
    }

    // Owner
    doc.setTextColor(...DARK); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(clean(task.owner || "—").slice(0, 16), colX[5] + 2, y + 6);

    // Notes
    doc.setTextColor(...GRAY); doc.setFontSize(6.5);
    const notesStr = clean(task.notes || "—");
    doc.text(notesStr.length > 35 ? notesStr.slice(0, 34) + "…" : notesStr, colX[6] + 2, y + 6);

    y += rowH;

    // ── Subtasks ──
    task.subtasks.forEach(sub => {
      checkPage(7);
      const subBg: [number,number,number] = [248, 249, 255];
      doc.setFillColor(...subBg); doc.rect(margin, y, cW, 7, "F");
      doc.setFillColor(...PURPLE); doc.rect(margin + 4, y, 1, 7, "F");

      doc.setTextColor(...GRAY); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text("↳", colX[0] + 2, y + 5);

      doc.setTextColor(sub.done ? GREEN[0] : DARK[0], sub.done ? GREEN[1] : DARK[1], sub.done ? GREEN[2] : DARK[2]);
      doc.setFontSize(7); doc.setFont("helvetica", sub.done ? "italic" : "normal");
      const subName = clean(sub.name).length > 38 ? clean(sub.name).slice(0, 37) + "…" : clean(sub.name);
      doc.text((sub.done ? "✓ " : "○ ") + subName, colX[1] + 6, y + 5);

      const ssc = sub.done || sub.status === "Hotovo"
        ? { bg: GREEN_BG, fg: GREEN }
        : sub.status === "V procese" ? { bg: AMBER_BG, fg: AMBER }
        : sub.status === "Uviaznuté" ? { bg: RED_BG, fg: RED }
        : { bg: LIGHT2, fg: GRAY };

      doc.setFillColor(...ssc.bg); doc.roundedRect(colX[2] + 1, y + 1, colW[2] - 3, 5, 1, 1, "F");
      doc.setTextColor(...ssc.fg); doc.setFontSize(6); doc.setFont("helvetica", "bold");
      doc.text(clean(sub.done ? "Hotovo" : sub.status), colX[2] + colW[2] / 2 - 1, y + 4.5, { align: "center" });

      if (sub.dueDate) {
        doc.setTextColor(...GRAY); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
        doc.text(sub.dueDate, colX[4] + 2, y + 5);
      }

      y += 7;
    });

    // Divider
    if (ti < tasks.length - 1) {
      doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
      doc.line(margin, y, margin + cW, y);
    }
    y += 1;
  });

  // ── Footer ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(`${clean(projectName)} · Ticklydo export · Strana ${i}/${pageCount}`, pdfW / 2, 207, { align: "center" });
  }

  doc.save(`${projectName}-export.pdf`);
}