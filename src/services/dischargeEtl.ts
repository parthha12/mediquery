import type {
  DischargePacket,
  DocumentSection,
  Patient,
  PatientWorkspace,
  ReviewStatus,
  SourceDocument,
} from '@/types';
import { buildPatientWorkspace } from './dischargeParser';
import type { PageText } from './pdfText';

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const PENICILLIN_CLASS = /\b(amoxicillin|ampicillin|piperacillin|nafcillin|oxacillin|penicillin\s+g)/i;

const DOC_DETECTORS: { pattern: RegExp; title: string }[] = [
  { pattern: /FACE SHEET/i, title: 'Patient Face Sheet' },
  { pattern: /DISCHARGE SUMMARY/i, title: 'Hospital Discharge Summary' },
  { pattern: /MEDICATION RECONCILIATION|MED REC/i, title: 'Medication Reconciliation' },
  { pattern: /NURSING TRANSFER|INTERFACILITY/i, title: 'Nursing Transfer Summary' },
  { pattern: /ALLERGY/i, title: 'Allergy & Intolerance List' },
  { pattern: /LABORATORY|LAB RESULTS/i, title: 'Lab Results (Recent)' },
  { pattern: /WOUND CARE/i, title: 'Wound Care Orders' },
  { pattern: /PHYSICAL.*OCCUPATIONAL|THERAPY ORDERS/i, title: 'Therapy Orders' },
  { pattern: /DIET|NUTRITION/i, title: 'Diet & Nutrition' },
  { pattern: /FOLLOW-UP|FOLLOW UP/i, title: 'Follow-up Appointments' },
  { pattern: /INSURANCE|AUTHORIZATION/i, title: 'Insurance / Authorization' },
  { pattern: /FACSIMILE|FAX COVER/i, title: 'Fax Cover Sheet' },
];

function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return undefined;
  let year = parseInt(m[3], 10);
  if (year < 100) year += year > 30 ? 1900 : 2000;
  return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function normalizeName(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map((s) => s.trim());
    return `${capitalizeWords(first)} ${capitalizeWords(last)}`;
  }
  return capitalizeWords(trimmed);
}

