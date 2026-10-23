export const sourceLimits = {
  pdfBytes: 10 * 1024 * 1024,
  textBodyBytes: 1024 * 1024,
  characters: 200_000,
  pages: 200,
  count: 50,
  titleCharacters: 120,
} as const;

export interface SourcePage {
  number: number;
  text: string;
}

export interface SourceSummary {
  id: string;
  title: string;
  kind: 'text' | 'pdf';
  createdAt: string;
  pageCount: number;
  characterCount: number;
}

export interface LearningSource extends SourceSummary {
  pages: SourcePage[];
}

export function isLearningSource(value: unknown): value is LearningSource {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const source = value as Partial<LearningSource>;
  if (
    typeof source.id !== 'string' ||
    typeof source.title !== 'string' ||
    (source.kind !== 'pdf' && source.kind !== 'text') ||
    typeof source.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(source.createdAt)) ||
    !Array.isArray(source.pages) ||
    source.pages.length < 1 ||
    source.pages.length > sourceLimits.pages ||
    source.pageCount !== source.pages.length ||
    typeof source.characterCount !== 'number'
  ) {
    return false;
  }
  let characters = 0;
  for (const [index, page] of source.pages.entries()) {
    if (
      typeof page !== 'object' ||
      page === null ||
      page.number !== index + 1 ||
      typeof page.text !== 'string'
    ) {
      return false;
    }
    characters += page.text.length;
  }
  return (
    characters === source.characterCount &&
    characters > 0 &&
    characters <= sourceLimits.characters
  );
}
