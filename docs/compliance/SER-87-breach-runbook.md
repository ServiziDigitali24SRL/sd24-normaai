# SER-87 — Data Breach Runbook: Notifica 72h al Garante

> **Classificazione**: CRITICO | **Versione**: 1.0 | **Data**: 2026-04-29
> Questo documento deve essere eseguito IMMEDIATAMENTE in caso di violazione dei dati.

---

## 🚨 AVVISO: TEMPO LIMITE 72 ORE dalla scoperta del breach

Il Garante Privacy italiano **deve essere notificato entro 72 ore** dalla scoperta della violazione (art. 33 GDPR). Il conteggio inizia dal momento in cui il responsabile del trattamento ne viene a conoscenza, anche se la violazione è iniziata prima.

---

## FASE 0 — RILEVAMENTO (Ora 0)

### Segnali che possono indicare un breach:
- Alert Sentry con molti errori di autenticazione insoliti
- Accessi anomali in Supabase logs (molte query da IP sconosciuto)
- Email utenti che segnalano accessi non autorizzati
- Notifica da servizi terzi (Vercel, Supabase, Stripe)
- Comportamento anomalo nel monitoring rate-limit
- Verifica hash chain fallita (`verify_audit_chain()` restituisce righe invalide)

### Azione immediata:
```bash
# 1. Verifica integrità audit log
# In Supabase SQL Editor:
SELECT * FROM verify_audit_chain() WHERE valid = false;

# 2. Verifica accessi anomali ultimi 24h
SELECT auth.uid(), COUNT(*) as queries, MAX(created_at) 
FROM queries 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY auth.uid()
ORDER BY queries DESC
LIMIT 20;

# 3. Verifica IP anomali nella tabella rate limit (se loggati)
```

---

## FASE 1 — CONTENIMENTO (Ore 0-4)

### Checklist contenimento:

- [ ] **Identificare la causa**: accesso non autorizzato? Fuga dati? Modifiche non autorizzate?
- [ ] **Revocare accesso compromesso**:
  - Supabase: Dashboard → Auth → Users → Disable account
  - API Key compromessa: Vercel → Environment Variables → Rotate
  - Service Role Key: Supabase → Settings → API → Rotate key
- [ ] **Isolare sistema se necessario**:
  - Vercel: deployare versione di manutenzione (`/api/health` → 503)
  - Supabase: Pause project (Dashboard → Settings → Pause)
- [ ] **Preservare le prove**:
  - Screenshot dashboard Supabase con log anomali
  - Export logs Vercel: `vercel logs --output json`
  - Backup DB snapshot istantaneo
- [ ] **NON eliminare log** — potrebbero essere necessari per le autorità

### Contatti di emergenza:
- **Founder/DPO**: Francesco Tudini Kei — `francesco@servizidigitali24.online`
- **Supabase Support** (breach): support@supabase.io — Subject: "SECURITY INCIDENT"
- **Vercel Support**: vercel.com/support — Priority ticket
- **Avvocato privacy**: [inserire contatto legale]

---

## FASE 2 — VALUTAZIONE (Ore 4-24)

### Determina la gravità della violazione:

| Criterio | Valutazione |
|---|---|
| **Dati coinvolti** | Quante persone? Che tipologia di dati? |
| **Probabilità rischio per interessati** | Bassa / Media / Alta |
| **Tipo violazione** | Confidenzialità / Integrità / Disponibilità |
| **Notifica agli interessati necessaria** | Sì (art. 34 GDPR) se rischio elevato |

### Dati ad alto rischio per NormaAI:
- Query legali degli utenti (rivelano situazioni giuridiche personali)
- Email + nome + professione degli utenti
- Documenti allegati (PDF, contratti, atti) — non persistiti ma log sessione
- Dati di pagamento (⚠️ gestiti da Stripe — contattare anche Stripe)

### Template classificazione:

```
VIOLAZIONE [ID-YYYY-MM-DD-XX]
Data scoperta: ___________
Tipo: Confidenzialità / Integrità / Disponibilità (cerchia)
Cause: ___________
Dati coinvolti: ___________
Numero interessati stimato: ___________
Rischio per interessati: Basso / Medio / Alto (cerchia)
Misure contenimento adottate: ___________
```

