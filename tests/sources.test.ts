import { afterEach, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createApplication } from '../src/server/application.js';
import { readConfiguration } from '../src/server/configuration.js';
import type { LearningSource } from '../src/shared/sources.js';

const servers: Server[] = [];
const directories: string[] = [];
async function setup(directory?: string) {
  const dataDirectory =
    directory ?? (await mkdtemp(join(tmpdir(), 'folio-sources-')));
  if (!directory) {
    directories.push(dataDirectory);
  }
  const configuration = readConfiguration({
    ACCESS_CODE: '026491',
    DATA_DIR: dataDirectory,
  });
  const server = createApplication(configuration).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP');
  }
  configuration.origin = `http://127.0.0.1:${address.port}`;
  const base = configuration.origin;
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: '{"code":"026491"}',
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
  const headers = { cookie, origin: base, 'content-type': 'application/json' };
  return { base, headers, dataDirectory };
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('owner can save text, reopen it after restart, and permanently delete it through HTTP', async () => {
  const first = await setup();
  const created = await fetch(`${first.base}/api/sources/text`, {
    method: 'POST',
    headers: first.headers,
    body: JSON.stringify({
      title: 'Understanding closures',
      text: 'A closure retains access to its lexical scope.',
    }),
  });
  expect(created.status).toBe(201);
  const source = (await created.json()) as LearningSource;
  expect(source.pages).toEqual([
    { number: 1, text: 'A closure retains access to its lexical scope.' },
  ]);
  const restarted = await setup(first.dataDirectory);
  const list = await fetch(`${restarted.base}/api/sources`, {
    headers: restarted.headers,
  });
  expect((await list.json()).sources).toEqual([
    expect.objectContaining({ id: source.id, title: 'Understanding closures' }),
  ]);
  const detail = await fetch(`${restarted.base}/api/sources/${source.id}`, {
    headers: restarted.headers,
  });
  expect((await detail.json()).pages).toEqual(source.pages);
  const deleted = await fetch(`${restarted.base}/api/sources/${source.id}`, {
    method: 'DELETE',
    headers: restarted.headers,
  });
  expect(deleted.status).toBe(200);
  expect(
    (
      await fetch(`${first.base}/api/sources/${source.id}`, {
        headers: first.headers,
      })
    ).status,
  ).toBe(404);
});

test('extracts a real text PDF and preserves page numbers', async () => {
  const { educationalPdf } = await import('./fixtures/pdf.js');
  const { base, headers } = await setup();
  const response = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/pdf',
      'x-file-name': encodeURIComponent('Closures.pdf'),
    },
    body: Buffer.from(await educationalPdf()),
  });
  expect(response.status).toBe(201);
  const source = (await response.json()) as LearningSource;
  expect(source.title).toBe('Closures');
  expect(source.kind).toBe('pdf');
  expect(source.pages).toEqual([
    { number: 1, text: 'Closures keep lexical scope.' },
    { number: 2, text: 'Functions can return other functions.' },
  ]);
});

test('source endpoints require authentication, exact origin, valid identifiers, and bounded inputs', async () => {
  const { base, headers } = await setup();
  for (const path of ['/api/sources', '/api/sources/../../.env']) {
    expect((await fetch(`${base}${path}`)).status).not.toBe(200);
  }
  const unauthenticated = await fetch(`${base}/api/sources/text`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: '{"title":"A","text":"B"}',
  });
  expect(unauthenticated.status).toBe(401);
  for (const input of [
    { title: '', text: 'hello' },
    { title: 'A', text: ' ' },
    { title: 'A', text: 'x'.repeat(200_001) },
    { title: 'A', text: 'a\0b' },
  ]) {
    expect(
      (
        await fetch(`${base}/api/sources/text`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
        })
      ).status,
    ).toBe(400);
  }
  const oversized = await fetch(`${base}/api/sources/text`, {
    method: 'POST',
    headers,
    body: 'x'.repeat(1024 * 1024 + 1),
  });
  expect(oversized.status).toBe(413);
  const csrf = await fetch(`${base}/api/sources/text`, {
    method: 'POST',
    headers: { ...headers, origin: 'https://attacker.example' },
    body: '{}',
  });
  expect(csrf.status).toBe(403);
  const invalidId = await fetch(`${base}/api/sources/not-a-uuid`, {
    method: 'DELETE',
    headers,
  });
  expect(invalidId.status).toBe(404);
});

