import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, usecase } = await req.json();
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    console.log(`[DEV WAITLIST] ${new Date().toISOString()} | ${name} | ${email} | ${company} | ${usecase}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
