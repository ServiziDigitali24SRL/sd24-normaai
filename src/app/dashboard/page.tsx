"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  created_at: string;
  tipo: "privato" | "impresa";
  materia: string;
  descrizione: string;
  citta: string;
  prezzo: number;
  status: "disponibile" | "acquistato" | "scaduto";
  nome_cliente?: string;
  email_cliente?: string;
  telefono_cliente?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MATERIA_COLOR: Record<string, string> = {
  "Diritto civile":          "text-blue-400   bg-blue-500/10   border-blue-500/20",
  "Diritto penale":          "text-red-400    bg-red-500/10    border-red-500/20",
  "Diritto del lavoro":      "text-green-400  bg-green-500/10  border-green-500/20",
  "Diritto tributario":      "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Diritto amministrativo":  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Diritto commerciale":     "text-orange-400 bg-orange-500/10 border-orange-500/20",
};
const getMateriaColor = (m: string) => MATERIA_COLOR[m] ?? "text-accent bg-accent/10 border-accent/20";

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // derivati
  const userRole   = user?.user_metadata?.role as string | undefined;
  const userName   = user?.user_metadata?.full_name || user?.user_metadata?.ragione_sociale || user?.email?.split("@")[0] || "";
  const userEmail  = user?.email || "";
  const categoria  = user?.user_metadata?.categoria as string | undefined;
  const piano      = (user?.user_metadata?.piano as string | undefined) ?? "Base";
  const roleLabel  = userRole === "privato" ? "Cittadino" : userRole === "impresa" ? "Impresa" : userRole === "professionista" ? "Professionista" : null;

  // Auth check ─ redirect se non loggato
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/"); return; }
      setUser(data.user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.replace("/");
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    setSidebarOpen(saved !== null ? saved === "true" : window.innerWidth >= 1024);
    const handler = (e: Event) => setSidebarOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("sb-toggle", handler);
    return () => window.removeEventListener("sb-toggle", handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem("sb-open", String(next));
      window.dispatchEvent(new CustomEvent("sb-toggle", { detail: next }));
      return next;
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Sidebar
        onOpenModal={() => {}}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        user={user}
        onLogout={handleLogout}
      />

      <div className={`flex flex-col min-h-screen bg-[#FAFAF8] transition-[margin] duration-[250ms] ease-in-out ${sidebarOpen ? "lg:ml-[240px] ml-0" : "ml-0"}`}>

        {/* Topbar */}
        <div className="flex items-center px-4 py-3 border-b border-[#E5E1D8] bg-[#FAFAF8] sticky top-0 z-[100]">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex flex-col items-center justify-center gap-[5px] mr-3 rounded-md text-[#6B6763] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] transition-all shrink-0"
          >
            <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-4" : "w-5"}`} />
            <span className="block w-5 h-[1.5px] bg-current" />
            <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-4" : "w-5"}`} />
          </button>
          <div className={`font-serif text-[17px] tracking-[-0.5px] mr-auto transition-all duration-[250ms] overflow-hidden ${sidebarOpen ? "lg:w-0 lg:opacity-0 w-auto opacity-100" : "w-auto opacity-100"}`}>
            Norma<span className="text-accent">AI</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Link href="/" className="text-[12px] text-[#6B6763] hover:text-[#1a1a1a] border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-lg px-3 py-[6px] transition-colors hidden sm:block">
              ← Torna alla chat
            </Link>
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-semibold text-accent uppercase shrink-0">
              {userName.charAt(0)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-[860px] w-full mx-auto px-4 py-8">
          {/* Hero header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[17px] font-semibold text-accent uppercase shrink-0">
              {userName.charAt(0)}
            </div>
            <div>
              <div className="text-[#1a1a1a] text-[17px] font-semibold leading-tight">{userName}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {categoria && <span className="text-[11px] text-[#6B6763]">{categoria}</span>}
                {roleLabel && <span className="text-[11px] text-[#6B6763]">· {roleLabel}</span>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${piano === "Pro" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" : "text-accent bg-accent/10 border-accent/20"}`}>
                  Piano {piano}
                </span>
              </div>
              <div className="text-[11px] text-[#7A766F] mt-0.5">{userEmail}</div>
            </div>
          </div>

          {/* Role-based dashboard */}
          {userRole === "professionista" && (
            <ProfessionistaDashboard user={user!} supabase={supabase} piano={piano} categoria={categoria} />
          )}
          {userRole === "impresa" && (
            <ImpresaDashboard piano={piano} />
          )}
          {(userRole === "privato" || !userRole) && (
            <CittadinoDashboard piano={piano} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── PROFESSIONISTA ──────────────────────────────────────────────────────────

function ProfessionistaDashboard({ user, supabase, piano, categoria }: { user: User; supabase: ReturnType<typeof createClient>; piano: string; categoria?: string }) {
  type Tab = "lead" | "miei" | "strumenti" | "wallet" | "abbonamento";
  const [tab, setTab] = useState<Tab>("lead");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [acquistati, setAcquistati] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const walletCrediti: number = (user.user_metadata?.wallet_crediti as number) ?? 0;

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      try {
        const [{ data: disp }, { data: miei }] = await Promise.all([
          supabase.from("marketplace_leads").select("*").eq("status", "disponibile").order("created_at", { ascending: false }).limit(25),
          supabase.from("marketplace_leads").select("*").eq("assigned_to", user.id).order("created_at", { ascending: false }).limit(25),
        ]);
        setLeads(disp ?? []);
        setAcquistati(miei ?? []);
      } catch { /* tabella non ancora creata */ }
      finally { setLoading(false); }
    }
    fetchLeads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function buyLead(lead: Lead) {
    const prezzo = lead.prezzo ?? (lead.tipo === "impresa" ? LEAD_PREZZI.impresa : LEAD_PREZZI.privato);
    if (walletCrediti < prezzo) {
      showToast(`Crediti insufficienti. Ricarica il wallet (servono €${prezzo}).`);
      setTab("wallet");
      return;
    }
    setBuyingId(lead.id);
    try {
      const res = await fetch("/api/wallet/acquista-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, userId: user.id, importo: prezzo }),
      });
      if (res.ok) {
        showToast("Lead acquistato! Vai su 'I miei lead' per i contatti.");
        setLeads(p => p.filter(l => l.id !== lead.id));
        return;
      }
      showToast("Errore nell'acquisto. Riprova tra poco.");
    } catch { showToast("Errore. Riprova tra poco."); }
    finally { setBuyingId(null); }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "lead",       label: "Lead disponibili", badge: leads.length || undefined },
    { id: "miei",       label: "I miei lead",      badge: acquistati.length || undefined },
    { id: "strumenti",  label: "Strumenti" },
    { id: "wallet",     label: "Wallet" },
    { id: "abbonamento",label: "Abbonamento" },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Lead disponibili" value={loading ? "…" : String(leads.length)} color="text-accent" />
        <StatCard label="Lead acquistati"  value={loading ? "…" : String(acquistati.length)} color="text-green-400" />
        <StatCard label="Crediti wallet"   value={`€${walletCrediti}`} color="text-yellow-400" />
        <StatCard label="Piano attivo"     value={piano} color="text-[#9A9690]" />
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {/* Lead disponibili */}
      {tab === "lead" && (
        <div className="mt-4 space-y-3">
          {loading && <Spinner />}
          {!loading && leads.length === 0 && (
            <EmptyState icon="📭" title="Nessun lead disponibile" sub="I lead vengono generati dai privati che usano NormaAI. Ti notificheremo non appena ne arrivano di nuovi nella tua area." />
          )}
          {!loading && leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} showBuy onBuy={() => buyLead(lead)} buying={buyingId === lead.id} />
          ))}
        </div>
      )}

      {/* I miei lead */}
      {tab === "miei" && (
        <div className="mt-4 space-y-3">
          {loading && <Spinner />}
          {!loading && acquistati.length === 0 && (
            <EmptyState icon="🎯" title="Nessun lead acquistato ancora" sub="I lead che acquisti appaiono qui con tutti i dettagli di contatto." />
          )}
          {!loading && acquistati.map(lead => (
            <LeadCard key={lead.id} lead={lead} showBuy={false} acquired />
          ))}
        </div>
      )}

      {/* Strumenti */}
      {tab === "strumenti" && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "⚖️", title: "Analisi Contratto", desc: "Analisi AI completa con criticità ALTO/MEDIO/BASSO", href: "/" },
            { icon: "📝", title: "Bozze professionali", desc: "Parere legale, email, memoria difensiva, bozza contratto", href: "/" },
            { icon: "🧮", title: "Calcolo Parcelle", desc: "Onorari professionali DM 147/2022 — 6 tipi di pratica", href: "/?tool=parcelle" },
            { icon: "📄", title: "Analisi documento", desc: "Upload PDF/DOCX/immagine — analisi strutturata in 5 sezioni", href: "/?tool=analisi-doc" },
          ].map(s => (
            <Link key={s.title} href={s.href} className="bg-white border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-xl p-4 transition-colors group">
              <div className="text-[22px] mb-2">{s.icon}</div>
              <div className="text-[#1a1a1a] text-[13px] font-semibold mb-1 group-hover:text-accent transition-colors">{s.title}</div>
              <div className="text-[12px] text-[#6B6763] leading-[1.5]">{s.desc}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Wallet */}
      {tab === "wallet" && <WalletSection walletCrediti={walletCrediti} />}

      {/* Abbonamento */}
      {tab === "abbonamento" && <AbbonamentoSection piano={piano} ruolo="professionista" categoria={categoria} />}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ─── IMPRESA ─────────────────────────────────────────────────────────────────

function ImpresaDashboard({ piano }: { piano: string }) {
  type Tab = "panoramica" | "abbonamento";
  const [tab, setTab] = useState<Tab>("panoramica");

  const TABS = [
    { id: "panoramica",  label: "Panoramica" },
    { id: "abbonamento", label: "Abbonamento" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Piano attivo" value={piano} color="text-accent" />
        <StatCard label="Query AI disponibili" value="Illimitate" color="text-green-400" />
        <StatCard label="Verticali coperti" value="5" color="text-[#9A9690]" />
      </div>

      <TabBar tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {tab === "panoramica" && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "💬", title: "Consulta la normativa",    desc: "Fai una domanda su GDPR, sicurezza lavoro, contratti, appalti", href: "/" },
            { icon: "📄", title: "Analisi documento",        desc: "Carica contratti, delibere, atti — analisi AI strutturata",     href: "/?tool=analisi-doc" },
            { icon: "📁", title: "I tuoi archivi",           desc: "Organizza documenti e conversazioni per progetto o cliente",    href: "/" },
            { icon: "🔗", title: "Connettori",               desc: "Collega Gmail, Drive, OneDrive, DocuSign per analisi diretta",  href: "/" },
          ].map(s => (
            <Link key={s.title} href={s.href} className="bg-white border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-xl p-4 transition-colors group">
              <div className="text-[22px] mb-2">{s.icon}</div>
              <div className="text-[#1a1a1a] text-[13px] font-semibold mb-1 group-hover:text-accent transition-colors">{s.title}</div>
              <div className="text-[12px] text-[#6B6763] leading-[1.5]">{s.desc}</div>
            </Link>
          ))}
        </div>
      )}

      {tab === "abbonamento" && <AbbonamentoSection piano={piano} ruolo="impresa" />}
    </div>
  );
}

