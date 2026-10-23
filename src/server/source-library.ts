import { extractPdf } from './pdf.js';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { sourceLimits, isLearningSource } from '../shared/sources.js';
import type {
  LearningSource,
  SourcePage,
  SourceSummary,
} from '../shared/sources.js';
import { RequestError } from './http.js';

const sourceIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function normalizeTitle(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > sourceLimits.titleCharacters ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    throw new RequestError(
      400,
      'Give your source a title of 1–120 characters.',
    );
  }
  return value.trim();
}

/** Only extracted text is retained. Original PDF names never become filesystem paths. */
export class SourceLibrary {
  private readonly directory: string;
  private pdfInProgress = false;
  private pendingWrite: Promise<unknown> = Promise.resolve();

  constructor(dataDirectory: string) {
    this.directory = join(dataDirectory, 'sources');
  }

  private async initialize(): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
  }

  private path(id: string): string {
    if (!sourceIdPattern.test(id)) {
      throw new RequestError(404, 'That source was not found.');
    }
    return join(this.directory, `${id}.json`);
  }

  async list(): Promise<SourceSummary[]> {
    await this.initialize();
    const files = (await readdir(this.directory)).filter(
      (name) =>
        sourceIdPattern.test(name.replace(/\.json$/, '')) &&
        name.endsWith('.json'),
    );
    const summaries: SourceSummary[] = [];
    for (const file of files) {
      try {
        const { pages: _pages, ...summary } = await this.get(file.slice(0, -5));
        void _pages;
        summaries.push(summary);
      } catch (error) {
        // A concurrent deletion should not turn a fresh library listing into an error.
        if (!(error instanceof RequestError) || error.status !== 404) {
          throw error;
        }
      }
    }
    return summaries.sort((first, second) =>
      second.createdAt.localeCompare(first.createdAt),
    );
  }

  async get(id: string): Promise<LearningSource> {
    const filePath = this.path(id);
    let data: string;
    try {
      data = await readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new RequestError(404, 'That source was not found.');
      }
      throw error;
    }
    try {
      const source: unknown = JSON.parse(data);
      if (!isLearningSource(source) || source.id !== id) {
        throw new Error('Invalid record');
      }
      return source;
    } catch {
      throw new RequestError(
        500,
        'A saved source could not be read. Your files have not been changed.',
      );
    }
  }

  async addText(input: unknown): Promise<LearningSource> {
    if (
      typeof input !== 'object' ||
      input === null ||
      !('title' in input) ||
      !('text' in input) ||
      typeof input.text !== 'string'
    ) {
      throw new RequestError(400, 'Provide a title and educational text.');
    }
    const title = normalizeTitle(input.title);
    const text = input.text;
    if (
      !text.trim() ||
      text.length > sourceLimits.characters ||
      text.includes('\0')
    ) {
      throw new RequestError(
        400,
        'Paste between 1 and 200,000 characters of readable text.',
      );
    }
    return this.save(title, 'text', [{ number: 1, text }]);
  }

  async addPdf(fileName: string, bytes: Buffer): Promise<LearningSource> {
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      throw new RequestError(400, 'Choose a file with a .pdf extension.');
    }
    const title = normalizeTitle(fileName.slice(0, -4));
    if (this.pdfInProgress) {
      throw new RequestError(
        409,
        'Another PDF is being processed. Please try again shortly.',
      );
    }
    this.pdfInProgress = true;
    try {
      const pages = await extractPdf(bytes);
      return await this.save(title, 'pdf', pages);
    } finally {
      this.pdfInProgress = false;
    }
  }

  private save(
    title: string,
    kind: 'text' | 'pdf',
    pages: SourcePage[],
  ): Promise<LearningSource> {
    // Serialize the capacity check with writes so concurrent imports cannot overfill the library.
    const operation = this.pendingWrite.then(async () => {
      await this.initialize();
      if ((await this.list()).length >= sourceLimits.count) {
        throw new RequestError(
          409,
          'Your library is full (50 sources). Delete a source before adding another.',
        );
      }
      const source: LearningSource = {
        id: randomUUID(),
        title,
        kind,
        createdAt: new Date().toISOString(),
        pages,
        pageCount: pages.length,
        characterCount: pages.reduce(
          (total, page) => total + page.text.length,
          0,
        ),
      };
      const destination = this.path(source.id);
      const temporary = `${destination}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(source), {
          mode: 0o600,
          flag: 'wx',
        });
        await rename(temporary, destination);
      } finally {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        });
      }
      return source;
    });
    this.pendingWrite = operation.catch(() => undefined);
    return operation;
  }

  async remove(id: string): Promise<void> {
    try {
      await unlink(this.path(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new RequestError(404, 'That source was not found.');
      }
      throw error;
    }
  }
}
