# Personal learning workspace

Status: ready-for-agent
Plan and test seams approved by user on 2026-10-23. Implementation requires separate permission for each ticket.

## Problem statement

The owner has English PDFs and educational text, especially programming material, and needs understandable explanations rather than terse summaries. The application is private and personal, not SaaS.

## Solution

A local learning workspace with a minimal six-digit-code login, a source library, and a provider-independent teaching conversation. The visual language is independently designed with Linear-inspired restraint, hierarchy, spacing, and subtle motion. No unseen YouTube design is claimed to be reproduced pixel-perfect.

## User stories

1. As the owner, I can configure my access code in .env without registering an account.
2. As the owner, I can enter with that code, log out, and have expired access rejected.
3. As the owner, I get a clear response to invalid input and temporary throttling.
4. As the owner, I can upload a text-based PDF and identify its pages in explanations.
5. As the owner, I can paste English learning text without creating a PDF.
6. As the owner, I can list and delete locally stored sources.
7. As the owner, I see useful errors for unsupported, encrypted, scanned, or oversized inputs.
8. As the owner, I can ask questions about a selected source.
9. As the owner, I can use Gemini with a key configured only on the server.
10. As the owner, I can change to a supported OpenAI-compatible provider without changing learning behavior.
11. As the owner, I can cancel a generation and recover from provider errors.
12. As a learner, I can state my experience and learning objective.
13. As a learner, I receive short, sequenced explanations with prerequisites and concrete examples.
14. As a programming learner, I see readable code examples and explanations of why they work.
15. As a learner in another subject, I can still learn without programming-specific assumptions.
16. As a learner, I can request a simpler explanation and work through a practice question.
17. As a learner, I receive feedback that checks understanding without pretending certainty.
18. As a Persian speaker, I receive Persian RTL responses when speaking Persian, while code stays LTR.
19. As the owner, I can reopen and continue a saved learning session after restarting the application.
20. As the owner, I can delete a learning session and understand what source deletion removes.
21. As a learner, I can ask about long sources without exceeding the provider's context limit silently.
22. As a learner, I can distinguish a source-grounded statement from supplementary model explanation.
23. As a keyboard or mobile user, I can complete all core flows with accessible controls.
24. As a motion-sensitive user, I can use the product with reduced motion.
25. As the owner, I can set up and run the application from documented instructions without exposing secrets.

## Implementation decisions

- English LTR semantic HTML5 frontend, modern CSS, strict TypeScript; no React/Vue or CSS framework required. Node.js TypeScript server; necessary parsing, tooling, and test dependencies allowed.
- Local single-owner operation. Runtime sources and histories stay outside Git. No telemetry or cloud storage by default. Model requests necessarily send selected source content to the configured provider; disclose that before use.
- Validate the fixed access code server-side; never bundle it or provider keys. Use opaque sessions, HttpOnly/SameSite cookies, expiration, logout invalidation, request-origin protection, bounded request bodies, and login throttling. Enforce authorization on every data endpoint.
- Local HTTP and proxied HTTPS previews require different cookie/origin configuration; do not blindly trust forwarded headers. No public-deployment security claim. Keep allowed origins explicit and use same-origin browser requests.
- Expose source management, learning sessions, and model requests through small interfaces. Provider-specific request mapping belongs in adapters, not teaching rules. Gemini and an explicitly supported OpenAI-compatible endpoint form the initial supported set.
- Sources are untrusted data, including possible prompt injection; distinguish them from system instructions. Render generated Markdown/code with sanitization or safe DOM construction.
- Teaching uses goals, prior knowledge, simple progressive explanation, examples, exercises, feedback, source references, and honest uncertainty. Quality is evaluated with example learning scenarios, not only automated assertions.
- Long-source retrieval is introduced in ticket 6. Until then explicitly bound accepted context; do not silently truncate or claim to support unlimited sources.
- Local persistence technology, exact file caps, endpoint contracts, and retrieval technique are ticket-level choices to record before building the relevant behavior, not implied user decisions.

## Testing decisions

Approved seams:

- Browser flows: visible user behavior, keyboard access, responsive states, directionality, and failures. This does not exhaust server authorization or prove model accuracy.
- Public HTTP interface: authentication, authorization, origin checks, input validation, persistence behavior, and error contracts. Avoid testing private helpers as the main proof.
- Provider network contract: replace only the external endpoint for deterministic tests of request/response/error handling. Live model checks are separate and require explicitly authorized credentials and network access.

For each authorized ticket: record baseline, run red-before-green behavioral slices, typecheck/lint/build, relevant regression tests, accessibility and responsive checks for affected UI, security/dependency checks where applicable, then separate Standards and Spec reviews. Do not mark skipped or unavailable checks as passed. Establish repeatable CI checks with the first executable ticket. No executable test suite exists at planning time.

## Out of scope

SaaS, billing, signup, multiple owners, OAuth, time-based OTP, OCR, direct video ingestion, guaranteed factual correctness, arbitrary model compatibility, public deployment, and production data backups are not promised by this version. The YouTube URL is inspiration, not an ingestion requirement.

## Further notes

Seven approved vertical tickets live in issues/, in dependency order. They include per-ticket audits; the final integration ticket does not defer earlier quality checks. This environment cannot call model-provider hosts, so live model verification must occur on an allowed environment, never be fabricated.

## User clarification (ticket 1 authorization)

Use Lucide icons. Persian prose must use RTL and English prose LTR, while code blocks always use LTR with a dedicated copy-code button. Implement conversation rendering and copying with the relevant chat/teaching tickets, not with the login ticket. Copy feedback and clipboard failures must be accessible. Keep the source readable for the next human maintainer.

Ticket 1 interface refinement: public GET session status returns only an authenticated boolean, avoiding an expected 401 console error on the entry page. It grants no private data access. All data endpoints remain protected.


## Ticket 2 decisions

Store extracted text and page metadata locally, not the original PDF bytes. Show that distinction before import. Limits: 50 sources; PDFs 10 MiB and 200 pages; each source at most 200,000 characters; text JSON body at most 1 MiB. PDF.js runs in a worker thread with one active import, 20-second timeout, and 256 MiB JS heap budget (not an OS sandbox). Atomic per-source JSON records use random UUID paths under ignored .data or an external DATA_DIR; one server process owns the directory. Deletion removes the record and references; no linked sessions exist yet. Preserve pasted code indentation. User superseded report.md: all subsequent reports are in chat and completed tasks end with a next-action question box.


## Ticket 3 decisions

Use server-side fetch adapters, no provider SDK dependency: Gemini v1beta generateContent, and the explicit non-streaming OpenAI-compatible chat/completions text contract. AI_PROVIDER, AI_MODEL, AI_API_KEY are optional until chat is enabled; AI_BASE_URL is OAI-only, HTTPS except loopback HTTP; redirects fail closed. No key/endpoint comes from browser input. Source context 24,000 characters; questions 4,000; history 24,000 and 6 exchanges; 128 KiB body/upstream cap; 12,000-character answer cap; 2,048 output tokens. No silent truncation. Twenty-second default timeout, at most one active generation, request disconnect aborts upstream. Require explicit per-conversation consent. Transcript is memory-only and closing/reloading clears it. Safe plain prose plus fenced LTR code/copy, with automatic prose direction. No live-provider test authorized/performed. Source prompt-injection defenses are best-effort, not a guarantee.
