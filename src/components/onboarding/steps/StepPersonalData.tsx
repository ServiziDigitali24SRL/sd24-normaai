'use client';
import { useState, useEffect } from 'react';
import {
  USER_ROLES,
  COMPANY_SIZES,
  COMPANY_SECTORS,
  ORDINI_PROFESSIONALI,
} from '@/lib/onboarding-constants';
import { validatePIVA } from '@/lib/piva-validation';

interface StepPersonalDataProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPersonalData({ data, updateData, onNext, onPrev }: StepPersonalDataProps) {
  const [form, setForm] = useState({
    name: data.name || '',
    phone: data.phone || '',
    cap: data.cap || '',
    piva: data.piva || '',
    ordine_professionale: data.ordine_professionale || '',
    numero_iscrizione: data.numero_iscrizione || '',
    foro_competenza: data.foro_competenza || '',
    ragione_sociale: data.ragione_sociale || '',
    dimensione_azienda: data.dimensione_azienda || '',
    settore_azienda: data.settore_azienda || '',
    pec: data.pec || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pivaStatus, setPivaStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [pivaCompanyName, setPivaCompanyName] = useState('');

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  // Validazione P.IVA realtime
  useEffect(() => {
    if (!form.piva || form.piva.length < 11) { setPivaStatus('idle'); return; }
    const timer = setTimeout(async () => {
      setPivaStatus('loading');
      const result = await validatePIVA(form.piva);
      if (result.valid) {
        setPivaStatus('ok');
        if (result.companyName) {
          setPivaCompanyName(result.companyName);
          if (data.role === USER_ROLES.IMPRESA && !form.ragione_sociale) {
            set('ragione_sociale', result.companyName);
          }
        }
      } else {
        setPivaStatus('error');
        setErrors((p) => ({ ...p, piva: result.error || 'P.IVA non valida' }));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.piva]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome obbligatorio';
    if (data.role === USER_ROLES.CITTADINO) {
      if (form.cap && !/^\d{5}$/.test(form.cap)) e.cap = 'CAP non valido (5 cifre)';
    }
    if (data.role === USER_ROLES.PROFESSIONISTA) {
      if (!form.ordine_professionale) e.ordine_professionale = 'Seleziona ordine';
      if (!form.numero_iscrizione.trim()) e.numero_iscrizione = 'Numero iscrizione obbligatorio';
    }
    if (data.role === USER_ROLES.IMPRESA) {
      if (!form.ragione_sociale.trim()) e.ragione_sociale = 'Ragione sociale obbligatoria';
      if (!form.piva.trim()) e.piva = 'P.IVA obbligatoria';
      if (!form.dimensione_azienda) e.dimensione_azienda = 'Seleziona dimensione';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    updateData(form);
    onNext();
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 border rounded-lg text-[13px] bg-[#F0EDE8] outline-none transition-colors ${
      errors[field] ? 'border-red-400' : 'border-[#D5D0C8] focus:border-[#C8C2BA]'
    }`;

  return (
    <div>
      <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-1">I tuoi dati</h2>
      <p className="text-[13px] text-[#6B6763] mb-6">
        {data.role === USER_ROLES.PROFESSIONISTA ? 'Dati professionali' :
         data.role === USER_ROLES.IMPRESA ? 'Dati aziendali' : 'Dati personali'}
      </p>

      <div className="space-y-4 mb-8">
        {/* Nome */}
        <div>
          <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
            {data.role === USER_ROLES.IMPRESA ? 'Nome referente' : 'Nome e cognome'} *
          </label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)}
            className={inputCls('name')} placeholder="Mario Rossi" />
          {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Telefono (opzionale) */}
        <div>
          <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
            Telefono <span className="text-[#9A9690]">(opzionale)</span>
          </label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className={inputCls('phone')} placeholder="+39 333 1234567" type="tel" />
        </div>

        {/* CAP — solo Cittadino */}
        {data.role === USER_ROLES.CITTADINO && (
          <div>
            <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
              CAP <span className="text-[#9A9690]">(opzionale — per aggiornamenti locali)</span>
            </label>
            <input
              value={form.cap}
              onChange={(e) => set('cap', e.target.value.replace(/\D/g, '').slice(0, 5))}
              className={inputCls('cap')}
              placeholder="00100"
              inputMode="numeric"
              maxLength={5}
            />
            {errors.cap && <p className="text-[11px] text-red-500 mt-1">{errors.cap}</p>}
          </div>
        )}

        {/* PROFESSIONISTA */}
        {data.role === USER_ROLES.PROFESSIONISTA && (
          <>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">Ordine professionale *</label>
              <select value={form.ordine_professionale} onChange={(e) => set('ordine_professionale', e.target.value)}
                className={inputCls('ordine_professionale')}>
                <option value="">Seleziona ordine...</option>
                {ORDINI_PROFESSIONALI.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {errors.ordine_professionale && <p className="text-[11px] text-red-500 mt-1">{errors.ordine_professionale}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">Numero iscrizione albo *</label>
              <input value={form.numero_iscrizione} onChange={(e) => set('numero_iscrizione', e.target.value)}
                className={inputCls('numero_iscrizione')} placeholder="Es. 12345/A" />
              {errors.numero_iscrizione && <p className="text-[11px] text-red-500 mt-1">{errors.numero_iscrizione}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
                Foro/sede <span className="text-[#9A9690]">(opzionale)</span>
              </label>
              <input value={form.foro_competenza} onChange={(e) => set('foro_competenza', e.target.value)}
                className={inputCls('foro_competenza')} placeholder="Es. Roma, Milano..." />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
                P.IVA <span className="text-[#9A9690]">(opzionale)</span>
              </label>
              <div className="relative">
                <input value={form.piva} onChange={(e) => set('piva', e.target.value)}
                  className={inputCls('piva')} placeholder="12345678901" maxLength={13} />
                {pivaStatus === 'loading' && <span className="absolute right-3 top-2.5 text-[11px] text-[#9A9690]">...</span>}
                {pivaStatus === 'ok' && <span className="absolute right-3 top-2.5 text-[11px] text-green-600">✓{pivaCompanyName ? ` ${pivaCompanyName}` : ''}</span>}
              </div>
              {errors.piva && <p className="text-[11px] text-red-500 mt-1">{errors.piva}</p>}
            </div>
          </>
        )}

        {/* IMPRESA */}
        {data.role === USER_ROLES.IMPRESA && (
          <>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">P.IVA *</label>
              <div className="relative">
                <input value={form.piva} onChange={(e) => set('piva', e.target.value)}
                  className={inputCls('piva')} placeholder="12345678901" maxLength={13} />
                {pivaStatus === 'loading' && <span className="absolute right-3 top-2.5 text-[11px] text-[#9A9690]">verifica...</span>}
                {pivaStatus === 'ok' && <span className="absolute right-3 top-2.5 text-[11px] text-green-600">✓ valida</span>}
              </div>
              {errors.piva && <p className="text-[11px] text-red-500 mt-1">{errors.piva}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">Ragione sociale *</label>
              <input value={form.ragione_sociale} onChange={(e) => set('ragione_sociale', e.target.value)}
                className={inputCls('ragione_sociale')} placeholder="Acme S.r.l." />
              {errors.ragione_sociale && <p className="text-[11px] text-red-500 mt-1">{errors.ragione_sociale}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">Dimensione azienda *</label>
              <select value={form.dimensione_azienda} onChange={(e) => set('dimensione_azienda', e.target.value)}
                className={inputCls('dimensione_azienda')}>
                <option value="">Seleziona...</option>
                <option value={COMPANY_SIZES.MICRO}>Micro (1–9 dip.)</option>
                <option value={COMPANY_SIZES.PICCOLA}>Piccola (10–49 dip.)</option>
                <option value={COMPANY_SIZES.MEDIA}>Media (50–249 dip.)</option>
                <option value={COMPANY_SIZES.GRANDE}>Grande (250+ dip.)</option>
              </select>
              {errors.dimensione_azienda && <p className="text-[11px] text-red-500 mt-1">{errors.dimensione_azienda}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
                Settore <span className="text-[#9A9690]">(opzionale)</span>
              </label>
              <select value={form.settore_azienda} onChange={(e) => set('settore_azienda', e.target.value)}
                className={inputCls('settore_azienda')}>
                <option value="">Seleziona...</option>
                {Object.entries(COMPANY_SECTORS).map(([, v]) => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#1a1a1a] mb-1">
                PEC <span className="text-[#9A9690]">(opzionale)</span>
              </label>
              <input value={form.pec} onChange={(e) => set('pec', e.target.value)}
                className={inputCls('pec')} placeholder="azienda@pec.it" type="email" />
            </div>
          </>
        )}
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
