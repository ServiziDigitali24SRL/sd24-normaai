"use client";

import { useState } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  userRole?: string;       // "privato" | "impresa" | "professionista"
  userCategoria?: string;  // "avvocato" | "commercialista" | "lavoro" | "tecnico" | "finanziario"
}

// Role-specific intro videos — shown as featured card based on who is logged in
const ROLE_VIDEOS = [
  {
    id: "role-generico",
    roles: [],   // empty = shown when NOT logged in
    section: null,
    title: "Benvenuto su NormaAI",
    desc: "Scopri come NormaAI semplifica la legge italiana: cerca normative, analizza contratti, ricevi alert automatici — tutto gratis.",
    duration: "3 min",
  },
  {
    id: "role-cittadino",
    roles: [{ role: "privato" }],
    section: null,
    title: "NormaAI per il Cittadino",
    desc: "Come usare NormaAI per capire le tue tutele, contestare una multa, analizzare un contratto di affitto o rispondere a una raccomandata.",
    duration: "3 min",
  },
  {
    id: "role-impresa",
    roles: [{ role: "impresa" }],
    section: null,
    title: "NormaAI per le Imprese",
    desc: "Come l'AI normativa aiuta la tua azienda: contratti, compliance, scadenze automatiche e alert su leggi che impattano il tuo settore.",
    duration: "3 min",
  },
  {
    id: "role-avvocato",
    roles: [{ role: "professionista", categoria: "avvocato" }],
    section: null,
    title: "NormaAI per l'Avvocato",
    desc: "Ricerca normativa istantanea, analisi documenti e matching con clienti che cercano un avvocato tramite la piattaforma.",
    duration: "3 min",
  },
  {
    id: "role-commercialista",
    roles: [{ role: "professionista", categoria: "commercialista" }],
    section: null,
    title: "NormaAI per il Commercialista",
    desc: "Normativa fiscale aggiornata, alert su circolari INPS/Agenzia Entrate e lead qualificati di clienti che cercano il tuo supporto.",
    duration: "3 min",
  },
  {
    id: "role-lavoro",
    roles: [{ role: "professionista", categoria: "lavoro" }],
    section: null,
    title: "NormaAI per il Consulente del Lavoro",
    desc: "CCNL, buste paga, sicurezza sul lavoro: tutte le normative in un posto, con alert automatici e clienti aziendali già qualificati.",
    duration: "3 min",
  },
  {
    id: "role-tecnico",
    roles: [{ role: "professionista", categoria: "tecnico" }],
    section: null,
    title: "NormaAI per Geometri e Ingegneri",
    desc: "Norme edilizie, urbanistiche e di sicurezza sempre aggiornate. Analisi di capitolati, varianti e permessi direttamente in chat.",
    duration: "3 min",
  },
  {
    id: "role-finanziario",
    roles: [{ role: "professionista", categoria: "finanziario" }],
    section: null,
    title: "NormaAI per il Consulente Finanziario",
    desc: "TUF, MiFID II, antiriciclaggio: normativa finanziaria in tempo reale con alert su aggiornamenti che impattano la tua attività.",
    duration: "3 min",
  },
];

