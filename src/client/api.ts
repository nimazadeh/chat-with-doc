export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}

/** All browser requests stay same-origin so secrets and backend addresses never reach the client. */
export async function requestJson(
  path: string,
  body?: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = 'The workspace could not be reached. Please try again.';
      let retryAfter = 0;
      try {
        const result: unknown = await response.json();
        if (
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
        ) {
          message = result.error;
        }
        retryAfter = Number(response.headers.get('Retry-After') ?? 0);
      } catch {
        // A proxy may return HTML; keep a safe, readable error instead of rendering its response.
      }
      throw new ApiError(message, response.status, retryAfter);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Connection interrupted. Check your connection and try again.',
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}
