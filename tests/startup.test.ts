import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

test.each([
  { ACCESS_CODE: '' },
  { ACCESS_CODE: '12345' },
  { ACCESS_CODE: '1234567' },
  { ACCESS_CODE: '１２３４５６' },
  { ACCESS_CODE: '026491', PORT: 'oops' },
  { ACCESS_CODE: '026491', APP_ORIGIN: 'http://public.example' },
  { ACCESS_CODE: '026491', APP_ORIGIN: 'https://example.com/path' },
])('server refuses unsafe startup configuration %#', (environment) => {
  expect(() =>
    execFileSync(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], {
      env: { ...process.env, ...environment },
      stdio: 'pipe',
      timeout: 5000,
    }),
  ).toThrow();
});
