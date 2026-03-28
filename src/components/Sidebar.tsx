"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface SidebarProps {
  onOpenModal: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ onOpenModal, isOpen, onToggle, user, onLogout }: SidebarProps) {
  const router = useRouter();
  const userRole = user?.user_metadata?.role as string | undefined;
  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.ragione_sociale
    || user?.email?.split("@")[0]
    || "";
  const roleLabel = userRole === "privato" ? "Cittadino"
    : userRole === "impresa" ? "Impresa"
    : userRole === "professionista" ? "Professionista"
    : null;

  // Sync initial state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    if (saved === null) localStorage.setItem("sb-open", "true");
  }, []);

  return (
    <>
      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-screen z-[100] flex flex-col bg-[#111] border-r border-[#1e1e1e] transition-all duration-[250ms] ease-in-out overflow-hidden ${
          isOpen ? "w-[240px]" : "w-0"
        }`}
      >
        {/* Logo */}
        <div className="px-[18px] pt-[18px] pb-[14px] border-b border-[#1e1e1e] shrink-0 min-w-[240px]">
          <div className="font-serif text-[21px] tracking-[-0.5px]">
            Norma<span className="text-accent">AI</span>
          </div>
          <div className="text-[10.5px] text-[#555] mt-[2px] italic">
            La norma è uguale per tutti.
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-[6px] min-w-[240px]">
          <NavItem
            onClick={() => window.dispatchEvent(new CustomEvent("norma-new-chat"))}
            icon={<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            label="Nuova chat"
          />
          <NavItem
            onClick={() => onOpenModal("cronologia")}
            icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>}
            label="Cronologia"
          />
          {!user && (
            <>
              <Divider />
              <NavItem
                onClick={() => onOpenModal("cittadino")}
                icon={<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                label="Login Cittadino"
              />
              <NavItem
                onClick={() => onOpenModal("impresa")}
                icon={<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>}
                label="Login Impresa"
              />
              <Divider />
              <NavItem
                onClick={() => onOpenModal("investi")}
                highlight
                icon={
                  <svg viewBox="0 0 24 24" className="!stroke-none !fill-gold">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                }
                label="Investi in NormaAI"
              />
              <NavItem
                onClick={() => onOpenModal("come-funziona")}
                icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                label="Come funziona"
              />
              <NavItem
                onClick={() => onOpenModal("developer")}
                icon={<svg viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6" /><polyline points="8,6 2,12 8,18" /></svg>}
                label="API Sviluppatori"
              />
              <NavItem
                onClick={() => router.push("/guide")}
                icon={<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>}
                label="Guide gratuite"
              />
              <Divider />
              <NavItem
                onClick={() => router.push("/privacy")}
                icon={<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
                label="Privacy Policy"
              />
              <NavItem
                onClick={() => router.push("/termini")}
                icon={<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>}
                label="Termini di Servizio"
              />
            </>
          )}
          {!user && (
            <NavItem
              onClick={() => onOpenModal("bug")}
              icon={<svg viewBox="0 0 24 24"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 016 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>}
              label="Segnala un bug"
            />
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] shrink-0 min-w-[240px]">
          {user ? (
            <>
              <NavItem
                onClick={() => onOpenModal("bug")}
                icon={<svg viewBox="0 0 24 24"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 016 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>}
                label="Segnala un bug"
              />
              <UserFooter
                userName={userName}
                userEmail={user.email || ""}
                roleLabel={roleLabel}
                onLogout={onLogout}
              />
            </>
          ) : (
            <div className="px-[18px] py-[14px] text-[10px] text-[#444]">
              Servizi Digitali 24 S.R.L.
            </div>
          )}
        </div>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}

function Divider() {
  return <div className="h-px bg-[#1a1a1a] mx-[14px] my-[5px]" />;
}

function UserFooter({
  userName,
  userEmail,
  roleLabel,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Popup menu */}
      {open && (
        <div className="absolute bottom-full left-0 w-full mb-[2px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Email header */}
          <div className="px-4 pt-3 pb-2 text-[11px] text-[#666] truncate border-b border-[#252525]">
            {userEmail}
          </div>

          <MenuBtn
            onClick={() => { setOpen(false); }}
            icon={<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>}
            label="Il mio piano"
            sub={roleLabel === "Cittadino" ? "9€/mese" : roleLabel === "Impresa" ? "49€/mese" : roleLabel === "Professionista" ? "29€/mese" : undefined}
          />

          <div className="h-px bg-[#252525] mx-2" />

          <MenuBtn
            onClick={() => { setOpen(false); onLogout(); }}
            icon={<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
            label="Esci"
          />
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-[10px] px-[14px] py-[12px] bg-transparent border-none text-left cursor-pointer hover:bg-white/[0.03] transition-colors duration-150"
      >
        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[12px] font-semibold text-accent uppercase shrink-0">
          {userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-cream font-medium truncate">{userName}</div>
          <div className="text-[10px] text-[#555]">{roleLabel || "Utente"}</div>
        </div>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 stroke-[#555] fill-none stroke-[2] shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[9px] px-4 py-[9px] text-[13px] text-[#999] bg-transparent border-none w-full text-left cursor-pointer hover:text-cream hover:bg-white/[0.05] transition-colors duration-150 [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[2]"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {sub && <span className="text-[10px] text-[#555]">{sub}</span>}
    </button>
  );
}

function NavItem({
  icon,
  label,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[9px] px-[18px] py-[8px] text-[13px] bg-transparent border-none w-full text-left transition-colors duration-150 whitespace-nowrap hover:text-cream hover:bg-white/[0.03] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[2] ${
        highlight ? "text-gold" : "text-[#888]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
