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
  const XLS = await import("xlsx-js-style");

  const wb = XLS.utils.book_new();
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

  const ws = XLS.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 4 }, { wch: 12 }, { wch: 38 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 35 },
  ];
  ws["!rows"] = [{ hpt: 24 }];
  for (let r = 2; r <= wsData.length; r++) (ws["!rows"] as any[]).push({ hpt: 18 });

  const border = {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } },
  };

  const cols = ["A","B","C","D","E","F","G","H","I","J"];

  // ── Header row ──
  cols.forEach(col => {
    const addr = col + "1";
    if (!ws[addr]) return;
    ws[addr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "6366F1" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: false },
      border: { top: { style: "thin", color: { rgb: "4F46E5" } }, bottom: { style: "thin", color: { rgb: "4F46E5" } }, left: { style: "thin", color: { rgb: "4F46E5" } }, right: { style: "thin", color: { rgb: "4F46E5" } } },
    };
  });

  const statusFill: Record<string, string> = {
    "Hotovo": "DCFCE7", "V procese": "FEF3C7", "Uviaznuté": "FEE2E2", "Nezačaté": "F3F4F6",
  };
  const statusFont: Record<string, string> = {
    "Hotovo": "16A34A", "V procese": "B45309", "Uviaznuté": "DC2626", "Nezačaté": "6B7280",
  };
  const priorityFill: Record<string, string> = {
    "Vysoká": "FEE2E2", "Stredná": "FEF3C7", "Nízka": "DBEAFE",
  };
  const priorityFont: Record<string, string> = {
    "Vysoká": "DC2626", "Stredná": "B45309", "Nízka": "2563EB",
  };

  // ── Data rows ──
  for (let r = 2; r <= wsData.length; r++) {
    const rowData = wsData[r - 1];
    const isSubtask = rowData[1]?.toString().includes("Podúloha");
    const status = rowData[3]?.toString() ?? "";
    const priority = rowData[4]?.toString() ?? "";
    const dueDate = rowData[5]?.toString() ?? "";
    const overdue = dueDate !== "—" && isOverdue(dueDate);
    const rowBg = isSubtask ? "EEF2FF" : (r % 2 === 0 ? "FFFFFF" : "F9FAFB");

    cols.forEach((col, ci) => {
      const addr = col + r;
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      const cell = ws[addr];

      let fill = rowBg;
      let fontColor = isSubtask ? "6B7280" : "111827";
      let bold = false;
      const italic = isSubtask;
      const sz = isSubtask ? 9 : 10;

      // Status column (D = index 3)
      if (ci === 3 && statusFill[status]) {
        fill = statusFill[status];
        fontColor = statusFont[status] ?? fontColor;
        bold = true;
      }
      // Priority column (E = index 4)
      else if (ci === 4 && priorityFill[priority]) {
        fill = priorityFill[priority];
        fontColor = priorityFont[priority] ?? fontColor;
        bold = true;
      }
      // Due date column (F = index 5) — red if overdue
      else if (ci === 5 && overdue) {
        fill = "FEE2E2";
        fontColor = "DC2626";
        bold = true;
      }

      cell.s = {
        font: { bold, italic, color: { rgb: fontColor }, sz },
        fill: { fgColor: { rgb: fill } },
        alignment: { vertical: "center", wrapText: ci === 2, horizontal: ci === 0 ? "center" : "left" },
        border,
      };
    });
  }

  XLS.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));

  // ── Súhrn sheet ──
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const summaryRows: any[][] = [
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
    ["Dokončené %", tasks.length > 0 ? Math.round((done / tasks.length) * 100) + "%" : "0%"],
  ];
  const wsSummary = XLS.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 30 }];
  wsSummary["!rows"] = [{ hpt: 22 }];

  const summaryHeaderStyle = {
    font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "6366F1" } },
    alignment: { vertical: "center" },
    border,
  };
  if (wsSummary["A1"]) wsSummary["A1"].s = summaryHeaderStyle;
  if (wsSummary["B1"]) wsSummary["B1"].s = summaryHeaderStyle;

  const summaryColors: Record<number, { fill: string; font: string }> = {
    4: { fill: "DCFCE7", font: "16A34A" }, // Hotovo
    5: { fill: "FEF3C7", font: "B45309" }, // V procese
    6: { fill: "FEE2E2", font: "DC2626" }, // Uviaznuté
    7: { fill: "F3F4F6", font: "6B7280" }, // Nezačaté
  };
  Object.entries(summaryColors).forEach(([row, colors]) => {
    const rn = Number(row);
    ["A","B"].forEach(col => {
      const addr = col + rn;
      if (!wsSummary[addr]) return;
      wsSummary[addr].s = {
        font: { bold: true, color: { rgb: colors.font }, sz: 11 },
        fill: { fgColor: { rgb: colors.fill } },
        alignment: { vertical: "center" },
        border,
      };
    });
  });

  XLS.utils.book_append_sheet(wb, wsSummary, "Súhrn");

  XLS.writeFile(wb, `${projectName}-export.xlsx`);
}