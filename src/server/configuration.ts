import { readProviderConfiguration } from './model-provider.js';
import type { ProviderConfiguration } from './model-provider.js';
import { resolve, sep } from 'node:path';
export interface Configuration {
  provider?: ProviderConfiguration;
  dataDirectory: string;
  accessCode: string;
  origin: string;
  port: number;
  secureCookies: boolean;
  sessionLifetimeMs: number;
}

export function readConfiguration(
  environment: NodeJS.ProcessEnv,
): Configuration {
  const accessCode = environment.ACCESS_CODE ?? '';
  if (!/^\d{6}$/.test(accessCode)) {
    throw new Error(
      'ACCESS_CODE must contain exactly six ASCII digits. No default code is provided.',
    );
  }

  const port = Number(environment.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const originValue = environment.APP_ORIGIN ?? `http://localhost:${port}`;
  let url: URL;
  try {
    url = new URL(originValue);
  } catch {
    throw new Error('APP_ORIGIN must be a valid HTTP or HTTPS origin.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== originValue
  ) {
    throw new Error(
      'APP_ORIGIN must be an exact HTTP or HTTPS origin without a path or trailing slash.',
    );
  }
  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (url.protocol === 'http:' && !localHosts.includes(url.hostname)) {
    throw new Error('Non-loopback APP_ORIGIN requires HTTPS.');
  }

  const dataDirectory = resolve(environment.DATA_DIR ?? '.data');
  const repositoryRoot = resolve('.');
  const ignoredDataDirectory = resolve('.data');
  if (
    (dataDirectory === repositoryRoot ||
      dataDirectory.startsWith(`${repositoryRoot}${sep}`)) &&
    dataDirectory !== ignoredDataDirectory &&
    !dataDirectory.startsWith(`${ignoredDataDirectory}${sep}`)
  ) {
    throw new Error(
      'DATA_DIR must be outside the repository or inside its ignored .data directory.',
    );
  }

  return {
    provider: readProviderConfiguration(environment),
    dataDirectory,
    accessCode,
    origin: url.origin,
    port,
    secureCookies: url.protocol === 'https:',
    sessionLifetimeMs: 8 * 60 * 60 * 1000,
  };
}
