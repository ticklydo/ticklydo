// Push upozornenia na zariadení (Firebase Cloud Messaging)
import { getApps, getApp } from "firebase/app";
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const SW_URL = "/firebase-messaging-sw.js";
const SW_SCOPE = "/firebase-cloud-messaging-push-scope";
const storeKey = (uid: string) => "ticklydo_push_" + uid;

export async function pushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

export function pushEnabledHere(uid: string): boolean {
  try {
    return (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      !!localStorage.getItem(storeKey(uid))
    );
  } catch {
    return false;
  }
}

export async function enablePush(uid: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return { ok: false, error: "Chýba nastavenie push kľúča (NEXT_PUBLIC_FIREBASE_VAPID_KEY)." };
    if (!(await pushSupported())) return { ok: false, error: "Toto zariadenie alebo prehliadač push upozornenia nepodporuje." };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Upozornenia sú zablokované. Povoľ ich v nastaveniach prehliadača (ikona zámku pri adrese)." };
    }

    const app = getApps().length ? getApp() : null;
    if (!app) return { ok: false, error: "Aplikácia ešte nie je pripravená, skús to znova." };

    const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import("firebase/messaging");
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, error: "Nepodarilo sa získať token zariadenia." };

    await updateDoc(doc(getFirestore(app), "users", uid), { pushTokens: arrayUnion(token) });
    localStorage.setItem(storeKey(uid), token);
    return { ok: true };
  } catch (e: any) {
    console.error("enablePush:", e);
    return { ok: false, error: e?.message || "Zapnutie upozornení zlyhalo." };
  }
}

export async function disablePush(uid: string): Promise<void> {
  try {
    const token = localStorage.getItem(storeKey(uid));
    const app = getApps().length ? getApp() : null;
    if (token && app) {
      await updateDoc(doc(getFirestore(app), "users", uid), { pushTokens: arrayRemove(token) });
    }
    localStorage.removeItem(storeKey(uid));
  } catch (e) {
    console.error("disablePush:", e);
  }
}

// Po vytvorení upozornenia z prehliadača požiada server, aby poslal push adresátovi.
export async function requestPush(notifId: string, idToken: string): Promise<void> {
  try {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifId, idToken }),
    });
  } catch {}
}