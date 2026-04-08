"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  BtnPrimary,
} from "../ModalOverlay";

interface Progetto {
  id: string;
  nome: string;
  descrizione: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNuovo: () => void;
}

export default function ModalProgetti({ open, onClose, onNuovo }: Props) {
  const [progetti, setProgetti] = useState<Progetto[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("user_progetti")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProgetti(data || []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleDelete(id: string) {
    await supabase.from("user_progetti").delete().eq("id", id);
    setProgetti((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>I tuoi progetti</ModalTitle>
        <ModalSub>Organizza le tue ricerche normative per progetto</ModalSub>

        {loading ? (
          <div className="text-center py-8 text-[#7A766F] text-[13px]">
            Caricamento...
          </div>
        ) : progetti.length === 0 ? (
          <div className="text-center py-8">
            <svg
              viewBox="0 0 24 24"
              className="w-[38px] h-[38px] stroke-[#2a2a2a] fill-none stroke-[1.5] mx-auto mb-3 block"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
            <div className="text-[#7A766F] text-[13px]">Nessun progetto ancora</div>
            <div className="text-[#333] text-[12px] mt-1">
              Crea il tuo primo progetto per organizzare le ricerche
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
            {progetti.map((p) => (
              <div
                key={p.id}
                className="group flex items-start gap-3 bg-[#F0EDE8] border border-[#E5E1D8] rounded-xl p-4 hover:border-[#D5D0C8] transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-[16px] h-[16px] stroke-accent fill-none stroke-[2] shrink-0 mt-[2px]"
                >
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-[#1a1a1a] text-[13.5px] font-medium truncate">
                    {p.nome}
                  </div>
                  {p.descrizione && (
                    <div className="text-[#6B6763] text-[12px] mt-[2px] line-clamp-2">
                      {p.descrizione}
                    </div>
                  )}
                  <div className="text-[#333] text-[10px] mt-1">
                    {new Date(p.created_at).toLocaleDateString("it-IT")}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
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
          + Nuovo progetto
        </BtnPrimary>
      </div>
    </ModalOverlay>
  );
}
