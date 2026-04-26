'use client';
// /components/onboarding/steps/StepImpresaCompliance.tsx
// Step 4 Impresa — Profilo compliance con conditional logic
// Raccoglie i campi che attivano/disattivano i 24 rami della tassonomia

import { useState, useMemo } from 'react';
import {
  FATTURATO_RANGES,
  CLIENTELA_TYPES,
  DATI_PARTICOLARI,
  USI_AI,
  SETTORI_REGOLAMENTATI,
  CERTIFICAZIONI,
  ATECO_SECTIONS,
} from '@/lib/onboarding-constants';

interface Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepImpresaCompliance({ data, updateData, onNext, onPrev }: Props) {
  const [form, setForm] = useState({
    dipendenti_count:         data.dipendenti_count ?? defaultDipendenti(data.dimensione),
    fatturato_range:          data.fatturato_range || '',
    clientela_tipologia:      data.clientela_tipologia || [] as string[],
    ecommerce_attivo:         data.ecommerce_attivo || false,
    export_extra_ue:          data.export_extra_ue || false,
    import_extra_ue:          data.import_extra_ue || false,
    prodotti_forestali:       data.prodotti_forestali || false,
    gruppo_societario:        data.gruppo_societario || false,
    gruppo_ruolo:             data.gruppo_ruolo || '',
    lavoratori_esteri:        data.lavoratori_esteri || false,
    partecipa_gare_pubbliche: data.partecipa_gare_pubbliche || false,
    infrastruttura_critica:   data.infrastruttura_critica || false,
    fornitore_pa:             data.fornitore_pa || false,
    settore_regolamentato:    data.settore_regolamentato || '',
    sub_settore:              data.sub_settore || '',
    dati_particolari_trattati: data.dati_particolari_trattati || [] as string[],
    usa_ai_decisionale:       data.usa_ai_decisionale || false,
    usi_ai:                   data.usi_ai || [] as string[],
    soggetta_231:             data.soggetta_231 || false,
    mog_attivo:               data.mog_attivo || false,
    certificazioni:           data.certificazioni || [] as string[],
  });

  const atecoSection = data.ateco_section;
  const atecoIsRegolamentato = useMemo(
    () => ATECO_SECTIONS.find(s => s.code === atecoSection)?.regolamentato,
    [atecoSection]
  );

