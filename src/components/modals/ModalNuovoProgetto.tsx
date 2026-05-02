"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  FormLabel,
  FormInput,
  BtnPrimary,
  BtnOutline,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ModalNuovoProgetto({ open, onClose, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  function handleClose() {
    setNome("");
    setDescrizione("");
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!nome.trim()) {
      setError("Inserisci un nome per il progetto");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Devi essere loggato per creare un progetto");
      setSaving(false);
      return;
    }

    const { error: dbError } = await supabase.from("user_progetti").insert({
      user_id: user.id,
      nome: nome.trim(),
      descrizione: descrizione.trim() || null,
    });

    setSaving(false);
    if (dbError) {
      setError("Errore nel salvataggio. Riprova.");
      return;
    }

    setNome("");
    setDescrizione("");
    onClose();
    onCreated();
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7">
        <ModalClose onClose={handleClose} />
        <ModalTitle>Nuovo progetto</ModalTitle>
        <ModalSub>Organizza le tue ricerche normative in un progetto</ModalSub>

        <FormLabel>Nome progetto</FormLabel>
        <FormInput
          placeholder="Es. Ristrutturazione casa, Causa lavoro..."
          value={nome}
          onChange={setNome}
        />

        <FormLabel>Descrizione (opzionale)</FormLabel>
        <textarea
          placeholder="Aggiungi dettagli o note..."
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          rows={3}
          className="w-full py-[9px] px-[13px] bg-[#F5F3F0] border border-[#E5E1D8] rounded-[9px] text-[#1a1a1a] text-[13.5px] outline-none transition-colors duration-150 focus:border-[#C8C2BA] placeholder:text-[#9A9690] resize-none"
        />

        {error && (
          <div className="text-[#f44] text-[12px] mt-2">{error}</div>
        )}

        <BtnPrimary onClick={handleSave}>
          {saving ? "Salvataggio..." : "Crea progetto"}
        </BtnPrimary>
        <BtnOutline onClick={handleClose}>Annulla</BtnOutline>
      </div>
    </ModalOverlay>
  );
}
