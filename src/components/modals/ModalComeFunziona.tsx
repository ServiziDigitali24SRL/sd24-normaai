"use client";

import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  BtnPrimary,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    num: "01",
    title: "Scrivi il tuo problema",
    desc: "Multa, contratto, licenza, busta paga, permesso edilizio — scrivi come lo diresti a un amico. NormaAI capisce il linguaggio comune, non serve sapere i termini tecnici.",
  },
  {
    num: "02",
    title: "Ottieni la risposta giusta, con le fonti",
    desc: "Abbiamo impiegato oltre 6 mesi ad acquisire e studiare la legislazione italiana — manuali, codici, testi di legge. NormaAI conosce la normativa e ti risponde citando articoli e leggi reali, non opinioni.",
  },
  {
    num: "03",
    title: "Capire, non solo leggere",
    desc: "La burocrazia italiana è tra le più complesse al mondo. NormaAI raccoglie in pochi secondi informazioni che altrimenti richiederebbero ore di ricerca su decine di fonti diverse.",
  },
  {
    num: "04",
    title: "Quando serve un professionista, ti troviamo il migliore",
    desc: "NormaAI non sostituisce l'avvocato o il commercialista — ma sa riconoscerti quando ne hai davvero bisogno. In quel caso, ti mette in contatto con il professionista giusto per il tuo caso specifico.",
  },
];

export default function ModalComeFunziona({ open, onClose }: Props) {
  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Come funziona NormaAI</ModalTitle>
        <ModalSub>Abbiamo allenato il modello AI più avanzato al mondo sulla normativa italiana. Efficace al 95%.</ModalSub>

        {STEPS.map((s) => (
          <div
            key={s.num}
            className="flex gap-[14px] py-4 border-b border-[#1a1a1a] last:border-b-0"
          >
            <div className="font-serif text-[30px] text-accent min-w-[36px] leading-none">
              {s.num}
            </div>
            <div>
              <div className="font-medium text-[14px] mb-[3px]">{s.title}</div>
              <div className="text-[12.5px] text-[#666] leading-[1.6]">
                {s.desc}
              </div>
            </div>
          </div>
        ))}

        <BtnPrimary onClick={onClose} className="mt-2">
          Inizia ora &mdash; e gratis
        </BtnPrimary>
      </div>
    </ModalOverlay>
  );
}
