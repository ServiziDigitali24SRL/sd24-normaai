import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: tokenData } = await supabase
    .from("user_adobesign_tokens")
    .select("access_token, api_access_point")
    .eq("user_id", user.id)
    .single();

  if (!tokenData || !tokenData.access_token) {
    return NextResponse.json({ error: "Adobe Sign non connesso" }, { status: 400 });
  }

  try {
    const apiBase = tokenData.api_access_point || "https://api.adobesign.com/";

    const res = await fetch(
      `${apiBase}api/rest/v6/agreements?pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Adobe Sign agreements error:", res.status, errBody);
      return NextResponse.json({ error: "Errore Adobe Sign API" }, { status: res.status });
    }

    const data = await res.json();

    const agreements = (data.userAgreementList || []).map(
      (agr: { id: string; name: string; status: string; createdDate: string }) => ({
        id: agr.id,
        name: agr.name || "",
        status: agr.status,
        createdDate: agr.createdDate || "",
      })
    );

    return NextResponse.json({ agreements });
  } catch (err) {
    console.error("Adobe Sign agreements fetch error:", err);
    return NextResponse.json({ error: "Errore di connessione ad Adobe Sign" }, { status: 500 });
  }
}
