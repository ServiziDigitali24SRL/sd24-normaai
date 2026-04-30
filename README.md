# NormaAI Marketplace

Legal-question chat + voice mobile + AI avatar desktop + lawyer lead marketplace.

## Pivot status (2026-04)

This branch (`pivot/marketplace`) is a clean re-init of the project after the
strategic pivot away from segmented dashboards (cittadino / impresa /
professionisti) toward a 2-sided marketplace:

- **User side**: chat / voice / avatar — unlimited, free. Optional 9€ "ask a
  human lawyer" creates a lead with PDF parere.
- **Lawyer side**: marketplace browse + 91€ purchase to reveal contact details.
- **B2B API**: free tier + pay-per-use endpoints for AI2AI integration.
- **White-label**: contact-form only, custom implementations on demand.

Legacy code lives on the `legacy-pivot` tag for reference.

## Architecture

- **DB**: Supabase Postgres + pgvector. Schema in `supabase/migrations/_pivot/001_marketplace_init.sql`.
- **Frontend**: Next.js 16 App Router.
- **LLM**: Claude Sonnet 4.6 via OpenRouter.
- **Voice**: Vapi (mobile orb) + Audio2Face NIM (desktop avatar — fase 2).
- **Pipeline**: 8-agent orchestrator (3 real, 5 stubs in fase 1) — see `src/lib/agents/`.
- **Sidebar**: live agent telemetry (`src/components/AgentSidebar.tsx`).

## Run

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

## Apply schema

The schema is already applied to Supabase branch `marketplace-pivot`
(project ref `vpabqmafhedaqfmuxsav`). For a fresh project:

```bash
psql $DATABASE_URL -f supabase/migrations/_pivot/001_marketplace_init.sql
```
