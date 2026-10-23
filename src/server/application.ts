import { createLanguageModel } from './model-provider.js';
import { answerQuestion, readChatRequest } from './chat.js';
import { chatLimits } from '../shared/chat.js';
import { RequestError, readLimitedBody } from './http.js';
import { SourceLibrary } from './source-library.js';
import { sourceLimits } from '../shared/sources.js';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { WorkspaceAccess } from './access.js';
import type { Configuration } from './configuration.js';

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

async function readLoginCode(request: IncomingMessage): Promise<string> {
  if (
    request.headers['content-type']?.split(';')[0]?.trim() !==
    'application/json'
  ) {
    throw new RequestError(415, 'Send the access code as JSON.');
  }
  const bodyText = await readLimitedBody(request);
  let body: unknown;
  try {
    body = JSON.parse(bodyText.toString('utf8'));
  } catch {
    throw new RequestError(400, 'Enter a six-digit access code.');
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('code' in body) ||
    typeof body.code !== 'string' ||
    !/^\d{6}$/.test(body.code)
  ) {
    throw new RequestError(400, 'Enter a six-digit access code.');
  }
  return body.code;
}

export function createApplication(
  configuration: Configuration,
  providerTransport: typeof fetch = fetch,
) {
  const model = configuration.provider
    ? createLanguageModel(configuration.provider, providerTransport)
    : undefined;
  let generating = false;
  const access = new WorkspaceAccess(configuration);
  const sources = new SourceLibrary(configuration.dataDirectory);
  const clientRoot = resolve('dist/client');

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'",
    );
    const expectedHost = new URL(configuration.origin).host;
    if (request.headers.host !== expectedHost) {
      sendJson(response, 403, { error: 'This host is not allowed.' });
      return;
    }
    if (
      !['GET', 'HEAD'].includes(request.method ?? '') &&
      request.headers.origin !== configuration.origin
    ) {
      sendJson(response, 403, {
        error: 'Please use the configured workspace address.',
      });
      return;
    }
    const pathname = new URL(request.url ?? '/', configuration.origin).pathname;

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const code = await readLoginCode(request);
      // No await may separate this guard from verification: delayed parallel bodies must not bypass it.
      const retryAfter = access.retryAfterSeconds();
      if (retryAfter > 0) {
        request.resume();
        response.setHeader('Retry-After', retryAfter);
        sendJson(response, 429, {
          error: 'Too many attempts. Please try again in a few minutes.',
          retryAfter,
        });
        return;
      }
      if (!access.verifyCode(code)) {
        sendJson(response, 401, {
          error: 'That code is not correct. Please try again.',
        });
        return;
      }
      response.setHeader(
        'Set-Cookie',
        access.openSession(request.headers.cookie),
      );
      sendJson(response, 200, { authenticated: true });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/auth/session') {
      sendJson(response, 200, {
        authenticated: access.isAuthenticated(request.headers.cookie),
      });
      return;
    }

    if (pathname.startsWith('/api/')) {
      if (!access.isAuthenticated(request.headers.cookie)) {
        sendJson(response, 401, { error: 'Please unlock your workspace.' });
        return;
      }
      if (request.method === 'GET' && pathname === '/api/chat/status') {
        sendJson(
          response,
          200,
          model
            ? {
                configured: true,
                provider: configuration.provider?.kind,
                sourceCharacters: chatLimits.sourceCharacters,
              }
            : { configured: false },
        );
        return;
      }
      if (request.method === 'POST' && pathname === '/api/chat') {
        if (!model) {
          throw new RequestError(
            503,
            'Configure AI_PROVIDER, AI_MODEL and AI_API_KEY in .env before asking a question.',
          );
        }
        if (
          request.headers['content-type']?.split(';')[0]?.trim() !==
          'application/json'
        ) {
          throw new RequestError(415, 'Send your question as JSON.');
        }
        if (generating) {
          throw new RequestError(
            409,
            'A response is already being generated. Cancel it or wait before sending another question.',
          );
        }
        const bytes = await readLimitedBody(request, chatLimits.bodyBytes);
        let input: unknown;
        try {
          input = JSON.parse(bytes.toString('utf8'));
        } catch {
          throw new RequestError(400, 'The conversation is not valid JSON.');
        }
        const chat = readChatRequest(input);
        const source = await sources.get(chat.sourceId);
        if (!access.isAuthenticated(request.headers.cookie)) {
          throw new RequestError(401, 'Please unlock your workspace.');
        }
        if (generating) {
          throw new RequestError(409, 'A response is already being generated.');
        }
        generating = true;
        const controller = new AbortController();
        const cancel = () => {
          if (!response.writableEnded) {
            controller.abort();
          }
        };
        response.once('close', cancel);
        try {
          const text = await answerQuestion(
            model,
            source,
            chat.messages,
            controller.signal,
          );
          if (!response.destroyed) {
            sendJson(response, 200, { text });
          }
        } finally {
          response.off('close', cancel);
          generating = false;
        }
        return;
      }
      if (request.method === 'GET' && pathname === '/api/sources') {
        sendJson(response, 200, { sources: await sources.list() });
        return;
      }
      if (request.method === 'POST' && pathname === '/api/sources/text') {
        if (
          request.headers['content-type']?.split(';')[0]?.trim() !==
          'application/json'
        ) {
          throw new RequestError(415, 'Paste a text source using JSON.');
        }
        const buffer = await readLimitedBody(
          request,
          sourceLimits.textBodyBytes,
        );
        let input: unknown;
        try {
          input = JSON.parse(buffer.toString('utf8'));
        } catch {
          throw new RequestError(400, 'The text source is not valid JSON.');
        }
        sendJson(response, 201, await sources.addText(input));
        return;
      }
      if (request.method === 'POST' && pathname === '/api/sources/pdf') {
        if (request.headers['content-type'] !== 'application/pdf') {
          throw new RequestError(
            415,
            'Choose a PDF file. Other file types are not supported.',
          );
        }
        let fileName: string;
        try {
          fileName = decodeURIComponent(
            String(request.headers['x-file-name'] ?? ''),
          );
        } catch {
          throw new RequestError(400, 'The PDF filename is invalid.');
        }
        const buffer = await readLimitedBody(request, sourceLimits.pdfBytes);
        sendJson(response, 201, await sources.addPdf(fileName, buffer));
        return;
      }
      const sourceId = pathname.match(/^\/api\/sources\/([^/]+)$/)?.[1];
      if (sourceId && request.method === 'GET') {
        sendJson(response, 200, await sources.get(sourceId));
        return;
      }
      if (sourceId && request.method === 'DELETE') {
        await sources.remove(sourceId);
        sendJson(response, 200, { deleted: true });
        return;
      }
      if (request.method === 'POST' && pathname === '/api/auth/logout') {
        await readLimitedBody(request);
        response.setHeader(
          'Set-Cookie',
          access.closeSession(request.headers.cookie),
        );
        sendJson(response, 200, { authenticated: false });
      } else if (request.method === 'GET' && pathname === '/api/workspace') {
        sendJson(response, 200, { name: 'Personal workspace' });
      } else {
        sendJson(response, 404, {
          error: 'This feature is not available yet.',
        });
      }
      return;
    }

    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = resolve(clientRoot, relativePath);
    if (!filePath.startsWith(`${clientRoot}${sep}`)) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }
    const contentTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };
    const contentType = contentTypes[extname(filePath)];
    if (!contentType) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }
    try {
      const body = await readFile(filePath);
      response.writeHead(200, { 'Content-Type': contentType });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      sendJson(response, 404, { error: 'Not found.' });
    }
  }

  const server = createServer(
    { requestTimeout: 10_000, headersTimeout: 10_000, maxHeaderSize: 8192 },
    (request, response) => {
      void handleRequest(request, response).catch((error: unknown) => {
        if (response.destroyed) {
          return;
        }
        if (error instanceof RequestError) {
          sendJson(response, error.status, { error: error.message });
          return;
        }
        if (!response.headersSent) {
          sendJson(response, 500, {
            error: 'Something went wrong. Please try again.',
          });
        } else {
          response.end();
        }
      });
    },
  );
  return server;
}
