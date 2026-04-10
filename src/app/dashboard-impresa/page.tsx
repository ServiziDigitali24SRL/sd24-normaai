"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import lazyDynamic from "next/dynamic";

const ModalOnboardingImpresa = lazyDynamic(() => import("@/components/modals/ModalOnboardingImpresa"), { ssr: false });
const ModalOrganigramma = lazyDynamic(() => import("@/components/modals/ModalOrganigramma"), { ssr: false });
const ModalBusinessPlan = lazyDynamic(() => import("@/components/modals/ModalBusinessPlan"), { ssr: false });
const ModalBug = lazyDynamic(() => import("@/components/modals/ModalBug"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyProfile {
  id: string;
  piano: string;
  query_incluse: number;
  query_usate_mese: number;
  mese_corrente: string;
  trial_ends_at: string | null;
  stato: string;
  ragione_sociale: string | null;
  p_iva: string | null;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  ruolo: string;
  created_at: string;
}

interface ScadenzaItem {
  id: string;
  titolo: string;
  scadenza_at: string;
  tipo: string;
  stato: string;
}

interface Professionista {
  id: string;
  nome: string;
  categoria: string;
  email: string | null;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PIANO_LABELS: Record<string, string> = {
  impresa_micro: "Micro",
  impresa_piccola: "Piccola",
  impresa_media: "Media",
  impresa_grande: "Grande",
};

const PIANO_PREZZI: Record<string, string> = {
  impresa_micro: "€29/mese",
  impresa_piccola: "€149/mese",
  impresa_media: "€349/mese",
  impresa_grande: "€799/mese",
};

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sezioni / Tab ────────────────────────────────────────────────────────────

type Sezione = "chat" | "fascicolo" | "scadenze" | "team" | "professionisti";

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DashboardImpresa() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sezione, setSezione] = useState<Sezione>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    // Su mobile (<1024px) sempre chiusa; su desktop legge localStorage
    if (window.innerWidth < 1024) return false;
    return localStorage.getItem("sb-open") !== "false";
  });

  // Section data
  const [members, setMembers] = useState<Member[]>([]);
  const [scadenze, setScadenze] = useState<ScadenzaItem[]>([]);
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOrganigramma, setShowOrganigramma] = useState(false);
  const [showBusinessPlan, setShowBusinessPlan] = useState(false);
  const [showBug, setShowBug] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u || u.user_metadata?.role !== "impresa") {
        router.replace("/");
        return;
      }
      setUser(u);

      // Load company profile
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", u.id)
        .maybeSingle();

      if (cp) {
        setCompany(cp);
        // Show onboarding if never done
        const key = `norma-impresa-onboarding-${u.id}`;
        if (!localStorage.getItem(key) && cp.stato === "trial") {
          setTimeout(() => setShowOnboarding(true), 800);
        }
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    setSidebarOpen(saved !== null ? saved === "true" : window.innerWidth >= 1024);
    const h = (e: Event) => setSidebarOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("sb-toggle", h);
    return () => window.removeEventListener("sb-toggle", h);
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    if (sezione === "team") loadMembers();
    if (sezione === "scadenze") loadScadenze();
    if (sezione === "professionisti") loadProfessionisti();
  }, [sezione, company?.id]);

  async function loadMembers() {
    if (!company?.id) return;
    const res = await fetch(`/api/impresa/members?company_id=${company.id}`);
    if (res.ok) setMembers(await res.json());
  }

  async function loadScadenze() {
    if (!company?.id) return;
    const res = await fetch(`/api/impresa/documents?company_id=${company.id}&type=scadenze`);
    if (res.ok) {
      const data = await res.json();
      setScadenze(data.scadenze ?? []);
    }
  }

  async function loadProfessionisti() {
    if (!company?.id) return;
    const res = await fetch(`/api/impresa/professionisti?company_id=${company.id}`);
    if (res.ok) setProfessionisti(await res.json());
  }

  async function sendChat() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: q }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          vertical: "Compliance",
          userId: user?.id,
          conversationHistory: chatMessages.slice(-6),
          turnNumber: chatMessages.length,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === "pool_esaurito") {
          setChatMessages(prev => [...prev, { role: "assistant", content: "⚠️ Hai esaurito le query del piano questo mese. Aggiorna il piano o aspetta il mese prossimo." }]);
          return;
        }
        setChatMessages(prev => [...prev, { role: "assistant", content: "Errore nella risposta. Riprova." }]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let assistantText = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.type === "text") {
              assistantText += obj.text;
              setChatMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Errore di rete. Riprova." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  function handleLogout() {
    supabase.auth.signOut().then(() => router.replace("/"));
  }

  function openModal(id: string) {
    if (id === "organigramma") setShowOrganigramma(true);
    else if (id === "business-plan") setShowBusinessPlan(true);
    else if (id === "bug") setShowBug(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const queryPct = company ? Math.min(100, Math.round((company.query_usate_mese / company.query_incluse) * 100)) : 0;
  const trialDays = company?.trial_ends_at ? daysUntil(company.trial_ends_at) : null;
  const isTrial = trialDays !== null && trialDays > 0;
  const userName = user?.user_metadata?.ragione_sociale || user?.email?.split("@")[0] || "";

  return (
    <>
      <Sidebar
        onOpenModal={openModal}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => { const n = !p; localStorage.setItem("sb-open", String(n)); return n; })}
        user={user}
        onLogout={handleLogout}
        isPro={true}
      />

      <div className={`flex flex-col h-screen overflow-hidden transition-[margin] duration-[250ms] ease-in-out ${sidebarOpen ? "lg:ml-[240px] ml-0" : "ml-0"}`}>

        {/* Topbar */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[#E5E1D8] bg-white sticky top-0 z-[100] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(p => { const n = !p; localStorage.setItem("sb-open", String(n)); setTimeout(() => window.dispatchEvent(new CustomEvent("sb-toggle", { detail: n })), 0); return n; })}
              className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg border border-[#E5E1D8] bg-white text-[#6B6763] hover:bg-[#F0EDE8] hover:border-[#C8C2BA] transition-all shadow-sm"
              aria-label="Menu"
            >
              <span className="block w-5 h-[1.5px] bg-current" />
              <span className="block w-5 h-[1.5px] bg-current" />
              <span className="block w-5 h-[1.5px] bg-current" />
            </button>
            <div className="font-serif text-[17px] tracking-[-0.5px]">
              Norma<span className="text-accent">AI</span>
              <span className="text-[12px] text-[#9A9690] font-sans ml-2 font-normal">Impresa</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Query pool indicator */}
            {company && (
              <div className="hidden md:flex items-center gap-2">
                <div className="text-[11px] text-[#9A9690]">
                  {company.query_usate_mese.toLocaleString("it-IT")} / {company.query_incluse.toLocaleString("it-IT")} query
                </div>
                <div className="w-[80px] h-[4px] bg-[#F0EDE8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${queryPct > 90 ? "bg-red-500" : queryPct > 70 ? "bg-yellow-500" : "bg-accent"}`}
                    style={{ width: `${queryPct}%` }}
                  />
                </div>
              </div>
            )}
            {isTrial && (
              <span className="hidden sm:block text-[10.5px] bg-gold/10 text-[#9B6B00] border border-gold/30 px-2 py-1 rounded-full font-medium">
                Trial · {trialDays}g rimasti
              </span>
            )}
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white uppercase">
              {userName.charAt(0) || "I"}
            </div>
          </div>
        </div>

        {/* Piano info strip */}
        {company && (
          <div className="bg-[#FAFAF8] border-b border-[#E5E1D8] px-5 py-[9px] flex items-center gap-4 text-[12px] text-[#6B6763] shrink-0">
            <span className="font-medium text-[#1a1a1a]">{company.ragione_sociale ?? userName}</span>
            <span className="h-[14px] w-px bg-[#E5E1D8]" />
            <span>Piano {PIANO_LABELS[company.piano] ?? company.piano}</span>
            <span className="text-[#9A9690]">{PIANO_PREZZI[company.piano] ?? ""}</span>
            <div className="flex-1" />
            <button onClick={() => setShowBusinessPlan(true)} className="text-accent text-[11.5px] font-medium hover:underline">
              Business Plan AI →
            </button>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-3 sm:px-5 border-b border-[#E5E1D8] bg-white shrink-0 overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {([
            { id: "chat", label: "Chat normativa" },
            { id: "fascicolo", label: "Fascicolo" },
            { id: "scadenze", label: "Scadenze" },
            { id: "team", label: "Team" },
            { id: "professionisti", label: "Professionisti" },
          ] as { id: Sezione; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setSezione(tab.id)}
              className={`px-4 py-3 text-[13px] border-b-2 transition-colors whitespace-nowrap ${sezione === tab.id ? "border-accent text-accent font-medium" : "border-transparent text-[#6B6763] hover:text-[#1a1a1a]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAF8]">

          {/* ── CHAT ── */}
          {sezione === "chat" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center pt-12">
                    <div className="text-[40px] mb-3">⚖️</div>
                    <div className="text-[18px] font-serif text-[#1a1a1a] mb-2">Chat normativa Impresa</div>
                    <div className="text-[13px] text-[#9A9690] max-w-md mx-auto">
                      Chiedimi di contratti, lavoro, compliance, sanzioni, appalti, GDPR, sicurezza sul lavoro e molto altro.
                      Uso Claude Opus 4.6 per le analisi critiche.
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {[
                        "Come gestire un licenziamento per giusta causa?",
                        "Checklist GDPR per la mia azienda",
                        "Requisiti DVR sicurezza sul lavoro",
                        "Come rispondere a una cartella Equitalia?",
                      ].map(s => (
                        <button
                          key={s}
                          onClick={() => { setChatInput(s); }}
                          className="text-[12px] text-[#6B6763] border border-[#E5E1D8] rounded-full px-4 py-2 hover:bg-[#F0EDE8] hover:border-[#C8C2BA] transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-accent text-white rounded-br-sm" : "bg-white border border-[#E5E1D8] text-[#1a1a1a] rounded-bl-sm shadow-sm"}`}>
                      {m.content || (m.role === "assistant" && chatLoading && i === chatMessages.length - 1 ? (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : m.content)}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-[#E5E1D8] bg-white px-4 py-3 flex items-end gap-3 shrink-0">
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Fai una domanda normativa (Invio per inviare, Shift+Invio per andare a capo)…"
                  className="flex-1 resize-none rounded-xl border border-[#E5E1D8] bg-[#FAFAF8] px-4 py-3 text-[13.5px] text-[#1a1a1a] placeholder:text-[#B0A898] focus:outline-none focus:border-[#C8C2BA] transition-colors max-h-[150px] min-h-[48px]"
                  rows={1}
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-[48px] w-[48px] bg-accent rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#c82d08] transition-colors shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── FASCICOLO ── */}
          {sezione === "fascicolo" && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[20px] font-serif text-[#1a1a1a]">Fascicolo Aziendale</h2>
                  <p className="text-[13px] text-[#9A9690] mt-1">Archivia, organizza e analizza i documenti della tua azienda.</p>
                </div>
                <button className="bg-accent text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#c82d08] transition-colors">
                  + Carica documento
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { emoji: "📋", label: "Contratti e accordi" },
                  { emoji: "👥", label: "Lavoro e personale" },
                  { emoji: "🧾", label: "Fiscale e tributario" },
                  { emoji: "🏛️", label: "Societario" },
                  { emoji: "⚖️", label: "Compliance" },
                  { emoji: "🏢", label: "Immobiliare" },
                  { emoji: "🌍", label: "Internazionale" },
                  { emoji: "📂", label: "Altro" },
                ].map(cat => (
                  <div key={cat.label} className="bg-white border border-[#E5E1D8] rounded-xl p-5 hover:border-[#C8C2BA] transition-colors cursor-pointer group">
                    <div className="text-[26px] mb-2">{cat.emoji}</div>
                    <div className="text-[12.5px] font-medium text-[#1a1a1a] group-hover:text-accent transition-colors leading-snug">{cat.label}</div>
                    <div className="text-[11px] text-[#9A9690] mt-1.5">0 documenti</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SCADENZE ── */}
          {sezione === "scadenze" && (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[20px] font-serif text-[#1a1a1a]">Scadenze Normative</h2>
                  <p className="text-[13px] text-[#9A9690] mt-1">Alert automatici sulle scadenze fiscali, previdenziali e normative.</p>
                </div>
              </div>
              {scadenze.length === 0 ? (
                <div className="text-center py-16 text-[#9A9690]">
                  <div className="text-[40px] mb-3">📅</div>
                  <div className="text-[14px]">Nessuna scadenza configurata</div>
                  <div className="text-[12px] mt-1">Le scadenze normative vengono estratte automaticamente dai tuoi documenti</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {scadenze.map(s => {
                    const days = daysUntil(s.scadenza_at);
                    return (
                      <div key={s.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${days <= 7 ? "border-red-200" : days <= 30 ? "border-yellow-200" : "border-[#E5E1D8]"}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold ${days <= 7 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-yellow-100 text-yellow-700" : "bg-[#F0EDE8] text-[#6B6763]"}`}>
                          {days}g
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-[#1a1a1a]">{s.titolo}</div>
                          <div className="text-[11px] text-[#9A9690] mt-0.5">{s.tipo} · Scade il {formatDate(s.scadenza_at)}</div>
                        </div>
                        <div className={`text-[11px] px-2 py-1 rounded-full ${s.stato === "completata" ? "bg-green-100 text-green-700" : "bg-[#F0EDE8] text-[#6B6763]"}`}>{s.stato}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TEAM ── */}
          {sezione === "team" && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[20px] font-serif text-[#1a1a1a]">Gestione Team</h2>
                  <p className="text-[13px] text-[#9A9690] mt-1">Organizza i ruoli aziendali e i permessi di accesso a NormaAI.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOrganigramma(true)}
                    className="border border-[#E5E1D8] text-[#6B6763] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F0EDE8] transition-colors"
                  >
                    Organigramma
                  </button>
                  <button className="bg-accent text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#c82d08] transition-colors">
                    + Invita membro
                  </button>
                </div>
              </div>
              {members.length === 0 ? (
                <div className="text-center py-16 text-[#9A9690]">
                  <div className="text-[40px] mb-3">👥</div>
                  <div className="text-[14px]">Nessun membro nel team</div>
                  <div className="text-[12px] mt-1">Invita i tuoi colleghi per collaborare su NormaAI</div>
                </div>
              ) : (
                <div className="bg-white border border-[#E5E1D8] rounded-xl divide-y divide-[#E5E1D8]">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-[13px] font-bold text-accent uppercase">
                        {m.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-[#1a1a1a]">{m.full_name}</div>
                        <div className="text-[11px] text-[#9A9690]">{m.email}</div>
                      </div>
                      <span className="text-[11px] border border-[#E5E1D8] px-3 py-1 rounded-full text-[#6B6763]">{m.ruolo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROFESSIONISTI ── */}
          {sezione === "professionisti" && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[20px] font-serif text-[#1a1a1a]">I tuoi Professionisti</h2>
                  <p className="text-[13px] text-[#9A9690] mt-1">Avvocati, commercialisti e consulenti collegati alla tua azienda su NormaAI.</p>
                </div>
                <button className="bg-accent text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#c82d08] transition-colors">
                  + Aggiungi professionista
                </button>
              </div>
              {professionisti.length === 0 ? (
                <div className="text-center py-16 text-[#9A9690]">
                  <div className="text-[40px] mb-3">⚖️</div>
                  <div className="text-[14px]">Nessun professionista collegato</div>
                  <div className="text-[12px] mt-1 max-w-sm mx-auto">
                    Collega avvocati e commercialisti per escalation diretta dai miei alert normativi
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professionisti.map(p => (
                    <div key={p.id} className="bg-white border border-[#E5E1D8] rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[14px] font-bold text-[#6B6763] uppercase">
                          {p.nome.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-[#1a1a1a]">{p.nome}</div>
                          <div className="text-[11px] text-[#9A9690] mt-0.5">{p.categoria}</div>
                          {p.email && <div className="text-[11px] text-accent mt-1">{p.email}</div>}
                        </div>
                        <span className={`text-[10.5px] px-2 py-1 rounded-full ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-[#F0EDE8] text-[#6B6763]"}`}>
                          {p.status === "active" ? "Attivo" : "In attesa"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {showOnboarding && company && (
        <ModalOnboardingImpresa
          open={showOnboarding}
          onClose={() => {
            setShowOnboarding(false);
            if (user) localStorage.setItem(`norma-impresa-onboarding-${user.id}`, "1");
          }}
          userId={user?.id ?? ""}
          companyId={company.id}
        />
      )}

      {showOrganigramma && company && (
        <ModalOrganigramma
          open={showOrganigramma}
          onClose={() => setShowOrganigramma(false)}
          companyId={company.id}
        />
      )}

      {showBusinessPlan && (
        <ModalBusinessPlan
          open={showBusinessPlan}
          onClose={() => setShowBusinessPlan(false)}
          userId={user?.id ?? ""}
          companyName={company?.ragione_sociale ?? ""}
        />
      )}

      {showBug && <ModalBug open={showBug} onClose={() => setShowBug(false)} />}
    </>
  );
}
