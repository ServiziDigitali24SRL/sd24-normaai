# Onboarding Impresa — Audit Compliance & Nuova Struttura
> Data: 21 Aprile 2026
> Obiettivo: raccogliere TUTTI i dati necessari per attivare la tassonomia 24-rami della Dashboard Compliance.

---

## 1. GAP ANALYSIS — Cosa manca oggi

### Campi raccolti oggi (insufficienti)
| Campo | Dove |
|---|---|
| ragione_sociale | StepPersonalData |
| piva | StepPersonalData |
| dimensione_azienda (micro/piccola/media/grande) | StepPersonalData |
| settore_azienda (7 macro) | StepPersonalData |
| phone | StepPersonalData |
| pec | StepPersonalData |
| aree_interesse (preferenze soft) | StepPreferences |
| obiettivo_principale | StepPreferences |

### Campi MANCANTI per attivare i 24 rami
Ogni campo attiva/disattiva uno o più rami della dashboard compliance.

| Campo mancante | Attiva il ramo | Regola |
|---|---|---|
| **ATECO dettagliato** (codice a 6 cifre) | Settoriali, 231, Regolamentato | Auto-detect settore regolamentato |
| **Forma giuridica** (SpA/Srl/SRLS/SNC/SAS/Coop/Ditta Ind.) | Societario, 231, Bilancio | SpA → OdV obbligatorio per soglie |
| **Numero dipendenti esatto** | Lavoro, Whistleblowing, Sicurezza | ≥50 → Whistleblowing obbl.; ≥200 → RSPP interno |
| **Fatturato annuo (range)** | Fiscale, CSRD, Pillar Two, Bilancio | ≥€50M → CSRD; ≥€750M → Pillar Two |
| **Settore regolamentato sì/no + quale** | DORA, NIS2, AML, Farmaceutico, Energia | Finanziario → DORA + AML; Sanitario → FDA-like |
| **Tipologia clientela** (B2C/B2B/entrambi) | Consumatori, Antitrust | B2C → Codice Consumo attivo |
| **Export extra-UE sì/no + paesi** | Internazionale, Sanzioni, Export control | Extra-UE → EU Dual Use, sanzioni Russia |
| **Import extra-UE sì/no** | Dogane, EUDR | EUDR se materie prime forestali |
| **E-commerce/piattaforma online sì/no** | GDPR cookie, Consumer, DSA | Sito B2C → tutti gli obblighi digital |
| **Trattamento dati particolari** (salute/minori/biometrici/giudiziari) | GDPR, DPIA, DPO | Dati particolari → DPO obbligatorio |
| **Uso AI per decisioni automatiche sì/no** | AI Act | High-risk → valutazione impatto |
| **Soggetta a D.Lgs 231 (attiva MOG)?** | 231, OdV | Sì → tutta sezione MOG |
| **Partecipazione gare pubbliche sì/no** | Appalti, Antitrust | Sì → white list, DURC, ANAC |
| **Appartenenza gruppo societario sì/no** | Transfer pricing, Consolidato, Pillar Two | Sì → TP documentation |
| **Sedi operative (regioni)** | Settoriali regionali | Multi-regione → norme regionali differenti |
| **Lavoratori esteri/distaccati sì/no** | Internazionale, Lavoro | Sì → Posted Workers Directive |
| **Infrastruttura critica / fornitore PA sì/no** | NIS2, Cyber | Sì → NIS2 entity essenziale |
| **Certificazioni attive** (ISO 9001/14001/27001/45001, SA8000) | Audit, Manutenzione cert. | Attivano scadenziario audit |
| **Ruoli compliance già nominati** (DPO/RSPP/OdV/Medico/MOG) | Tutti i rami relativi | Evita di chiedere "nominare DPO" se già fatto |
| **Referente compliance** (email/nome/ruolo) | Notifiche, workflow | Destinatario alert scadenze |

**Totale nuovi campi:** 20 (di cui molti auto-derivabili da ATECO + dipendenti + fatturato).

---

## 2. NUOVA STRUTTURA — 6 step Impresa

```
STEP 1  Ruolo                     → role = "impresa"
STEP 2  Dimensione + Piano        → MICRO €29 / PICCOLA €79 / MEDIA €199
STEP 3  Anagrafica aziendale      → P.IVA (VIES auto-fill) + ragione sociale + forma giuridica + ATECO + sede legale
STEP 4  Profilo compliance        → conditionals in base a dimensione + ATECO (vedi § 3)
STEP 5  Ruoli e referente         → DPO/RSPP/OdV già nominati + referente compliance
STEP 6  OTP email verification    → conferma e accesso
```

Dopo l'OTP → dashboard con **Compliance Score** e i 24 rami già filtrati/attivati in base ai dati raccolti.

---

## 3. STEP 4 — Profilo compliance (conditional logic)

