# Folio · Personal learning workspace

A personal, local-first learning tool built with HTML5, modern CSS, and strict TypeScript. No frontend framework. Node.js serves the frontend and protects the private workspace.

**Implemented:** ticket 1 (private access) and ticket 2 (local source library). You can save pasted text or text-based PDFs, inspect extracted text with page references, reopen after restart, and delete sources. AI conversations and learning history are not available yet.

## Run locally

Requires Node.js **22.19+** and npm. Run commands from the repository root.

```sh
npm ci
cp .env.example .env
```

Edit `.env`: replace `REPLACE_WITH_SIX_DIGITS` with your own six ASCII digits. Leading zeros are allowed. This is a fixed private access code, **not** an OTP. Do not share or commit the file. No working default is supplied.

```sh
npm run dev
```

Open **http://localhost:3000** (not 127.0.0.1 unless you explicitly change `APP_ORIGIN`). The dev command builds the browser and server once (including the PDF worker) and runs the TypeScript HTTP server. Restart it after code/configuration changes; there is intentionally no second browser-facing development server.

For a compiled run:

```sh
npm run build
npm start
```

The production command also reads `.env`. Changing the access code requires restarting the server, which invalidates all sessions. No Gemini key is needed for tickets 1–2.

### Configuration

| Variable | Meaning |
| --- | --- |
| `ACCESS_CODE` | Required: exactly six ASCII digits; no fallback. |
| `PORT` | TCP port, default `3000`. |
| `DATA_DIR` | Default `.data`; must be outside the repository or inside its ignored `.data` tree. |
| `APP_ORIGIN` | Exact browser origin, default `http://localhost:<PORT>`. No trailing slash. Non-loopback origins must use HTTPS. |

The listener binds to `0.0.0.0` for preview compatibility. Use a firewall on your personal machine; Host validation is **not** a network access-control list. Public deployment is out of scope. Use only loopback HTTP locally. For an HTTPS preview, set the exact preview URL in `APP_ORIGIN` and use a trusted TLS-terminating proxy that preserves the Host. Forwarded headers are deliberately not trusted to choose the cookie or origin policy.

## Quality checks

```sh
npm run check
npm run format:check
npm run test:e2e
npm audit --audit-level=high
```

Build before running browser checks. Playwright starts its own isolated server on port 4173 with a public test-fixture code; it never uses your `.env`. On Linux x64, an npm-bundled Chromium and bundled NSS libraries allow browser checks in restricted environments. Chromium's browser sandbox is unavailable in this container, but web security stays enabled. On macOS/Windows install a normal Playwright Chromium with `npx playwright install chromium`. The bundled Linux browser is not ARM64 support. CI runs on Ubuntu with Node 22.

Browser tests include Chromium + axe, three viewport sizes, real login/logout/reload, session invalidation, keyboard/form errors, help-dialog focus, reduced motion, network failures, and throttling. Screenshots and traces are under ignored `test-results/`. These checks do not certify WCAG compliance, cover every browser, or replace a security penetration test.

## Maintainer map

- `src/server/configuration.ts`: fail-closed environment validation.
- `src/server/access.ts`: constant-time code comparison, bounded in-memory sessions and global login cooldown.
- `src/server/application.ts`: HTTP policy, protected routes, bounded bodies and compiled static assets.
- `src/client/views.ts`: developer-owned semantic HTML templates; never interpolate untrusted content here.
- `src/client/main.ts`: form, help, authentication, expiry and error states.
- `src/client/api.ts`: same-origin HTTP and safe error handling.
- `src/client/styles.css`, `tokens.css`: responsive styling, local typography, motion preferences.
- `tests/`: public HTTP/startup tests and browser flows.
- `.scratch/personal-learning/`: approved spec and independent tickets.
- `AGENTS.md`, `CODING_STANDARDS.md`: collaboration and code quality rules.

## Security boundaries

