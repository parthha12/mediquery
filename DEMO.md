# Mediquery — Demo Guide

**Reset data:** clear `jot-snf-workspaces` from browser localStorage and refresh.

## Prepopulated patients

| Patient | MRN | Scenario |
|---------|-----|----------|
| Eleanor Whitfield | SNF-10482 | Complete packet |
| Robert Martinez | SNF-10891 | Missing wound care |
| Dorothy Nguyen | SNF-11003 | Med/allergy conflict |
| James Cooper | SNF-11204 | Missing therapy orders |
| Linda Park | SNF-11317 | Incomplete insurance auth |

---

## 1. Records (2 min)

**Route:** `/dashboard`

1. Open **Records** — 5 ingested patients, 4 flagged.
2. Click **Eleanor Whitfield** — browse section cards.
3. Open **Medications**, **Wound Care**, etc.

---

## 2. Intake (3 min)

**Route:** `/intake`

1. Select **Missing therapy orders**.
2. Click **Ingest**.
3. Land on organized record — open **Therapy** (Missing).

---

## 3. Ask (3 min)

**Route:** `/ask`

1. Ask: *"Who needs review?"*
2. Ask: *"Are there any allergy conflicts?"*
3. Check source citations on answers.

---

## Tests

```bash
npm test
npm run verify
```

With dev server running:

```bash
npm run verify:live
```