// ─── CITTADINO ────────────────────────────────────────────────────────────────

function CittadinoDashboard({ piano }: { piano: string }) {
  type Tab = "panoramica" | "professionisti" | "abbonamento";
  const [tab, setTab] = useState<Tab>("panoramica");

  const TABS = [
    { id: "panoramica",     label: "Panoramica" },
    { id: "professionisti", label: "I miei professionisti" },
    { id: "abbonamento",    label: "Abbonamento" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Piano attivo"         value={piano}        color="text-accent" />
        <StatCard label="Query AI disponibili" value="Illimitate"   color="text-green-400" />
        <StatCard label="Guide gratuite"       value="46+"          color="text-[#9A9690]" />
      </div>

      <TabBar tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {tab === "panoramica" && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "💬", title: "Fai una domanda",       desc: "Cerca nella legislazione italiana con l'AI normativo",            href: "/" },
            { icon: "📄", title: "Analisi documento",     desc: "Carica un contratto, una multa, una sentenza — analisi gratuita", href: "/?tool=analisi-doc" },
            { icon: "👤", title: "Trova un professionista", desc: "Avvocati, commercialisti, ingegneri abilitati su NormaAI",      href: "/" },
            { icon: "📚", title: "Guide gratuite",        desc: "46 guide su diritto del lavoro, fisco, condominio e molto altro", href: "/guide" },
          ].map(s => (
            <Link key={s.title} href={s.href} className="bg-white border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-xl p-4 transition-colors group">
              <div className="text-[22px] mb-2">{s.icon}</div>
              <div className="text-[#1a1a1a] text-[13px] font-semibold mb-1 group-hover:text-accent transition-colors">{s.title}</div>
              <div className="text-[12px] text-[#6B6763] leading-[1.5]">{s.desc}</div>
            </Link>
          ))}
        </div>
      )}

      {tab === "professionisti" && (
        <div className="mt-4">
          <EmptyState icon="👤" title="Nessun professionista ancora" sub="Quando NormaAI ti mette in contatto con un professionista, apparirà qui con tutti i suoi dati e lo storico delle comunicazioni." />
        </div>
      )}

      {tab === "abbonamento" && <AbbonamentoSection piano={piano} ruolo="privato" />}
    </div>
  );
}

