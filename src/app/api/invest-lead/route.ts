import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone } = await req.json();
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Log to console (visible in Vercel logs)
    console.log(`[INVEST LEAD] ${new Date().toISOString()} | ${name} | ${email} | ${phone}`);

    // TODO: save to Supabase invest_leads table or send to Brevo/email
    // For now just log — data visible in Vercel function logs

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
