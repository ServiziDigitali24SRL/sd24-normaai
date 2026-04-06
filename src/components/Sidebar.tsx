"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import CinematicThemeSwitcher from "@/components/ui/cinematic-theme-switcher";

interface SidebarProps {
  onOpenModal: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  user: User | null;
  onLogout: () => void;
}

const ALL_ITEMS: { id: string; label: string; section: string; icon: React.ReactNode }[] = [
  { id: "gdrive",          section: "Documenti",     label: "Google Drive",         icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 19h6.5l3.5-6 3.5 6H22L12 2z"/></svg> },
  { id: "dropbox",         section: "Documenti",     label: "Dropbox",              icon: <svg viewBox="0 0 24 24"><path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm-6 14l6 4 6-4-6-4-6 4z"/></svg> },
  { id: "onedrive",        section: "Documenti",     label: "OneDrive",             icon: <svg viewBox="0 0 24 24"><path d="M20.5 14.5a4 4 0 00-3.5-5.9 6 6 0 00-11.5 2A4.5 4.5 0 005 19h15a3.5 3.5 0 00.5-4.5z"/></svg> },
  { id: "gmail",           section: "Email",         label: "Gmail",                icon: <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { id: "outlook",         section: "Email",         label: "Outlook",              icon: <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/><circle cx="8" cy="14" r="3"/></svg> },
  { id: "docusign",        section: "Firma",         label: "DocuSign",             icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M16 13l-4 4-2-2"/></svg> },
  { id: "adobesign",       section: "Firma",         label: "Adobe Sign",           icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
  { id: "whatsapp",        section: "Comunicazione", label: "WhatsApp",             icon: <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> },
  { id: "telegram",        section: "Comunicazione", label: "Telegram",             icon: <svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg> },
  { id: "analisi-doc",     section: "Strumenti AI",  label: "Analisi documenti",    icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "parcelle",        section: "Strumenti AI",  label: "Calcolatore Parcelle", icon: <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  { id: "alert-normativo", section: "Strumenti AI",  label: "Alert normativo",      icon: <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
  { id: "scadenze",        section: "Strumenti AI",  label: "Scadenze automatiche", icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: "confronta",       section: "Strumenti AI",  label: "Confronta contratti",  icon: <svg viewBox="0 0 24 24"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/></svg> },
  { id: "rispondimi",      section: "Strumenti AI",  label: "Rispondimi tu",        icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
];

const bugIcon = <svg viewBox="0 0 24 24"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 016 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>;

export default function Sidebar({ onOpenModal, isOpen, onToggle, user, onLogout }: SidebarProps) {
  const router = useRouter();
  const userRole = user?.user_metadata?.role as string | undefined;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.ragione_sociale || user?.email?.split("@")[0] || "";
  const roleLabel = userRole === "privato" ? "Cittadino" : userRole === "impresa" ? "Impresa" : userRole === "professionista" ? "Professionista" : null;
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    if (saved === null) localStorage.setItem("sb-open", "true");
    try { setToggles(JSON.parse(localStorage.getItem("norma-toggles") || "{}")); } catch {}
  }, []);

  function handleToggle(id: string) {
    setToggles(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("norma-toggles", JSON.stringify(next));
      return next;
    });
  }

  // Chiude sidebar su mobile dopo click nav
  function navClick(fn: () => void) {
    fn();
    if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle();
  }

  return (
    <>
      {/* Sidebar — FIX: z-[90] sotto topbar z-[100] */}
      <div className={`fixed top-0 left-0 h-screen z-[90] flex flex-col bg-[#111] border-r border-[#1e1e1e] transition-all duration-[250ms] ease-in-out overflow-hidden ${isOpen ? "w-[240px]" : "w-0"}`}>

        {/* Logo header — FIX: bottone X su mobile */}
        <div className="px-[18px] pt-[18px] pb-[14px] border-b border-[#1e1e1e] shrink-0 min-w-[240px] flex items-start justify-between">
          <div>
            <div className="font-serif text-[21px] tracking-[-0.5px]">Norma<span className="text-accent">AI</span></div>
            <div className="text-[10.5px] text-[#555] mt-[2px] italic">La norma è uguale per tutti.</div>
          </div>
          <button onClick={onToggle} className="lg:hidden mt-1 w-7 h-7 flex items-center justify-center text-[#555] hover:text-cream rounded-md hover:bg-white/[0.05] transition-all shrink-0" aria-label="Chiudi menu">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-[6px] min-w-[240px]">
          <NavItem onClick={() => navClick(() => window.dispatchEvent(new CustomEvent("norma-new-chat")))} icon={<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>} label="Nuova chat" />
          <NavItem onClick={() => navClick(() => onOpenModal("cronologia"))} icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>} label="Cronologia" />
          <NavItem onClick={() => navClick(() => onOpenModal("formazione"))} icon={<svg viewBox="0 0 24 24"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>} label="Formazione" />
          <NavItem onClick={() => navClick(() => onOpenModal("progetti"))} icon={<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>} label="Progetti" onAdd={() => onOpenModal("nuovo-progetto")} />
          <NavItem onClick={() => navClick(() => onOpenModal("archivio"))} icon={<svg viewBox="0 0 24 24"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} label="Archivio" onAdd={() => onOpenModal("nuovo-archivio")} />
          {user && <NavItem onClick={() => navClick(() => onOpenModal("professionisti"))} icon={<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>} label="I tuoi professionisti" />}
          {user && userRole === "professionista" && (
            <NavItem
              onClick={() => navClick(() => onOpenModal("dashboard"))}
              icon={<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
              label="Dashboard Lead"
              highlight
            />
          )}

          {user && (
            <>
              <Divider />
              {ALL_ITEMS.filter(i => toggles[i.id]).map(item => (
                <NavItem key={item.id} onClick={() => navClick(() => onOpenModal(item.id))} icon={item.icon} label={item.label} />
              ))}
              <ToolsMenu toggles={toggles} onToggle={handleToggle} />
            </>
          )}

          {!user && (
            <>
              <Divider />
              <NavItem onClick={() => navClick(() => onOpenModal("cittadino"))} icon={<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} label="Login Cittadino" />
              <NavItem onClick={() => navClick(() => onOpenModal("impresa"))} icon={<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>} label="Login Impresa" />
              <Divider />
              <NavItem onClick={() => navClick(() => onOpenModal("investi"))} icon={<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>} label="Investi in NormaAI" />
              <NavItem onClick={() => navClick(() => onOpenModal("come-funziona"))} icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>} label="Come funziona" />
              <NavItem onClick={() => navClick(() => onOpenModal("developer"))} icon={<svg viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6" /><polyline points="8,6 2,12 8,18" /></svg>} label="API Sviluppatori" />
              <NavLink href="/guide" onClick={() => { if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle(); }} icon={<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>} label="Guide gratuite" />
              <Divider />
              <NavLink href="/privacy" onClick={() => { if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle(); }} icon={<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>} label="Privacy Policy" />
              <NavLink href="/termini" onClick={() => { if (typeof window !== "undefined" && window.innerWidth < 1024) onToggle(); }} icon={<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>} label="Termini di Servizio" />
              <NavItem onClick={() => navClick(() => onOpenModal("bug"))} icon={bugIcon} label="Segnala un bug" />
            </>
          )}
        </nav>

        <div className="border-t border-[#1a1a1a] shrink-0 min-w-[240px]">
          {user ? (
            <>
              <NavItem onClick={() => navClick(() => onOpenModal("bug"))} icon={bugIcon} label="Segnala un bug" />
              <UserFooter userName={userName} userEmail={user.email || ""} roleLabel={roleLabel} onLogout={onLogout} onOpenModal={onOpenModal} />
            </>
          ) : (
            <div className="px-[18px] py-[14px] text-[10px] text-[#444]">Servizi Digitali 24 S.R.L.</div>
          )}
        </div>
      </div>

      {/* Mobile backdrop — FIX: z-[89] sotto sidebar */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[89] lg:hidden" onClick={onToggle} />}
    </>
  );
}

function Divider() { return <div className="h-px bg-[#1a1a1a] mx-[14px] my-[5px]" />; }

function ToolsMenu({ toggles, onToggle }: { toggles: Record<string, boolean>; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const sections = ALL_ITEMS.reduce<Record<string, typeof ALL_ITEMS>>((acc, item) => { (acc[item.section] = acc[item.section] || []).push(item); return acc; }, {});
  return (
    <div ref={ref} className="relative min-w-[240px]">
      {open && (
        <div className="absolute left-[14px] right-[14px] bottom-full mb-[4px] bg-[#161616] border border-[#252525] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[350px] overflow-y-auto">
          {Object.entries(sections).map(([section, items], si) => (
            <div key={section}>
              {si > 0 && <div className="h-px bg-[#222] mx-3" />}
              <div className="px-4 pt-[10px] pb-[3px] text-[9px] uppercase tracking-[0.08em] text-[#444] font-medium">{section}</div>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-[9px] px-4 py-[7px] [&_svg]:w-[13px] [&_svg]:h-[13px] [&_svg]:shrink-0 [&_svg]:stroke-[#555] [&_svg]:fill-none [&_svg]:stroke-[2]">
                  {item.icon}
                  <span className="flex-1 text-[12px] text-[#777] truncate">{item.label}</span>
                  <button onClick={() => onToggle(item.id)} className={`relative w-[28px] h-[15px] rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0 ${toggles[item.id] ? "bg-accent" : "bg-[#2a2a2a]"}`}>
                    <span className={`absolute top-[2px] w-[11px] h-[11px] rounded-full bg-white transition-all duration-200 ${toggles[item.id] ? "left-[15px]" : "left-[2px]"}`} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="flex items-center gap-[9px] px-[18px] py-[8px] text-[12px] text-[#555] bg-transparent border-none w-full text-left cursor-pointer hover:text-[#888] hover:bg-white/[0.02] transition-colors duration-150">
        <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] shrink-0 stroke-current fill-none stroke-[2]"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
        <span className="flex-1">Strumenti & connettori</span>
        <svg viewBox="0 0 24 24" className={`w-[11px] h-[11px] shrink-0 stroke-current fill-none stroke-[2] transition-transform duration-150 ${open ? "rotate-180" : ""}`}><polyline points="6,9 12,15 18,9"/></svg>
      </button>
    </div>
  );
}

function UserFooter({ userName, userEmail, roleLabel, onLogout, onOpenModal }: { userName: string; userEmail: string; roleLabel: string | null; onLogout: () => void; onOpenModal: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 w-full mb-[2px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 pt-3 pb-2 text-[11px] text-[#666] truncate border-b border-[#252525]">{userEmail}</div>
          <MenuBtn onClick={() => { setOpen(false); onOpenModal("profilo-ai"); }} icon={<svg viewBox="0 0 24 24"><path d="M12 5a3 3 0 00-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 1012 18z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 5a3 3 0 015.997.125 4 4 0 012.526 5.77 4 4 0 01-.556 6.588A4 4 0 1112 18z" fill="none" stroke="currentColor" strokeWidth="2"/></svg>} label="Il mio profilo AI" sub="Personalizzazione intelligente" />
          <MenuBtn onClick={() => setOpen(false)} icon={<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>} label="Il mio piano" sub={roleLabel === "Cittadino" ? "9€/mese" : roleLabel === "Impresa" ? "29€/mese" : roleLabel === "Professionista" ? "29€/mese" : undefined} />
          <div className="flex items-center justify-between px-4 py-[9px]"><span className="text-[13px] text-[#999]">Tema</span><CinematicThemeSwitcher /></div>
          <div className="h-px bg-[#252525] mx-2" />
          <MenuBtn onClick={() => { setOpen(false); onLogout(); }} icon={<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} label="Esci" />
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-[10px] px-[14px] py-[12px] bg-transparent border-none text-left cursor-pointer hover:bg-white/[0.03] transition-colors duration-150">
        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[12px] font-semibold text-accent uppercase shrink-0">{userName.charAt(0)}</div>
        <div className="flex-1 min-w-0"><div className="text-[13px] text-cream font-medium truncate">{userName}</div><div className="text-[10px] text-[#555]">{roleLabel || "Utente"}</div></div>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 stroke-[#555] fill-none stroke-[2] shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}><polyline points="6,9 12,15 18,9" /></svg>
      </button>
    </div>
  );
}

function MenuBtn({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-[9px] px-4 py-[9px] text-[13px] text-[#999] bg-transparent border-none w-full text-left cursor-pointer hover:text-cream hover:bg-white/[0.05] transition-colors duration-150 [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[2]">
      {icon}<span className="flex-1">{label}</span>{sub && <span className="text-[10px] text-[#555]">{sub}</span>}
    </button>
  );
}

// NavLink: come NavItem ma renderizza un <a> reale per SEO crawlability
function NavLink({ icon, label, href, onClick }: { icon: React.ReactNode; label: string; href: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-[9px] px-[18px] py-[8px] text-[13px] text-[#888] no-underline hover:text-cream hover:bg-white/[0.03] transition-colors duration-150 [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[2]"
    >
      {icon}{label}
    </Link>
  );
}

function NavItem({ icon, label, highlight, onClick, onAdd }: { icon: React.ReactNode; label: string; highlight?: boolean; onClick: () => void; onAdd?: () => void }) {
  return (
    <div className="group flex items-center w-full">
      <button onClick={onClick} className={`flex-1 flex items-center gap-[9px] px-[18px] py-[8px] text-[13px] bg-transparent border-none text-left transition-colors duration-150 whitespace-nowrap hover:text-cream hover:bg-white/[0.03] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:shrink-0 [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[2] ${highlight ? "text-gold" : "text-[#888]"}`}>
        {icon}{label}
      </button>
      {onAdd && (
        <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="opacity-0 group-hover:opacity-100 mr-[14px] w-[20px] h-[20px] flex items-center justify-center rounded-md bg-transparent border border-[#333] text-[#666] hover:text-cream hover:border-accent transition-all duration-150 cursor-pointer shrink-0">
          <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] stroke-current fill-none stroke-[2.5]"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      )}
    </div>
  );
}