// ─── SEZIONE ABBONAMENTO (condivisa) ─────────────────────────────────────────

const FEATURES: Record<string, string[]> = {
  privato: [
    "Query illimitate all'AI normativo",
    "Analisi documenti (PDF, DOCX, immagini)",
    "Cronologia e archivio conversazioni",
    "Connettori Gmail, Drive, WhatsApp e altri",
    "Guide gratuite su tutte le aree legali",
  ],
  impresa: [
    "Query illimitate all'AI normativo",
    "Analisi documenti aziendali (contratti, delibere)",
    "5 verticali: lavoro, fisco, legale, tecnico, finanza",
    "Archivi per progetto o cliente",
    "Connettori aziendali (Drive, OneDrive, DocuSign)",
    "Referral automatico a professionisti specializzati",
  ],
  professionista: [
    "Query illimitate all'AI normativo",
    "Accesso ai lead qualificati dal marketplace",
    "Profilo nella directory pubblica",
    "Analisi contratto + Bozze professionali",
    "Calcolo parcelle DM 147/2022",
    "Connettori: Gmail, DocuSign, Adobe Sign",
  ],
};

const PREZZI: Record<string, string> = { privato: "9", impresa: "29", professionista: "29" };
const LEAD_PREZZI = { privato: 75, impresa: 150 };

