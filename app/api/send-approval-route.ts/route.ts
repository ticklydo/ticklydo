import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function getUserDoc(uid: string, idToken: string) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j.fields || {};
}

export async function POST(req: NextRequest) {
  try {
    const { uid, idToken } = await req.json();
    if (!uid || !idToken) return NextResponse.json({ error: "Chýbajú údaje" }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "RESEND_API_KEY nie je nastavený" }, { status: 500 });

    // 1) over, kto volá (platný Firebase token)
    const look = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!look.ok) return NextResponse.json({ error: "Neplatné prihlásenie" }, { status: 401 });
    const callerUid = (await look.json()).users?.[0]?.localId;

    // 2) volajúci musí byť správca
    const caller = callerUid ? await getUserDoc(callerUid, idToken) : null;
    if (!caller || caller.isAdmin?.booleanValue !== true) {
      return NextResponse.json({ error: "Nemáš oprávnenie" }, { status: 403 });
    }

    // 3) email berieme z databázy (nie od klienta) a len pre schválený účet
    const target = await getUserDoc(uid, idToken);
    const email = target?.email?.stringValue;
    if (!email || target?.approved?.booleanValue !== true) {
      return NextResponse.json({ error: "Účet nie je schválený" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Ticklydo <noreply@ticklydo.com>",
      to: [email],
      subject: "Tvoja registrácia v Ticklydo je schválená",
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="https://www.ticklydo.com/LOGO.png" width="160" style="display: block; margin: 0 auto;" alt="Ticklydo" />
          </div>
          <div style="background: #f8f9fb; border-radius: 16px; padding: 24px; text-align: center;">
            <p style="font-size: 20px; font-weight: 800; margin: 0 0 10px; color: #7c3aed;">Registrácia potvrdená ✓</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
              Tvoj účet v Ticklydo bol schválený. Môžeš sa prihlásiť a začať pracovať s projektmi, poznámkami a plánom týždňa.
            </p>
            <a href="https://www.ticklydo.com/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 32px; border-radius: 12px;">
              Prihlásiť sa
            </a>
          </div>
          <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 20px;">Ticklydo · ticklydo.com</p>
        </div>
      `,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("approval-email error:", e);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}