'use client';
import { USER_ROLES } from '@/lib/onboarding-constants';

interface StepCompletionProps {
  data: any;
  onComplete: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

export function StepCompletion({ data, onComplete, onPrev, isLoading }: StepCompletionProps) {
  const roleIcon = data.role === USER_ROLES.CITTADINO ? '🏠' : data.role === USER_ROLES.PROFESSIONISTA ? '⚖️' : '🏢';
  const roleLabel = data.role === USER_ROLES.CITTADINO ? 'Cittadino' : data.role === USER_ROLES.PROFESSIONISTA ? 'Professionista' : 'Impresa';
  const totalAree = (data.aree_interesse?.predefinite?.length || 0) + (data.aree_interesse?.personalizzate?.length || 0);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-[48px] mb-3">{roleIcon}</div>
        <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-1">Tutto pronto, {data.name || 'benvenuto'}!</h2>
        <p className="text-[13px] text-[#6B6763]">Il tuo profilo NormaAI è configurato</p>
      </div>

      {/* Riepilogo */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[#6B6763]">Profilo</span>
          <span className="font-medium text-[#1a1a1a]">{roleLabel}</span>
        </div>
        {data.name && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6763]">Nome</span>
            <span className="font-medium text-[#1a1a1a]">{data.name}</span>
          </div>
        )}
        {data.ordine_professionale && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6763]">Ordine</span>
            <span className="font-medium text-[#1a1a1a] capitalize">{data.ordine_professionale}</span>
          </div>
        )}
        {data.ragione_sociale && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6763]">Azienda</span>
            <span className="font-medium text-[#1a1a1a]">{data.ragione_sociale}</span>
          </div>
        )}
        {totalAree > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6763]">Aree interesse</span>
            <span className="font-medium text-[#1a1a1a]">{totalAree} selezionate</span>
          </div>
        )}
        {data.obiettivo_principale && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6763]">Obiettivo</span>
            <span className="font-medium text-[#1a1a1a] text-right max-w-[200px]">{data.obiettivo_principale}</span>
          </div>
        )}
      </div>

      {/* Cosa puoi fare subito */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-8">
        <p className="text-[12px] font-semibold text-accent mb-2">Cosa puoi fare subito</p>
        <ul className="space-y-1.5">
          {data.role === USER_ROLES.PROFESSIONISTA ? (
            <>
              <li className="text-[12px] text-[#6B6763]">⚖️ Cerca normativa per i tuoi casi</li>
              <li className="text-[12px] text-[#6B6763]">🎯 Accedi al marketplace per nuovi clienti</li>
              <li className="text-[12px] text-[#6B6763]">🔔 Imposta alert su novità normative</li>
            </>
          ) : data.role === USER_ROLES.IMPRESA ? (
            <>
              <li className="text-[12px] text-[#6B6763]">📋 Analizza la tua compliance aziendale</li>
              <li className="text-[12px] text-[#6B6763]">📄 Carica documenti per analisi AI</li>
              <li className="text-[12px] text-[#6B6763]">🔔 Monitora scadenze normative</li>
            </>
          ) : (
            <>
              <li className="text-[12px] text-[#6B6763]">💬 Fai una domanda sulla tua situazione</li>
              <li className="text-[12px] text-[#6B6763]">📚 Leggi le guide gratuite</li>
              <li className="text-[12px] text-[#6B6763]">👤 Trova un professionista</li>
            </>
          )}
        </ul>
      </div>

      <div className="flex gap-3">
        <button onClick={onPrev} disabled={isLoading}
          className="px-4 py-3 border border-[#E5E1D8] text-[#6B6763] rounded-xl text-[13px] hover:bg-[#F0EDE8] transition-colors disabled:opacity-40">
          ← Indietro
        </button>
        <button onClick={onComplete} disabled={isLoading}
          className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {isLoading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvataggio...</>
          ) : (
            'Inizia a usare NormaAI →'
          )}
        </button>
      </div>
    </div>
  );
}
