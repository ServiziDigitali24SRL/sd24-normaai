import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = [
  "francesco@servizidigitali24.online",
  "agenticsimpermeo@gmail.com",
];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Plan prices in € for MRR calculation
const PLAN_PRICES: Record<string, number> = {
  pro: 29,
  professional: 29,
  professionista: 29,
  impresa: 29,
  impresa_micro: 29,
  impresa_piccola: 149,
  impresa_media: 299,
  impresa_grande: 599,
  cittadino_pro: 9,
  trial: 0,
  free: 0,
  paused: 0,
  cancelled: 0,
};

export async function GET(_req: NextRequest) {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !ALLOWED_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getServiceClient();

  try {
    // 1. Total registered users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 2. Messages today (proxy for "domande oggi")
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: messagesToday } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", todayStart.toISOString());

    // 3. Paying subscribers (plan != free/trial/paused/cancelled/null)
    const { count: payingSubscribers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("plan", "is", null)
      .not("plan", "in", '("free","trial","paused","cancelled")');

    // 4. MRR: sum plan prices for active subscribers
    const { data: activePlans } = await supabase
      .from("profiles")
      .select("plan")
      .not("plan", "is", null)
      .not("plan", "in", '("free","trial","paused","cancelled")');

    const mrr = (activePlans ?? []).reduce((sum, row) => {
      const price = PLAN_PRICES[row.plan as string] ?? 0;
      return sum + price;
    }, 0);

    // 5. New users per day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: newUsersRaw } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Group by day
    const usersByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      usersByDay[key] = 0;
    }
    (newUsersRaw ?? []).forEach((row) => {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      if (key in usersByDay) usersByDay[key]++;
    });
    const newUsersChart = Object.entries(usersByDay).map(([date, count]) => ({
      date,
      count,
    }));

    // 6. Messages per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: messagesRaw } = await supabase
      .from("messages")
      .select("created_at")
      .eq("role", "user")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const messagesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      messagesByDay[key] = 0;
    }
    (messagesRaw ?? []).forEach((row) => {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      if (key in messagesByDay) messagesByDay[key]++;
    });
    const messagesChart = Object.entries(messagesByDay).map(
      ([date, count]) => ({ date, count })
    );

    return NextResponse.json({
      kpis: {
        totalUsers: totalUsers ?? 0,
        messagesToday: messagesToday ?? 0,
        payingSubscribers: payingSubscribers ?? 0,
        mrr,
      },
      charts: {
        newUsers: newUsersChart,
        messages: messagesChart,
      },
    });
  } catch (err) {
    console.error("[ADMIN KPIs]", err);
    return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
  }
}
