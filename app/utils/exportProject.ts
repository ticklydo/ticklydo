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
    const rowBg = isSubtask ? "F8F9FF" : (r % 2 === 0 ? "FFFFFF" : "F9FAFB");

    cols.forEach((col, ci) => {
      const addr = col + r;
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      const cell = ws[addr];
      let fillColor = rowBg;
      let fontColor = isSubtask ? "6B7280" : "111827";
      let bold = false;
      const italic = isSubtask;

      if (ci === 3 && statusFills[status]) {
        fillColor = statusFills[status];
        fontColor = statusTexts[status] ?? fontColor;
        bold = true;
      } else if (ci === 4 && priorityFills[priority]) {
        fillColor = priorityFills[priority];
        fontColor = priorityTexts[priority] ?? fontColor;
        bold = true;
      } else if (ci === 5 && overdue) {
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

  ws["!rows"] = [{ hpt: 22 }];
  for (let r = 2; r <= wsData.length; r++) {
    (ws["!rows"] as any[]).push({ hpt: 18 });
  }

  XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));

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
    ["Dokončených %", tasks.length > 0 ? Math.round((done / tasks.length) * 100) + "%" : "0%"],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 30 }];
  if (wsSummary["A1"]) wsSummary["A1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  if (wsSummary["B1"]) wsSummary["B1"].s = { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "6366F1" } } };
  XLSX.utils.book_append_sheet(wb, wsSummary, "Súhrn");

  XLSX.writeFile(wb, `${projectName}-export.xlsx`);
}

// ── PDF EXPORT (html2canvas) ──────────────────────────────────────────────────
export async function exportToPDF(projectName: string, tasks: Task[]) {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const today = new Date().toLocaleDateString("sk-SK");
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const inProgress = tasks.filter(t => t.status === "V procese").length;
  const stuck = tasks.filter(t => t.status === "Uviaznuté").length;
  const notStarted = tasks.filter(t => t.status === "Nezačaté").length;

  const badge = (text: string, bg: string, color: string) =>
    `<span style="background:${bg};color:${color};border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;display:inline-block">${text}</span>`;

  const taskRows = tasks.map((task, ti) => {
    const sc = STATUS_COLOR[task.status] ?? STATUS_COLOR["Nezačaté"];
    const pc = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR[""];
    const overdue = isOverdue(task.dueDate);

    const subtaskRows = task.subtasks.map(sub => {
      const ssc = STATUS_COLOR[sub.done ? "Hotovo" : sub.status] ?? STATUS_COLOR["Nezačaté"];
      const spc = PRIORITY_COLOR[sub.priority] ?? PRIORITY_COLOR[""];
      const sOverdue = isOverdue(sub.dueDate);
      return `<tr style="background:#f8f9ff">
        <td style="padding:5px 10px;color:#6b7280;font-size:11px">↳</td>
        <td style="padding:5px 8px;font-size:12px;color:#374151;padding-left:24px">${sub.name}${sub.done ? ' <span style="color:#16a34a">✓</span>' : ""}</td>
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
      <td style="padding:8px;text-align:center;background:${overdue ? "#fee2e2" : "transparent"};color:${overdue ? "#dc2626" : "#374151"};font-weight:${overdue ? "700" : "400"};font-size:12px">${task.dueDate || "—"}${overdue ? " ⚠" : ""}</td>
      <td style="padding:8px;font-size:12px;color:#374151">${task.owner || "—"}</td>
      <td style="padding:8px;font-size:11px;color:#6b7280">${task.notes || "—"}</td>
    </tr>${subtaskRows}`;
  }).join("");

  const html = `
    <div id="pdf-export" style="width:1050px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111827">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:20px 28px;border-radius:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:22px;font-weight:900">${projectName}</div>
          <div style="font-size:12px;opacity:0.8;margin-top:3px">Export: ${today} · ${tasks.length} úloh · ${done} dokončených</div>
        </div>
        <div style="font-size:12px;opacity:0.8">Ticklydo Project Export</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        <div style="background:#dcfce7;border-radius:8px;padding:12px 16px"><div style="font-size:22px;font-weight:900;color:#16a34a">${done}</div><div style="font-size:11px;font-weight:600;color:#16a34a">Hotovo</div></div>
        <div style="background:#fef3c7;border-radius:8px;padding:12px 16px"><div style="font-size:22px;font-weight:900;color:#b45309">${inProgress}</div><div style="font-size:11px;font-weight:600;color:#b45309">V procese</div></div>
        <div style="background:#fee2e2;border-radius:8px;padding:12px 16px"><div style="font-size:22px;font-weight:900;color:#dc2626">${stuck}</div><div style="font-size:11px;font-weight:600;color:#dc2626">Uviaznuté</div></div>
        <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px"><div style="font-size:22px;font-weight:900;color:#6b7280">${notStarted}</div><div style="font-size:11px;font-weight:600;color:#6b7280">Nezacate</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white">
            <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;width:30px">#</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;width:28%">Uloha / Poduloha</th>
            <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;width:100px">Status</th>
            <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;width:90px">Priorita</th>
            <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;width:100px">Termin</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;width:110px">Zodpovedny</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700">Poznamky</th>
          </tr>
        </thead>
        <tbody>${taskRows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:center;font-size:10px;color:#9ca3af">${projectName} · Ticklydo export · ${today}</div>
    </div>`;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  const element = container.querySelector("#pdf-export") as HTMLElement;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    const imgH = pdfW / ratio;

    if (imgH <= pdfH) {
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, imgH);
    } else {
      let yPos = 0;
      const pageH = canvas.width * (pdfH / pdfW);
      while (yPos < canvas.height) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageH, canvas.height - yPos);
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, -yPos);
        const pageData = pageCanvas.toDataURL("image/png");
        if (yPos > 0) pdf.addPage();
        pdf.addImage(pageData, "PNG", 0, 0, pdfW, pdfH);
        yPos += pageH;
      }
    }

    pdf.save(`${projectName}-export.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}