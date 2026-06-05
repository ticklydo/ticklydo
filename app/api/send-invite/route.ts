import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, projectName, inviterName, role, inviteLink } = await req.json();

    if (!email || !inviteLink) {
      return NextResponse.json({ error: "Chýba email alebo link" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY nie je nastavený" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const roleLabel = role === "admin" ? "Admin" : role === "member" ? "Člen" : "Host";

    const { data, error } = await resend.emails.send({
      from: "Ticklydo <noreply@ticklydo.com>",
      to: [email],
      subject: `${inviterName || "Niekto"} ťa pozýva do projektu "${projectName}"`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="https://www.ticklydo.com/LOGO.png" width="160" style="display: block; margin: 0 auto;" alt="Ticklydo" />
          </div>

          <div style="background: #f8f9fb; border-radius: 16px; padding: 24px; text-align: center;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
              <strong>${inviterName || "Niekto"}</strong> ťa pozýva do projektu
            </p>
            <p style="font-size: 20px; font-weight: 800; margin: 0 0 4px; color: #7c3aed;">${projectName}</p>
            <p style="font-size: 13px; color: #6b7280; margin: 0 0 20px;">Rola: <strong>${roleLabel}</strong></p>

            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 32px; border-radius: 12px;">
              Prijať pozvánku
            </a>
          </div>

          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px; line-height: 1.5;">
            Ak tlačidlo nefunguje, skopíruj tento odkaz:<br>
            <span style="color: #7c3aed; word-break: break-all;">${inviteLink}</span>
          </p>

          <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 20px;">
            Túto pozvánku poslal Ticklydo · ticklydo.com
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("send-invite error:", err);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}