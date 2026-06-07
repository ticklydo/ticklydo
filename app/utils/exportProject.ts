// app/utils/exportProject.ts

type Status = "Hotovo" | "V procese" | "Uviaznuté" | "Nezačaté";
type Priority = "Vysoká" | "Stredná" | "Nízka" | "";
type SubTask = { id: string; name: string; done: boolean; status: Status; priority: Priority; dueDate: string; owner: string; notes: string; };
type Comment = { id: string; text: string; author: string; createdAt: number; };
type Task = { id: string; name: string; status: Status; priority: Priority; dueDate: string; owner: string; notes: string; subtasks: SubTask[]; tags?: string[]; comments?: Comment[]; };

function isOverdue(d: string) {
  if (!d) return false;
  return new Date(d + "T00:00:00") < new Date();
}

export async function exportToExcel(projectName: string, tasks: Task[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  wsData.push(["#", "Typ", "Názov úlohy / Podúlohy", "Status", "Priorita", "Termín", "Zodpovedný", "Poznámky", "Tagy", "Komentáre"]);

  tasks.forEach((task, ti) => {
    wsData.push([
      ti + 1, "Úloha", task.name, task.status, task.priority || "—",
      task.dueDate || "—", task.owner || "—", task.notes || "",
      (task.tags ?? []).join(", ") || "—",
      (task.comments ?? []).map(c => `${c.author}: ${c.text}`).join(" | ") || "—",
    ]);
    task.subtasks.forEach(sub => {
      wsData.push([
        "", "  └ Podúloha", "      " + sub.name,
        sub.done ? "Hotovo" : sub.status, sub.priority || "—",
        sub.dueDate || "—", sub.owner || "—", sub.notes || "", "—", "—",
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 4 }, { wch: 12 }, { wch: 38 }, { wch: 12 }, { wch: 10 },
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
    const isSubtask = rowData[1]?.toString().includes("Podúloha");
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

  // Súhrn
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const summaryData = [
    ["Súhrn projektu", projectName],
    ["Dátum exportu", new Date().toLocaleDateString("sk-SK")],
    ["", ""],
    ["Celkom úloh", tasks.length],
    ["Hotovo", done],
    ["V procese", tasks.filter(t => t.status === "V procese").length],
    ["Uviaznuté", tasks.filter(t => t.status === "Uviaznuté").length],
    ["Nezačaté", tasks.filter(t => t.status === "Nezačaté").length],
    ["", ""],
    ["Celkom podúloh", tasks.reduce((a, t) => a + t.subtasks.length, 0)],
    ["Vysoká priorita", tasks.filter(t => t.priority === "Vysoká").length],
    ["Dokončené %", tasks.length > 0 ? Math.round((done / tasks.length) * 100) + "%" : "0%"],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 30 }];
  if (wsSummary["A1"]) wsSummary["A1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  if (wsSummary["B1"]) wsSummary["B1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  XLSX.utils.book_append_sheet(wb, wsSummary, "Súhrn");

  XLSX.writeFile(wb, `${projectName}-export.xlsx`);
}