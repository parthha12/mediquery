# Stories

Development log for Mediquery. Latest first.

---

## Story 3 — Real PDF ETL + LLM Ask (current)

**Status:** Done (parser) · LLM Ask requires API key

### Intake — deterministic PDF parser

Upload a text-based discharge PDF on `/intake` and the app extracts SNF fields without an LLM.

| Layer | Implementation |
|-------|----------------|
| Text extraction | `pdfjs-dist` per-page (`src/services/pdfText.ts`) |
| ETL | Regex/heuristics (`src/services/dischargeEtl.ts`) |
| API | `POST /api/intake` multipart upload |
| Storage | Workspace JSON → localStorage via `ingestWorkspace()` |

**Extracted sections:** demographics, diagnoses, medications, allergies, labs, wound care, therapy, diet, follow-ups, insurance/auth — with review flags (e.g. penicillin + amoxicillin, blank wound orders, missing therapy frequency, pending prior auth).

**Sample packet:** `samples/Branson_Harold_Discharge_2026-06-17_MESSY.pdf` (fictional, no PHI). Regenerate: `node scripts/generate-messy-packet.mjs`.

**Limits:** Text PDFs only — scanned/image faxes need OCR (not implemented). Demo templates on intake still use the mock parser (`dischargeParser.ts`) when no file is uploaded.

### Ask — LLM with RAG (needs `OPENAI_API_KEY`)

`/ask` queries all ingested records using OpenAI + RAG context (`src/services/llmAgent.ts`, `src/services/ragContext.ts`).

```bash
cp .env.example .env.local
# OPENAI_API_KEY=sk-...
npm run dev
```

Without a key, Ask falls back to keyword matching (badge shows **Fallback** vs **LLM**). Parser does not use the LLM — only chat does.

### Tests

- `tests/test-discharge-etl.mjs` — ETL against messy Branson sample PDF
- Existing mock-parser and chat fallback tests unchanged

---

## Story 2 — Initial Mediquery release

**Status:** Done

Five demo patients, mock ingest templates, organized record UI, Ask with LLM/fallback, localStorage persistence.

---

## Story 1 — Concept

**Status:** Done

SNF discharge packet → organized clinical sections → natural-language query with source citations. Prototype only; no real PHI.
