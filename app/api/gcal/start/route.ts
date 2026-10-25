import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminAuth, adminDb } from "../../../utils/pushServer";
import { GCAL_SCOPE } from "../../../utils/gcalServer";

// Vráti odkaz na súhlas s prístupom ku Google Kalendáru
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Chýba token" }, { status: 400 });
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: "Google Kalendár nie je nastavený na serveri." }, { status: 500 });
    }
    const decoded = await adminAuth().verifyIdToken(idToken);

    const state = randomBytes(24).toString("hex");
    await adminDb().collection("gcalStates").doc(state).set({ uid: decoded.uid, at: Date.now() });

    const redirectUri = `${req.nextUrl.origin}/api/gcal/callback`;
    const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GCAL_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();
    return NextResponse.json({ url });
  } catch (e) {
    console.error("gcal start:", e);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}