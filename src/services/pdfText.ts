import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PageText {
  pageNumber: number;
  text: string;
}

function pageItemsToText(items: { str: string; hasEOL?: boolean }[]): string {
  let text = '';
  for (const item of items) {
    text += item.str;
    if (item.hasEOL) text += '\n';
    else text += ' ';
  }
  return text.replace(/\s+/g, ' ').trim();
}

export async function extractPdfPages(data: Uint8Array): Promise<PageText[]> {
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const pages: PageText[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = pageItemsToText(content.items as { str: string; hasEOL?: boolean }[]);
    pages.push({ pageNumber, text });
  }

  return pages;
}
