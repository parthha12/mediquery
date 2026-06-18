import type { AIAnswer, PatientWorkspace, SourceReference } from '@/types';
import {
  buildIngestRagContext,
  buildPatientRagContext,
  DISCLAIMER,
  resolveIngestReferences,
  resolveReferences,
} from './ragContext';

const SYSTEM_PROMPT = `You are Mediquery, an AI assistant for exploring organized discharge packet data.

Rules:
- Answer ONLY from the provided patient/workspace context. If information is missing, say so clearly.
- Always cite source sections by their section_id values in your response.
- Flag conflicts, missing sections, or items needing human review when relevant.
- Be concise and practical — staff need actionable answers, not essays.
- Never provide definitive medical advice. Remind users that human review is required.
- When comparing across patients (ingest mode), organize answers clearly by patient.`;

interface LlmJsonResponse {
  answer: string;
  citedSectionIds?: string[];
  citedSections?: { patientId: string; sectionId: string }[];
}

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

async function callOpenAI(context: string, question: string, mode: 'patient' | 'ingest'): Promise<LlmJsonResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const citationSchema =
    mode === 'patient'
      ? `"citedSectionIds": ["section_id values you referenced"]`
      : `"citedSections": [{"patientId": "...", "sectionId": "..."}]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nRespond with JSON: { "answer": "your answer in markdown", ${citationSchema} }`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return JSON.parse(content) as LlmJsonResponse;
}

function generateFallbackAnswer(workspace: PatientWorkspace, question: string): LlmJsonResponse {
  const lower = question.toLowerCase();
  const sectionIds: string[] = [];

  let answer = '';

  if (lower.includes('med') || lower.includes('drug')) {
    const med = workspace.sections.find((s) => s.category === 'medications');
    if (med) {
      answer = `Active medications from the discharge packet:\n\n${med.content}`;
      sectionIds.push(med.id);
      if (workspace.sections.some((s) => s.flags?.length)) {
        answer += '\n\n⚠️ There is a documented conflict between allergies and medications. Human review required.';
      }
    }
  } else if (lower.includes('wound') || lower.includes('pressure')) {
    const wound = workspace.sections.find((s) => s.category === 'wound_care');
    if (wound?.status === 'missing') {
      answer =
        'No wound care instructions were found in this discharge packet. Contact the sending hospital before initiating treatment.';
    } else if (wound) {
      answer = `Wound care instructions:\n\n${wound.content}`;
      sectionIds.push(wound.id);
    }
  } else if (lower.includes('allerg')) {
    const allergy = workspace.sections.find((s) => s.category === 'allergies');
    if (allergy) {
      answer = `Documented allergies:\n\n${allergy.content}`;
      sectionIds.push(allergy.id);
    }
  } else if (lower.includes('therapy') || lower.includes('pt') || lower.includes('ot')) {
    const therapy = workspace.sections.find((s) => s.category === 'therapy');
    if (therapy) {
      answer = `Therapy orders:\n\n${therapy.content}`;
      sectionIds.push(therapy.id);
    }
  } else {
    const overview = workspace.sections.find((s) => s.category === 'overview');
    answer = overview
      ? `Summary:\n\n${overview.content}\n\nAsk about medications, allergies, wound care, or therapy for specific answers.`
      : 'I could not find specific information. Try asking about medications, allergies, wound care, or therapy.';
    if (overview) sectionIds.push(overview.id);
  }

  return { answer, citedSectionIds: sectionIds };
}

function generateIngestFallback(workspaces: PatientWorkspace[], question: string): LlmJsonResponse {
  const lower = question.toLowerCase();
  const citedSections: { patientId: string; sectionId: string }[] = [];

  if (lower.includes('how many') || lower.includes('count')) {
    const needsReview = workspaces.filter((w) =>
      w.sections.some((s) => s.status !== 'complete' || (s.flags?.length ?? 0) > 0)
    );
    return {
      answer: `There are **${workspaces.length}** patient workspace(s) in the ingest database. **${needsReview.length}** need review due to missing sections, conflicts, or flagged items.`,
      citedSections: [],
    };
  }

  if (lower.includes('review') || lower.includes('flag') || lower.includes('conflict')) {
    const flagged = workspaces.flatMap((w) =>
      w.sections
        .filter((s) => s.status !== 'complete' || (s.flags?.length ?? 0) > 0)
        .map((s) => {
          citedSections.push({ patientId: w.patient.id, sectionId: s.id });
          return `- **${w.patient.name}** — ${s.title}: ${s.status}${s.flags?.length ? ` (${s.flags.join('; ')})` : ''}`;
        })
    );
    return {
      answer:
        flagged.length > 0
          ? `Patients needing attention:\n\n${flagged.join('\n')}`
          : 'All ingested workspaces look complete with no flagged items.',
      citedSections,
    };
  }

  const patientList = workspaces
    .map((w) => `- **${w.patient.name}** (MRN ${w.patient.mrn}) — ${w.packet.fileName}, ${w.sections.length} sections`)
    .join('\n');

  return {
    answer: `Ingested patient workspaces:\n\n${patientList}\n\nAsk about specific patients, review flags, or section details.`,
    citedSections,
  };
}

export async function askPatientQuestion(
  workspace: PatientWorkspace,
  question: string,
  questionId: string
): Promise<AIAnswer> {
  const context = buildPatientRagContext(workspace);
  let llmResponse: LlmJsonResponse;

  try {
    llmResponse = await callOpenAI(context, question, 'patient');
  } catch {
    llmResponse = generateFallbackAnswer(workspace, question);
  }

  const references = resolveReferences(workspace, llmResponse.citedSectionIds ?? []);

  return {
    id: `ans_${Date.now()}`,
    questionId,
    text: llmResponse.answer,
    references,
    disclaimer: DISCLAIMER,
    answeredAt: new Date().toISOString(),
  };
}

export interface IngestChatResponse {
  text: string;
  references: SourceReference[];
  disclaimer: string;
}

export async function askIngestQuestion(
  workspaces: PatientWorkspace[],
  question: string
): Promise<IngestChatResponse> {
  const context = buildIngestRagContext(workspaces);
  let llmResponse: LlmJsonResponse;

  try {
    llmResponse = await callOpenAI(context, question, 'ingest');
  } catch {
    llmResponse = generateIngestFallback(workspaces, question);
  }

  const references = resolveIngestReferences(workspaces, llmResponse.citedSections ?? []);

  return {
    text: llmResponse.answer,
    references,
    disclaimer: DISCLAIMER,
  };
}

export function isLlmConfigured(): boolean {
  return Boolean(getApiKey());
}
