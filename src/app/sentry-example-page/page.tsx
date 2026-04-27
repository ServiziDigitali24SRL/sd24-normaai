import { notFound } from "next/navigation";
import SentryExampleClient from "./_client";

export default function Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <SentryExampleClient />;
}