test('rejects non-PDF, damaged and image-only PDFs without saving them', async () => {
  const { educationalPdf } = await import('./fixtures/pdf.js');
  const { base, headers } = await setup();
  const pdfHeaders = {
    ...headers,
    'content-type': 'application/pdf',
    'x-file-name': 'material.pdf',
  };
  const notPdf = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: pdfHeaders,
    body: 'hello',
  });
  expect(notPdf.status).toBe(400);
  const corrupt = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: pdfHeaders,
    body: '%PDF-1.7\ninvalid',
  });
  expect(corrupt.status).toBe(422);
  const imageOnly = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: pdfHeaders,
    body: Buffer.from(await educationalPdf(true)),
  });
  expect(imageOnly.status).toBe(422);
  expect((await imageOnly.json()).error).toContain('OCR');
  const list = await fetch(`${base}/api/sources`, { headers });
  expect((await list.json()).sources).toEqual([]);
});

test('rejects password-protected PDFs with a useful error and saves no partial source', async () => {
  const { readFile } = await import('node:fs/promises');
  const { base, headers } = await setup();
  const response = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/pdf',
      'x-file-name': 'locked.pdf',
    },
    body: await readFile('tests/fixtures/encrypted.pdf'),
  });
  expect(response.status).toBe(422);
  expect((await response.json()).error).toContain('Password-protected');
  const list = await fetch(`${base}/api/sources`, { headers });
  expect((await list.json()).sources).toEqual([]);
});

test('PDF filenames are only labels and cannot choose the storage path', async () => {
  const { educationalPdf } = await import('./fixtures/pdf.js');
  const { base, headers } = await setup();
  const response = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/pdf',
      'x-file-name': encodeURIComponent('../../outside.pdf'),
    },
    body: Buffer.from(await educationalPdf()),
  });
  expect(response.status).toBe(201);
  const source = (await response.json()) as LearningSource;
  expect(source.id).toMatch(/^[a-f0-9-]{36}$/);
  expect(source.title).toBe('../../outside');
  expect((await fetch(`${base}/outside.json`, { headers })).status).toBe(404);
  expect(
    (await fetch(`${base}/.data/sources/${source.id}.json`, { headers }))
      .status,
  ).toBe(404);
});

test('rejects PDFs over page or byte limits and files of unsupported media types', async () => {
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.create();
  for (let page = 0; page < 201; page += 1) {
    document.addPage();
  }
  const { base, headers } = await setup();
  const pdfHeaders = {
    ...headers,
    'content-type': 'application/pdf',
    'x-file-name': 'large.pdf',
  };
  const pages = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: pdfHeaders,
    body: Buffer.from(await document.save()),
  });
  expect(pages.status).toBe(422);
  expect((await pages.json()).error).toContain('200 pages');
  const bytes = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers: pdfHeaders,
    body: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  expect(bytes.status).toBe(413);
  const media = await fetch(`${base}/api/sources/pdf`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  expect(media.status).toBe(415);
});

test('serializes concurrent saves at the 50-source capacity limit', async () => {
  const { base, headers } = await setup();
  const statuses = await Promise.all(
    Array.from({ length: 52 }, (_, index) =>
      fetch(`${base}/api/sources/text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `Source ${index}`,
          text: 'Learning material.',
        }),
      }).then((response) => response.status),
    ),
  );
  expect(statuses.filter((status) => status === 201)).toHaveLength(50);
  expect(statuses.filter((status) => status === 409)).toHaveLength(2);
  const list = await fetch(`${base}/api/sources`, { headers });
  expect((await list.json()).sources).toHaveLength(50);
});

test('preserves code indentation and reports damaged local records without modifying them', async () => {
  const { writeFile } = await import('node:fs/promises');
  const { base, headers, dataDirectory } = await setup();
  const text = '    const scope = true;\n\n';
  const response = await fetch(`${base}/api/sources/text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Code', text }),
  });
  const source = (await response.json()) as LearningSource;
  expect(source.pages[0]?.text).toBe(text);
  // Corruption is injected at the filesystem boundary; the behavior is observed through HTTP.
  await writeFile(
    join(dataDirectory, 'sources', `${source.id}.json`),
    '{broken',
  );
  const damaged = await fetch(`${base}/api/sources/${source.id}`, { headers });
  expect(damaged.status).toBe(500);
  expect((await damaged.json()).error).toContain('could not be read');
  expect(
    (await fetch(`${base}/api/sources/${source.id}`, { headers })).status,
  ).toBe(500);
  expect(
    (
      await fetch(`${base}/api/sources/${source.id}`, {
        headers,
        method: 'DELETE',
      })
    ).status,
  ).toBe(200);
  expect(
    (await fetch(`${base}/api/sources/${source.id}`, { headers })).status,
  ).toBe(404);
});
