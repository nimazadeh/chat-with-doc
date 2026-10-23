import { afterEach, expect, test, vi } from 'vitest';
import { request } from 'node:http';
import type { Server } from 'node:http';
import { createApplication } from '../src/server/application.js';
import { readConfiguration } from '../src/server/configuration.js';

const servers: Server[] = [];
const origin = 'http://localhost:3000';

async function setup() {
  const configuration = readConfiguration({
    ACCESS_CODE: '026491',
    APP_ORIGIN: origin,
  });
  const application = createApplication(configuration);
  const server = application.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP listener');
  }
  configuration.origin = `http://127.0.0.1:${address.port}`;
  return configuration.origin;
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
});

test('owner can enter, retrieve the private workspace, and invalidate access by logging out', async () => {
  const base = await setup();
  const locked = await fetch(`${base}/api/workspace`, {
    headers: { host: 'localhost:3000' },
  });
  expect(locked.status).toBe(401);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: {
      origin: base,
      host: 'localhost:3000',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code: '026491' }),
  });
  expect(login.status).toBe(200);
  const setCookie = login.headers.get('set-cookie') ?? '';
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('SameSite=Strict');
  const cookie = setCookie.split(';')[0] ?? '';
  const privateResponse = await fetch(`${base}/api/workspace`, {
    headers: { cookie, host: 'localhost:3000' },
  });
  expect(privateResponse.status).toBe(200);
  expect(await privateResponse.json()).toEqual({ name: 'Personal workspace' });

  const logout = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: base, cookie, host: 'localhost:3000' },
  });
  expect(logout.status).toBe(200);
  const afterLogout = await fetch(`${base}/api/workspace`, {
    headers: { cookie, host: 'localhost:3000' },
  });
  expect(afterLogout.status).toBe(401);
});

test('rejects cross-origin and missing-origin writes, and does not trust forwarded host', async () => {
  const base = await setup();
  for (const suppliedOrigin of ['https://attacker.example', 'null', '']) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: suppliedOrigin,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ code: '026491' }),
    });
    expect(response.status).toBe(403);
  }
  const rebound = await new Promise<number>((resolve, reject) => {
    const outgoing = request(
      `${base}/api/workspace`,
      {
        headers: {
          host: 'attacker.example',
          'x-forwarded-host': new URL(base).host,
        },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    outgoing.on('error', reject);
    outgoing.end();
  });
  expect(rebound).toBe(403);
});

test('bounds JSON payloads and requires a six-digit string instead of coercing values', async () => {
  const base = await setup();
  const headers = {
    host: 'localhost:3000',
    origin: base,
    'content-type': 'application/json',
  };
  const oversized = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: '026491', padding: 'a'.repeat(2048) }),
  });
  expect(oversized.status).toBe(413);
  for (const code of [
    26491,
    null,
    '026491 ',
    '１２３４５６',
    '123',
    ['026491'],
  ]) {
    const invalid = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
    });
    expect(invalid.status).toBe(400);
  }
  const wrongType = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'text/plain' },
    body: '{"code":"026491"}',
  });
  expect(wrongType.status).toBe(415);
});

test('temporarily blocks further guesses globally without trusting forwarded IP addresses', async () => {
  const base = await setup();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: {
        origin: base,
        'content-type': 'application/json',
        'x-forwarded-for': `192.0.2.${attempt}`,
      },
      body: JSON.stringify({ code: '999999' }),
    });
    expect(response.status).toBe(401);
  }
  const blocked = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: JSON.stringify({ code: '026491' }),
  });
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
});

test('rejects forged sessions and clears expired access server-side', async () => {
  const base = await setup();
  const forged = await fetch(`${base}/api/workspace`, {
    headers: { cookie: 'learning_session=forged' },
  });
  expect(forged.status).toBe(401);
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: JSON.stringify({ code: '026491' }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
  const now = Date.now();
  const clock = vi
    .spyOn(Date, 'now')
    .mockReturnValue(now + 8 * 60 * 60 * 1000 + 1);
  try {
    const expired = await fetch(`${base}/api/workspace`, {
      headers: { cookie },
    });
    expect(expired.status).toBe(401);
  } finally {
    clock.mockRestore();
  }
});

test('allows access after the guessing cooldown ends', async () => {
  const base = await setup();
  const headers = { origin: base, 'content-type': 'application/json' };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers,
      body: '{"code":"999999"}',
    });
  }
  const clock = vi
    .spyOn(Date, 'now')
    .mockReturnValue(Date.now() + 10 * 60 * 1000 + 1);
  try {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers,
      body: '{"code":"026491"}',
    });
    expect(response.status).toBe(200);
  } finally {
    clock.mockRestore();
  }
});

