# Mediquery

**Ingest · Organize · Query**

Mediquery turns hospital discharge packets into organized clinical records you can query with natural language. Every answer links back to source sections in the packet.

> **Prototype only** · No real PHI · Human review required

## What it does

1. **Intake** — upload a PDF for deterministic ETL, or use demo templates (mock parser)
2. **Records** — browse parsed sections (medications, allergies, labs, wound care, etc.)
3. **Ask** — query ingested data via OpenAI LLM with source citations (API key required)

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
| `/intake` | Upload PDF (ETL) or ingest demo template |
| `/dashboard` | Browse ingested records |
| `/patients/[id]` | Organized record detail |
| `/ask` | LLM queries across all records |

## Demo data

Five prepopulated patients ship with the app. Reset by clearing `jot-snf-workspaces` from browser localStorage and refreshing.

| Patient | Scenario |
|---------|----------|
| Eleanor Whitfield | Complete packet |
| Robert Martinez | Missing wound care |
| Dorothy Nguyen | Med/allergy conflict |
| James Cooper | Missing therapy orders |
| Linda Park | Incomplete insurance auth |

See **[DEMO.md](./DEMO.md)** for walkthrough scripts. See **[STORIES.md](./STORIES.md)** for the latest development story.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- PDF text extraction (`pdfjs-dist`) + deterministic ETL (`src/services/dischargeEtl.ts`)
- Mock parser for demo templates (`src/services/dischargeParser.ts`)
- localStorage store (`src/services/patientStore.ts`)
- OpenAI chat API with RAG context (`src/services/llmAgent.ts`) — Ask only; requires API key

## Out of scope

No real EHR, fax, or PHI. No staff notes UI. Prototype for demonstration only.

## License

MIT
