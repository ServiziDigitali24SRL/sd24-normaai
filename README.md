# NormaAI

> **Claude potenziato dal RAG sull'intero corpus normativo italiano** — webapp desktop + mobile per cittadini, imprese e professionisti.
> Prodotto di **Servizi Digitali 24 S.R.L.** — produzione: [normaai.it](https://normaai.it)

---

## 1. Cos'è NormaAI

NormaAI è un assistente legale conversazionale che combina un LLM frontier (Claude Sonnet 4.5 via OpenRouter, fallback Anthropic diretto) con un sistema RAG su un corpus di **~8 milioni di chunk** della normativa italiana — Costituzione, Codici, leggi statali, decreti, sentenze di Cassazione, regolamenti UE rilevanti — embeddati e indicizzati in Supabase.

L'utente pone domande in linguaggio naturale; il sistema recupera i passaggi normativi pertinenti e li usa come contesto autorevole per la generazione della risposta, con citazioni puntuali agli articoli e alle pronunce.

### Tre segmenti utente, tre dashboard

| Segmento | Dashboard | Tassonomia |
|---|---|---|
| **Cittadino** | `/dashboard-cittadino` | Casa, Famiglia, Lavoro, Consumatore, Fisco, Salute, Veicoli, Privacy, PA |
| **Impresa** | `/dashboard-impresa` | GDPR, HR, Fiscale, Societario, D.Lgs 231, HSE, AML, … |
| **Professionista** | `/dashboard-professionista` | Avvocato / Commercialista / Ingegnere / Consulente del lavoro / Geometra |

---

## 2. Modello di business

NormaAI è esplicitamente **non sostitutiva di un avvocato umano**. Il prodotto è progettato per portare l'utente fino al limite di ciò che un Q&A AI può ragionevolmente coprire, e oltre quel limite per **trasformare la conversazione in un lead qualificato**.

### Cinque flussi di ricavo

1. **Lead marketplace** — quando il Q&A si esaurisce l'utente paga **9 €** per inviare la richiesta strutturata. Diventa un lead acquistabile da un professionista a **75–150 €** in base a scoring di qualità (`src/lib/lead-scoring.ts`).
2. **Abbonamenti cittadino / impresa** — sblocca dashboard completa, archivio progetti, scadenzario, connettori documentali (Gmail, Drive, Dropbox, OneDrive, Outlook, Adobe Sign, DocuSign), notifiche WhatsApp/Telegram.
3. **Abbonamenti professionista** — accesso al pool di lead, CRM verticale, agente vocale Vapi per qualifica, integrazioni studio.
4. **API B2B / AI2AI** — endpoint pay-per-query monetizzato per integrazioni machine-to-machine (waitlist developer attiva via `/api/developer-waitlist`).
5. **Enterprise "su misura"** — corpus privato del cliente affiancato a quello pubblico, deployment dedicato, SSO, contratti enterprise.

### Pagamenti
- **Stripe** — abbonamenti, lead unlock, acquisto lead (`src/app/api/stripe/`).
- **RevenueCat** — IAP iOS/Android (presente nell'app mobile Capacitor companion).

---

## 3. Architettura

```
┌────────────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js 16 App Router)                 │
│                                                                    │
│   /  →  Landing → redirect /mobile se UA mobile                    │
│   /chat                  Q&A pubblica freemium                     │
│   /dashboard-{cittadino,impresa,professionista}                    │
│   /onboarding            Wizard registrazione + profilazione       │
│   /leads                 Marketplace lead per professionisti       │
│   /admin                 Cruscotto interno SD24                    │
│   /mobile                UI mobile dedicata                        │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                       MIDDLEWARE (Edge)                            │
│   • Mobile UA detection → redirect /mobile                         │
│   • Auth gate via Supabase SSR cookies                             │
│   • Lista route pubbliche: /api/chat, webhook, OAuth callback…     │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                  API ROUTES (Next.js, force-dynamic)               │
│                                                                    │
│   POST /api/chat            →  Pipeline RAG + streaming SSE        │
│   POST /api/leads           →  Crea lead da conversazione          │
│   GET  /api/leads/preview   →  Anteprima pubblica lead             │
│   POST /api/leads/[id]/otp  →  Sblocco lead via OTP                │
│   POST /api/stripe/checkout →  Sessioni di pagamento               │
│   POST /api/stripe/webhook  →  Eventi Stripe (sub, invoice, …)     │
│   /api/auth/*               →  OAuth callback connettori           │
│   /api/{gmail,gdrive,dropbox,onedrive,outlook,adobesign,docusign}  │
│                              Connettori documentali utente         │
│   /api/{whatsapp,telegram}  →  Notifiche transazionali             │
│   /api/scadenze             →  Scadenzario fiscale/legale          │
│   /api/wallet               →  Saldo crediti utente                │
│   /api/admin/*              →  Tools interni                       │
└────────────────────────────────────────────────────────────────────┘
                                │
       ┌────────────────────────┼─────────────────────────┐
       ▼                        ▼                         ▼
┌──────────────┐      ┌──────────────────┐      ┌────────────────┐
│ Embed VPS    │      │ Supabase         │      │ LLM            │
│ (Hetzner)    │      │ Postgres+pgvector│      │ OpenRouter →   │
│ fastembed    │      │ ~8M chunk 384d   │      │ Anthropic SDK  │
│ 384d         │      │ pgvector ANN     │      │ (fallback)     │
│ :8765/embed  │      │ RPC match_*      │      │                │
└──────────────┘      └──────────────────┘      └────────────────┘
```

### Flusso di una query (`/api/chat`)

1. **Rate limit** (Upstash Redis sliding window) per IP + user.
2. **Auth & profilo** — `loadUserProfile()` legge `profili_utenti` da Supabase per personalizzazione (ruolo, settori, verbosità, citazioni).
3. **Embedding** — POST al VPS Hetzner `EMBED_VPS_URL` (fastembed 384d, 2 retry con backoff 1.5s). Se il VPS è down il sistema **degrada graziosamente**: Claude risponde senza RAG.
4. **Retrieval** — chiamata parallela a `rpc/match_normaai_chunks` su più shard (verticali del corpus), top-K=4 per shard, soglia coseno 0.10. Pronunce di Cassazione recuperate separatamente con `rpc/get_norma_chain` quando rilevanti.
5. **Prompt assembly** — `system-prompts.ts` compone il system prompt in base al *tier* utente (anonimo / cittadino / impresa / professionista) e inietta i chunk recuperati come contesto autorevole con istruzioni di citazione.
6. **Generation** — `createLLMStream()` apre il connettore primario (OpenRouter, modello `anthropic/claude-sonnet-4.5`, fallback `gpt-4o` / `gemini-2.5-pro`); se la connessione iniziale fallisce entro 15s, switch ad Anthropic SDK diretto. Lo stream è SSE Anthropic-compatible end-to-end.
7. **Lead scoring** — in parallelo `lead-scoring.ts` valuta complessità, urgenza, valore economico stimato. Sopra una soglia il client mostra il CTA "Trasforma in richiesta" (paywall 9 €).
8. **Tracing** — Langfuse traccia ogni step (embedding, retrieval, generation) con scoring; Sentry cattura errori; `incrementDailyUsage` / `incrementCompanyQueries` aggiornano contatori per quota e overage billing.

### Resilienza
- Retry SSE solo prima del primo byte (`fetchChatStream` lato client).
- Fallback model chain su OpenRouter, poi fallback provider intero ad Anthropic.
- Embed VPS down → RAG saltato, conversazione continua.
- Ogni step ha timeout esplicito e log strutturato.

---

## 4. Stack tecnico

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Edge middleware) |
| UI | React 19, Tailwind, Radix UI, Framer Motion, lucide-react |
| Auth & DB | Supabase (Postgres + pgvector + Auth + RLS), `@supabase/ssr` |
| LLM | `@anthropic-ai/sdk`, OpenRouter HTTP, Claude Sonnet 4.5 default |
| Embeddings | fastembed 384d self-hosted su VPS Hetzner |
| Rate limit | Upstash Redis + `@upstash/ratelimit` |
| Payments | Stripe (web), RevenueCat (mobile companion) |
| Email | Brevo (`sib-api-v3-sdk`) — transazionali, OTP, lead notifications |
| Voice | Vapi (`@vapi-ai/web`) — agente vocale qualifica lead |
| Notify | Twilio (SMS/WhatsApp), Telegram Bot API |
| Observability | Sentry (`@sentry/nextjs`) + Langfuse (LLM tracing) |
| Hosting | **Vercel** |
| Dominio | normaai.it (Namecheap + Cloudflare DNS) |

---

## 5. Struttura del repository

```
src/
├── app/
│   ├── (public)              page.tsx, chat/, mobile/, preview/
│   ├── dashboard*            cittadino / impresa / professionista
│   ├── onboarding/           wizard registrazione + profilazione
│   ├── leads/                marketplace lead
│   ├── admin/                strumenti interni
│   ├── api/
│   │   ├── chat/             pipeline RAG + streaming (route + system-prompts)
│   │   ├── leads/            crea / preview / OTP unlock
│   │   ├── stripe/           checkout + webhook
│   │   ├── auth/             OAuth callback connettori
│   │   ├── {gmail,gdrive,…}/ connettori documentali utente
│   │   ├── {whatsapp,telegram,scadenze,wallet,…}
│   │   └── mobile/           endpoint dedicati app Capacitor
│   ├── layout.tsx, error.tsx, global-error.tsx
│   ├── privacy/, termini/, cookie/   pagine legali
│   └── sitemap.ts, robots.ts
├── components/
│   ├── ChatBar, Sidebar, CommandPalette, ModalOverlay
│   ├── dashboard/            ChatSlidePanel, DualSidebar, MainDashboard, …
│   ├── mobile/               UI mobile-first
│   ├── modals/               flussi pagamento + onboarding
│   ├── onboarding/           step wizard
│   ├── admin/                pannelli interni
│   └── ui/                   primitives (shadcn-style)
├── lib/
│   ├── llm-client.ts         OpenRouter primary + Anthropic fallback
│   ├── chat-stream.ts        client SSE con retry
│   ├── lead-scoring.ts       qualità & pricing lead
│   ├── taxonomy.ts           tassonomie cittadino/impresa/pro
│   ├── stripe.ts, twilio.ts, email.ts
│   ├── supabase-{browser,server}.ts
│   ├── rate-limit.ts (Upstash)
│   ├── langfuse.ts, logger.ts
│   ├── oauth-crypto.ts       cifratura token connettori
│   ├── vault.ts              segreti runtime
│   └── piva-validation.ts, professionals.ts, articles.ts, …
├── hooks/                    hook React condivisi
├── middleware.ts             auth + mobile redirect
├── instrumentation.ts        Sentry server init
└── instrumentation-client.ts Sentry browser init
supabase/
└── migrations/               schema versionato (profiles, connectors, GDPR, …)
scripts/                      utility CLI
public/                       asset statici
sentry.{server,edge}.config.ts
prewarm.cjs                   warm-up cold start su Vercel
```

---

## 6. Variabili d'ambiente

Setup in `.env.local` (locale) e Vercel Project Settings (produzione).

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM
OPENROUTER_API_KEY=          # primario
ANTHROPIC_API_KEY=           # fallback diretto

# Embeddings (VPS Hetzner)
EMBED_VPS_URL=http://<vps-host>:8765

# Rate limit
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email / Notify
BREVO_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TELEGRAM_BOT_TOKEN=

# Voice
NEXT_PUBLIC_VAPI_PUBLIC_KEY=

# Observability
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASEURL=

# OAuth connettori (Gmail, GDrive, Dropbox, OneDrive, Outlook, AdobeSign, DocuSign)
# vedi src/app/api/auth/*
```

---

## 7. Sviluppo locale

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

Cold start mitigato da `prewarm.cjs` (eseguito post-build su Vercel). `start-dev.sh` è un wrapper per dev locale.

### Database
Le migrazioni vivono in `supabase/migrations/` con prefisso numerico (`001_normaai_profiles.sql`, `002_user_professionals.sql`, …). Le funzioni RPC chiave (`match_normaai_chunks`, `get_norma_chain`, `increment_daily_usage`, `increment_company_queries`, `increment_anonymous_usage`) sono definite lato Supabase e versionate insieme allo schema.

---

## 8. Deploy

- Hosting **Vercel**. Push su `main` → deploy preview, promozione manuale a produzione.
- Dominio produzione: `normaai.it`.
- Sentry + Langfuse abilitati su prod; secret iniettati come Encrypted Env Vars.

---

## 9. Companion mobile

Esiste un'app **Capacitor** (Vite + React + Capacitor 8, iOS + Android) che riusa la stessa API backend di questo monorepo per il flusso conversazionale, con login via Apple Sign In e IAP via RevenueCat.

---

## 10. Licenza & contatti

Codice proprietario di **Servizi Digitali 24 S.R.L.** (D-U-N-S 302416196). Non distribuire.

Contatto: [francesco@servizidigitali24.online](mailto:francesco@servizidigitali24.online)
