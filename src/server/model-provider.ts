import { RequestError } from './http.js';
import { chatLimits } from '../shared/chat.js';

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface LanguageModel {
  reply(messages: ModelMessage[], signal: AbortSignal): Promise<string>;
}
export interface ProviderConfiguration {
  kind: 'openai-compatible' | 'gemini';
  key: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

export function readProviderConfiguration(
  environment: NodeJS.ProcessEnv,
): ProviderConfiguration | undefined {
  const kind = environment.AI_PROVIDER;
  if (!kind) {
    return undefined;
  }
  if (kind !== 'openai-compatible' && kind !== 'gemini') {
    throw new Error('AI_PROVIDER must be gemini or openai-compatible.');
  }
  const key = environment.AI_API_KEY ?? '';
  const model = environment.AI_MODEL ?? '';
  const modelPattern =
    kind === 'gemini'
      ? /^[a-zA-Z0-9._:-]{1,120}$/
      : /^[a-zA-Z0-9._:/@-]{1,120}$/;
  if (!key.trim() || /\s/.test(key) || !modelPattern.test(model)) {
    throw new Error(
      'AI_API_KEY and a valid AI_MODEL are required when AI_PROVIDER is set.',
    );
  }
  if (kind === 'gemini' && environment.AI_BASE_URL) {
    throw new Error(
      'AI_BASE_URL is only supported for openai-compatible providers.',
    );
  }
  const baseUrl = environment.AI_BASE_URL || 'https://api.openai.com/v1';
  const url = new URL(baseUrl);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['https:', 'http:'].includes(url.protocol) ||
    (url.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  ) {
    throw new Error(
      'AI_BASE_URL must use HTTPS (or loopback HTTP), without credentials, query or fragment.',
    );
  }
  const timeoutMs = Number(environment.AI_TIMEOUT_MS ?? 20000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 25000) {
    throw new Error('AI_TIMEOUT_MS must be between 100 and 25000.');
  }
  return { kind, key, model, baseUrl: baseUrl.replace(/\/$/, ''), timeoutMs };
}

async function readResponse(response: Response): Promise<unknown> {
  if (!response.body) {
    throw new RequestError(502, 'The AI provider returned an empty response.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > chatLimits.bodyBytes) {
        throw new RequestError(
          502,
          'The AI provider response was too large. Ask a narrower question.',
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export function createLanguageModel(
  configuration: ProviderConfiguration,
  transport: typeof fetch = fetch,
): LanguageModel {
  return {
    async reply(messages, signal) {
      const timeout = AbortSignal.timeout(configuration.timeoutMs);
      try {
        const gemini = configuration.kind === 'gemini';
        const endpoint = gemini
          ? `https://generativelanguage.googleapis.com/v1beta/models/${configuration.model}:generateContent`
          : `${configuration.baseUrl}/chat/completions`;
        const body = gemini
          ? {
              systemInstruction: {
                parts: [
                  {
                    text: messages
                      .filter((message) => message.role === 'system')
                      .map((message) => message.content)
                      .join('\n'),
                  },
                ],
              },
              contents: messages
                .filter((message) => message.role !== 'system')
                .map((message) => ({
                  role: message.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: message.content }],
                })),
              generationConfig: { maxOutputTokens: 2048 },
            }
          : {
              model: configuration.model,
              messages,
              stream: false,
              max_tokens: 2048,
            };
        const response = await transport(endpoint, {
          method: 'POST',
          redirect: 'error',
          headers: {
            'Content-Type': 'application/json',
            ...(gemini
              ? { 'x-goog-api-key': configuration.key }
              : { Authorization: `Bearer ${configuration.key}` }),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.any([signal, timeout]),
        });
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status === 401 || response.status === 403) {
            throw new RequestError(
              502,
              'The AI provider rejected its credentials. Check AI_API_KEY and model access in .env.',
            );
          }
          if (response.status === 429) {
            throw new RequestError(
              429,
              'The AI provider is rate limiting requests. Wait a moment and try again.',
            );
          }
          throw new RequestError(
            502,
            'The AI provider is unavailable. Please try again.',
          );
        }
        const result = (await readResponse(response)) as {
          candidates?: {
            content?: { parts?: { text?: unknown; thought?: boolean }[] };
            finishReason?: string;
          }[];
          choices?: {
            message?: { content?: unknown };
            finish_reason?: string;
          }[];
        };
        const choice = result?.choices?.[0];
        if (
          choice?.finish_reason === 'length' ||
          result?.candidates?.[0]?.finishReason === 'MAX_TOKENS'
        ) {
          throw new RequestError(
            502,
            'The AI response was incomplete. Ask a narrower question.',
          );
        }
        const candidate = result?.candidates?.[0];
        if (
          (gemini && candidate?.finishReason !== 'STOP') ||
          (!gemini && choice?.finish_reason !== 'stop')
        ) {
          throw new RequestError(
            502,
            'The AI provider could not complete this answer. Try rephrasing your question.',
          );
        }
        const parts = candidate?.content?.parts;
        const text = gemini
          ? Array.isArray(parts)
            ? parts
                .filter(
                  (part) =>
                    part.thought !== true && typeof part.text === 'string',
                )
                .map((part) => part.text)
                .join('')
            : undefined
          : choice?.message?.content;
        if (
          typeof text !== 'string' ||
          !text.trim() ||
          text.length > chatLimits.answerCharacters
        ) {
          throw new RequestError(
            502,
            'The AI provider returned an unsupported or empty response. Try a narrower question.',
          );
        }
        return text;
      } catch (error) {
        if (signal.aborted) {
          throw new RequestError(499, 'Generation cancelled.');
        }
        if (timeout.aborted) {
          throw new RequestError(
            504,
            'The AI provider took too long. Try again or ask a narrower question.',
          );
        }
        if (error instanceof RequestError) {
          throw error;
        }
        // Never expose raw provider bodies or network errors: they may contain credentials or source text.
        throw new RequestError(
          502,
          'Could not read the AI provider response. Check your configuration and try again.',
        );
      }
    },
  };
}