  // ─── Conditional triggers ───────────────────────────────
  const showWhistleblowing = form.dipendenti_count >= 50;
  const showCSRD = ['50m_750m','over_750m'].includes(form.fatturato_range) || form.dipendenti_count >= 250;
  const show231 = form.fatturato_range && (['10m_50m','50m_750m','over_750m'].includes(form.fatturato_range) || form.dipendenti_count >= 50);
  const showDatiParticolari = form.clientela_tipologia.includes('b2c') || form.ecommerce_attivo || atecoSection === 'Q';
  const showEUDR = form.import_extra_ue;
  const showInfrastruttura = atecoIsRegolamentato || form.partecipa_gare_pubbliche;
  const subSettori = useMemo(() => {
    if (!atecoSection) return [];
    const key = atecoSection === 'J' ? 'J_TELCO' : atecoSection;
    return (SETTORI_REGOLAMENTATI as any)[key] || [];
  }, [atecoSection]);

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleArr(key: keyof typeof form, val: string) {
    setForm(f => {
      const arr = (f[key] as string[]) || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }

  function next() {
    updateData(form);
    onNext();
  }

  // Stima rami attivati in tempo reale (feedback visivo)
  const activeBranches = useMemo(() => computeActiveBranches(data, form), [data, form]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="section-label mb-3">§ Profilo compliance · Step 4 di 6</div>
        <h2 className="font-serif text-[36px] tracking-[-0.5px] text-[var(--ink)] mb-2">
          Qualche domanda sulla tua attività
        </h2>
        <p className="text-[14px] text-[var(--ink-4)] leading-relaxed">
          Queste risposte ci servono per <strong>attivare solo</strong> i rami normativi rilevanti per la tua impresa.
          Niente checklist inutili.
        </p>
      </div>

      <div className="space-y-6">
        {/* Dipendenti + fatturato */}
        <Panel title="Dimensione operativa">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Numero dipendenti esatto *">
              <input
                type="number"
                min={0}
                value={form.dipendenti_count}
                onChange={e => set('dipendenti_count', parseInt(e.target.value || '0'))}
                className="input"
              />
            </Field>
            <Field label="Fatturato annuo *">
              <select
                value={form.fatturato_range}
                onChange={e => set('fatturato_range', e.target.value)}
                className="input"
              >
                <option value="">Seleziona range...</option>
                {FATTURATO_RANGES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>

        {/* Clientela + canali */}
        <Panel title="Clientela e canali">
          <Field label="Tipologia clientela (multi) *">
            <div className="flex flex-wrap gap-2">
              {CLIENTELA_TYPES.map(c => (
                <Chip
                  key={c.id}
                  on={form.clientela_tipologia.includes(c.id)}
                  onClick={() => toggleArr('clientela_tipologia', c.id)}
                >{c.label}</Chip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Toggle
              label="E-commerce / vendita online attivo"
              value={form.ecommerce_attivo}
              onChange={v => set('ecommerce_attivo', v)}
            />
            <Toggle
              label="Partecipate a gare pubbliche"
              value={form.partecipa_gare_pubbliche}
              onChange={v => set('partecipa_gare_pubbliche', v)}
            />
          </div>
        </Panel>

        {/* Internazionale */}
        <Panel title="Internazionale">
          <div className="grid grid-cols-2 gap-4">
            <Toggle
              label="Export extra-UE"
              hint="Trigger: sanzioni, dual-use, dogane"
              value={form.export_extra_ue}
              onChange={v => set('export_extra_ue', v)}
            />
            <Toggle
              label="Import extra-UE"
              hint="Trigger: dogane, dazi"
              value={form.import_extra_ue}
              onChange={v => set('import_extra_ue', v)}
            />
            <Toggle
              label="Lavoratori esteri / distacco"
              value={form.lavoratori_esteri}
              onChange={v => set('lavoratori_esteri', v)}
            />
            {showEUDR && (
              <Toggle
                label="Import prodotti forestali (legno, gomma, cacao, caffè)"
                hint="Trigger: EUDR deforestazione"
                value={form.prodotti_forestali}
                onChange={v => set('prodotti_forestali', v)}
              />
            )}
          </div>
        </Panel>

        {/* Settore regolamentato (conditional) */}
        {atecoIsRegolamentato && subSettori.length > 0 && (
          <Panel title="Settore regolamentato — dettagli" highlight>
            <Field label="Sub-settore specifico *">
              <select
                value={form.sub_settore}
                onChange={e => {
                  set('sub_settore', e.target.value);
                  set('settore_regolamentato', atecoSection);
                }}
                className="input"
              >
                <option value="">Seleziona...</option>
                {subSettori.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
          </Panel>
        )}

        {/* Struttura gruppo */}
        <Panel title="Struttura societaria">
          <Toggle
            label="Appartenete a un gruppo societario"
            value={form.gruppo_societario}
            onChange={v => set('gruppo_societario', v)}
          />
          {form.gruppo_societario && (
            <Field label="Ruolo nel gruppo">
              <select
                value={form.gruppo_ruolo}
                onChange={e => set('gruppo_ruolo', e.target.value)}
                className="input mt-3"
              >
                <option value="">Seleziona...</option>
                <option value="capogruppo">Capogruppo / Holding</option>
                <option value="controllata">Controllata</option>
                <option value="collegata">Collegata</option>
              </select>
            </Field>
          )}
        </Panel>

        {/* Infrastrutture critiche */}
        {showInfrastruttura && (
          <Panel title="Cybersecurity">
            <Toggle
              label="Fornitore infrastrutture critiche / PA essenziale"
              hint="Trigger: NIS2, DORA"
              value={form.infrastruttura_critica}
              onChange={v => set('infrastruttura_critica', v)}
            />
            <div className="mt-3">
              <Toggle
                label="Fornitore della Pubblica Amministrazione"
                value={form.fornitore_pa}
                onChange={v => set('fornitore_pa', v)}
              />
            </div>
          </Panel>
        )}

        {/* Dati particolari */}
        {showDatiParticolari && (
          <Panel title="Dati personali trattati" highlight>
            <Field label="Trattate dati particolari? (multi)" hint="Trigger: DPIA, DPO obbligatorio (art. 9 GDPR)">
              <div className="flex flex-wrap gap-2">
                {DATI_PARTICOLARI.map(d => (
                  <Chip
                    key={d.id}
                    on={form.dati_particolari_trattati.includes(d.id)}
                    onClick={() => toggleArr('dati_particolari_trattati', d.id)}
                  >{d.label}</Chip>
                ))}
              </div>
            </Field>
          </Panel>
        )}

        {/* AI */}
        <Panel title="Intelligenza Artificiale">
          <Toggle
            label="Usate AI per decisioni automatiche o semi-automatiche"
            hint="Trigger: AI Act — valutazione impatto"
            value={form.usa_ai_decisionale}
            onChange={v => set('usa_ai_decisionale', v)}
          />
          {form.usa_ai_decisionale && (
            <Field label="Per quali usi? (multi)">
              <div className="flex flex-wrap gap-2 mt-3">
                {USI_AI.map(u => (
                  <Chip
                    key={u.id}
                    on={form.usi_ai.includes(u.id)}
                    onClick={() => toggleArr('usi_ai', u.id)}
                  >{u.label}</Chip>
                ))}
              </div>
            </Field>
          )}
        </Panel>

        {/* 231 */}
        {show231 && (
          <Panel title="Responsabilità 231" highlight>
            <Toggle
              label="Soggetti a D.Lgs 231/2001"
              hint="Obbligatorio di fatto per aziende con attività a rischio o gare pubbliche"
              value={form.soggetta_231}
              onChange={v => set('soggetta_231', v)}
            />
            {form.soggetta_231 && (
              <div className="mt-3">
                <Toggle
                  label="MOG (Modello Organizzativo) attivo e aggiornato"
                  value={form.mog_attivo}
                  onChange={v => set('mog_attivo', v)}
                />
              </div>
            )}
          </Panel>
        )}

        {/* Certificazioni */}
        <Panel title="Certificazioni attive">
          <Field label="Certificazioni in essere (multi)">
            <div className="flex flex-wrap gap-2">
              {CERTIFICAZIONI.map(c => (
                <Chip
                  key={c.id}
                  on={form.certificazioni.includes(c.id)}
                  onClick={() => toggleArr('certificazioni', c.id)}
                >{c.label}</Chip>
              ))}
            </div>
          </Field>
        </Panel>

        {/* CSRD info */}
        {showCSRD && (
          <div className="p-3 bg-[var(--ambra-soft)] border border-[var(--ambra)] rounded-[6px] text-[12px] text-[var(--ink-3)]">
            ⓘ Per dimensioni ≥250 dip / €50M fatturato sarete progressivamente soggetti a <strong>CSRD</strong> (rendicontazione sostenibilità). Il ramo ESG verrà attivato.
          </div>
        )}
      </div>

      {/* Preview rami attivi */}
      <div className="mt-8 p-5 bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[6px]">
        <div className="flex items-center justify-between mb-3">
          <div className="caps text-[var(--ink-4)]">Rami compliance che verranno attivati</div>
          <div className="font-mono text-[13px] text-[var(--vermiglio-ink)]">{activeBranches.length} / 24</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activeBranches.map(b => (
            <span key={b.id} className="px-2 py-1 bg-[var(--paper)] border border-[var(--paper-line)] rounded-[3px] text-[11px] text-[var(--ink-3)]">
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onPrev} className="btn btn-ghost">← Indietro</button>
        <button onClick={next} className="btn btn-primary">Continua — Ruoli compliance →</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function defaultDipendenti(dim?: string): number {
  if (dim === 'micro') return 5;
  if (dim === 'piccola') return 20;
  if (dim === 'media') return 100;
  return 0;
}

function computeActiveBranches(data: any, form: any): {id:string, label:string}[] {
  const out: {id:string, label:string}[] = [];
  // Always-on
  ['Privacy & GDPR','Fiscale','Contrattualistica','Proprietà Intellettuale','Crisi & Litigation','Assicurazioni','Documentale']
    .forEach((label, i) => out.push({id: `always_${i}`, label}));

  if (form.dipendenti_count > 0) out.push({id:'lavoro', label:'Lavoro & HR'});
  if (!['ditta_ind','libero_prof'].includes(data.forma_giuridica)) out.push({id:'societario', label:'Societario'});
  if (form.soggetta_231) { out.push({id:'d231', label:'D.Lgs 231'}); out.push({id:'gov', label:'Governance'}); }
  if (['A','B','C','D','E','F','H'].includes(data.ateco_section)) out.push({id:'amb', label:'Ambiente'});
  if (form.settore_regolamentato === 'K') { out.push({id:'aml', label:'AML'}); out.push({id:'dora', label:'DORA'}); }
  if (form.infrastruttura_critica || form.settore_regolamentato) out.push({id:'nis2', label:'NIS2'});
  if (form.clientela_tipologia.includes('b2c')) out.push({id:'cons', label:'Consumatore'});
  if (['50m_750m','over_750m'].includes(form.fatturato_range)) out.push({id:'anti', label:'Antitrust'});
  if (form.partecipa_gare_pubbliche) out.push({id:'app', label:'Appalti Pubblici'});
  if (form.settore_regolamentato) out.push({id:'sett', label:'Settoriale'});
  if (['50m_750m','over_750m'].includes(form.fatturato_range) || form.dipendenti_count >= 250) out.push({id:'esg', label:'ESG & CSRD'});
  if (form.export_extra_ue || form.lavoratori_esteri) out.push({id:'int', label:'Internazionale'});
  if (form.dipendenti_count >= 50) out.push({id:'wb', label:'Whistleblowing'});
  if (form.usa_ai_decisionale) out.push({id:'ai', label:'AI Act'});
  if (form.import_extra_ue && form.prodotti_forestali) out.push({id:'eudr', label:'EUDR'});
  return out;
}

// ────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────

function Panel({ title, children, highlight = false }: { title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-[6px] border ${highlight ? 'bg-[var(--vermiglio-soft)] border-[var(--vermiglio)]' : 'bg-[var(--paper-tint)] border-[var(--paper-line)]'}`}>
      <div className="caps text-[var(--ink-4)] mb-4">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-[var(--ink-3)] mb-2">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[var(--ink-5)] mt-1.5">{hint}</p>}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[11.5px] rounded-[3px] border transition-colors ${
        on
          ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
          : 'bg-transparent text-[var(--ink-3)] border-[var(--paper-line)] hover:border-[var(--ink-5)]'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`mt-0.5 w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${value ? 'bg-[var(--ink)]' : 'bg-[var(--paper-line)]'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
      <div>
        <div className="text-[12.5px] text-[var(--ink-2)] font-medium">{label}</div>
        {hint && <div className="text-[11px] text-[var(--ink-5)] mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}
