import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Resend } from "resend";
import { adminAuth, adminDb } from "../../utils/pushServer";

// Pošle pekný email s odkazom na nastavenie / obnovu hesla (namiesto štandardného emailu od Firebase).
// Vždy odpovie rovnako, nech účet existuje alebo nie (aby sa nedalo zisťovať, kto má účet).
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const addr = String(email || "").trim().toLowerCase();
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      return NextResponse.json({ error: "Neplatný email" }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email nie je nastavený" }, { status: 500 });
    }

    // najviac jeden email za minútu pre jednu adresu
    const db = adminDb();
    const limRef = db.collection("resetLimits").doc(createHash("sha256").update(addr).digest("hex"));
    const lim = await limRef.get();
    if (lim.exists && Date.now() - (lim.data()?.at || 0) < 60 * 1000) {
      return NextResponse.json({ success: true });
    }
    await limRef.set({ at: Date.now() });

    let link: string;
    try {
      link = await adminAuth().generatePasswordResetLink(addr, { url: "https://www.ticklydo.com/login" });
    } catch {
      return NextResponse.json({ success: true }); // účet neexistuje — nič neprezrádzame
    }
    if (!/[?&]lang=/.test(link)) link += "&lang=sk"; // stránka na zadanie hesla po slovensky

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Ticklydo <noreply@ticklydo.com>",
      to: [addr],
      subject: "Nastavenie nového hesla do Ticklydo",
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="https://www.ticklydo.com/LOGO.png" width="160" style="display: block; margin: 0 auto;" alt="Ticklydo" />
          </div>
          <div style="background: #f8f9fb; border-radius: 16px; padding: 24px; text-align: center;">
            <p style="font-size: 20px; font-weight: 800; margin: 0 0 10px; color: #7c3aed;">Nové heslo</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
              Dostali sme žiadosť o nastavenie hesla pre účet <strong>${addr.replace(/[<>&]/g, "")}</strong>. Klikni na tlačidlo a zvoľ si nové heslo.
            </p>
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 32px; border-radius: 12px;">
              Nastaviť nové heslo
            </a>
            <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 18px 0 0;">
              Odkaz platí obmedzený čas a dá sa použiť len raz.
            </p>
          </div>
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px; line-height: 1.5;">
            Ak tlačidlo nefunguje, skopíruj tento odkaz do prehliadača:<br>
            <span style="color: #7c3aed; word-break: break-all;">${link}</span>
          </p>
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 16px; line-height: 1.5;">
            Ak si o zmenu hesla nežiadal/a, tento email ignoruj. Tvoje heslo zostane nezmenené.
          </p>
          <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 20px;">Ticklydo · ticklydo.com</p>
        </div>`,
    });
    if (error) {
      console.error("send-reset Resend:", error);
      return NextResponse.json({ error: "Email sa nepodarilo odoslať" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("send-reset:", e);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}