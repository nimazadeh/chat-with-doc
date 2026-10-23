# Folio · Personal learning workspace

A personal, local-first learning tool built with HTML5, modern CSS, and strict TypeScript. No frontend framework. Node.js serves the frontend and protects the private workspace.

**Implemented:** ticket 1 — six-digit-code login, server-side sessions, logout, access expiry, rate limiting, responsive entry page, and an authenticated empty workspace. Sources, AI conversations, and learning history are intentionally not available yet.

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

Open **http://localhost:3000** (not 127.0.0.1 unless you explicitly change `APP_ORIGIN`). The dev command builds the browser bundle once and runs the TypeScript server. Restart it after code/configuration changes; there is intentionally no second browser-facing development server.

For a compiled run:

```sh
npm run build
npm start
```

The production command also reads `.env`. Changing the access code requires restarting the server, which invalidates all sessions. No Gemini key is needed for ticket 1.

### Configuration

| Variable | Meaning |
| --- | --- |
| `ACCESS_CODE` | Required: exactly six ASCII digits; no fallback. |
| `PORT` | TCP port, default `3000`. |
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

Only compiled `dist/client` assets are served. All private `/api/*` paths require a valid session. The only public authentication endpoints are login and a GET session-status check that returns just an authenticated boolean. State-changing requests require the exact configured Origin, with no permissive CORS. JSON login input is limited to 1 KiB; logout bodies use the same bound. Login codes, cookies and keys are not logged, embedded in HTML, or stored in localStorage. The client imports no server configuration. No analytics, provider calls, uploads or source storage exist in this ticket.

## Upcoming language behavior

English interface and English conversations are LTR. Future Persian conversation prose will be RTL; code blocks will always remain LTR with accessible copy-code buttons. These are explicit acceptance criteria for the conversation/teaching tickets, not a simulated chat feature in this release.

Lucide provides icons; Inter is self-hosted through Fontsource (no external font request). Their package licenses are included in dependencies. `Folio` is a working UI name, not a user-approved permanent brand.
