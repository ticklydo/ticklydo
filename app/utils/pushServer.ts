// Serverové pomocné funkcie (Firebase Admin) — len pre API routes a cron
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

export function adminInit() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
}

export function adminDb() { adminInit(); return getFirestore(); }
export function adminAuth() { adminInit(); return getAuth(); }

export async function sendPushToUser(uid: string, msg: { title: string; body: string; link?: string }): Promise<number> {
  const db = adminDb();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const tokens: string[] = (snap.data()?.pushTokens ?? []).filter((t: any) => typeof t === "string");
  if (tokens.length === 0) return 0;

  let sent = 0;
  const dead: string[] = [];
  for (const token of tokens) {
    try {
      await getMessaging().send({
        token,
        data: { title: msg.title, body: msg.body, link: msg.link || "/notifications" },
        webpush: { headers: { Urgency: "high", TTL: "86400" } },
      });
      sent++;
    } catch (e: any) {
      const code = e?.code || "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-argument") || code.includes("invalid-registration-token")) {
        dead.push(token);
      } else {
        console.error("Push zlyhal:", code || e?.message);
      }
    }
  }
  if (dead.length) await ref.update({ pushTokens: FieldValue.arrayRemove(...dead) });
  return sent;
}