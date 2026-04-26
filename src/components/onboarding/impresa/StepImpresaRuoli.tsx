'use client';
// /components/onboarding/steps/StepImpresaRuoli.tsx
// Step 5 Impresa — Ruoli compliance già nominati + Referente compliance principale
// Evita di chiedere alla dashboard "nominare X" se è già stato fatto

import { useState, useMemo } from 'react';

interface Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

// Ruolo a 4 campi: role_id, nome, email, interno/esterno
interface RuoloNominato {
  role: string;
  name: string;
  email: string;
  interno: boolean;
}

export function StepImpresaRuoli({ data, updateData, onNext, onPrev }: Props) {
  const [ruoli, setRuoli] = useState<RuoloNominato[]>(data.ruoli_nominati || []);
  const [referente, setReferente] = useState({
    referente_nome:    data.referente_nome || '',
    referente_email:   data.referente_email || '',
    referente_ruolo:   data.referente_ruolo || '',
    referente_telefono: data.referente_telefono || '',
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  // Ruoli da mostrare derivati dai dati raccolti
  const ruoliRichiesti = useMemo(() => {
    const list: { id: string; label: string; desc: string; required?: boolean }[] = [];
    if (data.dati_particolari_trattati?.length > 0 || data.settore_regolamentato || (data.dipendenti_count ?? 0) >= 250) {
      list.push({ id: 'dpo', label: 'DPO — Data Protection Officer', desc: 'Obbligatorio per dati particolari o settore regolamentato', required: true });
    } else {
      list.push({ id: 'dpo', label: 'DPO — Data Protection Officer', desc: 'Opzionale per la tua dimensione' });
    }
    if ((data.dipendenti_count ?? 0) > 0) {
      list.push({ id: 'rspp', label: 'RSPP — Resp. Servizio Prevenzione e Protezione', desc: 'D.Lgs 81/2008', required: true });
    }
    if ((data.dipendenti_count ?? 0) > 0) {
      list.push({ id: 'medico_comp', label: 'Medico Competente', desc: 'Se mansioni a rischio' });
    }
    if (data.soggetta_231) {
      list.push({ id: 'odv', label: 'OdV — Organismo di Vigilanza 231', desc: 'Componente obbligatoria MOG', required: true });
    }
    if (data.settore_regolamentato === 'K' || ['gioco','luxury','antiquariato'].includes(data.sub_settore)) {
      list.push({ id: 'resp_aml', label: 'Responsabile Antiriciclaggio', desc: 'D.Lgs 231/2007', required: true });
    }
    if ((data.dipendenti_count ?? 0) >= 50) {
      list.push({ id: 'resp_whistle', label: 'Resp. Whistleblowing', desc: 'D.Lgs 24/2023', required: true });
    }
    if (data.infrastruttura_critica || data.settore_regolamentato === 'K') {
      list.push({ id: 'ciso', label: 'CISO — Resp. Cybersecurity', desc: 'NIS2 / DORA', required: true });
    }
    return list;
  }, [data]);

  function getRuolo(id: string): RuoloNominato | undefined {
    return ruoli.find(r => r.role === id);
  }

  function updateRuolo(id: string, patch: Partial<RuoloNominato>) {
    const existing = ruoli.find(r => r.role === id);
    if (existing) {
      setRuoli(ruoli.map(r => r.role === id ? { ...r, ...patch } : r));
    } else {
      setRuoli([...ruoli, { role: id, name: '', email: '', interno: true, ...patch }]);
    }
  }

  function removeRuolo(id: string) {
    setRuoli(ruoli.filter(r => r.role !== id));
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!referente.referente_nome.trim()) e.referente_nome = 'Nome richiesto';
    if (!referente.referente_email.trim()) e.referente_email = 'Email richiesta';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(referente.referente_email)) e.referente_email = 'Email non valida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    updateData({ ruoli_nominati: ruoli, ...referente });
    onNext();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="section-label mb-3">§ Ruoli e referente · Step 5 di 6</div>
        <h2 className="font-serif text-[36px] tracking-[-0.5px] text-[var(--ink)] mb-2">
          Chi gestisce la compliance in azienda?
        </h2>
        <p className="text-[14px] text-[var(--ink-4)] leading-relaxed">
          Indica i ruoli compliance <strong>già nominati</strong>. Eviteremo di inserirli come task aperti nella tua dashboard.
          Se non l&apos;avete ancora fatto, lascia vuoto — la dashboard te lo ricorderà nel ramo corretto.
        </p>
      </div>

      {/* Ruoli richiesti */}
      <div className="space-y-3 mb-8">
        {ruoliRichiesti.map(rr => {
          const cur = getRuolo(rr.id);
          const active = !!cur;
          return (
            <div
              key={rr.id}
              className={`p-4 rounded-[6px] border transition-colors ${
                active
                  ? 'bg-[var(--paper-tint)] border-[var(--ink-5)]'
                  : 'bg-transparent border-[var(--paper-line)]'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => {
                    if (e.target.checked) updateRuolo(rr.id, {});
                    else removeRuolo(rr.id);
                  }}
                  className="mt-1 w-4 h-4 accent-[var(--ink)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--ink-2)]">{rr.label}</span>
                    {rr.required && (
                      <span className="text-[10px] caps px-1.5 py-0.5 rounded-[2px] bg-[var(--vermiglio-soft)] text-[var(--vermiglio-ink)]">
                        Obbligatorio
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-5)] mt-0.5">{rr.desc}</div>
                </div>
              </label>

              {active && cur && (
                <div className="mt-4 ml-7 grid grid-cols-[1fr_1fr_auto] gap-3">
                  <input
                    type="text"
                    placeholder="Nome e cognome"
                    value={cur.name}
                    onChange={e => updateRuolo(rr.id, { name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="email"
                    placeholder="email@azienda.it"
                    value={cur.email}
                    onChange={e => updateRuolo(rr.id, { email: e.target.value })}
                    className="input"
                  />
                  <select
                    value={cur.interno ? 'interno' : 'esterno'}
                    onChange={e => updateRuolo(rr.id, { interno: e.target.value === 'interno' })}
                    className="input"
                  >
                    <option value="interno">Interno</option>
                    <option value="esterno">Esterno</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Referente compliance principale */}
      <div className="p-5 bg-[var(--vermiglio-soft)] border border-[var(--vermiglio)] rounded-[6px]">
        <div className="caps text-[var(--vermiglio-ink)] mb-1">Referente compliance principale *</div>
        <div className="text-[12px] text-[var(--ink-4)] mb-4">
          Persona a cui inviare alert su scadenze, novità normative e task assegnati dalla dashboard.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome e cognome *" error={errors.referente_nome}>
            <input
              type="text"
              value={referente.referente_nome}
              onChange={e => setReferente({ ...referente, referente_nome: e.target.value })}
              placeholder="Mario Rossi"
              className="input"
            />
          </Field>
          <Field label="Email *" error={errors.referente_email}>
            <input
              type="email"
              value={referente.referente_email}
              onChange={e => setReferente({ ...referente, referente_email: e.target.value })}
              placeholder="compliance@azienda.it"
              className="input"
            />
          </Field>
          <Field label="Ruolo">
            <input
              type="text"
              value={referente.referente_ruolo}
              onChange={e => setReferente({ ...referente, referente_ruolo: e.target.value })}
              placeholder="Es. Amministratore, Legal Counsel, HR..."
              className="input"
            />
          </Field>
          <Field label="Telefono (opz.)">
            <input
              type="tel"
              value={referente.referente_telefono}
              onChange={e => setReferente({ ...referente, referente_telefono: e.target.value })}
              placeholder="+39 333 1234567"
              className="input"
            />
          </Field>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onPrev} className="btn btn-ghost">← Indietro</button>
        <button onClick={next} className="btn btn-primary">Continua — Verifica email →</button>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-[var(--ink-3)] mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[var(--vermiglio-ink)] mt-1">{error}</p>}
    </div>
  );
}
