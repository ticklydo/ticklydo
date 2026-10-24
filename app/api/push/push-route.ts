import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, sendPushToUser } from "../../utils/pushServer";

// Pošle push na zariadenia adresáta práve vytvoreného upozornenia (notifications/{notifId}).
// Text berieme z databázy, nie od klienta, a každé upozornenie sa pushuje najviac raz.
export async function POST(req: NextRequest) {
  try {
    const { notifId, idToken } = await req.json();
    if (!notifId || !idToken) return NextResponse.json({ error: "Chýbajú údaje" }, { status: 400 });

    await adminAuth().verifyIdToken(idToken); // musí byť prihlásený používateľ

    const db = adminDb();
    const ref = db.collection("notifications").doc(notifId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Upozornenie neexistuje" }, { status: 404 });
    const n = snap.data()!;
    if (n.pushed === true) return NextResponse.json({ success: true, sent: 0 });
    if (!n.createdAt || Date.now() - n.createdAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Upozornenie je príliš staré" }, { status: 400 });
    }

    await ref.update({ pushed: true });
    const sent = await sendPushToUser(n.userId, { title: n.title || "Ticklydo", body: n.body || "", link: "/notifications" });
    return NextResponse.json({ success: true, sent });
  } catch (e: any) {
    console.error("push error:", e);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}