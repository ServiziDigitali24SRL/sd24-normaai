import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { desc, email, url, ua } = await req.json();
    if (!desc?.trim()) return NextResponse.json({ error: "Missing desc" }, { status: 400 });
    console.log(`[BUG REPORT] ${new Date().toISOString()} | ${email || "anon"} | ${url}\n${desc}\nUA: ${ua}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
