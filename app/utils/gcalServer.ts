// Synchronizácia Ticklydo → Google Kalendár (serverová časť)
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "./pushServer";

const TZ = "Europe/Bratislava";
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function exchangeCode(code: string, redirectUri: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error("Výmena kódu zlyhala: " + (await r.text()));
  return r.json() as Promise<{ access_token: string; refresh_token?: string }>;
}

async function accessTokenFrom(refreshToken: string): Promise<string> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error("REFRESH_FAILED");
  return (await r.json()).access_token;
}

export async function revokeToken(token: string) {
  try {
    await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(token), { method: "POST" });
  } catch {}
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function plusHour(date: string, time: string): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  const nh = h + 1;
  if (nh >= 24) return { date: addDays(date, 1), time: `00:${String(m).padStart(2, "0")}` };
  return { date, time: `${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

type Wanted = Record<string, any>;

async function collectWanted(uid: string, baseUrl: string): Promise<Wanted> {
  const db = adminDb();
  const userSnap = await db.collection("users").doc(uid).get();
  const u = userSnap.data() ?? {};
  const myNames = [u.userName, u.displayName, u.email].filter(Boolean).map((x: string) => x.trim().toLowerCase());

  const docs = new Map<string, FirebaseFirestore.DocumentData>();
  const add = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.forEach(d => docs.set(d.id, d.data()));
  add(await db.collection("projects").where("ownerId", "==", uid).get());
  add(await db.collection("projects").where("memberUids", "array-contains", uid).get());
  add(await db.collection("projects")
    .where(FieldPath.documentId(), ">=", uid + "_")
    .where(FieldPath.documentId(), "<", uid + "_").get());

  const from = addDays(new Date().toISOString().slice(0, 10), -30);
  const to = addDays(new Date().toISOString().slice(0, 10), 400);
  const wanted: Wanted = {};

  for (const [docId, p] of docs) {
    if (p.archived) continue;
    const projectName = p.projectName || "Projekt";
    const link = `${baseUrl}/project/${docId}`;

    for (const t of p.tasks ?? []) {
      if (!t.dueDate || t.status === "Hotovo") continue;
      if (t.dueDate < from || t.dueDate > to) continue;
      // úlohy pridelené niekomu inému do tvojho kalendára nedávame
      const owner = (t.owner || "").trim().toLowerCase();
      if (owner && !myNames.includes(owner)) continue;
      wanted[`${docId}:t:${t.id}`] = {
        summary: `Termín: ${t.name}`,
        description: `Projekt: ${projectName}${t.notes ? "\n\n" + t.notes : ""}\n\nOtvoriť v Ticklydo: ${link}`,
        start: { date: t.dueDate },
        end: { date: addDays(t.dueDate, 1) },
        source: { title: "Ticklydo", url: link },
      };
    }

    for (const e of p.events ?? []) {
      if (e.type === "task" || !e.date) continue;
      if (e.date < from || e.date > to) continue;
      const body: Record<string, any> = {
        summary: e.title || "Udalosť",
        description: `Projekt: ${projectName}${e.notes ? "\n\n" + e.notes : ""}\n\nOtvoriť v Ticklydo: ${link}`,
        source: { title: "Ticklydo", url: link },
      };
      if (e.time && /^\d{1,2}:\d{2}$/.test(e.time)) {
        const t0 = e.time.padStart(5, "0");
        const end = plusHour(e.date, t0);
        body.start = { dateTime: `${e.date}T${t0}:00`, timeZone: TZ };
        body.end = { dateTime: `${end.date}T${end.time}:00`, timeZone: TZ };
      } else {
        body.start = { date: e.date };
        body.end = { date: addDays(e.endDate && e.endDate > e.date ? e.endDate : e.date, 1) };
      }
      wanted[`${docId}:e:${e.id}`] = body;
    }
  }
  return wanted;
}

export async function syncUser(uid: string, baseUrl: string): Promise<{ created: number; updated: number; deleted: number }> {
  const db = adminDb();
  const tokRef = db.collection("gcalTokens").doc(uid);
  const tokSnap = await tokRef.get();
  if (!tokSnap.exists) throw new Error("NOT_CONNECTED");
  const tok = tokSnap.data()!;

  let access: string;
  try {
    access = await accessTokenFrom(tok.refreshToken);
  } catch {
    // prístup bol odvolaný (napr. v nastaveniach Google účtu) — odpoj
    await tokRef.delete();
    await db.collection("users").doc(uid).set({ gcalConnected: false }, { merge: true });
    throw new Error("REVOKED");
  }
  const auth = { Authorization: `Bearer ${access}`, "Content-Type": "application/json" };

  const wanted = await collectWanted(uid, baseUrl);
  const map: Record<string, string> = tok.events ?? {};
  const hashes: Record<string, string> = tok.hashes ?? {};
  const newMap: Record<string, string> = {};
  const newHashes: Record<string, string> = {};
  let created = 0, updated = 0, deleted = 0;

  for (const [key, body] of Object.entries(wanted)) {
    const h = hash(JSON.stringify(body));
    const existing = map[key];
    if (existing && hashes[key] === h) { newMap[key] = existing; newHashes[key] = h; continue; }

    if (existing) {
      const r = await fetch(`${CAL}/${existing}`, { method: "PATCH", headers: auth, body: JSON.stringify(body) });
      if (r.ok) { newMap[key] = existing; newHashes[key] = h; updated++; continue; }
      if (r.status !== 404 && r.status !== 410) continue; // dočasná chyba — skúsime nabudúce
    }
    const r = await fetch(CAL, { method: "POST", headers: auth, body: JSON.stringify(body) });
    if (r.ok) {
      const ev = await r.json();
      newMap[key] = ev.id; newHashes[key] = h; created++;
    }
  }

  for (const [key, id] of Object.entries(map)) {
    if (wanted[key]) continue;
    const r = await fetch(`${CAL}/${id}`, { method: "DELETE", headers: auth });
    if (r.ok || r.status === 404 || r.status === 410) deleted++;
    else { newMap[key] = id; newHashes[key] = hashes[key] ?? ""; }
  }

  const now = Date.now();
  await tokRef.set({ events: newMap, hashes: newHashes, lastSync: now }, { merge: true });
  await db.collection("users").doc(uid).set({ gcalConnected: true, gcalLastSync: now }, { merge: true });
  return { created, updated, deleted };
}

export async function disconnectUser(uid: string) {
  const db = adminDb();
  const tokRef = db.collection("gcalTokens").doc(uid);
  const snap = await tokRef.get();
  if (snap.exists) {
    const tok = snap.data()!;
    try {
      const access = await accessTokenFrom(tok.refreshToken);
      const auth = { Authorization: `Bearer ${access}` };
      for (const id of Object.values(tok.events ?? {}) as string[]) {
        try { await fetch(`${CAL}/${id}`, { method: "DELETE", headers: auth }); } catch {}
      }
    } catch {}
    await revokeToken(tok.refreshToken);
    await tokRef.delete();
  }
  await db.collection("users").doc(uid).set({ gcalConnected: false, gcalLastSync: null }, { merge: true });
}