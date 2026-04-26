'use client';
// /components/onboarding/steps/StepImpresaAnagrafica.tsx
// Step 3 Impresa — Anagrafica con VIES auto-fill
// Raccoglie: P.IVA, ragione sociale, forma giuridica, ATECO, sede legale

import { useState, useEffect } from 'react';
import { FORMA_GIURIDICA, ATECO_SECTIONS, REGIONI_ITALIA } from '@/lib/onboarding-constants';
import { validatePIVA } from '@/lib/piva-validation';

interface Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepImpresaAnagrafica({ data, updateData, onNext, onPrev }: Props) {
  const [form, setForm] = useState({
    piva:                 data.piva || '',
    codice_fiscale:       data.codice_fiscale || '',
    ragione_sociale:      data.ragione_sociale || '',
    forma_giuridica:      data.forma_giuridica || '',
    pec:                  data.pec || '',
    telefono:             data.telefono || '',
    ateco_section:        data.ateco_section || '',
    ateco_code:           data.ateco_code || '',
    sede_legale_indirizzo: data.sede_legale_indirizzo || '',
    sede_legale_comune:   data.sede_legale_comune || '',
    sede_legale_provincia: data.sede_legale_provincia || '',
    sede_legale_cap:      data.sede_legale_cap || '',
    sedi_operative_regioni: data.sedi_operative_regioni || [] as string[],
  });

  const [errors, setErrors] = useState<Record<string,string>>({});
  const [pivaCheck, setPivaCheck] = useState<any>(null);
  const [pivaLoading, setPivaLoading] = useState(false);

  useEffect(() => {
    if (form.piva.replace(/\D/g,'').length >= 11) {
      runVies();
    }
  }, [form.piva]);

