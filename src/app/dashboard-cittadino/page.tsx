"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import DualSidebar from "@/components/dashboard/DualSidebar";
import MainDashboard from "@/components/dashboard/MainDashboard";
import lazyDynamic from "next/dynamic";
import { type Selection, daysUntil, LoadingSpinner } from "@/lib/dashboard-utils";

const ModalBug = lazyDynamic(() => import("@/components/modals/ModalBug"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CitizenProfile {
  id: string;
  piano: string;
  query_incluse: number;
  query_usate_mese: number;
  trial_ends_at: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Selection + daysUntil + LoadingSpinner importati da @/lib/dashboard-utils

const PIANO_LABELS: Record<string, string> = {
  gratis:        'Piano Gratuito',
  cittadino_pro: 'Cittadino PRO',
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardCittadino() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showBug, setShowBug] = useState(false);

  useEffect(() => {
    // The role-specific dashboards are desktop-only layouts (no media queries,
    // no safe-area-inset). On a mobile viewport, send the user to /mobile,
    // which is the personalised mobile home (Voice/Chat/Lead/Archivio).
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.replace("/mobile");
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { router.replace("/"); return; }

      let role = u.user_metadata?.role as string | undefined;
      if (role !== "privato" && role !== "cittadino") {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", u.id).single();
        role = p?.role ?? role;
      }
      if (role !== "privato" && role !== "cittadino") {
        if (role === "impresa") { router.replace("/dashboard-impresa"); return; }
        if (role === "professionista") { router.replace("/dashboard-professionista"); return; }
        router.replace("/");
        return;
      }
      setUser(u);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, piano, query_incluse, query_usate_mese, trial_ends_at")
        .eq("user_id", u.id)
        .maybeSingle();
      if (sub) setProfile(sub as CitizenProfile);

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleSidebarNav = (payload: string | { macro: { key: string; label: string }; item: string | null }) => {
    if (typeof payload === 'string') {
      if (payload === 'upgrade') router.push('/upgrade');
      return;
    }
    if (payload.macro.key === '__dashboard__') { setSelection({ macro: '__dashboard__', macroLabel: 'Dashboard', item: null }); return; }
    setSelection({ macro: payload.macro.key, macroLabel: payload.macro.label, item: payload.item });
  };

  if (loading) return <LoadingSpinner />;

  const firstName = user?.user_metadata?.nome || user?.email?.split('@')[0] || '';
  const pianoLabel = PIANO_LABELS[profile?.piano ?? ''] ?? 'Piano Gratuito';
  const isPro = profile?.piano === 'cittadino_pro';
  const trialDays = profile?.trial_ends_at ? daysUntil(profile.trial_ends_at) : null;
  const isTrial = trialDays !== null && trialDays > 0;
  const queryPct = profile ? Math.min(100, Math.round((profile.query_usate_mese / profile.query_incluse) * 100)) : 0;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--paper)', overflow: 'hidden' }}>

        {/* ── Top header bar ── */}
        <header style={{
          display: 'flex', alignItems: 'center', padding: '0 24px',
          height: 52, borderBottom: '1px solid var(--paper-line)',
          background: 'white', flexShrink: 0, gap: 16, zIndex: 10,
        }}>
          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {firstName && (
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--sans)', color: 'var(--ink-1)' }}>
                {firstName}
              </span>
            )}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginLeft: 10 }}>
              {pianoLabel}
            </span>
          </div>

          {/* Query pool (only for PRO) */}
          {isPro && profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                {profile.query_usate_mese.toLocaleString('it-IT')} / {profile.query_incluse.toLocaleString('it-IT')} query
              </span>
              <div style={{ width: 72, height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${queryPct}%`, height: '100%', background: queryPct > 90 ? 'var(--vermiglio)' : queryPct > 70 ? 'var(--ambra)' : 'var(--alloro)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Trial badge */}
          {isTrial && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'rgba(212,160,23,0.12)', color: '#8B6800', border: '1px solid rgba(212,160,23,0.25)', padding: '3px 8px', borderRadius: 4 }}>
              TRIAL · {trialDays}g
            </span>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isPro && (
              <button
                onClick={() => router.push('/upgrade')}
                style={{ background: 'var(--vermiglio)', border: 'none', borderRadius: 6, padding: '6px 12px', fontFamily: 'var(--sans)', fontSize: 12, color: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Passa a PRO · €9/mese
              </button>
            )}
            <button onClick={() => setShowBug(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 016 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
            </button>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--vermiglio)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
              {firstName.charAt(0) || 'C'}
            </div>
          </div>
        </header>

        {/* ── Dashboard body: DualSidebar + MainDashboard ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <DualSidebar
            role="cittadino"
            user={{
              name: firstName,
              initials: firstName.slice(0, 2).toUpperCase() || 'MR',
              subtitle: `CITTADINO · ${pianoLabel.toUpperCase()}`,
            }}
            locked={false}
            active={selection ? { macro: selection.macro, item: selection.item } : null}
            onNav={handleSidebarNav}
          />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <MainDashboard
              role="cittadino"
              selection={selection}
              onBack={() => {
                if (selection?.item) {
                  setSelection({ ...selection, item: null });
                } else {
                  setSelection(null);
                }
              }}
              onNav={(dest: string) => {
                if (dest === 'upgrade') router.push('/upgrade');
              }}
              onPickMacro={(key, label) => setSelection({ macro: key, macroLabel: label, item: null })}
              piano={profile?.piano ?? 'gratis'}
            />
          </div>
        </div>
      </div>

      {showBug && <ModalBug open={showBug} onClose={() => setShowBug(false)} />}
    </>
  );
}
