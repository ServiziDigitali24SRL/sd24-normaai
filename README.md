# NormaAI — sd24-normaai

SaaS normativo italiano con RAG su corpus legislativo. Progetto di Servizi Digitali 24 S.R.L.

**URL produzione:** https://normaai.it  
**Supabase project:** `rjwaegzdfsdlnbijkark`  
**Vercel team:** `agenticsimpermeo-6968s-projects`

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Database | Supabase (PostgreSQL + pgvector 384d) |
| Auth | Supabase Auth (email OTP + OAuth Google/Microsoft) |
| LLM | OpenRouter (primario) → Anthropic Claude (fallback) |
| Embedding | FastEmbed VPS `89.167.123.25:8765` (multilingual-e5-small 384d) |
| Pagamenti | Stripe (account `acct_1TDwVdFwYIps2Iy9`) |
| Email | Brevo REST API |
| SMS/OTP | Twilio REST API |
| Tracing | Langfuse (graceful no-op se env mancante) |
| Errori | Sentry (`@sentry/nextjs`) |
| Rate limiting | Upstash Redis sliding window (fallback in-memory) |
| Voice | Vapi + Deepgram + Cartesia |
| Deploy | Vercel (NON Netlify) |

---

## Ruoli utente

| Ruolo | Dashboard | Piano |
|---|---|---|
| `privato` / `cittadino` | `/dashboard-cittadino` | Free / Pro |
| `impresa` | `/dashboard-impresa` | Micro €29 / Piccola €79 / Media €199 |
| `professionista` | `/dashboard-professionista` | Piano mensile |
| Admin | `/dashboard` | Solo whitelist email |

---

## Avvio locale

```bash
# 1. Copia e compila le variabili d'ambiente
cp .env.example .env.local
# Edita .env.local con i valori reali (vedi _VAULT/ o .env.master)

# 2. Installa dipendenze
npm install

# 3. Avvia in sviluppo (porta 3099)
npm run dev
```

**Requisito:** Node.js ≥ 18. Il server FastEmbed su Hetzner deve essere raggiungibile per il RAG; se `EMBED_VPS_URL` non è configurata, il sistema risponde senza contesto normativo.

---

## Struttura chiave

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Endpoint RAG principale (~800 righe)
│   │   ├── mobile/                # API per app mobile
│   │   └── ...
│   ├── dashboard/                 # Admin control room (whitelist)
│   ├── dashboard-cittadino/       # Dashboard ruolo privato
│   ├── dashboard-impresa/         # Dashboard ruolo impresa
│   ├── dashboard-professionista/  # Dashboard ruolo professionista
│   └── admin/                     # Sezione admin (protetta da layout auth)
├── lib/
│   ├── llm-client.ts              # OpenRouter + Anthropic fallback
│   ├── supabase-server.ts         # Client Supabase server-side
│   ├── rate-limit.ts              # Upstash Redis sliding window
│   ├── langfuse.ts                # Tracing RAG (graceful no-op)
│   └── lead-scoring.ts            # Scoring qualità lead
└── components/
    ├── dashboard/                 # MainDashboard, DualSidebar, ...
    ├── modals/                    # ModalPagamento, ModalBusinessPlan, ...
    └── onboarding/                # Wizard onboarding multi-step
```

---

## Database (Supabase `rjwaegzdfsdlnbijkark`)

Tabelle principali: `users`, `subscriptions`, `company_profiles`, `professional_profiles`, `imprese`, `normaai_chunks` (pgvector 384d), `lead_marketplace`, `audit_trail`, `gdpr_consents`.

Migrations locali in `supabase/migrations/`. Le migration applicate su cloud hanno timestamp Supabase; il prefisso numerico locale è indicativo.

---

## Deploy

```bash
# Deploy via Vercel CLI
vercel --prod --token $VERCEL_TOKEN
```

**NON usare Netlify** — account SD24 ha crediti esauriti.

---

## Cron jobs (vercel.json)

| Path | Schedule | Descrizione |
|---|---|---|
| `/api/scadenze/notify` | `0 8 * * *` | Notifiche scadenze normative quotidiane |
| `/api/impresa/report-compliance?cron=1` | `0 9 1 * *` | Report compliance mensile imprese |

Tutti i cron endpoint verificano `Authorization: Bearer $CRON_SECRET`.

---

## Sicurezza

- **Auth:** tutte le API route verificano la sessione da `supabase.auth.getUser()` — mai da `body.userId`
- **Admin layout:** `src/app/admin/layout.tsx` whitelist su `ALLOWED_EMAILS`
- **Rate limiting:** sliding window 20req/min per utente autenticato
- **Env secrets:** mai hardcodati — sempre da `.env.local` / Vercel env vars
