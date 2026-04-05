"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
}

const RUOLI = [
  { id: "avvocato",          label: "Avvocato",              icon: "⚖️" },
  { id: "commercialista",    label: "Commercialista",        icon: "📊" },
  { id: "consulente_lavoro", label: "Consulente del Lavoro", icon: "👥" },
  { id: "tecnico",           label: "Ingegnere / Tecnico",   icon: "🏗️" },
  { id: "impresa",           label: "Impresa",               icon: "🏢" },
];

const REGIONI = [
  "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna",
  "Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche",
  "Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana",
  "Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto",
];

const SPEC_SUGGESTIONS: Record<string, string[]> = {
  avvocato:          ["Diritto del Lavoro","Diritto Civile","Diritto Penale","Diritto Amministrativo","Diritto Tributario","Diritto di Famiglia","Appalti Pubblici","GDPR","Diritto Societario"],
  commercialista:    ["Fiscalità d'Impresa","IVA","Bilancio OIC","Startup e Agevolazioni","Transfer Pricing","TUIR","Contenzioso Tributario","Diritto Fallimentare"],
  consulente_lavoro: ["CCNL Metalmeccanici","Licenziamento","Ammortizzatori Sociali","Contratti Atipici","D.Lgs 81/2015","Paghe e Contributi","Sicurezza sul Lavoro"],
  tecnico:           ["NTC 2018","DPR 380/2001","D.Lgs 81/2008","CAM (Appalti)","Permesso di Costruire","Antincendio","VIA/VAS","Efficienza Energetica"],
  impresa:           ["Appalti e Gare","GDPR","Giuslavoristica","Normativa UE","Fiscalità d'Impresa","Contrattualistica","Normativa Ambiente"],
};

interface ProfiloData {
  id?: string;
  ruolo: string;
  nome: string;
  studio: string;
  citta: string;
  regione: string;
  specializzazioni: string[];
  preferenze: { verbosita: string; citazioni: string };
  query_count: number;
  last_topics: string[];
}

const DEFAULT_PROFILO: ProfiloData = {
  ruolo: "",
  nome: "",
  studio: "",
  citta: "",
  regione: "",
  specializzazioni: [],
  preferenze: { verbosita: "standard", citazioni: "complete" },
  query_count: 0,
  last_topics: [],
};

