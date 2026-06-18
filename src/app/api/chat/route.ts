import { NextResponse } from 'next/server';
import type { PatientWorkspace } from '@/types';
import { askIngestQuestion, askPatientQuestion, isLlmConfigured } from '@/services/llmAgent';

interface ChatRequestBody {
  question: string;
  scope: 'patient' | 'ingest';
  workspace?: PatientWorkspace;
  workspaces?: PatientWorkspace[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (body.scope === 'patient') {
      if (!body.workspace) {
        return NextResponse.json({ error: 'Workspace is required for patient scope' }, { status: 400 });
      }

      const questionId = `q_${Date.now()}`;
      const answer = await askPatientQuestion(body.workspace, question, questionId);

      return NextResponse.json({
        question: { id: questionId, patientId: body.workspace.patient.id, text: question, askedAt: new Date().toISOString() },
        answer,
        llmEnabled: isLlmConfigured(),
      });
    }

    if (body.scope === 'ingest') {
      const workspaces = body.workspaces ?? [];
      const result = await askIngestQuestion(workspaces, question);

      return NextResponse.json({
        ...result,
        llmEnabled: isLlmConfigured(),
      });
    }

    return NextResponse.json({ error: 'Invalid scope. Use "patient" or "ingest".' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ llmEnabled: isLlmConfigured() });
}
