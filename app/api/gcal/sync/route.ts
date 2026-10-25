import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../utils/pushServer";
import { syncUser } from "../../../utils/gcalServer";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Chýba token" }, { status: 400 });
    const decoded = await adminAuth().verifyIdToken(idToken);
    const result = await syncUser(decoded.uid, req.nextUrl.origin);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e?.message === "NOT_CONNECTED" || e?.message === "REVOKED") {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("gcal sync:", e);
    return NextResponse.json({ error: "Synchronizácia zlyhala" }, { status: 500 });
  }
}