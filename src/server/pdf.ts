import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import type { SourcePage } from '../shared/sources.js';
import { RequestError } from './http.js';

export function extractPdf(bytes: Buffer): Promise<SourcePage[]> {
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new RequestError(
      400,
      'Choose a valid PDF file, not a renamed text or image file.',
    );
  }
  return new Promise((resolvePages, reject) => {
    // Parsing stays off the HTTP thread with a wall-clock budget and a bounded JS heap.
    // This is resource isolation, not a security sandbox against native-code vulnerabilities.
    const worker = new Worker(resolve('dist/server/pdf-worker.js'), {
      workerData: Uint8Array.from(bytes).buffer,
      resourceLimits: { maxOldGenerationSizeMb: 256 },
      execArgv: [],
    });
    const timeout = setTimeout(() => {
      reject(
        new RequestError(
          422,
          'PDF processing took too long. Try a smaller or simpler PDF.',
        ),
      );
      void worker.terminate();
    }, 20_000);
    worker.once(
      'message',
      (result: { pages?: SourcePage[]; error?: string }) => {
        clearTimeout(timeout);
        if (result.pages) {
          resolvePages(result.pages);
        } else {
          reject(
            new RequestError(
              422,
              result.error ?? 'This PDF could not be read.',
            ),
          );
        }
        void worker.terminate();
      },
    );
    worker.once('error', () => {
      clearTimeout(timeout);
      reject(
        new RequestError(
          422,
          'PDF processing failed. Try a smaller or simpler PDF.',
        ),
      );
    });
    worker.once('exit', () => {
      clearTimeout(timeout);
      reject(
        new RequestError(422, 'PDF processing stopped before completion.'),
      );
    });
  });
}
