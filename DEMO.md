# MediQuery — Demo Guide

**Reset data:** Board → **Reset demo**, or clear `mediquery-workspaces-v2` from localStorage.

Product north star and the Margaret investor script live in **[docs/PRD.md](./docs/PRD.md)**. This file is what you can click through **today**, plus the target demo we still need to build.

## Prepopulated patients

| Patient | MRN | Scenario |
|---------|-----|----------|
| Eleanor Whitfield | SNF-10482 | Complete packet |
| Robert Martinez | SNF-10891 | Missing wound care |
| Dorothy Nguyen | SNF-11003 | Med/allergy conflict |
| James Cooper | SNF-11204 | Missing therapy orders |
| Linda Park | SNF-11317 | Incomplete insurance auth |

---

## 0. Margaret (the new product)

**Route:** `/` then **Open Margaret's case**

1. Home tells the hospital → SNF → home story.
2. Case opens on **Reconcile**: 12 meds · 3 changes · 2 conflicts.
3. Click **Lisinopril** — hospital STOP (hypotension) vs SNF ACTIVE.
4. Mark **Needs provider**.
5. Open **Timeline** and **Full record** (the original section packets).

## 1. Board (2 min)

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

Or upload `samples/Branson_Harold_Discharge_2026-06-17_MESSY.pdf` → **Extract & Ingest**.

---

## 3. Ask (3 min)

**Route:** `/ask`

1. Ask: *"Who needs review?"*
2. Ask: *"Are there any allergy conflicts?"*
3. Ask: *"Which medications conflict?"*
4. Check source citations on answers.

---

## Target investor demo (not built yet)

The fundraise demo should not be “our AI healthcare platform.” It should be Margaret.

1. Margaret leaves the hospital (82, hospital → SNF → home health).
2. Upload hospital discharge + SNF med list + pharmacy list + home-health referral.
3. Dashboard: **12 medications · 3 changes · 2 conflicts**.
4. Open Lisinopril — hospital **STOP (hypotension)** vs SNF **ACTIVE 10 mg daily**. Click each source span.
5. Nurse marks **needs provider clarification**.
6. Generate the reconciled intake summary.

That flow is the PRD bar. Today we can only show a **single** packet and Ask citations (Dorothy Nguyen is the closest med-conflict stand-in).

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
