// app/api/send-notification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailHtml(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <div style="text-align:center;margin-bottom:28px">
        <img src="https://www.ticklydo.com/LOGO.png" width="160" style="display:block;margin:0 auto" alt="Ticklydo"/>
      </div>
      <div style="background:#f8f9fb;border-radius:16px;padding:24px">
        <p style="font-size:18px;font-weight:800;margin:0 0 12px;color:#7c3aed;text-align:center">${title}</p>
        <div style="font-size:14px;line-height:1.7;color:#374151">${body}</div>
        <div style="text-align:center;margin-top:20px">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px">${ctaText}</a>
        </div>
      </div>
      <p style="font-size:11px;color:#cbd5e1;text-align:center;margin-top:20px">Ticklydo · ticklydo.com</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const { type, to, data } = await req.json();

    if (!to || !type) {
      return NextResponse.json({ error: "Chýba type alebo to" }, { status: 400 });
    }

    let subject = "";
    let html = "";

    if (type === "deadline_week") {
      subject = `📅 Termín za týždeň: ${data.taskName}`;
      html = emailHtml(
        "Termín sa blíži",
        `<p>Úloha <strong>${data.taskName}</strong> v projekte <strong>${data.projectName}</strong> má termín <strong>${data.dueDate}</strong> — teda o 7 dní.</p><p style="color:#6b7280">Stihneš to? 💪</p>`,
        "Otvoriť projekt",
        `https://ticklydo.com/project/${data.projectId}`
      );
    } else if (type === "deadline_tomorrow") {
      subject = `⚠️ Zajtra je termín: ${data.taskName}`;
      html = emailHtml(
        "Zajtra je termín!",
        `<p>Úloha <strong>${data.taskName}</strong> v projekte <strong>${data.projectName}</strong> má termín <strong>zajtra (${data.dueDate})</strong>.</p><p style="color:#b45309;font-weight:600">Nezabudni! ⏰</p>`,
        "Otvoriť projekt",
        `https://ticklydo.com/project/${data.projectId}`
      );
    } else if (type === "deadline_today") {
      subject = `🔴 Dnes je termín: ${data.taskName}`;
      html = emailHtml(
        "Dnes je termín!",
        `<p>Úloha <strong>${data.taskName}</strong> v projekte <strong>${data.projectName}</strong> má termín <strong>dnes (${data.dueDate})</strong>.</p><p style="color:#dc2626;font-weight:600">Posledný deň! 🚨</p>`,
        "Otvoriť projekt",
        `https://ticklydo.com/project/${data.projectId}`
      );
    } else if (type === "member_joined") {
      subject = `👤 Nový člen v projekte "${data.projectName}"`;
      html = emailHtml(
        "Nový člen sa pripojil",
        `<p><strong>${data.memberName || data.memberEmail}</strong> sa pripojil/a do projektu <strong>${data.projectName}</strong> ako <strong>${data.role === "admin" ? "Admin" : data.role === "member" ? "Člen" : "Host"}</strong>.</p>`,
        "Otvoriť projekt",
        `https://ticklydo.com/project/${data.projectId}`
      );
    } else {
      return NextResponse.json({ error: "Neznámy typ notifikácie" }, { status: 400 });
    }

    const { data: emailData, error } = await resend.emails.send({
      from: "Ticklydo <noreply@ticklydo.com>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: emailData?.id });
  } catch (err: any) {
    console.error("send-notification error:", err);
    return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
  }
}