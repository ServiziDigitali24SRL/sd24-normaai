"use client";

import ModalOverlay, { ModalClose, ModalTitle, ModalSub } from "@/components/ModalOverlay";
import NormaConnettori from "@/components/NormaConnettori";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenModal: (id: string) => void;
}

export default function ModalConnettori({ open, onClose, onOpenModal }: Props) {
  return (
    <ModalOverlay open={open} onClose={onClose} maxWidth="max-w-[720px]">
      <div className="px-7 pt-7 pb-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Connettori</ModalTitle>
        <ModalSub>Collega i tuoi strumenti a NormaAI per analizzare documenti e ricevere alert.</ModalSub>
        <NormaConnettori onOpenModal={(id) => { onClose(); onOpenModal(id); }} />
      </div>
    </ModalOverlay>
  );
}