### Sempre richiesti
- Numero dipendenti esatto (input number, default da range dimensione)
- Fatturato annuo (range dropdown: <500k | 500k-2M | 2M-10M | 10M-50M | 50M-750M | >750M)
- Tipologia clientela (chips: B2C / B2B / PA / misto)
- E-commerce attivo? (sì/no)
- Export extra-UE? (sì/no + se sì quali paesi principali)
- Gruppo societario? (sì/no + ruolo: capogruppo/controllata)

### Conditional (appaiono solo se triggerati)
- **Se ATECO = regolamentato** → dropdown "Specifico sub-settore" (es. finanziario: banca/assicurazione/IP/EMI/fintech)
- **Se settore = finanziario / sanitario / energia / telco / trasporti** → "Fornitore infrastrutture critiche PA?" (sì/no)
- **Se dipendenti ≥ 50** → "Whistleblowing canal attivo?" (sì/no)
- **Se dipendenti ≥ 15** → "RSPP interno o esterno?"
- **Se fatturato ≥ 10M O dipendenti ≥ 50** → "Soggetti a D.Lgs 231? MOG attivo?" (sì/no/in progress)
- **Se B2C O e-commerce** → "Trattate dati particolari? (salute/minori/biometrici)" (sì/no + quali)
- **Se fatturato ≥ 50M** → "Soggetti a CSRD/rendicontazione ESG?" (auto: sì se ≥50M + 250 dip)
- **Se import extra-UE O fornitura forestale** → "Soggetti a EUDR?" (info + auto-sì se ATECO compatibile)
- **Se usate AI/ML nei processi** → "Sistemi AI ad alto rischio?" (lista usi: HR screening, credit scoring, biometria, ecc.)

---

## 4. STEP 5 — Ruoli compliance

Checkbox multipli: "Quali ruoli compliance avete già nominato?"
- [ ] DPO (Data Protection Officer) — se sì: nome + email + interno/esterno
- [ ] RSPP (Responsabile Sicurezza) — se sì: nome + email
- [ ] Medico Competente — se dipendenti > 0
- [ ] OdV (Organismo di Vigilanza 231) — se 231 = sì
- [ ] Responsabile Antiriciclaggio — se settore = finanziario/gioco/luxury
- [ ] Responsabile Whistleblowing — se dipendenti ≥ 50
- [ ] CISO / Responsabile Cyber — se NIS2/DORA

**Referente compliance principale** (obbligatorio):
- Nome / Email / Ruolo / Telefono
- Checkbox "è anche il DPO?" / "è anche l'amministratore?"

---

## 5. FIELD → COMPLIANCE BRANCH MAP

```
dimensione + dipendenti  → Lavoro, Sicurezza, Whistleblowing, 231 (soglie)
ateco_code               → Settoriali (12+), Regolamentato, AML, EUDR
forma_giuridica          → Societario, Bilancio, Governance
fatturato                → Fiscale (transfer pricing), CSRD, Pillar Two, Bilancio
settore_regolamentato    → DORA, NIS2, AML, Farmaceutico, Alimentare
clientela_b2c            → Consumatore, Garanzie, Cookies
export_extra_ue          → Internazionale, Sanzioni, Dogane, Dual Use
import_extra_ue          → Dogane, EUDR, Dazi
ecommerce                → GDPR, DSA, Consumer Rights Digital
dati_particolari         → GDPR art. 9, DPIA, DPO obbligatorio
usa_ai_decisionale       → AI Act, DPIA AI
soggetta_231             → 231, OdV, MOG, Anticorruzione
partecipa_gare_pubbliche → Appalti, Anticorruzione, White list
gruppo_societario        → Transfer pricing, Consolidato, Pillar Two
infrastruttura_critica   → NIS2, DORA, Cyber
sedi_operative_regioni   → Settoriali regionali
lavoratori_esteri        → Posted Workers, Lavoro internaz.
certificazioni_iso       → Audit scadenziario
ruoli_nominati           → SKIP tasks "nominare X" nella dashboard
```

---

## 6. PROSSIMI STEP IMPLEMENTATIVI

1. [ ] Aggiornare `onboarding-constants.ts` con ATECO codes + forma giuridica + certificazioni + ruoli
2. [ ] Aggiornare `onboarding-schema.sql` con nuove colonne (20 campi)
3. [ ] Creare `StepImpresaAnagrafica.tsx` (nuovo Step 3 con VIES auto-fill avanzato)
4. [ ] Creare `StepImpresaCompliance.tsx` (nuovo Step 4 con conditionals)
5. [ ] Creare `StepImpresaRuoli.tsx` (nuovo Step 5)
6. [ ] Refactor `OnboardingWizard.tsx` per gestire flussi differenti per ruolo
7. [ ] Migration Supabase sul progetto `rjwaegzdfsdlnbijkark`
8. [ ] Creare tabella `compliance_branches` + `compliance_activation_rules` per la logica attivazione
