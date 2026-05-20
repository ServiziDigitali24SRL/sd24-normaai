/**
 * /chat — NormaAI chat editorial (handoff design SER-209).
 * Step 3 del frontend reskin: porta MainChat (schermo 01 del template
 * Claude Design) come client component Next.js.
 *
 * NOTA: questo commit ports solo l'UI. Il composer fa optimistic-update
 * locale ma NON chiama ancora /api/chat. Wire backend in commit successivo.
 */

import type { Metadata } from "next";
import { MainChat } from "@/components/handoff/MainChat";

export const metadata: Metadata = {
  title: "Chat legale — NormaAI",
  description: "Consultazione AI sulla normativa italiana con fonti citate.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return <MainChat />;
}
