# SER-76 — DPIA, DPO e AI Act Dossier

> **Versione**: 1.0 | **Data**: 2026-04-29 | **Revisione**: annuale o a variazione significativa del trattamento

---

## 1. DPIA — Valutazione d'Impatto sulla Protezione dei Dati (art. 35 GDPR)

### 1.1 Obbligo di DPIA

NormaAI è soggetta all'obbligo di DPIA per i seguenti motivi:
- **Trattamento su larga scala** di dati relativi a questioni giuridiche (art. 35 co. 3 lett. b GDPR)
- **Profilazione** degli utenti per la personalizzazione delle risposte (art. 35 co. 3 lett. a GDPR)
- **Decisione automatizzata** (AI Act art. 14 — sistema IA ad impatto su interessi giuridici degli interessati)
- Inserimento in **Allegato III AI Act** (sistemi ad alto rischio — accesso a servizi essenziali)

### 1.2 Dati Trattati

| Categoria | Finalità | Base giuridica | Conservazione |
|-----------|----------|----------------|---------------|
| Email, nome | Autenticazione + fatturazione | Contratto (art. 6 lett. b) | Vita account + 10 anni (obblighi fiscali) |
| Conversazioni (query + risposte) | Erogazione servizio | Contratto (art. 6 lett. b) | 24 mesi → pseudonimizzazione |
| Dati di navigazione / sessione | Sicurezza, antifrode | Legittimo interesse (art. 6 lett. f) | 30 giorni |
| Allegati (PDF/immagini) | Analisi AI su richiesta | Contratto (art. 6 lett. b) | Solo sessione — non persistiti |
| Audit trail risposte AI | Compliance GDPR art. 22 + AI Act art. 14 | Obbligo legale (art. 6 lett. c) | 5 anni (WORM) |
| Dati pagamento | Gestione abbonamenti | Contratto + obbligo legale | Delegato a Stripe |

### 1.3 Rischi Identificati e Misure

| Rischio | Probabilità | Impatto | Misura adottata |
|---------|-------------|---------|-----------------|
| Violazione confidenzialità conversazioni | Media | Alto | RLS Supabase + WORM audit log + crittografia AES-256 a riposo |
| Allucinazione AI con danno legale | Alta | Alto | Disclaimer obbligatorio + confidence score + human review flag (SER-68) |
| Accesso non autorizzato ai dati | Bassa | Alto | Auth Supabase + rate limiting + API key rotation |
| Data breach | Bassa | Alto | Notifica 72h Garante (runbook SER-87) + WORM log integrità (SER-77) |
| Trasferimento dati extra-UE (Anthropic US) | Alta | Medio | EU proxy CloudFlare (SER-78) + SCC con Anthropic |
| Rifiuto del diritto di accesso/cancellazione | Bassa | Alto | DSAR endpoint automatizzato (`/api/dsar`) |

### 1.4 Misure Tecniche Organizzative (TOM)

**Tecniche:**
- Crittografia in transito: TLS 1.3 (Vercel + Supabase)
- Crittografia a riposo: AES-256 (Supabase disk encryption + SER-83 field-level)
- Audit log immutabile con hash chain SHA-256 (SER-77)
- RLS PostgreSQL su tutte le tabelle utente
- Token di accesso con scadenza 1h + refresh token
- Rate limiting multi-strato (IP + user)
- Pseudonimizzazione audit dopo 24 mesi

**Organizzative:**
- Accesso dati in produzione: solo Service Role Key (non esposta frontend)
- Nessun dipendente accede alle conversazioni senza autorizzazione scritta
- Formazione GDPR annuale per il team
- Revisione politica privacy ogni 6 mesi

### 1.5 Trasferimenti Extra-SEE

