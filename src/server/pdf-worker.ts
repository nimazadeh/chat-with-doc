import { parentPort, workerData } from 'node:worker_threads';
import {
  getDocument,
  PasswordException,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { sourceLimits } from '../shared/sources.js';
import type { SourcePage } from '../shared/sources.js';

async function extract(): Promise<void> {
  const task = getDocument({
    data: new Uint8Array(workerData as ArrayBuffer),
    useSystemFonts: false,
    useWorkerFetch: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  try {
    const document = await task.promise;
    if (document.numPages > sourceLimits.pages) {
      throw new Error('PDFs may contain at most 200 pages.');
    }
    if ((await document.getPermissions()) !== null) {
      throw new Error(
        'Password-protected PDFs are not supported. Export an unprotected copy first.',
      );
    }
    const pages: SourcePage[] = [];
    let characters = 0;
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => {
          if (!('str' in item)) {
            return '';
          }
          return item.str + (item.hasEOL ? '\n' : ' ');
        })
        .join('')
        .trim();
      characters += text.length;
      if (characters > sourceLimits.characters) {
        throw new Error(
          'Extracted text exceeds 200,000 characters. Please split the PDF.',
        );
      }
      pages.push({ number, text });
      page.cleanup();
    }
    if (!pages.some((page) => page.text.trim())) {
      throw new Error(
        'No selectable text was found. Scanned or image-only PDFs need OCR, which is not supported yet.',
      );
    }
    parentPort?.postMessage({ pages });
  } catch (error) {
    const message =
      error instanceof PasswordException
        ? 'Password-protected PDFs are not supported. Export an unprotected copy first.'
        : error instanceof Error &&
            /^(Password-protected|PDFs may|Extracted text|No selectable)/.test(
              error.message,
            )
          ? error.message
          : 'This PDF could not be read. It may be damaged or unsupported.';
    parentPort?.postMessage({ error: message });
  } finally {
    await task.destroy();
  }
}

void extract();
