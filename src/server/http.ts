import type { IncomingMessage } from 'node:http';

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function readLimitedBody(
  request: IncomingMessage,
  limit = 1024,
): Promise<Buffer> {
  return new Promise<Buffer>((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let tooLarge = false;
    request.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > limit) {
        tooLarge = true;
        chunks.length = 0;
        reject(new RequestError(413, 'The request is too large.'));
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    request.on('end', () => resolveBody(Buffer.concat(chunks)));
    request.on('error', reject);
    request.on('aborted', () =>
      reject(new RequestError(400, 'The request was interrupted.')),
    );
  });
}
