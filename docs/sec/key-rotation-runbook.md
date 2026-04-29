# SER-66 — Key Rotation Runbook

> **Quando usare questo documento**: se `check-bundle-secrets.sh` trova un segreto nel bundle,
> o se sospetti una compromissione, o per rotazione preventiva trimestrale.

---

## Chiavi gestite e dove ruotarle

| Chiave | Dove si trova | Come ruotarla |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Rigenera "Service Role Secret" |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Rigenera "Anon Public Key" |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Crea nuova, elimina vecchia |
| `PII_ENCRYPTION_KEY` | generata localmente | Genera nuovo hex-32 (vedi sotto) |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers | Roll API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint | Re-reveal o rigenera |
| `CORPUS_WEBHOOK_SECRET` | usato in `check_corpus_webhook_auth()` | Genera nuovo random, aggiorna Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | console.upstash.com | Reset token dal pannello |

---

## Procedura di emergenza (chiave trovata nel bundle)

### Step 1 — Revoca immediata (< 15 minuti)

```bash
# Supabase service role key compromessa:
# 1. Vai su https://supabase.com/dashboard/project/rjwaegzdfsdlnbijkark/settings/api
# 2. Clicca "Reveal" → "Regenerate" sulla Service Role Key
# 3. Copia il nuovo valore

# Anthropic API key compromessa:
# 1. Vai su https://console.anthropic.com/settings/keys
# 2. Clicca Delete sulla chiave compromessa
# 3. Crea una nuova API key
```

### Step 2 — Aggiorna Vercel (obbligatorio entro 30 minuti)

```bash
# Usando Vercel CLI
vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "nuova_chiave_qui"

# Oppure via dashboard:
# https://vercel.com/agenticsimpermeo-6968s-projects/normaai/settings/environment-variables
```

### Step 3 — Rideploy forzato

```bash
vercel deploy --prod --force
# Oppure via GitHub: crea un commit vuoto
git commit --allow-empty -m "chore: force redeploy after key rotation [SER-66]"
git push origin feat/hardening-ser-65-98
```

### Step 4 — Verifica che il vecchio bundle sia stato rimosso

```bash
# Dopo il nuovo deploy, il vecchio chunk JS non è più servito
# Vercel mantiene i vecchi deployment — accertarsi che siano disabilitati
# Dashboard → Deployments → seleziona il deployment compromesso → "Remove from production"
```

### Step 5 — Rimuovi dalla storia git (se committato)

```bash
# ATTENZIONE: riscrive la storia — coordinare con il team
pip install git-filter-repo

# Rimuovi la stringa specifica
git filter-repo --replace-text <(echo 'CHIAVE_COMPROMESSA==>CHIAVE_RIMOSSA')

# Force-push su tutti i branch
git push origin --force --all
git push origin --force --tags

# Notifica tutti i collaboratori di fare: git fetch --all && git reset --hard origin/main
```

---

## Generare nuove chiavi sicure

```bash
# PII_ENCRYPTION_KEY (AES-256 = 32 byte = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CORPUS_WEBHOOK_SECRET (32 byte URL-safe)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Verifica lunghezza PII key
echo -n "$PII_ENCRYPTION_KEY" | wc -c   # deve essere 64
```

---

## Rotazione preventiva trimestrale

| Trimestre | Chiavi da ruotare |
|---|---|
| Q1 (gennaio) | `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` |
| Q2 (aprile) | `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN` |
| Q3 (luglio) | `CORPUS_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET` |
| Q4 (ottobre) | `PII_ENCRYPTION_KEY` (+ re-encrypt dati esistenti), `SUPABASE_SERVICE_ROLE_KEY` |

> **Nota PII_ENCRYPTION_KEY**: se ruotata, i valori `query_enc` / `risposta_enc` in `audit_risposte`
> diventeranno illeggibili. Prima di ruotarla, eseguire uno script di re-encryption
> o accettare che i dati storici cifrati non siano più decifrabili
> (i dati in chiaro non sono modificati, solo la copia cifrata).

---

## Prevenzione — perché le chiavi finiscono nel bundle

Le variabili d'ambiente Next.js finiscono nel bundle **solo** se hanno il prefisso `NEXT_PUBLIC_`.

```
✅  SUPABASE_SERVICE_ROLE_KEY=...   → server-only, sicuro
✅  ANTHROPIC_API_KEY=...           → server-only, sicuro
❌  NEXT_PUBLIC_SERVICE_ROLE_KEY=...→ LEAK — non farlo mai
```

### Checklist PR per evitare leak

- [ ] Nessuna chiave sensibile ha il prefisso `NEXT_PUBLIC_`
- [ ] Le variabili server-only non sono importate in componenti `"use client"`
- [ ] `next.config.ts` non passa segreti a `env:` (visibile client)
- [ ] `CI check-bundle-secrets` passa (green in GitHub Actions)

---

*Documento mantenuto da Servizi Digitali 24 S.R.L. — Riferimento SER-66*
*Ultimo aggiornamento: 2026-04-29*
