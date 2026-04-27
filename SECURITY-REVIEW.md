# Security Review — NormaAI

> Review iniziale eseguita usando lo stack open-source di **[Trail of Bits](https://github.com/trailofbits)** + ruleset OWASP/Semgrep ufficiali, sul commit `2b36b85` (main).
> Metodologia ispirata al [ToB Testing Handbook](https://appsec.guide/) — sezione *Web · JavaScript/TypeScript*.

## Strumenti eseguiti

| Tool | Scope | Risultato |
|---|---|---|
| **Semgrep 1.157** + `auto/p/security-audit/p/typescript/p/react/p/nextjs/p/javascript/p/owasp-top-ten/p/jwt/p/sql-injection/p/xss/p/command-injection/p/insecure-transport/p/secrets` | 205 file `src/`, 204 regole | 2 finding (1 ERROR, 1 WARNING) |
| **npm audit** (`--omit=dev`) | dependency tree produzione | 4 moderate, 0 high, 0 critical |
| **Gitleaks** | full git history (266 commit) | 3 hit → **tutti false positive** verificati |
| **Manual review** | `/api/chat`, `/api/leads*`, `/api/stripe/webhook`, middleware, `oauth-crypto.ts`, `rate-limit.ts` | vedi §3 |

Trail of Bits non pubblica un *meta-package* Semgrep per JS/TS sul registry pubblico (le regole TS curate vivono in `trailofbits/semgrep-rules` repo per Solidity/Python/Go); per stack TypeScript il loro Handbook raccomanda esattamente la combinazione di ruleset OWASP/Semgrep usata sopra.

---

## 1. Findings statici (Semgrep)

### 🟠 SEM-01 — `oauth-crypto.ts`: AES-GCM senza `authTagLength` esplicito (ERROR)

**File:** [`src/lib/oauth-crypto.ts:48`](src/lib/oauth-crypto.ts)
**Regola:** `javascript.node-crypto.security.gcm-no-tag-length`

```ts
const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
decipher.setAuthTag(tag);
```

**Issue.** Senza l'opzione `authTagLength`, Node accetta tag di lunghezza variabile (4–16 byte). Un attaccante che riesce a iniettare un ciphertext con tag a 4 byte ha 2³² volte più probabilità di forge rispetto al default a 16 byte.

**Severità reale.** *Bassa* — il codice usa formato proprio `iv:tag:enc` interno, i tag vengono generati internamente dal cifratore. Un attaccante avrebbe già bisogno di compromesso DB per inserire ciphertext malformati. Va comunque irrigidito.

**Fix.**
```ts
const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
if (tag.length !== 16) throw new Error("Invalid auth tag length");
decipher.setAuthTag(tag);
```
Stesso fix lato `createCipheriv` per coerenza.

---

### 🟡 SEM-02 — `guide/[slug]/page.tsx`: `dangerouslySetInnerHTML` non costante (WARNING)

**File:** `src/app/guide/[slug]/page.tsx:79`

```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**Severità reale.** *Bassa* — `jsonLd` è costruito server-side da `article` proveniente da una struttura statica/seed. Tuttavia `JSON.stringify` **non sfugge `</script>`**: se in futuro `article.title` diventa user-generated, è XSS.

**Fix.**
```ts
const safe = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
```
Oppure usare il componente `<Script type="application/ld+json">` di Next 16, che applica l'escape automaticamente.

---

## 2. Dependency audit (`npm audit --omit=dev`)

| Severity | Pacchetto | Issue | Azione |
|---|---|---|---|
| moderate | `@anthropic-ai/sdk` | Memory Tool path traversal (sandbox escape sibling dirs) | **Aggiornare alla minor patched** — non usate il Memory Tool ma è dipendenza diretta. |
| moderate | `@sentry/nextjs` | catena via `next` | si risolve aggiornando Next. |
| moderate | `next` | catena via `postcss` | bump `next@^16.x` patched. |
| moderate | `postcss` | XSS via unescaped `</style>` in stringify output | `npm dedupe && npm update postcss`. |

**Comando consigliato.** `npm audit fix` (non `--force`); rivedere il diff di `package-lock.json` prima del merge.

---

## 3. Manual review — punti critici

### 3.1 `/api/chat` (RAG pipeline) — [src/app/api/chat/route.ts](src/app/api/chat/route.ts) — 928 righe

**Positivi**
- ✅ `userId` derivato sempre da cookie Supabase (`auth.getUser()`), non da body. Mismatch body↔cookie → 403 (`CVE-05` già fixato).
- ✅ Rate limit Upstash a doppio livello: 20 req/min per IP anonimo, 100 req/min per utente autenticato + quote mensili (10/mese anonimo, 10/giorno free).
- ✅ Embedding via VPS è hard-coded in env (`EMBED_VPS_URL`) → no SSRF da input utente.
- ✅ Degrado graceful se VPS embed o LLM falliscono.
- ✅ `force-dynamic` esplicito → no cache di risposte personalizzate.

**Da migliorare**
- ⚠️ **Cost-abuse anonimo.** Il limite "10 query/mese per IP" usa `x-forwarded-for` raw (`split(",")[0]`). Su Vercel l'header è validato, ma chiunque dietro CGNAT condivide quota; e `x-session-id` è scelto dal client, quindi un attaccante può comunque forzare una chiave nuova solo cambiando IP (Tor/proxy). Pricing della singola chat = embed VPS + Claude Sonnet ≈ €0.01–0.05; con 1 milione di richieste un attaccante motivato costa ~€10–50k.
  **Mitigation suggerita:** richiedere CAPTCHA/turnstile dopo N richieste anonime *globali* (non per IP) nella stessa finestra; budget cap mensile per chiave LLM con alert.
- ⚠️ **`x-smoke-key` bypass globale.** Se la env var `SMOKE_KEY` viene ruotata male o leakata, l'attaccante salta auth + rate-limit. Loggare ogni uso e ruotare la chiave in CI ad ogni deploy.
- ⚠️ **Riga 895** — query a `/rest/v1/profiles` con `professione=ilike.*${encodeURIComponent(verticaleNorm)}*` per matching professionisti. `verticaleNorm` deriva da scoring server-side, quindi non è user-controlled diretto, ma il pattern `ilike.*…*` con `%`/`_` non sfuggiti è esattamente il problema risolto in `/api/leads/preview` con `sanitizeLike()` (CVE-06). Applicare `sanitizeLike` anche qui per coerenza.

### 3.2 `/api/leads/preview` — endpoint **pubblico**

- ✅ `sanitizeLike` su filtri user-input (escape `%`, `_`, `\`).
- ✅ `anonymizeSummary()` tronca a 3 parole.
- ⚠️ Verificare RLS Supabase su `leads`: l'endpoint usa **anon key** ma fa fetch di lead degli "ultimi 7 giorni". Confermare che la policy RLS espone solo i campi anonimizzati (`vertical_id`, `lead_score`, `tier`) — la query attuale non sembra filtrare colonne PII a livello SQL.

### 3.3 `/api/stripe/webhook` — `route.ts:36`

- ✅ `stripe.webhooks.constructEvent(body, sig, webhookSecret)` corretto.
- ✅ Idempotency check (CVE-08).
- ⚠️ Verificare che il route legga il **raw body** (Next 16 App Router lo gestisce con `await req.text()`): se in futuro qualcuno aggiunge un middleware che fa `req.json()` prima, la firma fallisce silenziosamente.

### 3.4 Middleware — `src/middleware.ts`

- ✅ Lista esplicita di route pubbliche.
- ⚠️ `pathname.startsWith("/api/mobile/")` — qualsiasi path sotto `/api/mobile/` salta auth. Se domani aggiungi `/api/mobile/admin`, è esposto. Preferire whitelist puntuale.

### 3.5 Connettori OAuth — `src/lib/oauth-crypto.ts` + `src/app/api/{gmail,gdrive,dropbox,onedrive,outlook,adobesign,docusign}`

- ✅ Token cifrati a riposo (AES-256-GCM, vedi §SEM-01 per fix tag length).
- ⚠️ Verificare rotation della chiave master (`OAUTH_ENC_KEY` env): non c'è codice di re-encryption visibile in repo. Se la chiave deve essere ruotata per incidente, serve uno script di re-encryption batch.
- ⚠️ Confermare che i token refresh siano riusati e non accumulati storicamente (revoca dopo logout).

### 3.6 RLS Supabase

Le migrazioni in `supabase/migrations/` definiscono schema ma le **policy RLS** sono spesso a fianco — verificare con:
```sql
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';
```
Tabelle critiche: `profili_utenti`, `leads`, `connectors_tokens`, `conversations`, `wallet_transactions`.

---

## 4. Threat model — flussi critici

### TM-1 · Chat anonima freemium
**Asset:** budget LLM/embed.  **Attaccante:** abuse / cost exhaustion.
**Vettori:** rotazione IP, sessione client-side falsa, replay.
**Controlli attuali:** rate-limit IP+session, quota mensile, force-dynamic.
**Gap:** nessun budget cap globale, no CAPTCHA progressivo.

### TM-2 · Marketplace lead — escalation
**Asset:** PII di cittadini/imprese.  **Attaccante:** professionista malevolo.
**Vettori:** acquisto lead non pagato (race su webhook), enumerazione lead via `/preview`, lettura lead di vertical non pertinente.
**Controlli attuali:** OTP unlock, idempotency Stripe, anonimizzazione preview.
**Gap:** confermare che `unlock` controlli `professionista_id == buyer.id` lato server e che la RLS impedisca SELECT dei campi PII prima del pagamento.

### TM-3 · Connettori OAuth — token theft
**Asset:** token Gmail/Drive/Dropbox/etc dell'utente.
**Vettori:** XSS (via SEM-02 escalato), SSRF interno, leak via log/Sentry.
**Controlli attuali:** AES-GCM at-rest, scope minimi, OAuth state.
**Gap:** verificare che Sentry **scrubbing** sia attivo su `Authorization`, `cookie`, body OAuth callback (default Sentry maschera ma confermare).

---

## 5. Roadmap raccomandata (ordine consigliato)

| Priorità | Azione | Sforzo | Stato |
|---|---|---|---|
| P0 | `npm audit fix` + bump `next`/`postcss`/`@anthropic-ai/sdk` | 1h | ✅ commit `6de966c` |
| P0 | Fix SEM-01 (`authTagLength: 16`) | 15min | ✅ commit `6de966c` |
| P1 | Sanitize `ilike` filter su query `profiles` in `/api/chat` (riga 895) | 15min | ✅ commit `6de966c` |
| P1 | Budget cap globale LLM in-code (`MAX_MONTHLY_ANON_COST_EUR`) | 2h | ✅ commit `6de966c` |
| P1 | **RLS: 13 policy `{public}→{service_role}`** (leads, documents, chunks…) | 2h | ✅ migration `012` + applicato 2026-04-27 |
| P1 | Budget alert OpenRouter + Anthropic dashboard | 30min | ⬜ vedi §7 |
| P2 | Fix SEM-02 (escape `</` in JSON-LD) | 15min | ✅ commit `6de966c` |
| P2 | Whitelist puntuale `/api/mobile/*` invece di prefix | 30min | ✅ commit `6de966c` |
| P2 | CAPTCHA progressivo dopo N chat anonime | 4h | ⬜ backlog |
| P3 | Script re-encryption `OAUTH_ENC_KEY` per disaster recovery | 4h | ✅ commit `6de966c` |
| P3 | Test idempotency webhook Stripe con replay reale | 2h | ⬜ backlog |

## 6. CI in essere

`.github/workflows/security.yml` esegue ad ogni push/PR e ogni lunedì 06:00 UTC:
- **Semgrep** con ruleset OWASP/ToB-style → upload SARIF al Security tab.
- **CodeQL** (JavaScript/TypeScript, query `security-and-quality`).
- **npm audit** (fail su `high`/`critical`).
- **Gitleaks** sull'intera history (allowlist `.github/gitleaks.toml` per 3 false positive noti).
- **Trivy** filesystem + IaC misconfig.

I findings appaiono nel tab **Security → Code scanning alerts** del repo.

---

## 7. Budget alert LLM — istruzioni setup

Tre layer di protezione contro cost-abuse anonimo:

### Layer 1 — In-code (già attivo)
Env var su Vercel → **Settings → Environment Variables**:
```
MAX_MONTHLY_ANON_COST_EUR = 200
```
Il codice in `/api/chat/route.ts` conta le query anonime in Upstash Redis (`budget:anon:YYYY-MM`) e ritorna 503 al superamento della soglia.

### Layer 2 — OpenRouter (provider primario)
1. [openrouter.ai/settings/credits](https://openrouter.ai/settings/credits)
2. **"Monthly budget limit"** → es. €300
3. **"Monthly notification threshold"** → es. €150 (email al 50%)

OpenRouter blocca automaticamente le richieste al superamento — zero costi oltre soglia.

### Layer 3 — Anthropic (fallback diretto)
1. [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)
2. **"Monthly spend limit"** → es. €100
3. **"Email notification"** → es. €50

---

*Per una review approfondita ToB-grade (threat model formale, abuse-case fuzzing, privilege escalation testing) il prossimo step naturale è ingaggiare ToB o equivalente per un audit pagato — tempi tipici 2–3 settimane uomo.*
