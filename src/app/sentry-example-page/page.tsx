import { notFound } from "next/navigation";

// Sentry example page — disponibile solo in development.
export default function Page() {
  // Mai mostrare in produzione
  notFound();
}
