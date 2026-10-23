export const chatLimits = {
  sourceCharacters: 24_000,
  questionCharacters: 4_000,
  historyCharacters: 24_000,
  messages: 11,
  answerCharacters: 12_000,
  bodyBytes: 128 * 1024,
} as const;

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
