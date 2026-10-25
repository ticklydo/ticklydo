import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../utils/pushServer";
import { exchangeCode, syncUser } from "../../../utils/gcalServer";

// Google sem vráti používateľa po udelení súhlasu
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const back = (status: string) => NextResponse.redirect(`${origin}/profile?gcal=${status}`);
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    if (!code || !state) return back("error"); // napr. používateľ súhlas odmietol

    const db = adminDb();
    const stRef = db.collection("gcalStates").doc(state);
    const st = await stRef.get();
    if (!st.exists) return back("error");
    const { uid, at } = st.data()!;
    await stRef.delete();
    if (Date.now() - at > 10 * 60 * 1000) return back("error");

    const tokens = await exchangeCode(code, `${origin}/api/gcal/callback`);
    if (!tokens.refresh_token) return back("error");

    await db.collection("gcalTokens").doc(uid).set({
      refreshToken: tokens.refresh_token,
      connectedAt: Date.now(),
      events: {},
      hashes: {},
    });
    await db.collection("users").doc(uid).set({ gcalConnected: true }, { merge: true });

    try { await syncUser(uid, origin); } catch (e) { console.error("gcal prvá synchronizácia:", e); }
    return back("ok");
  } catch (e) {
    console.error("gcal callback:", e);
    return back("error");
  }
}