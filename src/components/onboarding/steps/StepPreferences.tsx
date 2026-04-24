'use client';
import { useState, useEffect } from 'react';
import {
  USER_ROLES,
  CITTADINO_AREE,
  CITTADINO_OBIETTIVI,
  PROFESSIONISTA_AREE,
  PROFESSIONISTA_OBIETTIVI,
  IMPRESA_AREE,
  IMPRESA_OBIETTIVI,
} from '@/lib/onboarding-constants';

interface StepPreferencesProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const FREQUENZA_OPTIONS = [
  { id: 'daily',   label: 'Quotidiano',   desc: 'Ogni mattina alle 08:00' },
  { id: 'weekly',  label: 'Settimanale',  desc: 'Rassegna del lunedì mattina' },
  { id: 'monthly', label: 'Mensile',      desc: 'Il primo di ogni mese' },
  { id: 'silent',  label: 'Solo urgenti', desc: 'Alert solo per novità critiche' },
];

export function StepPreferences({ data, updateData, onNext, onPrev }: StepPreferencesProps) {
  const [aree, setAree] = useState<{ predefinite: string[]; personalizzate: string[] }>(
    data.aree_interesse || { predefinite: [], personalizzate: [] }
  );
  const [obiettivo, setObiettivo] = useState(data.obiettivo_principale || '');
  const [frequenza, setFrequenza] = useState<string>(data.frequenza_aggiornamenti || '');
  const [nuovaArea, setNuovaArea] = useState('');
  const [error, setError] = useState('');

  // Pre-seleziona aree default per impresa
  useEffect(() => {
    if (data.role === USER_ROLES.IMPRESA && data.dimensione_azienda && aree.predefinite.length === 0) {
      const defaults = (IMPRESA_AREE[data.dimensione_azienda] || []).slice(0, 3).map((a) => a.id);
      setAree((p) => ({ ...p, predefinite: defaults }));
    }
  }, [data.role, data.dimensione_azienda]);

  const areeDisponibili =
    data.role === USER_ROLES.CITTADINO ? CITTADINO_AREE :
    data.role === USER_ROLES.PROFESSIONISTA ? PROFESSIONISTA_AREE :
    IMPRESA_AREE[data.dimensione_azienda] || [];

  const obiettiviDisponibili =
    data.role === USER_ROLES.CITTADINO ? CITTADINO_OBIETTIVI :
    data.role === USER_ROLES.PROFESSIONISTA ? PROFESSIONISTA_OBIETTIVI :
    IMPRESA_OBIETTIVI;

  const toggleArea = (id: string) => {
    setAree((p) => ({
      ...p,
      predefinite: p.predefinite.includes(id)
        ? p.predefinite.filter((a) => a !== id)
        : [...p.predefinite, id],
    }));
    setError('');
  };

  const addCustomArea = () => {
    const trimmed = nuovaArea.trim();
    if (!trimmed || aree.personalizzate.includes(trimmed)) return;
    setAree((p) => ({ ...p, personalizzate: [...p.personalizzate, trimmed] }));
    setNuovaArea('');
  };

  const handleNext = () => {
    const totale = aree.predefinite.length + aree.personalizzate.length;
    const minRequired = data.role === USER_ROLES.CITTADINO ? 3 : 1;
    if (totale < minRequired) {
      setError(`Seleziona almeno ${minRequired} ${minRequired === 1 ? 'area di interesse' : 'aree di interesse'}`);
      return;
    }
    updateData({ aree_interesse: aree, obiettivo_principale: obiettivo, frequenza_aggiornamenti: frequenza });
    onNext();
  };

  return (
    <div>
      <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-1">Le tue preferenze</h2>
      <p className="text-[13px] text-[#6B6763] mb-6">Personalizza la tua esperienza su NormaAI</p>

      {/* Aree interesse */}
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-[#1a1a1a] mb-3">
          Aree di interesse *
          {data.role === USER_ROLES.CITTADINO && (
            <span className="text-[#9A9690] font-normal ml-1">
              (min. 3 — {aree.predefinite.length + aree.personalizzate.length} selezionate)
            </span>
          )}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {areeDisponibili.map((area) => {
            const selected = aree.predefinite.includes(area.id);
            return (
              <button key={area.id} onClick={() => toggleArea(area.id)}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  selected ? 'border-accent bg-accent/5' : 'border-[#E5E1D8] hover:border-[#C8C2BA] bg-white'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1a1a1a]">{area.label}</span>
                  {selected && (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-accent fill-none stroke-[2.5]">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  )}
                </div>
                {area.desc && <p className="text-[11px] text-[#9A9690] mt-0.5">{area.desc}</p>}
              </button>
            );
          })}
        </div>
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
      </div>

      {/* Area personalizzata */}
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-[#1a1a1a] mb-2">
          Aggiungi area personalizzata <span className="text-[#9A9690]">(opzionale)</span>
        </label>
        <div className="flex gap-2">
          <input value={nuovaArea} onChange={(e) => setNuovaArea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomArea()}
            className="flex-1 px-3 py-2 border border-[#D5D0C8] rounded-lg text-[13px] bg-[#F0EDE8] outline-none focus:border-[#C8C2BA]"
            placeholder="Es. Diritto sportivo..." />
          <button onClick={addCustomArea}
            className="px-3 py-2 border border-[#D5D0C8] rounded-lg text-[13px] text-[#6B6763] hover:bg-[#F0EDE8] transition-colors">
            +
          </button>
        </div>
        {aree.personalizzate.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {aree.personalizzate.map((a) => (
              <span key={a} className="flex items-center gap-1 text-[11.5px] bg-accent/10 text-accent border border-accent/20 rounded-full px-2.5 py-0.5">
                {a}
                <button onClick={() => setAree((p) => ({ ...p, personalizzate: p.personalizzate.filter((x) => x !== a) }))}
                  className="ml-0.5 text-accent/60 hover:text-accent">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Obiettivo principale */}
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-[#1a1a1a] mb-2">
          Obiettivo principale <span className="text-[#9A9690]">(opzionale)</span>
        </label>
        <div className="space-y-2">
          {obiettiviDisponibili.map((obj) => (
            <button key={obj} onClick={() => setObiettivo(obj === obiettivo ? '' : obj)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all ${
                obiettivo === obj ? 'border-accent bg-accent/5 text-[#1a1a1a]' : 'border-[#E5E1D8] text-[#6B6763] hover:border-[#C8C2BA]'
              }`}>
              {obj}
            </button>
          ))}
        </div>
      </div>

      {/* Frequenza aggiornamenti */}
      <div className="mb-8">
        <label className="block text-[12px] font-medium text-[#1a1a1a] mb-2">
          Frequenza aggiornamenti <span className="text-[#9A9690]">(opzionale)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENZA_OPTIONS.map((f) => (
            <button key={f.id} onClick={() => setFrequenza(f.id === frequenza ? '' : f.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                frequenza === f.id
                  ? 'border-accent bg-accent/5'
                  : 'border-[#E5E1D8] hover:border-[#C8C2BA] bg-white'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-[#1a1a1a]">{f.label}</span>
                {frequenza === f.id && (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-accent fill-none stroke-[2.5]">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </div>
              <p className="text-[11px] text-[#9A9690] mt-0.5">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onPrev}
          className="flex-1 py-3 border border-[#E5E1D8] text-[#6B6763] rounded-xl text-[13px] hover:bg-[#F0EDE8] transition-colors">
          ← Indietro
        </button>
        <button onClick={handleNext}
          className="flex-1 py-3 bg-accent text-white rounded-xl font-medium text-[13px] hover:bg-accent-hover transition-colors">
          Continua →
        </button>
      </div>
    </div>
  );
}
