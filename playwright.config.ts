import { defineConfig } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

// The sandbox has no system NSS libraries or browser-download access. Use npm's bundled Linux browser.
const bundledBrowser = process.platform === 'linux';
const libraryRoot = join(tmpdir(), 'folio-browser-libraries');
if (bundledBrowser) {
  mkdirSync(libraryRoot, { recursive: true });
  execFileSync('tar', ['-xf', '-', '-C', libraryRoot], {
    input: brotliDecompressSync(
      readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br'),
    ),
  });
}

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    launchOptions: {
      executablePath: bundledBrowser
        ? await chromium.executablePath()
        : undefined,
      // Browser checks must keep web security enabled; only container sandboxing is unavailable here.
      args: bundledBrowser
        ? [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ]
        : [],
      env: bundledBrowser
        ? {
            ...process.env,
            LD_LIBRARY_PATH: `${libraryRoot}/lib:${process.env.LD_LIBRARY_PATH ?? ''}`,
          }
        : process.env,
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node dist/server/index.js',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    env: {
      DATA_DIR: mkdtempSync(join(tmpdir(), 'folio-browser-data-')),
      ACCESS_CODE: '026491',
      PORT: '4173',
      APP_ORIGIN: 'http://localhost:4173',
    },
  },
});