Sessions are opaque, server-side, expire after eight hours, and are lost on restart. Cookies use HttpOnly, SameSite=Strict and Secure on the configured HTTPS origin. Logging out invalidates the token, not just the UI. A new login rotates the browser's previous session. At most 32 sessions are retained.

Five incorrect six-digit guesses block login globally for the remainder of a ten-minute window. This is deliberately single-owner and does not trust spoofable forwarded IP addresses. The trade-off is temporary denial of login; restarting also resets the in-memory limiter. It is not a distributed/public-facing abuse-defense system. A six-digit secret is weaker than a strong password.

Only compiled `dist/client` assets are served. All private `/api/*` paths require a valid session. The only public authentication endpoints are login and a GET session-status check that returns just an authenticated boolean. State-changing requests require the exact configured Origin, with no permissive CORS. JSON login input is limited to 1 KiB; logout bodies use the same bound. Login codes, cookies and keys are not logged, embedded in HTML, or stored in localStorage. The client imports no server configuration; only non-secret source contracts and limits are shared. No analytics or model-provider calls exist. Uploaded content is handled locally as described below.

## Upcoming language behavior

English interface and English conversations are LTR. Future Persian conversation prose will be RTL; code blocks will always remain LTR with accessible copy-code buttons. These are explicit acceptance criteria for the conversation/teaching tickets, not a simulated chat feature in this release.

Lucide provides icons; Inter is self-hosted through Fontsource (no external font request). Their package licenses are included in dependencies. `Folio` is a working UI name, not a user-approved permanent brand.

## Source library

Choose **Add source** to upload a text-based PDF or paste educational text. Click a saved source to read the extracted text. Deletion requires confirmation and permanently removes its saved record; there are no linked learning sessions in this version. Original PDF files are not retained, so this is a text preview, not a visual PDF viewer. Keep your own original documents.

Limits (canonical values: `src/shared/sources.ts`): **50 sources**, PDF **10 MiB / 200 pages**, **200,000 extracted or pasted characters** per source; JSON text requests at most **1 MiB**. Long-source AI retrieval is a later ticket. Scans/image-only PDFs, password-protected/encrypted PDFs, malformed files, and unsupported file types return useful errors without creating a partial source. Mixed PDFs preserve blank/no-text page numbers but cannot recover image text. Complex layouts or code formatting in PDFs may not extract perfectly; pasted text preserves code indentation.

Extracted text and metadata live in `DATA_DIR/sources/<random UUID>.json`. Filename text is only a display label. Records are written through a same-directory temporary file and atomic rename; private directory/file modes are requested on POSIX. This is not encrypted-at-rest storage or a backup system. Only one application process should use a data directory at once; concurrent imports inside that process are serialized at the capacity boundary. Do not point multiple app instances at the same library.

PDF extraction uses the installed PDF.js library in a worker thread, with one active PDF per application instance, a **20-second processing timeout** and **256 MiB JS heap budget**. These are guardrails, not an OS sandbox or a bound on all native memory. The parser is never imported into the browser bundle. Keep dependencies updated, and avoid untrusted documents if running with sensitive filesystem access.

Source endpoints are protected by the same session and Origin policies as the workspace:

- `GET /api/sources` — summaries only.
- `POST /api/sources/text` — JSON `{ title, text }`.
- `POST /api/sources/pdf` — raw PDF bytes; `Content-Type: application/pdf`, `X-File-Name` containing an `encodeURIComponent` filename.
- `GET /api/sources/:id` — metadata and numbered text pages.
- `DELETE /api/sources/:id` — remove the saved source.

Fixtures are synthetic; real learning data stays out of Git. Browser tests use an isolated temporary data directory, never your `.data`. Tests cover actual PDF parsing, encryption/no-text errors, concurrent capacity enforcement, text persistence/restart/deletion, unsafe filenames/HTML, accessibility and responsive workflows.