export default function ModalProfilo({ open, onClose, user }: Props) {
  const [profilo, setProfilo] = useState<ProfiloData>(DEFAULT_PROFILO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSpec, setNewSpec] = useState("");
  const supabase = createClient();

  const loadProfilo = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("profili_utenti")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setProfilo({
        id: data.id,
        ruolo: data.ruolo || "",
        nome: data.nome || "",
        studio: data.studio || "",
        citta: data.citta || "",
        regione: data.regione || "",
        specializzazioni: data.specializzazioni || [],
        preferenze: data.preferenze || { verbosita: "standard", citazioni: "complete" },
        query_count: data.query_count || 0,
        last_topics: data.last_topics || [],
      });
    } else {
      // prefill nome from user_metadata
      const meta = user.user_metadata || {};
      setProfilo({
        ...DEFAULT_PROFILO,
        nome: (meta.full_name as string) || "",
        ruolo: (meta.categoria as string) || "",
      });
    }
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) loadProfilo();
  }, [open, loadProfilo]);

  async function handleSave() {
    if (!user?.id || !profilo.ruolo) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      ruolo: profilo.ruolo,
      nome: profilo.nome,
      studio: profilo.studio,
      citta: profilo.citta,
      regione: profilo.regione,
      specializzazioni: profilo.specializzazioni,
      preferenze: profilo.preferenze,
      updated_at: new Date().toISOString(),
    };
    if (profilo.id) {
      await supabase.from("profili_utenti").update(payload).eq("id", profilo.id);
    } else {
      const { data } = await supabase.from("profili_utenti").insert(payload).select().single();
      if (data) setProfilo(p => ({ ...p, id: data.id }));
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleSpec(s: string) {
    setProfilo(p => ({
      ...p,
      specializzazioni: p.specializzazioni.includes(s)
        ? p.specializzazioni.filter(x => x !== s)
        : [...p.specializzazioni, s],
    }));
  }

  function addCustomSpec() {
    const v = newSpec.trim();
    if (!v || profilo.specializzazioni.includes(v)) { setNewSpec(""); return; }
    setProfilo(p => ({ ...p, specializzazioni: [...p.specializzazioni, v] }));
    setNewSpec("");
  }

  const userName = profilo.nome || user?.user_metadata?.full_name as string || user?.email?.split("@")[0] || "?";
  const ruoloInfo = RUOLI.find(r => r.id === profilo.ruolo);
  const suggestions = profilo.ruolo ? (SPEC_SUGGESTIONS[profilo.ruolo] || []) : [];

  return (
    <ModalOverlay open={open} onClose={onClose} wide>
      <ModalClose onClose={onClose} />

      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-[#1e1e1e] sticky top-0 bg-[#131313] z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[18px] font-semibold text-accent uppercase shrink-0">
            {userName.charAt(0)}
          </div>
          <div>
            <div className="font-serif text-[20px] leading-tight">Profilo AI</div>
            <div className="text-[12px] text-[#555] mt-[2px]">
              {profilo.query_count > 0
                ? `${profilo.query_count} quer${profilo.query_count === 1 ? "y" : "ies"} analizzat${profilo.query_count === 1 ? "a" : "e"} · più usi NormaAI, più la risposta è tua`
                : "Completa il profilo per risposte su misura"}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-10 text-center text-[13px] text-[#555]">Caricamento profilo...</div>
      ) : (
        <div className="px-6 py-5 space-y-6">

          {/* ── SEZIONE 1: Cosa ho imparato su di te ── */}
          {profilo.last_topics.length > 0 && (
            <div>
              <SectionHeader
                icon={<BrainIcon />}
                label="Cosa ho imparato su di te"
                sub="Topic rilevati automaticamente dalle tue query"
                accent
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {profilo.last_topics.map((t, i) => (
                  <span
                    key={i}
                    className="px-[10px] py-[4px] rounded-full text-[11.5px] bg-[#E8340A08] border border-[#E8340A22] text-[#E8340A] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#444] mt-3 leading-[1.5]">
                Il modello usa queste informazioni per contestualizzare ogni risposta. I pattern migliorano con ogni sessione.
              </p>
            </div>
          )}

          {/* ── SEZIONE 2: Ruolo ── */}
          <div>
            <SectionHeader icon={<IdIcon />} label="La tua categoria" sub="Personalizza il corpus normativo disponibile" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {RUOLI.map(r => (
                <button
                  key={r.id}
                  onClick={() => setProfilo(p => ({ ...p, ruolo: r.id }))}
                  className={`flex items-center gap-[10px] px-4 py-[11px] rounded-[11px] border text-left transition-all duration-150 cursor-pointer ${
                    profilo.ruolo === r.id
                      ? "border-accent bg-[#E8340A08] text-cream"
                      : "border-[#252525] bg-card text-[#888] hover:border-[#3a3a3a] hover:text-[#bbb]"
                  }`}
                >
                  <span className="text-[18px] shrink-0">{r.icon}</span>
                  <span className="text-[13px] font-medium leading-tight">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── SEZIONE 3: Info base ── */}
          <div>
            <SectionHeader icon={<UserIcon />} label="Chi sei" sub="Usato per contestualizzare le risposte" />
            <div className="space-y-3 mt-3">
              <Field label="Nome e Cognome">
                <TextInput
                  value={profilo.nome}
                  onChange={v => setProfilo(p => ({ ...p, nome: v }))}
                  placeholder={ruoloInfo ? `es. Mario Rossi — ${ruoloInfo.label}` : "es. Mario Rossi"}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Studio / Azienda">
                  <TextInput
                    value={profilo.studio}
                    onChange={v => setProfilo(p => ({ ...p, studio: v }))}
                    placeholder="Studio Legale XYZ"
                  />
                </Field>
                <Field label="Città">
                  <TextInput
                    value={profilo.citta}
                    onChange={v => setProfilo(p => ({ ...p, citta: v }))}
                    placeholder="Milano"
                  />
                </Field>
              </div>
              <Field label="Regione">
                <select
                  value={profilo.regione}
                  onChange={e => setProfilo(p => ({ ...p, regione: e.target.value }))}
                  className="w-full py-[9px] px-[13px] bg-[#1c1c1c] border border-[#252525] rounded-[9px] text-cream text-[13.5px] outline-none transition-colors duration-150 focus:border-[#3a3a3a] appearance-none cursor-pointer"
                >
                  <option value="">— Tutte le regioni —</option>
                  {REGIONI.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* ── SEZIONE 4: Specializzazioni ── */}
          <div>
            <SectionHeader
              icon={<StarIcon />}
              label="Specializzazioni"
              sub="L'AI privilegia le norme pertinenti alle tue aree"
            />
            {suggestions.length > 0 && (
              <div className="mt-3">
                <div className="text-[10.5px] text-[#444] uppercase tracking-[0.5px] mb-2">Suggerite per {ruoloInfo?.label}</div>
                <div className="flex flex-wrap gap-[7px]">
                  {suggestions.map(s => {
                    const active = profilo.specializzazioni.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSpec(s)}
                        className={`px-[10px] py-[5px] rounded-full text-[12px] border cursor-pointer transition-all duration-150 ${
                          active
                            ? "bg-accent border-accent text-white"
                            : "bg-transparent border-[#2a2a2a] text-[#777] hover:border-[#444] hover:text-[#bbb]"
                        }`}
                      >
                        {active ? "✓ " : ""}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Custom spec input */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newSpec}
                onChange={e => setNewSpec(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSpec(); } }}
                placeholder="Aggiungi area personalizzata..."
                className="flex-1 py-[8px] px-[12px] bg-[#1c1c1c] border border-[#252525] rounded-[9px] text-[13px] text-cream outline-none focus:border-[#3a3a3a] placeholder:text-[#3a3a3a]"
              />
              <button
                onClick={addCustomSpec}
                className="px-4 py-[8px] rounded-[9px] bg-[#1e1e1e] border border-[#2a2a2a] text-[#777] text-[12px] hover:border-[#444] hover:text-cream transition-all cursor-pointer"
              >
                + Aggiungi
              </button>
            </div>
            {profilo.specializzazioni.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-[7px]">
                {profilo.specializzazioni
                  .filter(s => !suggestions.includes(s))
                  .map(s => (
                    <span
                      key={s}
                      className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-full text-[12px] bg-accent border border-accent text-white"
                    >
                      {s}
                      <button
                        onClick={() => toggleSpec(s)}
                        className="bg-transparent border-none text-white/70 hover:text-white cursor-pointer leading-none p-0 text-[14px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* ── SEZIONE 5: Preferenze risposta ── */}
          <div>
            <SectionHeader icon={<SettingsIcon />} label="Come vuoi le risposte" sub="Adatta stile e profondità" />
            <div className="space-y-4 mt-3">
              <div>
                <div className="text-[11px] text-[#555] uppercase tracking-[0.5px] mb-2">Verbosità</div>
                <div className="flex gap-[6px]">
                  {[
                    { v: "sintetico",   label: "Sintetico",   desc: "Solo l'essenziale" },
                    { v: "standard",    label: "Standard",    desc: "Bilanciato" },
                    { v: "dettagliato", label: "Dettagliato", desc: "Con esempi e fonti" },
                  ].map(o => (
                    <button
                      key={o.v}
                      onClick={() => setProfilo(p => ({ ...p, preferenze: { ...p.preferenze, verbosita: o.v } }))}
                      className={`flex-1 py-[9px] px-2 rounded-[9px] border text-center cursor-pointer transition-all duration-150 ${
                        profilo.preferenze.verbosita === o.v
                          ? "border-accent bg-[#E8340A08] text-cream"
                          : "border-[#252525] bg-card text-[#666] hover:border-[#3a3a3a]"
                      }`}
                    >
                      <div className="text-[12.5px] font-medium">{o.label}</div>
                      <div className="text-[10px] text-[#555] mt-[2px]">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#555] uppercase tracking-[0.5px] mb-2">Citazioni normative</div>
                <div className="flex gap-[6px]">
                  {[
                    { v: "complete",   label: "Complete",   desc: "Art. + comma + data" },
                    { v: "sintetiche", label: "Sintetiche", desc: "Solo riferimento" },
                  ].map(o => (
                    <button
                      key={o.v}
                      onClick={() => setProfilo(p => ({ ...p, preferenze: { ...p.preferenze, citazioni: o.v } }))}
                      className={`flex-1 py-[9px] px-2 rounded-[9px] border text-center cursor-pointer transition-all duration-150 ${
                        profilo.preferenze.citazioni === o.v
                          ? "border-accent bg-[#E8340A08] text-cream"
                          : "border-[#252525] bg-card text-[#666] hover:border-[#3a3a3a]"
                      }`}
                    >
                      <div className="text-[12.5px] font-medium">{o.label}</div>
                      <div className="text-[10px] text-[#555] mt-[2px]">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Intelligence stats ── */}
          {profilo.query_count > 0 && (
            <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-[12px] p-4">
              <div className="text-[10.5px] uppercase tracking-[0.5px] text-[#444] mb-3">Intelligenza accumulata</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat value={profilo.query_count.toString()} label="Query analizzate" />
                <Stat value={profilo.specializzazioni.length.toString()} label="Specializzazioni" />
                <Stat value={profilo.last_topics.length.toString()} label="Topic rilevati" />
              </div>
              <p className="text-[10.5px] text-[#444] text-center mt-3 leading-[1.5]">
                Il profilo AI si aggiorna automaticamente ad ogni sessione.
                Non serve fare nulla — basta usare NormaAI.
              </p>
            </div>
          )}

          {/* ── Save ── */}
          <button
            onClick={handleSave}
            disabled={saving || !profilo.ruolo}
            className={`w-full py-[11px] rounded-[10px] text-[13.5px] font-medium border-none cursor-pointer transition-all duration-200 ${
              saved
                ? "bg-[#22c55e] text-white"
                : saving || !profilo.ruolo
                ? "bg-[#1e1e1e] text-[#444] cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {saved ? "✓ Salvato" : saving ? "Salvataggio..." : "Salva profilo"}
          </button>

          {!profilo.ruolo && (
            <p className="text-[11px] text-[#555] text-center -mt-3">
              Seleziona almeno la tua categoria per salvare
            </p>
          )}
        </div>
      )}
    </ModalOverlay>
  );
}

/* ── Sub-components ── */

function SectionHeader({ icon, label, sub, accent }: { icon: React.ReactNode; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-[10px]">
      <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 mt-[1px] ${accent ? "bg-[#E8340A12] text-accent" : "bg-[#1e1e1e] text-[#666]"}`}>
        {icon}
      </div>
      <div>
        <div className="text-[13.5px] font-medium text-cream">{label}</div>
        {sub && <div className="text-[11.5px] text-[#555] mt-[1px]">{sub}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10.5px] text-[#555] uppercase tracking-[0.5px] mb-[5px]">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full py-[9px] px-[13px] bg-[#1c1c1c] border border-[#252525] rounded-[9px] text-cream text-[13.5px] outline-none transition-colors duration-150 focus:border-[#3a3a3a] placeholder:text-[#3a3a3a]"
    />
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[22px] font-serif text-cream">{value}</div>
      <div className="text-[10px] text-[#555] mt-[2px] leading-tight">{label}</div>
    </div>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-none stroke-current stroke-[1.8]">
      <path d="M12 5a3 3 0 00-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 1012 18z"/>
      <path d="M12 5a3 3 0 015.997.125 4 4 0 012.526 5.77 4 4 0 01-.556 6.588A4 4 0 1112 18z"/>
      <path d="M15 13a4.5 4.5 0 01-3-4 4.5 4.5 0 01-3 4"/>
      <path d="M17.599 6.5a3 3 0 00.399-1.375"/>
      <path d="M6.003 5.125A3 3 0 006.401 6.5"/>
      <path d="M3.477 10.896a4 4 0 01.585-.396"/>
      <path d="M19.938 10.5a4 4 0 01.585.396"/>
      <path d="M6 18a4 4 0 01-1.967-.516"/>
      <path d="M19.967 17.484A4 4 0 0118 18"/>
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-none stroke-current stroke-[1.8]">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-none stroke-current stroke-[1.8]">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-none stroke-current stroke-[1.8]">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-none stroke-current stroke-[1.8]">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
    </svg>
  );
}
