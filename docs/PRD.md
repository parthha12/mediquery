# MediQuery — Product Requirements

**Version:** 1.0
**Stage:** MVP → Pilot
**Wedge:** Patient-anchored medication reconciliation across care transitions

This PRD is the product basis for the repo. Items marked **proposed** are implementation choices, not locked deck requirements.

The system must not make clinical decisions. It organizes evidence, flags discrepancies, and surfaces questions for human review.

---

## North star

> MediQuery turns fragmented patient records into a source-traced medication history that a care team can reconcile quickly and confidently.

Long-term model:

**Patient/family authorization → record agent → longitudinal medication history → evidence-backed reconciliation → care-team action.**

Do not build the interoperability platform first. The first MVP can run on uploaded documents.

---

## Current prototype vs this PRD

| PRD need | Repo today |
|---|---|
| Upload messy discharge PDFs | `/intake` + deterministic ETL (`dischargeEtl.ts`) |
| Organized record + review flags | `/dashboard`, `/patients/[id]` |
| Source-cited Q&A | `/ask` (LLM or keyword fallback) |
| Multi-source compare (hospital + SNF + pharmacy) | Not built — one packet per case |
| Normalized `MedicationEvent` + timeline | Not built |
| Conflict review + human resolution states | Flags only, no resolution workflow |
| Family consent / agency roles / audit log | Not built |
| OCR for scanned faxes | Not built |

Keep shipping the existing single-packet prototype. Next product work should close the medication-reconciliation gap, not add more clinical section types.

---

## Problem

Medication records fall apart across **hospital → SNF → home health → ER**.

Representative story (**Margaret, 82**):

- Hospital: blood thinner started, BP med stopped, diabetes med adjusted
- SNF: 40+ page packet is retyped; the reason the BP med stopped disappears
- Home health: nurse compares pill bottles, a faxed referral, a pharmacy list, and family memory
- Readmission risk: a duplicate BP dose can be missed

Three causes:

1. **Fragmented inputs** — discharge summaries, SNF notes, pharmacy fills, faxes, paper lists
2. **No persistent owner** — each facility keeps its own view
3. **Manual reconciliation** — intake reconstructs the truth by reading, calling, and asking family

Home-health intake is the first wedge: that is where fragmented records become an operational burden *before the first visit*.

---

## Users

| Role | Job |
|---|---|
| **Primary — intake nurse/coordinator** | What is this patient actually supposed to be taking? |
| Field nurse | Clear list + unresolved questions at the visit |
| Family/caregiver | Consent + visibility into the longitudinal record |
| **Buyer — home-health / home-care agency** | Less intake labor, fewer calls/faxes, quality-metric protection |

**Proposed MVP roles:** admin, intake coordinator, nurse, family/patient.

---

## Business model

B2B healthcare SaaS with a **free family record agent** as distribution.

1. **Families — free.** Persistent record that follows the patient. Trust and consent.
2. **Agencies — ~$300–600/month** (discovery signal ~$500–700 WTP). Paid OS for intake.
3. **GUIDE / MA / care-management — enterprise.** Coordination, caregiver workflows, readmission-linked quality.

Obtainable start: SMB Medicare-certified home-health agencies (~11.5K+ nationally), then care-management platforms and risk-bearing plans.

Narrow economic claim to prove first:

> An agency will pay recurring money because medication reconciliation at intake is materially faster and safer.

---

## MVP objective

Given several messy, contradictory documents, produce a **reliable, source-traced medication reconciliation** that saves a care worker meaningful time.

### Core flow (agency)

1. **Create case** — name, DOB, case ID, admit date, source facility, destination agency (**proposed** fields)
2. **Add records** — PDFs / scans / images: discharge, SNF med list, pharmacy list, referral, paper uploads
3. **Ingest** — `upload → parse/OCR → classify → segment → extract → normalize → persist`
4. **Reconcile** — current list + timeline + discrepancies + evidence + questions
5. **Human resolve** — confirmed active / stopped / needs provider / unable to determine
6. **Summary** — shareable intake list with last-verified status and outstanding conflicts

Every fact must answer: **where did this come from?**

---

## Medication event (proposed)

```text
patient_id
medication_name_raw
medication_name_normalized
dose / unit / route / frequency
action          START | STOP | CONTINUE | CHANGE | UNKNOWN
event_date
reason
prescriber
source_document / source_page / source_text
extraction_confidence
```

Never drop the raw source wording. `Prinivil` and `Lisinopril 10mg tablet` may be the same entity.

### Discrepancy classes (proposed)

- Status conflict (hospital STOP vs SNF ACTIVE)
- Dose / frequency conflict
- Missing downstream
- Duplicate therapy
- Unclear transition (vanishes with no stop/change)

### Evidence-first output

Do not say “Lisinopril should be stopped.” Say:

```text
Possible discrepancy
Hospital discharge: Lisinopril 10 mg — STOP (p.14)
SNF med list:       Lisinopril 10 mg — ACTIVE (p.3)
```

Keep three layers separate: **extracted fact**, **system inference**, **human resolution**.

---

## Evaluation

Gold-label representative transition packets (medications, dose, frequency, status, changes, conflicts, evidence). Optimize for traceable facts, not plausible prose.

| Layer | Metrics |
|---|---|
| Extraction | medication recall/precision; dose, frequency, status accuracy; evidence attribution |
| Reconciliation | conflict recall; false-conflict rate; change-detection accuracy |
| Operational | **median reconciliation time** (hypothesis only: 45 min → ~12 min — do not claim until measured); minutes saved / admission; % cases needing provider calls; conflicts / patient; time to start of care; user correction rate |

### Pilot bar

3–5 agencies, ~50–100 authorized cases, then convert at least some to paid. Stronger evidence than discovery-call WTP.

---

## What not to build in V1

EHR/HIE integrations, autonomous clinical advice, claims, scheduling, native mobile, custom models, every clinical data type, heavy analytics.

Get PDFs in. Get **medication truth + conflicts + evidence** out. Get nurses using it.

OCR, auth, audit, and family invite can wait until the single-packet recon demo is sharp — then the 4–8 week pilotable slice.

---

## Target investor demo

Not “our AI healthcare platform.” Give them Margaret.

1. Margaret leaves the hospital.
2. Upload hospital discharge + SNF med list + pharmacy list + home-health referral.
3. Dashboard: **12 medications · 3 changes · 2 conflicts**.
4. Open Lisinopril — hospital STOP (hypotension) vs SNF ACTIVE 10 mg daily. Click each source span.
5. Nurse marks **needs provider clarification**.
6. Generate the reconciled intake summary.

### Milestones

| Horizon | Bar |
|---|---|
| ~2 weeks | Fundraise/demo MVP on uploads |
| ~4–8 weeks | Auth, audit, review workflow, evals, enough reliability for a real workflow |
| ~3–6+ months | Patient-authorized record pull, compliance, production reliability |

---

## Roadmap (proposed)

1. Medication reconciliation
2. Fuller transition record (diagnoses, procedures, labs, allergies, plans, appointments, providers)
3. Care coordination (tasks, referrals, family loop)
4. Longitudinal patient agent — the persistent layer between institutions

---

## Proposed architecture

Deterministic records own patient state. The LLM turns unstructured evidence into structured candidates.

```text
Web app → API → PostgreSQL + object storage + job queue
                 → document processor → extraction → reconciliation → evidence graph
```

**Proposed entities:** Organization, User, Patient, Authorization, Encounter, Document, DocumentPage, EvidenceSpan, Medication, MedicationEvent, MedicationConflict, Reconciliation, HumanResolution, AuditEvent.
