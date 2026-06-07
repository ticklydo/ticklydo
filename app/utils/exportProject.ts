// app/utils/exportProject.ts
// Client-side export — Excel (SheetJS) + PDF (jsPDF)

type Status = "Hotovo" | "V procese" | "Uviaznuté" | "Nezačaté";
type Priority = "Vysoká" | "Stredná" | "Nízka" | "";

type SubTask = {
  id: string; name: string; done: boolean;
  status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string;
};

type Comment = { id: string; text: string; author: string; createdAt: number; };

type Task = {
  id: string; name: string; status: Status; priority: Priority;
  dueDate: string; owner: string; notes: string; subtasks: SubTask[];
  tags?: string[];
  comments?: Comment[];
};

// ── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export async function exportToExcel(projectName: string, tasks: Task[]) {
  const XLSX = await import("xlsx");

  const rows: any[] = [];

  // Header row
  rows.push({
    "Typ": "ÚLOHA",
    "Názov": "Názov",
    "Status": "Status",
    "Priorita": "Priorita",
    "Termín": "Termín",
    "Zodpovedný": "Zodpovedný",
    "Poznámky": "Poznámky",
    "Tagy": "Tagy",
    "Komentáre": "Komentáre",
  });

  tasks.forEach(task => {
    // Task row
    rows.push({
      "Typ": "Úloha",
      "Názov": task.name,
      "Status": task.status,
      "Priorita": task.priority || "—",
      "Termín": task.dueDate || "—",
      "Zodpovedný": task.owner || "—",
      "Poznámky": task.notes || "",
      "Tagy": (task.tags ?? []).join(", ") || "—",
      "Komentáre": (task.comments ?? []).map(c => `${c.author}: ${c.text}`).join(" | ") || "—",
    });

    // Subtask rows
    task.subtasks.forEach(sub => {
      rows.push({
        "Typ": "  └ Podúloha",
        "Názov": sub.name,
        "Status": sub.done ? "Hotovo" : sub.status,
        "Priorita": sub.priority || "—",
        "Termín": sub.dueDate || "—",
        "Zodpovedný": sub.owner || "—",
        "Poznámky": sub.notes || "",
        "Tagy": "—",
        "Komentáre": "—",
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: true });

  // Column widths
  ws["!cols"] = [
    { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 40 },
  ];

  // Style header row
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "6366F1" } },
      alignment: { horizontal: "center" },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31));

  // Summary sheet
  const summaryData = [
    ["Projekt", projectName],
    ["Dátum exportu", new Date().toLocaleDateString("sk-SK")],
    ["Celkom úloh", tasks.length],
    ["Hotovo", tasks.filter(t => t.status === "Hotovo").length],
    ["V procese", tasks.filter(t => t.status === "V procese").length],
    ["Uviaznuté", tasks.filter(t => t.status === "Uviaznuté").length],
    ["Nezačaté", tasks.filter(t => t.status === "Nezačaté").length],
    ["Celkom podúloh", tasks.reduce((a, t) => a + t.subtasks.length, 0)],
    ["Vysoká priorita", tasks.filter(t => t.priority === "Vysoká").length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Súhrn");

  XLSX.writeFile(wb, `${projectName}-export.xlsx`);
}

// ── PDF EXPORT ────────────────────────────────────────────────────────────────
export async function exportToPDF(projectName: string, tasks: Task[]) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 20;

  const PURPLE = [99, 102, 241] as [number, number, number];
  const GRAY = [107, 114, 128] as [number, number, number];
  const LIGHT = [243, 244, 246] as [number, number, number];
  const GREEN = [22, 163, 74] as [number, number, number];
  const RED = [220, 38, 38] as [number, number, number];
  const ORANGE = [180, 83, 9] as [number, number, number];
  const DARK = [17, 24, 39] as [number, number, number];

  const checkPage = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  // ── HEADER ──
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(projectName, margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Export: ${new Date().toLocaleDateString("sk-SK")}`, margin, 22);

  // Stats on the right
  const done = tasks.filter(t => t.status === "Hotovo").length;
  const stats = `${tasks.length} úloh · ${done} hotovo`;
  doc.text(stats, pageW - margin, 22, { align: "right" });

  y = 38;

  // ── SUMMARY BOXES ──
  const statItems = [
    { label: "Hotovo", value: tasks.filter(t => t.status === "Hotovo").length, color: GREEN },
    { label: "V procese", value: tasks.filter(t => t.status === "V procese").length, color: ORANGE },
    { label: "Uviaznuté", value: tasks.filter(t => t.status === "Uviaznuté").length, color: RED },
    { label: "Nezačaté", value: tasks.filter(t => t.status === "Nezačaté").length, color: GRAY },
  ];

  const boxW = (contentW - 9) / 4;
  statItems.forEach((item, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, boxW, 16, 2, 2, "F");
    doc.setFillColor(...item.color);
    doc.roundedRect(x, y, 3, 16, 1, 1, "F");
    doc.setTextColor(...item.color);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.value), x + boxW / 2 + 2, y + 9, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(item.label, x + boxW / 2 + 2, y + 14, { align: "center" });
  });

  y += 24;

  // ── TASKS ──
  tasks.forEach((task, taskIdx) => {
    checkPage(20);

    const statusColor: [number, number, number] =
      task.status === "Hotovo" ? GREEN :
      task.status === "V procese" ? ORANGE :
      task.status === "Uviaznuté" ? RED : GRAY;

    const priorityColor: [number, number, number] =
      task.priority === "Vysoká" ? RED :
      task.priority === "Stredná" ? ORANGE :
      task.priority === "Nízka" ? [37, 99, 235] : GRAY;

    // Task card background
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");
    doc.setFillColor(...statusColor);
    doc.roundedRect(margin, y, 3, 18, 1, 1, "F");

    // Task number
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text(`#${taskIdx + 1}`, margin + 6, y + 6);

    // Task name
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    const nameMaxW = contentW - 80;
    const taskName = doc.splitTextToSize(task.name, nameMaxW)[0];
    doc.text(
      task.status === "Hotovo" ? taskName : taskName,
      margin + 14,
      y + 7
    );
    if (task.status === "Hotovo") {
      const tw = doc.getTextWidth(taskName);
      doc.setDrawColor(...statusColor);
      doc.setLineWidth(0.4);
      doc.line(margin + 14, y + 6.5, margin + 14 + tw, y + 6.5);
    }

    // Status badge
    doc.setFillColor(...(statusColor.map(v => Math.min(255, v + 180)) as [number, number, number]));
    doc.roundedRect(pageW - margin - 72, y + 3, 28, 6, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...statusColor);
    doc.text(task.status, pageW - margin - 72 + 14, y + 7.2, { align: "center" });

    // Priority badge
    if (task.priority) {
      doc.setFillColor(...(priorityColor.map(v => Math.min(255, v + 180)) as [number, number, number]));
      doc.roundedRect(pageW - margin - 42, y + 3, 22, 6, 1, 1, "F");
      doc.setTextColor(...priorityColor);
      doc.text(task.priority, pageW - margin - 42 + 11, y + 7.2, { align: "center" });
    }

    // Meta row
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    let metaParts = [];
    if (task.dueDate) metaParts.push(`📅 ${task.dueDate}`);
    if (task.owner) metaParts.push(`👤 ${task.owner}`);
    if ((task.tags ?? []).length > 0) metaParts.push(`🏷 ${task.tags!.join(", ")}`);
    if (metaParts.length > 0) doc.text(metaParts.join("   "), margin + 14, y + 14);

    y += 20;

    // Notes
    if (task.notes) {
      checkPage(10);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GRAY);
      const noteLines = doc.splitTextToSize(`Poznámky: ${task.notes}`, contentW - 10);
      noteLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, margin + 6, y);
        y += 4;
      });
      y += 1;
    }

    // Comments
    if ((task.comments ?? []).length > 0) {
      checkPage(8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PURPLE);
      doc.text(`Komentáre (${task.comments!.length}):`, margin + 6, y);
      y += 4;
      task.comments!.slice(0, 3).forEach(c => {
        checkPage(5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        const cText = doc.splitTextToSize(`${c.author}: ${c.text}`, contentW - 14)[0];
        doc.text(cText, margin + 10, y);
        y += 4;
      });
      y += 1;
    }

    // Subtasks
    if (task.subtasks.length > 0) {
      checkPage(8);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PURPLE);
      const doneCount = task.subtasks.filter(s => s.done).length;
      doc.text(`Podúlohy (${doneCount}/${task.subtasks.length}):`, margin + 6, y);
      y += 4;

      task.subtasks.forEach(sub => {
        checkPage(7);
        const subColor: [number, number, number] = sub.done ? GREEN : GRAY;
        doc.setFillColor(...(subColor.map(v => Math.min(255, v + 190)) as [number, number, number]));
        doc.roundedRect(margin + 8, y - 3, contentW - 8, 6, 1, 1, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", sub.done ? "bolditalic" : "normal");
        doc.setTextColor(...subColor);
        doc.text(sub.done ? "✓" : "○", margin + 11, y + 1);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...(sub.done ? GRAY : DARK));
        const subName = doc.splitTextToSize(sub.name, contentW - 25)[0];
        doc.text(subName, margin + 16, y + 1);
        if (sub.done) {
          const tw = doc.getTextWidth(subName);
          doc.setDrawColor(...GRAY);
          doc.setLineWidth(0.3);
          doc.line(margin + 16, y + 0.5, margin + 16 + tw, y + 0.5);
        }
        if (sub.dueDate) {
          doc.setFontSize(6.5);
          doc.setTextColor(...GRAY);
          doc.text(sub.dueDate, pageW - margin - 4, y + 1, { align: "right" });
        }
        y += 6;
      });
      y += 2;
    }

    y += 2;

    // Divider
    if (taskIdx < tasks.length - 1) {
      checkPage(4);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }
  });

  // ── FOOTER ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`${projectName} · Ticklydo export · Strana ${i}/${pageCount}`, pageW / 2, 290, { align: "center" });
  }

  doc.save(`${projectName}-export.pdf`);
}