function AbbonamentoSection({ piano, ruolo, categoria }: { piano: string; ruolo: string; categoria?: string }) {
  const features = FEATURES[ruolo] ?? FEATURES.privato;
  const prezzo   = PREZZI[ruolo] ?? "29";

  return (
    <div className="mt-4 space-y-4">
      {/* Piano card */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[#1a1a1a] text-[14px] font-semibold">Piano {piano}</div>
            <div className="text-[12px] text-[#6B6763] mt-0.5">
              {ruolo === "professionista" ? (categoria ?? "Professionista NormaAI") : ruolo === "impresa" ? "Impresa" : "Cittadino"}
            </div>
          </div>
          <span className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 shrink-0">Attivo</span>
        </div>

        <div className="space-y-2 mb-5">
          {features.map(f => (
            <div key={f} className="flex items-center gap-2 text-[12.5px] text-[#9A9690]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-accent fill-none stroke-[2.5]"><polyline points="20,6 9,17 4,12" /></svg>
              {f}
            </div>
          ))}
        </div>

        <div className="border-t border-[#E5E1D8] pt-4 flex items-center justify-between">
          <div>
            <span className="text-[#1a1a1a] text-[20px] font-semibold">€{prezzo}</span>
            <span className="text-[12px] text-[#6B6763]">/mese</span>
            {piano !== "Pro" && <span className="text-[11px] text-[#7A766F] ml-2">· 14 gg gratis al primo accesso</span>}
          </div>
          <button
            onClick={() => window.open("https://billing.stripe.com", "_blank")}
            className="text-[12px] text-[#6B6763] border border-[#E5E1D8] hover:border-[#C8C2BA] hover:text-[#7A766F] rounded-lg px-4 py-2 transition-colors"
          >
            Gestisci →
          </button>
        </div>
      </div>

      {/* Lead pricing — solo professionista */}
      {ruolo === "professionista" && (
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-4">
          <h3 className="text-[13px] text-[#1a1a1a] font-medium mb-3">Lead — prezzi dal wallet</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-[12.5px]"><span className="text-[#9A9690]">Lead privato (persona fisica)</span><span className="text-[#1a1a1a] font-medium">€75</span></div>
            <div className="flex justify-between text-[12.5px]"><span className="text-[#9A9690]">Lead impresa / società</span><span className="text-[#1a1a1a] font-medium">€150</span></div>
          </div>
          <p className="text-[11px] text-[#7A766F] mt-3">I crediti si scalano dal wallet. Nessun obbligo, i crediti non scadono mai.</p>
        </div>
      )}
    </div>
  );
}

// ─── WALLET ──────────────────────────────────────────────────────────────────

const PACCHETTI = [
  { crediti: 150,  prezzo: 150,  label: "Starter",  badge: null },
  { crediti: 325,  prezzo: 300,  label: "Base",      badge: "Risparmi €25" },
  { crediti: 700,  prezzo: 600,  label: "Pro",       badge: "Risparmi €100" },
  { crediti: 1500, prezzo: 1200, label: "Business",  badge: "Risparmi €300" },
];

function WalletSection({ walletCrediti }: { walletCrediti: number }) {
  async function ricarica(prezzo: number) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "wallet", importo: prezzo }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      }
    } catch { /* silent */ }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Saldo attuale */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] text-[#6B6763]">Saldo wallet</span>
          <span className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">I crediti non scadono</span>
        </div>
        <div className="text-[#1a1a1a] text-[36px] font-semibold font-serif tracking-tight">
          €{walletCrediti}
        </div>
        <p className="text-[12px] text-[#7A766F] mt-1">
          Lead privato €75 · Lead impresa €150 · Scalati automaticamente all&apos;acquisto
        </p>
      </div>

      {/* Pacchetti ricarica */}
      <div>
        <h3 className="text-[13px] text-[#1a1a1a] font-medium mb-3">Ricarica wallet</h3>
        <div className="grid grid-cols-2 gap-3">
          {PACCHETTI.map(p => (
            <button
              key={p.prezzo}
              onClick={() => ricarica(p.prezzo)}
              className="bg-white border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-xl p-4 text-left transition-colors group"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-[#1a1a1a] text-[13px] font-semibold">{p.label}</span>
                {p.badge && (
                  <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">{p.badge}</span>
                )}
              </div>
              <div className="text-[22px] font-semibold text-[#1a1a1a] font-serif">€{p.prezzo}</div>
              <div className="text-[12px] text-[#6B6763] mt-1">{p.crediti} crediti</div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#7A766F] mt-3">Pagamento sicuro via Stripe. I crediti non scadono mai e sono trasferibili tra device.</p>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string; badge?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-[#E5E1D8] mb-1">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${active === t.id ? "border-accent text-[#1a1a1a]" : "border-transparent text-[#6B6763] hover:text-[#7A766F]"}`}
        >
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="text-[10px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl p-4">
      <div className={`text-[20px] font-semibold leading-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-[#6B6763] mt-0.5">{label}</div>
    </div>
  );
}

function LeadCard({ lead, showBuy, onBuy, buying, acquired }: { lead: Lead; showBuy: boolean; onBuy?: () => void; buying?: boolean; acquired?: boolean }) {
  return (
    <div className="bg-white border border-[#E5E1D8] hover:border-[#C8C2BA] rounded-xl p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-[10.5px] font-medium border rounded-full px-2.5 py-0.5 ${getMateriaColor(lead.materia)}`}>{lead.materia}</span>
            <span className={`text-[10.5px] border rounded-full px-2.5 py-0.5 ${lead.tipo === "impresa" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" : "text-[#9A9690] bg-[#F0EDE8] border-[#E5E1D8]"}`}>
              {lead.tipo === "impresa" ? "Impresa" : "Privato"}
            </span>
            {lead.citta && <span className="text-[10.5px] text-[#6B6763]">📍 {lead.citta}</span>}
            <span className="text-[10.5px] text-[#7A766F] ml-auto">{timeAgo(lead.created_at)}</span>
          </div>
          <p className="text-[13px] text-[#3D3A37] leading-[1.5] line-clamp-2">
            {lead.descrizione || "Cliente cerca consulenza professionale. Acquista per vedere i dettagli completi."}
          </p>
          {/* Dettagli contatto — visibili solo dopo acquisto */}
          {acquired && (lead.nome_cliente || lead.email_cliente || lead.telefono_cliente) && (
            <div className="mt-3 pt-3 border-t border-[#E5E1D8] flex flex-wrap gap-3 text-[12px]">
              {lead.nome_cliente    && <span className="text-[#1a1a1a]">👤 {lead.nome_cliente}</span>}
              {lead.email_cliente   && <a href={`mailto:${lead.email_cliente}`} className="text-accent hover:underline">✉️ {lead.email_cliente}</a>}
              {lead.telefono_cliente && <a href={`tel:${lead.telefono_cliente}`} className="text-accent hover:underline">📞 {lead.telefono_cliente}</a>}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {showBuy && (
            <>
              <span className="text-[#1a1a1a] text-[16px] font-semibold">€{lead.prezzo ?? (lead.tipo === "impresa" ? LEAD_PREZZI.impresa : LEAD_PREZZI.privato)}</span>
              <button
                onClick={onBuy}
                disabled={buying}
                className="text-[12px] bg-accent text-white rounded-lg px-3 py-1.5 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {buying
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  : "Acquista →"}
              </button>
            </>
          )}
          {acquired && (
            <span className="text-[10.5px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">Acquistato</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="text-[40px] mb-3">{icon}</div>
      <p className="text-[14px] text-[#1a1a1a] font-medium mb-2">{title}</p>
      <p className="text-[12.5px] text-[#6B6763] max-w-[360px] leading-[1.6]">{sub}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] bg-[#F0EDE8] border border-[#D5D0C8] text-[#1a1a1a] text-[13px] px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap">
      {msg}
    </div>
  );
}
