# Folio · Personal learning workspace

A personal, local-first learning tool built with HTML5, modern CSS, and strict TypeScript. No frontend framework. Node.js serves the frontend and protects the private workspace.

**Implemented:** tickets 1–3 (private access, local source library, provider-backed source questions). You can save pasted text or text-based PDFs, inspect extracted text with page references, reopen after restart, and delete sources. Source questions support Gemini and a defined OpenAI-compatible contract. Structured teaching and persistent learning history are later tickets.

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

The production command also reads `.env`. Changing the access code requires restarting the server, which invalidates all sessions. A provider key is optional for the library, but required for AI questions.

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

Only compiled `dist/client` assets are served. All private `/api/*` paths require a valid session. The only public authentication endpoints are login and a GET session-status check that returns just an authenticated boolean. State-changing requests require the exact configured Origin, with no permissive CORS. JSON login input is limited to 1 KiB; logout bodies use the same bound. Login codes, cookies and keys are not logged, embedded in HTML, or stored in localStorage. The client imports no server configuration; only non-secret source contracts and limits are shared. No analytics exist. Importing a source is local; asking an AI question sends the selected source and conversation to the configured provider only after explicit consent.

## Language and safe rendering

The English interface is LTR. Conversation paragraphs use automatic direction (Persian RTL, English LTR); fenced code always stays LTR with a working copy button. Model prose and HTML are displayed as inert text, not interpreted HTML. Fenced code is the only structural Markdown support in this version; inline Markdown, links and images are not interpreted.

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


## Asking a source question

Configure the provider **only in your local `.env`**, then restart. Never paste keys into chat or commit them. Leave provider settings unset to keep using the library without AI; the conversation explains how to configure it.

- Gemini: set `AI_PROVIDER=gemini`, `AI_MODEL` to an available plain-text generateContent model (for example `gemini-2.5-flash` if your account has access), and `AI_API_KEY`. Requests use Google's HTTPS v1beta `models/<model>:generateContent` endpoint with `x-goog-api-key`, systemInstruction, text contents and at most 2,048 output tokens. `AI_BASE_URL` is not supported for Gemini.
- OpenAI-compatible: set `AI_PROVIDER=openai-compatible`, `AI_MODEL`, `AI_API_KEY` and optionally `AI_BASE_URL` (default `https://api.openai.com/v1`). The exact supported subset is non-streaming `POST <base>/chat/completions` with Bearer authentication, string-content system/user/assistant messages, `max_tokens: 2048`, and a `choices[0].message.content` string with `finish_reason: stop`. Models requiring tools, multimodal content, reasoning-specific parameters, Responses API or other incompatible schemas are not promised. Local OpenAI-compatible services may use loopback HTTP and a non-secret placeholder key if their contract requires no authentication.
- Custom base URLs require HTTPS unless loopback; no embedded credentials, query or fragment. Redirects are rejected rather than forwarding credentials elsewhere. You are responsible for trusting the server-side configured provider and its data-retention terms.
- `AI_TIMEOUT_MS` defaults to 20,000 (allowed 100–25,000). Errors never return raw upstream bodies or keys. One generation runs per app instance; cancellation disconnects the request and aborts provider work. Cancellation is best effort and does not guarantee no billing.

Open a source, choose **Ask about this source**, read the disclosure, agree to send content, then ask. The entire selected source and current conversation are sent on each turn. You can cancel, retry without losing your question, ask a follow-up or start a new conversation. Closing/reloading clears the in-memory transcript; no permanent chat sessions exist until ticket 5. There is no streaming yet.

Context limits are explicit: source at most **24,000 characters**, user question **4,000**, history including the pending question **24,000**, at most **6 exchanges**. Request bodies and upstream responses are bounded to **128 KiB** and answers to **12,000 characters**. Longer sources/history and incomplete/oversized answers produce an error, never silent truncation. These are character budgets, not a token-count guarantee for every tokenizer; select a model with a sufficiently large context (64k tokens recommended). Long-source retrieval is deferred to ticket 6.

The learning instructions label source material as untrusted reference data, separate it from system rules and request clear explanations, page references and honest uncertainty. This reduces risk but does **not** guarantee prompt-injection resistance or factual accuracy. No secrets are included in prompts. Structured pedagogy, exercises and learner goals belong to ticket 4.

`GET /api/chat/status` exposes only readiness, provider kind and the public source-character cap; `POST /api/chat` accepts `{ sourceId, consent: true, messages: [{ role: "user" | "assistant", text }] }` with alternating turns ending in a user question. Both routes require a session; POST requires exact Origin and JSON. History is client-held and untrusted, so server rules/context bounds apply on every turn.

Automated provider checks replace only the external network: Gemini's request/response contract uses a controlled transport; OpenAI-compatible and browser tests use real local upstream HTTP. Browser tests use synthetic output to verify rendering/cancellation/errors, not model intelligence. Live model calls were **not performed**: provider hosts are inaccessible from this workspace and a live test requires separate authorization. No real provider key was used or added to the preview.
