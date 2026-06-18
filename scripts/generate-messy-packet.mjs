/**
 * Generates a fictional, intentionally messy hospital discharge packet PDF
 * for manual inspection and upload testing. No real PHI.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'samples');
const OUT_FILE = join(OUT_DIR, 'Branson_Harold_Discharge_2026-06-17_MESSY.pdf');

const MARGIN = 48;
const LINE = 13;
const PAGE_W = 612;
const PAGE_H = 792;

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(page, font, lines, x, y, size = 10, color = rgb(0, 0, 0)) {
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= size + 3;
  }
  return cy;
}

function drawBox(page, x, y, w, h, label, font) {
  page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: rgb(0.3, 0.3, 0.3), borderWidth: 0.5 });
  if (label) {
    page.drawText(label, { x: x + 4, y: y - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  }
}

const PAGES = [
  {
    title: 'FAX COVER',
    lines: [
      '*** FACSIMILE TRANSMISSION ***',
      'ST. MERCY GENERAL HOSPITAL — DISCHARGE SERVICES',
      'Date: 06/17/2026  Time: 14:42  Pages: 18 (?)',
      '',
      'TO:     Sunrise Skilled Nursing & Rehab',
      'FAX:    555-0199  (if no answer try 555-0198)',
      'FROM:   Case Mgmt / Discharge Planning',
      'RE:     BRANSON, HAROLD — SNF transfer packet',
      '',
      'CONFIDENTIAL PATIENT INFORMATION — HIPAA',
      'If received in error destroy immediately.',
      '',
      'Notes: rush admit — bed hold until 6pm',
      '       wound stuff maybe on separate fax???',
      '       call Dr. Kowalski if questions',
      '',
      '--- routing slip stapled below ---',
      'Pt: Harold Branson  MRN 0048721  Room 8W-214',
    ],
  },
  {
    title: 'FACE SHEET',
    lines: [
      'PATIENT FACE SHEET — ADMISSION / DISCHARGE',
      'Facility: St. Mercy General Hospital',
      '',
      'Patient Name:     HAROLD J. BRANSON',
      'Also seen as:     Harold Branson / H. Branson',
      'MRN:              0048721        Alt ID: SNF-11442',
      'DOB:              03/14/42       (system: 1942-03-14)',
      'Sex:              M',
      'Address:          1420 Oakridge Ln, Apt 3B, Springfield IL 62704',
      'Phone:            (217) 555-0142  cell: 217-555-0142',
      '',
      'Admit:            06/03/2026  ED via EMS',
      'Discharge:        06/17/2026  13:15',
      'Disposition:      Skilled Nursing Facility — Sunrise SNF',
      'Attending:        Dr. Sarah Kowalski, MD (cards)',
      'PCP:              Adams, Robert — f/u 7d',
      '',
      'Primary Dx (face sheet): CHF exacerbation',
      'Secondary: DM2, HTN, sacral wound, A-fib',
      '',
      'Insurance: Medicare Part A  ID: 1EG4-TE5-MK72',
      'Secondary: Humana supplemental — card not copied',
      'Prior Auth SNF:   PENDING — see p.4 (number missing)',
      'SNF benefit days: "check with billing"',
    ],
  },
  {
    title: 'DISCHARGE SUMMARY p.1',
    lines: [
      'HOSPITAL DISCHARGE SUMMARY',
      'Patient: Branson, Harold J.   MRN#48721   DOB 3/14/42',
      'Admit Date: 06/03/2026   Discharge: 06/17/2026',
      '',
      'PRINCIPAL DIAGNOSIS:',
      '  Acute on chronic systolic heart failure (I50.23)',
      '',
      'SECONDARY DIAGNOSES:',
      '  1. Type 2 diabetes mellitus w/ hyperglycemia (E11.65)',
      '  2. Atrial fibrillation, chronic (I48.91)',
      '  3. Stage II pressure injury sacral region (L89.152)',
      '  4. Hypertension (I10)',
      '  5. CKD stage 3a (N18.31) — Cr trending 1.3-1.5',
      '',
      'HOSPITAL COURSE (abbrev):',
      '  83yo M admitted w/ dyspnea, volume overload. Diuresed w/ IV lasix.',
      '  Echo EF 35%. A-fib rate controlled. Sacral pressure injury noted on',
      '  admission skin assessment — stage II per wound nurse 6/5. BG poorly',
      '  controlled — metformin continued, sliding scale insulin inpatient only.',
      '  Cleared for SNF when medically stable for continued skilled care.',
      '',
      'Dictated but not read — Kowalski / transcription error possible',
    ],
  },
  {
    title: 'DISCHARGE SUMMARY p.2',
    lines: [
      'DISCHARGE SUMMARY — continued',
      '',
      'PROCEDURES: none this admission',
      '',
      'DISCHARGE CONDITION: stable, ambulatory w/ walker, O2 prn',
      'DISCHARGE DISPOSITION: SNF — Sunrise Skilled Nursing',
      '',
      'ACTIVITY: ambulate w/ assist. Fall precautions.',
      'CODE STATUS: FULL (verified w/ patient 6/16)',
      '',
      'PATIENT INSTRUCTIONS (free text — messy):',
      '  - take meds as prescribed',
      '  - low salt diet',
      '  - daily weights — report >3lb gain',
      '  - wound: see nursing orders (dressing BID per wound team?)',
      '  - f/u cardiology — appointment slip attached somewhere',
      '',
      'Labs at discharge: see lab section — INR 2.4 on 6/16',
      '',
      'Electronically signed: Dr. S. Kowalski  06/17/2026 11:02',
      'Cosigned: _________ (blank)',
    ],
  },
  {
    title: 'MED REC p.1',
    lines: [
      'MEDICATION RECONCILIATION AT DISCHARGE',
      'Pt Name: HAROLD BRANSON   MRN 0048721',
      'Printed: 06/17/2026 12:48   Pharmacy verified: Y (partial)',
      '',
      'ACTIVE MEDICATIONS — take home list:',
      '',
      'Drug              Dose        Route  Freq       Start    Notes',
      '----------------------------------------------------------------',
      'Furosemide        40 mg       PO     daily      6/17     increased from 20',
      'Metformin         500 mg      PO     BID        cont     hold if NPO',
      'Metoprolol succ   50 mg       PO     daily      cont',
      'Warfarin          5 mg        PO     daily      6/10     INR goal 2-3',
      'Lisinopril        10 mg       PO     daily      cont',
      'Aspirin           81 mg       PO     daily      cont     w/ warfarin??',
      'Amoxicillin       500 mg      PO     TID        6/15     x 5d total',
      'Acetaminophen     650 mg      PO     q6h PRN    cont     pain',
      'Docusate          100 mg      PO     BID        cont',
      '',
      'STOPPED: insulin sliding scale (inpatient only)',
      'STOPPED: IV lasix',
      '',
      '*** DUPLICATE ENTRY BELOW — reconcile manually ***',
      'Warfarin 4 mg daily (older list from 6/12 — ignore?)',
    ],
  },
  {
    title: 'MED REC p.2',
    lines: [
      'HOME MED COMPARISON — nursing worksheet',
      '',
      'Patient states he takes: "the water pill, sugar pill, heart pills"',
      'Could not produce pill bottles. Daughter (Susan) called — says',
      'warfarin dose changed last month but unsure of mg.',
      '',
      'Pharmacy note: Amoxicillin for ?UTI? culture neg — Dr ordered anyway',
      '',
      'Allergies per this worksheet: PCN — rash',
      'NKDA documented on 6/4 admission — CONFLICT',
      '',
      'High alert meds: warfarin, metoprolol — counsel given (documented)',
      '',
      'Signature: RN Patel 6/17  signature illegible',
      '',
      'Handwritten margin: "check allergy before amox — penicillin??"',
    ],
  },
  {
    title: 'NURSING TRANSFER',
    lines: [
      'NURSING TRANSFER / INTERFACILITY SUMMARY',
      'Sunrise SNF bound — transport arranged 14:30',
      '',
      'Functional status: needs assist 2 person transfers, walker',
      'Continence: occasional urinary incontinence — briefs',
      'Skin: STAGE II SACRAL PRESSURE INJURY — 3.2 x 2.1 cm',
      '       see wound care orders (NOT IN THIS PACKET — fax separately?)',
      '',
      'IV access: none',
      'O2: room air, desats to 89% w/ exertion — O2 2L prn',
      '',
      'Meds at transfer (abbrev list — may not match pharmacy list):',
      '  lasix 40, metformin 500 bid, lisinopril 10, warfarin 5mg,',
      '  ASA 81, tylenol prn, amoxicillin 500 tid',
      '',
      'Therapy: PT eval at SNF — hospital PT notes "continue skilled PT"',
      '         frequency/duration NOT specified on order set',
      '',
      'Diet: diabetic 1800 kcal, fluid restrict 1500mL — per dietitian',
      '',
      'Contact: daughter Susan Branson 217-555-0199',
    ],
  },
  {
    title: 'ALLERGY LIST',
    lines: [
      'ALLERGY & ADVERSE DRUG REACTION LIST',
      'Source: admission nursing + pharmacy + patient statement',
      '',
      'SUBSTANCE          REACTION           SEVERITY    VERIFIED',
      '-------------------------------------------------------------',
      'Penicillin         Rash (childhood)   Moderate    Yes 6/3',
      'Sulfa drugs        "felt sick once"   Unknown     No — nursing sheet only',
      'Codeine            Nausea             Mild        Patient report',
      '',
      'NKDA also documented on discharge summary header — ERROR',
      '',
      'Pharmacist alert 6/15: ACTIVE ORDER Amoxicillin — penicillin class',
      'Acknowledged by: ___________ (unsigned)',
      '',
      'No food allergies documented.',
      '',
      'Page footer: If no allergies listed verify with patient — NOT NKDA',
    ],
  },
  {
    title: 'LABS p.1',
    lines: [
      'LABORATORY RESULTS — last 72 hours',
      'Branson, Harold   MRN 0048721',
      '',
      'Collection 06/16/2026 06:00 (discharge panel)',
      '',
      'CBC:',
      '  WBC     7.8 K/uL        (4.5-11.0)',
      '  Hgb     11.2 g/dL       (13.5-17.5)  L',
      '  Hct     34.1 %          L',
      '  Plt     198 K/uL',
      '',
      'BMP:',
      '  Na      138 mEq/L',
      '  K       4.2 mEq/L',
      '  Cl      101 mEq/L',
      '  CO2     24 mEq/L',
      '  BUN     28 mg/dL        H',
      '  Creat   1.4 mg/dL       H',
      '  Glucose 198 mg/dL       H  (non-fasting)',
      '',
      'eGFR    48 mL/min/1.73   (CKD3)',
      'HbA1c   8.1 %             H  (drawn 6/10)',
    ],
  },
  {
    title: 'LABS p.2',
    lines: [
      'LABORATORY — continued / scattered results',
      '',
      'INR     2.4   (06/16)   goal 2.0-3.0',
      'INR     2.1   (06/13)   — duplicate line on fax',
      '',
      'UA 6/14: neg nitrite, trace leuk — culture no growth',
      '',
      'OCR artifact: Creatinine 1.4 vs 1.S on re-fax (typo)',
      '',
      'Micro: none pertinent',
      '',
      '--- end lab report ---',
      'Some values from Epic, some from legacy print — dates may vary',
    ],
  },
  {
    title: 'WOUND — MISSING',
    lines: [
      'WOUND CARE ORDERS',
      '',
      '(blank form — orders not populated)',
      '',
      'Wound type: _______________',
      'Location: _______________',
      'Dressing: _______________',
      'Frequency: _______________',
      '',
      'Stamp: SEE NURSING NOTES',
      '',
      '>>> THIS PAGE INTENTIONALLY INCOMPLETE <<<',
      'Wound nurse documentation references formal orders on separate',
      'order set — not included in discharge packet batch 44821.',
      '',
      'Nursing note excerpt (6/5): Stage II sacral. Cleanse NS,',
      'hydrocolloid BID, reposition q2h. — but no signed physician order',
    ],
  },
  {
    title: 'THERAPY',
    lines: [
      'PHYSICAL / OCCUPATIONAL THERAPY ORDERS',
      '',
      'Order set printed: 06/17/2026',
      '',
      'PT:   Evaluate and treat',
      '      [ ] 3x/week  [ ] 5x/week  [ ] daily  — boxes not checked',
      '      Duration: ______ weeks',
      '',
      'OT:   Evaluate and treat — frequency: ___________',
      '',
      'ST:   not ordered',
      '',
      'Handwritten addendum (scan quality poor):',
      '  "continue PT at SNF per discussion w/ CM" — no signature',
      '',
      'Hospital PT note 6/16: ambulated 150 ft w/ walker, supervision.',
      'Recommend skilled PT for strength, gait, transfers.',
      '',
      '*** ORDER SET INCOMPLETE — REQUEST FROM HOSPITAL ***',
    ],
  },
  {
    title: 'DIET',
    lines: [
      'DIET / NUTRITION ORDERS',
      '',
      'Diet order: Diabetic diet, 1800 kcal/day',
      'Texture: Regular',
      'Fluid restriction: 1500 mL/day',
      'Sodium: 2 gram',
      '',
      'Supplements: none at discharge',
      '',
      'Dietitian note: patient non-compliant w/ diet teaching.',
      'Prefers sweet tea — counsel re fluids & sugar.',
      '',
      'Conflicting note on nursing sheet: "regular diet OK" — outdated',
      '',
      'Signed: Dietitian M. Chen  06/12/2026',
    ],
  },
  {
    title: 'FOLLOW-UP',
    lines: [
      'FOLLOW-UP APPOINTMENTS & REFERRALS',
      '',
      'PCP: Dr. Robert Adams',
      '      When: 7 days post discharge (approx 06/24/2026)',
      '      Phone: 217-555-0300 — patient to call for appt',
      '      (appointment NOT scheduled — slip missing)',
      '',
      'Cardiology: St. Mercy Heart Group',
      '      Dr. Kowalski follow-up 2-3 weeks — referral placed',
      '      No date/time on packet',
      '',
      'Wound clinic: PRN if no improvement in 5 days',
      '',
      'Other: ophthalmology yearly — not urgent',
      '',
      'Scribbled note: "daughter wants telehealth if possible"',
    ],
  },
  {
    title: 'INSURANCE',
    lines: [
      'INSURANCE / AUTHORIZATION FACE SHEET',
      '',
      'Primary:   Medicare Part A',
      'Secondary: Humana Gold Plus — policy # HGP-8844221',
      '',
      'SNF Authorization:',
      '  Status:    APPROVED pending final review',
      '  Auth #:    _______________  (NOT ON PACKET)',
      '  Days auth: 20 skilled days requested',
      '  Valid:     06/17/2026 — ???',
      '',
      'Billing comment: "auth number usually on separate fax from UM',
      '                  call 555-0177 ext 442 — ref case 2026-44821"',
      '',
      'Medicare SNF days remaining: 18 (per face sheet) vs 22 (per CM)',
      '',
      'Prior hospitalization within 30d: yes — affects benefit period',
    ],
  },
  {
    title: 'DUPLICATE / OCR',
    lines: [
      '--- DUPLICATE PAGE / POOR OCR SCAN ---',
      '',
      'BRAN5ON HAR0LD  MRN O048721',
      'Discharge meds: furosemide 40mg, metf0rmin 500 bid...',
      '',
      'Line noise: |||| ~~~~ @@@ ###',
      'Upside down footer: PAGE 003 of ???',
      '',
      'Partial legibility — likely re-scan of page 5',
      '',
      'If this page duplicates another, discard duplicate.',
    ],
  },
  {
    title: 'SIGNATURE',
    lines: [
      'ATTESTATION / SIGNATURE PAGE',
      '',
      'I have received discharge instructions and medication list.',
      '',
      'Patient signature: H. Branson (electronic capture)',
      'Date: 06/17/2026',
      '',
      'Witness: RN Patel',
      '',
      'Attending attestation:',
      'Patient discharged to SNF in stable condition.',
      'Dr. Sarah Kowalski, MD  06/17/2026 11:02',
      '',
      'END OF PACKET — 18 pages',
      'Questions: St. Mercy Discharge Planning 555-0177',
    ],
  },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const pdf = await PDFDocument.create();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  for (let i = 0; i < PAGES.length; i++) {
    const pageDef = PAGES[i];
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // Fax header stripe on some pages
    if (i === 0 || i === 15) {
      page.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: rgb(0.85, 0.85, 0.85) });
      page.drawText('FACSIMILE — ST. MERCY GENERAL — NOT FOR MEDICAL ADVICE', {
        x: MARGIN,
        y: PAGE_H - 20,
        size: 8,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Page number — inconsistent format
    const pageNum = i + 1;
    const pageLabel =
      pageNum === 16 ? 'PAGE 003 of ???' : `Page ${pageNum} of 18`;
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN - 80,
      y: 28,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(pageDef.title, {
      x: MARGIN,
      y: PAGE_H - MARGIN - 10,
      size: 12,
      font: helveticaBold,
    });

    drawBox(page, MARGIN, PAGE_H - MARGIN - 28, PAGE_W - 2 * MARGIN, 20, null, helvetica);

    const bodyLines = pageDef.lines.flatMap((line) =>
      line === '' ? [''] : wrapText(line, 72)
    );

    const useCourier = pageDef.title.includes('MED REC') || pageDef.title.includes('LAB');
    const bodyFont = useCourier ? courier : helvetica;
    let y = PAGE_H - MARGIN - 50;

    for (const line of bodyLines) {
      if (y < 50) break;
      const isAlert =
        line.includes('CONFLICT') ||
        line.includes('NOT') ||
        line.includes('PENDING') ||
        line.includes('MISSING') ||
        line.includes('INCOMPLETE') ||
        line.includes('unsigned') ||
        line.includes('blank');
      page.drawText(line, {
        x: MARGIN,
        y,
        size: useCourier ? 9 : 10,
        font: line.startsWith('***') ? helveticaBold : bodyFont,
        color: isAlert ? rgb(0.7, 0.1, 0.1) : rgb(0, 0, 0),
      });
      y -= LINE;
    }

    // Simulated coffee stain on wound page
    if (pageDef.title.includes('WOUND')) {
      page.drawCircle({
        x: PAGE_W - 120,
        y: 200,
        size: 45,
        color: rgb(0.75, 0.65, 0.45),
        opacity: 0.25,
      });
    }
  }

  const bytes = await pdf.save();
  writeFileSync(OUT_FILE, bytes);

  console.log(`Created: ${OUT_FILE}`);
  console.log(`Pages: ${PAGES.length}`);
  console.log('Patient: Harold J. Branson (fictional — no real PHI)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
