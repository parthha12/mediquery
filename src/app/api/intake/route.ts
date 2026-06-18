import { NextResponse } from 'next/server';
import { etlDischargePacket } from '@/services/dischargeEtl';
import { extractPdfPages } from '@/services/pdfText';

export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 15 MB limit' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const pages = await extractPdfPages(data);

    if (!pages.length || pages.every((p) => !p.text.trim())) {
      return NextResponse.json(
        { error: 'No extractable text found in PDF. Scanned images require OCR (not supported yet).' },
        { status: 422 }
      );
    }

    const workspace = etlDischargePacket(file.name, pages);

    return NextResponse.json({ workspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Intake failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
