# 03: اولین گفت‌وگوی آموزشی با ارائه‌دهندهٔ قابل تعویض

**What to build:** مالک بتواند دربارهٔ یک منبع محدود سؤال کند و پاسخ مدل را از ارائه‌دهندهٔ انتخابی دریافت کند.

**Blocked by:** 02: افزودن و مدیریت منابع آموزشی

**Status:** completed

**Execution:** completed

**Authorization:** User selected implement_ticket_3 in the next-action question box.

**Starting revision:** 80a1958

**Spec:** ../spec.md

## Acceptance criteria

- [x] Gemini و یک قرارداد مشخص OpenAI-compatible پشت interface مشترک و بدون نشت انواع اختصاصی به منطق آموزش پشتیبانی شوند.
- [x] کلید و endpoint/model سمت سرور پیکربندی شوند؛ کاربر از ارسال متن به سرویس خارجی آگاه شود و کلید در مرورگر یا log نباشد.
- [x] پرسش و پاسخ برای منبع منتخب با loading، لغو، timeout و بازیابی پس از خطای provider کار کنند.
- [x] سقف context تا پیش از ticket 6 روشن باشد؛ ورودی بلند بی‌صدا truncate نشود.
- [x] پاسخ و کد با رندر امن نمایش داده شوند؛ آزمون XSS و محتوای منبع حاوی دستور مخرب وجود داشته باشد.
- [x] قرارداد موفقیت، خطای احراز provider، rate limit، پاسخ خراب و لغو در مرز خارجی تست شوند؛ تست زنده فقط با مجوز و شبکهٔ مجاز باشد.

## Out of scope

پشتیبانی همهٔ مدل‌ها، retrieval منابع بلند و تاریخچهٔ دائمی.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in chat. Finish by offering the next action in a clickable question box.


## Verification evidence — 2026-10-23

- Recorded red→green slices: missing configuration endpoint, real OpenAI-compatible HTTP question, Gemini request/role contract, browser source-to-chat flow, namespaced OpenAI model identifiers. Additional regressions exercise limits and failures.
- TypeScript, ESLint, Prettier, production build and diff whitespace: pass. Vitest **47/47** (14 chat, 12 startup, 12 auth, 9 source).
- Playwright Chromium **14/14**: source/auth regressions plus source questions at 375/768/1440px, consent, Persian RTL / English LTR, LTR fenced code and clipboard copy, inert script/HTML, provider rate-limit recovery, cancel/retry, follow-up and clear. Axe: zero violations in audited states; no horizontal overflow. Visually reviewed mobile/desktop screenshots; fixed contrast and form styling findings.
- Public HTTP: provider credentials/rate-limit/service failures, malformed/oversized/incomplete output, source/body/question caps, consent, auth/Origin/media checks, timeout, generation concurrency and upstream abort with successful retry.
- Provider boundary: Gemini URL/header/systemInstruction/role history mapping verified with controlled transport; OpenAI-compatible actual local HTTP request/response; browser production routes use local HTTP upstream fixture. No internal modules mocked for main behavior.
- Standards review (sequential, no independent subagent): server-only configuration, small provider interface, narrow source/chat/rendering modules, shared limits, safe text DOM, proportional abstractions, no added dependency. No blocking findings remaining.
- Spec review: all six criteria met within the defined text-only contracts. No persistent history, long-source retrieval, tools, streaming or structured teaching slipped into this ticket. Minimal language/copy rendering also honors standing language requirements.
- Dependency audit: zero known vulnerabilities. Private-code/key, ignored runtime data and client-bundle separation reviewed; no actual provider secret is configured or used for tests.
- Limitations: no live-provider call authorized/performed (network restrictions); fixture answers do not prove teaching quality, factual accuracy or real-model prompt-injection resistance. No independent pentest, cross-browser certification or new Lighthouse score claimed.
- Reports in chat only; report.md untouched. Ticket 4 awaits separate explicit user approval.
