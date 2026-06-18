# Mediquery

**Ingest · Organize · Query**

Mediquery turns hospital discharge packets into organized clinical records you can query with natural language. Every answer links back to source sections in the packet.

> **Prototype only** · No real PHI · Human review required

## What it does

1. **Intake** — ingest a discharge packet (mock PDF upload or demo templates)
2. **Records** — browse parsed sections (medications, allergies, labs, wound care, etc.)
3. **Ask** — query all ingested data via LLM with source citations

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: LLM

```bash
cp .env.example .env.local
# Set OPENAI_API_KEY
npm run dev
```

Without an API key, Ask uses keyword-based fallback answers.

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
| `/intake` | Ingest discharge packet |
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

See **[DEMO.md](./DEMO.md)** for walkthrough scripts.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Mock parser (`src/services/dischargeParser.ts`) — deterministic demo parsing
- localStorage store (`src/services/patientStore.ts`)
- OpenAI chat API with RAG context (`src/services/llmAgent.ts`)

## Out of scope

No real EHR, fax, or PHI. No staff notes UI. Prototype for demonstration only.

## License

MIT
