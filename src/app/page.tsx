"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import lazyDynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import NormaNewsTicker from "@/components/NormaNewsTicker";

// Dynamic imports: i modal vengono caricati solo quando aperti (riduce bundle iniziale ~70KB)
const CommandPalette = lazyDynamic(() => import("@/components/CommandPalette"), { ssr: false });
const ModalCittadino = lazyDynamic(() => import("@/components/modals/ModalCittadino"), { ssr: false });
const ModalImpresa = lazyDynamic(() => import("@/components/modals/ModalImpresa"), { ssr: false });
const ModalProfessionista = lazyDynamic(() => import("@/components/modals/ModalProfessionista"), { ssr: false });
const ModalInvesti = lazyDynamic(() => import("@/components/modals/ModalInvesti"), { ssr: false });
const ModalComeFunziona = lazyDynamic(() => import("@/components/modals/ModalComeFunziona"), { ssr: false });
const ModalCronologia = lazyDynamic(() => import("@/components/modals/ModalCronologia"), { ssr: false });
const ModalDeveloper = lazyDynamic(() => import("@/components/modals/ModalDeveloper"), { ssr: false });
const ModalBug = lazyDynamic(() => import("@/components/modals/ModalBug"), { ssr: false });
const ModalFormazione = lazyDynamic(() => import("@/components/modals/ModalFormazione"), { ssr: false });
const ModalProfessionisti = lazyDynamic(() => import("@/components/modals/ModalProfessionisti"), { ssr: false });
const ModalGmail = lazyDynamic(() => import("@/components/modals/ModalGmail"), { ssr: false });
const ModalGDrive = lazyDynamic(() => import("@/components/modals/ModalGDrive"), { ssr: false });
const ModalDropbox = lazyDynamic(() => import("@/components/modals/ModalDropbox"), { ssr: false });
const ModalOneDrive = lazyDynamic(() => import("@/components/modals/ModalOneDrive"), { ssr: false });
const ModalOutlook = lazyDynamic(() => import("@/components/modals/ModalOutlook"), { ssr: false });
const ModalDocuSign = lazyDynamic(() => import("@/components/modals/ModalDocuSign"), { ssr: false });
const ModalAdobeSign = lazyDynamic(() => import("@/components/modals/ModalAdobeSign"), { ssr: false });
const ModalWhatsApp = lazyDynamic(() => import("@/components/modals/ModalWhatsApp"), { ssr: false });
const ModalTelegram = lazyDynamic(() => import("@/components/modals/ModalTelegram"), { ssr: false });
const ModalProgetti = lazyDynamic(() => import("@/components/modals/ModalProgetti"), { ssr: false });
const ModalNuovoProgetto = lazyDynamic(() => import("@/components/modals/ModalNuovoProgetto"), { ssr: false });
const ModalArchivio = lazyDynamic(() => import("@/components/modals/ModalArchivio"), { ssr: false });
const ModalNuovoArchivio = lazyDynamic(() => import("@/components/modals/ModalNuovoArchivio"), { ssr: false });
const ModalProfilo = lazyDynamic(() => import("@/components/modals/ModalProfilo"), { ssr: false });
const ModalParcelle = lazyDynamic(() => import("@/components/modals/ModalParcelle"), { ssr: false });
const ModalDashboard = lazyDynamic(() => import("@/components/modals/ModalDashboard"), { ssr: false });
const ModalAnalisiDoc = lazyDynamic(() => import("@/components/modals/ModalAnalisiDoc"), { ssr: false });
const ModalConnettori = lazyDynamic(() => import("@/components/modals/ModalConnettori"), { ssr: false });
const ModalSfondo = lazyDynamic(() => import("@/components/modals/ModalSfondo"), { ssr: false });
const ModalUpgrade = lazyDynamic(() => import("@/components/modals/ModalUpgrade"), { ssr: false });
const ModalOnboarding = lazyDynamic(() => import("@/components/modals/ModalOnboarding"), { ssr: false });
const ModalPopupProfessionista = lazyDynamic(() => import("@/components/modals/ModalPopupProfessionista"), { ssr: false });
const ModalCaricaDocumento = lazyDynamic(() => import("@/components/modals/ModalCaricaDocumento"), { ssr: false });
const ModalScadenze = lazyDynamic(() => import("@/components/modals/ModalScadenze"), { ssr: false });
import { Bell, Settings, ChevronDown } from "lucide-react";

