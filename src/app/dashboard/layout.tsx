import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = [
  "francesco@servizidigitali24.online",
  "agenticsimpermeo@gmail.com",
];

export default async function InvestorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ALLOWED_EMAILS.includes(user.email ?? "")) {
    redirect("/");
  }

  return <>{children}</>;
}
