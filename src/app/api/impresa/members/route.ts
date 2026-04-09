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
    const type = searchParams.get("type");

    if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });
    if (!await verifyCompanyAccess(user.id, company_id)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const supabase = getAdmin();

    if (type === "ruoli") {
      const { data } = await supabase
        .from("company_ruoli")
        .select("id, nome, permesso, n_membri")
        .eq("company_id", company_id)
        .order("ordine", { ascending: true });
      return NextResponse.json(data ?? []);
    }

    const { data } = await supabase
      .from("company_members")
      .select("id, full_name, email, ruolo, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: true });

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("members GET error:", e);
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

    // Add ruolo
    if (body.ruolo) {
      const { count } = await supabase.from("company_ruoli").select("*", { count: "exact", head: true }).eq("company_id", company_id);
      await supabase.from("company_ruoli").insert({
        company_id,
        nome: body.ruolo.nome,
        permesso: body.ruolo.permesso ?? "full",
        n_membri: 0,
        ordine: (count ?? 0) + 1,
      });
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Add ruoli array (from onboarding)
    if (Array.isArray(body.ruoli)) {
      const rows = body.ruoli.map((nome: string, i: number) => ({ company_id, nome, permesso: "full", n_membri: 0, ordine: i + 1 }));
      await supabase.from("company_ruoli").insert(rows);
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Invite member
    const { data, error } = await supabase
      .from("company_members")
      .insert({ company_id, ...body })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("members POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    // Update company profile data (from onboarding step 2)
    if (body.ragione_sociale !== undefined) {
      await supabase
        .from("company_profiles")
        .update({ ragione_sociale: body.ragione_sociale, p_iva: body.p_iva, settore: body.settore, n_dipendenti: body.n_dipendenti })
        .eq("id", company_id);
      return NextResponse.json({ ok: true });
    }

    // Update ruolo permesso
    if (body.ruolo_id) {
      await supabase
        .from("company_ruoli")
        .update({ permesso: body.permesso })
        .eq("id", body.ruolo_id)
        .eq("company_id", company_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (e) {
    console.error("members PATCH error:", e);
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
    const ruolo_id = searchParams.get("ruolo_id");
    if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });
    if (!await verifyCompanyAccess(user.id, company_id)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const supabase = getAdmin();
    if (ruolo_id) {
      await supabase.from("company_ruoli").delete().eq("id", ruolo_id).eq("company_id", company_id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("members DELETE error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