function LeadCounterBanner({ onCTA }: { onCTA: () => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/leads/preview", { next: { revalidate: 300 } } as RequestInit)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setCount(d.count); })
      .catch(() => {});
  }, []);

  if (count === null || count === 0) return null;

  return (
    <div className="w-full bg-[#FFFBF0] border-b border-[#FFE08A] px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-3 text-[12px] sm:text-[12.5px]">
      <span className="text-[#9B6B00] text-center sm:text-left">
        â¡ <strong>{count}</strong> {count === 1 ? "persona sta cercando" : "persone stanno cercando"} consulenza legale questa settimana
      </span>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full sm:w-auto">
        <a
          href="/leads/preview"
          className="text-[#9B6B00] underline underline-offset-2 hover:text-[#6B4A00] transition-colors font-medium text-[11.5px]"
        >
          Vedi i lead disponibili â
        </a>
        <button
          onClick={onCTA}
          className="text-white bg-[#E8340A] px-3 py-2 rounded-md text-[11.5px] font-semibold hover:bg-[#c82d08] transition-colors whitespace-nowrap"
        >
          Accedi come professionista
        </button>
      </div>
    </div>
  );
}

function CheckoutToastHandler({ onToast, onGmailToast, onModal }: { onToast: (t: "success" | "cancel" | null) => void; onGmailToast: (t: "connected" | "error" | null) => void; onModal: (id: string) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const gmail = searchParams.get("gmail");
    const modal = searchParams.get("modal");
    if (checkout === "success") { onToast("success"); router.replace("/"); setTimeout(() => onToast(null), 5000); }
    else if (checkout === "cancel") { onToast("cancel"); router.replace("/"); setTimeout(() => onToast(null), 4000); }
    else if (gmail === "connected") { onGmailToast("connected"); router.replace("/"); setTimeout(() => onGmailToast(null), 4000); }
    else if (gmail === "error") { onGmailToast("error"); router.replace("/"); setTimeout(() => onGmailToast(null), 4000); }
    if (modal) { router.replace("/"); setTimeout(() => onModal(modal), 100); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

type ModalId =
  | "cittadino" | "impresa" | "professionista" | "investi" | "come-funziona"
  | "cronologia" | "developer" | "bug" | "formazione" | "professionisti"
  | "gmail" | "gdrive" | "dropbox" | "onedrive" | "outlook"
  | "docusign" | "adobesign" | "whatsapp" | "telegram"
  | "progetti" | "nuovo-progetto" | "archivio" | "nuovo-archivio" | "profilo-ai"
  | "parcelle" | "dashboard" | "analisi-doc" | "connettori" | "piani"
  | "upgrade" | "onboarding" | "carica-documento" | "scadenze" | null;

export default function Home() {
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // FIX: default false, poi useEffect decide
  const [checkoutToast, setCheckoutToast] = useState<"success" | "cancel" | null>(null);
  const [gmailToast, setGmailToast] = useState<"connected" | "error" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [popupProfShow, setPopupProfShow] = useState(false);
  const [popupConvSummary, setPopupConvSummary] = useState("");
  const [docModalCat, setDocModalCat] = useState("");
  const [docModalSub, setDocModalSub] = useState("");
  const queryCountRef = useRef(0);
  const nextPopupAtRef = useRef(Math.floor(Math.random() * 3) + 3); // 3-5
  const supabase = useMemo(() => createClient(), []); // FIX: memoizzato

  const router = useRouter();

  async function checkIsPro(userId: string) {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const PRO_PLANS = ["cittadino_pro", "professionista", "impresa", "api_developer", "api_pro"];
    setIsPro(data ? PRO_PLANS.includes(data.plan) : false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      if (u) checkIsPro(u.id);
      // Non redirect automatico: professionisti e imprese possono usare la chat dalla homepage
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkIsPro(session.user.id);
      else setIsPro(false);
      if (event === "SIGNED_IN" && session?.user) {
        const role = session.user.user_metadata?.role;
        if (role === "professionista") {
          // /dashboard is admin-only Control Room (ALLOWED_EMAILS gate) — route
          // professionisti to their actual dashboard so they don't bounce.
          router.replace("/dashboard-professionista");
          return;
        }
        if (role === "impresa") {
          router.replace("/dashboard-impresa");
          return;
        }
        const key = `norma-onboarding-${session.user.id}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          setTimeout(() => setActiveModal("formazione"), 800);
        }
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popup professionista: ogni 3-5 query riuscite
  useEffect(() => {
    const handler = (e: Event) => {
      if (!user || isPro) return;
      const detail = (e as CustomEvent<{ summary?: string }>).detail;
      queryCountRef.current += 1;
      if (queryCountRef.current >= nextPopupAtRef.current) {
        queryCountRef.current = 0;
        nextPopupAtRef.current = Math.floor(Math.random() * 3) + 3;
        setPopupConvSummary(detail?.summary || "");
        setPopupProfShow(true);
      }
    };
    window.addEventListener("norma-query-done", handler);
    return () => window.removeEventListener("norma-query-done", handler);
  }, [user, isPro]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  const userRole = user?.user_metadata?.role as string | undefined;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.ragione_sociale || user?.email?.split("@")[0] || "";
  const roleLabel = userRole === "privato" ? "Cittadino" : userRole === "impresa" ? "Impresa" : userRole === "professionista" ? "Professionista" : null;

  useEffect(() => {
    // Su mobile (<768px) sidebar SEMPRE chiusa al caricamento indipendentemente da localStorage
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    } else {
      const saved = localStorage.getItem("sb-open");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      } else {
        setSidebarOpen(window.innerWidth >= 1024);
      }
    }
    const onSbChange = (e: Event) => setSidebarOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("sb-toggle", onSbChange);
    return () => window.removeEventListener("sb-toggle", onSbChange);
  }, []);

  // FIX: listener per aprire modal da eventi (es. disclaimer ChatBar)
  useEffect(() => {
    const handler = (e: Event) => setActiveModal((e as CustomEvent<string>).detail as ModalId);
    window.addEventListener("norma-open-modal", handler);
    return () => window.removeEventListener("norma-open-modal", handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sb-open", String(next));
      // dispatch outside the setState updater to avoid setState-during-render
      setTimeout(() => window.dispatchEvent(new CustomEvent("sb-toggle", { detail: next })), 0);
      return next;
    });
  }, []);

  function openModal(id: string) { setActiveModal(id as ModalId); }
  function closeModal() { setActiveModal(null); }
  function handleOpenDocumento(cat: string, sub: string) { setDocModalCat(cat); setDocModalSub(sub); setActiveModal("carica-documento"); }

  return (
    <>
      {/* H1 visivamente nascosta ma presente per SEO e screen reader */}
      <h1 className="sr-only">NormaAI â AI normativo italiano: cerca leggi, normative e sentenze</h1>

      <Suspense fallback={null}>
        <CheckoutToastHandler onToast={setCheckoutToast} onGmailToast={setGmailToast} onModal={openModal} />
      </Suspense>

      <Sidebar onOpenModal={openModal} isOpen={sidebarOpen} onToggle={toggleSidebar} user={user} onLogout={handleLogout} isPro={isPro} onOpenDocumento={handleOpenDocumento} />

      {/* Main content â FIX: margin solo desktop */}
      <div className={`flex flex-col h-screen overflow-hidden transition-[margin] duration-[250ms] ease-in-out ${sidebarOpen ? "lg:ml-[240px] ml-0" : "ml-0"}`}>

        {/* Topbar â BrevoTopBar style */}
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4 border-b border-[#E5E1D8] bg-white sticky top-0 z-[100] shrink-0 shadow-[0_1px_0_#E5E1D8]">
          {/* Left: hamburger + logo + new chat */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={toggleSidebar}
              aria-label="Mostra/nascondi sidebar"
              className="w-7 h-7 sm:w-8 sm:h-8 flex flex-col items-center justify-center gap-[4px] sm:gap-[5px] rounded-md text-[#6B6763] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] transition-all duration-150 shrink-0"
            >
              <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-3" : "w-4"}`} />
              <span className="block w-4 h-[1.5px] bg-current" />
              <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-3" : "w-4"}`} />
            </button>
            <div className={`font-serif text-[15px] sm:text-[17px] tracking-[-0.5px] text-[#1a1a1a] transition-all duration-[250ms] overflow-hidden whitespace-nowrap ${sidebarOpen ? "lg:w-0 lg:opacity-0 w-auto opacity-100" : "w-auto opacity-100"}`}>
              Norma<span className="text-accent">AI</span>
            </div>
            {/* New chat button â hidden on mobile */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("norma-new-chat"))}
              className="hidden sm:flex items-center gap-1.5 ml-auto sm:ml-1 h-6 sm:h-7 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11.5px] text-[#6B6763] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] border border-[#E5E1D8] transition-all duration-150 shrink-0"
              title="Nuova chat"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nuova chat</span>
            </button>
          </div>

          {/* Center: cmd+k search pill */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-2 h-8 px-4 rounded-full border border-[#E5E1D8] bg-[#FAFAF8] hover:bg-[#F0EDE8] hover:border-[#C8C2BA] transition-all duration-150 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#9A9690] fill-none stroke-[2]">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="text-[12px] text-[#9A9690]">Cerca normativaâ¦</span>
            <span className="text-[10px] text-[#B0A898] bg-white border border-[#E5E1D8] px-1.5 py-0.5 rounded font-mono ml-1">âK</span>
          </button>

          {/* Right: actions */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Bell className="w-4 sm:w-[17px] h-4 sm:h-[17px] text-[#6B6763] cursor-pointer hover:text-[#1a1a1a] transition-colors hidden md:block" />
              <Settings className="w-4 sm:w-[17px] h-4 sm:h-[17px] text-[#6B6763] cursor-pointer hover:text-[#1a1a1a] transition-colors hidden md:block" onClick={() => openModal("profilo-ai")} />
              <div
                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group"
                onClick={() => openModal("profilo-ai")}
              >
                <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-accent flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white uppercase shrink-0 ring-2 ring-accent/20">
                  {userName.charAt(0) || "U"}
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[13px] text-[#1b1b1b] leading-tight font-medium">{userName}</span>
                  {roleLabel && <span className="text-[10px] text-[#6b6b6b] leading-tight">{roleLabel}</span>}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#6b6b6b] hidden lg:block group-hover:text-[#1a1a1a] transition-colors" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <a
                href="/leads/preview"
                className="hidden md:flex items-center gap-1 text-[11px] sm:text-[12px] text-[#6B6763] hover:text-[#1a1a1a] transition-colors bg-transparent border border-[#E5E1D8] rounded-lg py-1.5 sm:py-[6px] px-2 sm:px-3 hover:bg-[#F0EDE8] whitespace-nowrap"
              >
                <span>ð¥</span>
                <span>Lead questa settimana</span>
              </a>
              <button
                onClick={() => openModal("cittadino")}
                className="text-[11px] sm:text-[12.5px] text-[#6B6763] hover:text-[#1a1a1a] transition-colors bg-transparent border-none cursor-pointer py-1.5 sm:py-[6px] px-2 sm:px-3"
              >
                Accedi
              </button>
              <button
                onClick={() => openModal("professionista")}
                className="bg-accent border-none text-white py-1.5 sm:py-[7px] px-2.5 sm:px-[14px] rounded-lg text-[11px] sm:text-[13px] font-semibold transition-all duration-150 hover:bg-accent-hover shadow-[0_2px_10px_rgba(232,52,10,0.25)] active:scale-95 whitespace-nowrap"
              >
                Inizia gratis
              </button>
            </div>
          )}
        </div>

        {/* Lead counter banner â visibile solo se non loggato */}
        {!user && <LeadCounterBanner onCTA={() => openModal("professionista")} />}

        {/* News ticker â VoyageAI style */}
        <NormaNewsTicker />

        {/* Main chat area */}
        <RuixenMoonChat user={user} />
      </div>

      <CommandPalette />

      {checkoutToast && (
        <div className={`fixed top-4 right-4 z-[600] px-5 py-3 rounded-xl text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] border transition-all ${checkoutToast === "success" ? "bg-[#f0faf0] border-[#c3e6c3] text-[#1e7a1e]" : "bg-[#fef2f2] border-[#fcc] text-[#c00]"}`}>
          {checkoutToast === "success" ? "â Abbonamento attivato! Benvenuto su NormaAI." : "Pagamento annullato. Nessun addebito."}
        </div>
      )}

      {gmailToast && (
        <div className={`fixed top-4 right-4 z-[600] px-5 py-3 rounded-xl text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] border transition-all ${gmailToast === "connected" ? "bg-[#f0faf0] border-[#c3e6c3] text-[#1e7a1e]" : "bg-[#fef2f2] border-[#fcc] text-[#c00]"}`}>
          {gmailToast === "connected" ? "â Gmail connessa. Puoi analizzare la tua corrispondenza." : "Errore connessione Gmail. Riprova."}
        </div>
      )}

      <ModalCittadino open={activeModal === "cittadino"} onClose={closeModal} />
      <ModalImpresa open={activeModal === "impresa"} onClose={closeModal} />
      <ModalProfessionista open={activeModal === "professionista"} onClose={closeModal} />
      <ModalInvesti open={activeModal === "investi"} onClose={closeModal} />
      <ModalComeFunziona open={activeModal === "come-funziona"} onClose={closeModal} />
      <ModalCronologia open={activeModal === "cronologia"} onClose={closeModal} onOpenCittadino={() => openModal("cittadino")} onOpenImpresa={() => openModal("impresa")} />
      <ModalDeveloper open={activeModal === "developer"} onClose={closeModal} />
      <ModalBug open={activeModal === "bug"} onClose={closeModal} />
      <ModalFormazione open={activeModal === "formazione"} onClose={closeModal} userRole={userRole} userCategoria={user?.user_metadata?.categoria as string | undefined} />
      <ModalProfessionisti open={activeModal === "professionisti"} onClose={closeModal} />
      <ModalGmail open={activeModal === "gmail"} onClose={closeModal} />
      <ModalGDrive open={activeModal === "gdrive"} onClose={closeModal} />
      <ModalDropbox open={activeModal === "dropbox"} onClose={closeModal} />
      <ModalOneDrive open={activeModal === "onedrive"} onClose={closeModal} />
      <ModalOutlook open={activeModal === "outlook"} onClose={closeModal} />
      <ModalDocuSign open={activeModal === "docusign"} onClose={closeModal} />
      <ModalAdobeSign open={activeModal === "adobesign"} onClose={closeModal} />
      <ModalWhatsApp open={activeModal === "whatsapp"} onClose={closeModal} />
      <ModalTelegram open={activeModal === "telegram"} onClose={closeModal} />
      <ModalProgetti open={activeModal === "progetti"} onClose={closeModal} onNuovo={() => openModal("nuovo-progetto")} />
      <ModalNuovoProgetto open={activeModal === "nuovo-progetto"} onClose={closeModal} onCreated={() => openModal("progetti")} />
      <ModalArchivio open={activeModal === "archivio"} onClose={closeModal} onNuovo={() => openModal("nuovo-archivio")} />
      <ModalNuovoArchivio open={activeModal === "nuovo-archivio"} onClose={closeModal} onCreated={() => openModal("archivio")} />
      <ModalProfilo open={activeModal === "profilo-ai"} onClose={closeModal} user={user} />
      <ModalParcelle open={activeModal === "parcelle"} onClose={closeModal} />
      <ModalDashboard open={activeModal === "dashboard"} onClose={closeModal} user={user} />
      <ModalAnalisiDoc open={activeModal === "analisi-doc"} onClose={closeModal} />
      <ModalConnettori open={activeModal === "connettori"} onClose={closeModal} onOpenModal={openModal} />
      <ModalUpgrade open={activeModal === "upgrade"} onClose={closeModal} />
      <ModalOnboarding open={activeModal === "onboarding"} onClose={closeModal} userId={user?.id ?? ""} userEmail={user?.email ?? ""} />
      <ModalScadenze open={activeModal === "scadenze"} onClose={closeModal} userId={user?.id ?? ""} isPro={isPro} onUpgradeRequired={() => openModal("upgrade")} />
      <ModalCaricaDocumento open={activeModal === "carica-documento"} onClose={closeModal} userId={user?.id ?? ""} categoria={docModalCat} sottocategoria={docModalSub} isPro={isPro} onUpgradeRequired={() => openModal("upgrade")} />
      <ModalPopupProfessionista open={popupProfShow} onClose={() => setPopupProfShow(false)} userId={user?.id ?? null} userEmail={user?.email ?? ""} conversationSummary={popupConvSummary} vertical="" userCity="" />
    </>
  );
}