  async function runVies() {
    setPivaLoading(true);
    try {
      const res = await validatePIVA(form.piva);
      setPivaCheck(res);
      if (res.valid && res.companyName && !form.ragione_sociale) {
        setForm(f => ({ ...f, ragione_sociale: res.companyName }));
      }
    } catch (e) { console.error(e); }
    finally { setPivaLoading(false); }
  }

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k as string]) setErrors(e => ({ ...e, [k]: '' }));
  }

  function toggleRegione(r: string) {
    setForm(f => ({
      ...f,
      sedi_operative_regioni: f.sedi_operative_regioni.includes(r)
        ? f.sedi_operative_regioni.filter(x => x !== r)
        : [...f.sedi_operative_regioni, r],
    }));
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!form.piva.trim()) e.piva = 'P.IVA richiesta';
    else if (pivaCheck && !pivaCheck.valid) e.piva = 'P.IVA non valida';
    if (!form.ragione_sociale.trim()) e.ragione_sociale = 'Ragione sociale richiesta';
    if (!form.forma_giuridica) e.forma_giuridica = 'Forma giuridica richiesta';
    if (!form.ateco_section) e.ateco_section = 'Settore ATECO richiesto';
    if (!form.pec.trim()) e.pec = 'PEC richiesta';
    if (!form.telefono.trim()) e.telefono = 'Telefono richiesto';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    updateData(form);
    onNext();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="section-label mb-3">§ Anagrafica · Step 3 di 6</div>
        <h2 className="font-serif text-[36px] tracking-[-0.5px] text-[var(--ink)] mb-2">
          Dati della tua impresa
        </h2>
        <p className="text-[14px] text-[var(--ink-4)] leading-relaxed">
          Compiliamo insieme l&apos;anagrafica. Inserisci la P.IVA e verifichiamo automaticamente ragione sociale e forma giuridica dal Registro Imprese.
        </p>
      </div>

      <div className="space-y-5">
        {/* P.IVA + Codice Fiscale */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partita IVA *" error={errors.piva}>
            <div className="relative">
              <input
                type="text"
                value={form.piva}
                onChange={e => set('piva', e.target.value)}
                placeholder="12345678901"
                className="input"
              />
              {pivaLoading && <Spinner className="absolute right-3 top-3" />}
              {pivaCheck?.valid && !pivaLoading && (
                <span className="absolute right-3 top-2.5 text-[var(--alloro)] text-[16px]">✓</span>
              )}
            </div>
            {pivaCheck?.valid && pivaCheck.companyName && (
              <p className="text-[11.5px] text-[var(--alloro)] mt-1.5">
                ✓ Rilevata: <strong>{pivaCheck.companyName}</strong>
              </p>
            )}
          </Field>
          <Field label="Codice Fiscale (se diverso)">
            <input
              type="text"
              value={form.codice_fiscale}
              onChange={e => set('codice_fiscale', e.target.value)}
              placeholder="Come P.IVA oppure CF separato"
              className="input"
            />
          </Field>
        </div>

        {/* Ragione sociale + Forma giuridica */}
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <Field label="Ragione sociale *" error={errors.ragione_sociale}>
            <input
              type="text"
              value={form.ragione_sociale}
              onChange={e => set('ragione_sociale', e.target.value)}
              placeholder="Es. Acme S.r.l."
              className="input"
            />
          </Field>
          <Field label="Forma giuridica *" error={errors.forma_giuridica}>
            <select
              value={form.forma_giuridica}
              onChange={e => set('forma_giuridica', e.target.value)}
              className="input"
            >
              <option value="">Seleziona...</option>
              {FORMA_GIURIDICA.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* PEC + Telefono */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="PEC aziendale *" error={errors.pec}>
            <input
              type="email"
              value={form.pec}
              onChange={e => set('pec', e.target.value)}
              placeholder="impresa@pec.it"
              className="input"
            />
          </Field>
          <Field label="Telefono aziendale *" error={errors.telefono}>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              placeholder="+39 06 1234567"
              className="input"
            />
          </Field>
        </div>

        {/* ATECO */}
        <div className="p-4 bg-[var(--paper-tint)] border border-[var(--paper-line)] rounded-[6px]">
          <div className="text-[11px] caps text-[var(--ink-4)] mb-3">Settore ATECO</div>
          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <Field label="Sezione *" error={errors.ateco_section}>
              <select
                value={form.ateco_section}
                onChange={e => set('ateco_section', e.target.value)}
                className="input"
              >
                <option value="">Seleziona sezione...</option>
                {ATECO_SECTIONS.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}{s.regolamentato ? ' ⚖' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Codice dettagliato (opz.)">
              <input
                type="text"
                value={form.ateco_code}
                onChange={e => set('ateco_code', e.target.value)}
                placeholder="Es. 62.01.00"
                className="input"
              />
            </Field>
          </div>
          {form.ateco_section && ATECO_SECTIONS.find(s => s.code === form.ateco_section)?.regolamentato && (
            <p className="text-[11.5px] text-[var(--vermiglio-ink)] mt-2">
              ⚖ Settore regolamentato — ti chiederemo dettagli al prossimo step.
            </p>
          )}
        </div>

        {/* Sede legale */}
        <div className="p-4 bg-[var(--paper-tint)] border border-[var(--paper-line)] rounded-[6px]">
          <div className="text-[11px] caps text-[var(--ink-4)] mb-3">Sede legale</div>
          <div className="space-y-3">
            <Field label="Indirizzo">
              <input
                type="text"
                value={form.sede_legale_indirizzo}
                onChange={e => set('sede_legale_indirizzo', e.target.value)}
                placeholder="Via Roma 1"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
              <Field label="Comune">
                <input
                  type="text"
                  value={form.sede_legale_comune}
                  onChange={e => set('sede_legale_comune', e.target.value)}
                  placeholder="Milano"
                  className="input"
                />
              </Field>
              <Field label="Provincia">
                <input
                  type="text"
                  maxLength={2}
                  value={form.sede_legale_provincia}
                  onChange={e => set('sede_legale_provincia', e.target.value.toUpperCase())}
                  placeholder="MI"
                  className="input"
                />
              </Field>
              <Field label="CAP">
                <input
                  type="text"
                  maxLength={5}
                  value={form.sede_legale_cap}
                  onChange={e => set('sede_legale_cap', e.target.value)}
                  placeholder="20121"
                  className="input"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Sedi operative multi-regione */}
        <Field
          label="Sedi operative — regioni (multi-select)"
          hint="Seleziona solo se hai sedi operative in regioni diverse dalla sede legale. Utile per attivare normative regionali specifiche."
        >
          <div className="flex flex-wrap gap-2">
            {REGIONI_ITALIA.map(r => {
              const on = form.sedi_operative_regioni.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegione(r)}
                  className={`px-3 py-1.5 text-[11.5px] rounded-[3px] border transition-colors ${
                    on
                      ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                      : 'bg-transparent text-[var(--ink-3)] border-[var(--paper-line)] hover:border-[var(--ink-5)]'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onPrev} className="btn btn-ghost">← Indietro</button>
        <button onClick={next} className="btn btn-primary">Continua — Profilo compliance →</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────

function Field({
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-[var(--ink-3)] mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-[var(--ink-5)] mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-[var(--vermiglio-ink)] mt-1">{error}</p>}
    </div>
  );
}

function Spinner({ className = '' }: { className?: string }) {
  return <div className={`animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-4)] ${className}`} />;
}
