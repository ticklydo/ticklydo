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

// ── PDF EXPORT (@react-pdf/renderer) ─────────────────────────────────────────
export async function exportToPDF(projectName: string, tasks: Task[]) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const React = await import("react");

  const today = new Date().toLocaleDateString("sk-SK");
  const done = tasks.filter(t => t.status === "Hotovo").length;

  const styles = StyleSheet.create({
    page: { padding: 20, fontFamily: "Helvetica", fontSize: 9, backgroundColor: "#ffffff" },
    header: { backgroundColor: "#6366f1", padding: 14, borderRadius: 6, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { color: "#ffffff", fontSize: 16, fontFamily: "Helvetica-Bold" },
    headerSub: { color: "#e0e0ff", fontSize: 8, marginTop: 3 },
    headerRight: { color: "#e0e0ff", fontSize: 8 },
    statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    statBox: { flex: 1, borderRadius: 5, padding: 8 },
    statVal: { fontSize: 18, fontFamily: "Helvetica-Bold" },
    statLbl: { fontSize: 7, marginTop: 2 },
    tableHeader: { flexDirection: "row", backgroundColor: "#6366f1", paddingVertical: 5, paddingHorizontal: 4, marginBottom: 0 },
    thText: { color: "#ffffff", fontSize: 7, fontFamily: "Helvetica-Bold" },
    row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
    subRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4, backgroundColor: "#f8f9ff", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
    badge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, fontSize: 7, fontFamily: "Helvetica-Bold" },
    footer: { position: "absolute", bottom: 10, left: 20, right: 20, textAlign: "center", fontSize: 7, color: "#9ca3af" },
  });

  const colWidths = { num: "4%", name: "28%", status: "11%", priority: "10%", due: "11%", owner: "12%", notes: "24%" };

  const statusStyles: Record<string, { bg: string; color: string }> = {
    "Hotovo":    { bg: "#dcfce7", color: "#16a34a" },
    "V procese": { bg: "#fef3c7", color: "#b45309" },
    "Uviaznuté": { bg: "#fee2e2", color: "#dc2626" },
    "Nezačaté":  { bg: "#f3f4f6", color: "#6b7280" },
  };
  const priorityStyles: Record<string, { bg: string; color: string }> = {
    "Vysoká":  { bg: "#fee2e2", color: "#dc2626" },
    "Stredná": { bg: "#fef3c7", color: "#b45309" },
    "Nízka":   { bg: "#dbeafe", color: "#2563eb" },
  };

  const MyDoc = () => React.createElement(Document, null,
    React.createElement(Page, { size: "A4", orientation: "landscape", style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.headerTitle }, projectName),
          React.createElement(Text, { style: styles.headerSub }, `Export: ${today} · ${tasks.length} úloh · ${done} dokončených`)
        ),
        React.createElement(Text, { style: styles.headerRight }, "Ticklydo Export")
      ),

      // Stats
      React.createElement(View, { style: styles.statsRow },
        ...[
          { lbl: "Hotovo", val: done, bg: "#dcfce7", fg: "#16a34a" },
          { lbl: "V procese", val: tasks.filter(t => t.status === "V procese").length, bg: "#fef3c7", fg: "#b45309" },
          { lbl: "Uviaznuté", val: tasks.filter(t => t.status === "Uviaznuté").length, bg: "#fee2e2", fg: "#dc2626" },
          { lbl: "Nezačaté", val: tasks.filter(t => t.status === "Nezačaté").length, bg: "#f3f4f6", fg: "#6b7280" },
        ].map(s => React.createElement(View, { key: s.lbl, style: { ...styles.statBox, backgroundColor: s.bg } },
          React.createElement(Text, { style: { ...styles.statVal, color: s.fg } }, String(s.val)),
          React.createElement(Text, { style: { ...styles.statLbl, color: s.fg } }, s.lbl)
        ))
      ),

      // Table header
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.num } }, "#"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.name } }, "Názov úlohy / Podúlohy"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.status } }, "Status"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.priority } }, "Priorita"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.due } }, "Termín"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.owner } }, "Zodpovedný"),
        React.createElement(Text, { style: { ...styles.thText, width: colWidths.notes } }, "Poznámky"),
      ),

      // Tasks
      ...tasks.flatMap((task, ti) => {
        const sc = statusStyles[task.status] ?? statusStyles["Nezačaté"];
        const pc = priorityStyles[task.priority];
        const overdue = isOverdue(task.dueDate);
        const rowBg = ti % 2 === 0 ? "#ffffff" : "#f9fafb";

        const taskRow = React.createElement(View, { key: task.id, style: { ...styles.row, backgroundColor: rowBg, borderLeftWidth: 2, borderLeftColor: sc.color } },
          React.createElement(Text, { style: { width: colWidths.num, color: "#9ca3af", fontFamily: "Helvetica-Bold" } }, String(ti + 1)),
          React.createElement(View, { style: { width: colWidths.name } },
            React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", color: "#111827", fontSize: 8 } }, task.name),
            task.subtasks.length > 0
              ? React.createElement(Text, { style: { fontSize: 6, color: "#6b7280", marginTop: 1 } }, `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} podúloh`)
              : null,
            (task.tags ?? []).length > 0
              ? React.createElement(Text, { style: { fontSize: 6, color: "#6366f1", marginTop: 1 } }, "#" + task.tags!.join(" #"))
              : null,
          ),
          React.createElement(View, { style: { width: colWidths.status } },
            React.createElement(View, { style: { ...styles.badge, backgroundColor: sc.bg, alignSelf: "flex-start" } },
              React.createElement(Text, { style: { color: sc.color } }, task.status)
            )
          ),
          React.createElement(View, { style: { width: colWidths.priority } },
            pc ? React.createElement(View, { style: { ...styles.badge, backgroundColor: pc.bg, alignSelf: "flex-start" } },
              React.createElement(Text, { style: { color: pc.color } }, task.priority)
            ) : React.createElement(Text, { style: { color: "#9ca3af" } }, "—")
          ),
          React.createElement(Text, { style: { width: colWidths.due, color: overdue ? "#dc2626" : "#374151", fontFamily: overdue ? "Helvetica-Bold" : "Helvetica", fontSize: 8 } }, task.dueDate ? task.dueDate + (overdue ? " ⚠" : "") : "—"),
          React.createElement(Text, { style: { width: colWidths.owner, color: "#374151", fontSize: 8 } }, task.owner || "—"),
          React.createElement(Text, { style: { width: colWidths.notes, color: "#6b7280", fontSize: 7 } }, task.notes ? task.notes.slice(0, 60) + (task.notes.length > 60 ? "…" : "") : "—"),
        );

        const subRows = task.subtasks.map(sub => {
          const ssc = statusStyles[sub.done ? "Hotovo" : sub.status] ?? statusStyles["Nezačaté"];
          return React.createElement(View, { key: sub.id, style: styles.subRow },
            React.createElement(Text, { style: { width: colWidths.num, color: "#6366f1" } }, "↳"),
            React.createElement(Text, { style: { width: colWidths.name, color: sub.done ? "#16a34a" : "#374151", fontSize: 8, paddingLeft: 8 } }, (sub.done ? "✓ " : "○ ") + sub.name),
            React.createElement(View, { style: { width: colWidths.status } },
              React.createElement(View, { style: { ...styles.badge, backgroundColor: ssc.bg, alignSelf: "flex-start" } },
                React.createElement(Text, { style: { color: ssc.color } }, sub.done ? "Hotovo" : sub.status)
              )
            ),
            React.createElement(Text, { style: { width: colWidths.priority, color: "#9ca3af" } }, sub.priority || "—"),
            React.createElement(Text, { style: { width: colWidths.due, color: "#6b7280", fontSize: 8 } }, sub.dueDate || "—"),
            React.createElement(Text, { style: { width: colWidths.owner, color: "#6b7280", fontSize: 8 } }, sub.owner || "—"),
            React.createElement(Text, { style: { width: colWidths.notes, color: "#9ca3af", fontSize: 7 } }, sub.notes || "—"),
          );
        });

        return [taskRow, ...subRows];
      }),

      // Footer
      React.createElement(Text, { style: styles.footer, fixed: true }, `${projectName} · Ticklydo export · ${today}`)
    )
  );

  const blob = await pdf(React.createElement(MyDoc)).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}-export.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}