const VIDEOS = [
  {
    id: "gdrive",
    section: "Documenti",
    title: "Come collegare Google Drive",
    desc: "Autorizza l'accesso, scegli le cartelle da monitorare e analizza i documenti direttamente dalla tua chat.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M12 2L2 19h6.5l3.5-6 3.5 6H22L12 2z"/></svg>,
  },
  {
    id: "dropbox",
    section: "Documenti",
    title: "Come collegare Dropbox",
    desc: "Collega il tuo account Dropbox per accedere ai file e inviarli all'AI per l'analisi.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm-6 14l6 4 6-4-6-4-6 4z"/></svg>,
  },
  {
    id: "onedrive",
    section: "Documenti",
    title: "Come collegare OneDrive",
    desc: "Accedi ai tuoi documenti Microsoft 365 e analizzali con NormaAI.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M20.5 14.5a4 4 0 00-3.5-5.9 6 6 0 00-11.5 2A4.5 4.5 0 005 19h15a3.5 3.5 0 00.5-4.5z"/></svg>,
  },
  {
    id: "gmail",
    section: "Email",
    title: "Come collegare Gmail",
    desc: "Importa email con allegati contrattuali direttamente in chat per l'analisi AI.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  },
  {
    id: "outlook",
    section: "Email",
    title: "Come collegare Outlook",
    desc: "Connetti il tuo account Microsoft per analizzare email e allegati aziendali.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/><circle cx="8" cy="14" r="3"/></svg>,
  },
  {
    id: "docusign",
    section: "Firma",
    title: "Come usare DocuSign",
    desc: "Invia per firma i documenti revisionati da NormaAI direttamente da DocuSign.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M16 13l-4 4-2-2"/></svg>,
  },
  {
    id: "adobesign",
    section: "Firma",
    title: "Come usare Adobe Sign",
    desc: "Gestisci la firma elettronica dei tuoi contratti dopo l'analisi AI.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
  {
    id: "whatsapp",
    section: "Comunicazione",
    title: "Come usare WhatsApp",
    desc: "Inoltra documenti ricevuti su WhatsApp a NormaAI per analizzarli istantaneamente.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  },
  {
    id: "telegram",
    section: "Comunicazione",
    title: "Come usare Telegram",
    desc: "Forwarda messaggi e documenti dal tuo Telegram a NormaAI per l'analisi.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>,
  },
  {
    id: "analisi-doc",
    section: "Strumenti AI",
    title: "Analisi documenti istantanea",
    desc: "Carica PDF, foto o screenshot: NormaAI evidenzia rischi, clausole pericolose e cosa fare.",
    duration: "3 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    id: "alert-normativo",
    section: "Strumenti AI",
    title: "Alert normativo",
    desc: "Configura le aree di interesse e ricevi notifiche automatiche quando cambia la legge.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  },
  {
    id: "scadenze",
    section: "Strumenti AI",
    title: "Scadenze automatiche",
    desc: "NormaAI legge i tuoi contratti ed estrae le scadenze, sincronizzandole con il calendario.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: "confronta",
    section: "Strumenti AI",
    title: "Confronta contratti",
    desc: "Carica due versioni dello stesso contratto: NormaAI evidenzia le differenze e i rischi.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
  },
  {
    id: "rispondimi",
    section: "Strumenti AI",
    title: "Rispondimi tu",
    desc: "Hai ricevuto una raccomandata o una lettera formale? NormaAI genera la risposta pronta da inviare.",
    duration: "2 min",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#555] fill-none stroke-[1.8]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  },
];

function getRoleVideo(userRole?: string, userCategoria?: string) {
  if (!userRole) return ROLE_VIDEOS[0]; // generico
  for (const rv of ROLE_VIDEOS) {
    for (const r of rv.roles) {
      if (r.role === userRole && (!("categoria" in r) || r.categoria === userCategoria)) {
        return rv;
      }
    }
  }
  // fallback: match by role only (no categoria match)
  for (const rv of ROLE_VIDEOS) {
    for (const r of rv.roles) {
      if (r.role === userRole) return rv;
    }
  }
  return ROLE_VIDEOS[0];
}

const ROLE_VIDEO_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-accent fill-none stroke-[1.8]">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" className="fill-accent stroke-none" />
  </svg>
);

export default function ModalFormazione({ open, onClose, userRole, userCategoria }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const featuredVideo = getRoleVideo(userRole, userCategoria);

  const sections = ["Documenti", "Email", "Firma", "Comunicazione", "Strumenti AI"];
  const grouped = sections.map((s) => ({
    label: s,
    items: VIDEOS.filter((v) => v.section === s),
  }));

  const current = VIDEOS.find((v) => v.id === activeVideo)
    ?? (activeVideo === featuredVideo.id ? { ...featuredVideo, icon: ROLE_VIDEO_ICON } : null);

  return (
    <ModalOverlay open={open} onClose={() => { setActiveVideo(null); onClose(); }}>
      <div className="p-7 max-h-[85vh] overflow-y-auto">
        <ModalClose onClose={() => { setActiveVideo(null); onClose(); }} />

        {current ? (
          /* Video player view */
          <div>
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]">
                <polyline points="15,18 9,12 15,6" />
              </svg>
              Tutti i video
            </button>
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#7A766F] mb-1">
              {("section" in current && current.section) ? current.section : "Introduzione"}
            </div>
            <ModalTitle>{current.title}</ModalTitle>
            <p className="text-[12.5px] text-[#6B6763] leading-[1.6] mt-1 mb-5">{current.desc}</p>

            {/* Video placeholder */}
            <div className="w-full aspect-video bg-[#FAFAF8] border border-[#222] rounded-xl flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-accent stroke-none">
                  <polygon points="10,8 16,12 10,16" />
                </svg>
              </div>
              <div className="text-[12px] text-[#7A766F]">Video in arrivo — {current.duration}</div>
            </div>
          </div>
        ) : (
          /* Video list view */
          <>
            <ModalTitle>Formazione</ModalTitle>
            <p className="text-[12.5px] text-[#6B6763] leading-[1.6] mt-1 mb-6">
              Guarda il video introduttivo per iniziare, poi esplora i tutorial per ogni connettore e strumento AI.
            </p>

            {/* Featured role video */}
            <div className="mb-5">
              <button
                onClick={() => setActiveVideo(featuredVideo.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 text-left cursor-pointer transition-all duration-150 w-full"
              >
                <div className="shrink-0">{ROLE_VIDEO_ICON}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate text-[#1a1a1a]">{featuredVideo.title}</div>
                  <div className="text-[11px] text-[#7A766F] mt-[1px]">{featuredVideo.duration}</div>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-[#333] fill-none stroke-[2]">
                  <polyline points="9,6 15,12 9,18" />
                </svg>
              </button>
            </div>

            {grouped.map(({ label, items }) =>
              items.length === 0 ? null : (
                <div key={label} className="mb-5">
                  <div className="text-[9px] uppercase tracking-[0.08em] text-[#7A766F] font-medium mb-2 px-1">
                    {label}
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    {items.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setActiveVideo(v.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E1D8] hover:border-[#D5D0C8] hover:bg-white/[0.02] text-left cursor-pointer transition-all duration-150 w-full bg-transparent"
                      >
                        <div className="shrink-0">{v.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate text-[#6B6763]">{v.title}</div>
                          <div className="text-[11px] text-[#7A766F] mt-[1px]">{v.duration}</div>
                        </div>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-[#333] fill-none stroke-[2]">
                          <polyline points="9,6 15,12 9,18" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
