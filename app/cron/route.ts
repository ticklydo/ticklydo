// app/api/cron/route.ts
// Vercel Cron Job — spúšťa sa každý deň o 8:00 ráno
// Nastav v vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 6 * * *" }] }

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Ochrana — len Vercel Cron môže volať
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    // Init Firebase Admin
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }

    const db = getFirestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const in7Str = in7.toISOString().split("T")[0];

    // Načítaj všetkých používateľov
    const usersSnap = await db.collection("users").get();
    let notificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      if (!userEmail) continue;

      const projects = userData.projects ?? [];

      for (const project of projects) {
        if (project.archived) continue;

        const projectId = project.id;
        const projectName = project.name;
        const ownerUid = userDoc.id;

        const projectSnap = await db.doc(`projects/${ownerUid}_${projectId}`).get();
        if (!projectSnap.exists) continue;

        const projectData = projectSnap.data()!;
        const tasks = projectData.tasks ?? [];

        for (const task of tasks) {
          if (!task.dueDate || task.status === "Hotovo") continue;

          // Nájdi email A uid zodpovedného (uid potrebujeme pre in-app notifikáciu, email pre ten existujúci)
          let recipientEmail = userEmail; // default = vlastník projektu
          let recipientUid = ownerUid;    // default = vlastník projektu

          // Ak je owner nastavený, skús nájsť jeho email aj uid
          if (task.owner) {
            const membersSnap = await db.collection("users")
              .where("displayName", "==", task.owner)
              .limit(1)
              .get();
            if (!membersSnap.empty) {
              recipientEmail = membersSnap.docs[0].data().email ?? userEmail;
              recipientUid = membersSnap.docs[0].id;
            }
          }

          let type: string | null = null;
          if (task.dueDate === in7Str) type = "deadline_week";
          else if (task.dueDate === tomorrowStr) type = "deadline_tomorrow";
          else if (task.dueDate === todayStr) type = "deadline_today";

          if (type) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://ticklydo.com"}/api/send-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type,
                to: recipientEmail,
                data: {
                  taskName: task.name,
                  projectName,
                  projectId,
                  dueDate: task.dueDate,
                },
              }),
            });

            // ── Notifikácia priamo v appke (popri emaili) ──
            // Deterministické ID dokumentu (nie auto-generované) — ak cron náhodou beží
            // dvakrát v ten istý deň pre tú istú úlohu, prepíše sa ten istý záznam namiesto duplicity.
            const titleByType: Record<string, string> = {
              deadline_week: "Termín o týždeň",
              deadline_tomorrow: "Termín zajtra",
              deadline_today: "Termín dnes",
            };
            const notifId = `${ownerUid}_${projectId}_${task.id}_${type}_${todayStr}`;
            await db.collection("notifications").doc(notifId).set({
              userId: recipientUid,
              type: "deadline",
              title: titleByType[type] ?? "Blížiaci sa termín",
              body: `Úloha „${task.name}" v projekte ${projectName}`,
              projectDocId: `${ownerUid}_${projectId}`,
              projectName,
              read: false,
              createdAt: Date.now(),
            }, { merge: true });

            notificationsSent++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (err: any) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}