---

## FASE 3 — NOTIFICA GARANTE (Entro 72 ore)

### Portale di notifica:
**URL**: https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9126237

### Informazioni richieste (art. 33 co. 3 GDPR):

1. **Natura della violazione** (tipo, categorie e numero approssimativo di interessati)
2. **Nome e dati di contatto del DPO** o altro punto di contatto
3. **Probabili conseguenze** della violazione
4. **Misure adottate o proposte** per rimediare e mitigare
5. **Comunicazioni agli interessati** effettuate o previste

### Template email notifica Garante:
```
A: protocollo@gpdp.it
CC: urp@gpdp.it
Oggetto: NOTIFICA VIOLAZIONE DATI PERSONALI — [Nome Società] — [Data]

Egregio Garante per la Protezione dei Dati Personali,

Ai sensi dell'art. 33 del Reg. UE 2016/679 (GDPR), La informiamo 
della seguente violazione dei dati personali:

TITOLARE DEL TRATTAMENTO:
Servizi Digitali 24 S.R.L.
P.IVA: [inserire]
Rappresentante: Francesco Tudini Kei
Contatto: francesco@servizidigitali24.online

DESCRIZIONE DELLA VIOLAZIONE:
[Descrivere cosa è successo, quando è stato scoperto]

CATEGORIE E NUMERO DI INTERESSATI:
[Specificare]

PROBABILI CONSEGUENZE:
[Descrivere i rischi per gli interessati]

MISURE ADOTTATE:
[Descrivere le azioni di contenimento già intraprese]

MISURE PREVISTE:
[Descrivere le azioni future]

Restiamo a disposizione per qualsiasi ulteriore informazione.

Cordiali saluti,
Servizi Digitali 24 S.R.L.
```

---

## FASE 4 — NOTIFICA AGLI INTERESSATI (se rischio elevato)

Se la violazione **probabilmente comporta un rischio elevato** per i diritti degli interessati (art. 34 GDPR), notificare **senza indebito ritardo**:

### Canali di notifica NormaAI:
1. **Email diretta** via Brevo a tutti gli interessati coinvolti
2. **Banner in-app** alla prossima autenticazione
3. **Post sul sito** nella sezione privacy/news

### Template email agli interessati:
```
Oggetto: Comunicazione importante sulla sicurezza del tuo account NormaAI

Gentile [Nome],

Ti informiamo che in data [DATA] abbiamo rilevato una violazione 
della sicurezza che potrebbe aver interessato i tuoi dati.

CHE COSA È SUCCESSO:
[Spiegazione chiara e non tecnica]

QUALI DATI POTREBBERO ESSERE STATI COINVOLTI:
[Es: indirizzo email, nome]

CHE COSA ABBIAMO FATTO:
[Azioni correttive adottate]

CHE COSA PUOI FARE:
- Cambia la password del tuo account NormaAI
- Monitora eventuali utilizzi insoliti del tuo account
- Contattaci a privacy@normaai.it per qualsiasi domanda

Ci scusiamo per l'inconveniente e restiamo a disposizione.

Il Team NormaAI
privacy@normaai.it
```

---

## FASE 5 — POST-INCIDENT (Settimane 1-4)

- [ ] Root cause analysis documentata
- [ ] Aggiornamento DPIA (SER-76) con nuovo rischio
- [ ] Implementazione misure preventive
- [ ] Report finale per il Garante (se richiesto)
- [ ] Revisione procedure sicurezza team
- [ ] Comunicazione interna team SD24
- [ ] Aggiornamento assicurazione cyber se necessario

---

## Registro Violazioni Interno

Mantieni un registro interno di tutte le violazioni (anche quelle non notificate al Garante) in:
`/Users/user/Documents/PROGETTI/_HQ/compliance/breach-register.xlsx`

Ogni entry deve includere: data, causa, dati coinvolti, misure, esito notifica Garante.

---

*Documento mantenuto da Servizi Digitali 24 S.R.L. — Riferimento SER-87*
*Ultimo aggiornamento: 2026-04-29*
