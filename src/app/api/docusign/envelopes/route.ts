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
    .from("user_docusign_tokens")
    .select("access_token, account_id")
    .eq("user_id", user.id)
    .single();

  if (!tokenData || !tokenData.access_token || !tokenData.account_id) {
    return NextResponse.json({ error: "DocuSign non connesso" }, { status: 400 });
  }

  try {
    // DocuSign demo API base URL
    const baseUrl = `https://demo.docusign.net/restapi/v2.1/accounts/${tokenData.account_id}`;

    // Recupera gli ultimi 20 envelope degli ultimi 30 giorni
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const params = new URLSearchParams({
      from_date: fromDate.toISOString(),
      count: "20",
      order: "desc",
      order_by: "last_modified",
    });

    const res = await fetch(`${baseUrl}/envelopes?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("DocuSign envelopes error:", res.status, errBody);
      return NextResponse.json({ error: "Errore DocuSign API" }, { status: res.status });
    }

    const data = await res.json();

    const envelopes = (data.envelopes || []).map(
      (env: { envelopeId: string; emailSubject: string; status: string; sentDateTime: string; createdDateTime: string }) => ({
        id: env.envelopeId,
        subject: env.emailSubject || "",
        status: env.status,
        sentDate: env.sentDateTime || env.createdDateTime || "",
      })
    );

    return NextResponse.json({ envelopes });
  } catch (err) {
    console.error("DocuSign envelopes fetch error:", err);
    return NextResponse.json({ error: "Errore di connessione a DocuSign" }, { status: 500 });
  }
}
