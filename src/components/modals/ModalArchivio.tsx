"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  BtnPrimary,
} from "../ModalOverlay";

interface Elemento {
  id: string;
  titolo: string;
  tipo: string;
  note: string | null;
  created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  multe: "Multe",
  contratti: "Contratti",
  atti: "Atti",
  condominio: "Condominio",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onNuovo: () => void;
}

export default function ModalArchivio({ open, onClose, onNuovo }: Props) {
  const [elementi, setElementi] = useState<Elemento[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("user_archivio")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setElementi(data || []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleDelete(id: string) {
    await supabase.from("user_archivio").delete().eq("id", id);
    setElementi((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Archivio</ModalTitle>
        <ModalSub>I tuoi documenti e conversazioni salvati</ModalSub>

        {loading ? (
          <div className="text-center py-8 text-[#7A766F] text-[13px]">
            Caricamento...
          </div>
        ) : elementi.length === 0 ? (
          <div className="text-center py-8">
            <svg
              viewBox="0 0 24 24"
              className="w-[38px] h-[38px] stroke-[#2a2a2a] fill-none stroke-[1.5] mx-auto mb-3 block"
            >
              <polyline points="21,8 21,21 3,21 3,8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <div className="text-[#7A766F] text-[13px]">Archivio vuoto</div>
            <div className="text-[#333] text-[12px] mt-1">
              Salva chat, documenti e normative per ritrovarli
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
            {elementi.map((e) => (
              <div
                key={e.id}
                className="group flex items-start gap-3 bg-[#F0EDE8] border border-[#E5E1D8] rounded-xl p-4 hover:border-[#D5D0C8] transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-[16px] h-[16px] stroke-accent fill-none stroke-[2] shrink-0 mt-[2px]"
                >
                  <polyline points="21,8 21,21 3,21 3,8" />
                  <rect x="1" y="3" width="22" height="5" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-[#1a1a1a] text-[13.5px] font-medium truncate">
                    {e.titolo}
                  </div>
                  <div className="flex items-center gap-2 mt-[3px]">
                    <span className="text-[10px] text-accent/70 bg-accent/10 px-[6px] py-[1px] rounded-full">
                      {TIPO_LABELS[e.tipo] || e.tipo}
                    </span>
                    <span className="text-[#333] text-[10px]">
                      {new Date(e.created_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  {e.note && (
                    <div className="text-[#6B6763] text-[12px] mt-[4px] line-clamp-2">
                      {e.note}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-[#7A766F] hover:text-[#f44] text-[16px] cursor-pointer transition-all duration-150 shrink-0"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <BtnPrimary
          onClick={() => {
            onClose();
            onNuovo();
          }}
        >
          + Archivia elemento
        </BtnPrimary>
      </div>
    </ModalOverlay>
  );
}
