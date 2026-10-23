import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function educationalPdf(blank = false): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const text of [
    'Closures keep lexical scope.',
    'Functions can return other functions.',
  ]) {
    const page = document.addPage([500, 700]);
    if (!blank) {
      page.drawText(text, { x: 30, y: 600, font, size: 14 });
    }
  }
  return document.save();
}
