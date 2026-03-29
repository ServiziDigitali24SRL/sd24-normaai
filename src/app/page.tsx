"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import ChatBar from "@/components/ChatBar";
import ModalCittadino from "@/components/modals/ModalCittadino";
import ModalImpresa from "@/components/modals/ModalImpresa";
import ModalProfessionista from "@/components/modals/ModalProfessionista";
import ModalInvesti from "@/components/modals/ModalInvesti";
import ModalComeFunziona from "@/components/modals/ModalComeFunziona";
import ModalCronologia from "@/components/modals/ModalCronologia";
import ModalDeveloper from "@/components/modals/ModalDeveloper";
import ModalBug from "@/components/modals/ModalBug";
import ModalFormazione from "@/components/modals/ModalFormazione";

function CheckoutToastHandler({ onToast }: { onToast: (t: "success" | "cancel" | null) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      onToast("success");
      router.replace("/");
      setTimeout(() => onToast(null), 5000);
    } else if (checkout === "cancel") {
      onToast("cancel");
      router.replace("/");
      setTimeout(() => onToast(null), 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

type ModalId =
  | "cittadino"
  | "impresa"
  | "professionista"
  | "investi"
  | "come-funziona"
  | "cronologia"
  | "developer"
  | "bug"
  | "formazione"
  | null;

export default function Home() {
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [checkoutToast, setCheckoutToast] = useState<"success" | "cancel" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Auth state listener
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
  }

  // Derive display info from user metadata
  const userRole = user?.user_metadata?.role as string | undefined;
  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.ragione_sociale
    || user?.email?.split("@")[0]
    || "";
  const roleLabel = userRole === "privato" ? "Cittadino"
    : userRole === "impresa" ? "Impresa"
    : userRole === "professionista" ? "Professionista"
    : null;

  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    if (saved !== null) setSidebarOpen(saved === "true");

    const onSbChange = (e: Event) => {
      setSidebarOpen((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener("sb-toggle", onSbChange);
    return () => window.removeEventListener("sb-toggle", onSbChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sb-open", String(next));
      window.dispatchEvent(new CustomEvent("sb-toggle", { detail: next }));
      return next;
    });
  }, []);

  function openModal(id: string) {
    setActiveModal(id as ModalId);
  }

  function closeModal() {
    setActiveModal(null);
  }

  return (
    <>
      <Suspense fallback={null}>
        <CheckoutToastHandler onToast={setCheckoutToast} />
      </Suspense>
      <Sidebar onOpenModal={openModal} isOpen={sidebarOpen} onToggle={toggleSidebar} user={user} onLogout={handleLogout} />

      {/* Main content */}
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-[250ms] ease-in-out ${
          sidebarOpen ? "ml-[240px]" : "ml-0"
        }`}
      >
        {/* Topbar */}
        <div className="flex items-center px-4 py-3 border-b border-[#1a1a1a] bg-[#0D0D0D] sticky top-0 z-50">
          {/* Hamburger */}
          <button
            onClick={toggleSidebar}
            aria-label="Mostra/nascondi sidebar"
            className="w-8 h-8 flex flex-col items-center justify-center gap-[5px] mr-3 rounded-md text-[#555] hover:text-cream hover:bg-white/[0.05] transition-all duration-150 shrink-0"
          >
            <span
              className={`block h-[1.5px] bg-current transition-all duration-200 ${
                sidebarOpen ? "w-4" : "w-5"
              }`}
            />
            <span className="block w-5 h-[1.5px] bg-current" />
            <span
              className={`block h-[1.5px] bg-current transition-all duration-200 ${
                sidebarOpen ? "w-4" : "w-5"
              }`}
            />
          </button>

          {/* Logo visibile solo quando sidebar chiusa */}
          <div
            className={`font-serif text-[17px] tracking-[-0.5px] mr-auto transition-all duration-[250ms] overflow-hidden ${
              sidebarOpen ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            Norma<span className="text-accent">AI</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-semibold text-accent uppercase">
                  {userName.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] text-cream leading-tight">{userName}</span>
                  {roleLabel && (
                    <span className="text-[10px] text-[#666] leading-tight">{roleLabel}</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-[11px] text-[#555] hover:text-accent border border-[#252525] hover:border-accent/30 bg-transparent rounded-md px-2 py-1 transition-colors duration-150"
              >
                Esci
              </button>
            </div>
          ) : (
            <>
              <span className="text-[12px] text-[#555] mr-[10px] ml-auto">
                Sei un professionista?
              </span>
              <button
                onClick={() => openModal("professionista")}
                className="bg-accent border-none text-white py-[7px] px-[15px] rounded-lg text-[12.5px] font-medium transition-colors duration-150 hover:bg-accent-hover shrink-0"
              >
                Accedi
              </button>
            </>
          )}
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-[72px]">
          <div className="font-serif text-[48px] tracking-[-2px] mb-[6px]">
            Norma<span className="text-accent">AI</span>
          </div>
          <div className="text-[14px] text-[#555] italic mb-11">
            La norma è uguale per tutti.
          </div>
          <ChatBar />
        </div>
      </div>

      {/* Checkout toast */}
      {checkoutToast && (
        <div className={`fixed top-4 right-4 z-[600] px-5 py-3 rounded-xl text-[13px] font-medium shadow-lg transition-all ${
          checkoutToast === "success"
            ? "bg-[#0d1f0d] border border-[#1a3a1a] text-[#4caf50]"
            : "bg-[#1f0d0d] border border-[#3a1a1a] text-[#f44]"
        }`}>
          {checkoutToast === "success"
            ? "✓ Abbonamento attivato! Benvenuto su NormaAI."
            : "Pagamento annullato. Nessun addebito."}
        </div>
      )}

      {/* Modals */}
      <ModalCittadino open={activeModal === "cittadino"} onClose={closeModal} />
      <ModalImpresa open={activeModal === "impresa"} onClose={closeModal} />
      <ModalProfessionista open={activeModal === "professionista"} onClose={closeModal} />
      <ModalInvesti open={activeModal === "investi"} onClose={closeModal} />
      <ModalComeFunziona open={activeModal === "come-funziona"} onClose={closeModal} />
      <ModalCronologia
        open={activeModal === "cronologia"}
        onClose={closeModal}
        onOpenCittadino={() => openModal("cittadino")}
        onOpenImpresa={() => openModal("impresa")}
      />
      <ModalDeveloper open={activeModal === "developer"} onClose={closeModal} />
      <ModalBug open={activeModal === "bug"} onClose={closeModal} />
      <ModalFormazione
        open={activeModal === "formazione"}
        onClose={closeModal}
        userRole={userRole}
        userCategoria={user?.user_metadata?.categoria as string | undefined}
      />
    </>
  );
}
