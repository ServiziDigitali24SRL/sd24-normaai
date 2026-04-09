import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyCompanyAccess(user_id: string, company_id: string) {
  const { data } = await getAdmin()
    .from("company_profiles")
    .select("id")
    .eq("id", company_id)
    .eq("user_id", user_id)
    .maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const company_id = searchParams.get("company_id");
    if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });
    if (!await verifyCompanyAccess(user.id, company_id)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { data } = await getAdmin()
      .from("company_professionisti")
      .select("id, nome, categoria, email, status, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("professionisti GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const company_id = searchParams.get("company_id");
    if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });
    if (!await verifyCompanyAccess(user.id, company_id)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("company_professionisti")
      .insert({ company_id, ...body, status: "pending" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("professionisti POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const company_id = searchParams.get("company_id");
    const id = searchParams.get("id");
    if (!company_id || !id) return NextResponse.json({ error: "Params required" }, { status: 400 });
    if (!await verifyCompanyAccess(user.id, company_id)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    await getAdmin().from("company_professionisti").delete().eq("id", id).eq("company_id", company_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("professionisti DELETE error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
