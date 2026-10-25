// Viac účtov na jednom zariadení: každý uložený účet má vlastnú pomenovanú inštanciu Firebase
// (so samostatným uloženým prihlásením). Prepnutie účtu = nastavenie používateľa z tejto
// inštancie ako aktuálneho používateľa hlavnej aplikácie. Heslá sa nikde neukladajú.

import { getApp, getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const LIST_KEY = "ticklydo_accounts";

export type SavedAccount = {
  uid: string;
  email: string;
  name: string;
  savedAt: number;
};

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: SavedAccount[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("ticklydo-accounts-changed"));
  } catch {}
}

export function accountApp(uid: string): FirebaseApp {
  const name = "acct-" + uid;
  const existing = getApps().find(a => a.name === name);
  return existing ?? initializeApp(firebaseConfig, name);
}

export function accountAuth(uid: string): Auth {
  return getAuth(accountApp(uid));
}

export function mainAuth(): Auth {
  return getAuth(getApp());
}

// Prihlásenie len na čas relácie (nezaškrtnuté "Zostať prihlásený") sa na zariadení nezapamätáva,
// preto také účty do zoznamu neukladáme.
function usesSessionPersistence(): boolean {
  try {
    return Object.keys(sessionStorage).some(k => k.startsWith("firebase:authUser:"));
  } catch {
    return false;
  }
}

// Uloží práve prihláseného používateľa medzi účty na tomto zariadení.
export async function saveCurrentAccount(user: User): Promise<void> {
  if (usesSessionPersistence()) return;
  try {
    const a = accountAuth(user.uid);
    await a.authStateReady();
    if (a.currentUser?.uid !== user.uid) await a.updateCurrentUser(user);
    const list = getSavedAccounts().filter(x => x.uid !== user.uid);
    list.push({
      uid: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? "",
      savedAt: Date.now(),
    });
    writeAccounts(list);
  } catch (e) {
    console.error("Uloženie účtu zlyhalo:", e);
  }
}

// Prepne na iný uložený účet bez odhlásenia a znovuprihlásenia.
export async function switchToAccount(uid: string, opts?: { skipSave?: boolean }): Promise<void> {
  const main = mainAuth();
  if (main.currentUser?.uid === uid) return;
  if (main.currentUser && !opts?.skipSave) await saveCurrentAccount(main.currentUser);

  const target = accountAuth(uid);
  await target.authStateReady();
  const user = target.currentUser;
  if (!user) {
    removeAccountFromList(uid);
    throw new Error("Prihlásenie tohto účtu vypršalo. Pridaj ho znova.");
  }
  try {
    await user.getIdToken(true); // overí, že relácia ešte platí
  } catch {
    removeAccountFromList(uid);
    throw new Error("Prihlásenie tohto účtu vypršalo. Pridaj ho znova.");
  }
  await main.updateCurrentUser(user);
  window.location.href = "/home";
}

function removeAccountFromList(uid: string) {
  writeAccounts(getSavedAccounts().filter(a => a.uid !== uid));
}

// Odstráni účet z tohto zariadenia (odhlási jeho uloženú reláciu).
export async function removeAccount(uid: string): Promise<void> {
  try {
    await accountAuth(uid).signOut();
  } catch {}
  removeAccountFromList(uid);
}

// Odhlási aktuálny účet. Ak sú na zariadení ďalšie uložené účty, prepne na prvý z nich,
// inak prejde na úvodnú stránku.
export async function logoutCurrent(): Promise<void> {
  const main = mainAuth();
  const uid = main.currentUser?.uid;
  if (uid) await removeAccount(uid); // odstráni účet zo zoznamu a odhlási jeho uloženú reláciu
  const others = getSavedAccounts().filter(a => a.uid !== uid);
  if (others.length > 0) {
    try {
      // skipSave: odhlasovaný účet sa nesmie znova uložiť
      await switchToAccount(others[0].uid, { skipSave: true });
      return;
    } catch {}
  }
  try { await main.signOut(); } catch {}
  try { localStorage.removeItem("ticklydo_remember_until"); } catch {}
  window.location.replace("/");
}

// Odhlási všetky účty na tomto zariadení.
export async function logoutAll(): Promise<void> {
  for (const a of getSavedAccounts()) {
    try { await accountAuth(a.uid).signOut(); } catch {}
  }
  writeAccounts([]);
  await mainAuth().signOut();
  window.location.href = "/";
}