"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import ModalCittadino from "@/components/modals/ModalCittadino";
import ModalImpresa from "@/components/modals/ModalImpresa";
import ModalProfessionista from "@/components/modals/ModalProfessionista";
import ModalInvesti from "@/components/modals/ModalInvesti";
import ModalComeFunziona from "@/components/modals/ModalComeFunziona";
import ModalCronologia from "@/components/modals/ModalCronologia";
import ModalDeveloper from "@/components/modals/ModalDeveloper";
import ModalBug from "@/components/modals/ModalBug";
import ModalFormazione from "@/components/modals/ModalFormazione";
import ModalProfessionisti from "@/components/modals/ModalProfessionisti";
import ModalGmail from "@/components/modals/ModalGmail";
import ModalGDrive from "@/components/modals/ModalGDrive";
import ModalDropbox from "@/components/modals/ModalDropbox";
import ModalOneDrive from "@/components/modals/ModalOneDrive";
import ModalOutlook from "@/components/modals/ModalOutlook";
import ModalDocuSign from "@/components/modals/ModalDocuSign";
import ModalAdobeSign from "@/components/modals/ModalAdobeSign";
import ModalWhatsApp from "@/components/modals/ModalWhatsApp";
import ModalTelegram from "@/components/modals/ModalTelegram";
import ModalProgetti from "@/components/modals/ModalProgetti";
import ModalNuovoProgetto from "@/components/modals/ModalNuovoProgetto";
import ModalArchivio from "@/components/modals/ModalArchivio";
import ModalNuovoArchivio from "@/components/modals/ModalNuovoArchivio";
import ModalProfilo from "@/components/modals/ModalProfilo";
import ModalParcelle from "@/components/modals/ModalParcelle";
import ModalDashboard from "@/components/modals/ModalDashboard";
import ModalAnalisiDoc from "@/components/modals/ModalAnalisiDoc";
import ModalConnettori from "@/components/modals/ModalConnettori";
import CommandPalette from "@/components/CommandPalette";
import NormaNewsTicker from "@/components/NormaNewsTicker";
import { Bell, Settings, ChevronDown } from "lucide-react";

