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

const TIPI = [
  { value: "multe", label: "Multe" },
  { value: "contratti", label: "Contratti" },
  { value: "atti", label: "Atti" },
  { value: "condominio", label: "Condominio" },
  { value: "altro", label: "Altro" },
];

export default function ModalNuovoArchivio({ open, onClose, onCreated }: Props) {
  const [titolo, setTitolo] = useState("");
  const [tipo, setTipo] = useState("multe");
  const [tipoLibero, setTipoLibero] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  function handleClose() {
    setTitolo("");
    setTipo("atti");
    setTipoLibero("");
    setNote("");
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!titolo.trim()) {
      setError("Inserisci un titolo");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Devi essere loggato per archiviare");
      setSaving(false);
      return;
    }

    const { error: dbError } = await supabase.from("user_archivio").insert({
      user_id: user.id,
      titolo: titolo.trim(),
      tipo: tipo === "altro" && tipoLibero.trim() ? tipoLibero.trim() : tipo,
      note: note.trim() || null,
    });

    setSaving(false);
    if (dbError) {
      setError("Errore nel salvataggio. Riprova.");
      return;
    }

    setTitolo("");
    setTipo("atti");
    setTipoLibero("");
    setNote("");
    onClose();
    onCreated();
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7">
        <ModalClose onClose={handleClose} />
        <ModalTitle>Archivia elemento</ModalTitle>
        <ModalSub>Salva un documento, una chat o una normativa</ModalSub>

        <FormLabel>Titolo</FormLabel>
        <FormInput
          placeholder="Es. Sentenza Cassazione n. 1234/2026..."
          value={titolo}
          onChange={setTitolo}
        />

        <FormLabel>Tipo</FormLabel>
        <div className="flex gap-[6px] flex-wrap">
          {TIPI.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={`px-3 py-[6px] rounded-lg text-[12px] border transition-colors duration-150 cursor-pointer ${
                tipo === t.value
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "bg-[#F0EDE8] border-[#E5E1D8] text-[#6B6763] hover:border-[#D5D0C8]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tipo === "altro" && (
          <input
            type="text"
            placeholder="Scrivi il tipo..."
            value={tipoLibero}
            onChange={(e) => setTipoLibero(e.target.value)}
            className="w-full mt-2 py-[9px] px-[13px] bg-[#F5F3F0] border border-[#E5E1D8] rounded-[9px] text-[#1a1a1a] text-[13.5px] outline-none transition-colors duration-150 focus:border-[#C8C2BA] placeholder:text-[#9A9690]"
          />
        )}

        <FormLabel>Note (opzionale)</FormLabel>
        <textarea
          placeholder="Aggiungi note o contesto..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full py-[9px] px-[13px] bg-[#F5F3F0] border border-[#E5E1D8] rounded-[9px] text-[#1a1a1a] text-[13.5px] outline-none transition-colors duration-150 focus:border-[#C8C2BA] placeholder:text-[#9A9690] resize-none"
        />

        {error && (
          <div className="text-[#f44] text-[12px] mt-2">{error}</div>
        )}

        <BtnPrimary onClick={handleSave}>
          {saving ? "Salvataggio..." : "Archivia"}
        </BtnPrimary>
        <BtnOutline onClick={handleClose}>Annulla</BtnOutline>
      </div>
    </ModalOverlay>
  );
}
