export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: {"Content-Type":"application/json"} });
  }
  throw new Error("Sentry Example API Route Error");
}
