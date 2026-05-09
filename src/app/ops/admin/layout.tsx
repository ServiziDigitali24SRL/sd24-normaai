// SER-164 / Tab 4 — /ops/admin auth gate (Opzione B: Supabase Auth + email allowlist).
//
// Usa il sistema auth Supabase già attivo in prod (vedi src/middleware.ts).
// Solo email in OPS_ADMIN_ALLOWLIST passano. Tutto il resto → redirect a '/'
// (login flow attualmente gestito sulla homepage).
//
// Allowlist hard-coded inizialmente (1 email Francesco). Se in futuro
// serviranno altri ops, spostare a tabella public.ops_allowlist.

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const OPS_ADMIN_ALLOWLIST: ReadonlySet<string> = new Set([
  'francesco@servizidigitali24.online',
]);

export default async function OpsAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user || !user.email || !OPS_ADMIN_ALLOWLIST.has(user.email)) {
    redirect('/?next=/ops/admin');
  }

  return (
    <div data-ops-admin="true" className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">NormaAI · Ops Admin</h1>
          <p className="text-xs text-zinc-400">{user.email}</p>
        </div>
        <span className="text-xs text-zinc-500">SER-164 · SQ-OPS</span>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
