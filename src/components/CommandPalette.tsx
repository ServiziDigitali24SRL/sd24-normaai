"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Scale, FileText, Briefcase, Building, Gavel, FileSearch, GitCompare, CalendarClock, X } from "lucide-react";

const SUGGESTIONS = [
  { icon: Scale,         label: "Multe e sanzioni",    query: "Quali sono le sanzioni previste per infrazioni stradali?" },
  { icon: FileText,      label: "Contratti",           query: "Come si redige un contratto di locazione commerciale?" },
  { icon: Briefcase,     label: "Lavoro e dipendenti", query: "Come funziona il contratto a tempo determinato nel 2024?" },
  { icon: Building,      label: "Condominio",          query: "Cosa dice il codice civile sul condominio e le spese comuni?" },
  { icon: Gavel,         label: "Diffide e cause",     query: "Come si invia una diffida formale e qual è il suo valore legale?" },
  { icon: FileSearch,    label: "Analizza documento",  query: "Analizza questo contratto e dimmi cosa mi espone a rischio" },
  { icon: GitCompare,    label: "Confronta contratti", query: "Quali sono le differenze tra CCNL commercio e industria?" },
  { icon: CalendarClock, label: "Scadenze",            query: "Quali sono le scadenze fiscali per le partite IVA nel 2024?" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery("");
    }
  }, [open]);

  function submitQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    window.dispatchEvent(new CustomEvent("norma-cmd-query", { detail: trimmed }));
    setOpen(false);
    setQuery("");
  }

  const filtered = query
    ? SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.query.toLowerCase().includes(query.toLowerCase())
      )
    : SUGGESTIONS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/30 z-[500] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            className="bg-white border border-[#E5E1D8] rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.14)] w-full max-w-[560px] overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E1D8]">
              <Search className="w-4 h-4 text-[#8A8682] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const first = filtered[0];
                    submitQuery(query || (first?.query ?? ""));
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Cerca normativa, leggi, sentenze…"
                className="flex-1 bg-transparent border-none outline-none text-[14.5px] text-[#1a1a1a] placeholder:text-[#9A9690]"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="text-[#9A9690] hover:text-[#1a1a1a] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10.5px] text-[#9A9690] bg-[#F0EDE8] px-1.5 py-0.5 rounded font-mono shrink-0">
                  ⌘K
                </span>
              )}
            </div>

            {/* Suggestions */}
            <div className="py-1.5 max-h-[340px] overflow-y-auto">
              <div className="px-4 pb-1 pt-1.5">
                <p className="text-[10px] text-[#9A9690] uppercase tracking-[0.7px] font-medium">
                  {query ? "Risultati" : "Ricerche rapide"}
                </p>
              </div>
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-[13px] text-[#9A9690]">
                  Nessun risultato. Premi ↵ per cercare.
                </div>
              )}
              {filtered.map(({ icon: Icon, label, query: q }) => (
                <button
                  key={label}
                  onClick={() => submitQuery(query || q)}
                  className="w-full flex items-center gap-3 px-4 py-[9px] text-left hover:bg-[#F7F5F2] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#F0EDE8] flex items-center justify-center shrink-0 group-hover:bg-[#E8E3DC] transition-colors">
                    <Icon className="w-3.5 h-3.5 text-[#6B6763]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#1a1a1a] font-medium">{label}</div>
                    <div className="text-[11.5px] text-[#8A8682] truncate">{q}</div>
                  </div>
                  <span className="ml-auto text-[11px] text-[#C0BBB3] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    ↵
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-[#F0EDE8] flex items-center gap-3">
              <span className="text-[10.5px] text-[#9A9690]">
                <kbd className="bg-[#F0EDE8] px-1 py-0.5 rounded text-[10px] font-mono">↵</kbd>{" "}
                invia
              </span>
              <span className="text-[10.5px] text-[#9A9690]">
                <kbd className="bg-[#F0EDE8] px-1 py-0.5 rounded text-[10px] font-mono">Esc</kbd>{" "}
                chiudi
              </span>
              <span className="ml-auto text-[10.5px] text-[#9A9690]">
                558K+ norme indicizzate
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
