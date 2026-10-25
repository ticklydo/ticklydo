import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../utils/pushServer";
import { disconnectUser } from "../../../utils/gcalServer";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Chýba token" }, { status: 400 });
    const decoded = await adminAuth().verifyIdToken(idToken);
    await disconnectUser(decoded.uid);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("gcal disconnect:", e);
    return NextResponse.json({ error: "Odpojenie zlyhalo" }, { status: 500 });
  }
}