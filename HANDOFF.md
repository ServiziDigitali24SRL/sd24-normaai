# NormaAI Frontend — HANDOFF
> Aggiornato: 2026-04-28

## Stato Fix

### ✅ P0 — Completati (commit `89758ab`)

| ID | Fix | File |
|----|-----|------|
| B01 | `type AuthModalRole` + `getRoleForTab(tabId)` | `page.tsx` |
| B02 | Tab locked (03/04/05) apre modal ruolo corretto | `page.tsx` |
| B03 | Navbar "Accedi"/"Inizia gratis" basati su tab corrente | `page.tsx` |
| B04 | "Trova professionista" → `setAuthModal('professionista')` | `page.tsx` |
| B05 | Card piano: toggle ON/OFF | `page.tsx` |
| B06 | Card dimensione impresa: clickable con stato visivo | `page.tsx` |
| B07 | P.IVA input: `inputMode="numeric"`, validazione 11 cifre | `page.tsx` |
| B08 | "Continua" disabled se !role + errore inline | `page.tsx` |
| B09 | Auth modals: `finally`, `onClose`, `router.refresh`, redirect role-based | `Modal*.tsx` |
| B10 | Errori distinti (credenziali/email/rate) + bottone disabled loading | `Modal*.tsx` |

### ✅ P1 — Completati (commit `89758ab`)

| ID | Fix | File |
|----|-----|------|
| B11 | `fetch('/api/stripe/checkout')`: `if (!res.ok)` + UI error + `resetSent` reset | `ModalProfessionista.tsx` |
| B12 | Embedding label `1536d` → `384d` | `CorpusCard.tsx`, `dashboard/page.tsx` |

### ✅ P2 — Completati (commit `b7ce2d3`)

| ID | Fix | File |
|----|-----|------|
| B13 | "Trova professionista" → ora apre ModalProfessionista correttamente | `page.tsx` |
| B14 | Eliminato `/api/sentry-example-api/route.ts` (boilerplate) | deleted |
| B15 | `<html lang="it">` già presente in `layout.tsx` — nessun cambio necessario | — |

---

## ⏳ Pendenti (P1-P2 non critici)

- **B16** Rate limit per tier (`src/lib/rate-limit.ts`): attualmente generico 10/min. Implementare anon/gratis/impresa.
- **B17** `stripe/webhook/route.ts`: idempotency check su tabella `stripe_processed_events` (non esiste ancora).
- **B18** `FixedChatBar.tsx`: upload PDF/audio TODO — nascondere bottoni con `FEATURE_FLAGS.uploads = false`.
- **B19** `dashboard/system-health/route.ts`: aggiungere auth check whitelist ALLOWED_EMAILS.
- **B20** CAP/Città/Regione autofill: feedback visivo verde già implementato tramite `autoFilled` prop — verificare funzionamento.
- **B21** Modal orfani (ModalScadenze, ModalNuovoArchivio, ModalParcelle, ModalOrganigramma, ModalFormazione): da collegare a trigger UI o rimuovere.

---

## Definition of Done — Status

### Cittadino ✅ (da testare live)
- [x] Tab 01 Chat aperto al caricamento
- [x] "Inizia gratis" → ModalCittadino (tab Registrati)
- [x] Signup → modal chiude, router.refresh(), redirect /dashboard-cittadino
- [x] "Trova professionista" → ModalProfessionista

### Impresa ✅ (da testare live)
- [x] Tab 02 Onboarding → step 1
- [x] Card "Impresa" → toggle ON/OFF
- [x] Card Impresa ON + Continua → step 2 dimensione
- [x] Step 3 P.IVA scrivibile, validazione 11 cifre
- [ ] Step 4 signup → stripe checkout (da testare end-to-end con Stripe test key)

### Avvocato ✅ (da testare live)
- [x] Tab 04 locked → ModalProfessionista (NON ModalCittadino)
- [x] Signup → stripe checkout → redirect /dashboard

### Su Misura ✅
- [x] Tab 07 → EnterpriseScreen (no auth modal) — non era locked, già funzionante

---

## Note Tecniche

- Il linter post-save resetta gli Edit multipli su `page.tsx` — usare `python3` patch scripts per modifiche multiple allo stesso file.
- `BtnPrimary` in `ModalOverlay.tsx` aggiornato per supportare prop `disabled`.
- tsc `--noEmit` va in OOM su questa macchina — usare `NODE_OPTIONS="--max-old-space-size=4096"` o verificare con Vercel build.
