"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import DualSidebar from "@/components/dashboard/DualSidebar";
import MainDashboard from "@/components/dashboard/MainDashboard";
import type { ProfVariant } from "@/lib/taxonomy";
import lazyDynamic from "next/dynamic";

const ModalBug = lazyDynamic(() => import("@/components/modals/ModalBug"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProfProfile {
  id: string;
  piano: string;
  query_incluse: number;
  query_usate_mese: number;
  trial_ends_at: string | null;
  nome_studio: string | null;
  specializzazione: string | null; // 'avvocato' | 'commercialista' | altro
}

interface Selection {
  macro: string;
  macroLabel: string;
  item: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const VARIANT_LABELS: Record<string, string> = {
  avvocato:       'Avvocato',
  commercialista: 'Commercialista',
  altro:          'Professionista',
};

function resolveVariant(spec: string | null | undefined): ProfVariant {
  if (spec === 'avvocato') return 'avvocato';
  if (spec === 'commercialista') return 'commercialista';
  return 'altro';
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardProfessionista() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profProfile, setProfProfile] = useState<ProfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showBug, setShowBug] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { router.replace("/"); return; }

      let role = u.user_metadata?.role as string | undefined;
      if (role !== "professionista") {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", u.id).single();
        role = p?.role ?? role;
      }
      if (role !== "professionista") {
        if (role === "impresa") { router.replace("/dashboard-impresa"); return; }
        if (role === "privato" || role === "cittadino") { router.replace("/dashboard-cittadino"); return; }
        router.replace("/");
        return;
      }
      setUser(u);

      // Load professional_profiles for variant + studio name
      const { data: pp } = await supabase
        .from("professional_profiles")
        .select("id, specializzazione, nome_studio")
        .eq("user_id", u.id)
        .maybeSingle();

      // Load subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, piano, query_incluse, query_usate_mese, trial_ends_at")
        .eq("user_id", u.id)
        .maybeSingle();

      if (sub || pp) {
        setProfProfile({
          id: sub?.id ?? pp?.id ?? u.id,
          piano: sub?.piano ?? 'professionista',
          query_incluse: sub?.query_incluse ?? 0,
          query_usate_mese: sub?.query_usate_mese ?? 0,
          trial_ends_at: sub?.trial_ends_at ?? null,
          nome_studio: pp?.nome_studio ?? null,
          specializzazione: pp?.specializzazione ?? u.user_metadata?.specializzazione ?? null,
        });
      }

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--paper-line)', borderTopColor: 'var(--vermiglio)', borderRadius: '50%', animation: 'mdSpin 0.8s linear infinite' }} />
      </div>
    );
  }

  const variant = resolveVariant(profProfile?.specializzazione);
  const variantLabel = VARIANT_LABELS[variant] ?? 'Professionista';
  const studioName = profProfile?.nome_studio || user?.user_metadata?.nome_studio || '';
  const displayName = studioName || user?.user_metadata?.nome || user?.email?.split('@')[0] || '';
  const trialDays = profProfile?.trial_ends_at ? daysUntil(profProfile.trial_ends_at) : null;
  const isTrial = trialDays !== null && trialDays > 0;
  const queryPct = profProfile?.query_incluse
    ? Math.min(100, Math.round((profProfile.query_usate_mese / profProfile.query_incluse) * 100))
    : 0;

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
            {displayName && (
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--sans)', color: 'var(--ink-1)' }}>
                {displayName}
              </span>
            )}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-4)', textTransform: 'uppercase', marginLeft: 10 }}>
              {variantLabel} · €29/mese
            </span>
          </div>

          {/* Query pool */}
          {profProfile && profProfile.query_incluse > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                {profProfile.query_usate_mese.toLocaleString('it-IT')} / {profProfile.query_incluse.toLocaleString('it-IT')} query
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
            <button onClick={() => setShowBug(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 016 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
            </button>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--vermiglio)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
              {displayName.charAt(0) || 'P'}
            </div>
          </div>
        </header>

        {/* ── Dashboard body: DualSidebar + MainDashboard ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <DualSidebar
            role="prof"
            variant={variant}
            user={{
              name: displayName,
              initials: displayName.slice(0, 2).toUpperCase() || 'AG',
              subtitle: `${variantLabel.toUpperCase()} · PROFESSIONISTA`,
            }}
            locked={false}
            active={selection ? { macro: selection.macro, item: selection.item } : null}
            onNav={handleSidebarNav}
          />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <MainDashboard
              role="prof"
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
              piano={profProfile?.piano ?? 'professionista'}
            />
          </div>
        </div>
      </div>

      {showBug && <ModalBug open={showBug} onClose={() => setShowBug(false)} />}
    </>
  );
}