test('rotates sessions on a new login and rejects mutation without the expected origin', async () => {
  const base = await setup();
  const headers = { origin: base, 'content-type': 'application/json' };
  const first = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers,
    body: '{"code":"026491"}',
  });
  const oldCookie = first.headers.get('set-cookie')?.split(';')[0] ?? '';
  const second = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { ...headers, cookie: oldCookie },
    body: '{"code":"026491"}',
  });
  expect(second.headers.get('set-cookie')).not.toBe(
    first.headers.get('set-cookie'),
  );
  const invalidated = await fetch(`${base}/api/workspace`, {
    headers: { cookie: oldCookie },
  });
  expect(invalidated.status).toBe(401);
  const newCookie = second.headers.get('set-cookie')?.split(';')[0] ?? '';
  const csrf = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: newCookie },
  });
  expect(csrf.status).toBe(403);
  const stillAuthenticated = await fetch(`${base}/api/workspace`, {
    headers: { cookie: newCookie },
  });
  expect(stillAuthenticated.status).toBe(200);
});

test('sets Secure cookies for an explicitly configured HTTPS origin, never from forwarded headers', async () => {
  const configuration = readConfiguration({
    ACCESS_CODE: '026491',
    APP_ORIGIN: 'https://workspace.example',
  });
  const server = createApplication(configuration).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP listener');
  }
  const cookie = await new Promise<string>((resolve, reject) => {
    const outgoing = request(
      `http://127.0.0.1:${address.port}/api/auth/login`,
      {
        method: 'POST',
        headers: {
          host: 'workspace.example',
          origin: 'https://workspace.example',
          'content-type': 'application/json',
        },
      },
      (response) => {
        response.resume();
        resolve(response.headers['set-cookie']?.[0] ?? '');
      },
    );
    outgoing.on('error', reject);
    outgoing.end('{"code":"026491"}');
  });
  expect(cookie).toContain('; Secure');
  expect(cookie).toContain('Max-Age=28800');
});

test('rejects malformed JSON, unknown private routes, and non-public files', async () => {
  const base = await setup();
  const malformed = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: '{"code":',
  });
  expect(malformed.status).toBe(400);
  for (const path of ['/api/sources', '/api/anything']) {
    expect((await fetch(`${base}${path}`)).status).toBe(401);
  }
  for (const path of [
    '/.env',
    '/src/server/configuration.ts',
    '/server/index.js',
    '/package.json',
  ]) {
    expect((await fetch(`${base}${path}`)).status).toBe(404);
  }
  const response = await fetch(`${base}/api/workspace`);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-security-policy')).toContain(
    "default-src 'self'",
  );
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});

test('rejects oversized logout bodies as well as login payloads', async () => {
  const base = await setup();
  const headers = { origin: base, 'content-type': 'application/json' };
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers,
    body: '{"code":"026491"}',
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
  const logout = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { ...headers, cookie },
    body: JSON.stringify({ padding: 'x'.repeat(2048) }),
  });
  expect(logout.status).toBe(413);
});

test('reports public session status without exposing private data or causing an expected 401 on boot', async () => {
  const base = await setup();
  const response = await fetch(`${base}/api/auth/session`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ authenticated: false });
});

test('concurrent requests cannot bypass the five-guess limit with delayed bodies', async () => {
  const base = await setup();
  const pending = Array.from({ length: 12 }, () => {
    let outgoing: ReturnType<typeof request>;
    const result = new Promise<number>((resolve, reject) => {
      outgoing = request(
        `${base}/api/auth/login`,
        {
          method: 'POST',
          headers: { origin: base, 'content-type': 'application/json' },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );
      outgoing.on('error', reject);
      outgoing.flushHeaders();
    });
    return { result, send: () => outgoing.end('{"code":"999999"}') };
  });
  // Hold all requests at the real HTTP body boundary, rather than mocking the limiter.
  await new Promise((resolve) => setTimeout(resolve, 100));
  pending.forEach(({ send }) => send());
  const statuses = await Promise.all(pending.map(({ result }) => result));
  expect(statuses.filter((status) => status === 401)).toHaveLength(5);
  expect(statuses.filter((status) => status === 429)).toHaveLength(7);
});
