# MediQuery

**Patient-anchored medication history · source-traced · human review**

MediQuery turns fragmented discharge packets into an organized, source-linked record a care team can query. The product wedge is **medication reconciliation at home-health intake** — hospital → SNF → home — not another facility-owned chart.

> **Prototype only** · No real PHI · Human review required · Not clinical advice

The app now ships the **Margaret multi-source recon demo** (timeline, conflict review, human resolution) plus the original packet ETL and Ask. Full production path is still in **[docs/PRD.md](./docs/PRD.md)**.

## What it does now

1. **Intake** — upload a PDF for deterministic ETL, or use demo templates
2. **Records** — browse parsed sections (medications, allergies, labs, wound care, etc.)
3. **Ask** — query ingested data via OpenAI with source citations (API key required)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### LLM Ask (recommended)

```bash
cp .env.example .env.local
# OPENAI_API_KEY=sk-...
npm run dev
```

Without `OPENAI_API_KEY`, Ask uses keyword fallback. **Intake parsing does not use the LLM** — it is deterministic regex/heuristic ETL.

### Try real PDF intake

Upload `samples/Branson_Harold_Discharge_2026-06-17_MESSY.pdf` on `/intake` → **Extract & Ingest**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Unit/integration tests |
| `npm run verify` | Tests + typecheck + build |
| `npm run verify:live` | Above + smoke-test `/api/chat` (dev server required) |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Product home + Margaret story |
| `/intake` | Upload PDF (ETL) or ingest demo template |
| `/dashboard` | Agency intake board |
| `/patients/[id]` | Organized record detail |
| `/ask` | LLM queries across all records |

## Demo data

Six prepopulated patients ship with the app. Reset from the board or clear `mediquery-workspaces-v2`.

| Patient | Scenario |
|---------|----------|
| Margaret Smith | Hospital + SNF + pharmacy + referral recon |
| Eleanor Whitfield | Complete packet |
| Robert Martinez | Missing wound care |
| Dorothy Nguyen | Med/allergy conflict |
| James Cooper | Missing therapy orders |
| Linda Park | Incomplete insurance auth |

See **[DEMO.md](./DEMO.md)** for walkthroughs (including the target Margaret investor demo). See **[STORIES.md](./STORIES.md)** for the development log. See **[docs/PRD.md](./docs/PRD.md)** for the product spec.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- PDF text extraction (`pdfjs-dist`) + deterministic ETL (`src/services/dischargeEtl.ts`)
- Mock parser for demo templates (`src/services/dischargeParser.ts`)
- localStorage store (`src/services/patientStore.ts`)
- OpenAI chat API with RAG context (`src/services/llmAgent.ts`) — Ask only; requires API key

## Out of scope (this prototype)

No real EHR, fax, or PHI. No family consent flow. No multi-source medication timeline. Prototype for demonstration only.

## License

MIT