function CheckoutToastHandler({ onToast, onGmailToast }: { onToast: (t: "success" | "cancel" | null) => void; onGmailToast: (t: "connected" | "error" | null) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const gmail = searchParams.get("gmail");
    if (checkout === "success") { onToast("success"); router.replace("/"); setTimeout(() => onToast(null), 5000); }
    else if (checkout === "cancel") { onToast("cancel"); router.replace("/"); setTimeout(() => onToast(null), 4000); }
    else if (gmail === "connected") { onGmailToast("connected"); router.replace("/"); setTimeout(() => onGmailToast(null), 4000); }
    else if (gmail === "error") { onGmailToast("error"); router.replace("/"); setTimeout(() => onGmailToast(null), 4000); }
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
  | "parcelle" | "dashboard" | "analisi-doc" | "connettori" | null;

export default function Home() {
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // FIX: default false, poi useEffect decide
  const [checkoutToast, setCheckoutToast] = useState<"success" | "cancel" | null>(null);
  const [gmailToast, setGmailToast] = useState<"connected" | "error" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []); // FIX: memoizzato

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) {
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

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  const userRole = user?.user_metadata?.role as string | undefined;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.ragione_sociale || user?.email?.split("@")[0] || "";
  const roleLabel = userRole === "privato" ? "Cittadino" : userRole === "impresa" ? "Impresa" : userRole === "professionista" ? "Professionista" : null;

  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    if (saved !== null) {
      setSidebarOpen(saved === "true");
    } else {
      // aperta solo su desktop largo (>=1024px), chiusa su tablet e mobile
      setSidebarOpen(window.innerWidth >= 1024);
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
      window.dispatchEvent(new CustomEvent("sb-toggle", { detail: next }));
      return next;
    });
  }, []);

  function openModal(id: string) { setActiveModal(id as ModalId); }
  function closeModal() { setActiveModal(null); }

  return (
    <>
      {/* H1 visivamente nascosta ma presente per SEO e screen reader */}
      <h1 className="sr-only">NormaAI — AI normativo italiano: cerca leggi, normative e sentenze</h1>

      <Suspense fallback={null}>
        <CheckoutToastHandler onToast={setCheckoutToast} onGmailToast={setGmailToast} />
      </Suspense>

      <Sidebar onOpenModal={openModal} isOpen={sidebarOpen} onToggle={toggleSidebar} user={user} onLogout={handleLogout} />

      {/* Main content — FIX: margin solo desktop */}
      <div className={`flex flex-col h-screen overflow-hidden transition-[margin] duration-[250ms] ease-in-out ${sidebarOpen ? "lg:ml-[240px] ml-0" : "ml-0"}`}>

        {/* Topbar — BrevoTopBar style */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[#E2E2E2] bg-white sticky top-0 z-[100] shrink-0">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              aria-label="Mostra/nascondi sidebar"
              className="w-8 h-8 flex flex-col items-center justify-center gap-[5px] rounded-md text-[#6B6763] hover:text-[#1a1a1a] hover:bg-[#F5F3EF] transition-all duration-150 shrink-0"
            >
              <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-4" : "w-5"}`} />
              <span className="block w-5 h-[1.5px] bg-current" />
              <span className={`block h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? "w-4" : "w-5"}`} />
            </button>
            <div className={`font-serif text-[17px] tracking-[-0.5px] text-[#1a1a1a] transition-all duration-[250ms] overflow-hidden ${sidebarOpen ? "lg:w-0 lg:opacity-0 w-auto opacity-100" : "w-auto opacity-100"}`}>
              Norma<span className="text-accent">AI</span>
            </div>
          </div>

          {/* Right: actions */}
          {user ? (
            <div className="flex items-center gap-4">
              <Bell className="w-[18px] h-[18px] text-[#6B6763] cursor-pointer hover:text-[#1a1a1a] transition-colors hidden md:block" />
              <Settings className="w-[18px] h-[18px] text-[#6B6763] cursor-pointer hover:text-[#1a1a1a] transition-colors hidden md:block" onClick={() => openModal("profilo-ai")} />
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => openModal("profilo-ai")}
              >
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white uppercase shrink-0">
                  {userName.charAt(0) || "U"}
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[13px] text-[#1b1b1b] leading-tight">{userName}</span>
                  {roleLabel && <span className="text-[10px] text-[#6b6b6b] leading-tight">{roleLabel}</span>}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#6b6b6b] hidden lg:block group-hover:text-[#1a1a1a] transition-colors" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden lg:block text-[13px] text-[#6B6763]">Sei un professionista?</span>
              <button
                onClick={() => openModal("professionista")}
                className="bg-accent border-none text-white py-[7px] px-[16px] rounded-lg text-[13px] font-semibold transition-colors duration-150 hover:bg-accent-hover shadow-[0_0_12px_rgba(232,52,10,0.20)]"
              >
                Accedi gratis
              </button>
            </div>
          )}
        </div>

        {/* News ticker — VoyageAI style */}
        <NormaNewsTicker />

        {/* Main chat area */}
        <RuixenMoonChat user={user} />
      </div>

      <CommandPalette />

      {checkoutToast && (
        <div className={`fixed top-4 right-4 z-[600] px-5 py-3 rounded-xl text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] border transition-all ${checkoutToast === "success" ? "bg-[#f0faf0] border-[#c3e6c3] text-[#1e7a1e]" : "bg-[#fef2f2] border-[#fcc] text-[#c00]"}`}>
          {checkoutToast === "success" ? "✓ Abbonamento attivato! Benvenuto su NormaAI." : "Pagamento annullato. Nessun addebito."}
        </div>
      )}

      {gmailToast && (
        <div className={`fixed top-4 right-4 z-[600] px-5 py-3 rounded-xl text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] border transition-all ${gmailToast === "connected" ? "bg-[#f0faf0] border-[#c3e6c3] text-[#1e7a1e]" : "bg-[#fef2f2] border-[#fcc] text-[#c00]"}`}>
          {gmailToast === "connected" ? "✓ Gmail connessa. Puoi analizzare la tua corrispondenza." : "Errore connessione Gmail. Riprova."}
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
    </>
  );
}