| Destinatario | Paese | Dati trasferiti | Garanzia |
|---|---|---|---|
| Anthropic (Claude API) | USA | Testo delle query | SCC Module 2 + EU proxy (SER-78) |
| Vercel | USA | Log applicativi | SCC + DPA Vercel |
| Supabase | EU (Frankfurt) | Tutti i dati strutturati | Nessun trasferimento (EU region) |
| Upstash (Redis) | EU (Frankfurt) | Cache query anonimizzate | Nessun trasferimento (EU region) |
| Sentry | USA | Log errori (no PII grazie a SER-65) | SCC + `sendDefaultPii: false` |
| Brevo | EU | Email transazionali | GDPR-compliant (sede EU) |

---

## 2. DPO — Responsabile Protezione Dati (art. 37 GDPR)

### 2.1 Obbligo DPO

NormaAI **valuta come raccomandato** (non obbligatorio al momento) il nominare un DPO, in quanto:
- Il trattamento principale è su larga scala di dati di natura giuridica
- L'attività principale non è il trattamento sistematico di dati sensibili (art. 9 GDPR) come categoria
- Tuttavia, alcune conversazioni possono contenere dati sanitari, penali o di minori **accessori**

**Decisione**: nominare un DPO esterno (consulente privacy) entro Q3 2026.

### 2.2 Funzioni DPO da Assegnare

- Punto di contatto con il Garante Privacy
- Supervisione DSAR (richieste diritti interessati)
- Revisione annuale DPIA
- Formazione team
- Monitoraggio modifiche normative GDPR/AI Act

---

## 3. AI Act — Allegato III e Dossier Tecnico

### 3.1 Classificazione Sistema IA

| Criterio | Valutazione |
|---|---|
| **Categoria** | Sistema IA per fornitura di servizi legali/informativi |
| **Allegato III** | Punto 5(a): Accesso a servizi essenziali (interpretazione) |
| **Livello di rischio** | **Alto rischio** — output con possibile impatto su diritti legali |
| **Obblighi** | Trasparenza (art. 13), Supervisione umana (art. 14), Accuratezza (art. 15), Logging (art. 12) |

### 3.2 Conformità Requisiti AI Act

| Requisito | Articolo | Stato | Note |
|---|---|---|---|
| Trasparenza verso utenti | Art. 13 | ✅ Implementato | Disclaimer obbligatorio (SER-68) |
| Supervisione umana | Art. 14 | ✅ Implementato | `human_review_required` flag + escalation |
| Accuratezza e robustezza | Art. 15 | 🟡 In corso | Golden Set eval CI (SER-82) |
| Logging e conservazione | Art. 12 | ✅ Implementato | Audit WORM (SER-77) |
| Gestione rischi | Art. 9 | 🟡 In corso | DPIA completata, revisione annuale |
| Dati di addestramento | Art. 10 | ✅ N/A | NormaAI usa modelli Anthropic pre-addestrati |
| Registrazione nel database EU AI | Art. 49 | 🔴 Pendente | Registrazione obbligatoria entro 12 mesi da deploying |

### 3.3 Documentazione Tecnica Richiesta (art. 11 AI Act)

- [ ] Descrizione del sistema IA e del suo scopo
- [ ] Specifiche delle capacità e limitazioni
- [ ] Architettura del sistema (allegare diagramma)
- [ ] Dati di addestramento e validazione (→ Anthropic responsible scaling policy)
- [ ] Risultati dei test di accuratezza (→ Golden Set SER-82)
- [ ] Misure di cybersecurity
- [ ] Procedure di gestione incidenti
- [ ] Istruzioni per gli utenti (→ help center normaai.it)

---

## 4. Revisione e Aggiornamento

| Trigger | Azione |
|---|---|
| Nuova funzionalità che tratta nuovi dati | Aggiornare sezione 1.2 e rivalutare i rischi |
| Cambio provider (es. nuovo LLM) | Rivalutare trasferimenti extra-SEE |
| Data breach | Aggiornare sezione 1.3 + attivare runbook SER-87 |
| Modifica normativa GDPR/AI Act | Revisione completa entro 30 giorni |
| Annuale | Revisione completa + firma DPO |

**Prossima revisione pianificata**: Aprile 2027

---

*Documento mantenuto dal team NormaAI (Servizi Digitali 24 S.R.L.) — Riferimento SER-76*
