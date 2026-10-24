import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth, adminDb, sendPushToUser } from "../../utils/pushServer";

// Zavolá sa hneď po vytvorení nového účtu: pošle správcovi email, upozornenie v appke a push.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: "Chýba token" }, { status: 400 });

    const decoded = await adminAuth().verifyIdToken(idToken);
    const db = adminDb();
    const userRef = db.collection("users").doc(decoded.uid);
    const snap = await userRef.get();
    const u = snap.data();
    // len pre čerstvo založený čakajúci účet a len raz
    if (!u || u.approved !== false || u.adminNotified === true) {
      return NextResponse.json({ success: true, skipped: true });
    }
    await userRef.update({ adminNotified: true });

    const email: string = u.email || decoded.email || "(bez e-mailu)";

    // upozornenie v appke + push pre všetkých správcov
    const admins = await db.collection("users").where("isAdmin", "==", true).get();
    for (const a of admins.docs) {
      await db.collection("notifications").add({
        userId: a.id,
        type: "registration",
        title: "Nová registrácia",
        body: `${email} čaká na schválenie`,
        read: false,
        pushed: true,
        createdAt: Date.now(),
      });
      try { await sendPushToUser(a.id, { title: "Nová registrácia", body: `${email} čaká na schválenie`, link: "/admin" }); } catch {}
    }

    // email správcovi
    if (process.env.RESEND_API_KEY) {
      const to = process.env.ADMIN_EMAIL || "ticklydo@gmail.com";
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ticklydo <noreply@ticklydo.com>",
        to: [to],
        subject: "Nová registrácia čaká na schválenie",
        html: `
          <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://www.ticklydo.com/LOGO.png" width="160" style="display: block; margin: 0 auto;" alt="Ticklydo" />
            </div>
            <div style="background: #f8f9fb; border-radius: 16px; padding: 24px; text-align: center;">
              <p style="font-size: 18px; font-weight: 800; margin: 0 0 10px; color: #7c3aed;">Nová registrácia</p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;"><strong>${String(email).replace(/[<>&]/g, "")}</strong> čaká na tvoje schválenie.</p>
              <a href="https://www.ticklydo.com/admin" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 32px; border-radius: 12px;">Otvoriť správu registrácií</a>
            </div>
          </div>`,
      });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("notify-registration error:", e);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}