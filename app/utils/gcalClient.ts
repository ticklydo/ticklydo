// Automatická synchronizácia s Google Kalendárom: po každej zmene v projekte sa po chvíli
// (3 s, aby sa viac zmien poslalo naraz) zavolá server, ak má používateľ prepojenie zapnuté.
import { getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;

export function setGcalFlag(uid: string, on: boolean) {
  try { localStorage.setItem("ticklydo_gcal_" + uid, on ? "1" : "0"); } catch {}
}

async function run() {
  if (running) { again = true; return; }
  running = true;
  try {
    if (!getApps().length) return;
    const user = getAuth(getApp()).currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch("/api/gcal/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      keepalive: true,
    });
  } catch {
    // synchronizácia sa zopakuje pri ďalšej zmene alebo ráno
  } finally {
    running = false;
    if (again) { again = false; triggerGcalSync(); }
  }
}

export function triggerGcalSync() {
  try {
    if (!getApps().length) return;
    const uid = getAuth(getApp()).currentUser?.uid;
    if (!uid || localStorage.getItem("ticklydo_gcal_" + uid) !== "1") return;
  } catch { return; }
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, 3000);
}