function capitalizeWords(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function detectPageDocTitle(text: string): string {
  for (const { pattern, title } of DOC_DETECTORS) {
    if (pattern.test(text)) return title;
  }
  return 'Discharge Packet Page';
}

function extractDemographics(pages: PageText[]): Omit<Patient, 'id'> {
  const faceText = pages.find((p) => /FACE SHEET/i.test(p.text))?.text ?? '';
  const fullText = pages.map((p) => p.text).join(' ');

  const nameRaw =
    faceText.match(/Patient Name:\s*([A-Z][A-Z\s.]+?)(?:\s+Also|\s+MRN|$)/)?.[1] ??
    fullText.match(/Patient:\s*([A-Za-z]+,\s*[A-Za-z]+(?:\s+[A-Z]\.?)?)/)?.[1] ??
    fullText.match(/Pt:\s*([A-Za-z]+\s+[A-Za-z]+)/)?.[1] ??
    'Unknown Patient';

  const mrnDigits =
    faceText.match(/MRN:\s*(\d{5,})/)?.[1] ??
    fullText.match(/MRN[#:\s]*(\d{5,})/i)?.[1] ??
    fullText.match(/SNF-(\d+)/i)?.[1];
  const mrn = mrnDigits ? `SNF-${mrnDigits.replace(/^SNF-/i, '')}` : `SNF-${String(Date.now()).slice(-5)}`;

  const dobRaw =
    faceText.match(/DOB:\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/)?.[1] ??
    fullText.match(/DOB\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1];
  const dob = normalizeDate(dobRaw) ?? '1900-01-01';

  const hospitalAdmit = faceText.match(/Admit:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/)?.[1];
  const discharge =
    faceText.match(/Discharge:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/)?.[1] ??
    fullText.match(/Discharge:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1];
  const admitDate = normalizeDate(discharge) ?? normalizeDate(hospitalAdmit) ?? new Date().toISOString().slice(0, 10);

  const attending =
    faceText.match(/Attending:\s*(Dr\.\s*[A-Za-z]+(?:\s+[A-Za-z]+)?[^,]*)/)?.[1]?.trim() ??
    fullText.match(/Dr\.\s+[A-Za-z]+\s+[A-Za-z]+(?:,\s*MD)?/i)?.[0];

  const room =
    faceText.match(/Room\s+([\d\w-]+)/i)?.[1] ??
    fullText.match(/\b(\d{1,2}[A-Z]?-\d{3}[A-Z]?)\b/)?.[1];

  return {
    name: normalizeName(nameRaw),
    mrn,
    dob,
    admitDate,
    roomNumber: room,
    attendingPhysician: attending,
  };
}

function buildSourceDocuments(
  patientId: string,
  packetId: string,
  pages: PageText[]
): SourceDocument[] {
  const groups: { title: string; pages: PageText[] }[] = [];

  for (const page of pages) {
    const title = detectPageDocTitle(page.text);
    const last = groups[groups.length - 1];
    if (last && last.title === title) {
      last.pages.push(page);
    } else {
      groups.push({ title, pages: [page] });
    }
  }

  return groups.map((group) => ({
    id: uid('doc'),
    patientId,
    packetId,
    title: group.title,
    pageStart: group.pages[0].pageNumber,
    pageEnd: group.pages[group.pages.length - 1].pageNumber,
    rawText: group.pages.map((p) => p.text).join('\n\n'),
  }));
}

function pagesMatching(pages: PageText[], pattern: RegExp): PageText[] {
  return pages.filter((p) => pattern.test(p.text));
}

function pageRefFor(pages: PageText[]): string {
  if (!pages.length) return '—';
  const start = pages[0].pageNumber;
  const end = pages[pages.length - 1].pageNumber;
  return start === end ? `p. ${start}` : `pp. ${start}–${end}`;
}

function extractDiagnoses(text: string): string[] {
  const results: string[] = [];
  const re = /(?:\d+\.\s+)?([A-Za-z][^(]{4,70}?)\s*\(([A-Z]\d{2}(?:\.\d+)?[A-Z]?)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const line = `${results.length + 1}. ${m[1].trim()} (${m[2]})`;
    if (!results.includes(line)) results.push(line);
  }
  if (results.length === 0 && /PRINCIPAL DIAGNOSIS/i.test(text)) {
    const principal = text.match(/PRINCIPAL DIAGNOSIS:\s*([^(]+(?:\([^)]+\))?)/i)?.[1];
    if (principal) results.push(`1. ${principal.trim()}`);
  }
  return results;
}

function extractMedicationLines(texts: string[]): string[] {
  const meds = new Set<string>();
  const combined = texts.join(' ');
  const re =
    /([A-Z][a-z]+(?:\s+[a-z]+)?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g)(?:\s+(?:PO|IV|SQ|inhaled))?(?:\s+(?:daily|BID|TID|q\d+h|PRN)[^\d|]{0,35})?/gi;
  let m;
  while ((m = re.exec(combined)) !== null) {
    const label = `${m[1].trim()} ${m[2]} ${m[3]}${m[0].slice(m[0].indexOf(m[3]) + m[3].length).trim()}`.slice(0, 72);
    meds.add(`• ${label}`);
  }
  for (const line of combined.split(/\s{2,}|(?:\d{2,}\s)/)) {
    if (/\d+\s*mg/i.test(line) && line.length < 90 && /[a-z]/i.test(line)) {
      const cleaned = line.replace(/^[-•*,\s]+/, '').trim();
      if (cleaned.length > 8) meds.add(`• ${cleaned}`);
    }
  }
  return [...meds].slice(0, 20);
}

function extractAllergieLines(text: string): string[] {
  const lines: string[] = [];
  if (/penicillin|PCN/i.test(text)) {
    const detail = text.match(/penicillin[^|.]{0,50}/i)?.[0]?.trim();
    lines.push(`Penicillin — ${detail?.replace(/^penicillin\s*/i, '') || 'documented'}`);
  }
  if (/sulfa/i.test(text)) {
    lines.push('Sulfa — documented');
  }
  if (/codeine/i.test(text)) {
    lines.push('Codeine — documented');
  }
  if (/NKDA/i.test(text)) {
    lines.push('NKDA also documented — verify with formal allergy list');
  }
  return lines;
}

function extractLabLines(text: string): string[] {
  const patterns = [
    /WBC\s+[\d.]+/i,
    /Hgb\s+[\d.]+/i,
    /Hct\s+[\d.]+\s*%/i,
    /Creat(?:inine)?\s+[\d.]+/i,
    /eGFR\s+[\d.]+/i,
    /INR\s+[\d.]+/i,
    /HbA1c\s+[\d.]+\s*%/i,
    /Glucose\s+[\d.]+/i,
    /BUN\s+[\d.]+/i,
    /Plt\s+[\d.]+/i,
  ];
  const lines: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) lines.push(`• ${match[0].trim()}`);
  }
  return lines;
}

function woundStatus(text: string, nursingText: string): { content: string; status: ReviewStatus; flags?: string[] } {
  const blank =
    /blank form|not populated|INTENTIONALLY INCOMPLETE|orders not populated|\(blank/i.test(text);
  const hasOrders = /cleanse|dressing|hydrocolloid|reposition|BID/i.test(text) && !blank;
  const woundMentioned = /stage\s*(I{1,3}|\d+)\s*sacral|pressure injury|sacral pressure/i.test(
    nursingText + ' ' + text
  );

  if (blank && woundMentioned) {
    return {
      content:
        'Wound documented in nursing notes but formal wound care orders are blank or missing from packet.\n' +
        (nursingText.match(/skin:.{0,120}/i)?.[0] ?? 'See nursing transfer notes.'),
      status: 'needs_review',
      flags: ['Wound care section missing or incomplete — verify with sending facility'],
    };
  }
  if (blank) {
    return {
      content: 'No wound care instructions found in discharge packet.',
      status: 'missing',
      flags: ['Wound care section missing from packet'],
    };
  }
  if (hasOrders) {
    return {
      content: text.slice(0, 600),
      status: 'complete',
    };
  }
  return {
    content: text.slice(0, 400) || 'Wound care section present but unclear.',
    status: 'needs_review',
  };
}

function therapyStatus(text: string): { content: string; status: ReviewStatus; flags?: string[] } {
  const incomplete =
    /INCOMPLETE|not checked|NOT specified|frequency:\s*_{3,}|Duration:\s*_{3,}/i.test(text);
  const hasFreq = /PT\s+\d|OT\s+\d|\d+x\/week|Evaluate and treat/i.test(text) && !incomplete;

  if (incomplete) {
    return {
      content: text.slice(0, 500),
      status: 'missing',
      flags: ['Therapy orders incomplete — request frequency/duration from hospital'],
    };
  }
  if (hasFreq) {
    return { content: text.slice(0, 500), status: 'complete' };
  }
  return {
    content: text.slice(0, 400) || 'Therapy section found but orders unclear.',
    status: 'needs_review',
  };
}

function insuranceStatus(text: string): { content: string; status: ReviewStatus; flags?: string[] } {
  const missingAuth =
    /auth\s*#?\s*:?\s*(?:NOT|_{3,}|NOT ON PACKET|PENDING)/i.test(text) ||
    /Prior auth.*NOT FOUND/i.test(text);
  return {
    content: text.slice(0, 600),
    status: missingAuth ? 'needs_review' : 'complete',
    flags: missingAuth ? ['Prior authorization number missing or pending'] : undefined,
  };
}

function medAllergyFlags(medText: string, allergyText: string): string[] {
  const flags: string[] = [];
  if (/penicillin|PCN/i.test(allergyText) && PENICILLIN_CLASS.test(medText)) {
    flags.push('Penicillin allergy documented but penicillin-class antibiotic on med list');
  }
  if (/warfarin\s+5\s*mg/i.test(medText) && /warfarin\s+4\s*mg/i.test(medText)) {
    flags.push('Conflicting warfarin doses on medication lists — reconcile manually');
  }
  if (/NKDA/i.test(allergyText) && /penicillin|PCN/i.test(allergyText)) {
    flags.push('NKDA documented alongside specific allergies — verify allergy list');
  }
  return flags;
}

function buildOverview(patient: Patient, sections: DocumentSection[]): DocumentSection {
  const flags = sections.flatMap((s) => s.flags ?? []);
  const primaryDx = sections.find((s) => s.category === 'diagnoses');
  const medCount = (sections.find((s) => s.category === 'medications')?.content.match(/•/g) ?? []).length;

  return {
    id: uid('sec'),
    patientId: patient.id,
    category: 'overview',
    title: 'Patient Overview',
    content: [
      `Patient: ${patient.name}`,
      `MRN: ${patient.mrn}`,
      `DOB: ${patient.dob}`,
      `SNF admit date: ${patient.admitDate}`,
      patient.roomNumber ? `Room: ${patient.roomNumber}` : '',
      patient.attendingPhysician ? `Attending: ${patient.attendingPhysician}` : '',
      '',
      `Primary diagnoses: ${primaryDx?.content.split('\n')[0] ?? 'See Diagnoses section'}`,
      `Active medications: ${medCount}`,
      flags.length ? `\nFlags: ${flags.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    status: flags.length ? 'needs_review' : 'complete',
    sourceDocumentId: '',
    pageRef: 'Summary',
    flags: flags.length ? flags : undefined,
  };
}

export function etlDischargePacket(fileName: string, pages: PageText[]): PatientWorkspace {
  const patientId = uid('patient');
  const packetId = uid('packet');
  const patient: Patient = { id: patientId, ...extractDemographics(pages) };

  const packet: DischargePacket = {
    id: packetId,
    patientId,
    fileName,
    uploadedAt: new Date().toISOString(),
    pageCount: pages.length,
    status: 'complete',
  };

  const sourceDocuments = buildSourceDocuments(patientId, packetId, pages);
  const findDoc = (pattern: RegExp) => sourceDocuments.find((d) => pattern.test(d.title));

  const summaryPages = pagesMatching(pages, /DISCHARGE SUMMARY|FACE SHEET/i);
  const medPages = pagesMatching(pages, /MEDICATION|MED REC/i);
  const allergyPages = pagesMatching(pages, /ALLERGY/i);
  const labPages = pagesMatching(pages, /LABORATORY|LAB RESULTS/i);
  const woundPages = pagesMatching(pages, /WOUND CARE/i);
  const therapyPages = pagesMatching(pages, /THERAPY|PHYSICAL.*OCCUPATIONAL/i);
  const dietPages = pagesMatching(pages, /DIET|NUTRITION/i);
  const followPages = pagesMatching(pages, /FOLLOW-UP|FOLLOW UP/i);
  const insurancePages = pagesMatching(pages, /INSURANCE|AUTHORIZATION/i);
  const nursingPages = pagesMatching(pages, /NURSING TRANSFER|INTERFACILITY/i);

  const summaryText = summaryPages.map((p) => p.text).join(' ');
  const medTexts = medPages.map((p) => p.text);
  const medCombined = medTexts.join(' ');
  const allergyText = allergyPages.map((p) => p.text).join(' ');
  const nursingText = nursingPages.map((p) => p.text).join(' ');
  const woundText = woundPages.map((p) => p.text).join(' ');
  const labText = labPages.map((p) => p.text).join(' ');

  const diagnoses = extractDiagnoses(summaryText);
  const medLines = extractMedicationLines(medTexts);
  const allergyLines = extractAllergieLines(allergyText);
  const labLines = extractLabLines(labText);
  const medFlags = medAllergyFlags(medCombined, allergyText);
  const wound = woundStatus(woundText, nursingText);
  const therapy = therapyStatus(therapyPages.map((p) => p.text).join(' '));
  const insurance = insuranceStatus(insurancePages.map((p) => p.text).join(' '));

  const sections: DocumentSection[] = [
    {
      id: uid('sec'),
      patientId,
      category: 'diagnoses',
      title: 'Diagnoses',
      content: diagnoses.length ? diagnoses.join('\n') : summaryText.slice(0, 500) || 'No diagnoses extracted.',
      status: diagnoses.length ? 'complete' : 'needs_review',
      sourceDocumentId: findDoc(/Discharge Summary|Face Sheet/)?.id ?? '',
      pageRef: pageRefFor(summaryPages),
    },
    {
      id: uid('sec'),
      patientId,
      category: 'medications',
      title: 'Medications',
      content: medLines.length ? medLines.join('\n') : 'No medications extracted from packet.',
      status: medFlags.length ? 'human_review_required' : medLines.length ? 'complete' : 'needs_review',
      sourceDocumentId: findDoc(/Medication/)?.id ?? '',
      pageRef: pageRefFor(medPages),
      flags: medFlags.length ? medFlags : undefined,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'allergies',
      title: 'Allergies',
      content: allergyLines.length ? allergyLines.join('\n') : 'No allergies documented in packet.',
      status: medFlags.some((f) => f.includes('Penicillin')) ? 'needs_review' : allergyLines.length ? 'complete' : 'missing',
      sourceDocumentId: findDoc(/Allergy/)?.id ?? '',
      pageRef: pageRefFor(allergyPages),
      flags: medFlags.some((f) => f.includes('Penicillin')) ? ['Conflict between allergy list and active medication'] : undefined,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'labs',
      title: 'Labs',
      content: labLines.length ? labLines.join('\n') : labText.slice(0, 500) || 'No recent labs found.',
      status: labLines.length ? 'complete' : 'needs_review',
      sourceDocumentId: findDoc(/Lab/)?.id ?? '',
      pageRef: pageRefFor(labPages),
    },
    {
      id: uid('sec'),
      patientId,
      category: 'wound_care',
      title: 'Wound Care',
      content: wound.content,
      status: wound.status,
      sourceDocumentId: findDoc(/Wound/)?.id ?? '',
      pageRef: pageRefFor(woundPages),
      flags: wound.flags,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'therapy',
      title: 'Therapy Orders',
      content: therapy.content,
      status: therapy.status,
      sourceDocumentId: findDoc(/Therapy/)?.id ?? '',
      pageRef: pageRefFor(therapyPages),
      flags: therapy.flags,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'diet',
      title: 'Diet Orders',
      content: dietPages.map((p) => p.text).join(' ').slice(0, 500) || 'No diet orders found.',
      status: dietPages.length ? 'complete' : 'missing',
      sourceDocumentId: findDoc(/Diet/)?.id ?? '',
      pageRef: pageRefFor(dietPages),
    },
    {
      id: uid('sec'),
      patientId,
      category: 'follow_ups',
      title: 'Follow-up Appointments',
      content: followPages.map((p) => p.text).join(' ').slice(0, 500) || 'No follow-up appointments listed.',
      status: followPages.length ? 'ai_suggested' : 'missing',
      sourceDocumentId: findDoc(/Follow-up/)?.id ?? '',
      pageRef: pageRefFor(followPages),
    },
    {
      id: uid('sec'),
      patientId,
      category: 'insurance',
      title: 'Insurance / Authorization',
      content: insurance.content || 'No insurance information found.',
      status: insurance.status,
      sourceDocumentId: findDoc(/Insurance/)?.id ?? '',
      pageRef: pageRefFor(insurancePages),
      flags: insurance.flags,
    },
  ];

  const overview = buildOverview(patient, sections);

  return buildPatientWorkspace({
    patient,
    packet,
    sections: [overview, ...sections],
    sourceDocuments,
    staffNotes: [],
    questions: [],
    answers: [],
  });
}
